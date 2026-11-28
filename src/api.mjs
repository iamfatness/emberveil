import {player,act,view,hasStarted,MAX_PLAYERS,leaders,expireCombat,playBots,modes,humanLimit,watchDifficulties,rankedLeaders,chapters,previousChapter,ashGateCarryover} from './game.mjs';
const storageReady = new WeakMap();
export function prepareStorage(db){
  let ready=storageReady.get(db);
  if(!ready){
    ready=Promise.resolve().then(()=>db.prepare(
      'CREATE TABLE IF NOT EXISTS rooms (code TEXT PRIMARY KEY, state TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0)'
    ).bind().run());
    storageReady.set(db,ready);
    ready.catch(()=>storageReady.delete(db));
  }
  return ready;
}
const response=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function api(request, db){
  const url=new URL(request.url);
  const watching=url.searchParams.get('watch')==='1';
  const code=url.pathname.split('/')[2]?.toUpperCase();
  const get=(id)=>db.prepare('SELECT state, revision FROM rooms WHERE code=?').bind(id).first();
  const update=(game,revision)=>db.prepare('UPDATE rooms SET state=?, revision=revision+1 WHERE code=? AND revision=?')
    .bind(JSON.stringify(game),code,revision).run();
  try{
    if(watching&&request.method!=='GET') return response({error:'Spectator view is read-only.'},405);
    await prepareStorage(db);
    if(request.method==='GET'){
      if(!code) return response({error:'Enter a room code.'},400);
      const room=await get(code);
      if(!room) return response({error:'Room not found.'},404);
      const game=JSON.parse(room.state);
      if(watching){
        if(!hasStarted(game)||game.winner==null) return response({error:'Spectator view opens when the match ends.'},409);
        return response({...view(game,-1,room.revision),code});
      }
      const seat=game.players.findIndex(p=>!p.bot&&p.key===request.headers.get('Authorization'));
      if(seat<0) return response({error:'Join the room first.'},403);
      const expired=expireCombat(game);
      if(playBots(game)||expired){
        const result=await update(game,room.revision);
        if(result.meta.changes) return response(view(game,seat,room.revision+1));
        const latest=await get(code);
        return response(view(JSON.parse(latest.state),seat,latest.revision));
      }
      return response(view(game,seat,room.revision));
    }
    if(request.method!=='POST') return response({error:'Method not allowed.'},405);
    if(Number(request.headers.get('Content-Length'))>4096) return response({error:'Request too large.'},413);
    const input=JSON.parse((await request.text()).slice(0,4096));
    const key=request.headers.get('Authorization');
    if(!/^[\da-f-]{36}$/i.test(key||'')) return response({error:'Missing player session.'},403);
    const name=typeof input.name==='string'?input.name.trim().slice(0,22):'';
    const leader=Object.hasOwn(leaders,input.leader)?input.leader:'tala';
    if(code==='CREATE' && input.type==='create'){
      const mode=Object.hasOwn(modes,input.mode)?input.mode:'ffa';
      const botCount=mode==='coop'&&[1,2,3].includes(input.botCount)?input.botCount:mode==='coop'?2:0;
      const turnSeconds=[60,90,120].includes(input.turnSeconds)?input.turnSeconds:90;
      const ranked=input.ranked===true;
      if(ranked&&(mode!=='ffa'||!rankedLeaders.includes(input.leader))) return response({error:'Ranked uses free-for-all and its established leader decks.'},400);
      const privateTable=!ranked&&(mode==='coop'||input.privateTable===true);
      const chapter=mode==='coop'&&input.chapter===true;
      const episode=chapter?(Object.hasOwn(chapters,input.episode)?input.episode:'watch'):undefined;
      const chapterRevision=episode?chapters[episode].revision:undefined;
      const difficulty=chapter?(Object.hasOwn(watchDifficulties,input.difficulty)?input.difficulty:'standard'):undefined;
      const previous=chapters[previousChapter(episode)];
      const priorOutcome=previous?.outcomes?.includes(input.priorOutcome)?input.priorOutcome:undefined;
      const foundryKeyholder=episode==='third-seal'&&['workers','court'].includes(input.foundryKeyholder)?input.foundryKeyholder:undefined;
      const game={players:[{...player(name||'Player 1',key,leader,mode==='coop'?input.resume:undefined,ranked),team:0}],mode,ranked,privateTable,teamsPolitics:mode==='teams',leaderDamageEnabled:!ranked&&mode!=='coop'&&input.leaderDamage===true,chapter,episode,chapterRevision,difficulty,priorOutcome,foundryKeyholder,botCount,turnSeconds,rules:3,started:false,active:0,round:1,winner:null,last:''};
      const id=crypto.randomUUID().slice(0,8).toUpperCase();
      if(episode==='watch') game.ashGate={votes:{}};
      if(episode==='accord') game.ashGateLegacy=ashGateCarryover(input.ashGateLegacy,priorOutcome);
      await db.prepare('INSERT INTO rooms (code,state) VALUES (?,?)').bind(id,JSON.stringify(game)).run();
      return response({...view(game,0,0),code:id});
    }
    const joining=input.type==='join';
    const parallelReaction=['react','pass'].includes(input.type)&&typeof input.combatId==='string';
    for(let attempt=0;attempt<(joining||parallelReaction?MAX_PLAYERS:1);attempt++){
      const room=await get(code);
      if(!room) return response({error:'Room not found.'},404);
      const game=JSON.parse(room.state);
      let seat=game.players.findIndex(p=>!p.bot&&p.key===key);
      if(joining){
        if(seat>=0) return response({...view(game,seat,room.revision),code});
        if(hasStarted(game)) return response({error:'This match has already started.'},409);
        if(game.players.length>=humanLimit(game)) return response({error:'This room is full.'},409);
        if(game.ranked&&!rankedLeaders.includes(input.leader)) return response({error:'Choose a ranked leader.'},400);
        if(game.privateTable===false&&game.players.some(p=>p.leader===leader)) return response({error:'That leader is already seated. Choose another leader or join a private table.'},409);
        seat=game.players.length;
        game.started=false;
        game.players.push({...player(name||'Player '+(seat+1),key,game.rules>=2?leader:null,game.mode==='coop'?input.resume:undefined,game.ranked),team:game.mode==='teams'?seat%2:0});
      }else{
        if(seat<0) return response({error:'Join the room first.'},403);
        if(input.revision!==room.revision&&!(parallelReaction&&game.combat?.id===input.combatId)) return response({error:'The battlefield changed. Try again.'},409);
        if(expireCombat(game)){
          playBots(game);
          await update(game,room.revision);
          return response({error:'That action window closed.'},409);
        }
        act(game,seat,input);
        playBots(game);
      }
      const result=await update(game,room.revision);
      if(result.meta.changes) return response({...view(game,seat,room.revision+1),code});
    }
    return response({error:'The room changed. Try again.'},409);
  }catch(error){
    if(error instanceof SyntaxError || error instanceof TypeError) return response({error:'Invalid request.'},400);
    if(error.message.startsWith('D1_') || error.code?.startsWith('SQLITE')) return response({error:'Room storage is unavailable.'},503);
    return response({error:error.message},400);
  }
}
