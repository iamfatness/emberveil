import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
const types={'/':'text/html; charset=utf-8','/style.css':'text/css','/app.js':'text/javascript','/game.mjs':'text/javascript','/citadel.webp':'image/webp'};
const assets={};
await mkdir('dist/server',{recursive:true});
for(const [path,type] of Object.entries(types)){
  const file=path==='/'?'public/index.html':path==='/game.mjs'?'src/game.mjs':'public'+path;
  try{assets[path]=[type,(await readFile(file)).toString('base64')];}
  catch(error){if(path!=='/citadel.webp'||error.code!=='ENOENT') throw error;}
}
await Promise.all([
  writeFile('dist/server/assets.mjs','export const assets = '+JSON.stringify(assets)+';\n'),
  copyFile('src/worker.mjs','dist/server/index.js'),
  copyFile('src/api.mjs','dist/server/api.mjs'),
  copyFile('src/game.mjs','dist/server/game.mjs')
]);
