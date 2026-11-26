import {api} from './api.mjs';
import {assets} from './assets.mjs';
export default {
  async fetch(request, env){
    const path=new URL(request.url).pathname;
    if(path.startsWith('/api/')) return api(request,env.DB);
    const asset=Object.hasOwn(assets,path)?assets[path]:null;
    if(!asset) return new Response('Page not found',{status:404});
    return new Response(Uint8Array.from(atob(asset[1]),c=>c.charCodeAt(0)),{headers:{'Content-Type':asset[0]}});
  }
};
