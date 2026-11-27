import assert from 'node:assert/strict';
import test from 'node:test';
import {act,player,view} from '../src/game.mjs';

function teams(options={}){
  const players=['tala','vael','nera','cass'].map((id,i)=>({...player(id,'key'+i,id==='nera'?'neri':id),team:i%2,mana:10,max:5,hand:[],deck:Array(20).fill({kind:'guard',id:'draw'})}));
  return {mode:'teams',teamsPolitics:true,objective:{progress:[0,0],claimed:null,lastTurn:0},leaderDamageEnabled:true,players,started:true,rules:3,active:0,round:1,winner:null,turnSeconds:45,...options};
}
const end=g=>act(g,g.active,{type:'end'});
const scout={id:'scout',kind:'scout',hp:1,ready:true};

test('a truce requires the other side’s consent and expires at the turn boundary',()=>{
  const g=teams();
  g.players[0].board=[scout];
  act(g,0,{type:'proposeTruce',opponent:1});
  assert.throws(()=>act(g,3,{type:'acceptTruce'}),/offered/);
  act(g,1,{type:'acceptTruce'});
  assert.equal(view(g,3,0).truce.accepted,true);
  assert.throws(()=>act(g,0,{type:'attack-batch',opponent:1,ids:['scout']}),/truce/);
  end(g);
  assert.equal(view(g,1,0).truce,undefined);
});

test('the first team to three claims the key once and its members gain mana capacity on their next turns',()=>{
  const g=teams();
  act(g,0,{type:'contestObjective'});
  assert.throws(()=>act(g,0,{type:'contestObjective'}),/once per turn/);
  assert.equal(g.players[0].mana,8);
  end(g);
  act(g,1,{type:'contestObjective'});
  end(g);
  act(g,2,{type:'contestObjective'});
  end(g); end(g);
  act(g,0,{type:'contestObjective'});
  assert.deepEqual(view(g,1,0).objective.progress,[3,1]);
  assert.equal(view(g,1,0).objective.claimed,0);
  const max=g.players[2].max;
  end(g); end(g);
  assert.equal(g.players[2].max,max+2);
  assert.throws(()=>act(g,2,{type:'contestObjective'}),/already claimed/);
});

test('leader damage is optional and tracks surviving casts independently',()=>{
  for(const enabled of [true,false]){
    const g=teams({leaderDamageEnabled:enabled});
    const tala={id:'tala-cast',kind:'tala',hp:2,ready:true};
    g.players[0].board=[tala];
    g.players[1].life=20;
    for(let i=0;i<3;i++){
      act(g,0,{type:'attack-batch',opponent:1,ids:[tala.id]});
      if(i<2) for(let j=0;j<4;j++) end(g);
    }
    assert.equal(!!g.players[1].eliminated,enabled);
    assert.equal(g.players[1].life,5);
    assert.equal(view(g,3,0).players[1].leaderDamage?.[0]?.damage??0,enabled?15:0);
  }
});

test('threat is public and recalculates after an opponent develops the board',()=>{
  const g=teams();
  g.players[0].life=21;
  assert.equal(view(g,1,0).threat,0);
  g.players[2].board=[scout];
  assert.equal(view(g,1,0).threat,2);
});

test('every seat sees exactly the players who still owe a combat reaction',()=>{
  const g=teams();
  g.players[0].board=[{...scout}];
  g.players[1].board=[{kind:'guard',id:'blocker',hp:3,ready:true}];
  g.players[0].hand=[{kind:'surge',id:'surge'}];
  g.players[1].hand=[{kind:'veil',id:'veil'}];
  g.players[2].hand=[{kind:'veil',id:'last-veil'}];
  act(g,0,{type:'attack-batch',opponent:1,ids:['scout']});
  assert.equal(view(g,3,0).combat.pendingReactions,undefined);
  act(g,1,{type:'blocks',blocks:[]});
  for(let seat=0;seat<4;seat++) assert.deepEqual(view(g,seat,1).combat.pendingReactions,[0,1,2]);
  act(g,1,{type:'pass'});
  assert.deepEqual(view(g,3,2).combat.pendingReactions,[0,2]);
  act(g,0,{type:'react',id:'surge',strike:'scout'});
  assert.deepEqual(view(g,3,3).combat.pendingReactions,[2]);
  assert.equal(view(g,3,3).players[2].hand,undefined);
  act(g,2,{type:'pass'});
  assert.equal(view(g,3,4).combat,null);
});
