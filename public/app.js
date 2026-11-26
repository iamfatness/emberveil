import {cards,leaders,MAX_PLAYERS} from '/game.mjs';
const $=id=>document.getElementById(id);
const lobby=$('lobby'),arena=$('arena');
const key=sessionStorage.emberveilKey||(sessionStorage.emberveilKey=crypto.randomUUID());
const requested=new URL(location.href).searchParams.get('room')?.toUpperCase()||'';
let room='',game,selected,error='',busy=false,refreshing=false;
$('guest-code').value=requested;
$('rules').onclick=()=>$('guide').showModal();

for(const id of ['host-leader','guest-leader']){
  $(id).innerHTML=Object.entries(leaders).map(([kind,leader])=>`<option value="${kind}">${cards[kind].name} · ${leader.style}</option>`).join('');
  const detail=document.createElement('div');
  detail.className='deck-detail';
  $(id).after(detail);
  const describe=()=>{
    const kind=$(id).value;
    detail.innerHTML=portrait(kind)+'<span>'+leaders[kind].text+'</span>';
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
  const detail=inHand?(info.damage?'Deal 3 damage':info.heal?'Heal 4 life':info.text??info.power+' / '+info.hp):info.power+' / '+unit.hp;
  return `<button class="card" data-kind="${unit.kind}" data-zone="${zone}" data-id="${unit.id}" data-opponent="${opponent??''}" data-selected="${selected?.id===unit.id}" ${enabled?'':'disabled'}><strong>${info.name}</strong><span class="card-art">${portrait(unit.kind)}${inHand?`<b class="mana-cost" aria-label="${info.cost} mana">${info.cost}</b>`:''}</span><span class="card-detail">${detail}${!inHand&&(unit.frozen||unit.freezeTurn)?' · Frozen':zone==='mine'&&!unit.ready?' · Resting':''}</span></button>`;
}
function render(){
  if(!game) return;
  lobby.hidden=true;
  arena.hidden=false;
  if(!game.started){
    const roster=game.players.map((p,i)=>`<li>${escape(p.name)}${p.leader?' · '+cards[p.leader].name:''}${i===0?' · Host':''}${i===game.seat?' · You':''}</li>`).join('');
    const ready=game.players.length>=2;
    arena.innerHTML=`<section class="panel waiting"><h1>Match lobby</h1><p>Share your invite link or room code with friends.</p><strong class="code">${room}</strong><div class="actions"><button class="outline" data-action="copy">Copy invite link</button>${game.seat===0?`<button class="gold" data-action="start" ${ready&&!busy?'':'disabled'}>Start match</button>`:''}</div><h2>${game.players.length} of ${MAX_PLAYERS} players</h2><ol class="roster">${roster}</ol><p id="status" role="status">${escape(error||(game.seat!==0?'Waiting for the host to start.':!ready?'At least two players are needed.':''))}</p><a href="/">Back to lobby</a></section>`;
    return;
  }
  const mine=game.players[game.seat];
  const combat=game.combat;
  const blocking=combat?.phase==='block'&&combat.defender===game.seat&&!busy;
  const reacting=combat?.phase==='react'&&combat.canReact&&!busy;
  const active=game.active===game.seat && game.winner===null && !busy && !mine.eliminated && !combat;
  const outcome=game.winner===null?'':game.winner===game.seat?'You won!':game.players[game.winner].name+' won.';
  const prompt=selected?.creatureOnly?'Choose an opposing creature.':selected?'Choose an opposing target.':game.active===game.seat?'Your turn':game.players[game.active].name+'’s turn';
  const attacker=combat&&game.players[combat.attacker];
  const defender=combat&&game.players[combat.defender];
  const attackingCard=combat&&attacker.board.find(unit=>unit.id===combat.unit);
  const combatPanel=combat?`<section class="field combat"><strong>${escape(attacker.name)} attacks ${escape(defender.name)} with ${cards[attackingCard.kind].name}</strong><p>${combat.phase==='block'?(blocking?'Choose a blocker on your battlefield.':'Waiting for the defender.'):reacting?'Play a reaction from your hand, or pass.':'Waiting for combat reactions.'} <span id="combat-clock"></span></p>${combat.phase==='react'?`<p>Attack bonus +${combat.boost} · Damage prevention ${combat.shield}</p>`:''}${blocking?'<button class="outline" data-action="no-block">Take the hit</button>':''}${reacting?'<button class="outline" data-action="pass">Pass</button>':''}</section>`:'';
  const leaderPanel=mine.leader?`<section class="field leader"><div class="leader-art">${portrait(mine.leader)}</div><div><h2>Leader zone</h2><p>${cards[mine.leader].name} · ${leaders[mine.leader].style} · ${cards[mine.leader].power} / ${cards[mine.leader].hp}</p>${cards[mine.leader].text?`<p>${cards[mine.leader].text}</p>`:''}<button class="outline" data-action="summon" ${active&&mine.mana>=mine.leaderCost&&!mine.board.some(unit=>unit.kind===mine.leader)?'':'disabled'}>Summon leader · ${mine.leaderCost} mana</button></div></section>`:'';
  const stats=(p,i)=>`<strong class="player-name">${p.leader?portrait(p.leader):''}${escape(p.name)}${i===game.seat?' · You':''}</strong><span>${p.eliminated?'Eliminated':game.winner===null&&game.active===i?'Taking turn':''}</span><span>♥ ${Math.max(0,p.life)} life</span><span>◆ ${p.mana}/${p.max} mana</span><span>${p.handSize} in hand · ${p.deckSize} in deck</span>`;
  const opponents=game.players.map((p,i)=>{
    if(i===game.seat) return '';
    const enabled=active&&selected&&!p.eliminated;
    return `<section data-seat="${i}" class="field player-field ${game.active===i&&!outcome?'current-turn':''} ${p.eliminated?'eliminated':''}" aria-label="${escape(p.name)}’s battlefield"><div class="stats">${stats(p,i)}<button class="outline enemy-target" data-action="hero" data-opponent="${i}" ${enabled&&((game.rules===2||selected.type==='play'||!p.board.length)&&!selected.creatureOnly)?'':'disabled'}>Target player</button></div><div class="cards">${p.eliminated?'Out of the match':p.board.map(unit=>card(unit,'enemy',enabled&&(game.rules!==2||selected.type==='play'),i)).join('')||'<span>No creatures in play</span>'}</div></section>`;
  }).join('');
  const leave=outcome||mine.eliminated;
  arena.innerHTML=`<div class="bar"><h1>Battlefield</h1><button class="quiet" data-action="${leave?'leave':'concede'}" ${busy?'disabled':''}>${leave?'Back to lobby':'Concede'}</button></div>
  <p id="status" role="status">${escape(error||outcome||(mine.eliminated?'You’re eliminated. '+prompt:prompt))} ${game.last&&!error?' · '+escape(game.last):''}</p>
  ${combatPanel}<div class="opponents">${opponents}</div>
  <section data-seat="${game.seat}" class="field player-field ${active?'current-turn':''}" aria-label="Your battlefield"><div class="stats">${stats(mine,game.seat)}<button class="gold" data-action="end" ${active?'':'disabled'}>End turn</button></div><div class="cards">${mine.board.map(unit=>card(unit,blocking?'block':'mine',blocking?!unit.exhausted:active&&unit.ready)).join('')||'<span>No creatures in play</span>'}</div></section>
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
    enter(await api(code,{type:create?'create':'join',name:$(create?'host-name':'guest-name').value,leader:$(create?'host-leader':'guest-leader').value}));
  }catch(reason){$('lobby-error').textContent=reason.message;}
  finally{button.disabled=false;}
}
$('create').onsubmit=event=>enterFromForm(event,true);
$('join').onsubmit=event=>enterFromForm(event,false);

async function move(data){
  if(busy) return;
  busy=true;
  error='';
  render();
  try{
    game=await api(room,{...data,revision:game.revision});
    selected=undefined;
  }catch(reason){error=reason.message;return;}
  finally{busy=false;render();}
  animateEffect();
}
arena.onclick=async event=>{
  const button=event.target.closest('button');
  if(!button||button.disabled) return;
  const {action,zone,id,opponent}=button.dataset;
  if(action==='copy'){
    try{await navigator.clipboard.writeText(location.href);$('status').textContent='Invite link copied.';}
    catch{$('status').textContent='Share the URL from your address bar.';}
  }
  if(action==='leave') location.href='/';
  if(action==='start') await move({type:'start'});
  if(action==='summon') await move({type:'summon'});
  if(action==='pass') await move({type:'pass'});
  if(action==='no-block'||zone==='block') await move({type:'block',id});
  if(zone==='reaction') await move({type:'react',id});
  if(action==='end') await move({type:'end'});
  if(action==='concede' && confirm('Concede this match?')) await move({type:'concede'});
  if(action==='hero' && selected) await move({...selected,target:'hero',opponent:Number(opponent)});
  if(zone==='enemy' && selected) await move({...selected,target:id,opponent:Number(opponent)});
  if(zone==='mine' || zone==='hand'){
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
function updateClock(){
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
