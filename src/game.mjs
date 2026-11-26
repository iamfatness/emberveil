export const cards = {
  scout: {name:'Cinder Scout', cost:1, power:2, hp:1, icon:'♞'},
  guard: {name:'Oathkeeper', cost:2, power:2, hp:3, icon:'⛨'},
  wolf: {name:'Ashfang Wolf', cost:3, power:4, hp:2, icon:'♜'},
  knight: {name:'Hollow Knight', cost:4, power:4, hp:4, icon:'⚔'},
  drake: {name:'Ember Drake', cost:5, power:6, hp:4, icon:'♛'},
  spark: {name:'Wildfire', cost:2, damage:3, icon:'✦'},
  ward: {name:'Dawnward', cost:2, heal:4, icon:'☀'},
  veil: {name:'Silver Veil',cost:1,reaction:'shield',text:'Prevent up to 3 damage to the defender or blocker',icon:'◇'},
  surge: {name:'Ash Surge',cost:1,reaction:'boost',text:'Give the attacker +2 power for this combat',icon:'✧'},
  tala: {name:'Tala, Ash Rider',cost:3,power:5,hp:2,icon:'♞'},
  vael: {name:'Vael, Dawn Keeper',cost:3,power:2,hp:6,icon:'⛨'},
  neri: {name:'Neri, Veil Weaver',cost:3,power:3,hp:4,icon:'✦'}
};
export const leaders = {
  tala:{style:'Aggression',text:'Fast creatures and Ash Surge.',deck:{scout:6,wolf:5,drake:4,guard:2,spark:5,surge:6,veil:2}},
  vael:{style:'Defense',text:'Sturdy creatures, healing, and Silver Veil.',deck:{scout:3,guard:6,knight:6,drake:2,spark:2,ward:5,veil:6}},
  neri:{style:'Spellcraft',text:'Wildfire and a mix of both reactions.',deck:{scout:4,guard:4,wolf:3,knight:3,spark:6,ward:2,veil:4,surge:4}}
};
export function player(name, key, leader='tala') {
  const deck=Object.entries(leader?leaders[leader].deck:{scout:4,guard:4,wolf:4,knight:4,drake:4,spark:4,ward:4}).flatMap(([kind,count])=>Array.from({length:count},()=>({kind,id:crypto.randomUUID()})));
  for(let i=deck.length-1;i>0;i--){
    const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);
    [deck[i],deck[j]]=[deck[j],deck[i]];
  }
  return {name,key,leader,leaderCasts:0,life:20,mana:0,max:0,board:[],hand:deck.splice(0,5),deck};
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
  p.board.forEach(unit=>{unit.ready=true;unit.exhausted=false;});
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
const combatTimeout=30_000;
const reactionEligible=(p)=>!p.eliminated&&p.hand.some(unit=>cards[unit.kind].reaction&&cards[unit.kind].cost<=p.mana);

function resolveCombat(game){
  const combat=game.combat;
  const attacker=game.players[combat.attacker], defender=game.players[combat.defender];
  const unit=attacker.board.find(unit=>unit.id===combat.unit);
  const blocker=defender.board.find(unit=>unit.id===combat.blocker);
  const damage=Math.max(0,cards[unit.kind].power+combat.boost-combat.shield);
  if(blocker){
    blocker.hp-=damage;
    unit.hp-=cards[blocker.kind].power;
  }else defender.life-=damage;
  attacker.board=attacker.board.filter(unit=>unit.hp>0);
  defender.board=defender.board.filter(unit=>unit.hp>0);
  game.combat=null;
  game.last=blocker?cards[blocker.kind].name+' blocked '+cards[unit.kind].name+'.':defender.name+' took '+damage+' combat damage.';
  if(defender.life<=0) eliminate(game,combat.defender,defender.name+' was eliminated.');
}
function finishBlocking(game, id){
  const combat=game.combat;
  combat.blocker=id;
  combat.phase='react';
  combat.deadline=Date.now()+combatTimeout;
  combat.queue=Array.from({length:game.players.length},(_,i)=>(combat.attacker+i)%game.players.length)
    .filter(i=>reactionEligible(game.players[i]));
  if(!combat.queue.length) resolveCombat(game);
}
export function expireCombat(game, now=Date.now()){
  if(!game.combat || game.combat.deadline>now) return false;
  if(game.combat.phase==='block') finishBlocking(game,null);
  else resolveCombat(game);
  return true;
}
function respondToCombat(game,seat,data){
  const combat=game.combat;
  const p=game.players[seat];
  if(combat.phase==='block'){
    if(seat!==combat.defender || data.type!=='block') throw Error('Waiting for the defender.');
    if(data.id!=null && !p.board.some(unit=>unit.id===data.id && !unit.exhausted)) throw Error('Choose an available blocker.');
    finishBlocking(game,data.id??null);
    return;
  }
  if(seat!==combat.queue[0] || !['react','pass'].includes(data.type)) throw Error('Wait for your reaction opportunity.');
  if(data.type==='react'){
    const index=p.hand.findIndex(unit=>unit.id===data.id);
    const card=cards[p.hand[index]?.kind];
    if(!card?.reaction || card.cost>p.mana) throw Error('That reaction is unavailable.');
    p.hand.splice(index,1);
    p.mana-=card.cost;
    if(card.reaction==='shield') combat.shield+=3;
    else combat.boost+=2;
    game.last=p.name+' cast '+card.name+'.';
  }
  combat.queue.shift();
  if(!combat.queue.length) resolveCombat(game);
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
    const combat=game.combat;
    if(combat?.attacker===seat||combat?.defender===seat) game.combat=null;
    else if(combat?.phase==='react') combat.queue=combat.queue.filter(i=>i!==seat);
    eliminate(game,seat,p.name+' conceded.');
    if(game.winner!==null) game.combat=null;
    else if(game.active===seat) advance(game);
    else if(game.combat?.phase==='react'&&!game.combat.queue.length) resolveCombat(game);
    return;
  }
  if(game.combat){respondToCombat(game,seat,data);return;}
  if(seat!==game.active) throw Error('Wait for your turn.');
  if(data.type==='end'){
    if(game.rules===2) game.players.forEach(p=>p.board.forEach(unit=>unit.hp=cards[unit.kind].hp));
    game.last='';
    advance(game);
    return;
  }
  if(data.type==='summon'){
    if(!p.leader || p.board.some(unit=>unit.kind===p.leader)) throw Error('Your leader is already on the battlefield or unavailable.');
    const card=cards[p.leader];
    const cost=card.cost+p.leaderCasts;
    if(p.mana<cost) throw Error('You need more mana.');
    p.mana-=cost;
    p.leaderCasts++;
    p.board.push({kind:p.leader,id:crypto.randomUUID(),hp:card.hp,ready:false});
    game.last=p.name+' summoned '+card.name+'.';
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
    if(card.reaction) throw Error('Save that card for combat.');
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
    if(game.rules===2){
      if(data.target!=='hero') throw Error('Attack an opposing player.');
      unit.ready=false;
      unit.exhausted=true;
      game.combat={attacker:seat,defender:enemySeat,unit:unit.id,phase:'block',boost:0,shield:0,deadline:Date.now()+combatTimeout};
      game.last=p.name+' attacked '+opponent.name+' with '+cards[unit.kind].name+'.';
      if(!opponent.board.some(unit=>!unit.exhausted)) finishBlocking(game,null);
      return;
    }
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
  const combat=game.combat;
  const visibleCombat=combat&&{attacker:combat.attacker,defender:combat.defender,unit:combat.unit,blocker:combat.blocker,
    phase:combat.phase,deadline:combat.deadline,canReact:combat.queue?.[0]===seat,boost:combat.boost,shield:combat.shield};
  return {revision,seat,rules:game.rules,combat:visibleCombat,started:hasStarted(game),active:game.active,round:game.round,winner:game.winner,last:game.last,
    players:game.players.map((p,i)=>({name:p.name,life:p.life,mana:p.mana,max:p.max,leader:p.leader,leaderCost:p.leader?cards[p.leader].cost+p.leaderCasts:undefined,eliminated:!!p.eliminated,board:p.board,
      hand:i===seat?p.hand:undefined,handSize:p.hand.length,deckSize:p.deck.length}))};
}
