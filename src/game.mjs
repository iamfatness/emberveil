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
  neri: {name:'Neri, Veil Weaver',cost:3,power:3,hp:4,icon:'✦'},
  sylva: {name:'Sylva, Thorn Regent',cost:3,power:2,hp:3,spawns:1,text:'Summon a 1 / 1 Briar Sprite',icon:'♣'},
  orrun: {name:'Orrun, Forge Titan',cost:6,power:7,hp:6,icon:'♛'},
  iskar: {name:'Iskar, Tide Oracle',cost:4,power:3,hp:4,draw:true,text:'Draw a card when summoned',icon:'◇'},
  sprite: {name:'Briar Sprite',cost:0,power:1,hp:1,art:'briar',icon:'♣'},
  briar: {name:'Briar Gathering',cost:2,spawns:2,text:'Summon two 1 / 1 Briar Sprites',icon:'♣'},
  forge: {name:'Foundry Crystal',cost:2,ramp:true,text:'Increase mana capacity by 1, up to 10',icon:'◆'},
  frost: {name:'Tidebind',cost:2,freeze:true,text:'Freeze a creature through its next turn',icon:'❄'}
};
export const leaders = {
  tala:{style:'Aggression',text:'Fast creatures and Ash Surge.',deck:{scout:6,wolf:5,drake:4,guard:2,spark:5,surge:6,veil:2}},
  vael:{style:'Defense',text:'Sturdy creatures, healing, and Silver Veil.',deck:{scout:3,guard:6,knight:6,drake:2,spark:2,ward:5,veil:6}},
  neri:{style:'Spellcraft',text:'Wildfire and a mix of both reactions.',deck:{scout:4,guard:4,wolf:3,knight:3,spark:6,ward:2,veil:4,surge:4}},
  sylva:{style:'Swarm',text:'Fill the battlefield with small creatures. Sylva brings a Briar Sprite with her.',deck:{scout:6,guard:4,wolf:4,briar:8,surge:4,veil:4}},
  orrun:{style:'Ramp',text:'Build mana with Foundry Crystals, then summon drakes and a 7 / 6 leader.',deck:{scout:3,guard:4,knight:5,drake:6,forge:6,ward:3,veil:3}},
  iskar:{style:'Control',text:'Freeze opposing creatures and protect your position. Iskar draws a card when summoned.',deck:{guard:5,knight:3,wolf:3,frost:7,spark:4,veil:6,ward:2}}
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
export const modes={ffa:'Free-for-all',teams:'Team PvP',coop:'Co-op vs bots'};
export const allies=(game,a,b)=>a===b||game.mode&&game.mode!=='ffa'&&game.players[a].team===game.players[b].team;
export const humanLimit=game=>game.mode==='coop'?MAX_PLAYERS-game.botCount:MAX_PLAYERS;
export const readyToStart=game=>game.mode==='coop'||(game.mode==='teams'
  ? game.players.length>=4 && game.players.length%2===0
  : game.players.length>=2);
function redraw(p){
  p.deck.push(...p.hand);
  for(let i=p.deck.length-1;i>0;i--){
    const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);
    [p.deck[i],p.deck[j]]=[p.deck[j],p.deck[i]];
  }
  p.hand=p.deck.splice(0,5);
  p.redrawn=true;
}
function cleanDamage(game){
  if(game.rules>=2) game.players.forEach(p=>p.board.forEach(unit=>unit.hp=cards[unit.kind].hp));
}
function endTurn(game){
  cleanDamage(game);
  advance(game);
}

export const hasStarted = game => game.started ?? game.players.length >= 2;

function eliminate(game, seat, message){
  game.players[seat].eliminated=true;
  game.last=message;
  const remaining=game.players.flatMap((p,i)=>p.eliminated?[]:[i]);
  if(remaining.length && remaining.every(i=>allies(game,i,remaining[0]))) game.winner=remaining[0];
}
function beginTurn(game){
  const p=game.players[game.active];
  game.attacked=false;
  if(game.rules>=3) game.turnDeadline=Date.now()+game.turnSeconds*1000;
  p.max=Math.min(10,p.max+1);
  p.mana=p.max;
  p.board.forEach(unit=>{
    unit.freezeTurn=!!unit.frozen;
    unit.ready=!unit.frozen;
    unit.exhausted=!!unit.frozen;
    if(unit.frozen) unit.frozen--;
  });
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
  game.effect={type:'impact',seat:combat.defender,unit:blocker?.id};
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
function resolveBatch(game){
  const combat=game.combat;
  const attacker=game.players[combat.attacker], defender=game.players[combat.defender];
  let total=0;
  for(const strike of combat.strikes){
    const unit=attacker.board.find(unit=>unit.id===strike.unit);
    const blocker=defender.board.find(unit=>unit.id===strike.blocker);
    const damage=Math.max(0,cards[unit.kind].power+strike.boost-strike.shield);
    if(blocker){
      blocker.hp-=damage;
      unit.hp-=cards[blocker.kind].power;
    }else total+=damage;
  }
  defender.life-=total;
  attacker.board=attacker.board.filter(unit=>unit.hp>0);
  defender.board=defender.board.filter(unit=>unit.hp>0);
  game.combat=null;
  game.turnDeadline=Date.now()+combat.turnRemaining;
  game.effect={type:'impact',seat:combat.defender};
  game.last=defender.name+' took '+total+' combat damage.';
  if(defender.life<=0) eliminate(game,combat.defender,defender.name+' was eliminated.');
}
function batchReactions(game){
  const combat=game.combat;
  combat.phase='react';
  combat.deadline=Date.now()+15_000;
  combat.queue=game.players.flatMap((p,i)=>!p.bot&&reactionEligible(p)?[i]:[]);
  if(!combat.queue.length) resolveBatch(game);
}
function batchResponse(game,seat,data){
  const combat=game.combat;
  const p=game.players[seat];
  if(combat.phase==='block'){
    if(seat!==combat.defender||data.type!=='blocks'||!Array.isArray(data.blocks)||data.blocks.length>combat.strikes.length) throw Error('Only the defender can assign blockers.');
    const used=new Set();
    const assigned=new Set();
    for(const block of data.blocks){
      const strike=combat.strikes.find(strike=>strike.unit===block.attacker);
      if(!strike||assigned.has(block.attacker)||used.has(block.blocker)||!p.board.some(unit=>unit.id===block.blocker&&!unit.exhausted)) throw Error('Each attacker and blocker can be assigned once.');
      assigned.add(block.attacker);
      used.add(block.blocker);
    }
    for(const block of data.blocks) combat.strikes.find(strike=>strike.unit===block.attacker).blocker=block.blocker;
    batchReactions(game);
    return;
  }
  if(!combat.queue.includes(seat)||!['react','pass'].includes(data.type)) throw Error('Your reaction opportunity is closed.');
  if(data.type==='react'){
    const strike=combat.strikes.find(strike=>strike.unit===data.strike);
    const index=p.hand.findIndex(unit=>unit.id===data.id);
    const card=cards[p.hand[index]?.kind];
    if(!strike||!card?.reaction||card.cost>p.mana) throw Error('Choose an attacker and an affordable reaction.');
    p.hand.splice(index,1);
    p.mana-=card.cost;
    if(card.reaction==='shield') strike.shield+=3;
    else strike.boost+=2;
    game.last=p.name+' cast '+card.name+'.';
    game.effect={type:card.reaction,seat:combat.defender,unit:strike.blocker};
  }
  combat.queue=combat.queue.filter(i=>i!==seat);
  if(!combat.queue.length) resolveBatch(game);
}
function declareAttack(game,seat,opponent,ids){
  const p=game.players[seat];
  if(game.attacked||!Array.isArray(ids)||!ids.length||ids.length>p.board.length||new Set(ids).size!==ids.length) throw Error('Choose attackers for your one combat this turn.');
  const units=ids.map(id=>p.board.find(unit=>unit.id===id && unit.ready));
  if(units.some(unit=>!unit)) throw Error('Choose ready attackers.');
  for(const unit of units){unit.ready=false;unit.exhausted=true;}
  game.attacked=true;
  game.combat={id:crypto.randomUUID(),strikes:ids.map(unit=>({unit,boost:0,shield:0})),attacker:seat,defender:opponent,
    phase:'block',deadline:Date.now()+20_000,turnRemaining:Math.max(0,game.turnDeadline-Date.now())};
  game.effect={type:'attack',seat,unit:ids[0]};
  game.last=p.name+' declared '+ids.length+' attacker'+(ids.length===1?'':'s')+'.';
  if(!game.players[opponent].board.some(unit=>!unit.exhausted)) batchReactions(game);
}
export function expireCombat(game, now=Date.now()){
  if(game.winner!==null||!hasStarted(game)) return false;
  if(!game.combat){
    if(!game.turnDeadline||game.turnDeadline>now) return false;
    game.last=game.players[game.active].name+' ran out of turn time.';
    game.effect=null;
    endTurn(game);
    return true;
  }
  if(game.combat.deadline>now) return false;
  game.effect=null;
  if(game.combat.strikes){
    if(game.combat.phase==='block') batchReactions(game);
    else resolveBatch(game);
  }else if(game.combat.phase==='block') finishBlocking(game,null);
  else resolveCombat(game);
  return true;
}
function respondToCombat(game,seat,data){
  const combat=game.combat;
  const p=game.players[seat];
  if(combat.phase==='block'){
    if(seat!==combat.defender || data.type!=='block') throw Error('Waiting for the defender.');
    if(data.id!=null && !p.board.some(unit=>unit.id===data.id && !unit.exhausted)) throw Error('Choose an available blocker.');
    if(data.id) game.effect={type:'shield',seat,unit:data.id};
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
    game.effect={type:card.reaction,seat:combat.defender,unit:combat.blocker};
  }
  combat.queue.shift();
  if(!combat.queue.length) resolveCombat(game);
}
function summonSprites(p,count){
  let first;
  for(let i=0;i<count;i++){
    const sprite={kind:'sprite',id:crypto.randomUUID(),hp:1,ready:false};
    first??=sprite;
    p.board.push(sprite);
  }
  return first;
}
export function act(game, seat, data){
  game.effect=null;
  if(data.type==='redraw'){
    const p=game.players[seat];
    if(game.rules<3||hasStarted(game)||p.redrawn) throw Error('Your opening redraw is unavailable.');
    redraw(p);
    return;
  }
  if(data.type==='start'){
    if(hasStarted(game) || seat!==0 || !readyToStart(game)) throw Error('The host can start once the room has enough players for this mode.');
    if(game.mode==='coop'){
      for(let i=0;i<game.botCount;i++){
        const bot=player('Sentinel '+(i+1),null,['vael','orrun','iskar'][i]);
        game.players.push({...bot,bot:true,team:1});
      }
    }
    game.started=true;
    beginTurn(game);
    return;
  }
  if(!hasStarted(game) || game.winner!==null) throw Error('There is no active match.');
  const p=game.players[seat];
  if(p.eliminated) throw Error('You have been eliminated.');
  if(data.type==='concede'){
    const combat=game.combat;
    if(combat?.attacker===seat||combat?.defender===seat){
      if(combat.strikes) game.turnDeadline=Date.now()+combat.turnRemaining;
      game.combat=null;
    }
    else if(combat?.phase==='react') combat.queue=combat.queue.filter(i=>i!==seat);
    eliminate(game,seat,p.name+' conceded.');
    if(game.winner!==null) game.combat=null;
    else if(game.active===seat) endTurn(game);
    else if(game.combat?.phase==='react'&&!game.combat.queue.length) (game.combat.strikes?resolveBatch:resolveCombat)(game);
    return;
  }
  if(game.combat){(game.combat.strikes?batchResponse:respondToCombat)(game,seat,data);return;}
  if(seat!==game.active) throw Error('Wait for your turn.');
  if(data.type==='end'){
    game.last='';
    endTurn(game);
    return;
  }
  if(data.type==='summon'){
    if(!p.leader || p.board.some(unit=>unit.kind===p.leader)) throw Error('Your leader is already on the battlefield or unavailable.');
    const card=cards[p.leader];
    const cost=card.cost+p.leaderCasts;
    if(p.mana<cost) throw Error('You need more mana.');
    p.mana-=cost;
    p.leaderCasts++;
    const unit={kind:p.leader,id:crypto.randomUUID(),hp:card.hp,ready:false};
    p.board.push(unit);
    if(card.spawns) summonSprites(p,card.spawns);
    if(card.draw && p.deck.length) p.hand.push(p.deck.shift());
    game.effect={type:'summon',seat,unit:unit.id};
    game.last=p.name+' summoned '+card.name+'.';
    return;
  }
  const enemySeat=data.opponent ?? (game.players.length===2?1-seat:undefined);
  const enemy=Number.isInteger(enemySeat) && game.players[enemySeat] && !allies(game,seat,enemySeat)?game.players[enemySeat]:undefined;
  const opponent=enemy && !enemy.eliminated?enemy:undefined;
  const target=opponent?.board.find(unit=>unit.id===data.target);
  if(data.type==='attack-batch'){
    if(game.rules<3||!opponent) throw Error('Choose an opposing player.');
    declareAttack(game,seat,enemySeat,data.ids);
    return;
  }
  if(data.type==='play'){
    const index=p.hand.findIndex(unit=>unit.id===data.id);
    if(index<0) throw Error('That card is unavailable.');
    const unit=p.hand[index], card=cards[unit.kind];
    if(card.reaction) throw Error('Save that card for combat.');
    if(card.cost>p.mana) throw Error('You need more mana.');
    if(card.damage && (!opponent || (data.target!=='hero' && !target))) throw Error('Choose an opposing target.');
    if(card.freeze && !target) throw Error('Choose an opposing creature to freeze.');
    p.hand.splice(index,1);
    p.mana-=card.cost;
    const sprite=card.spawns&&summonSprites(p,card.spawns);
    if(card.ramp) p.max=Math.min(10,p.max+1);
    if(card.freeze){
      target.frozen=1;
      target.ready=false;
      target.exhausted=true;
    }
    if(card.power) p.board.push({...unit,hp:card.hp,ready:false});
    if(card.heal) p.life=Math.min(20,p.life+card.heal);
    if(card.damage){
      if(target) target.hp-=card.damage;
      else opponent.life-=card.damage;
    }
    game.last=p.name+' played '+card.name+'.';
    if(card.power||sprite) game.effect={type:'summon',seat,unit:sprite?.id??unit.id};
    else if(card.heal||card.ramp) game.effect={type:'heal',seat};
    else game.effect={type:card.freeze?'shield':'boost',seat:enemySeat,unit:target?.id};
  }else if(data.type==='attack'){
    if(game.rules>=3) throw Error('Declare your attackers together.');
    const unit=p.board.find(unit=>unit.id===data.id && unit.ready);
    if(!unit) throw Error('That creature cannot attack.');
    if(!opponent) throw Error('Choose an opposing player.');
    if(game.rules===2){
      if(data.target!=='hero') throw Error('Attack an opposing player.');
      unit.ready=false;
      unit.exhausted=true;
      game.combat={attacker:seat,defender:enemySeat,unit:unit.id,phase:'block',boost:0,shield:0,deadline:Date.now()+combatTimeout};
      game.effect={type:'attack',seat,unit:unit.id};
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
    game.effect={type:'impact',seat:enemySeat,unit:target?.id};
  }else throw Error('Unknown action.');
  p.board=p.board.filter(unit=>unit.hp>0);
  if(opponent){
    opponent.board=opponent.board.filter(unit=>unit.hp>0);
    if(opponent.life<=0) eliminate(game,enemySeat,opponent.name+' was eliminated.');
  }
}
export function playBots(game){
  let changed=false;
  for(let i=0;i<60&&game.winner===null&&game.started;i++){
    const combat=game.combat;
    const seat=game.active;
    const p=game.players[seat];
    if(combat){
      const defender=game.players[combat.defender];
      if(combat.phase!=='block'||!defender.bot) break;
      const blockers=defender.board.filter(unit=>!unit.exhausted).sort((a,b)=>b.hp-a.hp);
      const attacks=[...combat.strikes].sort((a,b)=>{
        const power=strike=>cards[p.board.find(unit=>unit.id===strike.unit).kind].power;
        return power(b)-power(a);
      });
      const blocks=blockers.slice(0,attacks.length).map((unit,i)=>({attacker:attacks[i].unit,blocker:unit.id}));
      act(game,combat.defender,{type:'blocks',blocks});
    }else if(p.bot){
      const opponent=game.players.map((target,i)=>({target,i}))
        .filter(({target,i})=>!target.eliminated&&!allies(game,seat,i))
        .sort((a,b)=>a.target.life-b.target.life||a.target.board.length-b.target.board.length)[0];
      const ready=p.board.filter(unit=>unit.ready).map(unit=>unit.id);
      const available=p.hand.find(unit=>{
        const card=cards[unit.kind];
        return card.cost<=p.mana&&!card.reaction&&(!card.freeze||opponent.target.board.length)&&(!card.heal||p.life<=16)&&(!card.ramp||p.max<10);
      });
      if(!p.board.some(unit=>unit.kind===p.leader)&&p.mana>=cards[p.leader].cost+p.leaderCasts) act(game,seat,{type:'summon'});
      else if(available){
        const card=cards[available.kind];
        const target=card.freeze?opponent.target.board[0]?.id:opponent.target.board.find(unit=>unit.hp<=card.damage)?.id;
        act(game,seat,{type:'play',id:available.id,opponent:opponent.i,target:target??'hero'});
      }else if(ready.length&&!game.attacked) act(game,seat,{type:'attack-batch',opponent:opponent.i,ids:ready});
      else act(game,seat,{type:'end'});
    }else break;
    changed=true;
  }
  return changed;
}
export function view(game, seat, revision){
  const combat=game.combat;
  const visibleCombat=combat&&{id:combat.id,strikes:combat.strikes,attacker:combat.attacker,defender:combat.defender,unit:combat.unit,blocker:combat.blocker,
    phase:combat.phase,deadline:combat.deadline,canReact:combat.strikes?combat.queue?.includes(seat):combat.queue?.[0]===seat,boost:combat.boost,shield:combat.shield};
  return {revision,seat,mode:game.mode,botCount:game.botCount,turnDeadline:game.turnDeadline,turnSeconds:game.turnSeconds,attacked:game.attacked,readyToStart:readyToStart(game),humanLimit:humanLimit(game),rules:game.rules,combat:visibleCombat,effect:game.effect,started:hasStarted(game),active:game.active,round:game.round,winner:game.winner,last:game.last,
    players:game.players.map((p,i)=>({name:p.name,team:p.team,bot:p.bot,redrawn:p.redrawn,life:p.life,mana:p.mana,max:p.max,leader:p.leader,leaderCost:p.leader?cards[p.leader].cost+p.leaderCasts:undefined,eliminated:!!p.eliminated,board:p.board,
      hand:i===seat?p.hand:undefined,handSize:p.hand.length,deckSize:p.deck.length}))};
}
