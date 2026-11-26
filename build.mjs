import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
const types={'/':'text/html; charset=utf-8','/style.css':'text/css','/app.js':'text/javascript','/game.mjs':'text/javascript','/citadel.webp':'image/webp'};
const assets={};
for(const [path,type] of Object.entries(types)){
  const file=path==='/'?'public/index.html':path==='/game.mjs'?'src/game.mjs':'public'+path;
  assets[path]=[type,(await readFile(file)).toString('base64')];
}
const sources=await Promise.all(['game','api','worker'].map(file=>readFile('src/'+file+'.mjs','utf8')));
const worker='const assets = '+JSON.stringify(assets)+';\n'+sources.map(source=>source.replace(/^import .*\n/gm,'')).join('\n');
await Promise.all(['dist/server','dist/.openai'].map(directory=>mkdir(directory,{recursive:true})));
await Promise.all([
  writeFile('dist/server/index.js',worker),
  copyFile('.openai/hosting.json','dist/.openai/hosting.json')
]);
