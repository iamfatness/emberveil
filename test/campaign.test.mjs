import assert from 'node:assert/strict';
import test from 'node:test';
import { act, expireCombat, player, view } from '../src/game.mjs';

function chapter(difficulty, episode, priorOutcome, foundryKeyholder) {
  const game = {
    chapter: true, episode, priorOutcome, foundryKeyholder, difficulty, mode: 'coop', botCount: 1, rules: 3,
    started: false, active: 0, round: 1, turnSeconds: 90, winner: null,
    players: [{ ...player('Rescuer', 'test'), team: 0 }],
  };
  act(game, 0, { type: 'start' });
  if(episode==='accord') game.players[0].board.push({kind:'scout',id:'gate-guard',hp:1,ready:true});
  return game;
}

function endTurn(game) {
  act(game, game.active, { type: 'end' });
}

test('the standard Watch warns players four Sentinel turns before dealing two damage', () => {
  const game = chapter('standard');
  assert.equal(view(game, 0, 0).story.pulseIn, 4);
  for (let i = 0; i < 3; i++) {
    endTurn(game);
    assert.equal(game.players[0].life, 20);
    endTurn(game);
  }
  assert.equal(game.story.pulseIn, 1);
  endTurn(game);
  assert.equal(game.players[0].life, 18);
  assert.equal(game.story.pulseIn, 4);
});

test('veteran pressure arrives sooner and can end the match', () => {
  const game = chapter('veteran');
  assert.equal(game.story.pulseIn, 3);
  for (let i = 0; i < 2; i++) {
    endTurn(game);
    endTurn(game);
  }
  game.players[0].life = 3;
  endTurn(game);
  assert.equal(game.players[0].eliminated, true);
  assert.equal(game.winner, 1);
});

test('restoring the third mark heals allies and stops future pulses', () => {
  const game = chapter('standard');
  endTurn(game);
  endTurn(game);
  for (let i = 0; i < 2; i++) {
    act(game, 0, { type: 'rekindle' });
    assert.throws(() => act(game, 0, { type: 'rekindle' }), /cannot be rekindled/);
    endTurn(game);
    endTurn(game);
  }
  game.players[0].life = 15;
  act(game, 0, { type: 'rekindle' });
  endTurn(game);
  assert.equal(game.players[0].life, 18);
  assert.equal(game.story.lastPulse, undefined);
});

test('an older chapter stays playable without a pulse countdown', () => {
  const game = chapter(undefined);
  for (let i = 0; i < 5; i++) {
    endTurn(game);
    endTurn(game);
  }
  assert.equal(game.story.pulseIn, undefined);
  assert.equal(game.players[0].life, 20);
});

test('the Accord commits the team to one gate and rewards holding it', () => {
  const game = chapter('standard', 'accord');
  endTurn(game);
  endTurn(game);
  game.players[0].life = 15;
  act(game, 0, { type: 'fortify', gate: 'sun' });
  assert.equal(game.players[0].life, 16);
  assert.equal(game.story.gate, 'sun');
  assert.equal(game.players[0].board[0].exhausted, true);
  assert.throws(() => act(game, 0, { type: 'fortify', gate: 'moon' }), /committed/);
  assert.throws(() => act(game, 0, { type: 'rekindle' }), /cannot be rekindled/);
  for (let i = 0; i < 3; i++) {
    endTurn(game);
    endTurn(game);
    act(game, 0, { type: 'fortify', gate: 'sun' });
  }
  assert.equal(game.winner, 0);
  assert.equal(game.story.gateHeld, true);
});

test('Veteran Moon Gate requires four marks and refills the fortifier’s hand', () => {
  const game = chapter('veteran', 'accord');
  assert.equal(game.story.pulseIn, undefined);
  assert.throws(() => act(game, 0, { type: 'fortify', gate: 'moon' }), /mana/);
  assert.equal(game.story.gate, undefined);
  for (let i = 0; i < 2; i++) {
    endTurn(game);
    endTurn(game);
  }
  const handSize = game.players[0].hand.length;
  act(game, 0, { type: 'fortify', gate: 'moon' });
  assert.equal(game.players[0].hand.length, handSize + 1);
  assert.throws(() => act(game, 0, { type: 'fortify', gate: 'moon' }), /once per turn/);
  for (let i = 0; i < 2; i++) {
    endTurn(game);
    endTurn(game);
    act(game, 0, { type: 'fortify', gate: 'moon' });
  }
  assert.equal(game.winner, null);
  endTurn(game);
  endTurn(game);
  act(game, 0, { type: 'fortify', gate: 'moon' });
  assert.equal(game.winner, 0);
});

test('witnesses commit the party, exhaust the selected guard and take damage only after a stall', () => {
  const game = chapter('standard', 'missing-names');
  const rescuer = game.players[0];
  rescuer.board.push({kind:'scout',id:'first',hp:1}, {kind:'guard',id:'chosen',hp:3});
  endTurn(game);
  endTurn(game);
  const escort={type:'escort',route:'witnesses',id:'chosen'};
  assert.throws(() => act(game,0,{...escort,id:'invalid'}), /ready creature/);
  assert.equal(rescuer.mana,2);
  assert.equal(game.story.route,undefined);
  act(game,0,escort);
  assert.equal(rescuer.board[0].ready,true);
  assert.equal(rescuer.board[1].exhausted,true);
  assert.throws(() => act(game,0,escort), /once per turn/);
  endTurn(game);
  assert.equal(rescuer.life,20);
  endTurn(game);
  assert.throws(() => act(game,0,{...escort,route:'testimony'}), /committed/);
  endTurn(game);
  assert.equal(rescuer.life,19);
  endTurn(game);
  for(let i=0;i<3;i++){
    act(game,0,escort);
    if(i<2){endTurn(game);endTurn(game);}
  }
  assert.equal(game.story.ending,'witnesses');
  assert.equal(game.winner,0);
  assert.equal(rescuer.life,19);
});

test('testimony pressure hits the lowest-life ally and Veteran takes a fourth step', () => {
  const game = chapter('veteran', 'missing-names');
  game.players.splice(1,0,{...player('Second','second'),team:0,life:12});
  game.players[0].board.push({kind:'scout',id:'guard',hp:1});
  const cycle=()=>{endTurn(game);endTurn(game);endTurn(game);};
  cycle();
  cycle();
  const escort={type:'escort',route:'testimony',id:'guard'};
  act(game,0,escort);
  cycle();
  cycle();
  assert.equal(game.players[1].life,10);
  assert.equal(game.players[0].life,20);
  act(game,0,escort);
  cycle();
  act(game,0,escort);
  assert.equal(game.winner,null);
  cycle();
  act(game,0,escort);
  assert.equal(game.winner,0);
  assert.equal(game.story.ending,'testimony');
});

test('the harbor exposes the tidal route only during the announced low tide', () => {
  const game=chapter('standard','tide');
  const rescuer=game.players[0];
  rescuer.board.push({kind:'guard',id:'harbor-guard',hp:3});
  const cross={type:'escort',route:'tidal-stair',id:'harbor-guard'};
  const cycle=()=>{endTurn(game);endTurn(game);};
  assert.equal(game.story.tide,'high');
  assert.equal(game.story.tideIn,3);
  assert.throws(() => act(game,0,cross), /low tide/);
  cycle();
  cycle();
  cycle();
  assert.equal(game.story.tide,'low');
  assert.equal(game.story.tideIn,2);
  act(game,0,cross);
  assert.equal(game.story.marks,1);
  cycle();
  cycle();
  assert.equal(game.story.tide,'high');
  assert.equal(game.story.marks,1);
  assert.throws(() => act(game,0,cross), /low tide/);
  assert.throws(() => act(game,0,{...cross,route:'causeway'}), /committed/);
  cycle();
  cycle();
  cycle();
  act(game,0,cross);
  assert.equal(game.winner,0);
  assert.equal(view(game,0,0).story.ending,'tidal-stair');
});

test('the causeway can be secured while the tide changes', () => {
  const game=chapter('veteran','tide');
  game.players[0].board.push({kind:'guard',id:'guard',hp:3});
  const cycle=()=>{endTurn(game);endTurn(game);};
  cycle();
  for(let i=0;i<5;i++){
    act(game,0,{type:'escort',route:'causeway',id:'guard'});
    if(i<4){assert.equal(game.winner,null);cycle();}
  }
  assert.equal(game.winner,0);
  assert.equal(game.story.ending,'causeway');
});

test('the direct route takes Watch damage and requires a separate turn to deliver the order', () => {
  const game=chapter('standard','open-accord');
  const rescuer=game.players[0];
  rescuer.board.push({kind:'guard',id:'court-guard',hp:3}, {kind:'scout',id:'spare',hp:1});
  const cycle=()=>{endTurn(game);endTurn(game);};
  cycle();
  cycle();
  const move={type:'escort',route:'direct',id:'court-guard'};
  act(game,0,move);
  cycle();
  assert.equal(rescuer.life,19);
  act(game,0,move);
  assert.equal(game.story.atCourt,true);
  assert.equal(game.winner,null);
  assert.throws(() => act(game,0,{...move,id:'spare'}), /once per turn/);
  cycle();
  assert.equal(rescuer.life,18);
  const mana=rescuer.mana;
  act(game,0,move);
  assert.equal(rescuer.mana,mana-2);
  assert.equal(game.story.ending,'direct');
  assert.equal(game.winner,0);
});

test('Veteran refuge route heals the party and takes four advances before delivery', () => {
  const game=chapter('veteran','open-accord');
  const rescuer=game.players[0];
  rescuer.board.push({kind:'guard',id:'refuge-guard',hp:3});
  rescuer.life=12;
  const cycle=()=>{endTurn(game);endTurn(game);};
  const move={type:'escort',route:'refuges',id:'refuge-guard'};
  cycle();
  for(let i=0;i<4;i++){
    act(game,0,move);
    assert.equal(rescuer.life,13+i);
    assert.equal(Boolean(game.story.atCourt),i===3);
    assert.equal(game.winner,null);
    cycle();
  }
  assert.equal(rescuer.life,16);
  act(game,0,move);
  assert.equal(game.story.ending,'refuges');
  assert.equal(game.winner,0);
  assert.equal(rescuer.life,16);
});

test('a warned furnace blast can be vented once for the whole party',()=>{
  const game=chapter('standard','foundry');
  const party=game.players[0];
  party.board=[{kind:'scout',id:'guard',hp:1}];
  const cycle=()=>{endTurn(game);endTurn(game);};
  assert.equal(game.story.heatIn,3);
  cycle();cycle();
  assert.equal(game.story.heatIn,1);
  act(game,0,{type:'foundry',job:'vent'});
  assert.equal(party.mana,2);
  assert.throws(()=>act(game,0,{type:'foundry',job:'vent'}),/already been vented/);
  cycle();
  assert.equal(party.board.length,1);
  assert.equal(game.story.heatIn,3);
  assert.equal(game.story.vented,false);
  cycle();cycle();endTurn(game);
  assert.equal(party.board.length,0);
});

test('repairing the Foundry requires a chosen ready creature and a decision about the keys',()=>{
  const game=chapter('standard','foundry');
  const party=game.players[0];
  party.board=[{kind:'guard',id:'helper',hp:3}];
  const cycle=()=>{endTurn(game);endTurn(game);};
  cycle();
  assert.throws(()=>act(game,0,{type:'foundry',job:'keys',holder:'workers'}),/Finish the repairs/);
  assert.throws(()=>act(game,0,{type:'foundry',job:'repair',id:'unknown'}),/ready creature/);
  assert.equal(party.mana,2);
  for(let i=0;i<3;i++){
    act(game,0,{type:'foundry',job:'repair',id:'helper'});
    assert.equal(party.board[0].exhausted,true);
    assert.throws(()=>act(game,0,{type:'foundry',job:'repair',id:'helper'}),/once per turn/);
    if(i<2) cycle();
  }
  assert.equal(game.winner,null);
  act(game,0,{type:'foundry',job:'keys',holder:'workers'});
  assert.equal(game.winner,0);
  assert.equal(view(game,0,0).chapterOutcome,'workers');
});

test('Veteran heats faster and the court can hold the keys after the fourth repair',()=>{
  const game=chapter('veteran','foundry');
  assert.equal(game.story.heatIn,2);
  game.players[0].board=[{kind:'guard',id:'helper',hp:3}];
  const cycle=()=>{endTurn(game);endTurn(game);};
  cycle();
  for(let i=0;i<4;i++){
    act(game,0,{type:'foundry',job:'repair',id:'helper'});
    if(i<3){
      assert.throws(()=>act(game,0,{type:'foundry',job:'keys',holder:'court'}),/Finish the repairs/);
      cycle();
    }
  }
  act(game,0,{type:'foundry',job:'keys',holder:'court'});
  assert.equal(view(game,0,0).chapterOutcome,'court');
});

test('the Orchard starts with different help depending on who holds the Foundry keys',()=>{
  const workers=chapter('standard','orchard','workers');
  const court=chapter('standard','orchard','court');
  const neutral=chapter('standard','orchard');
  assert.equal(workers.story.plots.shelter,1);
  assert.equal(workers.story.patrolIn,2);
  assert.equal(court.story.plots.shelter,0);
  assert.equal(court.story.patrolIn,3);
  assert.equal(neutral.story.plots.shelter,0);
  assert.equal(neutral.story.patrolIn,2);
  assert.equal(view(court,0,0).priorOutcome,'court');
});

test('tending protects a bed through one sweep and a later sweep can undo a step',()=>{
  const game=chapter('veteran','orchard','workers');
  const p=game.players[0];
  p.board=[{kind:'guard',id:'tender',hp:3}];
  const cycle=()=>{endTurn(game);endTurn(game);};
  assert.equal(game.story.patrol,'terraces');
  cycle();
  assert.equal(game.story.patrol,'shelter');
  act(game,0,{type:'tend',plot:'shelter',id:'tender'});
  assert.equal(p.mana,0);
  assert.equal(p.board[0].exhausted,true);
  cycle();
  assert.equal(game.story.plots.shelter,2);
  assert.equal(game.story.patrol,'terraces');
  cycle();cycle();
  assert.equal(game.story.plots.shelter,1);
  assert.equal(game.story.lastSweep.plot,'shelter');
  assert.equal(game.story.lastSweep.protected,false);
});

test('both Orchard beds must reach their goals and only one can be tended each turn',()=>{
  const game=chapter('standard','orchard','workers');
  const p=game.players[0];
  p.board=[{kind:'guard',id:'tender',hp:3},{kind:'guard',id:'spare',hp:3}];
  const cycle=()=>{endTurn(game);endTurn(game);};
  const tend=plot=>act(game,0,{type:'tend',plot,id:'tender'});
  assert.throws(()=>tend('terraces'),/more mana/);
  cycle();
  assert.throws(()=>act(game,0,{type:'tend',plot:'terraces',id:'invalid'}),/ready creature/);
  tend('terraces');
  assert.throws(()=>act(game,0,{type:'tend',plot:'shelter',id:'spare'}),/once per turn/);
  cycle();
  tend('terraces');
  assert.equal(game.winner,null);
  cycle();
  tend('shelter');
  assert.equal(view(game,0,0).chapterOutcome,'orchard-held');
  assert.equal(game.winner,0);
});

test('the Third Seal applies the Foundry help and Orchard lead independently',()=>{
  const workers=chapter('standard','third-seal','orchard-held','workers');
  const court=chapter('standard','third-seal','orchard-held','court');
  assert.equal(workers.story.archiveIn,5);
  assert.equal(court.story.archiveIn,6);
  assert.equal(view(court,0,0).foundryKeyholder,'court');
  workers.players[0].board=[{kind:'guard',id:'escort',hp:3,ready:true}];
  act(workers,0,{type:'present-evidence',route:'ledger',id:'escort'});
  assert.equal(workers.players[0].mana,0);
  assert.equal(workers.story.marks,1);
  court.players[0].board=[{kind:'guard',id:'escort',hp:3}];
  for(let i=0;i<2;i++){endTurn(court);endTurn(court);}
  act(court,0,{type:'present-evidence',route:'witness',id:'escort'});
  assert.equal(court.story.marks,2);
  endTurn(court);endTurn(court);
  act(court,0,{type:'present-evidence',route:'witness',id:'escort'});
  assert.equal(view(court,0,0).chapterOutcome,'witness');
});

test('the archive closes on time and an incomplete copy gives way to the witness route',()=>{
  const game=chapter('veteran','third-seal','orchard-held');
  const p=game.players[0];
  p.board=[{kind:'guard',id:'escort',hp:3}];
  const cycle=()=>{endTurn(game);endTurn(game);};
  cycle();
  act(game,0,{type:'present-evidence',route:'ledger',id:'escort'});
  assert.throws(()=>act(game,0,{type:'present-evidence',route:'witness',id:'escort'}),/committed/);
  for(let i=0;i<4;i++) cycle();
  assert.equal(game.story.archiveIn,0);
  assert.equal(game.story.route,undefined);
  assert.equal(game.story.marks,0);
  assert.equal(game.story.incompleteLedger,true);
  assert.throws(()=>act(game,0,{type:'present-evidence',route:'ledger',id:'escort'}),/archive is closed/);
  for(let i=0;i<3;i++){
    act(game,0,{type:'present-evidence',route:'witness',id:'escort'});
    if(i<2) cycle();
  }
  assert.equal(game.winner,0);
  assert.equal(view(game,0,0).chapterOutcome,'witness');
});

test('the ledger route can win before the bell and keeps the written evidence as its outcome',()=>{
  const game=chapter('standard','third-seal','detachment');
  game.players[0].board=[{kind:'guard',id:'escort',hp:3}];
  const cycle=()=>{endTurn(game);endTurn(game);};
  cycle();
  for(let i=0;i<3;i++){
    act(game,0,{type:'present-evidence',route:'ledger',id:'escort'});
    if(i<2) cycle();
  }
  assert.equal(game.winner,0);
  assert.equal(view(game,0,0).chapterOutcome,'ledger');
});

test('the Ash Register starts with the page supported by the Third Seal evidence',()=>{
  for(const [priorOutcome,pages] of [
    ['ledger',{orders:1,shelter:0}],
    ['witness',{orders:0,shelter:1}],
    ['detachment',{orders:0,shelter:0}],
    [undefined,{orders:0,shelter:0}]
  ]){
    const game=chapter('standard','ash-register',priorOutcome);
    assert.deepEqual(view(game,0,0).story.pages,pages);
    assert.equal(game.players[0].life,20);
    assert.equal(game.players[0].hand.length,5);
  }
});

test('recording orders draws a card and recording shelter names restores life',()=>{
  const game=chapter('standard','ash-register','ledger');
  const ally=game.players[0];
  ally.board=[{kind:'guard',id:'scribe',hp:3}];
  endTurn(game);
  endTurn(game);
  ally.life=17;
  const hand=ally.hand.length;
  const orders={type:'record-page',page:'orders',id:'scribe'};
  const shelter={type:'record-page',page:'shelter',id:'scribe'};
  const custody={type:'place-register',keeper:'court-record'};
  assert.throws(()=>act(game,0,custody),/complete both records/i);
  assert.throws(()=>act(game,0,{...orders,id:'missing'}),/ready creature/i);
  assert.equal(ally.mana,2);
  act(game,0,orders);
  assert.equal(ally.mana,0);
  assert.equal(ally.board[0].exhausted,true);
  assert.equal(ally.hand.length,hand+1);
  assert.equal(ally.life,17);
  assert.throws(()=>act(game,0,shelter),/one page per turn/i);
  endTurn(game);
  endTurn(game);
  assert.throws(()=>act(game,0,orders),/already complete/i);
  act(game,0,shelter);
  assert.equal(ally.life,19);
  endTurn(game);
  endTurn(game);
  act(game,0,shelter);
  assert.equal(ally.life,20);
  assert.equal(game.winner,null);
  assert.throws(()=>act(game,0,{...custody,keeper:'sentinels'}),/choose/i);
  act(game,0,custody);
  assert.equal(game.winner,0);
  assert.equal(view(game,0,0).chapterOutcome,'court-record');
});

test('Veteran needs three pages in each record and can leave copies with the shelters',()=>{
  const game=chapter('veteran','ash-register','witness');
  const ally=game.players[0];
  ally.board=[{kind:'guard',id:'scribe',hp:3}];
  const custody={type:'place-register',keeper:'shelter-copies'};
  for(const page of ['orders','shelter','orders','shelter','orders']){
    endTurn(game);
    endTurn(game);
    act(game,0,{type:'record-page',page,id:'scribe'});
    if(game.story.pages.orders<3) assert.throws(()=>act(game,0,custody),/complete both records/i);
  }
  assert.equal(game.winner,null);
  act(game,0,custody);
  assert.equal(view(game,0,0).chapterOutcome,'shelter-copies');
});

test('winning by combat leaves an unfinished register and conceding loses it',()=>{
  const won=chapter('standard','ash-register','witness');
  act(won,1,{type:'concede'});
  assert.equal(view(won,0,0).chapterOutcome,'detachment');
  const lost=chapter('standard','ash-register','ledger');
  act(lost,0,{type:'concede'});
  assert.equal(view(lost,0,0).chapterOutcome,'lost');
});

test('the public reading commits mana and a creature on each turn, then wins',()=>{
  const game=chapter('standard','doors-at-dawn','court-record');
  const ally=game.players[0];
  const read={type:'read-names',id:'reader'};
  ally.board=[{kind:'guard',id:'reader',hp:3,ready:true}];
  assert.equal(game.story.route,'court');
  assert.equal(game.story.hearingIn,6);
  assert.throws(()=>act(game,0,read),/more mana/);
  for(let pages=1;pages<=3;pages++){
    endTurn(game);
    endTurn(game);
    act(game,0,read);
    assert.equal(game.story.marks,pages);
    assert.equal(ally.mana,ally.max-2);
    assert.equal(ally.board[0].exhausted,true);
    if(pages===1) assert.throws(()=>act(game,0,read),/once per turn/);
  }
  assert.equal(view(game,0,0).chapterOutcome,'names-read');
});

test('the hearing clock runs once per Watch round and closure leaves combat available',()=>{
  const game=chapter('veteran','doors-at-dawn','detachment');
  game.players.push({...player('Second Sentinel',null,'orrun'),bot:true,team:1});
  const read={type:'read-names',id:'reader'};
  game.players[0].board=[{kind:'guard',id:'reader',hp:3}];
  for(let remaining=5;remaining>=0;remaining--){
    endTurn(game);
    assert.equal(game.story.hearingIn,remaining);
    endTurn(game);
    assert.equal(game.story.hearingIn,remaining);
    endTurn(game);
  }
  assert.equal(game.winner,null);
  assert.throws(()=>act(game,0,read),/hearing is closed/);
  act(game,1,{type:'concede'});
  act(game,2,{type:'concede'});
  assert.equal(view(game,0,0).chapterOutcome,'detachment');
});

test('shelter copies advance once per combat turn and only after positive direct damage',()=>{
  const game=chapter('veteran','doors-at-dawn','shelter-copies');
  const [ally,sentinel]=game.players;
  const attack={type:'attack-batch',opponent:1,ids:['first','second']};
  assert.equal(game.story.route,'shelters');
  assert.equal(game.story.hearingIn,undefined);
  assert.throws(()=>act(game,0,{type:'read-names'}),/unavailable/);
  ally.board=[{kind:'guard',id:'first',hp:3,ready:true},{kind:'guard',id:'second',hp:3,ready:true}];
  sentinel.board=[{kind:'guard',id:'blocker',hp:3,ready:true}];
  ally.hand=[{kind:'veil',id:'cover'}];
  act(game,0,attack);
  act(game,1,{type:'blocks',blocks:[{attacker:'first',blocker:'blocker'}]});
  act(game,0,{type:'react',id:'cover',strike:'second'});
  assert.equal(game.story.marks,0);
  assert.equal(sentinel.life,20);

  sentinel.board=[];
  for(let copies=1;copies<=4;copies++){
    endTurn(game);
    endTurn(game);
    ally.hand=[];
    act(game,0,attack);
    assert.equal(game.story.marks,copies);
    if(copies===3) assert.equal(game.winner,null);
  }
  assert.equal(view(game,0,0).chapterOutcome,'copies-read');
});

test('finishing the last shelter reading with a lethal attack keeps the story ending',()=>{
  const game=chapter('standard','doors-at-dawn','shelter-copies');
  const [ally,sentinel]=game.players;
  const attack={type:'attack-batch',opponent:1,ids:['reader']};
  ally.board=[{kind:'guard',id:'reader',hp:3,ready:true}];
  sentinel.life=6;
  for(let hit=0;hit<3;hit++){
    ally.hand=[];
    act(game,0,attack);
    if(hit===2) break;
    endTurn(game);
    endTurn(game);
  }
  assert.equal(sentinel.eliminated,true);
  assert.equal(view(game,0,0).chapterOutcome,'copies-read');
});

test('court readers send a brace that holds the grate open across Watch turns',()=>{
  const game=chapter('standard','lower-stair','names-read');
  const ally=game.players[0];
  const lift={type:'lift-grate',id:'guard'};
  const guide={type:'guide-family',id:'guard'};
  ally.board=[{kind:'guard',id:'guard',hp:3}];
  assert.equal(game.story.marks,0);
  assert.equal(game.story.grateBraced,true);
  assert.throws(()=>act(game,0,guide),/lift the grate/i);
  for(let families=1;families<=3;families++){
    endTurn(game);
    endTurn(game);
    const beforeLift=ally.mana;
    act(game,0,lift);
    assert.equal(ally.mana,beforeLift-2);
    assert.equal(ally.board[0].exhausted,true);
    assert.throws(()=>act(game,0,lift),/already open/i);
    endTurn(game);
    assert.equal(game.story.grateOpen,true);
    endTurn(game);
    const beforeGuide=ally.mana;
    act(game,0,guide);
    assert.equal(ally.mana,beforeGuide-1);
    assert.equal(game.story.grateOpen,false);
    assert.equal(game.story.marks,families);
    if(families===1) assert.throws(()=>act(game,0,guide),/one family per turn/i);
  }
  assert.equal(view(game,0,0).chapterOutcome,'families-safe');
});

test('shelter guides rescue the first family and the unbraced grate drops at the next Watch turn',()=>{
  const game=chapter('veteran','lower-stair','copies-read');
  const ally=game.players[0];
  const lift={type:'lift-grate',id:'lifter'};
  const guide={type:'guide-family',id:'guide'};
  assert.equal(game.story.marks,1);
  assert.equal(game.story.grateBraced,false);
  ally.board=[{kind:'guard',id:'lifter',hp:3},{kind:'guard',id:'guide',hp:3}];
  endTurn(game);
  endTurn(game);
  act(game,0,lift);
  endTurn(game);
  assert.equal(game.story.grateOpen,false);
  assert.equal(game.story.marks,1);
  endTurn(game);
  for(let families=2;families<=4;families++){
    act(game,0,lift);
    assert.throws(()=>act(game,0,{...guide,id:'lifter'}),/ready creature/i);
    act(game,0,guide);
    assert.equal(game.story.marks,families);
    if(families<4){
      assert.equal(game.winner,null);
      endTurn(game);
      endTurn(game);
    }
  }
  assert.equal(view(game,0,0).chapterOutcome,'families-safe');
});

test('two allies can split the work before the Watch and spectators preserve the outcome',()=>{
  const game=chapter('standard','lower-stair','detachment');
  game.players.splice(1,0,{...player('Second ally','ally'),team:0});
  const [host,ally]=game.players;
  const lift={type:'lift-grate',id:'lifter'};
  const guide={type:'guide-family',id:'guide'};
  host.board=[{kind:'guard',id:'lifter',hp:3}];
  ally.board=[{kind:'guard',id:'guide',hp:3}];
  assert.equal(game.story.marks,0);
  assert.equal(game.story.grateBraced,false);
  endTurn(game);
  endTurn(game);
  endTurn(game);
  for(let families=1;families<=3;families++){
    act(game,0,lift);
    assert.throws(()=>act(game,1,guide),/wait for your turn/i);
    endTurn(game);
    assert.equal(game.story.grateOpen,true);
    act(game,1,guide);
    assert.equal(game.story.marks,families);
    if(families<3){
      endTurn(game);
      endTurn(game);
    }
  }
  assert.equal(game.winner,1);
  assert.equal(view(game,-1,0).chapterOutcome,'families-safe');
});

test('the stair battle retains the ordinary combat win and loss endings',()=>{
  const won=chapter('standard','lower-stair','copies-read');
  act(won,1,{type:'concede'});
  assert.equal(view(won,0,0).chapterOutcome,'detachment');
  const lost=chapter('standard','lower-stair','names-read');
  act(lost,0,{type:'concede'});
  assert.equal(view(lost,0,0).chapterOutcome,'lost');
});

test('rescued families need three Sentinel attacks blocked without direct combat damage',()=>{
  const game=chapter('standard','landing-bell','families-safe');
  const [ally,sentinel]=game.players;
  assert.equal(game.story.route,'hold');
  assert.throws(()=>act(game,0,{type:'haul-lift',steps:1}),/unavailable/);
  function attack(two=true){
    ally.board=[{kind:'guard',id:'blocker',hp:3}];
    sentinel.board=[{kind:'scout',id:'one',hp:1},{kind:'scout',id:'two',hp:1}];
    endTurn(game);
    act(game,1,{type:'attack-batch',opponent:0,ids:two?['one','two']:['one']});
  }
  const oneBlock=[{attacker:'one',blocker:'blocker'}];

  ally.hand=[];
  attack();
  act(game,0,{type:'blocks',blocks:oneBlock});
  assert.equal(ally.life,18);
  assert.equal(game.story.marks,0);
  endTurn(game);

  ally.hand=[{kind:'veil',id:'veil'}];
  attack(false);
  act(game,0,{type:'blocks',blocks:[]});
  act(game,0,{type:'react',id:'veil',strike:'one'});
  assert.equal(ally.life,18);
  assert.equal(game.story.marks,0);
  endTurn(game);

  for(let holds=1;holds<=3;holds++){
    ally.hand=[{kind:'veil',id:'veil'}];
    attack();
    act(game,0,{type:'blocks',blocks:oneBlock});
    assert.equal(game.story.marks,holds-1);
    act(game,0,{type:'react',id:'veil',strike:'two'});
    assert.equal(game.story.marks,holds);
    if(holds<3){
      assert.equal(game.winner,null);
      endTurn(game);
    }
  }
  assert.equal(view(game,-1,0).chapterOutcome,'landing-held');
});

test('the Veteran lift trades mana for one or two steps and cannot overshoot the landing',()=>{
  const game=chapter('veteran','landing-bell','detachment');
  const ally=game.players[0];
  const haul=steps=>act(game,0,{type:'haul-lift',steps,id:'hauler'});
  const nextTurn=()=>{endTurn(game);endTurn(game);};
  assert.equal(game.story.route,'lift');
  ally.board=[{kind:'guard',id:'hauler',hp:3,ready:true}];
  assert.throws(()=>haul(1),/more mana/);
  assert.throws(()=>haul('1'),/choose/i);
  nextTurn();
  assert.throws(()=>haul(2),/more mana/);
  haul(1);
  assert.equal(game.story.marks,1);
  assert.equal(ally.mana,0);
  assert.equal(ally.board[0].exhausted,true);
  assert.throws(()=>haul(1),/once per turn/);
  nextTurn();
  nextTurn();
  haul(2);
  assert.equal(game.story.marks,3);
  nextTurn();
  haul(1);
  assert.equal(game.story.marks,4);
  nextTurn();
  assert.throws(()=>haul(2),/only one lift step/i);
  assert.equal(ally.mana,ally.max);
  assert.equal(game.winner,null);
  haul(1);
  assert.equal(view(game,-1,0).chapterOutcome,'lift-raised');
});

test('both landing objectives keep the combat win and loss endings',()=>{
  for(const outcome of ['families-safe','detachment']){
    const won=chapter('standard','landing-bell',outcome);
    act(won,1,{type:'concede'});
    assert.equal(view(won,0,0).chapterOutcome,'detachment');
    const lost=chapter('standard','landing-bell',outcome);
    act(lost,0,{type:'concede'});
    assert.equal(view(lost,0,0).chapterOutcome,'lost');
  }
});

test('holding the landing opens the door route and rewards leaving two blockers available',()=>{
  const game=chapter('standard','upper-door','landing-held');
  const [ally,sentinel]=game.players;
  const first={kind:'guard',id:'first',hp:3,ready:true};
  const second={kind:'scout',id:'second',hp:1,ready:false,exhausted:true};
  ally.board=[first,second];
  sentinel.board=[{...first,id:'enemy-first'},{...first,id:'enemy-second'}];
  assert.equal(game.story.route,'door');
  assert.throws(()=>act(game,0,{type:'send-supplies'}),/unavailable/i);
  endTurn(game);
  assert.equal(game.story.marks,0);
  endTurn(game);
  assert.equal(game.story.marks,0);

  for(let groups=1;groups<=3;groups++){
    second.ready=false;
    endTurn(game);
    assert.equal(game.story.marks,groups);
    if(groups<3){
      assert.equal(game.winner,null);
      endTurn(game);
    }
  }
  assert.equal(view(game,-1,0).chapterOutcome,'door-opened');
});

test('the door admits a group on timeout but gives no credit for conceding with creatures in play',()=>{
  const game=chapter('standard','upper-door','landing-held');
  game.players.splice(1,0,{...player('Second ally','ally'),team:0});
  const [host,ally]=game.players;
  host.board=[{kind:'guard',id:'first',hp:3},{kind:'guard',id:'second',hp:3}];
  ally.board=[{kind:'guard',id:'third',hp:3},{kind:'guard',id:'fourth',hp:3}];
  assert.equal(expireCombat(game,game.turnDeadline),true);
  assert.equal(game.story.marks,1);
  endTurn(game);
  assert.equal(game.story.marks,2);
  endTurn(game);
  act(game,0,{type:'concede'});
  assert.equal(game.story.marks,2);
  assert.equal(game.winner,null);
  endTurn(game);
  assert.equal(game.winner,1);
  assert.equal(view(game,-1,0).chapterOutcome,'door-opened');
});

test('raising the lift opens the supply route and discards only the selected card',()=>{
  const game=chapter('veteran','upper-door','lift-raised');
  const [ally,sentinel]=game.players;
  const supply={type:'send-supplies',id:'bundle'};
  const spare={kind:'veil',id:'spare'};
  assert.equal(game.story.route,'supplies');
  sentinel.hand=[{kind:'veil',id:'opposing-card'}];
  for(let bundles=1;bundles<=4;bundles++){
    ally.hand=[spare,{kind:bundles%2?'guard':'spark',id:'bundle'}];
    const mana=ally.mana;
    assert.throws(()=>act(game,0,{...supply,id:'opposing-card'}),/choose a card from your hand/i);
    assert.equal(ally.mana,mana);
    act(game,0,supply);
    assert.deepEqual(ally.hand,[spare]);
    assert.equal(ally.mana,mana-1);
    assert.equal(game.story.marks,bundles);
    if(bundles<4){
      assert.equal(game.winner,null);
      assert.throws(()=>act(game,0,{...supply,id:'spare'}),/once per turn/i);
      endTurn(game);
      endTurn(game);
    }
  }
  assert.equal(view(game,-1,0).chapterOutcome,'stair-stocked');
});

test('both Upper Door paths keep the combat win and loss endings',()=>{
  for(const outcome of ['landing-held','lift-raised']){
    const won=chapter('standard','upper-door',outcome);
    act(won,1,{type:'concede'});
    assert.equal(view(won,0,0).chapterOutcome,'detachment');
    const lost=chapter('standard','upper-door',outcome);
    act(lost,0,{type:'concede'});
    assert.equal(view(lost,0,0).chapterOutcome,'lost');
  }
});
