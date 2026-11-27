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
  sera:{name:'Sera, Outer Keeper',cost:4,power:2,hp:6},
  cass:{name:'Cass, Unclaimed',cost:4,power:4,hp:4},
  sprite: {name:'Briar Sprite',cost:0,power:1,hp:1,art:'briar',icon:'♣'},
  'briar-shelter': {name:'Briar Shelter',cost:2,spawns:1,heal:2,text:'Summon a Briar Sprite and gain 2 life',icon:'♣'},
  briar: {name:'Briar Gathering',cost:2,spawns:2,text:'Summon two 1 / 1 Briar Sprites',icon:'♣'},
  forge: {name:'Foundry Crystal',cost:2,ramp:true,text:'Increase mana capacity by 1, up to 10',icon:'◆'},
  frost: {name:'Tidebind',cost:2,freeze:true,text:'Freeze a creature through its next turn',icon:'❄'}
};

export const leaders = {
  tala:{style:'Aggression',text:'Fast creatures and Ash Surge.',capability:'Tala is a fast high-power attacker. Her deck floods early and uses Ash Surge to push damage.',strategy:'Play cheap creatures, attack often, hold 1 mana for Ash Surge. Summon Tala early to start the clock.',deck:{scout:6,wolf:5,drake:4,guard:2,spark:5,surge:6,veil:2}},
  vael:{style:'Defense',text:'Sturdy creatures, healing, and Silver Veil.',capability:'Vael is a durable wall. The deck wins by blocking, healing, and outlasting.',strategy:'Prioritize Oathkeepers and Knights. Heal below 16 life. Hold Silver Veil for key blocks.',deck:{scout:3,guard:6,knight:6,drake:2,spark:2,ward:5,veil:6}},
  neri:{style:'Spellcraft',text:'Wildfire and a mix of both reactions.',capability:'Neri is flexible midrange. Uses damage spells for tempo and reactions to swing combat.',strategy:'Wildfire for removal or chip. Keep 1–2 mana open for reactions. Play creatures to contest the board.',deck:{scout:4,guard:4,wolf:3,knight:3,spark:6,ward:2,veil:4,surge:4}},
  sylva:{style:'Swarm',text:'Fill the battlefield with small creatures. Sylva brings a Briar Sprite with her.',capability:'Sylva is a token engine. Wins by putting more bodies on the board than can be blocked.',strategy:'Play Briar Gathering and Scouts early. Attack wide. Summon Sylva to protect the free sprite.',deck:{scout:6,guard:4,wolf:4,briar:8,surge:4,veil:4}},
  orrun:{style:'Ramp',text:'Build mana with Foundry Crystals, then summon drakes and a 7 / 6 leader.',capability:'Orrun is a late-game powerhouse. Accelerates mana then drops large threats.',strategy:'Play Foundry Crystals turns 2–4. Survive early with blockers. Drop Drakes then Orrun as finisher.',deck:{scout:3,guard:4,knight:5,drake:6,forge:6,ward:3,veil:3}},
  iskar:{style:'Control',text:'Freeze opposing creatures and protect your position. Iskar draws a card when summoned.',capability:'Iskar is value control. Freezes best attackers and uses reactions to stay ahead.',strategy:'Tidebind the strongest ready creature. Hold Silver Veil. Summon Iskar to draw and stabilize.',deck:{guard:5,knight:3,wolf:3,frost:7,spark:4,veil:6,ward:2}},
  sera:{style:'Defense',text:'Holds the outer court.',capability:'Durable blockers, Dawnward, and Silver Veil keep Sera at the table.',strategy:'Keep a blocker back. Choose the Watch to endure attacks or the Witness to catch up to a wider board.',deck:{scout:4,guard:7,knight:5,drake:2,ward:5,veil:5,spark:2}},
  cass:{style:'Midrange',text:'Claims no house.',capability:'Cass can turn a small board into pressure or save mana for a larger creature.',strategy:'Start with Scouts and Oathkeepers. Choose the Road to attack early or the Hearth for Wildfire and Drakes.',deck:{scout:5,guard:5,wolf:5,knight:4,drake:3,spark:4,surge:2,ward:2}}
};

export const trees = {
  sera:{name:'Sera, Outer Keeper',branches:[
    {id:'court-watch',name:'Path of the Watch',nodes:[
      {cost:1,text:'Your first blocker each combat gains +2 HP for that combat'},
      {cost:2,text:'After you block with two or more creatures, gain 2 life'},
      {cost:3,text:'When you summon Sera, gain 3 life if an opponent has more life than you'}
    ]},
    {id:'witness',name:'Path of the Witness',nodes:[
      {cost:1,text:'Dawnward heals 6 instead of 4'},
      {cost:2,text:'At the start of your turn, draw a card if an opponent has more creatures than you'},
      {cost:3,text:'Silver Veil prevents 5 damage'}
    ]}
  ]},
  cass:{name:'Cass, Unclaimed',branches:[
    {id:'road',name:'Path of the Road',nodes:[
      {cost:1,text:'Your Cinder Scouts can attack on the turn you play them'},
      {cost:2,text:'When you attack with two or more creatures, draw a card'},
      {cost:3,text:'Cass costs 1 less to summon while you control at least two creatures'}
    ]},
    {id:'hearth',name:'Path of the Hearth',nodes:[
      {cost:1,text:'Wildfire deals 4 damage'},
      {cost:2,text:'When you play a creature with a printed cost of 5 or more, draw a card'},
      {cost:3,text:'When you summon Cass, gain 3 life'}
    ]}
  ]},
  tala: {
    name: 'Tala, Ash Rider',
    branches: [
      { id: 'rider', name: 'Path of the Rider', nodes: [
        { cost: 1, text: 'Your first attacker each turn gets +1 power' },
        { cost: 2, text: 'You can play Ash Surge before combat on your creature. It can attack this turn and gets +2 power in combat' },
        { cost: 3, text: 'When you attack with 3+ creatures, draw a card' }
      ]},
      { id: 'ash', name: 'Path of the Ash', nodes: [
        { cost: 1, text: 'Scouts cost 0 if you played a creature last turn' },
        { cost: 2, text: 'Wildfire deals 4 damage' },
        { cost: 3, text: 'Summoning Tala deals 2 damage to a chosen opponent' }
      ]}
    ]
  },
  vael: {
    name: 'Vael, Dawn Keeper',
    branches: [
      { id: 'wall', name: 'Path of the Wall', nodes: [
        { cost: 1, text: 'Your first blocker each combat gains +2 HP for that combat' },
        { cost: 2, text: 'Dawnward heals 6 instead of 4' },
        { cost: 3, text: 'Each creature you block takes 1 extra damage' }
      ]},
      { id: 'shelter', name: 'Path of Shelter', nodes: [
        { cost: 1, text: 'Silver Veil prevents 4 damage' },
        { cost: 2, text: 'At the start of your turn, if you have no creatures, gain 2 life' },
        { cost: 3, text: 'Summoning Vael also heals 3 life' }
      ]}
    ]
  },
  neri: {
    name: 'Neri, Veil Weaver',
    branches: [
      { id: 'flame', name: 'Path of Flame', nodes: [
        { cost: 1, text: 'Wildfire deals 4 damage' },
        { cost: 2, text: 'When you play a damage spell, draw a card' },
        { cost: 3, text: 'Reactions cost 1 less' }
      ]},
      { id: 'weave', name: 'Path of the Weave', nodes: [
        { cost: 1, text: 'Before combat, you may play one reaction on your creature for the next combat this turn' },
        { cost: 2, text: 'Ash Surge also draws a card' },
        { cost: 3, text: 'Summoning Neri lets you look at the top 2 cards and keep one' }
      ]}
    ]
  },
  sylva: {
    name: 'Sylva, Thorn Regent',
    branches: [
      { id: 'briar', name: 'Path of Briars', nodes: [
        { cost: 1, text: 'Briar Gathering summons three sprites instead of two' },
        { cost: 2, text: 'Sprites have +1 power' },
        { cost: 3, text: 'When a sprite dies, summon another sprite' }
      ]},
      { id: 'thorn', name: 'Path of Thorns', nodes: [
        { cost: 1, text: 'Opponents must block as many of your attackers as they can' },
        { cost: 2, text: 'When you attack with 4+ creatures, they all get +1 power' },
        { cost: 3, text: 'Summoning Sylva also freezes a target creature' }
      ]}
    ]
  },
  orrun: {
    name: 'Orrun, Forge Titan',
    branches: [
      { id: 'forge', name: 'Path of the Forge', nodes: [
        { cost: 1, text: 'Foundry Crystal gives +2 max mana instead of +1' },
        { cost: 2, text: 'Ember Drakes cost 1 less' },
        { cost: 3, text: 'When you play a creature with a printed cost of 5 or more, draw a card' }
      ]},
      { id: 'titan', name: 'Path of the Titan', nodes: [
        { cost: 1, text: 'Orrun can attack the turn you summon him' },
        { cost: 2, text: 'Your creatures have +1 HP' },
        { cost: 3, text: 'Summoning Orrun also deals 3 damage to all opposing creatures' }
      ]}
    ]
  },
  iskar: {
    name: 'Iskar, Tide Oracle',
    branches: [
      { id: 'tide', name: 'Path of the Tide', nodes: [
        { cost: 1, text: 'Tidebind freezes through two turns instead of one' },
        { cost: 2, text: 'When you freeze a creature, draw a card' },
        { cost: 3, text: 'Creatures you freeze with Tidebind take 1 damage at the start of each frozen turn' }
      ]},
      { id: 'oracle', name: 'Path of the Oracle', nodes: [
        { cost: 1, text: 'Before your turn draw, look at your top card. Keep it on top or put it on the bottom' },
        { cost: 2, text: 'Silver Veil also draws a card' },
        { cost: 3, text: 'Summoning Iskar draws two cards instead of one' }
      ]}
    ]
  }
};

export const rankedLeaders=['tala','vael','neri','sylva','orrun','iskar','sera','cass'];

export function player(name,key,leader='tala',resume,ranked=false){
  const branch=trees[leader]?.branches.find(branch=>branch.id===resume?.tree);
  const valid=branch&&Number.isInteger(resume.unlocked)&&resume.unlocked>0&&resume.unlocked<=branch.nodes.length;
  const list=leader?leaders[leader].deck:{scout:4,guard:4,wolf:4,knight:4,drake:4,spark:4,ward:4};
  const deckList=leader==='sylva'&&!ranked?{...list,briar:list.briar-2,'briar-shelter':2}:list;
  const deck=Object.entries(deckList).flatMap(([kind,count])=>Array.from({length:count},()=>({kind,id:crypto.randomUUID()})));
  for(let i=deck.length-1;i>0;i--){
    const j=crypto.getRandomValues(new Uint32Array(1))[0]%(i+1);
    [deck[i],deck[j]]=[deck[j],deck[i]];
  }
  return {name,key,leader,leaderCasts:0,life:20,mana:0,max:0,board:[],hand:deck.splice(0,5),deck,growth:valid&&Number.isInteger(resume.growth)?Math.max(0,Math.min(6,resume.growth)):0,tree:valid?branch.id:null,unlocked:valid?resume.unlocked:0,lastPlayedCreature:false};
}

export const MAX_PLAYERS = 6;
export const modes={ffa:'Free-for-all',teams:'Team PvP',coop:'Co-op vs bots'};
export const lore={
  leaders:{
    tala:'Tala rode the last evacuation road until the stones caught fire. She has never forgiven the citadel for closing its gates.',
    vael:'Vael still keeps the names of the people he promised to shelter. Each is etched inside his shield.',
    neri:'Neri remembers a third seal. The court left its name out of the ledger.',
    sylva:'Sylva planted her first briar in the ash of a burned orchard. Its roots now reach the citadel walls.',
    orrun:'Orrun cast the first Sentinel hinges. When the machines forgot whom they served, he took up his hammer again.',
    sera:'Sera never left the outer court. The Sentinels stopped asking her to move.',
    cass:'Cass came after the eclipse. Both houses asked for a name. Cass gave only one.',
    iskar:'Iskar saw the eclipse reflected in the harbor a year before it came. The tide has been late ever since.'
  },
  coop:{title:'The Watch Beneath the Ash',intro:'On the night of the eclipse, the city hid its people beneath the citadel. The Sentinels sealed the vault while the Dawnward held the refugees in enchanted sleep. A century later, the ward is failing and the watch still refuses to open the doors.'},
  accord:{title:'The Broken Accord',intro:'The doors open a crack. One Sentinel reaches for the bar. Another holds it down. Outside, a column climbs the road toward the infirmary and the archive.'},
  'missing-names':{title:'The Missing Names',intro:'On the Cinder Road, Vael hears a name he etched into his shield a century ago. The witness recognizes his voice. Before either can speak again, a Sentinel column reaches the bend.'},
  tide:{title:'The Tide That Waited',intro:'At Stillwater Harbor, Iskar can still name the boats he held the tide for. Now the Watch is approaching the customs house. The original release order lies inside, and the water is beginning to move.'},
  'open-accord':{title:'The Open Accord',intro:'At the Basalt Court, both houses have signed a new order. The Watch is still enforcing the old seal. The party must get the signed order to the court’s command bell before the gates close again.'},
  foundry:{title:'Keys to the Foundry',intro:'Orrun finds the furnace still lit. The workers kept it burning through the long Watch. Now the court has sent an officer for the keys, and a Sentinel stands in the doorway with the old order.'},
  teams:{title:'The Broken Accord',intro:'Two houses arrive to claim the keys to the dormant citadel. Sun invokes the people it once sheltered. Moon invokes the promise that its gates would never belong to one ruler.'},
  ffa:{title:'The Claimants’ Court',intro:'The citadel’s last keeper left no heir. Each leader has come to press a claim, and the basalt court will remember who stood there at dawn.'}
};
export const chapters={
  watch:{title:lore.coop.title,revision:1,next:'accord',outcomes:['ward-restored','ward-restored-loss','lantern','vault-lost']},
  accord:{title:lore.accord.title,revision:1,next:'missing-names',outcomes:['sun','moon','column','gates-fell']},
  'missing-names':{title:lore['missing-names'].title,revision:1,next:'tide',outcomes:['witnesses','testimony','detachment']},
  tide:{title:lore.tide.title,revision:1,next:'open-accord',outcomes:['causeway','tidal-stair','detachment']},
  'open-accord':{title:lore['open-accord'].title,revision:1,next:'foundry',outcomes:['direct','refuges','detachment']},
  foundry:{title:lore.foundry.title,revision:1}
};
export const escortRoutes={
  witnesses:{name:'Escort the witnesses',cost:2,steps:4,damage:1,pressure:'1 damage to every living ally'},
  testimony:{name:'Carry the testimony',cost:3,steps:3,damage:2,pressure:'2 damage to the lowest-life ally'}
};
export const harborRoutes={
  causeway:{name:'Secure the causeway',cost:2,steps:4},
  'tidal-stair':{name:'Take the tidal stair',cost:3,steps:2,lowOnly:true}
};
export const courtRoutes={
  direct:{name:'Go straight to court',cost:3,steps:2,damage:1},
  refuges:{name:'Open the refuges',cost:2,steps:3,heal:1}
};
export const orderDeliveryCost=2;
export const routesByEpisode={'missing-names':escortRoutes,tide:harborRoutes,'open-accord':courtRoutes};
export const routeGoal=(route,difficulty)=>route.steps+(difficulty==='veteran'?1:0);

export const previousChapter=episode=>episode&&Object.keys(chapters).find(id=>chapters[id].next===episode);

export const foundryRules={
  repairCost:2,
  ventCost:1,
  standard:{repairs:3,interval:3,damage:1},
  veteran:{repairs:4,interval:2,damage:2}
};
export const foundryDifficulty=difficulty=>difficulty==='veteran'?foundryRules.veteran:foundryRules.standard;

export const objectiveCost=2;
export const objectiveGoal=3;
export const leaderDamageGoal=12;
export const wardCost=2;
export const wardMarks=3;
export const watchDifficulties={
  standard:{label:'Standard',interval:4,damage:2},
  veteran:{label:'Veteran',interval:3,damage:3}
};
export const gates={
  sun:{name:'Sun Gate',cost:2,marks:4,reward:'Heal each living ally by 1'},
  moon:{name:'Moon Gate',cost:3,marks:3,reward:'Draw a card'}
};
export const gateGoal=(gate,difficulty)=>gates[gate].marks+(difficulty==='veteran'?1:0);

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
const hasNode=(p,branch,level)=>p.tree===branch&&(p.unlocked??0)>=level;
const drawCard=p=>{if(p.deck.length) p.hand.push(p.deck.shift());};
export const unitPower=(p,unit)=>cards[unit.kind].power+(unit.kind==='sprite'&&hasNode(p,'briar',2)?1:0);
const maxHp=(p,unit)=>cards[unit.kind].hp+(hasNode(p,'titan',2)?1:0);
export function cardCost(p,kind){
  const card=cards[kind];
  if(kind==='scout'&&hasNode(p,'ash',1)&&p.playedCreatureLastTurn) return 0;
  if(kind==='drake'&&hasNode(p,'forge',2)) return card.cost-1;
  if(card.reaction&&hasNode(p,'flame',3)) return card.cost-1;
  return card.cost;
}
export const leaderCost=p=>cards[p.leader].cost+p.leaderCasts-(hasNode(p,'road',3)&&p.board.length>=2?1:0);
const livingOpponents=(game,seat)=>game.players.filter((p,i)=>!p.eliminated&&!allies(game,seat,i));
const firstBlockBonus=p=>hasNode(p,'wall',1)||hasNode(p,'court-watch',1);
export const summonTarget=p=>hasNode(p,'ash',3)?'player':hasNode(p,'thorn',3)?'creature':null;
export const earlyReaction=(p,kind)=>cards[kind].reaction&&(hasNode(p,'rider',2)&&kind==='surge'||hasNode(p,'weave',1)&&!p.earlyReactionPlayed);
const shieldAmount=p=>hasNode(p,'witness',3)?5:hasNode(p,'shelter',1)?4:3;
function removeFallen(p){
  const replacements=hasNode(p,'briar',3)?p.board.filter(unit=>unit.kind==='sprite'&&unit.hp<=0).length:0;
  p.board=p.board.filter(unit=>unit.hp>0);
  summonSprites(p,replacements);
}
function finishDraw(game){
  const p=game.players[game.active];
  if(game.round===1) return;
  if(p.deck.length) drawCard(p);
  else eliminate(game,game.active,p.name+' ran out of cards.');
}
function cleanDamage(game){
  if(game.rules>=2) game.players.forEach(p=>p.board.forEach(unit=>{
    unit.hp=maxHp(p,unit);
    delete unit.earlyBoost;
    delete unit.earlyShield;
  }));
}
function endTurn(game){
  delete game.truce;
  delete game.record;
  cleanDamage(game);
  advance(game);
}

export const hasStarted = game => game.started ?? game.players.length >= 2;

function eliminate(game, seat, message){
  game.players[seat].eliminated=true;
  game.last=message;
  if(game.story && game.players[seat].bot) game.story.sentinelsFallen++;
  const remaining=game.players.flatMap((p,i)=>p.eliminated?[]:[i]);
  if(remaining.length&&remaining.every(i=>allies(game,i,remaining[0]))){
    game.winner=remaining[0];
    if(game.story&&(game.episode==='foundry'||Object.hasOwn(routesByEpisode,game.episode))) game.story.ending=game.players[game.winner].bot?'lost':'detachment';
  }
}
const firstSentinelTurn=game=>game.active===game.players.findIndex(p=>p.bot&&!p.eliminated);

function advanceWatch(game){
  const story=game.story;
  if(!story?.pulseIn||story.marks===wardMarks) return;
  if(!firstSentinelTurn(game)||--story.pulseIn>0) return;

  const {interval,damage}=watchDifficulties[game.difficulty];
  story.pulseIn=interval;
  story.lastPulse=game.round;
  for(const [seat,ally] of game.players.entries()){
    if(ally.bot||ally.eliminated) continue;
    ally.life=Math.max(0,ally.life-damage);
    if(!ally.life) eliminate(game,seat,ally.name+' fell to the Watch pulse.');
  }
}
function advanceEscortThreat(game){
  const story=game.story;
  if(game.episode!=='missing-names'||!story?.route) return;
  if(!firstSentinelTurn(game)) return;

  const stalled=story.checkedSteps===story.marks;
  story.checkedSteps=story.marks;
  if(!stalled) return;

  const living=game.players.flatMap((ally,seat)=>!ally.bot&&!ally.eliminated?[{ally,seat}]:[]);
  const targets=story.route==='testimony'?living.sort((a,b)=>a.ally.life-b.ally.life||a.seat-b.seat).slice(0,1):living;
  for(const {ally} of targets) ally.life=Math.max(0,ally.life-escortRoutes[story.route].damage);
  for(const {ally,seat} of targets){
    if(!ally.life) eliminate(game,seat,ally.name+' fell on the Cinder Road.');
  }
  story.lastPressure=game.round;
}
const highTideTurns=game=>game.difficulty==='veteran'?4:3;

function advanceTide(game){
  if(game.episode!=='tide'||!firstSentinelTurn(game)) return;
  const story=game.story;
  if(--story.tideIn>0) return;
  story.tide=story.tide==='high'?'low':'high';
  story.tideIn=story.tide==='low'?2:highTideTurns(game);
}

function advanceCourtThreat(game){
  if(game.episode!=='open-accord'||game.story?.route!=='direct'||!firstSentinelTurn(game)) return;
  const targets=game.players.flatMap((ally,seat)=>!ally.bot&&!ally.eliminated?[{ally,seat}]:[]);
  for(const {ally} of targets) ally.life=Math.max(0,ally.life-courtRoutes.direct.damage);
  for(const {ally,seat} of targets){
    if(!ally.life) eliminate(game,seat,ally.name+' fell at the Basalt Court.');
  }
}

function advanceFoundry(game){
  const story=game.story;
  if(game.episode!=='foundry'||!story||!firstSentinelTurn(game)||--story.heatIn>0) return;
  const {interval,damage}=foundryDifficulty(game.difficulty);
  story.heatIn=interval;
  if(story.vented){
    story.vented=false;
    return;
  }
  story.lastBlast=game.round;
  for(const ally of game.players){
    if(ally.bot||ally.eliminated) continue;
    ally.board.forEach(unit=>{unit.hp-=damage;});
    removeFallen(ally);
  }
}

function workFoundry(game,seat,data){
  const {story}=game;
  const p=game.players[seat];
  if(game.episode!=='foundry'||!story||p.bot) throw Error('The Foundry is unavailable.');
  const {repairs}=foundryDifficulty(game.difficulty);
  if(data.job==='keys'){
    if(story.marks<repairs) throw Error('Finish the repairs before handing over the keys.');
    if(!['workers','court'].includes(data.holder)) throw Error('Choose who will hold the keys.');
    story.ending=data.holder;
    game.winner=seat;
    game.last=p.name+' handed over the Foundry keys.';
    return;
  }
  if(data.job==='vent'){
    if(story.heatIn!==1) throw Error('Vent the furnace when the blast is due.');
    if(story.vented) throw Error('The furnace has already been vented.');
    if(p.mana<foundryRules.ventCost) throw Error('You need more mana.');
    p.mana-=foundryRules.ventCost;
    story.vented=true;
    game.last=p.name+' vented the furnace.';
    return;
  }
  if(data.job!=='repair') throw Error('Choose a Foundry action.');
  if(story.channelTurn===game.round) throw Error('You can repair once per turn.');
  if(story.marks>=repairs) throw Error('The repairs are complete.');
  if(p.mana<foundryRules.repairCost) throw Error('You need more mana.');
  const guard=p.board.find(unit=>unit.id===data.id&&unit.ready&&!unit.exhausted);
  if(!guard) throw Error('Choose a ready creature.');
  p.mana-=foundryRules.repairCost;
  guard.ready=false;
  guard.exhausted=true;
  story.channelTurn=game.round;
  story.marks++;
  game.last=story.marks===repairs?'The repairs are complete. Choose who will hold the keys.':p.name+' repaired the furnace.';
}

function beginTurn(game){
  const p=game.players[game.active];
  game.attacked=false;
  if(game.rules>=3) game.turnDeadline=Date.now()+game.turnSeconds*1000;
  p.max=Math.min(10,p.max+1+(p.keyManaBonus?1:0));
  delete p.keyManaBonus;
  p.mana=p.max;
  if(game.round%3===0){
    for(const participant of game.players){
      if(!participant.bot&&!participant.eliminated) participant.growth=(participant.growth??0)+1;
    }
  }
  p.playedCreatureLastTurn=!!p.lastPlayedCreature;
  p.lastPlayedCreature=false;
  p.earlyReactionPlayed=false;
  p.firstAttackDone = false;
  p.board.forEach(unit=>{
    unit.freezeTurn=!!unit.frozen;
    unit.ready=!unit.frozen;
    unit.exhausted=!!unit.frozen;
    if(unit.frozen){
      unit.frozen--;
      if(unit.tideDamage) unit.hp--;
      if(!unit.frozen) delete unit.tideDamage;
    }
  });
  removeFallen(p);
  advanceWatch(game);
  advanceEscortThreat(game);
  advanceTide(game);
  advanceCourtThreat(game);
  advanceFoundry(game);
  if(game.winner!==null) return;
  if(hasNode(p,'shelter',2)&&!p.board.length) p.life=Math.min(20,p.life+2);
  if(hasNode(p,'witness',2)&&livingOpponents(game,game.active).some(other=>other.board.length>p.board.length)) drawCard(p);
  if(game.round!==1&&hasNode(p,'oracle',1)&&p.deck.length) p.choice='oracle';
  else finishDraw(game);
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
const reactionEligible=p=>!p.eliminated&&p.hand.some(unit=>cards[unit.kind].reaction&&cardCost(p,unit.kind)<=p.mana);
function applyReaction(p,kind,strike){
  if(kind==='veil'){
    strike.shield+=shieldAmount(p);
    if(hasNode(p,'oracle',2)) drawCard(p);
  }else{
    strike.boost+=2;
    if(hasNode(p,'weave',2)) drawCard(p);

  }
}
function strikeDamage(attacker,defender,unit,blocker,strike,bonus){
  const power=unitPower(attacker,unit)+strike.boost+bonus+(unit.earlyBoost??0);
  delete unit.earlyBoost;
  const damage=Math.max(0,power-strike.shield-(blocker?.earlyShield??0));
  if(blocker){
    delete blocker.earlyShield;
    blocker.hp-=damage;
    unit.hp-=Math.max(0,unitPower(defender,blocker)+(hasNode(defender,'wall',3)?1:0)-(unit.earlyShield??0));
    delete unit.earlyShield;
  }
  return damage;
}

function recordLeaderDamage(game,combat,unit,damage){
  if(!game.leaderDamageEnabled||damage<=0||unit.kind!==game.players[combat.attacker].leader) return false;
  const defender=game.players[combat.defender];
  defender.leaderDamage??={};
  const entry=defender.leaderDamage[unit.id]??={attacker:combat.attacker,kind:unit.kind,damage:0};
  entry.damage+=damage;
  return entry.damage>=leaderDamageGoal;
}
function finishCombatDamage(game,combat,leaderLethal){
  const defender=game.players[combat.defender];
  if(leaderLethal||defender.life<=0){
    eliminate(game,combat.defender,defender.name+(leaderLethal?' fell to leader damage.':' was eliminated.'));
  }
}
function resolveCombat(game){
  const combat=game.combat;
  const attacker=game.players[combat.attacker], defender=game.players[combat.defender];
  const unit=attacker.board.find(unit=>unit.id===combat.unit);
  const blocker=defender.board.find(unit=>unit.id===combat.blocker);
  game.effect={type:'impact',seat:combat.defender,unit:blocker?.id};
  const bonus=hasNode(attacker,'rider',1)&&!attacker.firstAttackDone?1:0;
  attacker.firstAttackDone=true;
  const damage=strikeDamage(attacker,defender,unit,blocker,combat,bonus);
  if(blocker) blocker.hp=Math.min(blocker.hp,maxHp(defender,blocker));
  else defender.life-=damage;
  removeFallen(attacker);
  removeFallen(defender);
  game.combat=null;
  game.last=blocker?cards[blocker.kind].name+' blocked '+cards[unit.kind].name+'.':defender.name+' took '+damage+' combat damage.';
  finishCombatDamage(game,combat,!blocker&&recordLeaderDamage(game,combat,unit,damage));
}
function finishBlocking(game, id){
  const combat=game.combat;
  combat.blocker=id;
  if(id){
    const defender=game.players[combat.defender];
    const blocker=defender.board.find(unit=>unit.id===id);
    if(blocker&&firstBlockBonus(defender)) blocker.hp+=2;
  }
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
  let leaderLethal=false;
  let firstBlock=true;
  const wide=hasNode(attacker,'thorn',2)&&combat.strikes.length>=4?1:0;
  for(const strike of combat.strikes){
    const unit=attacker.board.find(unit=>unit.id===strike.unit);
    const blocker=defender.board.find(unit=>unit.id===strike.blocker);
    if(blocker&&firstBlock&&firstBlockBonus(defender)) blocker.hp+=2;
    if(blocker) firstBlock=false;
    const rider=hasNode(attacker,'rider',1)&&!attacker.firstAttackDone?1:0;
    attacker.firstAttackDone=true;
    const damage=strikeDamage(attacker,defender,unit,blocker,strike,wide+rider);
    if(blocker) blocker.hp=Math.min(blocker.hp,maxHp(defender,blocker));
    else{
      total+=damage;
      if(recordLeaderDamage(game,combat,unit,damage)) leaderLethal=true;
    }
  }
  defender.life-=total;
  if(hasNode(defender,'court-watch',2)&&combat.strikes.filter(strike=>strike.blocker).length>=2) defender.life=Math.min(20,defender.life+2);
  removeFallen(attacker);
  removeFallen(defender);
  game.combat=null;
  game.turnDeadline=Date.now()+combat.turnRemaining;
  game.effect={type:'impact',seat:combat.defender};
  game.last=defender.name+' took '+total+' combat damage.';
  finishCombatDamage(game,combat,leaderLethal);
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
    if(hasNode(game.players[combat.attacker],'thorn',1)&&used.size<Math.min(combat.strikes.length,p.board.filter(unit=>!unit.exhausted).length)) throw Error('You must block as many attackers as you can.');
    for(const block of data.blocks) combat.strikes.find(strike=>strike.unit===block.attacker).blocker=block.blocker;
    batchReactions(game);
    return;
  }
  if(!combat.queue.includes(seat)||!['react','pass'].includes(data.type)) throw Error('Your reaction opportunity is closed.');
  if(data.type==='react'){
    const strike=combat.strikes.find(strike=>strike.unit===data.strike);
    const index=p.hand.findIndex(unit=>unit.id===data.id);
    const kind=p.hand[index]?.kind;
    const card=cards[kind];
    const cost=card?cardCost(p,kind):Infinity;
    if(!strike||!card?.reaction||cost>p.mana) throw Error('Choose an attacker and an affordable reaction.');
    p.hand.splice(index,1);
    p.mana-=cost;
    applyReaction(p,kind,strike);
    game.last=p.name+' cast '+card.name+'.';
    game.effect={type:card.reaction,seat:combat.defender,unit:strike.blocker};
  }
  combat.queue=combat.queue.filter(i=>i!==seat);
  if(!combat.queue.length) resolveBatch(game);
}
function declareAttack(game,seat,opponent,ids){
  if(game.truce?.accepted&&game.truce.from===seat&&game.truce.to===opponent) throw Error('You agreed to a truce for this turn.');
  const p=game.players[seat];
  if(game.attacked||!Array.isArray(ids)||!ids.length||ids.length>p.board.length||new Set(ids).size!==ids.length) throw Error('Choose attackers for your one combat this turn.');
  const units=ids.map(id=>p.board.find(unit=>unit.id===id && unit.ready));
  if(units.some(unit=>!unit)) throw Error('Choose ready attackers.');
  for(const unit of units){unit.ready=false;unit.exhausted=true;}
  game.attacked=true;
  if(hasNode(p,'rider',3)&&ids.length>=3||hasNode(p,'road',2)&&ids.length>=2) drawCard(p);
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
    if(game.players[game.active].choice) finishChoice(game,0);
    if(game.winner===null) endTurn(game);
    return true;
  }
  if(game.combat.deadline>now) return false;
  game.effect=null;
  if(game.combat.strikes){
    if(game.combat.phase==='block'){
      if(hasNode(game.players[combat.attacker],'thorn',1)){
        const defenders=game.players[combat.defender].board.filter(unit=>!unit.exhausted);
        defenders.slice(0,combat.strikes.length).forEach((unit,i)=>{combat.strikes[i].blocker=unit.id;});
      }
      batchReactions(game);
    }
    else resolveBatch(game);
  }else if(game.combat.phase==='block'){
    const required=hasNode(game.players[combat.attacker],'thorn',1);
    const blocker=required?game.players[combat.defender].board.find(unit=>!unit.exhausted):null;
    finishBlocking(game,blocker?.id??null);
  }
  else resolveCombat(game);
  return true;
}
function respondToCombat(game,seat,data){
  const combat=game.combat;
  const p=game.players[seat];
  if(combat.phase==='block'){
    if(seat!==combat.defender || data.type!=='block') throw Error('Waiting for the defender.');
    if(data.id!=null && !p.board.some(unit=>unit.id===data.id && !unit.exhausted)) throw Error('Choose an available blocker.');
    if(!data.id&&hasNode(game.players[combat.attacker],'thorn',1)&&p.board.some(unit=>!unit.exhausted)) throw Error('You must block if you can.');
    if(data.id) game.effect={type:'shield',seat,unit:data.id};
    finishBlocking(game,data.id??null);
    return;
  }
  if(seat!==combat.queue[0] || !['react','pass'].includes(data.type)) throw Error('Wait for your reaction opportunity.');
  if(data.type==='react'){
    const index=p.hand.findIndex(unit=>unit.id===data.id);
    const kind=p.hand[index]?.kind;
    const card=cards[kind];
    const cost=card?cardCost(p,kind):Infinity;
    if(!card?.reaction || cost>p.mana) throw Error('That reaction is unavailable.');
    p.hand.splice(index,1);
    p.mana-=cost;
    applyReaction(p,kind,combat);
    game.last=p.name+' cast '+card.name+'.';
    game.effect={type:card.reaction,seat:combat.defender,unit:combat.blocker};
  }
  combat.queue.shift();
  if(!combat.queue.length) resolveCombat(game);
}
function freezeUnit(unit,turns,damaging=false){
  unit.frozen=Math.max(unit.frozen??0,turns);
  unit.ready=false;
  unit.exhausted=true;
  if(damaging) unit.tideDamage=true;
}
function finishChoice(game,choice){
  const p=game.players[game.active];
  if(![0,1].includes(choice)||choice===1&&p.choice==='weave'&&p.deck.length<2) throw Error('Choose one of the shown cards.');
  const type=p.choice;
  delete p.choice;
  if(type==='oracle'){
    if(choice===1) p.deck.push(p.deck.shift());
    finishDraw(game);
  }else p.hand.push(p.deck.splice(choice,1)[0]);
}
function summonSprites(p,count){
  let first;
  for(let i=0;i<count;i++){
    const sprite={kind:'sprite',id:crypto.randomUUID(),hp:maxHp(p,{kind:'sprite'}),ready:false};
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
    if(game.mode==='teams'&&game.teamsPolitics) game.objective={progress:[0,0],claimed:null,lastTurn:0};
    if(game.chapter){
      game.story={marks:0,sentinelsFallen:0,channelTurn:0};
      if(game.episode==='foundry') game.story.heatIn=foundryDifficulty(game.difficulty).interval;
      if(game.episode==='tide') Object.assign(game.story,{tide:'high',tideIn:highTideTurns(game)});
      if((!game.episode||game.episode==='watch')&&Object.hasOwn(watchDifficulties,game.difficulty)) game.story.pulseIn=watchDifficulties[game.difficulty].interval;
    }
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
    if(game.truce&&(game.truce.from===seat||game.truce.to===seat)) delete game.truce;
    eliminate(game,seat,p.name+' conceded.');
    if(game.winner!==null) game.combat=null;
    else if(game.active===seat) endTurn(game);
    else if(game.combat?.phase==='react'&&!game.combat.queue.length) (game.combat.strikes?resolveBatch:resolveCombat)(game);
    return;
  }
  if(data.type==='acceptTruce'||data.type==='declineTruce'){
    if(game.combat||game.truce?.to!==seat||game.truce.accepted||game.truce.from!==game.active) throw Error('No truce was offered to you.');
    const accepted=data.type==='acceptTruce';
    if(accepted) game.truce.accepted=true;
    else delete game.truce;
    game.last=p.name+(accepted?' agreed to the truce.':' declined the truce.');
    return;
  }
  if(data.type==='unlock'){
    if(seat!==game.active || game.combat) throw Error('You can only unlock on your turn outside of combat.');
    const treeData = trees[p.leader];
    if(!treeData) throw Error('No tree for this leader.');
    const branch = treeData.branches.find(b => b.id === data.branch);
    if(!branch) throw Error('Invalid branch.');
    if(p.tree && p.tree !== data.branch) throw Error('You are already on another path.');
    if(p.choice) throw Error('Finish choosing a card first.');
    const next = branch.nodes[p.unlocked??0];
    if(!next) throw Error('No more nodes on this path.');
    if((p.growth??0) < next.cost) throw Error('Not enough growth points.');
    p.growth -= next.cost;
    p.tree = data.branch;
    p.unlocked=(p.unlocked??0)+1;
    if(hasNode(p,'titan',2)&&p.unlocked===2) p.board.forEach(unit=>unit.hp++);
    game.last = p.name + ' unlocked: ' + next.text;
    return;
  }
  if(game.combat){(game.combat.strikes?batchResponse:respondToCombat)(game,seat,data);return;}
  if(seat!==game.active) throw Error('Wait for your turn.');
  if(p.choice){
    if(data.type!=='choose-card') throw Error('Finish choosing a card first.');
    finishChoice(game,data.choice);
    return;
  }
  if(data.type==='end'){
    game.last='';
    endTurn(game);
    return;
  }
  if(data.type==='proposeTruce'){
    const other=Number.isInteger(data.opponent)?game.players[data.opponent]:null;
    if(game.mode!=='teams'||!game.teamsPolitics||game.attacked||game.truceOfferedTurn===game.round||
      !other||other.eliminated||allies(game,seat,data.opponent)) throw Error('Choose an opponent for your one truce offer before combat.');
    game.truce={from:seat,to:data.opponent,accepted:false};
    game.truceOfferedTurn=game.round;
    game.last=p.name+' offered a truce to '+other.name+'.';
    return;
  }
  if(data.type==='contestObjective'){
    const objective=game.objective;
    if(!objective) throw Error('This match has no shared key.');
    if(objective.claimed!==null) throw Error('The key is already claimed.');
    if(objective.lastTurn===game.round) throw Error('You can contest the key once per turn.');
    if(p.mana<objectiveCost) throw Error('You need more mana.');
    p.mana-=objectiveCost;
    objective.lastTurn=game.round;
    objective.progress[p.team]++;
    game.last=p.name+' contested the courtyard key.';
    if(objective.progress[p.team]===objectiveGoal){
      objective.claimed=p.team;
      game.last=p.name+' claimed the courtyard key for their team.';
      for(const member of game.players){
        if(member.team===p.team&&!member.eliminated) member.keyManaBonus=true;
      }
    }
    return;
  }
  if(data.type==='foundry'){
    workFoundry(game,seat,data);
    return;
  }
  if(data.type==='escort'){
    const story=game.story;
    const route=data.route;
    const routes=Object.hasOwn(routesByEpisode,game.episode)?routesByEpisode[game.episode]:null;
    if(!routes||!story||p.bot||!Object.hasOwn(routes,route)) throw Error('That route is unavailable.');
    if(story.route&&story.route!==route) throw Error('Your party has committed to another route.');
    if(story.channelTurn===game.round) throw Error('You can advance once per turn.');
    const approach=routes[route];
    if(approach.lowOnly&&story.tide!=='low') throw Error('The tidal stair is open only at low tide.');
    const cost=story.atCourt?orderDeliveryCost:approach.cost;
    if(p.mana<cost) throw Error('You need more mana.');
    const guard=p.board.find(unit=>unit.id===data.id&&unit.ready&&!unit.exhausted);
    if(!guard) throw Error('Choose a ready creature.');
    p.mana-=cost;
    guard.ready=false;
    guard.exhausted=true;
    story.route=route;
    story.channelTurn=game.round;
    if(story.atCourt){
      story.ending=route;
      game.winner=seat;
      game.last=p.name+' delivered the replacement order.';
      return;
    }
    story.marks++;
    game.last=p.name+' advanced the party.';
    if(approach.heal){
      for(const ally of game.players){
        if(!ally.bot&&!ally.eliminated) ally.life=Math.min(20,ally.life+approach.heal);
      }
    }
    if(story.marks===routeGoal(approach,game.difficulty)){
      if(game.episode==='open-accord'){
        story.atCourt=true;
        game.last='The party reached the court. The order can be delivered on a later turn.';
      }else{
        story.ending=route;
        game.winner=seat;
      }
    }
    return;
  }
  if(data.type==='fortify'){
    const story=game.story;
    const gate=data.gate;
    if(game.episode!=='accord'||!story||p.bot||!Object.hasOwn(gates,gate)) throw Error('That gate is unavailable.');
    if(story.gate&&story.gate!==gate) throw Error('Your team has committed to the other gate.');
    if(story.channelTurn===game.round) throw Error('You can fortify once per turn.');
    if(p.mana<gates[gate].cost) throw Error('You need more mana.');
    const guard=p.board.find(unit=>unit.ready);
    if(!guard) throw Error('You need a ready creature to guard the gate.');
    p.mana-=gates[gate].cost;
    guard.ready=false;
    guard.exhausted=true;
    story.gate=gate;
    story.channelTurn=game.round;
    story.marks++;
    if(gate==='moon'){
      if(p.deck.length) p.hand.push(p.deck.shift());
    }else{
      for(const ally of game.players){
        if(!ally.bot&&!ally.eliminated) ally.life=Math.min(20,ally.life+1);
      }
    }
    game.last=p.name+' fortified the '+gates[gate].name+'.';
    if(story.marks===gateGoal(gate,game.difficulty)){
      story.gateHeld=true;
      game.winner=seat;
    }
    return;
  }
  if(data.type==='rekindle'){
    const story=game.story;
    if(!story||(game.episode&&game.episode!=='watch')||p.bot||story.marks>=wardMarks||story.channelTurn===game.round) throw Error('The ward cannot be rekindled this turn.');
    if(p.mana<wardCost) throw Error('Rekindling costs '+wardCost+' mana.');
    p.mana-=wardCost;
    story.channelTurn=game.round;
    story.marks++;
    if(story.marks===wardMarks){
      for(const ally of game.players){
        if(!ally.bot&&!ally.eliminated) ally.life=Math.min(20,ally.life+3);
      }
      game.effect={type:'heal',seat};
      game.last='The Dawnward is restored. Living allies recover up to 3 life.';
    }else game.last=p.name+' restored a mark of the Dawnward.';
    return;
  }
  const enemySeat=data.opponent??(game.players.length===2?1-seat:undefined);
  const opponent=Number.isInteger(enemySeat)&&game.players[enemySeat]&&!game.players[enemySeat].eliminated&&!allies(game,seat,enemySeat)?game.players[enemySeat]:undefined;
  const target=opponent?.board.find(unit=>unit.id===data.target);
  if(data.type==='read-record'){
    if(p.leader!=='neri'||p.recordRead||!opponent||!opponent.hand.length) throw Error('Choose an opponent holding cards. Neri can read one hand per match.');
    p.recordRead=true;
    game.record={reader:seat,opponent:enemySeat,cards:opponent.hand.map(unit=>unit.kind)};
    game.last=p.name+' read a missing name.';
    return;
  }
  if(data.type==='summon'){
    if(!p.leader||p.board.some(unit=>unit.kind===p.leader)) throw Error('Your leader is already on the battlefield or unavailable.');
    const card=cards[p.leader];
    const cost=leaderCost(p);
    if(p.mana<cost) throw Error('You need more mana.');
    if(summonTarget(p)==='player'&&!opponent) throw Error('Choose an opposing player.');
    const creaturesRemain=game.players.some((other,i)=>!other.eliminated&&!allies(game,seat,i)&&other.board.length);
    if(summonTarget(p)==='creature'&&creaturesRemain&&!target) throw Error('Choose an opposing creature.');
    p.mana-=cost;
    p.leaderCasts++;
    const unit={kind:p.leader,id:crypto.randomUUID(),hp:maxHp(p,{kind:p.leader}),ready:hasNode(p,'titan',1)};
    p.board.push(unit);
    if(card.spawns) summonSprites(p,card.spawns);
    if(card.draw){
      drawCard(p);
      if(hasNode(p,'oracle',3)) drawCard(p);
    }
    if(hasNode(p,'ash',3)){
      opponent.life-=2;
      if(opponent.life<=0) eliminate(game,enemySeat,opponent.name+' was eliminated.');
    }
    if(hasNode(p,'shelter',3)||hasNode(p,'hearth',3)||hasNode(p,'court-watch',3)&&livingOpponents(game,seat).some(other=>other.life>p.life)) p.life=Math.min(20,p.life+3);
    if(hasNode(p,'weave',3)&&p.deck.length) p.choice='weave';
    if(hasNode(p,'thorn',3)&&target) freezeUnit(target,1);
    if(hasNode(p,'titan',3)) game.players.forEach((other,i)=>{
      if(other.eliminated||allies(game,seat,i)) return;
      other.board.forEach(unit=>unit.hp-=3);
      removeFallen(other);
    });
    game.effect={type:'summon',seat,unit:unit.id};
    game.last=p.name+' summoned '+card.name+'.';
    return;
  }
  if(data.type==='attack-batch'){
    if(game.rules<3||!opponent) throw Error('Choose an opposing player.');
    declareAttack(game,seat,enemySeat,data.ids);
    return;
  }
  if(data.type==='play'){
    const index=p.hand.findIndex(unit=>unit.id===data.id);
    if(index<0) throw Error('That card is unavailable.');
    const unit=p.hand[index], card=cards[unit.kind];
    const cost=cardCost(p,unit.kind);
    if(card.reaction){
      const recipient=p.board.find(unit=>unit.id===data.target);
      if(game.attacked||!earlyReaction(p,unit.kind)||!recipient||cost>p.mana) throw Error('Choose an affordable reaction and one of your creatures before combat.');
      p.hand.splice(index,1);
      p.mana-=cost;
      p.earlyReactionPlayed=true;
      if(unit.kind==='surge'){
        recipient.earlyBoost=(recipient.earlyBoost??0)+2;
        if(hasNode(p,'rider',2)&&!recipient.exhausted&&!recipient.frozen&&!recipient.freezeTurn) recipient.ready=true;
        if(hasNode(p,'weave',2)) drawCard(p);
      }else recipient.earlyShield=(recipient.earlyShield??0)+shieldAmount(p);
      game.last=p.name+' cast '+card.name+'.';
      return;
    }
    if(cost>p.mana) throw Error('You need more mana.');
    if(card.damage && (!opponent || (data.target!=='hero' && !target))) throw Error('Choose an opposing target.');
    if(card.freeze && !target) throw Error('Choose an opposing creature to freeze.');
    p.hand.splice(index,1);
    p.mana-=cost;
    if(card.power) p.lastPlayedCreature = true;
    const sprite=card.spawns&&summonSprites(p, unit.kind==='briar' && p.tree==='briar' && p.unlocked>=1 ? 3 : card.spawns);
    if(card.ramp){
      let ramp = 1;
      if(unit.kind==='forge' && p.tree==='forge' && p.unlocked>=1) ramp = 2;
      p.max=Math.min(10,p.max+ramp);
    }
    if(card.freeze){
      freezeUnit(target,hasNode(p,'tide',1)?2:1,hasNode(p,'tide',3));
      if(hasNode(p,'tide',2)) drawCard(p);
    }
    if(card.power){
      let hp = card.hp;
      if(p.tree==='titan' && p.unlocked>=2) hp += 1;
      p.board.push({...unit,hp,ready:unit.kind==='scout'&&hasNode(p,'road',1)});
      if((hasNode(p,'forge',3)||hasNode(p,'hearth',2))&&card.cost>=5 && p.deck.length) p.hand.push(p.deck.shift());
    }
    if(card.heal){
      let heal = card.heal;
      if(unit.kind==='ward' && (hasNode(p,'wall',2)||hasNode(p,'witness',1))) heal = 6;
      p.life=Math.min(20,p.life+heal);
    }
    if(card.damage){
      let dmg = card.damage;
      if(unit.kind==='spark'&&(hasNode(p,'ash',2)||hasNode(p,'flame',1)||hasNode(p,'hearth',1))) dmg=4;
      if(hasNode(p,'flame',2)) drawCard(p);
      if(target) target.hp-=dmg;
      else opponent.life-=dmg;
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
      if(!opponent.board.some(u=>!u.exhausted)) finishBlocking(game,null);
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
  removeFallen(p);
  if(opponent) removeFallen(opponent);
  if(opponent&&opponent.life<=0) eliminate(game,enemySeat,opponent.name+' was eliminated.');
}

export function playBots(game){
  let changed=false;
  for(let i=0;i<20&&game.winner===null&&game.started;i++){
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
function tableThreat(game){
  if(!hasStarted(game)||game.winner!==null||!['ffa','teams'].includes(game.mode)) return undefined;
  const ranked=game.players.map((p,i)=>({p,i})).filter(({p})=>!p.eliminated)
    .sort((a,b)=>b.p.board.length-a.p.board.length||b.p.life-a.p.life);
  const [first,second]=ranked;
  if(first&&(!second||first.p.board.length!==second.p.board.length||first.p.life!==second.p.life)) return first.i;
}

function chapterOutcome(game){
  if(game.winner==null||!game.chapter||!game.story) return undefined;
  const lost=game.players[game.winner].bot;
  if(game.episode==='accord') return lost?'gates-fell':game.story.gateHeld?game.story.gate:'column';
  if(game.episode==='foundry'||Object.hasOwn(routesByEpisode,game.episode)) return game.story.ending;
  return game.story.marks===wardMarks?(lost?'ward-restored-loss':'ward-restored'):(lost?'vault-lost':'lantern');
}

export function view(game, seat, revision){
  const combat=game.combat;
  const visibleCombat=combat&&{id:combat.id,strikes:combat.strikes,attacker:combat.attacker,defender:combat.defender,unit:combat.unit,blocker:combat.blocker,
    phase:combat.phase,deadline:combat.deadline,pendingReactions:combat.phase==='react'?[...combat.queue]:undefined,canReact:combat.strikes?combat.queue?.includes(seat):combat.queue?.[0]===seat,boost:combat.boost,shield:combat.shield};
  return {revision,seat,ranked:game.ranked,teamsPolitics:game.teamsPolitics,privateTable:game.privateTable,leaderDamageEnabled:game.leaderDamageEnabled,
    threat:tableThreat(game),objective:game.objective,truce:game.truce,truceOfferedTurn:game.truceOfferedTurn,chapter:game.chapter,
    episode:game.episode,chapterRevision:game.chapterRevision,difficulty:game.difficulty,priorOutcome:game.priorOutcome,chapterOutcome:chapterOutcome(game),
    record:game.record?.reader===seat?game.record:undefined,story:game.story,mode:game.mode,botCount:game.botCount,turnDeadline:game.turnDeadline,turnSeconds:game.turnSeconds,attacked:game.attacked,readyToStart:readyToStart(game),humanLimit:humanLimit(game),rules:game.rules,combat:visibleCombat,effect:game.effect,started:hasStarted(game),active:game.active,round:game.round,winner:game.winner,last:game.last,
    players:game.players.map((p,i)=>({name:p.name,team:p.team,bot:p.bot,redrawn:p.redrawn,life:p.life,leaderDamage:game.leaderDamageEnabled?Object.values(p.leaderDamage??{}):undefined,mana:p.mana,max:p.max,leader:p.leader,leaderCost:p.leader?leaderCost(p):undefined,eliminated:!!p.eliminated,board:p.board,
      hand:i===seat?p.hand:undefined,choice:i===seat&&p.choice?{type:p.choice,cards:p.deck.slice(0,p.choice==='oracle'?1:2)}:undefined,handSize:p.hand.length,deckSize:p.deck.length,growth:p.growth||0,tree:p.tree,playedCreatureLastTurn:p.playedCreatureLastTurn,earlyReactionPlayed:p.earlyReactionPlayed,recordRead:i===seat?p.recordRead:undefined,unlocked:p.unlocked||0}))};
}
