import {player,turn,act,view} from './game.mjs';
const response=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function api(request, db){
  const url=new URL(request.url);
  const code=url.pathname.split('/')[2]?.toUpperCase();
  const get=(id)=>db.prepare('SELECT state, revision FROM rooms WHERE code=?').bind(id).first();
  try{
    if(request.method==='GET'){
      if(!code) return response({error:'Enter a room code.'},400);
      const room=await get(code);
      if(!room) return response({error:'Room not found.'},404);
      const game=JSON.parse(room.state);
      const seat=game.players.findIndex(p=>p.key===request.headers.get('Authorization'));
      if(seat<0) return response({error:'Join the room first.'},403);
      return response(view(game,seat,room.revision));
    }
    if(request.method!=='POST') return response({error:'Method not allowed.'},405);
    if(Number(request.headers.get('Content-Length'))>4096) return response({error:'Request too large.'},413);
    const input=JSON.parse((await request.text()).slice(0,4096));
    const key=request.headers.get('Authorization');
    if(!/^[\da-f-]{36}$/i.test(key||'')) return response({error:'Missing player session.'},403);
    const name=typeof input.name==='string'?input.name.trim().slice(0,22):'';
    if(code==='CREATE' && input.type==='create'){
      const game={players:[player(name||'Player 1',key)],active:0,round:1,winner:null,last:''};
      const id=crypto.randomUUID().slice(0,8).toUpperCase();
      await db.prepare('INSERT INTO rooms (code,state) VALUES (?,?)').bind(id,JSON.stringify(game)).run();
      return response({...view(game,0,0),code:id});
    }
    const room=await get(code);
    if(!room) return response({error:'Room not found.'},404);
    const game=JSON.parse(room.state);
    let seat=game.players.findIndex(p=>p.key===key);
    if(input.type==='join'){
      if(seat>=0) return response({...view(game,seat,room.revision),code});
      if(game.players.length===2) return response({error:'This duel already has two players.'},409);
      game.players.push(player(name||'Player 2',key));
      seat=1;
      turn(game);
    }else{
      if(seat<0) return response({error:'Join the room first.'},403);
      if(input.revision!==room.revision) return response({error:'The battlefield changed. Try again.'},409);
      act(game,seat,input);
    }
    const result=await db.prepare('UPDATE rooms SET state=?, revision=revision+1 WHERE code=? AND revision=?')
      .bind(JSON.stringify(game),code,room.revision).run();
    if(!result.meta.changes) return response({error:'The battlefield changed. Try again.'},409);
    return response({...view(game,seat,room.revision+1),code});
  }catch(error){
    if(error instanceof SyntaxError || error instanceof TypeError) return response({error:'Invalid request.'},400);
    if(error.message.startsWith('D1_') || error.code?.startsWith('SQLITE')) return response({error:'Room storage is unavailable.'},503);
    return response({error:error.message},400);
  }
}
