import assert from 'node:assert/strict';
import test from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import {api} from '../src/api.mjs';

function matchApi(){
  const db=new DatabaseSync(':memory:');
  const binding={prepare(sql){
    const statement=db.prepare(sql);
    return {bind(...args){return {first:()=>statement.get(...args),run:()=>({meta:statement.run(...args)})};}};
  }};
  return async (path,key,input)=>{
    const result=await api(new Request('http://localhost/api/'+path,{
      method:input?'POST':'GET',headers:key?{Authorization:key}:{},body:input?JSON.stringify(input):undefined
    }),binding);
    return {status:result.status,data:await result.json()};
  };
}

test('only completed matches have a public, read-only view',async()=>{
  const call=matchApi();
  const host=crypto.randomUUID(), guest=crypto.randomUUID();
  const {data:room}=await call('create',host,{type:'create',leader:'sera'});
  assert.equal((await call(room.code+'?watch=1')).status,409);
  const joined=await call(room.code,guest,{type:'join',leader:'cass'});
  const started=await call(room.code,host,{type:'start',revision:joined.data.revision});
  assert.equal((await call(room.code+'?watch=1')).status,409);
  await call(room.code,guest,{type:'concede',revision:started.data.revision});
  const watched=await call(room.code+'?watch=1');
  assert.equal(watched.status,200);
  assert.equal(watched.data.winner,0);
  assert.equal(watched.data.players[0].hand,undefined);
  assert.equal(watched.data.players[0].key,undefined);
  assert.equal((await call(room.code+'?watch=1',host,{type:'end'})).status,405);
});

test('co-op resumes a valid path, remembers the first chapter, and leaves PvP fresh',async()=>{
  const call=matchApi();
  const host=crypto.randomUUID();
  const progress={tree:'rider',unlocked:2,growth:1};
  const coop=await call('create',host,{type:'create',mode:'coop',chapter:true,episode:'accord',leader:'tala',resume:progress,priorOutcome:'ward-restored-loss'});
  assert.equal(coop.data.episode,'accord');
  assert.equal(coop.data.priorOutcome,'ward-restored-loss');
  assert.equal(coop.data.players[0].unlocked,2);
  assert.equal(coop.data.players[0].growth,1);
  const fresh=await call('create',host,{type:'create',mode:'ffa',leader:'tala',resume:progress,priorOutcome:'ward-restored-loss'});
  assert.equal(fresh.data.players[0].unlocked,0);
  assert.equal(fresh.data.priorOutcome,undefined);
  const invalid=await call('create',host,{type:'create',mode:'coop',leader:'tala',resume:{tree:'titan',unlocked:3,growth:999}});
  assert.equal(invalid.data.players[0].unlocked,0);
});

test('Neri may read one non-public hand once per match',async()=>{
  const call=matchApi(),host=crypto.randomUUID(),guest=crypto.randomUUID();
  const {data:room}=await call('create',host,{type:'create',leader:'neri'});
  const joined=await call(room.code,guest,{type:'join',leader:'iskar'});
  const started=await call(room.code,host,{type:'start',revision:joined.data.revision});
  const looked=await call(room.code,host,{type:'read-record',opponent:1,revision:started.data.revision});
  assert.equal(looked.data.record.cards.length,5);
  assert.equal((await call(room.code,guest)).data.record,undefined);
  assert.equal((await call(room.code,host,{type:'read-record',opponent:1,revision:looked.data.revision})).status,400);
});

test('ranked rules use existing FFA decks with private settings and carryover disabled',async()=>{
  const call=matchApi(),host=crypto.randomUUID(),guest=crypto.randomUUID();
  const {data:room}=await call('create',host,{type:'create',mode:'ffa',leader:'sylva',ranked:true,leaderDamage:true,privateTable:true,resume:{tree:'briar',unlocked:3,growth:6}});
  assert.equal(room.ranked,true);
  assert.equal(room.leaderDamageEnabled,false);
  assert.equal(room.privateTable,false);
  assert.equal(room.players[0].unlocked,0);
  assert.equal((await call(room.code,guest,{type:'join',leader:'sylva'})).status,409);
  const guestSeat=await call(room.code,guest,{type:'join',leader:'cass'});
  assert.equal(guestSeat.data.players[1].leader,'cass');
  assert.equal((await call('create',host,{type:'create',mode:'teams',leader:'sylva',ranked:true})).status,400);
});

test('a four-player Teams room can contest the key and accepts a truce across seats',async()=>{
  const call=matchApi();
  const keys=Array.from({length:4},()=>crypto.randomUUID());
  const {data:room}=await call('create',keys[0],{type:'create',mode:'teams',leader:'sera'});
  let state=room;
  for(const [seat,leader] of ['sera','cass','tala','vael'].entries()){
    if(seat) ({data:state}=await call(room.code,keys[seat],{type:'join',leader}));
  }
  async function move(seat,input){
    const result=await call(room.code,keys[seat],{...input,revision:state.revision});
    assert.equal(result.status,200,JSON.stringify(result.data));
    state=result.data;
  }
  await move(0,{type:'start'});
  await move(0,{type:'proposeTruce',opponent:1});
  await move(1,{type:'acceptTruce'});
  assert.equal((await call(room.code,keys[3])).data.truce.accepted,true);
  for(let seat=0;seat<4;seat++) await move(seat,{type:'end'});
  assert.equal(state.truce,undefined);
  await move(0,{type:'contestObjective'});
  assert.deepEqual((await call(room.code,keys[3])).data.objective.progress,[1,0]);
});

test('the Watch remembers a restored ward after defeat and The Broken Accord uses that outcome',async()=>{
  const call=matchApi(), host=crypto.randomUUID();
  const watch=await call('create',host,{type:'create',mode:'coop',chapter:true,episode:'watch',botCount:1});
  let state=watch.data;
  async function move(input){
    const result=await call(watch.data.code,host,{...input,revision:state.revision});
    assert.equal(result.status,200,JSON.stringify(result.data));
    state=result.data;
  }
  await move({type:'start'});
  for(let turn=0;turn<4;turn++){
    if(turn) await move({type:'rekindle'});
    if(turn===3) break;
    await move({type:'end'});
    if(state.combat?.phase==='block') await move({type:'blocks',blocks:[]});
    if(state.combat?.phase==='react') await move({type:'pass',combatId:state.combat.id});
  }
  assert.equal(state.story.marks,3);
  await move({type:'concede'});
  assert.equal(state.chapterOutcome,'ward-restored-loss');
  const next=await call('create',host,{type:'create',mode:'coop',chapter:true,episode:'accord',priorOutcome:state.chapterOutcome});
  assert.equal(next.data.priorOutcome,'ward-restored-loss');
});

test('all five chapters start in order and accept only outcomes from the preceding chapter',async()=>{
  const call=matchApi();
  const host=crypto.randomUUID();
  for(const [episode,priorOutcome] of [
    ['watch',undefined],
    ['accord','ward-restored'],
    ['missing-names','sun'],
    ['tide','witnesses'],
    ['open-accord','causeway']
  ]){
    const room=await call('create',host,{type:'create',mode:'coop',chapter:true,episode,priorOutcome,botCount:1,leader:'sylva',
      resume:{tree:'briar',unlocked:1,growth:0}});
    assert.equal(room.status,200,JSON.stringify(room.data));
    assert.equal(room.data.episode,episode);
    assert.equal(room.data.chapterRevision,1);
    assert.equal(room.data.priorOutcome,priorOutcome);
    assert.equal(room.data.players[0].unlocked,1);
    const started=await call(room.data.code,host,{type:'start',revision:room.data.revision});
    assert.equal(started.status,200);
    assert.equal(started.data.story.pulseIn,episode==='watch'?4:undefined);
    assert.equal(started.data.story.tide,episode==='tide'?'high':undefined);
  }
  const unrelated=await call('create',host,{type:'create',mode:'coop',chapter:true,episode:'open-accord',priorOutcome:'sun'});
  assert.equal(unrelated.data.priorOutcome,undefined);
});

test('the Foundry opens after the finale and accepts its outcome without changing other chapters',async()=>{
  const call=matchApi(),host=crypto.randomUUID();
  const {data:room}=await call('create',host,{type:'create',mode:'coop',chapter:true,episode:'foundry',priorOutcome:'refuges',difficulty:'veteran',leader:'orrun',botCount:1});
  const started=await call(room.code,host,{type:'start',revision:room.revision});
  assert.equal(started.status,200);
  assert.equal(started.data.episode,'foundry');
  assert.equal(started.data.priorOutcome,'refuges');
  assert.equal(started.data.story.heatIn,2);
  assert.equal(started.data.story.pulseIn,undefined);
  const earlyVent=await call(room.code,host,{type:'foundry',job:'vent',revision:started.data.revision});
  assert.equal(earlyVent.status,400);
  assert.match(earlyVent.data.error,/when the blast is due/);
});

test('the Orchard receives the saved Foundry keyholder through the co-op handoff',async()=>{
  const call=matchApi(),host=crypto.randomUUID();
  for(const [priorOutcome,shelter,patrolIn] of [['workers',1,2],['court',0,3],['detachment',0,2],['lantern',0,2]]){
    const {data:room}=await call('create',host,{type:'create',mode:'coop',chapter:true,episode:'orchard',priorOutcome,botCount:1});
    assert.equal(room.episode,'orchard');
    const started=await call(room.code,host,{type:'start',revision:room.revision});
    assert.equal(started.status,200);
    assert.equal(started.data.story.plots.shelter,shelter);
    assert.equal(started.data.story.patrolIn,patrolIn);
    assert.equal(started.data.priorOutcome,priorOutcome==='lantern'?undefined:priorOutcome);
  }
});

test('the Third Seal carries both chapter choices and ignores unrelated Foundry outcomes',async()=>{
  const call=matchApi(),host=crypto.randomUUID();
  for(const [holder,archiveIn] of [['court',6],['workers',5],['detachment',5]]){
    const {data:room}=await call('create',host,{type:'create',mode:'coop',chapter:true,episode:'third-seal',
      priorOutcome:'orchard-held',foundryKeyholder:holder,botCount:1});
    assert.equal(room.episode,'third-seal');
    assert.equal(room.priorOutcome,'orchard-held');
    assert.equal(room.foundryKeyholder,holder==='detachment'?undefined:holder);
    const started=await call(room.code,host,{type:'start',revision:room.revision});
    assert.equal(started.status,200);
    assert.equal(started.data.story.archiveIn,archiveIn);
  }
});

test('the Ash Register accepts Third Seal endings, including ones saved before this chapter existed',async()=>{
  const call=matchApi(),host=crypto.randomUUID();
  for(const [priorOutcome,pages] of [
    ['ledger',{orders:1,shelter:0}],
    ['witness',{orders:0,shelter:1}],
    ['detachment',{orders:0,shelter:0}],
    ['workers',{orders:0,shelter:0}]
  ]){
    const {data:room}=await call('create',host,{type:'create',mode:'coop',chapter:true,episode:'ash-register',
      priorOutcome,botCount:1});
    assert.equal(room.episode,'ash-register');
    assert.equal(room.priorOutcome,priorOutcome==='workers'?undefined:priorOutcome);
    const started=await call(room.code,host,{type:'start',revision:room.revision});
    assert.equal(started.status,200);
    assert.deepEqual(started.data.story.pages,pages);
  }
});

test('The Doors at Dawn uses the stored Ash Register custody to select the objective',async()=>{
  const call=matchApi(),host=crypto.randomUUID();
  for(const [priorOutcome,route] of [['court-record','court'],['shelter-copies','shelters'],['detachment','court'],['witness','court']]){
    const {data:room}=await call('create',host,{type:'create',mode:'coop',chapter:true,episode:'doors-at-dawn',
      priorOutcome,botCount:1});
    assert.equal(room.episode,'doors-at-dawn');
    assert.equal(room.priorOutcome,priorOutcome==='witness'?undefined:priorOutcome);
    const started=await call(room.code,host,{type:'start',revision:room.revision});
    assert.equal(started.status,200);
    assert.equal(started.data.story.route,route);
    assert.equal(started.data.story.hearingIn,route==='court'?6:undefined);
  }
});

test('The Lower Stair remembers where The Doors at Dawn ended',async()=>{
  const call=matchApi(),host=crypto.randomUUID();
  for(const [priorOutcome,braced,marks] of [
    ['names-read',true,0],['copies-read',false,1],['detachment',false,0],['court-record',false,0]
  ]){
    const {data:room}=await call('create',host,{type:'create',mode:'coop',chapter:true,episode:'lower-stair',
      priorOutcome,botCount:1});
    assert.equal(room.episode,'lower-stair');
    assert.equal(room.priorOutcome,priorOutcome==='court-record'?undefined:priorOutcome);
    const started=await call(room.code,host,{type:'start',revision:room.revision});
    assert.equal(started.status,200);
    assert.equal(started.data.story.grateBraced,braced);
    assert.equal(started.data.story.grateOpen,false);
    assert.equal(started.data.story.marks,marks);
  }
});

test('The Landing Bell uses the Lower Stair victory to choose its objective',async()=>{
  const call=matchApi(),host=crypto.randomUUID();
  for(const [priorOutcome,route] of [
    ['families-safe','hold'],['detachment','lift'],['lost','lift'],['names-read','lift']
  ]){
    const {data:room}=await call('create',host,{type:'create',mode:'coop',chapter:true,episode:'landing-bell',
      priorOutcome,botCount:1});
    assert.equal(room.episode,'landing-bell');
    assert.equal(room.priorOutcome,priorOutcome==='names-read'?undefined:priorOutcome);
    const started=await call(room.code,host,{type:'start',revision:room.revision});
    assert.equal(started.status,200);
    assert.equal(started.data.story.route,route);
    assert.equal(started.data.story.marks,0);
  }
});

test('The Upper Door chooses its objective from the Landing Bell ending',async()=>{
  const call=matchApi(),host=crypto.randomUUID();
  for(const [priorOutcome,route] of [
    ['landing-held','door'],['lift-raised','supplies'],['detachment','supplies'],['families-safe','supplies'],[undefined,'supplies']
  ]){
    const {data:room}=await call('create',host,{type:'create',mode:'coop',chapter:true,episode:'upper-door',
      priorOutcome,botCount:1});
    assert.equal(room.episode,'upper-door');
    assert.equal(room.priorOutcome,priorOutcome==='families-safe'?undefined:priorOutcome);
    const started=await call(room.code,host,{type:'start',revision:room.revision});
    assert.equal(started.status,200);
    assert.equal(started.data.story.route,route);
    assert.equal(started.data.story.marks,0);
  }
});

test('The Common Table chooses its objective from the Upper Door ending',async()=>{
  const call=matchApi(),host=crypto.randomUUID();
  for(const [priorOutcome,route] of [
    ['door-opened','seats'],['stair-stocked','lamps'],['detachment','lamps'],['lift-raised','lamps'],[undefined,'lamps']
  ]){
    const {data:room}=await call('create',host,{type:'create',mode:'coop',chapter:true,episode:'common-table',
      priorOutcome,botCount:1});
    assert.equal(room.episode,'common-table');
    assert.equal(room.priorOutcome,priorOutcome==='lift-raised'?undefined:priorOutcome);
    const started=await call(room.code,host,{type:'start',revision:room.revision});
    assert.equal(started.status,200);
    assert.equal(started.data.story.route,route);
    assert.equal(started.data.story.marks,0);
  }
});

test('The First Petition selects its route from the Common Table ending',async()=>{
  const call=matchApi(),host=crypto.randomUUID();
  for(const [priorOutcome,route] of [
    ['delegates-seated','petition'],['lamps-kept','runners'],['detachment','petition'],['stair-stocked','petition'],[undefined,'petition']
  ]){
    const {data:room}=await call('create',host,{type:'create',mode:'coop',chapter:true,episode:'first-petition',
      priorOutcome,botCount:1});
    assert.equal(room.episode,'first-petition');
    assert.equal(room.priorOutcome,priorOutcome==='stair-stocked'?undefined:priorOutcome);
    const started=await call(room.code,host,{type:'start',revision:room.revision});
    assert.equal(started.status,200);
    assert.equal(started.data.story.route,route);
    assert.equal(started.data.story.marks,0);
  }
});

test('The Gate Charter uses the First Petition ending to select its route',async()=>{
  const call=matchApi(),host=crypto.randomUUID();
  for(const [priorOutcome,route] of [
    ['petition-signed','hearing'],['copies-through','copies'],['detachment','hearing'],['delegates-seated','hearing'],[undefined,'hearing']
  ]){
    const {data:room}=await call('create',host,{type:'create',mode:'coop',chapter:true,episode:'gate-charter',
      priorOutcome,botCount:1});
    assert.equal(room.episode,'gate-charter');
    assert.equal(room.priorOutcome,priorOutcome==='delegates-seated'?undefined:priorOutcome);
    const started=await call(room.code,host,{type:'start',revision:room.revision});
    assert.equal(started.status,200);
    assert.equal(started.data.story.route,route);
    assert.equal(started.data.story.marks,0);
  }
});

test('The Shared Keys chooses its route from the Gate Charter ending',async()=>{
  const call=matchApi(),host=crypto.randomUUID();
  for(const [priorOutcome,route] of [
    ['charter-ratified','keys'],['copies-posted','lanes'],['detachment','keys'],['copies-through','keys'],[undefined,'keys']
  ]){
    const {data:room}=await call('create',host,{type:'create',mode:'coop',chapter:true,episode:'shared-keys',
      priorOutcome,botCount:1});
    assert.equal(room.episode,'shared-keys');
    assert.equal(room.priorOutcome,priorOutcome==='copies-through'?undefined:priorOutcome);
    const started=await call(room.code,host,{type:'start',revision:room.revision});
    assert.equal(started.status,200);
    assert.equal(started.data.story.route,route);
    assert.equal(started.data.story.marks,0);
  }
});

test('The Open Road chooses its route from the Shared Keys ending',async()=>{
  const call=matchApi(),host=crypto.randomUUID();
  for(const [priorOutcome,route] of [
    ['bars-lifted','wagons'],['lanes-rallied','crowd'],['detachment','wagons'],['copies-posted','wagons'],[undefined,'wagons']
  ]){
    const {data:room}=await call('create',host,{type:'create',mode:'coop',chapter:true,episode:'open-road',
      priorOutcome,botCount:1});
    assert.equal(room.episode,'open-road');
    assert.equal(room.priorOutcome,priorOutcome==='copies-posted'?undefined:priorOutcome);
    const started=await call(room.code,host,{type:'start',revision:room.revision});
    assert.equal(started.status,200);
    assert.equal(started.data.story.route,route);
    assert.equal(started.data.story.marks,0);
  }
});

test('The Reed Ford chooses its route from the Open Road ending',async()=>{
  const call=matchApi(),host=crypto.randomUUID();
  for(const [priorOutcome,route] of [
    ['wagons-through','causeway'],['crowd-through','shallows'],['detachment','causeway'],['lanes-rallied','causeway'],[undefined,'causeway']
  ]){
    const {data:room}=await call('create',host,{type:'create',mode:'coop',chapter:true,episode:'reed-ford',
      priorOutcome,botCount:1});
    assert.equal(room.episode,'reed-ford');
    assert.equal(room.priorOutcome,priorOutcome==='lanes-rallied'?undefined:priorOutcome);
    const started=await call(room.code,host,{type:'start',revision:room.revision});
    assert.equal(started.status,200);
    assert.equal(started.data.story.route,route);
    assert.equal(started.data.story.marks,0);
  }
});

test('The Far Bank chooses its route from the Reed Ford ending',async()=>{
  const call=matchApi(),host=crypto.randomUUID();
  for(const [priorOutcome,route] of [
    ['ford-bridged','unload'],['shallows-crossed','shelter'],['detachment','unload'],['crowd-through','unload'],[undefined,'unload']
  ]){
    const {data:room}=await call('create',host,{type:'create',mode:'coop',chapter:true,episode:'far-bank',
      priorOutcome,botCount:1});
    assert.equal(room.episode,'far-bank');
    assert.equal(room.priorOutcome,priorOutcome==='crowd-through'?undefined:priorOutcome);
    const started=await call(room.code,host,{type:'start',revision:room.revision});
    assert.equal(started.status,200);
    assert.equal(started.data.story.route,route);
    assert.equal(started.data.story.marks,0);
  }
});
