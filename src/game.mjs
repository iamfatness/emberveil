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
export function turn(game) {
  const p=game.players[game.active];
  p.max=Math.min(10,p.max+1);
  p.mana=p.max;
  p.board.forEach(unit=>unit.ready=true);
  if(game.round>1){
    if(p.deck.length) p.hand.push(p.deck.shift());
    else game.winner=1-game.active;
  }
}
export function act(game, seat, data){
  if(game.players.length!==2 || game.winner!==null) throw Error('There is no active duel.');
  if(data.type==='concede'){game.winner=1-seat;return;}
  if(seat!==game.active) throw Error('Wait for your turn.');
  const p=game.players[seat], enemy=game.players[1-seat];
  if(data.type==='end'){
    game.active=1-seat;
    game.round++;
    turn(game);
  }else if(data.type==='play'){
    const index=p.hand.findIndex(unit=>unit.id===data.id);
    if(index<0) throw Error('That card is unavailable.');
    const unit=p.hand[index], card=cards[unit.kind];
    if(card.cost>p.mana) throw Error('You need more mana.');
    const target=enemy.board.find(unit=>unit.id===data.target);
    if(card.damage && data.target!=='hero' && !target) throw Error('Choose an enemy target.');
    p.hand.splice(index,1);
    p.mana-=card.cost;
    if(card.power) p.board.push({...unit,hp:card.hp,ready:false});
    if(card.heal) p.life=Math.min(20,p.life+card.heal);
    if(card.damage){
      if(target) target.hp-=card.damage;
      else enemy.life-=card.damage;
    }
    game.last=p.name+' played '+card.name+'.';
  }else if(data.type==='attack'){
    const unit=p.board.find(unit=>unit.id===data.id && unit.ready);
    if(!unit) throw Error('That creature cannot attack.');
    const target=enemy.board.find(unit=>unit.id===data.target);
    if(!target && (data.target!=='hero' || enemy.board.length)) throw Error('Attack an enemy creature first.');
    unit.ready=false;
    if(target){
      target.hp-=cards[unit.kind].power;
      unit.hp-=cards[target.kind].power;
    }else enemy.life-=cards[unit.kind].power;
    game.last=p.name+' attacked with '+cards[unit.kind].name+'.';
  }else throw Error('Unknown action.');
  p.board=p.board.filter(unit=>unit.hp>0);
  enemy.board=enemy.board.filter(unit=>unit.hp>0);
  if(enemy.life<=0) game.winner=seat;
}
export function view(game, seat, revision){
  return {revision,seat,active:game.active,round:game.round,winner:game.winner,last:game.last,
    players:game.players.map((p,i)=>({name:p.name,life:p.life,mana:p.mana,max:p.max,board:p.board,
      hand:i===seat?p.hand:undefined,handSize:p.hand.length,deckSize:p.deck.length}))};
}
