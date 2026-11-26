import {cards} from '/game.mjs';
const $=id=>document.getElementById(id);
const lobby=$('lobby'),arena=$('arena');
const key=sessionStorage.emberveilKey||(sessionStorage.emberveilKey=crypto.randomUUID());
const requested=new URL(location.href).searchParams.get('room')?.toUpperCase()||'';
let room='',game,selected,error='',busy=false,refreshing=false;
$('guest-code').value=requested;
$('rules').onclick=()=>$('guide').showModal();

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
function card(unit,zone,enabled){
  const info=cards[unit.kind];
  const detail=zone==='hand'?(info.damage?'Deal 3 damage':info.heal?'Heal 4 life':info.power+' / '+info.hp):info.power+' / '+unit.hp;
  return `<button class="card" data-zone="${zone}" data-id="${unit.id}" data-selected="${selected?.id===unit.id}" ${enabled?'':'disabled'}><strong>${info.name}</strong><span class="sigil" aria-hidden="true">${info.icon}</span><span>${zone==='hand'?info.cost+' mana · ':''}${detail}${zone==='mine'&&!unit.ready?' · Resting':''}</span></button>`;
}
function render(){
  if(!game) return;
  lobby.hidden=true;
  arena.hidden=false;
  if(game.players.length===1){
    arena.innerHTML=`<section class="panel waiting"><h1>Waiting for a challenger</h1><p>Share your invite link or room code with a friend.</p><strong class="code">${room}</strong><button class="gold" data-action="copy">Copy invite link</button><p id="status" role="status">${escape(error)}</p><a href="/">Back to lobby</a></section>`;
    return;
  }
  const mine=game.players[game.seat],enemy=game.players[1-game.seat];
  const active=game.active===game.seat && game.winner===null && !busy;
  const outcome=game.winner===null?'':game.winner===game.seat?'You won!':enemy.name+' won.';
  const prompt=selected?'Choose an opposing target.':game.active===game.seat?'Your turn':enemy.name+'’s turn';
  const stats=p=>`<strong>${escape(p.name)}</strong><span>♥ ${p.life} life</span><span>◆ ${p.mana}/${p.max} mana</span><span>${p.handSize} in hand · ${p.deckSize} in deck</span>`;
  arena.innerHTML=`<div class="bar"><h1>Battlefield</h1><div class="actions"><button class="quiet" data-action="copy">Copy invite</button><button class="quiet" data-action="${outcome?'leave':'concede'}" ${busy?'disabled':''}>${outcome?'Back to lobby':'Concede'}</button></div></div>
  <section class="field" aria-label="Opponent’s battlefield"><div class="stats">${stats(enemy)}<button class="outline enemy-target" data-action="hero" ${active&&selected&&(selected.type==='play'||!enemy.board.length)?'':'disabled'}>Target player</button></div><div class="cards">${enemy.board.map(unit=>card(unit,'enemy',active&&selected)).join('')||'<span>No opposing creatures</span>'}</div></section>
  <p id="status" role="status">${escape(error||outcome||prompt)} ${game.last&&!error?' · '+escape(game.last):''}</p>
  <section class="field" aria-label="Your battlefield"><div class="stats">${stats(mine)}<button class="gold" data-action="end" ${active?'':'disabled'}>End turn</button></div><div class="cards">${mine.board.map(unit=>card(unit,'mine',active&&unit.ready)).join('')||'<span>No creatures in play</span>'}</div></section>
  <section class="field" aria-label="Your hand"><strong>Your hand</strong><div class="cards">${mine.hand.map(unit=>card(unit,'hand',active&&cards[unit.kind].cost<=mine.mana)).join('')||'<span>Your hand is empty</span>'}</div></section>`;
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
    enter(await api(code,{type:create?'create':'join',name:$(create?'host-name':'guest-name').value}));
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
  }catch(reason){error=reason.message;}
  finally{busy=false;render();}
}
arena.onclick=async event=>{
  const button=event.target.closest('button');
  if(!button||button.disabled) return;
  const {action,zone,id}=button.dataset;
  if(action==='copy'){
    try{await navigator.clipboard.writeText(location.href);$('status').textContent='Invite link copied.';}
    catch{$('status').textContent='Share the URL from your address bar.';}
  }
  if(action==='leave') location.href='/';
  if(action==='end') await move({type:'end'});
  if(action==='concede' && confirm('Concede this duel?')) await move({type:'concede'});
  if(action==='hero' && selected) await move({...selected,target:'hero'});
  if(zone==='enemy' && selected) await move({...selected,target:id});
  if(zone==='mine' || zone==='hand'){
    const type=zone==='mine'?'attack':'play';
    const item=game.players[game.seat].hand.find(unit=>unit.id===id);
    if(zone==='hand' && !cards[item.kind].damage) await move({type,id});
    else{
      selected=selected?.id===id?undefined:{type,id};
      error='';
      render();
    }
  }
};
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
