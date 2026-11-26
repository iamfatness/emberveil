import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import worker from './dist/server/index.js';
const database=new DatabaseSync(process.env.EMBERVEIL_DB||'emberveil.sqlite');
const DB={prepare(sql){
  const statement=database.prepare(sql);
  return {bind(...args){
    return {first:()=>statement.get(...args),run:()=>({meta:statement.run(...args)})};
  }};
}};
createServer(async (incoming,outgoing)=>{
  try{
    const body=incoming.method==='GET'||incoming.method==='HEAD'?undefined:incoming;
    const request=new Request('http://localhost'+incoming.url,{method:incoming.method,headers:incoming.headers,body,duplex:'half'});
    const result=await worker.fetch(request,{DB});
    outgoing.writeHead(result.status,Object.fromEntries(result.headers));
    outgoing.end(Buffer.from(await result.arrayBuffer()));
  }catch{
    outgoing.writeHead(500).end('Server error');
  }
}).listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('Emberveil server ready'));
