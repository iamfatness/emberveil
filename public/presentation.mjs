const palettes={
  summon:'#ffd18a', attack:'#ffb264', impact:'#ff9676', boost:'#ffe19c',
  shield:'#a9daff', freeze:'#baf5ff', heal:'#afe5ac', mana:'#d4baff'
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

export function createPresentation(arena,layer){
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const clear=()=>layer.replaceChildren();
  motion.addEventListener('change',()=>{if(motion.matches) clear();});

  function isVisible(node){
    if(!node) return false;
    const {left,top,width,height}=node.getBoundingClientRect();
    return width>0&&height>0&&node.contains(document.elementFromPoint(left+width/2,top+height/2));
  }

  function targetFor(effect){
    const ownResource=arena.querySelector(effect.type==='mana'?'.mana-resource':'.life-resource');
    const ownSeat=Number(arena.querySelector('.your-board')?.dataset.seat);
    if(effect.seat===ownSeat&&(effect.life||effect.type==='mana')&&isVisible(ownResource)) return ownResource;
    const row=arena.querySelector(`[data-seat="${effect.seat}"]`);
    const unit=effect.unit&&row?.querySelector(`[data-id="${CSS.escape(effect.unit)}"]`);
    if(isVisible(unit)) return unit;
    const heading=row?.querySelector('.board-heading');
    if(isVisible(heading)) return heading;
    return arena.querySelector(`.seat-chip[data-opponent="${effect.seat}"]`)??ownResource;
  }

  function show(effect){
    const target=targetFor(effect);
    if(!target) return;
    const {left,top,width,height}=target.getBoundingClientRect();
    const color=palettes[effect.type];
    const burst=document.createElement('span');
    burst.className=`battle-burst burst-${effect.type}`;
    burst.style.setProperty('--burst-color',color);
    burst.style.left=`${left+width/2}px`;
    burst.style.top=`${top+height/2}px`;

    for(let i=0;i<8;i++){
      const spark=document.createElement('i');
      const angle=i*Math.PI/4+.15;
      const distance=i%2===0?62:39;
      spark.style.setProperty('--dx',`${Math.cos(angle)*distance}px`);
      spark.style.setProperty('--dy',`${Math.sin(angle)*distance}px`);
      burst.append(spark);
    }
    if(effect.life){
      const amount=document.createElement('b');
      amount.textContent=effect.life>0?`+${effect.life}`:`−${-effect.life}`;
      burst.append(amount);
    }
    while(layer.childElementCount>=maxBursts*2) layer.firstElementChild.remove();
    layer.append(burst);
    setTimeout(()=>burst.remove(),800);

    if(target.matches('.card')&&['attack','summon','impact'].includes(effect.type)){
      const direction=target.closest('.your-board')?-1:1;
      const transform=effect.type==='attack'?`translateY(${direction*9}px)`:
        effect.type==='summon'?'scale(1.045)':'translateX(4px)';
      target.animate([{transform:'none'},{transform,offset:.3},{transform:'none'}],
        {duration:440,easing:'ease-out'});
    }
  }

  return {clear,play(previous,next){
    if(motion.matches||document.hidden) return;
    for(const effect of battleEffects(previous,next)) show(effect);
  }};
}
