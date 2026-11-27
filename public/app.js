import {cards,leaders,trees,MAX_PLAYERS,modes,lore,wardCost,wardMarks} from '/game.mjs';
const $=id=>document.getElementById(id);
const lobby=$('lobby'),arena=$('arena');
const key=sessionStorage.emberveilKey||(sessionStorage.emberveilKey=crypto.randomUUID());
const requested=new URL(location.href).searchParams.get('room')?.toUpperCase()||'';
let room='',game,selected,error='',busy=false,refreshing=false;
let attackIds=[],reactionTarget='';
$('host-mode').onchange=()=>{$('bot-settings').hidden=$('host-mode').value!=='coop';};
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
        <details><summary>Leader story</summary><p>${lore.leaders[kind]}</p></details>
      </span>`;
  };
  $(id).addEventListener('change',describe);
  describe();
}

async function api(code,data){
  const options={headers:{Authorization:key}};
  if(data) Object.assign(options,{method:'POST',body:JSON.stringify(data)});
  const result=await fetch('/api/'+encodeURIComponent(code),options);
  const state=await result.json();
  if(!result.ok) throw Error(state.error);
  return state;
}
function escape(value){
  return String(value).replace(/[&<>"']/g,character=>({'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'})[character]);
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
  const detail=inHand?(info.damage?'Deal 3 damage':info.heal?'Heal 4 life':info.text??info.power+' / '+info.hp):info.power+' / '+unit.hp;
  return `<button class="card" data-kind="${unit.kind}" data-zone="${zone}" data-id="${unit.id}" data-opponent="${opponent??''}" data-selected="${selected?.id===unit.id||attackIds.includes(unit.id)}" ${enabled?'':'disabled'}><strong>${info.name}</strong><span class="card-art">${portrait(unit.kind)}${inHand?`<b class="mana-cost" aria-label="${info.cost} mana">${info.cost}</b>`:''}</span><span class="card-detail">${detail}${!inHand&&(unit.frozen||unit.freezeTurn)?' · Frozen':zone==='mine'&&!unit.ready?' · Resting':''}</span></button>`;
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
  return `<section class="field tree-panel"><h2>Ability Tree · ${mine.growth} growth</h2>${branches}<small>Gain 1 growth every 3 turns. Choose a path and unlock nodes on your turn.</small></section>`;
}
function storyPanel(active=false){
  const story=game.story;
  const scene=game.chapter?lore.coop:lore[game.mode==='coop'?'':game.mode];
  if(!scene) return '';
  let passage=scene.intro;
  let heading=scene.title;
  let objective='';
  if(game.started && game.winner!==null){
    if(game.mode==='coop'){
      const lost=game.players[game.winner].bot;
      heading=lost?'The Doors Remain Sealed':story.marks===wardMarks?'The First Light':'The Watch Falls';
      passage=lost?'The last Sentinel returns to its post. Beneath the vault, the rescue bells fall silent.':
        story.marks===wardMarks?'The restored Dawnward lights a path through the opened vault. The first people to climb out see a sky they know only from stories.':
        'The vault opens in darkness. The rescuers pass a single lantern hand to hand until everyone reaches the stairs.';
    }else{
      heading=game.mode==='teams'?'A House Holds the Keys':'A Claim Is Settled';
      passage=game.mode==='teams'?'At dawn, the surviving house takes custody of the citadel. Its first decree will decide whether the old gates open again.':'The last claimant leaves the basalt court with the keeper’s seal. By morning, the city will ask what they intend to do with it.';
    }
  }else if(story){
    if(story.marks===wardMarks){
      heading='The Dawnward Burns Again';
      passage='Warm light spills from the vault. The Dawnward has healed the living allies. Defeat the remaining Sentinels to open the doors.';
    }else{
      if(story.sentinelsFallen){
        heading='A Voice Behind the Door';
        passage='As a Sentinel falls, a voice calls through the stone. “We can hear you. Can you light the stair?”';
      }
      const canChannel=active&&story.channelTurn!==game.round&&game.players[game.seat].mana>=wardCost;
      objective=`<p>Optional objective · Restore three marks to heal each surviving ally for up to 3 life.</p><div class="ward-progress"><progress value="${story.marks}" max="${wardMarks}" aria-label="Dawnward marks restored"></progress><strong>${story.marks} / ${wardMarks} marks</strong></div><button class="outline" data-action="rekindle" ${canChannel?'':'disabled'}>Rekindle a mark · ${wardCost} mana</button><small>Once per turn. Defeat the Sentinels to win.</small>`;
    }
  }else if(game.chapter){
    passage+=' Defeat the Sentinels to open the vault. Spend mana during your turns to optionally restore the Dawnward.';
  }
  return `<section class="field story" aria-label="Match story"><h2>${heading}</h2><p>${passage}</p>${objective}</section>`;
}
function render(){
  if(!game) return;
  lobby.hidden=true;
  arena.hidden=false;
  if(!game.started){
    const mine=game.players[game.seat];
    const roster=game.players.map((p,i)=>`<li>${escape(p.name)}${game.mode&&game.mode!=='ffa'?' · '+teamName(game.mode,p.team):''}${p.leader?' · '+cards[p.leader].name:''}${i===0?' · Host':''}${i===game.seat?' · You':''}</li>`).join('');
    const requirements=game.mode==='teams'?'Team PvP starts with four or six players. Teams alternate by join order.':game.mode==='coop'?`This match includes ${game.botCount} Sentinel bots.`:'At least two players are needed.';
    const opening=game.rules>=3?`<h2>Opening hand</h2><div class="cards">${mine.hand.map(unit=>card(unit,'hand',false)).join('')}</div><button class="outline" data-action="redraw" ${mine.redrawn||busy?'disabled':''}>${mine.redrawn?'Opening hand redrawn':'Redraw opening hand once'}</button>`:'';
    arena.innerHTML=`<section class="panel waiting"><h1>${modes[game.mode]||'Match lobby'}</h1><p>Share your invite link or room code with friends.</p><strong class="code">${room}</strong><div class="actions"><button class="outline" data-action="copy">Copy invite link</button>${game.seat===0?`<button class="gold" data-action="start" ${game.readyToStart&&!busy?'':'disabled'}>Start match</button>`:''}</div><h2>${game.players.length} of ${game.humanLimit||MAX_PLAYERS} player seats</h2><ol class="roster">${roster}</ol><p id="status" role="status">${escape(error||(game.seat!==0?'Waiting for the host to start.':!game.readyToStart||game.mode==='coop'?requirements:''))}</p>${storyPanel()}${opening}<a href="/">Back to lobby</a></section>`;
    return;
  }
  const mine=game.players[game.seat];
  const combat=game.combat;
  const blocking=combat?.phase==='block'&&combat.defender===game.seat&&!busy;
  const reacting=combat?.phase==='react'&&combat.canReact&&!busy;
  const active=game.active===game.seat && game.winner===null && !busy && !mine.eliminated && !combat;
  const winner=game.players[game.winner];
  const outcome=game.winner===null?'':sameSide(mine,winner)?'Your team won!':game.mode&&game.mode!=='ffa'?teamName(game.mode,winner.team)+' won.':game.winner===game.seat?'You won!':winner.name+' won.';
  const prompt=attackIds.length?`Choose an opponent for ${attackIds.length} attacker${attackIds.length===1?'':'s'}.`:selected?.creatureOnly?'Choose an opposing creature.':selected?'Choose an opposing target.':game.active===game.seat?'Your turn':game.players[game.active].name+'’s turn';
  const attacker=combat&&game.players[combat.attacker];
  const defender=combat&&game.players[combat.defender];
  const attackingCard=combat&&attacker.board.find(unit=>unit.id===combat.unit);
  const batchRows=combat?.strikes?.map((strike,i)=>{
    const name=cards[attacker.board.find(unit=>unit.id===strike.unit).kind].name;
    const blocker=defender.board.find(unit=>unit.id===strike.blocker);
    const options=blocking?mine.board.filter(unit=>!unit.exhausted).map(unit=>`<option value="${unit.id}">${cards[unit.kind].name} · ${cards[unit.kind].power} / ${unit.hp}</option>`).join(''):'';
    return `<div class="combat-row"><label for="strike-${i}">${i+1}. ${name} ${strike.boost?' +'+strike.boost+' power':''}${strike.shield?' · '+strike.shield+' shield':''}</label>${blocking?`<select id="strike-${i}" data-strike="${strike.unit}"><option value="">Unblocked</option>${options}</select>`:blocker?`<span>Blocked by ${cards[blocker.kind].name}</span>`:'<span>Unblocked</span>'}</div>`;
  }).join('');
  const batchPanel=combat?.strikes?`<section class="field combat"><strong>${escape(attacker.name)} attacks ${escape(defender.name)}</strong><p>${blocking?'Assign each blocker once.':reacting?'Choose an attacker, then play a reaction or pass.':combat.phase==='block'?'Waiting for the defender.':'Waiting for reactions.'} <span id="combat-clock"></span></p><div class="combat-grid">${batchRows}</div>${blocking?'<button class="gold" data-action="blocks">Confirm blockers</button>':''}${reacting?`<label for="reaction-target">Reaction target</label> <select id="reaction-target">${combat.strikes.map((strike,i)=>`<option value="${strike.unit}" ${reactionTarget===strike.unit?'selected':''}>${i+1}. ${cards[attacker.board.find(unit=>unit.id===strike.unit).kind].name}</option>`).join('')}</select> <button class="outline" data-action="pass">Pass</button>`:''}</section>`:'';
  const combatPanel=batchPanel||(combat?`<section class="field combat"><strong>${escape(attacker.name)} attacks ${escape(defender.name)} with ${cards[attackingCard.kind].name}</strong><p>${combat.phase==='block'?(blocking?'Choose a blocker on your battlefield.':'Waiting for the defender.'):reacting?'Play a reaction from your hand, or pass.':'Waiting for combat reactions.'} <span id="combat-clock"></span></p>${combat.phase==='react'?`<p>Attack bonus +${combat.boost} · Damage prevention ${combat.shield}</p>`:''}${blocking?'<button class="outline" data-action="no-block">Take the hit</button>':''}${reacting?'<button class="outline" data-action="pass">Pass</button>':''}</section>`:'');
  const leaderPanel=mine.leader?`<section class="field leader"><div class="leader-art">${portrait(mine.leader)}</div><div><h2>Leader zone</h2><p>${cards[mine.leader].name} · ${leaders[mine.leader].style} · ${cards[mine.leader].power} / ${cards[mine.leader].hp}</p>${cards[mine.leader].text?`<p>${cards[mine.leader].text}</p>`:''}<button class="outline" data-action="summon" ${active&&mine.mana>=mine.leaderCost&&!mine.board.some(unit=>unit.kind===mine.leader)?'':'disabled'}>Summon leader · ${mine.leaderCost} mana</button></div></section>`:'';
  const stats=(p,i)=>`<strong class="player-name">${p.leader?portrait(p.leader):''}${escape(p.name)}${i===game.seat?' · You':''}</strong><span>${game.mode&&game.mode!=='ffa'?teamName(game.mode,p.team)+(p.bot?' · Bot':''):''}</span><span>${p.eliminated?'Eliminated':game.winner===null&&game.active===i?'Taking turn':''}</span><span>♥ ${Math.max(0,p.life)} life</span><span>◆ ${p.mana}/${p.max} mana</span><span>${p.handSize} in hand · ${p.deckSize} in deck</span><span>✦ ${p.growth||0} growth</span>`;
  const opponents=game.players.map((p,i)=>{
    if(i===game.seat) return '';
    const enabled=active&&(selected||attackIds.length)&&!p.eliminated&&!sameSide(mine,p);
    return `<section data-seat="${i}" class="field player-field ${game.active===i&&!outcome?'current-turn':''} ${p.eliminated?'eliminated':''}" aria-label="${escape(p.name)}’s battlefield"><div class="stats">${stats(p,i)}<button class="outline enemy-target" data-action="hero" data-opponent="${i}" ${enabled&&(attackIds.length||((game.rules>=2||selected?.type==='play'||!p.board.length)&&!selected?.creatureOnly))?'':'disabled'}>${attackIds.length?'Attack player':'Target player'}</button></div><div class="cards">${p.eliminated?'Out of the match':p.board.map(unit=>card(unit,'enemy',enabled&&(game.rules<2||selected?.type==='play'),i)).join('')||'<span>No creatures in play</span>'}</div></section>`;
  }).join('');
  const leave=outcome||mine.eliminated;
  arena.innerHTML=`<div class="bar"><h1>Battlefield</h1>${game.turnDeadline&&!combat&&!outcome?'<span id="turn-clock"></span>':''}<button class="quiet" data-action="${leave?'leave':'concede'}" ${busy?'disabled':''}>${leave?'Back to lobby':'Concede'}</button></div>
  <p id="status" role="status">${escape(error||outcome||(mine.eliminated?'You’re eliminated. '+prompt:prompt))} ${game.last&&!error?' · '+escape(game.last):''}</p>
  ${combatPanel}${storyPanel(active)}${treePanel(mine, active)}<div class="opponents">${opponents}</div>
  <section data-seat="${game.seat}" class="field player-field ${active?'current-turn':''}" aria-label="Your battlefield"><div class="stats">${stats(mine,game.seat)}<button class="gold" data-action="end" ${active?'':'disabled'}>End turn</button></div><div class="cards">${mine.board.map(unit=>card(unit,blocking&&!combat.strikes?'block':'mine',blocking&&!combat.strikes?!unit.exhausted:active&&unit.ready&&!game.attacked)).join('')||'<span>No creatures in play</span>'}</div></section>
  ${leaderPanel}<section class="field" aria-label="Your hand"><strong>Your hand</strong><div class="cards">${mine.hand.map(unit=>card(unit,cards[unit.kind].reaction?'reaction':'hand',(cards[unit.kind].reaction?reacting:active)&&cards[unit.kind].cost<=mine.mana)).join('')||'<span>Your hand is empty</span>'}</div></section>`;
}
function enter(state){
  room=state.code||requested;
  game=state;
  history.replaceState(null,'','/?room='+room);
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
    enter(await api(code,{type:create?'create':'join',mode:$('host-mode').value,botCount:Number($('host-bots').value),chapter:$('host-chapter').checked,turnSeconds:Number($('host-timer').value),name:$(create?'host-name':'guest-name').value,leader:$(create?'host-leader':'guest-leader').value}));
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
  if(action==='copy'){
    try{await navigator.clipboard.writeText(location.href);$('status').textContent='Invite link copied.';}
    catch{$('status').textContent='Share the URL from your address bar.';}
  }
  if(action==='leave') location.href='/';
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
  if(action==='summon') await move({type:'summon'});
  if(action==='pass') await move({type:'pass',combatId:game.combat?.id});
  if(action==='no-block'||zone==='block') await move({type:'block',id});
  if(zone==='reaction') await move({type:'react',id,strike:$('reaction-target')?.value,combatId:game.combat?.id});
  if(action==='end') await move({type:'end'});
  if(action==='concede' && confirm('Concede this match?')) await move({type:'concede'});
  if(action==='hero' && attackIds.length){await move({type:'attack-batch',ids:attackIds,opponent:Number(opponent)});return;}
  if(action==='hero' && selected) await move({...selected,target:'hero',opponent:Number(opponent)});
  if(zone==='enemy' && selected) await move({...selected,target:id,opponent:Number(opponent)});
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
    if(zone==='hand' && !cards[item.kind].damage && !cards[item.kind].freeze) await move({type,id});
    else{
      selected=selected?.id===id?undefined:{type,id,creatureOnly:zone==='hand'&&!!cards[item.kind].freeze};
      error='';
      render();
    }
  }
};
arena.onchange=event=>{if(event.target.id==='reaction-target') reactionTarget=event.target.value;};
function updateClock(){
  const turn=$('turn-clock');
  if(turn&&game?.turnDeadline) turn.textContent='Turn time · '+Math.max(0,Math.ceil((game.turnDeadline-Date.now())/1000))+'s';
  const clock=$('combat-clock');
  if(clock&&game?.combat) clock.textContent=Math.max(0,Math.ceil((game.combat.deadline-Date.now())/1000))+'s';
}
setInterval(updateClock,250);
setInterval(async ()=>{
  if(!room||busy||refreshing||game.winner!==null) return;
  refreshing=true;
  try{
    const next=await api(room);
    if(!busy&&next.revision>game.revision){
      game=next;
      selected=undefined;
      attackIds=[];
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
  api(requested).then(state=>{if(!room) enter(state);}).catch(()=>{});
}
