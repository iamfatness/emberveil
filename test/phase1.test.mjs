import test from 'node:test';
import assert from 'node:assert/strict';
import {act,player,view} from '../src/game.mjs';

function match(leader,tree,unlocked,opponent='vael'){
  const players=[player('First','first',leader),player('Second','second',opponent)];
  for(const p of players) Object.assign(p,{mana:10,max:10,hand:[],board:[],
    deck:Array.from({length:25},(_,i)=>({kind:'guard',id:'draw-'+i}))});
  Object.assign(players[0],{tree,unlocked});
  return {players,mode:'ffa',started:true,rules:3,active:0,round:3,winner:null,turnSeconds:90};
}
const unit=(kind,id=kind,ready=true)=>({kind,id,ready,hp:{scout:1,guard:3,sprite:1,drake:4,wolf:2}[kind]});
const attack=(g,...ids)=>act(g,0,{type:'attack-batch',opponent:1,ids});
const end=(g)=>act(g,g.active,{type:'end'});

test('Rider Ash Surge lets a fresh creature join the first attack',()=>{
  const g=match('tala','rider',2);
  g.players[0].board=[unit('scout','scout',false)];
  g.players[0].hand=[{kind:'surge',id:'surge'}];
  act(g,0,{type:'play',id:'surge',target:'scout'});
  attack(g,'scout');
  assert.equal(g.players[1].life,15);
  assert.throws(()=>attack(g,'scout'),/one combat/);
});

test('Neri’s first Flame node changes Wildfire damage',()=>{
  const g=match('neri','flame',1);
  g.players[0].hand=[{kind:'spark',id:'spark'}];
  act(g,0,{type:'play',id:'spark',target:'hero'});
  assert.equal(g.players[1].life,16);
});

test('Ash remembers a creature from the player’s previous turn',()=>{
  const g=match('tala','ash',1);
  g.players[0].hand=[{kind:'scout',id:'first'},{kind:'scout',id:'next'}];
  act(g,0,{type:'play',id:'first'});
  end(g);
  end(g);
  g.players[0].mana=0;
  act(g,0,{type:'play',id:'next'});
  assert.equal(g.players[0].board.length,2);
});

test('a destroyed Briar Sprite is replaced by a fresh unit',()=>{
  const g=match('sylva','briar',3);
  g.players[0].board=[unit('sprite')];
  g.players[1].board=[unit('guard')];
  attack(g,'sprite');
  act(g,1,{type:'blocks',blocks:[{attacker:'sprite',blocker:'guard'}]});
  assert.equal(g.players[0].board.length,1);
  assert.notEqual(g.players[0].board[0].id,'sprite');
  assert.equal(g.players[0].board[0].ready,false);
});

test('Thorn attackers must be blocked when possible',()=>{
  const g=match('sylva','thorn',1);
  g.players[0].board=[unit('sprite')];
  g.players[1].board=[unit('guard')];
  attack(g,'sprite');
  assert.throws(()=>act(g,1,{type:'blocks',blocks:[]}),/must block/);
});

const card=(kind,id=kind)=>({kind,id});
const play=(g,kind,target)=>act(g,0,{type:'play',id:kind,target});
const summon=(g,options={})=>act(g,0,{type:'summon',...options});

test('the Rider draws on a three-creature attack and Ash rewards a targeted summon',()=>{
  const rider=match('tala','rider',3);
  rider.players[0].board=['one','two','three'].map(id=>unit('scout',id));
  attack(rider,'one','two','three');
  assert.equal(rider.players[0].hand.length,1);
  assert.equal(rider.players[1].life,13);
  const ash=match('tala','ash',3);
  ash.players[0].hand=[card('spark')];
  ash.players[1].life=6;
  play(ash,'spark','hero');
  assert.equal(ash.players[1].life,2);
  summon(ash,{opponent:1});
  assert.equal(ash.winner,0);
});

test('Wall applies to the first blocker in batch combat and returns extra damage',()=>{
  const g=match('tala',null,0);
  const defender=g.players[1];
  Object.assign(defender,{tree:'wall',unlocked:3,life:12,board:[unit('guard')]});
  g.players[0].board=[unit('drake','drake'),unit('scout','other')];
  g.players[0].board[0].kind='wolf';
  g.players[0].board[0].hp=3;
  attack(g,'drake','other');
  act(g,1,{type:'blocks',blocks:[{attacker:'drake',blocker:'guard'}]});
  assert.ok(defender.board.some(unit=>unit.id==='guard'));
  assert.ok(!g.players[0].board.some(unit=>unit.id==='drake'));
  end(g);
  defender.hand=[card('ward')];
  act(g,1,{type:'play',id:'ward'});
  assert.equal(defender.life,16);
});

test('Shelter grants life on an empty board, improves Silver Veil, and heals on summon',()=>{
  const g=match('vael','shelter',3);
  const p=g.players[0];
  p.life=10;
  end(g); end(g);
  assert.equal(p.life,12);
  summon(g);
  assert.equal(p.life,15);
  end(g);
  p.hand=[card('veil')];
  g.players[1].board=[unit('wolf')];
  act(g,1,{type:'attack-batch',opponent:0,ids:['wolf']});
  act(g,0,{type:'blocks',blocks:[]});
  act(g,0,{type:'react',id:'veil',strike:'wolf'});
  assert.equal(p.life,15);
});

test('Flame draws on Wildfire and allows a zero-mana reaction',()=>{
  const g=match('neri','flame',3);
  const p=g.players[0];
  p.hand=[card('spark'),card('surge')];
  p.mana=2;
  play(g,'spark','hero');
  assert.equal(p.hand.length,2);
  p.board=[unit('scout')];
  attack(g,'scout');
  act(g,0,{type:'react',id:'surge',strike:'scout'});
  assert.equal(p.mana,0);
  assert.equal(g.players[1].life,12);
});

test('Weave draws on Ash Surge and Neri keeps the chosen top card privately',()=>{
  const g=match('neri','weave',3);
  const p=g.players[0];
  p.hand=[card('surge'),card('veil')];
  p.board=[unit('scout')];
  play(g,'surge','scout');
  assert.equal(p.hand.length,2);
  assert.throws(()=>play(g,'veil','scout'),/before combat/);
  p.deck=[card('guard','top'),card('drake','second')];
  summon(g);
  assert.equal(view(g,1,0).players[0].choice,undefined);
  assert.deepEqual(view(g,0,0).players[0].choice.cards.map(card=>card.id),['top','second']);
  act(g,0,{type:'choose-card',choice:1});
  assert.equal(p.hand.at(-1).id,'second');
  assert.equal(p.deck[0].id,'top');
});

test('Briars grow three sprites and each attacks with two power',()=>{
  const g=match('sylva','briar',2);
  g.players[0].hand=[card('briar')];
  play(g,'briar');
  assert.equal(g.players[0].board.length,3);
  end(g); end(g);
  g.players[1].hand=[];
  attack(g,...g.players[0].board.map(unit=>unit.id));
  assert.equal(g.players[1].life,14);
});

test('Thorns boost all four attackers and Sylva freezes a chosen defender',()=>{
  const g=match('sylva','thorn',3);
  g.players[0].board=['a','b','c','d'].map(id=>unit('sprite',id));
  g.players[1].board=[unit('guard')];
  summon(g,{opponent:1,target:'guard'});
  assert.equal(g.players[1].board[0].frozen,1);
  attack(g,'a','b','c','d');
  assert.equal(g.players[1].life,12);
});

test('Forge increases capacity, discounts a Drake, and uses its printed cost for the draw',()=>{
  const g=match('orrun','forge',3);
  const p=g.players[0];
  Object.assign(p,{max:5,mana:6,hand:[card('forge'),card('drake')]});
  play(g,'forge');
  assert.equal(p.max,7);
  play(g,'drake');
  assert.equal(p.mana,0);
  assert.equal(p.hand.length,1);
});

test('Titan adds lasting HP and Orrun attacks immediately after clearing opposing creatures',()=>{
  const g=match('orrun','titan',1);
  const p=g.players[0];
  p.growth=5;
  p.board=[unit('scout')];
  g.players[1].board=[unit('guard')];
  act(g,0,{type:'unlock',branch:'titan'});
  assert.equal(p.board[0].hp,2);
  act(g,0,{type:'unlock',branch:'titan'});
  summon(g);
  assert.equal(g.players[1].board.length,0);
  assert.equal(p.board.at(-1).hp,7);
  attack(g,p.board.at(-1).id);
  assert.equal(g.players[1].life,13);
  end(g);
  assert.equal(p.board[0].hp,2);
});

test('Tidebind draws and deals damage at the start of both frozen turns',()=>{
  const g=match('iskar','tide',3);
  g.players[0].hand=[card('frost')];
  g.players[1].board=[unit('guard')];
  play(g,'frost','guard');
  assert.equal(g.players[0].hand.length,1);
  assert.equal(g.players[1].board[0].frozen,2);
  end(g);
  assert.equal(g.players[1].board[0].hp,2);
  end(g); end(g);
  assert.equal(g.players[1].board[0].hp,2);
  assert.equal(g.players[1].board[0].frozen,0);
});

test('Oracle can put the top card on the bottom, draws two on summon, and draws on Silver Veil',()=>{
  const g=match('iskar','oracle',3);
  const p=g.players[0];
  p.deck=[card('scout','top'),card('guard','next'),card('drake','third'),card('frost','fourth')];
  end(g); end(g);
  assert.equal(view(g,0,0).players[0].choice.cards[0].id,'top');
  act(g,0,{type:'choose-card',choice:1});
  assert.equal(p.hand[0].id,'next');
  assert.equal(p.deck.at(-1).id,'top');
  summon(g);
  assert.deepEqual(p.hand.map(card=>card.id),['next','third','fourth']);
  end(g);
  p.hand.push(card('veil'));
  g.players[1].board=[unit('wolf')];
  act(g,1,{type:'attack-batch',opponent:0,ids:['wolf']});
  act(g,0,{type:'blocks',blocks:[]});
  act(g,0,{type:'react',id:'veil',strike:'wolf'});
  assert.equal(p.hand.at(-1).id,'top');
});

test('Sera and Cass can sit in every mode with fixed decks and sequential paths',()=>{
  for(const mode of ['ffa','teams','coop']){
    const ids=mode==='teams'?['sera','cass','tala','vael']:['sera','cass'];
    const players=ids.map((id,i)=>({...player(id,id,id),team:mode==='teams'?i%2:0}));
    const g={mode,players,started:false,rules:3,active:0,round:1,winner:null,turnSeconds:90,botCount:1};
    act(g,0,{type:'start'});
    end(g); end(g);
    assert.equal(players[0].growth,1);
    assert.equal(players[1].growth,1);
    assert.equal(g.players[0].hand.length+g.players[0].deck.length,30);
    assert.equal(g.players[1].hand.length+g.players[1].deck.length,30);
  }
});

test('Sera’s Watch bolsters the first block, recovers life from two blocks, and heals on summon when behind',()=>{
  const g=match('tala',null,0,'sera');
  const sera=g.players[1];
  Object.assign(sera,{tree:'court-watch',unlocked:3,life:10,board:[unit('guard','first'),unit('guard','second')]});
  g.players[0].board=[unit('wolf'),unit('scout')];
  attack(g,'wolf','scout');
  act(g,1,{type:'blocks',blocks:[{attacker:'wolf',blocker:'first'},{attacker:'scout',blocker:'second'}]});
  assert.equal(sera.board[0].hp,1);
  assert.equal(sera.life,12);
  end(g);
  act(g,1,{type:'summon'});
  assert.equal(sera.life,15);
});

test('Sera’s Witness improves healing, draws when behind on board, and prevents five damage',()=>{
  const g=match('sera','witness',3);
  const sera=g.players[0];
  sera.life=10;
  sera.hand=[card('ward')];
  g.players[1].board=[unit('guard')];
  play(g,'ward');
  assert.equal(sera.life,16);
  end(g); end(g);
  assert.equal(sera.hand.length,2);
  end(g);
  g.players[1].hand=[];
  sera.hand=[card('veil')];
  g.players[1].board=[unit('drake')];
  act(g,1,{type:'attack-batch',opponent:0,ids:['drake']});
  act(g,0,{type:'react',id:'veil',strike:'drake'});
  assert.equal(sera.life,15);
});

test('Cass’s Road readies Scouts, discounts the summon, and draws from a paired attack',()=>{
  const g=match('cass','road',3);
  const p=g.players[0];
  p.hand=[card('scout','one'),card('scout','two')];
  play(g,'one'); play(g,'two');
  assert.equal(view(g,0,0).players[0].leaderCost,3);
  summon(g);
  assert.equal(p.mana,5);
  attack(g,'one','two');
  assert.equal(p.hand.length,1);
  assert.equal(g.players[1].life,16);
});

test('Cass’s Hearth improves Wildfire, draws from Drake, and restores life',()=>{
  const g=match('cass','hearth',3);
  const p=g.players[0];
  p.life=14;
  p.hand=[card('spark'),card('drake')];
  play(g,'spark','hero'); play(g,'drake');
  assert.equal(g.players[1].life,16);
  assert.equal(p.hand.length,1);
  end(g); end(g);
  summon(g);
  assert.equal(p.life,17);
});

test('Briar Shelter is casual-only and can replace a fallen Sprite',()=>{
  const casual=player('Sylva','casual','sylva');
  const ranked=player('Sylva','ranked','sylva',undefined,true);
  assert.equal([...casual.hand,...casual.deck].filter(unit=>unit.kind==='briar-shelter').length,2);
  assert.ok(![...ranked.hand,...ranked.deck].some(unit=>unit.kind==='briar-shelter'));
  const g=match('sylva','briar',3);
  g.players[0].life=12;
  g.players[0].hand=[card('briar-shelter')];
  play(g,'briar-shelter');
  assert.equal(g.players[0].life,14);
  assert.equal(g.players[0].board[0].kind,'sprite');
});
