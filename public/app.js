import {cards,leaders,trees,MAX_PLAYERS,modes,lore,wardCost,wardMarks,cardCost,unitPower,summonTarget,earlyReaction,objectiveCost,objectiveGoal,leaderDamageGoal,watchDifficulties,gates,gateGoal,chapters,previousChapter,routesByEpisode,routeGoal,orderDeliveryCost,foundryRules,foundryDifficulty,orchardPlots,orchardCost,orchardDifficulty} from '/game.mjs';
const $=id=>document.getElementById(id);
const lobby=$('lobby'),arena=$('arena');
const key=sessionStorage.emberveilKey||(sessionStorage.emberveilKey=crypto.randomUUID());
const query=new URL(location.href).searchParams;
const requested=query.get('room')?.toUpperCase()||'';
const watching=query.get('watch')==='1';
const memoryKey='emberveilChronicle';
function readMemory(){
  try{return JSON.parse(localStorage.getItem(memoryKey))??{};}
  catch{return {};}
}
function saveCoopMemory(){
  if(watching||game.mode!=='coop'||game.winner===null) return;
  const memory=readMemory();
  const mine=game.players[game.seat];
  if(game.chapterOutcome){
    memory.outcomes??={};
    memory.outcomes[game.episode??'watch']=game.chapterOutcome;
  }
  if(sessionStorage.emberveilRememberRoom===room&&mine.leader&&mine.unlocked){
    memory.leaders??={};
    const saved=memory.leaders[mine.leader];
    if(!saved||mine.unlocked>saved.unlocked||mine.unlocked===saved.unlocked&&mine.growth>=saved.growth) memory.leaders[mine.leader]={tree:mine.tree,unlocked:mine.unlocked,growth:mine.growth};
  }
  try{localStorage.setItem(memoryKey,JSON.stringify(memory));}catch{}
}
$('host-chapter').onchange=()=>{$('chapter-options').hidden=!$('host-chapter').checked;};
let room='',game,selected,error='',busy=false,refreshing=false;
let attackIds=[],reactionTarget='';
let viewedSeat,openPanel='',actionWindow='';
let blockDraft={};
let draftCombat;

function tableOptions(){
  const mode=$('host-mode').value;
  const ranked=mode==='ffa'&&$('ranked').checked;
  $('bot-settings').hidden=mode!=='coop';
  $('table-options').hidden=mode==='coop';
  $('ranked-option').hidden=mode!=='ffa';
  $('private-table').disabled=ranked;
  $('leader-damage').disabled=ranked;
}
$('host-mode').onchange=tableOptions;
$('ranked').onchange=tableOptions;
const teamName=(mode,team)=>mode==='coop'?(team===1?'Sentinels':'Adventurers'):(team===1?'Moon team':'Sun team');
const sameSide=(a,b)=>game.mode&&game.mode!=='ffa'&&a.team===b.team;
$('guest-code').value=requested;
$('rules').onclick=()=>$('guide').showModal();

for(const id of ['host-leader','guest-leader']){
  $(id).innerHTML=Object.entries(leaders).map(([kind,leader])=>`<option value="${kind}">${cards[kind].name} · ${leader.style}</option>`).join('');
  const detail=document.createElement('div');
  detail.className='deck-detail';
  $(id).after(detail);
  const describe=()=>{
    const kind=$(id).value;
    const L=leaders[kind];
    detail.innerHTML=portrait(kind)+`
      <span>
        <strong>${cards[kind].name} · ${L.style}</strong><br>
        ${L.text}<br><br>
        <strong>Capability</strong><br>${L.capability}<br><br>
        <strong>Strategy</strong><br>${L.strategy}
        ${kind==='neri'?'<p>Once per match on your turn, read an opponent’s hand.</p>':''}
        <details><summary>Leader story</summary><p>${lore.leaders[kind]}</p></details>
      </span>`;
  };
  $(id).addEventListener('change',describe);
  describe();
}

async function api(code,data){
  const options={headers:{Authorization:key}};
  if(data) Object.assign(options,{method:'POST',body:JSON.stringify(data)});
  const result=await fetch('/api/'+encodeURIComponent(code)+(watching?'?watch=1':''),options);
  const state=await result.json();
  if(!result.ok) throw Error(state.error);
  return state;
}
function escape(value){
  return String(value).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[character]);
}
function portrait(kind){
  return `<img src="/art/${cards[kind].art??kind}.webp" alt="" draggable="false">`;
}
function animateEffect(){
  const effect=game.effect;
  if(!effect) return;
  const field=arena.querySelector(`[data-seat="${effect.seat}"]`);
  if(!field) return;
  const unit=effect.unit&&field.querySelector(`[data-id="${CSS.escape(effect.unit)}"]`);
  const target=unit||field;
  target.classList.add('effect-'+effect.type);
  target.addEventListener('animationend',()=>target.classList.remove('effect-'+effect.type),{once:true});
}
function card(unit,zone,enabled,opponent){
  const info=cards[unit.kind];
  const inHand=zone==='hand'||zone==='reaction';
  const owner=game.players[opponent??game.seat];
  const cost=cardCost(owner,unit.kind);
  const detail=inHand?(info.text??(info.damage?'Deal '+info.damage+' damage':info.heal?'Gain '+info.heal+' life':info.power+' / '+info.hp)):unitPower(owner,unit)+' / '+unit.hp;
  return `<button class="card" data-kind="${unit.kind}" data-zone="${zone}" data-id="${unit.id}" data-opponent="${opponent??''}" data-selected="${selected?.id===unit.id||attackIds.includes(unit.id)}" ${enabled?'':'disabled'}><strong>${info.name}</strong><span class="card-art">${portrait(unit.kind)}${inHand?`<b class="mana-cost" aria-label="${cost} mana">${cost}</b>`:''}</span><span class="card-detail">${detail}${unit.earlyBoost?' · +'+unit.earlyBoost+' power in combat':''}${unit.earlyShield?' · '+unit.earlyShield+' damage prevention in combat':''}${!inHand&&(unit.frozen||unit.freezeTurn)?' · Frozen':zone==='mine'&&!unit.ready?' · Resting':''}</span></button>`;
}
function treePanel(mine, active){
  if(!mine.leader || !trees[mine.leader]) return '';
  const treeData = trees[mine.leader];
  const branches = treeData.branches.map(branch => {
    const nodes = branch.nodes.map((node, i) => {
      const unlocked = mine.tree === branch.id && mine.unlocked > i;
      const next = !mine.tree || mine.tree === branch.id ? mine.unlocked === i : false;
      const canUnlock = active && next && mine.growth >= node.cost && !mine.eliminated;
      return `<div class="node ${unlocked?'unlocked':''}">${unlocked?'✓ ':''}${node.text} (${node.cost} pt)${canUnlock?`<button class="outline" data-action="unlock" data-branch="${branch.id}">Unlock</button>`:''}</div>`;
    }).join('');
    return `<div class="branch"><strong>${branch.name}</strong>${nodes}</div>`;
  }).join('');
  return `<section class="field tree-panel"><h2>Ability Tree · ${mine.growth} growth</h2>${branches}<small>Gain 1 growth every three turns at the table. Choose a path and unlock nodes on your turn.</small></section>`;
}
function accordPanel(active){
  const {story,difficulty}=game;
  const mine=game.players[game.seat];
  const finished=game.winner!==null;
  const won=finished&&!game.players[game.winner].bot;
  let heading=lore.accord.title;
  const memory={
    'ward-restored':'The people who climbed the lit stair bring a key stamped with both crests.',
    'ward-restored-loss':'The braziers burned when the rescuers fell. The voices behind the door have not stopped calling.',
    lantern:'The people from the vault carry the lantern that led them up the stair.',
    'vault-lost':'The last rescuers did not return. A voice from behind the door calls the next party by name.'
  };
  let passage=[lore.accord.intro,memory[game.priorOutcome]].filter(Boolean).join(' ');
  let controls='';
  if(finished){
    heading=!won?'The Gates Fall':story.gateHeld?gates[story.gate].name+' Holds':'The Column Breaks';
    passage=!won?'The rescuers retreat beneath the citadel. Above them, the bells ring for a city with nowhere to go.':
      !story.gateHeld?'With the column broken, Sun and Moon lift the bars together. The doors are open by dawn.':
      story.gate==='sun'?'The last stretcher clears the gate. As dawn breaks, the healers hang both houses’ colors over the infirmary.':
      'The archivists carry out a ledger bearing both crests. It names the people who ordered the Sentinels to seal the vault.';
  }else{
    const guard=mine.board.find(unit=>unit.ready);
    const options=Object.entries(gates).filter(([gate])=>!story?.gate||story.gate===gate);
    controls=`<p>Fortify one gate to win, or defeat every Sentinel. The first fortification commits the team. Fortifying uses your first ready creature and leaves it unable to attack or block until it readies.</p>
      ${options.map(([gate,info])=>{
        const goal=gateGoal(gate,difficulty);
        const available=active&&guard&&mine.mana>=info.cost&&story.channelTurn!==game.round;
        return `<p><strong>${info.name}</strong> · ${story?.marks??0} / ${goal} fortifications · ${info.reward}</p>
          ${story?`<button class="outline" data-action="fortify" data-gate="${gate}" ${available?'':'disabled'}>Fortify · ${info.cost} mana${guard?' · '+cards[guard.kind].name:''}</button>`:''}`;
      }).join('')}`;
  }
  return `<section class="field story" aria-label="Match story"><h2>${heading}</h2><p>${passage}</p>${controls}</section>`;
}
function escortPanel(active){
  const {story,difficulty,priorOutcome}=game;
  const harbor=game.episode==='tide';
  const finale=game.episode==='open-accord';
  const narrations=finale?{
    causeway:'The harbor guard arrives with the order recovered from the customs house.',
    'tidal-stair':'The order from the tidal stair still bears the names of the old harbor refuges.',
    detachment:'Harbor workers bring the order under escort after the detachment fell.'
  }:harbor?{
    witnesses:'A witness directs the party to the original customs house.',
    testimony:'The dated record tells Iskar which set of orders to look for.',
    detachment:'The party follows the court’s only surviving lead to the waterfront.'
  }:{
    sun:'The Sun healers lend the party a cart from the infirmary.',
    moon:'The Moon archivists bring the ledger from the gatehouse.',
    column:'The broken Sentinel column leaves a clear road as far as the first bend.'
  };
  const endings=finale?{
    direct:['The Bell Rings Open','The party delivers the new order. Both houses keep their seals, and the local refuges gain the right to open their own doors when the city is in danger.'],
    refuges:['The Refuges Answer','Shelter keepers stand beside the two houses when the party delivers the order. The Watch lifts the old seal. The keepers stay to help write the rules for the next emergency.'],
    detachment:['The Watch Takes a New Order','After the last Sentinel falls, Orrun carries the signed order to the command bell. The gates open, and the first hearing begins with testimony from the people who lived beneath them.'],
    lost:['The Bell Falls Silent','The old seal holds. Shelter keepers carry the signed order back through the orchard to await another attempt.']
  }:harbor?{
    causeway:['The Causeway Holds','The party crosses under guard and finds the release order in a cedar chest. Iskar watches the returning water reach the last mooring stone.'],
    'tidal-stair':['The Steps Under the Water','As the tide falls away, the party climbs through an old inspection hatch. The order names the harbor refuges that once had the right to open their own gates.'],
    detachment:['The Watch Leaves the Harbor','With the last Sentinel down, harbor workers open the customs house. The party carries the original release order back to court.'],
    lost:['The Harbor Closes','The Watch reaches the customs house first. Iskar waits for the water to turn and another party to come down the road.']
  }:{
    witnesses:['The Witness Reaches Court','Vael lowers his shield. The witness says the keeper’s name aloud, and this time the court writes it down.'],
    testimony:['A Date in the Ledger','The preserved record dates the suspension of the release order. The court sends for the original clause at Stillwater Harbor.'],
    detachment:['The Road Is Clear','The detachment falls, but the court still needs corroboration. The party follows the road to Stillwater Harbor.'],
    lost:['The Road Closes','The last escort falls. The witnesses retreat into the orchard and wait for another party.']
  };
  const scene=lore[game.episode];
  const ending=endings[story?.ending];
  if(ending) return `<section class="field story" aria-label="Match story"><h2>${ending[0]}</h2><p>${ending[1]}</p></section>`;
  const mine=game.players[game.seat];
  const guards=mine.board.filter(unit=>unit.ready&&!unit.exhausted);
  const guardOptions=active&&guards.length?`<label for="escort-guard">Escort guard</label>
    <select id="escort-guard">${guards.map((unit,i)=>`<option value="${unit.id}">${i+1}. ${cards[unit.kind].name} · ${cards[unit.kind].power} / ${unit.hp}</option>`).join('')}</select>`:'';
  const routes=Object.entries(routesByEpisode[game.episode]).filter(([route])=>!story?.route||story.route===route);
  const objectives=routes.map(([route,info])=>{
    const cost=story?.atCourt?orderDeliveryCost:info.cost;
    const available=active&&guards.length&&mine.mana>=cost&&story.channelTurn!==game.round&&(!info.lowOnly||story.tide==='low');
    const constraint=finale?(info.heal?`Each advance heals living allies by up to ${info.heal} life.`:`Once committed, each Watch turn deals ${info.damage} damage to every living ally.`):harbor?(info.lowOnly?'Available at low tide. Progress carries over between tides.':'Available at any tide.'):
      `If the escort stalls, the Watch deals ${info.pressure}.`;
    const progress=story?.atCourt?`Reached the court via ${info.name.toLowerCase()}. Deliver the order with a ready guard on a later turn. ${constraint}`:
      `<strong>${info.name}</strong> · ${story?.marks??0} / ${routeGoal(info,difficulty)} steps<br>Costs ${cost} mana per step. ${constraint}`;
    const label=story?.atCourt?'Deliver the order':story?.route?(harbor?'Advance crossing':'Advance escort'):info.name;
    return `<p>${progress}</p>
      ${story?`<button class="outline" data-action="escort" data-route="${route}" ${available?'':'disabled'}>${label} · ${cost} mana</button>`:''}`;
  }).join('');
  const tide=harbor&&story?`<p><strong>${story.tide==='low'?'Low tide':'High tide'}</strong> · Water ${story.tide==='low'?'rises':'recedes'} ${story.tideIn===1?'on the next Watch turn':`in ${story.tideIn} Watch turns`}.</p>`:'';
  const pressure=!harbor&&!finale&&story?.route?story.checkedSteps===undefined?'The next Watch turn establishes the checkpoint.':
    story.checkedSteps===story.marks?'Advance before the next Watch turn to avoid damage.':'The escort is safe from pressure on the next Watch turn.':'';
  const recent=story?.lastPressure&&game.round-story.lastPressure<game.players.length?' The Watch struck on its last turn.':'';
  return `<section class="field story" aria-label="Match story"><h2>${scene.title}</h2>
    <p>${scene.intro} ${narrations[priorOutcome]??''}</p>
    <p>${finale?'Reach the court, then deliver the order on a later turn, or defeat the Sentinels.':'Complete one route or defeat the Sentinels.'} The first step commits the party. Your guard cannot attack or block until it readies.</p>
    ${tide}${pressure?`<p><strong>${pressure}</strong>${recent}</p>`:''}${guardOptions}${objectives}</section>`;
}
function foundryPanel(active){
  const {story,difficulty,priorOutcome}=game;
  const scene=lore.foundry;
  const briefings={
    direct:'The court’s seal is fresh. The foreman asks whether it will open this door too.',
    refuges:'The refuge keepers send a fitter who knows the furnace by sound.',
    detachment:'Orrun brings a hinge from the last Sentinel that fell at the court.'
  };
  const endings={
    workers:['The Workers Keep the Keys','Orrun leaves the keys on the foreman’s bench. The court gets a copy of every order. The workers keep the right to stop the furnace.'],
    court:['The Court Holds the Keys','The officer takes the keys up the basalt steps. Before the Watch can take a new order, the court must read it aloud where the workers can hear.'],
    detachment:['The Furnace Goes Dark','With the Sentinels down, Orrun shuts the furnace. The keys stay in the lock until the workers and the court meet.'],
    lost:['The Door Holds','The Sentinel closes the door. Behind it, the workers keep their hands on the old machinery and wait for the heat to pass.']
  };
  const ending=endings[story?.ending];
  if(ending) return `<section class="field story" aria-label="Match story"><h2>${ending[0]}</h2><p>${ending[1]}</p></section>`;
  const {repairs,damage}=foundryDifficulty(difficulty);
  const mine=game.players[game.seat];
  const ready=mine.board.filter(unit=>unit.ready&&!unit.exhausted);
  const completed=story?.marks===repairs;
  const canVent=active&&story?.heatIn===1&&!story.vented&&mine.mana>=foundryRules.ventCost;
  const canRepair=active&&ready.length&&story.channelTurn!==game.round&&mine.mana>=foundryRules.repairCost;
  const heat=story?`<p><strong>${story.vented?'The next blast is vented.':story.heatIn===1?'Blast on the next Watch turn.':`Blast in ${story.heatIn} Watch turns.`}</strong>
    An unvented blast deals ${damage} damage to each allied creature.</p>`:'';
  let actions='';
  if(completed){
    actions=`<p>The repairs are complete. Who holds the keys?</p><div class="result-actions">
      <button class="outline" data-action="foundry" data-job="keys" data-holder="workers" ${active?'':'disabled'}>Give keys to the workers</button>
      <button class="outline" data-action="foundry" data-job="keys" data-holder="court" ${active?'':'disabled'}>Give keys to the court</button></div>`;
  }else if(story){
    const workers=active&&ready.length?`<label for="foundry-worker">Creature for repairs</label>
      <select id="foundry-worker">${ready.map((unit,i)=>`<option value="${unit.id}">${i+1}. ${cards[unit.kind].name} · ${unitPower(mine,unit)} / ${unit.hp}</option>`).join('')}</select>`:'';
    actions=`${workers}<div class="result-actions">
      <button class="outline" data-action="foundry" data-job="repair" ${canRepair?'':'disabled'}>Repair furnace · ${foundryRules.repairCost} mana</button>
      <button class="outline" data-action="foundry" data-job="vent" ${canVent?'':'disabled'}>Vent next blast · ${foundryRules.ventCost} mana</button></div>`;
  }
  return `<section class="field story" aria-label="Match story"><h2>${scene.title}</h2><p>${scene.intro} ${briefings[priorOutcome]??''}</p>
    <p>Finish the repairs and hand over the keys, or defeat the Sentinels. Repair once per turn using one ready creature. It cannot attack or block until it readies.</p>
    <div class="ward-progress"><progress value="${story?.marks??0}" max="${repairs}" aria-label="Furnace repairs"></progress><strong>${story?.marks??0} / ${repairs} repairs</strong></div>
    ${heat}${actions}</section>`;
}

function orchardPanel(active){
  const {story,difficulty,priorOutcome}=game;
  const briefings={
    workers:'The Foundry workers kept the keys. They sent trellises and tools. The shelter beds start with one growth.',
    court:'The court kept the keys. Its officer sent a patrol schedule. The first sweep comes one Watch turn later.',
    detachment:'Orrun left the keys in the Foundry lock. Nobody could release the tools or the patrol schedule.',
    lost:'The Foundry door held. No tools or warning came up the orchard path.'
  };
  const endings={
    'orchard-held':['Both Beds Take Root','Sylva opens the shelter path. By dawn the terrace baskets are full, and families decide for themselves whether to cross the city gates.'],
    detachment:['The Paths Go Quiet','The last Sentinel falls. The families stay under the briars while Sylva goes to see what the beds can still bear.'],
    lost:['The Beds Go Untended','Sylva leads the families deeper among the briars. The Watch takes both paths.']
  };
  const ending=endings[story?.ending];
  if(ending) return `<section class="field story" aria-label="Match story"><h2>${ending[0]}</h2><p>${ending[1]}</p></section>`;
  const {growth}=orchardDifficulty(difficulty);
  const mine=game.players[game.seat];
  const ready=mine.board.filter(unit=>unit.ready&&!unit.exhausted);
  const canTend=active&&ready.length&&story.channelTurn!==game.round&&mine.mana>=orchardCost;
  const tender=active&&ready.length?`<label for="orchard-tender">Creature to tend a bed</label>
    <select id="orchard-tender">${ready.map((unit,i)=>`<option value="${unit.id}">${i+1}. ${cards[unit.kind].name} · ${unitPower(mine,unit)} / ${unit.hp}</option>`).join('')}</select>`:'';
  const sweep=story?.lastSweep;
  const recent=sweep&&game.round-sweep.turn<game.players.length?
    `<p>${orchardPlots[sweep.plot]} ${sweep.protected?'held through the last sweep.':sweep.lostGrowth?'lost one growth in the last sweep.':'were empty at the last sweep.'}</p>`:'';
  return `<section class="field story" aria-label="Match story"><h2>${lore.orchard.title}</h2><p>${lore.orchard.intro} ${briefings[priorOutcome]??''}</p>
    <p>Grow both beds to ${growth} to win, or defeat the Sentinels. Tending adds one growth and protects that bed from its next sweep. An unprotected bed loses one growth.</p>
    ${story?`<p><strong>Next sweep: ${orchardPlots[story.patrol]}</strong> · ${story.patrolIn===1?'Next Watch turn':`In ${story.patrolIn} Watch turns`}</p>`:''}${recent}
    ${tender}${Object.entries(orchardPlots).map(([plot,name])=>{
      const marks=story?.plots[plot]??(plot==='shelter'&&priorOutcome==='workers'?1:0);
      const protectedBed=story?.sheltered[plot];
      return `<div class="ward-progress"><progress value="${marks}" max="${growth}" aria-label="${name} growth"></progress><strong>${name} · ${marks} / ${growth}${protectedBed?' · Protected':''}</strong></div>
        ${story?`<button class="outline" data-action="tend" data-plot="${plot}" ${canTend&&(marks<growth||!protectedBed)?'':'disabled'}>Tend ${name.toLowerCase()} · ${orchardCost} mana</button>`:''}`;
    }).join('')}
    <small>Tend once per turn. The creature you choose cannot attack or block until it readies.</small></section>`;
}

function storyPanel(active=false){
  if(game.episode==='orchard') return orchardPanel(active);
  if(game.episode==='foundry') return foundryPanel(active);
  if(Object.hasOwn(routesByEpisode,game.episode)) return escortPanel(active);
  if(game.episode==='accord') return accordPanel(active);
  const story=game.story;
  const watch=watchDifficulties[game.difficulty];
  const scene=game.chapter?lore.coop:lore[game.mode==='coop'?'':game.mode];
  if(!scene) return '';
  let passage=scene.intro;
  if(game.chapter&&game.difficulty==='veteran') passage+=' The Watch heard the first bell. This time, its seal is already charged.';
  let heading=scene.title;
  let objective='';
  if(game.started && game.winner!==null){
    if(game.mode==='coop'){
      const lost=game.players[game.winner].bot;
      heading=lost?'The Doors Remain Sealed':story?.marks===wardMarks?'The First Light':'The Watch Falls';
      passage=lost?(story?.marks===wardMarks?'The braziers still burn. The Sentinel steps over the last rescuer and lowers the bar.':'The last Sentinel returns to its post. Beneath the vault, the rescue bells fall silent.'):

        story?.marks===wardMarks?'The restored Dawnward lights a path through the opened vault. The first people to climb out see a sky they know only from stories. One of them carries a key stamped with both houses’ crests.':
        'The vault opens in darkness. The rescuers pass a single lantern hand to hand until everyone reaches the stairs.';
    }else{
      heading=game.mode==='teams'?'A House Holds the Keys':'A Claim Is Settled';
      passage=game.mode==='teams'?'At dawn, the surviving house takes custody of the citadel. Its first decree will decide whether the old gates open again.':'The last claimant leaves the basalt court with the keeper’s seal. By morning, the city will ask what they intend to do with it.';
    }
  }else if(story){
    if(story?.marks===wardMarks){
      heading='The Dawnward Burns Again';
      passage='All three braziers catch. Warm light spills from the vault and living allies recover up to 3 life. Defeat the remaining Sentinels to open the doors.';
    }else{
      if(story.sentinelsFallen){
        heading='A Voice Behind the Door';
        passage='As a Sentinel falls, a voice calls through the stone. “We can hear you. Can you light the stair?”';
      }
      const canChannel=active&&story.channelTurn!==game.round&&game.players[game.seat].mana>=wardCost;
      const pulse=watch&&story.pulseIn?`<p><strong>Watch pulse:</strong> ${story.pulseIn===1?'On the next Watch turn':`In ${story.pulseIn} Watch turns`} · ${watch.damage} damage to each living ally.${story.lastPulse&&game.round-story.lastPulse<game.players.length?' The last pulse just struck.':''}</p>`:'';
      objective=`${pulse}<p>Restore three marks to heal each living ally for up to 3 life${watch?' and stop future pulses':''}.</p><div class="ward-progress"><progress value="${story.marks}" max="${wardMarks}" aria-label="Dawnward marks restored"></progress><strong>${story.marks} / ${wardMarks} marks</strong></div><button class="outline" data-action="rekindle" ${canChannel?'':'disabled'}>Rekindle a mark · ${wardCost} mana</button><small>Once per turn. Defeat the Sentinels to win.</small>`;
    }
  }else if(game.chapter){
    passage+=' Defeat the Sentinels to open the vault. You can spend 2 mana on your turn to restore a Dawnward mark.';
    if(watch) objective=`<p>${watch.label} · The Watch pulses every ${watch.interval} turns of the first living Sentinel. Restore all three marks to silence it.</p>`;
  }
  return `<section class="field story" aria-label="Match story"><h2>${heading}</h2><p>${passage}</p>${objective}</section>`;
}
function tablePanel(active){
  if(!game.objective) return '';
  const objective=game.objective;
  const mine=game.players[game.seat];
  const truce=game.truce;
  const canReply=truce?.to===game.seat&&!truce.accepted&&!game.combat&&!busy;
  const truceStatus=truce?`<p>${escape(game.players[truce.from].name)} ${truce.accepted?'has a truce with':'offered a truce to'} ${escape(game.players[truce.to].name)}.</p>
    ${canReply?'<button class="outline" data-action="acceptTruce">Accept truce</button> <button class="quiet" data-action="declineTruce">Decline</button>':''}`:'';
  const canContest=active&&objective.claimed===null&&objective.lastTurn!==game.round&&mine.mana>=objectiveCost;
  return `<section class="field" aria-label="Courtyard key"><h2>Courtyard key</h2><p>Sun ${objective.progress[0]} / ${objectiveGoal} · Moon ${objective.progress[1]} / ${objectiveGoal}</p>
    ${objective.claimed===null?`<p>First to three claims. Each teammate gains one extra mana capacity on their next turn.</p><button class="outline" data-action="contestObjective" ${canContest?'':'disabled'}>Contest key · ${objectiveCost} mana</button>`:`<p>${teamName(game.mode,objective.claimed)} claimed the key.</p>`}
    ${truceStatus}</section>`;
}
function renderSpectator(){
  const winner=game.players[game.winner];
  const result=game.mode==='ffa'?escape(winner.name):teamName(game.mode,winner.team);
  arena.innerHTML=`<div class="bar"><h1>Final battlefield</h1><a href="/">Game lobby</a></div>
    <p role="status">${result} won. ${escape(game.last??'')}</p>
    ${storyPanel()}<div class="opponents">${game.players.map((p,i)=>`<section class="field">
      <h2>${escape(p.name)}${p.leader?' · '+cards[p.leader].name:''}</h2>
      <p>${p.eliminated?'Eliminated':Math.max(0,p.life)+' life'}${p.tree?' · '+trees[p.leader]?.branches.find(branch=>branch.id===p.tree)?.name:''}
      ${p.unlocked?' · '+p.unlocked+' nodes':''}</p>
      <div class="cards">${p.board.map(unit=>card(unit,'enemy',false,i)).join('')||'<span>No creatures in play</span>'}</div>
    </section>`).join('')}</div>`;
}
function viewState(combat,blocking,reacting,mine){
  if(combat?.id!==draftCombat){
    blockDraft={};
    draftCombat=combat?.id;
  }
  const others=game.players.flatMap((p,i)=>i===game.seat?[]:[i]);
  if(!others.includes(viewedSeat)){
    viewedSeat=others.find(i=>!game.players[i].eliminated&&!sameSide(mine,game.players[i]))??others[0];
  }
  const truceOffer=game.truce?.to===game.seat&&!game.truce.accepted;
  const window=mine.choice?`choice-${mine.choice.type}`:blocking||reacting?`${combat.id??combat.unit}-${combat.phase}`:
    truceOffer?`truce-${game.round}`:game.winner!==null?'result':'';
  if(window&&window!==actionWindow){
    if(mine.choice) openPanel='choice';
    else if(truceOffer&&!blocking&&!reacting) openPanel='table';
    else if(game.winner!==null) openPanel='result';
    else{
      viewedSeat=combat.attacker===game.seat?combat.defender:combat.attacker;
      openPanel=blocking&&!combat.strikes?'':'combat';
    }
  }
  actionWindow=window;
  if(openPanel==='choice'&&!mine.choice||openPanel==='combat'&&!combat) openPanel='';
  return others;
}
function renderBattlefield(markup){
  const scrollPositions=new Map([...arena.querySelectorAll('[data-scroll]')].map(node=>[node.dataset.scroll,[node.scrollLeft,node.scrollTop]]));
  const focus=document.activeElement;
  let focusSelector='';
  if(arena.contains(focus)){
    if(focus.id) focusSelector='#'+CSS.escape(focus.id);
    else{
      const keys=['id','zone','action','panel','opponent','branch','gate','choice','job','holder','plot','scroll'].filter(key=>focus.dataset[key]!==undefined);
      focusSelector=keys.map(key=>`[data-${key}="${CSS.escape(focus.dataset[key])}"]`).join('');
    }
  }
  arena.innerHTML=markup;
  if(focusSelector) arena.querySelector(focusSelector)?.focus({preventScroll:true});
  for(const node of arena.querySelectorAll('[data-scroll]')){
    const offset=scrollPositions.get(node.dataset.scroll);
    if(offset) [node.scrollLeft,node.scrollTop]=offset;
  }
  updateClock();
}
function render(){
  if(!game) return;
  lobby.hidden=true;
  arena.hidden=false;
  arena.classList.toggle('match-live',game.started&&!watching);
  if(watching){renderSpectator();return;}
  saveCoopMemory();
  if(!game.started){
    const mine=game.players[game.seat];
    const roster=game.players.map((p,i)=>`<li>${escape(p.name)}${game.mode&&game.mode!=='ffa'?' · '+teamName(game.mode,p.team):''}${p.leader?' · '+cards[p.leader].name:''}${i===0?' · Host':''}${i===game.seat?' · You':''}</li>`).join('');
    const requirements=game.mode==='teams'?'Team PvP starts with four or six players. Teams alternate by join order.':game.mode==='coop'?`This match includes ${game.botCount} Sentinel bots.`:'At least two players are needed.';
    const opening=game.rules>=3?`<h2>Opening hand</h2><div class="cards">${mine.hand.map(unit=>card(unit,'hand',false)).join('')}</div><button class="outline" data-action="redraw" ${mine.redrawn||busy?'disabled':''}>${mine.redrawn?'Opening hand redrawn':'Redraw opening hand once'}</button>`:'';
    arena.innerHTML=`<section class="panel waiting"><h1>${game.ranked?'Ranked FFA rules':modes[game.mode]||'Match lobby'}</h1><p>Share your invite link or room code with friends.</p><strong class="code">${room}</strong><div class="actions"><button class="outline" data-action="copy">Copy invite link</button>${game.seat===0?`<button class="gold" data-action="start" ${game.readyToStart&&!busy?'':'disabled'}>Start match</button>`:''}</div><h2>${game.players.length} of ${game.humanLimit||MAX_PLAYERS} player seats</h2><ol class="roster">${roster}</ol><p id="status" role="status">${escape(error||(game.seat!==0?'Waiting for the host to start.':!game.readyToStart||game.mode==='coop'?requirements:''))}</p>${storyPanel()}${opening}<a href="/">Back to lobby</a></section>`;
    return;
  }
  const mine=game.players[game.seat];
  const combat=game.combat;
  const blocking=combat?.phase==='block'&&combat.defender===game.seat&&!busy;
  const reacting=combat?.phase==='react'&&combat.canReact&&!busy;
  const yourTurn=game.active===game.seat&&game.winner===null&&!busy&&!mine.eliminated&&!combat;
  const active=yourTurn&&!mine.choice;
  const otherSeats=viewState(combat,blocking,reacting,mine);
  const choicePanel=mine.choice?`<section class="field" aria-label="Choose a card"><h2>${mine.choice.type==='oracle'?'Look at your top card':'Keep one card'}</h2>
    ${mine.choice.cards.map((unit,i)=>`<button class="outline" data-action="choose-card" data-choice="${i}" ${yourTurn?'':'disabled'}>${mine.choice.type==='oracle'?'Keep on top · ':''}${cards[unit.kind].name}</button>`).join('')}
    ${mine.choice.type==='oracle'?`<button class="outline" data-action="choose-card" data-choice="1" ${yourTurn?'':'disabled'}>Put on bottom</button>`:''}</section>`:'';
  const winner=game.players[game.winner];
  const outcome=game.winner===null?'':sameSide(mine,winner)?'Your team won!':game.mode&&game.mode!=='ffa'?teamName(game.mode,winner.team)+' won.':game.winner===game.seat?'You won!':winner.name+' won.';
  const prompt=selected?.type==='read-record'?'Choose an opponent whose hand Neri will read.':attackIds.length?`Choose an opponent for ${attackIds.length} attacker${attackIds.length===1?'':'s'}.`:selected?.own?'Choose one of your creatures.':selected?.playerOnly?'Choose an opposing player.':selected?.creatureOnly?'Choose an opposing creature.':selected?'Choose an opposing target.':game.active===game.seat?'Your turn':game.players[game.active].name+'’s turn';
  const attacker=combat&&game.players[combat.attacker];
  const defender=combat&&game.players[combat.defender];
  const attackingCard=combat&&attacker.board.find(unit=>unit.id===combat.unit);
  const batchRows=combat?.strikes?.map((strike,i)=>{
    const name=cards[attacker.board.find(unit=>unit.id===strike.unit).kind].name;
    const blocker=defender.board.find(unit=>unit.id===strike.blocker);
    const options=blocking?mine.board.filter(unit=>!unit.exhausted).map(unit=>`<option value="${unit.id}" ${blockDraft[strike.unit]===unit.id?'selected':''}>${cards[unit.kind].name} · ${unitPower(mine,unit)} / ${unit.hp}</option>`).join(''):'';
    return `<div class="combat-row"><label for="strike-${i}">${i+1}. ${name} ${strike.boost?' +'+strike.boost+' power':''}${strike.shield?' · '+strike.shield+' shield':''}</label>${blocking?`<select id="strike-${i}" data-strike="${strike.unit}"><option value="">Unblocked</option>${options}</select>`:blocker?`<span>Blocked by ${cards[blocker.kind].name}</span>`:'<span>Unblocked</span>'}</div>`;
  }).join('');
  const pendingNames=combat?.pendingReactions?.map(seat=>seat===game.seat?'you':game.players[seat].name);
  const reactionWaiting=pendingNames?.length?`<p class="reaction-waiting">Waiting for <strong>${escape(new Intl.ListFormat('en').format(pendingNames))}</strong>.</p>`:'';
  const batchPanel=combat?.strikes?`<section class="field combat"><strong>${escape(attacker.name)} attacks ${escape(defender.name)}</strong><p>${blocking?'Assign each blocker once.':reacting?'Choose an attacker, then play a reaction or pass.':combat.phase==='block'?'Waiting for the defender.':'Reaction window.'}</p>${reactionWaiting}<div class="combat-grid">${batchRows}</div>${blocking?'<button class="gold" data-action="blocks">Confirm blockers</button>':''}${reacting?`<label for="reaction-target">Reaction target</label> <select id="reaction-target">${combat.strikes.map((strike,i)=>`<option value="${strike.unit}" ${reactionTarget===strike.unit?'selected':''}>${i+1}. ${cards[attacker.board.find(unit=>unit.id===strike.unit).kind].name}</option>`).join('')}</select> <button class="outline" data-action="pass">Pass</button>`:''}</section>`:'';
  const combatPanel=batchPanel||(combat?`<section class="field combat"><strong>${escape(attacker.name)} attacks ${escape(defender.name)} with ${cards[attackingCard.kind].name}</strong><p>${combat.phase==='block'?(blocking?'Choose a blocker on your battlefield.':'Waiting for the defender.'):reacting?'Play a reaction from your hand, or pass.':'Reaction window.'}</p>${reactionWaiting}${combat.phase==='react'?`<p>Attack bonus +${combat.boost} · Damage prevention ${combat.shield}</p>`:''}${blocking?'<button class="outline" data-action="no-block">Take the hit</button>':''}${reacting?'<button class="outline" data-action="pass">Pass</button>':''}</section>`:'');
  const teamLabel=p=>game.mode&&game.mode!=='ffa'?teamName(game.mode,p.team):'';
  const status=error||outcome||(mine.eliminated?'You’re eliminated.':blocking?'Assign blockers.':reacting?'Play a reaction from your hand or pass.':mine.choice?'Choose a card.':prompt);
  const primaryClock=combat?'<span id="combat-clock" class="match-clock"></span>':game.turnDeadline&&!outcome?'<span id="turn-clock" class="match-clock"></span>':'';
  const other=game.players[viewedSeat];
  const otherIsEnemy=other&&!other.eliminated&&!sameSide(mine,other);
  const truceProtects=game.truce?.accepted&&game.truce.from===game.seat&&game.truce.to===viewedSeat;
  const targeting=active&&otherIsEnemy&&!selected?.own&&(selected||attackIds.length);
  const targetPlayer=targeting&&(!attackIds.length||!truceProtects)&&!selected?.creatureOnly&&
    (attackIds.length||game.rules>=2||selected?.type==='play'||!other.board.length);
  const targetCreature=targeting&&!selected?.playerOnly&&(game.rules<2||['play','summon'].includes(selected?.type));
  const leaderReady=active&&mine.leader&&mine.mana>=mine.leaderCost&&!mine.board.some(unit=>unit.kind===mine.leader);
  const seats=otherSeats.map(i=>{
    const p=game.players[i];
    const state=p.eliminated?'Eliminated':game.threat===i?'Threat':teamLabel(p);
    return `<button class="seat-chip" data-action="view-seat" data-opponent="${i}" aria-pressed="${viewedSeat===i}" ${game.active===i&&!outcome?'data-taking-turn':''}>
      ${p.leader?portrait(p.leader):''}<span class="seat-copy"><strong>${escape(p.name)}</strong><small>${state||p.board.length+' creatures'}</small></span>
      <span class="seat-life" aria-label="${Math.max(0,p.life)} life">♥ ${Math.max(0,p.life)}</span></button>`;
  }).join('');
  const leaderButton=mine.leader?`<button class="outline summon-button" data-action="summon" title="${cards[mine.leader].name}" ${leaderReady?'':'disabled'}>Summon leader <b>${mine.leaderCost} ◆</b></button>`:'';
  const canOffer=game.teamsPolitics&&active&&!game.attacked&&game.truceOfferedTurn!==game.round&&otherIsEnemy;
  const canRead=active&&mine.leader==='neri'&&!mine.recordRead;
  const revealed=game.record?`<p>${escape(game.players[game.record.opponent].name)}’s hand · ${game.record.cards.map(kind=>cards[kind].name).join(', ')}</p>`:'';
  const summary=other?`<p><strong>${escape(other.name)}</strong> ${teamLabel(other)} · ${other.mana}/${other.max} mana · ${other.handSize} in hand · ${other.deckSize} in deck</p>`:'';
  const leaderDamage=game.players.flatMap(p=>(p.leaderDamage??[]).map(entry=>
    `<p>${escape(p.name)} took ${entry.damage}/${leaderDamageGoal} damage from ${cards[entry.kind].name}.</p>`)).join('');
  const table=`${tablePanel(active)}<section class="field" aria-label="Players">${summary}${leaderDamage}
    ${canOffer?`<button class="outline" data-action="proposeTruce" data-opponent="${viewedSeat}">Offer ${escape(other.name)} a truce</button>`:''}
    ${canRead?'<button class="outline" data-action="choose-record">Read a missing name</button>':''}${revealed}</section>`;
  const episode=game.chapter?(game.episode??'watch'):undefined;
  const nextEpisode=chapters[episode]?.next;
  const canContinue=nextEpisode&&(episode==='watch'||!winner?.bot);
  const chapterActions=episode?`
    <a class="quiet" href="/chronicle.html#${episode}">Read the Chronicle</a>
    <button class="outline" data-action="replay-chapter" data-episode="${episode}" ${busy?'disabled':''}>Replay chapter</button>
    ${canContinue?`<button class="gold" data-action="next-chapter" data-episode="${nextEpisode}" ${busy?'disabled':''}>Continue to ${chapters[nextEpisode].title}</button>`:''}`:'';
  const result=outcome?`<section class="field"><h2>${escape(outcome)}</h2>${storyPanel()}
    <div class="result-actions"><a class="quiet" href="/?watch=1&amp;room=${room}">Share final battlefield</a>
    ${chapterActions}</div></section>`:'';
  const orchardWarning=game.episode==='orchard'&&game.story?.patrolIn===1&&!game.story.sheltered[game.story.patrol];
  const foundryWarning=game.episode==='foundry'&&game.story?.heatIn===1&&!game.story.vented;
  const panels=[
    {id:'combat',label:'Combat',html:combatPanel},
    {id:'choice',label:'Card choice',html:choicePanel},
    {id:'tree',label:`Tree · ${mine.growth}`,html:treePanel(mine,active)},
    {id:'story',label:orchardWarning?'Story · Sweep next':foundryWarning?'Story · Blast next':game.story?.pulseIn&&game.story.marks<wardMarks?`Story · Pulse in ${game.story.pulseIn}`:'Story',html:storyPanel(active)},
    {id:'table',label:game.truce?.to===game.seat&&!game.truce.accepted?'Truce offer':'Table',html:table},
    {id:'result',label:'Result',html:result}
  ].filter(panel=>panel.html);
  const panel=panels.find(panel=>panel.id===openPanel);
  const tabs=panels.map(item=>`<button class="panel-toggle" data-action="panel" data-panel="${item.id}" aria-expanded="${panel===item}"
    ${['combat','choice','result'].includes(item.id)||item.label==='Truce offer'||item.id==='story'&&(foundryWarning||orchardWarning)?'data-attention':''}>${item.label}</button>`).join('');
  const hand=mine.hand.map(unit=>{
    const reaction=cards[unit.kind].reaction;
    const early=active&&!game.attacked&&mine.board.length&&earlyReaction(mine,unit.kind);
    return card(unit,reaction&&!early?'reaction':'hand',(reaction?reacting||early:active)&&cardCost(mine,unit.kind)<=mine.mana);
  }).join('');
  renderBattlefield(`<div class="match-shell">
    <div class="match-header">
      <div class="match-status"><h1 id="status" role="status">${escape(status)}</h1><p title="${escape(game.last??'')}">${game.last&&!error?escape(game.last):''}</p></div>
      ${primaryClock}<button class="quiet" data-action="${outcome||mine.eliminated?'leave':'concede'}" ${busy?'disabled':''}>${outcome||mine.eliminated?'Lobby':'Concede'}</button>
    </div>
    <nav class="match-seats" aria-label="Choose a battlefield">${seats}</nav>
    <nav class="match-tools" aria-label="Match panels">${tabs}</nav>
    <div class="match-center ${panel?'has-drawer':''}">
      <div class="match-board">
        ${other?`<section data-seat="${viewedSeat}" class="board-row" aria-label="${escape(other.name)}’s battlefield">
          <div class="board-heading"><strong>${escape(other.name)}</strong><small>${teamLabel(other)}</small>
            ${targetPlayer?`<button class="gold target-button" data-action="hero" data-opponent="${viewedSeat}">${attackIds.length?`Attack with ${attackIds.length}`:selected?.type==='read-record'?'Read hand':'Target player'}</button>`:''}
          </div>
          <div class="cards" data-scroll="enemy-${viewedSeat}" tabindex="0" aria-label="${escape(other.name)}’s creatures">${other.eliminated?'Out of the match':other.board.map(unit=>card(unit,'enemy',!!targetCreature,viewedSeat)).join('')||'<span>No creatures</span>'}</div>
        </section>`:''}
        <section data-seat="${game.seat}" class="board-row your-board" aria-label="Your battlefield">
          <div class="board-heading"><strong>Your battlefield</strong>${attackIds.length?`<small>${attackIds.length} selected</small>`:''}</div>
          <div class="cards" data-scroll="mine" tabindex="0" aria-label="Your creatures">${mine.board.map(unit=>card(unit,blocking&&!combat.strikes?'block':'mine',blocking&&!combat.strikes?!unit.exhausted:active&&(selected?.own||unit.ready&&!game.attacked))).join('')||'<span>No creatures</span>'}</div>
        </section>
      </div>
      ${panel?`<aside class="match-drawer" aria-label="${panel.label}">
        <div class="drawer-heading"><strong>${panel.label}</strong><button class="quiet" data-action="close-panel" aria-label="Close panel">Close</button></div>
        <div class="drawer-body" data-scroll="panel-${panel.id}" tabindex="0">${panel.html}</div>
      </aside>`:''}
    </div>
    <section class="hand-dock" aria-label="Your hand">
      <div class="hand-toolbar"><div class="hand-resources"><strong>Your hand</strong><span title="Life">♥ ${Math.max(0,mine.life)}</span><span title="Available mana">◆ ${mine.mana}/${mine.max}</span></div>
        <div class="hand-actions">${leaderButton}<button class="gold" data-action="end" ${active?'':'disabled'}>End turn</button></div>
      </div>
      <div class="cards" tabindex="0" data-scroll="hand" aria-label="Cards in your hand">${hand||'<span>Your hand is empty</span>'}</div>
    </section>
  </div>`);
}
function enter(state){
  const nextRoom=state.code||requested;
  if(room!==nextRoom){
    viewedSeat=undefined;
    openPanel='';
    actionWindow='';
  }
  room=nextRoom;
  game=state;
  history.replaceState(null,'','/?room='+room+(watching?'&watch=1':''));
  render();
}
async function enterFromForm(event,create){
  event.preventDefault();
  const button=event.currentTarget.querySelector('button');
  button.disabled=true;
  $('lobby-error').textContent='';
  try{
    const code=create?'CREATE':$('guest-code').value.trim().toUpperCase();
    if(!create&&!/^[A-F0-9]{8}$/.test(code)) throw Error('Enter the eight-character room code.');
    const memory=readMemory();
    const leader=$(create?'host-leader':'guest-leader').value;
    const episode=$('host-episode').value;
    const previous=previousChapter(episode);
    const priorOutcome=memory.outcomes?.[previous]??(previous==='watch'?memory.watch:undefined);
    const remember=$(create?'host-remember':'guest-remember').checked;
    const state=await api(code,{type:create?'create':'join',mode:$('host-mode').value,botCount:Number($('host-bots').value),
      chapter:$('host-chapter').checked,episode,difficulty:$('watch-difficulty').value,
      priorOutcome,resume:remember?memory.leaders?.[leader]:undefined,
      ranked:$('host-mode').value==='ffa'&&$('ranked').checked,privateTable:$('private-table').checked,leaderDamage:$('leader-damage').checked,turnSeconds:Number($('host-timer').value),
      name:$(create?'host-name':'guest-name').value,leader});
    if(remember&&state.mode==='coop') sessionStorage.emberveilRememberRoom=state.code;
    enter(state);
  }catch(reason){$('lobby-error').textContent=reason.message;}
  finally{button.disabled=false;}
}
$('create').onsubmit=event=>enterFromForm(event,true);
$('join').onsubmit=event=>enterFromForm(event,false);

async function move(data){
  if(busy) return;
  busy=true;
  error='';
  try{
    game=await api(room,{...data,revision:game.revision});
    selected=undefined;
    attackIds=[];
    if(!game.combat) reactionTarget='';
  }catch(reason){error=reason.message;return;}
  finally{busy=false;render();}
  animateEffect();
}
arena.onclick=async event=>{
  const button=event.target.closest('button');
  if(!button||button.disabled) return;
  const {action,zone,id,opponent,branch}=button.dataset;
  if(action==='view-seat'){
    viewedSeat=Number(opponent);
    if(openPanel&&openPanel!=='choice') openPanel='';
    render();
    return;
  }
  if(action==='panel'||action==='close-panel'){
    const requested=button.dataset.panel;
    const previous=openPanel;
    openPanel=requested&&previous!==requested?requested:'';
    render();
    if(action==='close-panel') arena.querySelector(`[data-panel="${previous}"]`)?.focus();
    return;
  }
  if(action==='copy'){
    try{await navigator.clipboard.writeText(location.href);$('status').textContent='Invite link copied.';}
    catch{$('status').textContent='Share the URL from your address bar.';}
  }
  if(action==='leave') location.href='/';
  if(action==='choose-record'){
    attackIds=[];
    selected={type:'read-record',playerOnly:true};
    openPanel='';
    render();
  }
  if(action==='next-chapter'||action==='replay-chapter'){
    if(busy) return;
    busy=true;
    const mine=game.players[game.seat];
    const remember=sessionStorage.emberveilRememberRoom===room;
    try{
      const state=await api('CREATE',{type:'create',mode:'coop',chapter:true,episode:button.dataset.episode,leader:mine.leader,name:mine.name,
        botCount:game.botCount,difficulty:game.difficulty,turnSeconds:game.turnSeconds,priorOutcome:action==='next-chapter'?game.chapterOutcome:game.priorOutcome,
        resume:remember?readMemory().leaders?.[mine.leader]:undefined});
      if(remember) sessionStorage.emberveilRememberRoom=state.code;
      error='';
      selected=undefined;
      attackIds=[];
      enter(state);
    }catch(reason){error=reason.message;}
    finally{busy=false;render();}
    return;
  }
  if(action==='tend') await move({type:action,plot:button.dataset.plot,id:$('orchard-tender')?.value});
  if(action==='foundry') await move({type:action,job:button.dataset.job,holder:button.dataset.holder,id:$('foundry-worker')?.value});
  if(action==='escort') await move({type:action,route:button.dataset.route,id:$('escort-guard')?.value});
  if(action==='fortify') await move({type:action,gate:button.dataset.gate});
  if(action==='proposeTruce') await move({type:action,opponent:Number(opponent)});
  if(['acceptTruce','declineTruce','contestObjective'].includes(action)) await move({type:action});
  if(action==='rekindle') await move({type:'rekindle'});
  if(action==='redraw') await move({type:'redraw'});
  if(action==='unlock') await move({type:'unlock',branch});
  if(action==='blocks'){
    const blocks=[...arena.querySelectorAll('[data-strike]')].filter(select=>select.value)
      .map(select=>({attacker:select.dataset.strike,blocker:select.value}));
    if(new Set(blocks.map(block=>block.blocker)).size!==blocks.length){
      $('status').textContent='Assign each blocker only once.';
      return;
    }
    await move({type:'blocks',blocks});
  }
  if(action==='start') await move({type:'start'});
  if(action==='choose-card') await move({type:'choose-card',choice:Number(button.dataset.choice)});
  if(action==='summon'){
    const target=summonTarget(game.players[game.seat]);
    const mine=game.players[game.seat];
    const hasTarget=game.players.some((p,i)=>i!==game.seat&&!p.eliminated&&!sameSide(mine,p)&&p.board.length);
    if(target==='player'||target==='creature'&&hasTarget){
      attackIds=[];
      selected={type:'summon',playerOnly:target==='player',creatureOnly:target==='creature'};
      render();
    }else await move({type:'summon'});
  }
  if(action==='pass') await move({type:'pass',combatId:game.combat?.id});
  if(action==='no-block'||zone==='block') await move({type:'block',id});
  if(zone==='reaction'){
    const strike=$('reaction-target')?.value||reactionTarget||game.combat?.strikes?.[0]?.unit;
    await move({type:'react',id,strike,combatId:game.combat?.id});
  }
  if(action==='end') await move({type:'end'});
  if(action==='concede' && confirm('Concede this match?')) await move({type:'concede'});
  if(action==='hero' && attackIds.length){await move({type:'attack-batch',ids:attackIds,opponent:Number(opponent)});return;}
  if(action==='hero' && selected) await move({...selected,target:'hero',opponent:Number(opponent)});
  if(zone==='enemy' && selected) await move({...selected,target:id,opponent:Number(opponent)});
  if(zone==='mine'&&selected?.own){
    await move({...selected,target:id});
    return;
  }
  if(zone==='mine'&&game.rules>=3){
    selected=undefined;
    attackIds=attackIds.includes(id)?attackIds.filter(unit=>unit!==id):[...attackIds,id];
    error='';
    render();
    return;
  }
  if(zone==='mine' || zone==='hand'){
    attackIds=[];
    const type=zone==='mine'?'attack':'play';
    const item=game.players[game.seat].hand.find(unit=>unit.id===id);
    if(zone==='hand' && !cards[item.kind].damage && !cards[item.kind].freeze && !cards[item.kind].reaction) await move({type,id});
    else{
      selected=selected?.id===id?undefined:{type,id,creatureOnly:zone==='hand'&&!!cards[item.kind].freeze,own:zone==='hand'&&!!cards[item.kind].reaction};
      error='';
      render();
    }
  }
};
arena.onkeydown=event=>{
  if(event.key==='Escape'&&openPanel&&!event.defaultPrevented){
    const previous=openPanel;
    openPanel='';
    render();
    arena.querySelector(`[data-panel="${previous}"]`)?.focus();
  }
};
arena.onchange=event=>{
  if(event.target.id==='reaction-target') reactionTarget=event.target.value;
  if(event.target.dataset.strike) blockDraft[event.target.dataset.strike]=event.target.value;
};
function updateClock(){
  const turn=$('turn-clock');
  if(turn&&game?.turnDeadline) turn.textContent='Turn · '+Math.max(0,Math.ceil((game.turnDeadline-Date.now())/1000))+'s';
  const clock=$('combat-clock');
  if(clock&&game?.combat) clock.textContent='Combat · '+Math.max(0,Math.ceil((game.combat.deadline-Date.now())/1000))+'s';
}
setInterval(updateClock,250);
setInterval(async ()=>{
  if(!room||busy||refreshing||game.winner!==null) return;
  refreshing=true;
  try{
    const next=await api(room);
    if(!busy&&next.revision>game.revision){
      if(next.round!==game.round||next.combat?.id!==game.combat?.id||next.winner!==null){
        selected=undefined;
        attackIds=[];
      }
      game=next;
      if(!game.combat) reactionTarget='';
      error='';
      render();
      animateEffect();
    }
  }catch{
    if(!busy&&error!=='Connection interrupted. Reconnecting…'){
      error='Connection interrupted. Reconnecting…';
      render();
    }
  }finally{refreshing=false;}
},1200);
if(/^[A-F0-9]{8}$/.test(requested)){
  api(requested).then(state=>{if(!room) enter(state);}).catch(reason=>{if(watching) $('lobby-error').textContent=reason.message;});
}
