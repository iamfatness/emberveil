import test from 'node:test';
import assert from 'node:assert/strict';
import {battleEffects} from '../public/presentation.mjs';

const seat=(life,...ids)=>({life,board:ids.map(id=>({id}))});
const state=(revision,players,extra={})=>({revision,started:true,players,...extra});

test('battle effects play for new live revisions without replaying room history',()=>{
  const previous=state(4,[seat(20)]);
  const next=state(5,[seat(20,'scout')],{effect:{type:'summon',seat:0,unit:'scout'}});
  assert.deepEqual(battleEffects(previous,next),[next.effect]);
  assert.deepEqual(battleEffects(next,next),[]);
  assert.deepEqual(battleEffects(next,previous),[]);
  assert.deepEqual(battleEffects(undefined,next),[]);
  assert.deepEqual(battleEffects({...previous,started:false},next),[]);
});

test('direct damage shares its impact burst and new creatures animate even without a summon effect',()=>{
  const previous=state(7,[seat(20),seat(3,'guard')]);
  const next=state(8,[seat(20,'scout','sprite'),seat(-2,'guard')],{effect:{type:'impact',seat:1}});
  assert.deepEqual(battleEffects(previous,next),[
    {type:'impact',seat:1,life:-3},
    {type:'summon',seat:0,unit:'scout'},
    {type:'summon',seat:0,unit:'sprite'}
  ]);
  assert.deepEqual(next.effect,{type:'impact',seat:1});
});

test('batch attacks animate each attacker once and keep life changes within a burst limit',()=>{
  const attackers=Array.from({length:10},(_,i)=>'attacker-'+i);
  const previous=state(3,[seat(17,...attackers),seat(20)]);
  const next=state(4,[seat(19,...attackers),seat(20)],{
    effect:{type:'attack',seat:0,unit:attackers[0]},
    combat:{strikes:attackers.map(unit=>({unit}))}
  });
  const effects=battleEffects(previous,next);
  assert.equal(effects.length,8);
  assert.deepEqual(effects[1],{type:'heal',seat:0,life:2});
  assert.deepEqual(effects.filter(effect=>effect.type==='attack').map(effect=>effect.unit),attackers.slice(0,7));
});
