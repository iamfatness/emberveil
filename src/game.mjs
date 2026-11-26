export const cards = {
  scout: {name:'Cinder Scout', cost:1, power:2, hp:1, icon:'♞'},
  guard: {name:'Oathkeeper', cost:2, power:2, hp:3, icon:'⛨'},
  wolf: {name:'Ashfang Wolf', cost:3, power:4, hp:2, icon:'♜'},
  knight: {name:'Hollow Knight', cost:4, power:4, hp:4, icon:'⚔'},
  drake: {name:'Ember Drake', cost:5, power:6, hp:4, icon:'♛'},
  spark: {name:'Wildfire', cost:2, damage:3, icon:'✦'},
  ward: {name:'Dawnward', cost:2, heal:4, icon:'☀'}
};
export function player(name, key) {
  const deck = Object.keys(cards).flatMap(kind => Array.from({length:4}, () => ({kind,id:crypto.randomUUID()})));
  for(let i=deck.length-1;i>0;i--){
    const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);
    [deck[i],deck[j]]=[deck[j],deck[i]];
  }
  return {name,key,life:20,mana:0,max:0,board:[],hand:deck.splice(0,5),deck};
}
export const MAX_PLAYERS = 6;
export const hasStarted = game => game.started ?? game.players.length >= 2;

function eliminate(game, seat, message){
  game.players[seat].eliminated=true;
  game.last=message;
  const remaining=game.players.flatMap((p,i)=>p.eliminated?[]:[i]);
  if(remaining.length===1) game.winner=remaining[0];
}
function beginTurn(game){
  const p=game.players[game.active];
  p.max=Math.min(10,p.max+1);
  p.mana=p.max;
  p.board.forEach(unit=>unit.ready=true);
  if(game.round===1) return;
  if(p.deck.length) p.hand.push(p.deck.shift());
  else eliminate(game,game.active,p.name+' ran out of cards.');
}
function advance(game){
  do{
    do{
      game.active=(game.active+1)%game.players.length;
    }while(game.players[game.active].eliminated);
    game.round++;
    beginTurn(game);
  }while(game.players[game.active].eliminated && game.winner===null);
}
export function act(game, seat, data){
  if(data.type==='start'){
    if(hasStarted(game) || seat!==0 || game.players.length<2) throw Error('The host can start with at least two players.');
    game.started=true;
    beginTurn(game);
    return;
  }
  if(!hasStarted(game) || game.winner!==null) throw Error('There is no active match.');
  const p=game.players[seat];
  if(p.eliminated) throw Error('You have been eliminated.');
  if(data.type==='concede'){
    eliminate(game,seat,p.name+' conceded.');
    if(game.winner===null && game.active===seat) advance(game);
    return;
  }
  if(seat!==game.active) throw Error('Wait for your turn.');
  if(data.type==='end'){
    game.last='';
    advance(game);
    return;
  }
  const enemySeat=data.opponent ?? (game.players.length===2?1-seat:undefined);
  const enemy=enemySeat!==seat && Number.isInteger(enemySeat)?game.players[enemySeat]:undefined;
  const opponent=enemy && !enemy.eliminated?enemy:undefined;
  const target=opponent?.board.find(unit=>unit.id===data.target);
  if(data.type==='play'){
    const index=p.hand.findIndex(unit=>unit.id===data.id);
    if(index<0) throw Error('That card is unavailable.');
    const unit=p.hand[index], card=cards[unit.kind];
    if(card.cost>p.mana) throw Error('You need more mana.');
    if(card.damage && (!opponent || (data.target!=='hero' && !target))) throw Error('Choose an opposing target.');
    p.hand.splice(index,1);
    p.mana-=card.cost;
    if(card.power) p.board.push({...unit,hp:card.hp,ready:false});
    if(card.heal) p.life=Math.min(20,p.life+card.heal);
    if(card.damage){
      if(target) target.hp-=card.damage;
      else opponent.life-=card.damage;
    }
    game.last=p.name+' played '+card.name+'.';
  }else if(data.type==='attack'){
    const unit=p.board.find(unit=>unit.id===data.id && unit.ready);
    if(!unit) throw Error('That creature cannot attack.');
    if(!opponent) throw Error('Choose an opposing player.');
    if(!target && (data.target!=='hero' || opponent.board.length)) throw Error('Attack a creature on that player’s battlefield first.');
    unit.ready=false;
    if(target){
      target.hp-=cards[unit.kind].power;
      unit.hp-=cards[target.kind].power;
    }else opponent.life-=cards[unit.kind].power;
    game.last=p.name+' attacked '+opponent.name+' with '+cards[unit.kind].name+'.';
  }else throw Error('Unknown action.');
  p.board=p.board.filter(unit=>unit.hp>0);
  if(opponent){
    opponent.board=opponent.board.filter(unit=>unit.hp>0);
    if(opponent.life<=0) eliminate(game,enemySeat,opponent.name+' was eliminated.');
  }
}
export function view(game, seat, revision){
  return {revision,seat,started:hasStarted(game),active:game.active,round:game.round,winner:game.winner,last:game.last,
    players:game.players.map((p,i)=>({name:p.name,life:p.life,mana:p.mana,max:p.max,eliminated:!!p.eliminated,board:p.board,
      hand:i===seat?p.hand:undefined,handSize:p.hand.length,deckSize:p.deck.length}))};
}
