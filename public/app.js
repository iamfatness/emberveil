import {cards,leaders,trees,MAX_PLAYERS,modes,lore,wardCost,wardMarks,cardCost,unitPower,summonTarget,earlyReaction,objectiveCost,objectiveGoal,leaderDamageGoal,watchDifficulties,gates,gateGoal,chapters,previousChapter,routesByEpisode,routeGoal,orderDeliveryCost,foundryRules,foundryDifficulty,orchardPlots,orchardCost,orchardDifficulty,archiveRoutes,archiveCost,witnessLead,registerSections,registerCost,registerRecovery,registerGoal,registerStartingPages,dawnRoute,dawnReadingCost,dawnHearingTurns,dawnGoal,stairCosts,stairGoal,stairHelp,landingRoute,landingGoal,liftCosts,upperDoorRoute,upperDoorGoal,upperDoorGuards,supplyCost,countDoorGuards,commonTableRoute,commonTableGoal,lampReserve,firstPetitionRoute,firstPetitionGoal,maxSignatureSupport,signatureSupport,gateCharterRoute,gateCharterGoal,charterHearingCost,canCarryCharterCopy,sharedKeysRoute,sharedKeysGoal,sharedKeyCost,livingKeyBearers,lanePlayThisTurn,openRoadRoute,openRoadGoal,wagonCost,reedFordRoute,reedFordGoal,fordPlanks,shallowsCost,shallowsOpen,farBankRoute,farBankGoal,farBankUnloadMana,farBankShelterDamage,farBankManaUsed} from '/game.mjs';
import {createPresentation} from '/presentation.mjs';

const $=id=>document.getElementById(id);
const lobby=$('lobby'),arena=$('arena');
const presentation=createPresentation(arena,$('match-effects'));
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
    if(game.episode==='orchard') memory.orchardFoundryKeyholder=game.priorOutcome??null;
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
function card(unit,zone,enabled,opponent){
  const info=cards[unit.kind];
  const inHand=zone==='hand'||zone==='reaction';
  const owner=game.players[opponent??game.seat];
  const cost=cardCost(owner,unit.kind);
  const detail=inHand?(info.text??(info.damage?'Deal '+info.damage+' damage':info.heal?'Gain '+info.heal+' life':info.power+' / '+info.hp)):unitPower(owner,unit)+' / '+unit.hp;
  const condition=inHand?'':unit.frozen||unit.freezeTurn?'Frozen':unit.exhausted?'Exhausted':!unit.ready?'Resting':'';
  const frame=Object.hasOwn(leaders,unit.kind)?'leader':info.power?'creature':'spell';
  return `<button class="card" data-kind="${unit.kind}" data-frame="${frame}" data-condition="${condition.toLowerCase()}" data-zone="${zone}" data-id="${unit.id}" data-opponent="${opponent??''}" data-selected="${selected?.id===unit.id||attackIds.includes(unit.id)}" ${enabled?'':'disabled'}><strong>${info.name}</strong><span class="card-art">${portrait(unit.kind)}${inHand?`<b class="mana-cost" aria-label="${cost} mana">${cost}</b>`:''}</span><span class="card-detail">${detail}${unit.earlyBoost?' · +'+unit.earlyBoost+' power in combat':''}${unit.earlyShield?' · '+unit.earlyShield+' damage prevention in combat':''}${condition?' · '+condition:''}</span></button>`;
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

function archivePanel(active){
  const {story,difficulty,priorOutcome,foundryKeyholder}=game;
  const leads={
    'orchard-held':'A family from the shelter beds recognizes the receipt. Their witness is already on the road.',
    detachment:'The road is quiet after the last Sentinel fell. Sylva sends the receipt with a runner.',
    lost:'A family that fled the Orchard hid the receipt beneath a folded blanket.'
  };
  const help={
    workers:'Foundry workers send a reading lamp. Your first ledger step costs 1 less mana.',
    court:'The court has ordered the archivist to keep the side door open for one extra Watch turn.'
  };
  const endings={
    ledger:['The Seal in Ink','Neri sets the copy beside the receipt. The three seals match. The clerk leaves a blank line for the house the court refused to name.'],
    witness:['A Voice at the Hearing','The witness places a hand on the rail and names the people who stood under the third seal. The clerk asks how to spell the first name.'],
    detachment:['The Watch Leaves the Archive','The Watch falls back. Neri has the receipt, and the court will have to hear her. The matching record has yet to be found.'],
    lost:['The Side Door Shuts','The Watch locks the archive. Neri folds the receipt and walks back to the briars with the family that kept it.']
  };
  const ending=endings[story?.ending];
  if(ending) return `<section class="field story" aria-label="Match story"><h2>${ending[0]}</h2><p>${ending[1]}</p></section>`;
  const {title,intro}=lore['third-seal'];
  const mine=game.players[game.seat];
  const ready=mine.board.filter(unit=>unit.ready&&!unit.exhausted);
  const guard=active&&ready.length?`<label for="archive-guard">Creature to escort the evidence</label>
    <select id="archive-guard">${ready.map((unit,i)=>`<option value="${unit.id}">${i+1}. ${cards[unit.kind].name} · ${unitPower(mine,unit)} / ${unit.hp}</option>`).join('')}</select>`:'';
  const closed=story?.archiveIn===0;
  const bell=story&&story.route!=='witness'?`<p><strong>${closed?'The archive is closed.':story.archiveIn===1?'The bell rings on the next Watch turn.':`The bell rings in ${story.archiveIn} Watch turns.`}</strong>
    ${story.incompleteLedger?'The unfinished copy was left inside. The witness can still reach the hearing.':''}</p>`:'';
  const routes=Object.entries(archiveRoutes).filter(([route])=>!story?.route||story.route===route);
  const actions=routes.map(([route,info])=>{
    const cost=archiveCost(route,game);
    const marks=story?.route===route?story.marks:route==='witness'?witnessLead(game):0;
    const locked=route==='ledger'&&closed;
    const available=active&&ready.length&&story.channelTurn!==game.round&&mine.mana>=cost&&!locked;
    return `<p><strong>${info.name}</strong> · ${marks} / ${routeGoal(info,difficulty)} steps${locked?' · Archive closed':''}</p>
      ${story?`<button class="outline" data-action="present-evidence" data-route="${route}" ${available?'':'disabled'}>${info.name} · ${cost} mana</button>`:''}`;
  }).join('');
  return `<section class="field story" aria-label="Match story"><h2>${title}</h2><p>${intro} ${leads[priorOutcome]??''}</p>
    ${help[foundryKeyholder]?`<p>${help[foundryKeyholder]}</p>`:''}
    <p>Bring one kind of evidence to the hearing or defeat the Sentinels. The first step commits the party. If the bell rings before the ledger is copied, you can still bring a witness.</p>
    ${bell}${guard}${actions}<small>Advance once per turn. The chosen creature cannot attack or block until it readies.</small></section>`;
}

function registerPanel(active){
  const {story,difficulty,priorOutcome}=game;
  const {title,intro}=lore['ash-register'];
  const briefings={
    ledger:'The archivist matched the ledger to the receipt. Start with one page of gate orders.',
    witness:'The witness named the families who stood under the third seal. Start with one page of shelter names.',
    detachment:'Neri brings the receipt after the Watch falls back. Both records start empty.',
    lost:'Neri brings the receipt from the briars. Both records start empty.'
  };
  const endings={
    'court-record':['The Books Stay Open','The clerk lays the books where any house can read them. Neri pushes a stool up to the table. The first person in line has a correction.'],
    'shelter-copies':['A Copy at Every Door','Before dawn the shelters each have a copy. Their keepers lay them beside the bread boards. By noon the court is asking for a copy of its own.'],
    detachment:['The Books Are Still Here','The last Sentinel leaves the room. Neri wraps both books in cloth. The question of who keeps them is still open.'],
    lost:['The Hearing Is Empty','The Watch takes the table. Neri carries out what she can under her coat.']
  };
  const ending=endings[story?.ending];
  if(ending) return `<section class="field story" aria-label="Match story"><h2>${ending[0]}</h2><p>${ending[1]}</p></section>`;
  const goal=registerGoal(difficulty);
  const pages=story?.pages??registerStartingPages(priorOutcome);
  const complete=Object.values(pages).every(count=>count===goal);
  const mine=game.players[game.seat];
  const ready=mine.board.filter(unit=>unit.ready&&!unit.exhausted);
  const canWrite=active&&ready.length&&story.channelTurn!==game.round&&mine.mana>=registerCost;
  const scribe=active&&!complete&&ready.length?`<label for="register-scribe">Creature to record a page</label>
    <select id="register-scribe">${ready.map((unit,i)=>`<option value="${unit.id}">${i+1}. ${cards[unit.kind].name} · ${unitPower(mine,unit)} / ${unit.hp}</option>`).join('')}</select>`:'';
  const sections=Object.entries(registerSections).map(([page,name])=>{
    const count=pages[page];
    return `<div class="ward-progress"><progress value="${count}" max="${goal}" aria-label="${name} recorded"></progress><strong>${name} · ${count} / ${goal}</strong></div>
      ${story&&!complete?`<button class="outline" data-action="record-page" data-page="${page}" ${canWrite&&count<goal?'':'disabled'}>Record ${name.toLowerCase()} · ${registerCost} mana</button>`:''}`;
  }).join('');
  return `<section class="field story" aria-label="Match story"><h2>${title}</h2><p>${intro}</p>
    ${briefings[priorOutcome]?`<p>${briefings[priorOutcome]}</p>`:''}
    <p>Complete both records and choose who keeps them, or defeat the Sentinels. Record gate orders to draw a card. Record shelter names to regain up to ${registerRecovery} life.</p>
    ${scribe}${sections}
    ${complete?`<p>Both records are complete. Choose who keeps them.</p>
      <button class="outline" data-action="place-register" data-keeper="court-record" ${active?'':'disabled'}>File the books in open court</button>
      <button class="outline" data-action="place-register" data-keeper="shelter-copies" ${active?'':'disabled'}>Give copies to the shelters</button>`:
      '<small>Record one page per turn. The chosen creature cannot attack or block until it readies.</small>'}
    </section>`;
}

function dawnPanel(active){
  const {story,difficulty,priorOutcome}=game;
  const {title,intro}=lore['doors-at-dawn'];
  const endings={
    'names-read':['The Court Heard Them','The clerk reads the last name before the doors shut. People in the gallery repeat it down the stairs. By morning it is written on the outside of the door.'],
    'copies-read':['The Shelters Read Aloud','The last shelter folds its copy beside the bread. By sunrise, people on both sides of the gates know a name the court had struck out.'],
    detachment:['The Doors Still Stand','The last Sentinel falls back. Neri props the door open with a stool. There is still time to gather the people who came to listen.'],
    lost:['The Watch Takes the Steps','When the Watch reaches the doors, the listeners leave by the back steps. One of them keeps saying the first name.']
  };
  const ending=endings[story?.ending];
  if(ending) return `<section class="field story" aria-label="Match story"><h2>${ending[0]}</h2><p>${ending[1]}</p></section>`;
  const shelters=(story?.route??dawnRoute(priorOutcome))==='shelters';
  const goal=dawnGoal(difficulty);
  const marks=story?.marks??0;
  const label=shelters?'Shelters heard':'Readings finished';
  const progress=`<div class="ward-progress"><progress value="${marks}" max="${goal}" aria-label="${label}"></progress><strong>${label} · ${marks} / ${goal}</strong></div>`;
  if(shelters) return `<section class="field story" aria-label="Match story"><h2>${title}</h2><p>${intro} The shelters have their copies. They send word for a clear street.</p>
    <p>When an ally deals combat damage directly to a Sentinel, one shelter reads its copy. This advances once per turn. Reach ${goal} readings or defeat the Sentinels to win.</p>
    ${progress}</section>`;

  const hearingIn=story?.hearingIn??dawnHearingTurns;
  const mine=game.players[game.seat];
  const ready=mine.board.filter(unit=>unit.ready&&!unit.exhausted);
  const canRead=active&&hearingIn>0&&ready.length&&story.channelTurn!==game.round&&mine.mana>=dawnReadingCost;
  return `<section class="field story" aria-label="Match story"><h2>${title}</h2>
    <p>${intro} ${priorOutcome==='court-record'?'The clerk brings the books out where the gallery can hear.':'Neri brings the receipt and asks the court to hear the names.'}</p>
    ${hearingIn?`<p><strong>${hearingIn===1?'The hearing closes on the next Watch turn.':`The hearing closes in ${hearingIn} Watch turns.`}</strong></p>
      <p>Finish ${goal} readings before the Watch closes the hearing, or defeat the Sentinels. Read once per turn. The chosen creature cannot attack or block until it readies.</p>`:
      '<p>The Watch closed the hearing. Defeat the Sentinels to win.</p>'}
    ${progress}
    ${story&&hearingIn?`${active&&ready.length?`<label for="dawn-reader">Creature to read the names</label>
      <select id="dawn-reader">${ready.map((unit,i)=>`<option value="${unit.id}">${i+1}. ${cards[unit.kind].name} · ${unitPower(mine,unit)} / ${unit.hp}</option>`).join('')}</select>`:''}
      <button class="outline" data-action="read-names" ${canRead?'':'disabled'}>Read the names · ${dawnReadingCost} mana</button>`:''}
    </section>`;
}

function stairPanel(active){
  const {story,difficulty,priorOutcome}=game;
  const {title,intro}=lore['lower-stair'];
  const briefings={
    'names-read':'The gatekeeper heard the names in court. She brings a brace to hold the grate.',
    'copies-read':'Guides heard the names at the shelters. They have already brought one family up.',
    detachment:'The Watch fell back at dawn. Vael followed the chain down alone.',
    lost:'Vael takes the lower stair while the Watch holds the doors above.'
  };
  const endings={
    'families-safe':['Above the Grate','The last family comes up into the light. One of them asks Vael to take a name off his shield. “You can find me at the door now.”'],
    detachment:['The Chain Goes Quiet','The Watch leaves the chain. Vael takes hold of it and calls down the stair. Someone calls back.'],
    lost:['The Grate Falls','The grate strikes stone. Vael hears a hand on the other side and puts his hand where he can hear it.']
  };
  const ending=endings[story?.ending];
  if(ending) return `<section class="field story" aria-label="Match story"><h2>${ending[0]}</h2><p>${ending[1]}</p></section>`;
  const {grateBraced,marks}=story??stairHelp(priorOutcome);
  const open=story?.grateOpen;
  const goal=stairGoal(difficulty);
  const mine=game.players[game.seat];
  const ready=mine.board.filter(unit=>unit.ready&&!unit.exhausted);
  const canAct=active&&ready.length;
  const canLift=canAct&&!open&&mine.mana>=stairCosts.lift;
  const canGuide=canAct&&open&&story.channelTurn!==game.round&&mine.mana>=stairCosts.guide;
  return `<section class="field story" aria-label="Match story"><h2>${title}</h2><p>${intro}</p>
    ${briefings[priorOutcome]?`<p>${briefings[priorOutcome]}</p>`:''}
    <p>Lift the grate, then guide a family through. Rescue ${goal} families or defeat the Sentinels to win.</p>
    <p><strong>The grate is ${open?'open':'closed'}.</strong> ${grateBraced?'Once lifted, it stays open until a family passes.':'Once lifted, it drops when a family passes or the Watch takes its next turn.'}</p>
    <div class="ward-progress"><progress value="${marks}" max="${goal}" aria-label="Families rescued"></progress><strong>Families rescued · ${marks} / ${goal}</strong></div>
    ${story?`${canAct?`<label for="stair-guard">Creature to ${open?'guide a family':'lift the grate'}</label>
      <select id="stair-guard">${ready.map((unit,i)=>`<option value="${unit.id}">${i+1}. ${cards[unit.kind].name} · ${unitPower(mine,unit)} / ${unit.hp}</option>`).join('')}</select>`:''}
      <button class="outline" data-action="lift-grate" ${canLift?'':'disabled'}>Lift the grate · ${stairCosts.lift} mana</button>
      <button class="outline" data-action="guide-family" ${canGuide?'':'disabled'}>Guide a family · ${stairCosts.guide} mana</button>`:''}
    <small>Each action exhausts a ready creature. Guide one family per turn.</small>
    </section>`;
}

function landingPanel(active){
  const {story,difficulty,priorOutcome}=game;
  const {title,intro}=lore['landing-bell'];
  const endings={
    'landing-held':['The Landing Holds','The boots stop at the bend. Orrun rings the bell again. This time the upper door opens, and the families hear someone call them in.'],
    'lift-raised':['The Lift Reaches the Light','The lift comes level with the stone. A child sets one foot on the landing. Orrun slips a pin through the wheel so it can wait.'],
    detachment:['The Bell Is Still There','The last Sentinel falls. Orrun ties the bell rope where the people at the landing can reach it.'],
    lost:['The Bell Goes Quiet','The Watch takes the landing. Orrun lets go of the rope. The last note carries down the stair.']
  };
  const ending=endings[story?.ending];
  if(ending) return `<section class="field story" aria-label="Match story"><h2>${ending[0]}</h2><p>${ending[1]}</p></section>`;
  const route=story?.route??landingRoute(priorOutcome);
  const goal=landingGoal(route,difficulty);
  const marks=story?.marks??0;
  const label=route==='hold'?'Attacks stopped':'Lift steps';
  const progress=`<div class="ward-progress"><progress value="${marks}" max="${goal}" aria-label="${label}"></progress><strong>${label} · ${marks} / ${goal}</strong></div>`;
  if(route==='hold') return `<section class="field story" aria-label="Match story"><h2>${title}</h2>
    <p>${intro} The families from the stair wait by the upper door.</p>
    <p>Stop ${goal} Sentinel attacks or defeat the Sentinels to win. An attack counts when the defending player assigns a blocker and takes no combat damage.</p>
    ${progress}</section>`;

  const mine=game.players[game.seat];
  const ready=mine.board.filter(unit=>unit.ready&&!unit.exhausted);
  const canHaul=active&&ready.length&&story.channelTurn!==game.round;
  const work=Object.entries(liftCosts).map(([steps,cost])=>
    `<button class="outline" data-action="haul-lift" data-steps="${steps}" ${canHaul&&mine.mana>=cost&&marks+Number(steps)<=goal?'':'disabled'}>Haul ${steps} ${steps==='1'?'step':'steps'} · ${cost} mana</button>`).join(' ');
  return `<section class="field story" aria-label="Match story"><h2>${title}</h2>
    <p>${intro} ${priorOutcome==='detachment'?'The Watch fell at the grate. Families still wait below.':'Voices carry up from below the grate.'}</p>
    <p>Haul the lift ${goal} steps or defeat the Sentinels to win. Haul once per turn. The chosen creature exhausts.</p>
    ${progress}
    ${story?`${active&&ready.length?`<label for="lift-hauler">Creature to haul the lift</label>
      <select id="lift-hauler">${ready.map((unit,i)=>`<option value="${unit.id}">${i+1}. ${cards[unit.kind].name} · ${unitPower(mine,unit)} / ${unit.hp}</option>`).join('')}</select>`:''}
      ${work}`:''}
    </section>`;
}

function upperDoorPanel(active){
  const {story,difficulty,priorOutcome}=game;
  const {title,intro}=lore['upper-door'];
  const endings={
    'door-opened':['Room at the Door','Sera opens the door the rest of the way. The last group files in. One of them asks where to set the kettle.'],
    'stair-stocked':['Lamps on the Service Stair','Lamps burn on the service stair. The families come up with one hand on the rail. Sera holds the door for each of them.'],
    detachment:['A Place to Wait','The last Sentinel backs out of the hall. Sera drags a bench to the door and calls for the next person.'],
    lost:['The Door Closes','Sera pulls the last person out of the doorway. The hall goes dark. Someone on the stair cups a hand around a lamp.']
  };
  const ending=endings[story?.ending];
  if(ending) return `<section class="field story" aria-label="Match story"><h2>${ending[0]}</h2><p>${ending[1]}</p></section>`;
  const route=story?.route??upperDoorRoute(priorOutcome);
  const goal=upperDoorGoal(difficulty);
  const marks=story?.marks??0;
  const label=route==='door'?'Groups admitted':'Supply bundles sent';
  const progress=`<div class="ward-progress"><progress value="${marks}" max="${goal}" aria-label="${label}"></progress><strong>${label} · ${marks} / ${goal}</strong></div>`;
  const mine=game.players[game.seat];
  if(route==='door'){
    const guards=countDoorGuards(mine);
    return `<section class="field story" aria-label="Match story"><h2>${title}</h2>
      <p>${intro} The families who held at the landing gather by the door.</p>
      <p>End your turn with at least ${upperDoorGuards} of your creatures available to block to admit one group. Admit ${goal} groups or defeat the Sentinels to win.</p>
      ${progress}
      ${active?`<p>Your creatures available to block · ${guards}${guards>=upperDoorGuards?' · End turn to admit a group.':''}</p>`:''}
      </section>`;
  }
  const canSupply=active&&mine.hand.length&&story.channelTurn!==game.round&&mine.mana>=supplyCost;
  return `<section class="field story" aria-label="Match story"><h2>${title}</h2>
    <p>${intro} ${priorOutcome==='lift-raised'?'The lift brought the families up to the service stair. People there ask for lamps and blankets.':'A voice on the service stair asks for a lamp.'}</p>
    <p>Spend ${supplyCost} mana and discard a card to send one supply bundle. Send once per turn. Send ${goal} bundles or defeat the Sentinels to win.</p>
    ${progress}
    ${story?`${active&&mine.hand.length?`<label for="supply-card">Card to discard</label>
      <select id="supply-card">${mine.hand.map(unit=>`<option value="${unit.id}">${cards[unit.kind].name}</option>`).join('')}</select>`:''}
      <button class="outline" data-action="send-supplies" ${canSupply?'':'disabled'}>Send supplies · ${supplyCost} mana</button>`:''}
    </section>`;
}

function commonTablePanel(){
  const {story,difficulty,priorOutcome}=game;
  const {title,intro}=lore['common-table'];
  const endings={
    'delegates-seated':['A Place at the Table','The last delegate pulls up a chair. Sera sets down a cup and asks who wants to speak first. A woman from the stair puts both hands on the table.'],
    'lamps-kept':['The Lamps Stay Lit','The lamps last through the change of Watch. By the time the kettle boils, someone has moved the chairs away from the wall and around the table.'],
    detachment:['The Hall Goes Quiet','The boots fall still. Sera rights an overturned chair and sets a cup beside it.'],
    lost:['The Chairs Are Empty','The Watch clears the hall. Someone takes the kettle with them. Sera hears it knock against the stair rail.']
  };
  const ending=endings[story?.ending];
  if(ending) return `<section class="field story" aria-label="Match story"><h2>${ending[0]}</h2><p>${ending[1]}</p></section>`;
  const route=story?.route??commonTableRoute(priorOutcome);
  const goal=commonTableGoal(difficulty);
  const marks=story?.marks??0;
  const label=route==='seats'?'Delegates seated':'Lamps kept lit';
  const progress=`<div class="ward-progress"><progress value="${marks}" max="${goal}" aria-label="${label}"></progress><strong>${label} · ${marks} / ${goal}</strong></div>`;
  if(route==='seats'){
    const delegates=story?.delegates.map(kind=>cards[kind].name)??[];
    return `<section class="field story" aria-label="Match story"><h2>${title}</h2>
      <p>${intro} The families who crossed the street door have brought chairs.</p>
      <p>Play creature cards or summon leaders to seat delegates. Each name seats one delegate for the whole party. Seat ${goal} delegates or defeat the Sentinels to win.</p>
      ${progress}
      ${delegates.length?`<p>Already seated · ${new Intl.ListFormat('en').format(delegates)}</p>`:''}
      </section>`;
  }
  return `<section class="field story" aria-label="Match story"><h2>${title}</h2>
    <p>${intro} ${priorOutcome==='stair-stocked'?'The families from the service stair set their lamps on the table.':'Sera sets a spare lamp on the table.'}</p>
    <p>Keep a lamp lit by starting your turn with a creature on your battlefield and at least ${lampReserve} unspent mana before it refills. Tend ${goal} lamps or defeat the Sentinels to win.</p>
    ${progress}
    </section>`;
}

function firstPetitionPanel(active){
  const {story,difficulty,priorOutcome}=game;
  const {title,intro}=lore['first-petition'];
  const endings={
    'petition-signed':['The Clerk Takes the Petition','The clerk reads the signatures and sets the petition beside the old orders. Sera asks her to leave a space for the next name.'],
    'copies-through':['A Copy in Every Hand','The last runner comes back with empty hands. By the time the Watch reaches the registry, a copy has reached every door on the lane.'],
    detachment:['The Registry Stays Open','The Watch leaves the registry. Sera weights the petition with a cup and waits for the clerk to return.'],
    lost:['The Clerk Leaves','The Watch clears the registry. Sera folds the petition and carries it back to the table.']
  };
  const ending=endings[story?.ending];
  if(ending) return `<section class="field story" aria-label="Match story"><h2>${ending[0]}</h2><p>${ending[1]}</p></section>`;
  const route=story?.route??firstPetitionRoute(priorOutcome);
  const goal=firstPetitionGoal(route,difficulty);
  const marks=story?.marks??0;
  const label=route==='runners'?'Runners through':'Petition support';
  const progress=`<div class="ward-progress"><progress value="${marks}" max="${goal}" aria-label="${label}"></progress><strong>${label} · ${marks} / ${goal}</strong></div>`;
  if(route==='runners') return `<section class="field story" aria-label="Match story"><h2>${title}</h2>
    <p>${intro} The lamplighters know the lane behind the registry. They have copies tucked under their coats.</p>
    <p>When a Sentinel creature falls in combat, one runner gets through. A fight can send one runner. Get ${goal} runners through or defeat the Sentinels to win.</p>
    ${progress}
    </section>`;

  const mine=game.players[game.seat];
  const ready=mine.board.filter(unit=>unit.ready&&!unit.exhausted);
  const canSign=active&&ready.length&&story.channelTurn!==game.round;
  return `<section class="field story" aria-label="Match story"><h2>${title}</h2>
    <p>${intro} ${priorOutcome==='delegates-seated'?'The delegates stand beside her. They have come to sign in public.':'Sera leaves the first line open.'}</p>
    <p>Once per turn, exhaust a ready creature to sign. It adds support equal to its power, up to ${maxSignatureSupport}. Reach ${goal} support or defeat the Sentinels to win.</p>
    ${progress}
    ${story?`${active&&ready.length?`<label for="petition-signer">Creature to sign the petition</label>
      <select id="petition-signer">${ready.map((unit,i)=>`<option value="${unit.id}">${i+1}. ${cards[unit.kind].name} · ${signatureSupport(mine,unit)} support</option>`).join('')}</select>`:''}
      <button class="outline" data-action="sign-petition" ${canSign?'':'disabled'}>Sign the petition</button>`:''}
    </section>`;
}

function gateCharterPanel(active){
  const {story,difficulty,priorOutcome}=game;
  const {title,intro}=lore['gate-charter'];
  const endings={
    'charter-ratified':['The Charter Holds','Neri pins the charter where the old order hung. Sera puts both keys on the table. The first person through the door has neither.'],
    'copies-posted':['The Lane Has Its Orders','Copies hang on every door in the lane. When the Watch comes for the one at the gatehouse, a woman across the road starts reading hers aloud.'],
    detachment:['The Gatehouse Is Quiet','The Watch leaves the road. Neri puts a stone on the charter and waits for the people who came to hear it.'],
    lost:['The Old Order Goes Back Up','The Watch pins the old order back to the wall. Sera folds the charter and leaves it under the clerk’s cup.']
  };
  const ending=endings[story?.ending];
  if(ending) return `<section class="field story" aria-label="Match story"><h2>${ending[0]}</h2><p>${ending[1]}</p></section>`;
  const route=story?.route??gateCharterRoute(priorOutcome);
  const goal=gateCharterGoal(route,difficulty);
  const marks=story?.marks??0;
  const label=route==='hearing'?'Hearings completed':'Copies posted';
  const progress=`<div class="ward-progress"><progress value="${marks}" max="${goal}" aria-label="${label}"></progress><strong>${label} · ${marks} / ${goal}</strong></div>`;
  const mine=game.players[game.seat];
  if(route==='hearing'){
    const open=story?.charterHearing;
    const canCall=active&&!open&&mine.mana>=charterHearingCost;
    return `<section class="field story" aria-label="Match story"><h2>${title}</h2>
      <p>${intro} ${priorOutcome==='petition-signed'?'The clerk brings the signed petition to the gatehouse.':'The clerk opens the gatehouse for a hearing.'}</p>
      <p>Pay ${charterHearingCost} mana to call a hearing. It completes on the first allied turn after the Watch, if no ally takes combat damage from a Sentinel. Complete ${goal} hearings or defeat the Sentinels to win.</p>
      ${progress}
      ${open?`<p><strong>The hearing is open.</strong> ${open==='watch'?'Keep the defending player safe until the next allied turn.':'The hearing has to last through the next Watch turns.'}</p>`:''}
      ${story?`<button class="outline" data-action="call-hearing" ${canCall?'':'disabled'}>Call a hearing · ${charterHearingCost} mana</button>`:''}
      </section>`;
  }

  const carriers=mine.board.filter(unit=>canCarryCharterCopy(mine,unit));
  const canPost=active&&carriers.length&&story.channelTurn!==game.round;
  return `<section class="field story" aria-label="Match story"><h2>${title}</h2>
    <p>${intro} The runners have already put the petition in the hands of the people on the lane. Those people ask for a copy of the charter.</p>
    <p>Return a ready creature card from your battlefield to your hand to post a copy. Post one copy per turn. Post ${goal} copies or defeat the Sentinels to win.</p>
    ${progress}
    ${story?`${active&&carriers.length?`<label for="charter-carrier">Creature to post a copy</label>
      <select id="charter-carrier">${carriers.map((unit,i)=>`<option value="${unit.id}">${i+1}. ${cards[unit.kind].name} · ${unitPower(mine,unit)} / ${unit.hp}</option>`).join('')}</select>`:''}
      <button class="outline" data-action="post-copy" ${canPost?'':'disabled'}>Post a copy</button>`:''}
    </section>`;
}

function sharedKeysPanel(active){
  const {story,difficulty,priorOutcome}=game;
  const {title,intro}=lore['shared-keys'];
  const endings={
    'bars-lifted':['The Bars Lift','Both keys turn. Orrun catches the first bar before it hits the stones. The gate swings out toward the road, where people have been waiting since dawn.'],
    'lanes-rallied':['The Lane Walks Together','The people from the lane come up to the gate together. One carries a copy. The others can finish the line when she stops to breathe.'],
    detachment:['The Keys Stay on the Table','The last Sentinel backs away. Orrun lays the keys back on the table and pulls up a chair for the first person on the road.'],
    lost:['The Bars Stay In','The Watch puts the bars back in their sockets. Someone on the lane reads the new order again, slowly enough for the far end of the road to hear.']
  };
  const ending=endings[story?.ending];
  if(ending) return `<section class="field story" aria-label="Match story"><h2>${ending[0]}</h2><p>${ending[1]}</p></section>`;
  const route=story?.route??sharedKeysRoute(priorOutcome);
  const goal=sharedKeysGoal(route,difficulty);
  const marks=story?.marks??0;
  const label=route==='keys'?'Bars lifted':'Groups rallied';
  const progress=`<div class="ward-progress"><progress value="${marks}" max="${goal}" aria-label="${label}"></progress><strong>${label} · ${marks} / ${goal}</strong></div>`;
  if(route==='lanes'){
    const played=active?lanePlayThisTurn(game):undefined;
    const turnProgress=played?.creature&&played.spell?'End your turn to rally a group.':played?.creature?'Play a spell from hand to rally a group.':played?.spell?'Play a creature card from hand to rally a group.':'';
    return `<section class="field story" aria-label="Match story"><h2>${title}</h2>
      <p>${intro} The lane knows the charter by heart. The people are waiting to walk to the gate together.</p>
      <p>Play a creature card and a spell from your hand on the same turn, then end your turn to rally a group. Reactions on your turn count as spells. Rally ${goal} groups or defeat the Sentinels to win.</p>
      ${progress}${turnProgress?`<p>${turnProgress}</p>`:''}
      </section>`;
  }

  const mine=game.players[game.seat];
  const bearers=livingKeyBearers(game);
  const ready=mine.board.filter(unit=>unit.ready&&!unit.exhausted&&!bearers.some(bearer=>bearer.seat===game.seat&&bearer.id===unit.id));
  const canAssign=active&&bearers.length<2&&ready.length&&mine.mana>=sharedKeyCost;
  const names=bearers.map(({seat,id})=>`${cards[game.players[seat].board.find(unit=>unit.id===id).kind].name} (${escape(game.players[seat].name)})`);
  return `<section class="field story" aria-label="Match story"><h2>${title}</h2>
    <p>${intro} ${priorOutcome==='charter-ratified'?'The clerk points to the charter. Both keys have to turn together.':'Orrun sets both keys where the people at the gate can see them.'}</p>
    <p>Pay ${sharedKeyCost} mana per key to assign it to a ready creature. Keep both bearers alive through the Watch to lift one bar and free both keys. Lift ${goal} bars or defeat the Sentinels to win.</p>
    ${progress}
    <p><strong>Keys assigned · ${bearers.length} / 2</strong>${names.length?` · ${names.join(', ')}`:''}</p>
    ${story?`${active&&bearers.length<2&&ready.length?`<label for="shared-key-bearer">Creature to carry a key</label>
      <select id="shared-key-bearer">${ready.map((unit,i)=>`<option value="${unit.id}">${i+1}. ${cards[unit.kind].name} · ${unitPower(mine,unit)} / ${unit.hp}</option>`).join('')}</select>`:''}
      <button class="outline" data-action="assign-key" ${canAssign?'':'disabled'}>Assign a key · ${sharedKeyCost} mana</button>`:''}
    </section>`;
}

function openRoadPanel(active){
  const {story,difficulty,priorOutcome}=game;
  const {title,intro}=lore['open-road'];
  const endings={
    'wagons-through':['The Wheels Reach the Road','The last wagon clears the stones. Tala walks beside it until the driver stops looking back at the gate.'],
    'crowd-through':['The Lane Reaches the Road','The last group comes out together. They make room for the people behind them, then start down the road while there is still light.'],
    detachment:['The Track Is Clear','The Watch leaves the track. Tala walks back to the stones and tells the people who waited there that they can come out.'],
    lost:['The Road Goes Quiet','The Watch takes the track. Tala turns the last wagon around before the wheels reach the stones.']
  };
  const ending=endings[story?.ending];
  if(ending) return `<section class="field story" aria-label="Match story"><h2>${ending[0]}</h2><p>${ending[1]}</p></section>`;
  const route=story?.route??openRoadRoute(priorOutcome);
  const goal=openRoadGoal(difficulty);
  const marks=story?.marks??0;
  const label=route==='crowd'?'Groups through':'Wagons through';
  const progress=`<div class="ward-progress"><progress value="${marks}" max="${goal}" aria-label="${label}"></progress><strong>${label} · ${marks} / ${goal}</strong></div>`;
  if(route==='crowd') return `<section class="field story" aria-label="Match story"><h2>${title}</h2>
    <p>${intro} The neighbors from the lane have come up together. They follow the creatures that make it through the Watch line.</p>
    <p>Attack a Sentinel with at least two creatures. If at least two of those attackers survive the combat, one group gets through. Get ${goal} groups through or defeat the Sentinels to win.</p>
    ${progress}
    </section>`;

  const mine=game.players[game.seat];
  const ready=mine.board.filter(unit=>unit.ready&&!unit.exhausted);
  const canSend=active&&!game.attacked&&ready.length&&mine.mana>=wagonCost;
  return `<section class="field story" aria-label="Match story"><h2>${title}</h2>
    <p>${intro} ${priorOutcome==='bars-lifted'?'The gate is open wide enough for the wagons to leave under guard.':'The drivers wait for a clear track.'}</p>
    <p>Before attacking, spend ${wagonCost} mana and exhaust a ready creature to escort a wagon. Sending a wagon ends your turn. Send ${goal} wagons or defeat the Sentinels to win.</p>
    ${progress}
    ${story?`${active&&!game.attacked&&ready.length?`<label for="wagon-escort">Creature to escort the wagon</label>
      <select id="wagon-escort">${ready.map((unit,i)=>`<option value="${unit.id}">${i+1}. ${cards[unit.kind].name} · ${unitPower(mine,unit)} / ${unit.hp}</option>`).join('')}</select>`:''}
      <button class="outline" data-action="send-wagon" ${canSend?'':'disabled'}>Send a wagon and end turn · ${wagonCost} mana</button>`:''}
    </section>`;
}

function reedFordPanel(active){
  const {story,difficulty,priorOutcome}=game;
  const {title,intro}=lore['reed-ford'];
  const endings={
    'ford-bridged':['The Causeway Holds','The last wagon rattles over the planks. On the far bank, Iskar takes a stone from the water and sets it where the next driver can see it.'],
    'shallows-crossed':['Through the Reeds','The last group comes up out of the reeds. Someone counts the people on the bank while the others wring out their coats.'],
    detachment:['The Far Bank Is Quiet','The Watch leaves the bank. Iskar walks out until the water reaches his knees and calls back where the stones are.'],
    lost:['The Ford Is Taken','The Watch stands in the shallows. Iskar gathers the people on the road and leads them back from the water.']
  };
  const ending=endings[story?.ending];
  if(ending) return `<section class="field story" aria-label="Match story"><h2>${ending[0]}</h2><p>${ending[1]}</p></section>`;
  const route=story?.route??reedFordRoute(priorOutcome);
  const goal=reedFordGoal(route,difficulty);
  const marks=story?.marks??0;
  const label=route==='causeway'?'Planks laid':'Groups across';
  const progress=`<div class="ward-progress"><progress value="${marks}" max="${goal}" aria-label="${label}"></progress><strong>${label} · ${marks} / ${goal}</strong></div>`;
  const mine=game.players[game.seat];
  const canWork=active&&story.channelTurn!==game.round;
  if(route==='causeway'){
    const canLay=canWork&&mine.hand.length;
    return `<section class="field story" aria-label="Match story"><h2>${title}</h2>
      <p>${intro} ${priorOutcome==='wagons-through'?'The wheels need a causeway. The drivers start laying boards on the stones.':'Iskar marks where the first planks should go.'}</p>
      <p>Once per turn, put a card from your hand on the bottom of your deck. A creature card lays two planks. A spell lays one. Lay ${goal} planks or defeat the Sentinels to win.</p>
      ${progress}
      ${story?`${canLay?`<label for="ford-supply">Card to put on the bottom of your deck</label>
        <select id="ford-supply">${mine.hand.map(unit=>{
          const planks=Math.min(fordPlanks(unit.kind),goal-marks);
          return `<option value="${unit.id}">${cards[unit.kind].name} · ${planks} ${planks===1?'plank':'planks'}</option>`;
        }).join('')}</select>`:''}
        <button class="outline" data-action="lay-planks" ${canLay?'':'disabled'}>Lay planks</button>`:''}
      </section>`;
  }

  const open=shallowsOpen(game);
  const ready=mine.board.filter(unit=>unit.ready&&!unit.exhausted);
  const canGuide=canWork&&open&&ready.length&&mine.mana>=shallowsCost;
  return `<section class="field story" aria-label="Match story"><h2>${title}</h2>
    <p>${intro} The people from the road are on foot. They can cross through the reeds when the Watch leaves an opening.</p>
    <p>While a Sentinel creature is exhausted, spend ${shallowsCost} mana and exhaust a ready creature to guide a group. Guide once per turn. Get ${goal} groups across or defeat the Sentinels to win.</p>
    ${story?`<p><strong>${open?'The shallows are open.':'Waiting for an exhausted Sentinel creature.'}</strong></p>`:''}
    ${progress}
    ${story?`${canGuide?`<label for="ford-guide">Creature to guide a group</label>
      <select id="ford-guide">${ready.map((unit,i)=>`<option value="${unit.id}">${i+1}. ${cards[unit.kind].name} · ${unitPower(mine,unit)} / ${unit.hp}</option>`).join('')}</select>`:''}
      <button class="outline" data-action="guide-shallows" ${canGuide?'':'disabled'}>Guide a group · ${shallowsCost} mana</button>`:''}
    </section>`;
}

function farBankPanel(active){
  const {story,difficulty,priorOutcome}=game;
  const {title,intro}=lore['far-bank'];
  const endings={
    'wagons-unloaded':['A Place on the Bank','The last wagon stands empty. Iskar sets a sack on the highest stone to keep it dry. Someone starts handing out blankets.'],
    'families-sheltered':['Beyond the Reeds','Tala backs away from the river. The Watch follows her far enough for the last group to reach dry ground. She waits until she hears every name called.'],
    detachment:['The Bank Is Quiet','The Watch leaves the river. Iskar comes down from the shelf and asks who still needs a dry place to sit.'],
    lost:['The Shelf Goes Dark','The Watch takes the dry ground. Iskar leads the people into the reeds and asks them to stay close enough to hear each other.']
  };
  const ending=endings[story?.ending];
  if(ending) return `<section class="field story" aria-label="Match story"><h2>${ending[0]}</h2><p>${ending[1]}</p></section>`;
  const route=story?.route??farBankRoute(priorOutcome);
  const goal=farBankGoal(difficulty);
  const marks=story?.marks??0;
  const label=route==='shelter'?'Groups sheltered':'Wagons unloaded';
  const progress=`<div class="ward-progress"><progress value="${marks}" max="${goal}" aria-label="${label}"></progress><strong>${label} · ${marks} / ${goal}</strong></div>`;
  if(route==='shelter') return `<section class="field story" aria-label="Match story"><h2>${title}</h2>
    <p>${intro} The people who crossed on foot wait in the reeds until Tala draws the Watch toward the open bank.</p>
    <p>When an ally survives a Sentinel attack with 1 to ${farBankShelterDamage} combat damage taken, one group reaches shelter. Shelter ${goal} groups or defeat the Sentinels to win.</p>
    ${progress}
    </section>`;

  const used=active?farBankManaUsed(game):0;
  return `<section class="field story" aria-label="Match story"><h2>${title}</h2>
    <p>${intro} ${priorOutcome==='ford-bridged'?'The wagons are across. The drivers carry sacks up to the dry shelf.':'A wagon waits beside the dry shelf.'}</p>
    <p>End your turn after using at least ${farBankUnloadMana} mana to unload one wagon. Unload ${goal} wagons or defeat the Sentinels to win.</p>
    ${progress}
    ${active?`<p>Mana used this turn · ${Math.min(used,farBankUnloadMana)} / ${farBankUnloadMana}${used>=farBankUnloadMana?' · End turn to unload a wagon.':''}</p>`:''}
    </section>`;
}

function storyPanel(active=false){
  if(game.episode==='far-bank') return farBankPanel(active);
  if(game.episode==='reed-ford') return reedFordPanel(active);
  if(game.episode==='open-road') return openRoadPanel(active);
  if(game.episode==='shared-keys') return sharedKeysPanel(active);
  if(game.episode==='gate-charter') return gateCharterPanel(active);
  if(game.episode==='first-petition') return firstPetitionPanel(active);
  if(game.episode==='common-table') return commonTablePanel();
  if(game.episode==='upper-door') return upperDoorPanel(active);
  if(game.episode==='landing-bell') return landingPanel(active);
  if(game.episode==='lower-stair') return stairPanel(active);
  if(game.episode==='doors-at-dawn') return dawnPanel(active);
  if(game.episode==='ash-register') return registerPanel(active);
  if(game.episode==='third-seal') return archivePanel(active);
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
      const keys=['id','zone','action','panel','opponent','branch','gate','choice','job','holder','plot','route','scroll'].filter(key=>focus.dataset[key]!==undefined);
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
  const canAdmit=active&&game.episode==='upper-door'&&game.story?.route==='door'&&countDoorGuards(mine)>=upperDoorGuards;
  const canKeepLamp=active&&game.episode==='common-table'&&game.story?.route==='lamps'&&mine.mana>=lampReserve&&mine.board.length;
  const lanePlay=active&&game.episode==='shared-keys'&&game.story?.route==='lanes'?lanePlayThisTurn(game):undefined;
  const canRallyLane=lanePlay?.creature&&lanePlay.spell;
  const canUnload=active&&game.episode==='far-bank'&&game.story?.route==='unload'&&farBankManaUsed(game)>=farBankUnloadMana;
  const turnPrompt=canUnload?'End turn to unload a wagon.':canRallyLane?'End turn to rally a group.':canAdmit?'End turn to admit a group.':canKeepLamp?`Keep ${lampReserve} mana through the Watch to tend a lamp.`:game.active===game.seat?'Your turn':game.players[game.active].name+'’s turn';
  const prompt=selected?.type==='read-record'?'Choose an opponent whose hand Neri will read.':attackIds.length?`Choose an opponent for ${attackIds.length} attacker${attackIds.length===1?'':'s'}.`:selected?.own?'Choose one of your creatures.':selected?.playerOnly?'Choose an opposing player.':selected?.creatureOnly?'Choose an opposing creature.':selected?'Choose an opposing target.':turnPrompt;
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
  const landingHint=game.episode==='landing-bell'&&game.story?.route==='hold'&&attacker?.bot?
    `<p>Landing · ${game.story.marks} / ${landingGoal('hold',game.difficulty)} attacks stopped. Assign a blocker and prevent all damage to the defending player.</p>`:'';
  const petitionHint=game.episode==='first-petition'&&game.story?.route==='runners'?
    `<p>Runners · ${game.story.marks} / ${firstPetitionGoal('runners',game.difficulty)} through. Defeat a Sentinel creature in this combat to send one runner.</p>`:'';
  const charterHint=game.episode==='gate-charter'&&game.story?.charterHearing&&attacker?.bot?
    '<p>A charter hearing is open. Prevent combat damage to the defending player to keep it open.</p>':'';
  const roadHint=game.episode==='open-road'&&game.story?.route==='crowd'&&defender?.bot?
    `<p>Groups through · ${game.story.marks} / ${openRoadGoal(game.difficulty)}. A group needs two attackers to survive the fight.</p>`:'';
  const farBankHint=game.episode==='far-bank'&&game.story?.route==='shelter'&&attacker?.bot?
    `<p>A group reaches shelter if the defending player survives and takes 1 to ${farBankShelterDamage} combat damage.</p>`:'';
  const batchPanel=combat?.strikes?`<section class="field combat"><strong>${escape(attacker.name)} attacks ${escape(defender.name)}</strong><p>${blocking?'Assign each blocker once.':reacting?'Choose an attacker, then play a reaction or pass.':combat.phase==='block'?'Waiting for the defender.':'Reaction window.'}</p>${landingHint}${petitionHint}${charterHint}${roadHint}${farBankHint}${reactionWaiting}<div class="combat-grid">${batchRows}</div>${blocking?'<button class="gold" data-action="blocks">Confirm blockers</button>':''}${reacting?`<label for="reaction-target">Reaction target</label> <select id="reaction-target">${combat.strikes.map((strike,i)=>`<option value="${strike.unit}" ${reactionTarget===strike.unit?'selected':''}>${i+1}. ${cards[attacker.board.find(unit=>unit.id===strike.unit).kind].name}</option>`).join('')}</select> <button class="outline" data-action="pass">Pass</button>`:''}</section>`:'';
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
  const grateWarning=game.episode==='lower-stair'&&game.story?.grateOpen&&!game.story.grateBraced;
  const hearingWarning=game.episode==='doors-at-dawn'&&game.story?.hearingIn===1;
  const archiveWarning=game.episode==='third-seal'&&game.story?.archiveIn===1&&game.story.route!=='witness';
  const orchardWarning=game.episode==='orchard'&&game.story?.patrolIn===1&&!game.story.sheltered[game.story.patrol];
  const foundryWarning=game.episode==='foundry'&&game.story?.heatIn===1&&!game.story.vented;
  const panels=[
    {id:'combat',label:'Combat',html:combatPanel},
    {id:'choice',label:'Card choice',html:choicePanel},
    {id:'tree',label:`Tree · ${mine.growth}`,html:treePanel(mine,active)},
    {id:'story',label:grateWarning?'Story · Grate open':hearingWarning?'Story · Hearing closes next':archiveWarning?'Story · Bell next':orchardWarning?'Story · Sweep next':foundryWarning?'Story · Blast next':game.story?.pulseIn&&game.story.marks<wardMarks?`Story · Pulse in ${game.story.pulseIn}`:'Story',html:storyPanel(active)},
    {id:'table',label:game.truce?.to===game.seat&&!game.truce.accepted?'Truce offer':'Table',html:table},
    {id:'result',label:'Result',html:result}
  ].filter(panel=>panel.html);
  const panel=panels.find(panel=>panel.id===openPanel);
  const tabs=panels.map(item=>`<button class="panel-toggle" data-action="panel" data-panel="${item.id}" aria-expanded="${panel===item}"
    ${['combat','choice','result'].includes(item.id)||item.label==='Truce offer'||item.id==='story'&&(foundryWarning||orchardWarning||archiveWarning||hearingWarning||grateWarning)?'data-attention':''}>${item.label}</button>`).join('');
  const hand=mine.hand.map(unit=>{
    const reaction=cards[unit.kind].reaction;
    const early=active&&!game.attacked&&mine.board.length&&earlyReaction(mine,unit.kind);
    return card(unit,reaction&&!early?'reaction':'hand',(reaction?reacting||early:active)&&cardCost(mine,unit.kind)<=mine.mana);
  }).join('');
  const scene=game.episode==='foundry'?'foundry':['orchard','third-seal'].includes(game.episode)?'grove':
    ['tide','reed-ford','far-bank'].includes(game.episode)?'water':'court';
  renderBattlefield(`<div class="match-shell" data-scene="${scene}">
    <div class="match-header">
      <div class="match-status"><h1 id="status" role="status">${escape(status)}</h1><p title="${escape(game.last??'')}">${game.last&&!error?escape(game.last):''}</p></div>
      ${primaryClock}<button class="quiet" data-action="${outcome||mine.eliminated?'leave':'concede'}" ${busy?'disabled':''}>${outcome||mine.eliminated?'Lobby':'Concede'}</button>
    </div>
    <nav class="match-seats" aria-label="Choose a battlefield">${seats}</nav>
    <nav class="match-tools" aria-label="Match panels">${tabs}</nav>
    <div class="match-center ${panel?'has-drawer':''}">
      <div class="match-board">
        ${other?`<section data-seat="${viewedSeat}" data-active="${game.active===viewedSeat&&!outcome}" class="board-row" aria-label="${escape(other.name)}’s battlefield">
          <div class="board-heading">${other.leader?portrait(other.leader):''}<strong>${escape(other.name)}</strong><small>${teamLabel(other)}</small>
            ${targetPlayer?`<button class="gold target-button" data-action="hero" data-opponent="${viewedSeat}">${attackIds.length?`Attack with ${attackIds.length}`:selected?.type==='read-record'?'Read hand':'Target player'}</button>`:''}
          </div>
          <div class="cards" data-scroll="enemy-${viewedSeat}" tabindex="0" aria-label="${escape(other.name)}’s creatures">${other.eliminated?'Out of the match':other.board.map(unit=>card(unit,'enemy',!!targetCreature,viewedSeat)).join('')||'<span>No creatures</span>'}</div>
        </section>`:''}
        <section data-seat="${game.seat}" data-active="${game.active===game.seat&&!outcome}" class="board-row your-board" aria-label="Your battlefield">
          <div class="board-heading">${mine.leader?portrait(mine.leader):''}<strong>Your battlefield</strong>${attackIds.length?`<small>${attackIds.length} selected</small>`:''}</div>
          <div class="cards" data-scroll="mine" tabindex="0" aria-label="Your creatures">${mine.board.map(unit=>card(unit,blocking&&!combat.strikes?'block':'mine',blocking&&!combat.strikes?!unit.exhausted:active&&(selected?.own||unit.ready&&!game.attacked))).join('')||'<span>No creatures</span>'}</div>
        </section>
      </div>
      ${panel?`<aside class="match-drawer" aria-label="${panel.label}">
        <div class="drawer-heading"><strong>${panel.label}</strong><button class="quiet" data-action="close-panel" aria-label="Close panel">Close</button></div>
        <div class="drawer-body" data-scroll="panel-${panel.id}" tabindex="0">${panel.html}</div>
      </aside>`:''}
    </div>
    <section class="hand-dock" aria-label="Your hand">
      <div class="hand-toolbar"><div class="hand-resources"><strong>Your hand</strong><span class="life-resource" title="Life">♥ ${Math.max(0,mine.life)}</span><span class="mana-resource" title="Available mana">◆ ${mine.mana}/${mine.max}</span></div>
        <div class="hand-actions">${leaderButton}<button class="gold" data-action="end" ${active?'':'disabled'}>End turn</button></div>
      </div>
      <div class="cards" tabindex="0" data-scroll="hand" aria-label="Cards in your hand">${hand||'<span>Your hand is empty</span>'}</div>
    </section>
  </div>`);
}
function enter(state){
  const nextRoom=state.code||requested;
  if(room!==nextRoom){
    presentation.clear();
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
    const foundryKeyholder=Object.hasOwn(memory,'orchardFoundryKeyholder')?memory.orchardFoundryKeyholder:memory.outcomes?.foundry;
    const remember=$(create?'host-remember':'guest-remember').checked;
    const state=await api(code,{type:create?'create':'join',mode:$('host-mode').value,botCount:Number($('host-bots').value),
      chapter:$('host-chapter').checked,episode,difficulty:$('watch-difficulty').value,
      priorOutcome,foundryKeyholder,resume:remember?memory.leaders?.[leader]:undefined,
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
  const previous=game;
  try{
    game=await api(room,{...data,revision:game.revision});
    selected=undefined;
    attackIds=[];
    if(!game.combat) reactionTarget='';
  }catch(reason){error=reason.message;return;}
  finally{busy=false;render();}
  presentation.play(previous,game);
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
        foundryKeyholder:action==='next-chapter'&&game.episode==='orchard'?game.priorOutcome:game.foundryKeyholder,
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
  if(action==='lay-planks') await move({type:action,id:$('ford-supply')?.value});
  if(action==='guide-shallows') await move({type:action,id:$('ford-guide')?.value});
  if(action==='send-wagon') await move({type:action,id:$('wagon-escort')?.value});
  if(action==='assign-key') await move({type:action,id:$('shared-key-bearer')?.value});
  if(action==='call-hearing') await move({type:action});
  if(action==='post-copy') await move({type:action,id:$('charter-carrier')?.value});
  if(action==='sign-petition') await move({type:action,id:$('petition-signer')?.value});
  if(action==='send-supplies') await move({type:action,id:$('supply-card')?.value});
  if(action==='haul-lift') await move({type:action,steps:Number(button.dataset.steps),id:$('lift-hauler')?.value});
  if(action==='lift-grate'||action==='guide-family') await move({type:action,id:$('stair-guard')?.value});
  if(action==='read-names') await move({type:action,id:$('dawn-reader')?.value});
  if(action==='record-page') await move({type:action,page:button.dataset.page,id:$('register-scribe')?.value});
  if(action==='place-register') await move({type:action,keeper:button.dataset.keeper});
  if(action==='present-evidence') await move({type:action,route:button.dataset.route,id:$('archive-guard')?.value});
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
      const previous=game;
      if(next.round!==game.round||next.combat?.id!==game.combat?.id||next.winner!==null){
        selected=undefined;
        attackIds=[];
      }
      game=next;
      if(!game.combat) reactionTarget='';
      error='';
      render();
      if(!watching) presentation.play(previous,next);
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
