import assert from 'node:assert/strict';
import test from 'node:test';
import { act, player, view } from '../src/game.mjs';

function chapter(difficulty, episode) {
  const game = {
    chapter: true, episode, difficulty, mode: 'coop', botCount: 1, rules: 3,
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
