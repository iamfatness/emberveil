const palettes={
  summon:'#ffd18a', attack:'#ffb264', impact:'#ff9676', boost:'#ffe19c',
  shield:'#a9daff', freeze:'#baf5ff', heal:'#afe5ac', mana:'#d4baff',
  cast:'#dfb3ff', block:'#c6e5ff', draw:'#b5d8ec', fall:'#cba39a', quest:'#ffe19c',
  growth:'#c4e7a4', turn:'#eac79d', choice:'#c4b5de', truce:'#addccc', result:'#ffdb93'
};
const maxBursts=8;

export function battleEffects(previous,next){
  if(!previous?.started||!next.started||next.revision<=previous.revision) return [];
  const effects=[];
  const details=[];
  const effect=next.effect;
  if(effect&&Object.hasOwn(palettes,effect.type)){
    effects.push({...effect});
    if(effect.type==='attack'){
      for(const strike of next.combat?.strikes??[]){
        if(strike.unit!==effect.unit) details.push({type:'attack',seat:effect.seat,unit:strike.unit});
      }
    }
  }
  for(const [seat,player] of next.players.entries()){
    const before=previous.players[seat];
    if(!before) continue;
    const life=Math.max(0,player.life)-Math.max(0,before.life);
    if(life){
      const type=life<0?'impact':'heal';
      const matching=effects.find(item=>item.seat===seat&&!item.unit&&item.type===type);
      if(matching) matching.life=life;
      else effects.push({type,seat,life});
    }
    const onBoard=new Set(before.board.map(unit=>unit.id));
    for(const unit of player.board){
      if(!onBoard.has(unit.id)&&!(effect?.type==='summon'&&effect.unit===unit.id)){
        details.push({type:'summon',seat,unit:unit.id});
      }
    }
  }
  return effects.concat(details).slice(0,maxBursts);
}

export function battleMoves(previous,next){
  if(!previous||!next||next.revision<=previous.revision) return [];
  if(next.moves){
    const last=previous.moves?.at(-1)?.id??0;
    return next.moves.filter(move=>move.id>last);
  }
  const effects=battleEffects(previous,next);
  return effects.length?[{effects}]:[];
}

export function createPresentation(arena,layer,status,cards){
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const queue=[];
  let beatTimer,statusTimer;
  function clear(){
    queue.length=0;
    clearTimeout(beatTimer);
    clearTimeout(statusTimer);
    beatTimer=undefined;
    layer.replaceChildren();
    status.hidden=true;
    status.replaceChildren();
  }
  document.addEventListener('visibilitychange',()=>{if(document.hidden) clear();});
  motion.addEventListener('change',()=>{if(motion.matches) layer.replaceChildren();});

  function center(node){
    if(!node) return;
    const {left,top,width,height}=node.getBoundingClientRect();
    const x=left+width/2,y=top+height/2;
    if(width>0&&height>0&&node.contains(document.elementFromPoint(x,y))) return {x,y,node};
  }

  function capture(){
    const positions=new Map();
    if(motion.matches||document.hidden) return positions;
    const remember=(key,node)=>{
      const point=center(node);
      if(point) positions.set(key,point);
    };
    const own=arena.querySelector('.your-board')?.dataset.seat;
    arena.querySelectorAll('.seat-chip[data-opponent]').forEach(node=>remember(`seat:${node.dataset.opponent}`,node));
    arena.querySelectorAll('.board-row[data-seat]').forEach(row=>{
      const seat=row.dataset.seat;
      remember(`seat:${seat}`,row.querySelector('.board-heading'));
      row.querySelectorAll('.card[data-id]').forEach(node=>remember(`${seat}:${node.dataset.id}`,node));
    });
    arena.querySelectorAll('.hand-dock .card[data-id]').forEach(node=>remember(`hand:${own}:${node.dataset.id}`,node));
    for(const [key,selector] of Object.entries({
      life:'.life-resource',mana:'.mana-resource',draw:'.hand-resources,[data-action="redraw"]',
      quest:'[data-panel="story"],.ash-gate h2',growth:'[data-panel="tree"]',truce:'[data-panel="table"]',
      result:'[data-panel="result"]',turn:'#status'
    })) remember(key,arena.querySelector(selector));
    return positions;
  }

  function pointFor(effect,before,after,own){
    const {seat,unit,type,fromHand}=effect;
    if(fromHand&&seat===own&&before.has(`hand:${seat}:${unit}`)) return before.get(`hand:${seat}:${unit}`);
    const key=`${seat}:${unit}`;
    if(unit&&(after.has(key)||before.has(key))) return after.get(key)??before.get(key);
    if(['quest','truce','result'].includes(type)&&after.has(type)) return after.get(type);
    if(seat===own){
      const resource=type==='heal'||type==='impact'?'life':type;
      if(after.has(resource)) return after.get(resource);
    }
    return after.get(`seat:${seat}`)??before.get(`seat:${seat}`)??after.get('turn');
  }

  function addEffect(node){
    while(layer.childElementCount>=24) layer.firstElementChild.remove();
    layer.append(node);
    setTimeout(()=>node.remove(),850);
  }

  function show(effect,before,after,own){
    const point=pointFor(effect,before,after,own);
    const spell=effect.type==='cast'?cards[effect.kind]:null;
    const color=spell?.reaction?palettes[spell.reaction]:spell?.freeze?palettes.freeze:
      spell?.heal?palettes.heal:spell?.ramp?palettes.mana:spell?.damage?palettes.impact:palettes[effect.type];
    if(!point||!color) return;
    const {x,y,node}=point;
    const target=effect.targetSeat===undefined?null:pointFor({type:'impact',seat:effect.targetSeat,unit:effect.targetUnit},before,after,own);
    if(target&&Math.hypot(target.x-x,target.y-y)>16){
      const line=document.createElement('span');
      line.className=`battle-trail trail-${effect.type}`;
      line.style.setProperty('--burst-color',color);
      line.style.left=`${x}px`;
      line.style.top=`${y}px`;
      line.style.width=`${Math.hypot(target.x-x,target.y-y)}px`;
      line.style.rotate=`${Math.atan2(target.y-y,target.x-x)}rad`;
      addEffect(line);
    }
    if(cards[effect.kind]&&['cast','fall'].includes(effect.type)&&!(effect.type==='fall'&&!before.has(`${effect.seat}:${effect.unit}`))){
      const portrait=document.createElement('img');
      portrait.className=`battle-portrait portrait-${effect.type}`;
      portrait.src=`/art/${cards[effect.kind].art??effect.kind}.webp`;
      portrait.alt='';
      portrait.style.left=`${x}px`;
      portrait.style.top=`${y}px`;
      portrait.style.setProperty('--burst-color',color);
      addEffect(portrait);
    }
    const burst=document.createElement('span');
    burst.className=`battle-burst burst-${effect.type}`;
    burst.style.setProperty('--burst-color',color);
    burst.style.left=`${x}px`;
    burst.style.top=`${y}px`;

    for(let i=0;i<6;i++){
      const spark=document.createElement('i');
      const angle=i*Math.PI/3+.15;
      const distance=i%2===0?62:39;
      spark.style.setProperty('--dx',`${Math.cos(angle)*distance}px`);
      spark.style.setProperty('--dy',`${Math.sin(angle)*distance}px`);
      burst.append(spark);
    }
    const value=effect.amount??effect.life;
    if(value){
      const amount=document.createElement('b');
      amount.textContent=value>0?`+${value}`:String(value);
      burst.append(amount);
    }
    addEffect(burst);

    if(node?.isConnected&&node.matches('.card')&&['attack','block','summon','impact'].includes(effect.type)){
      const direction=node.closest('.your-board')?-1:1;
      const transform=effect.type==='attack'?`translateY(${direction*12}px)`:
        effect.type==='block'?`translateY(${direction*5}px) scale(1.035)`:
        effect.type==='summon'?'scale(1.07)':'translateX(4px)';
      node.animate([{transform:'none'},{transform,offset:.3},{transform:'none'}],
        {duration:440,easing:'ease-out'});
    }
  }

  function step(){
    const entry=queue.shift();
    if(!entry){beatTimer=undefined;return;}
    const {move,before,own,actor}=entry;
    if(move.cue){
      clearTimeout(statusTimer);
      status.hidden=false;
      status.dataset.cue=move.cue.type;
      status.style.setProperty('--cue-color',palettes[move.cue.type]);
      const heading=document.createElement('strong');
      heading.textContent=move.cue.label;
      status.replaceChildren(heading);
      if(actor&&['cast','summon','attack','block','growth','truce'].includes(move.cue.type)){
        const name=document.createElement('small');
        name.textContent=actor;
        status.append(name);
      }
      statusTimer=setTimeout(()=>{status.hidden=true;},2600);
    }
    if(!motion.matches){
      const after=capture();
      const lead=move.effects.filter(effect=>['attack','cast','block'].includes(effect.type));
      const consequences=move.effects.filter(effect=>!lead.includes(effect));
      lead.slice(0,maxBursts).forEach(effect=>show(effect,before,after,own));
      if(lead.length&&consequences.length){
        beatTimer=setTimeout(()=>{
          if(!motion.matches) consequences.slice(0,maxBursts).forEach(effect=>show(effect,before,capture(),own));
          beatTimer=setTimeout(step,queue.length>5?90:230);
        },queue.length>5?80:160);
        return;
      }
      consequences.slice(0,maxBursts).forEach(effect=>show(effect,before,after,own));
    }
    beatTimer=setTimeout(step,queue.length>5?110:320);
  }

  return {clear,capture,play(previous,next,before=new Map()){
    if(document.hidden) return;
    for(const move of battleMoves(previous,next)){
      queue.push({move,before,own:next.seat,actor:next.players[move.cue?.seat]?.name});
    }
    if(!beatTimer&&queue.length) step();
  }};
}
