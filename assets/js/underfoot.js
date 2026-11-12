'use strict';
const SIZE = 6;
const DIRECTIONS = { U:[-1,0], D:[1,0], L:[0,-1], R:[0,1] };
const MATCH_AXES = [
  {id:'H',label:'Row',name:'row',back:[0,-1],forward:[0,1],choiceKey:'L'},
  {id:'V',label:'Column',name:'column',back:[-1,0],forward:[1,0],choiceKey:'U'},
  {id:'D1',label:'Diag ↘',name:'down-right diagonal',back:[-1,-1],forward:[1,1],choiceKey:'R'},
  {id:'D2',label:'Diag ↙',name:'down-left diagonal',back:[-1,1],forward:[1,-1],choiceKey:'D'}
];
const NAMES = ['Bare soil','Shoot','Bud','Sunflower','Seed head'];
const START = 0;
function freshGarden() {
  const soil = Array(SIZE * SIZE).fill(0);
  soil[START] = 1;
  return { soil, mouse:START };
}
function offsetPosition(pos, delta) {
  const [dy,dx] = delta;
  const y = Math.floor(pos / SIZE) + dy, x = pos % SIZE + dx;
  return x >= 0 && x < SIZE && y >= 0 && y < SIZE ? y * SIZE + x : -1;
}
function neighbour(pos, direction) {
  return offsetPosition(pos,DIRECTIONS[direction]);
}
function legalMoves(garden) {
  if (garden.soil.includes(4) || matchingTriples(garden).length) return [];
  return Object.keys(DIRECTIONS).filter(d => garden.soil[neighbour(garden.mouse,d)] === 0);
}
function contiguous(soil, origin, delta) {
  const cells = [];
  let pos = offsetPosition(origin,delta);
  while (pos >= 0 && soil[pos] === soil[origin]) {
    cells.push(pos);
    pos = offsetPosition(pos,delta);
  }
  return cells;
}
function matchingTriples(garden) {
  const target=garden.mouse, level=garden.soil[target];
  if(!level || level>=4) return [];
  const triples=[];
  for(const axis of MATCH_AXES) {
    const line=contiguous(garden.soil,target,axis.back).reverse()
      .concat(target,contiguous(garden.soil,target,axis.forward));
    for(let start=0;start<=line.length-3;start++) {
      const cells=line.slice(start,start+3);
      if(cells.includes(target)) triples.push({axis:axis.id,cells});
    }
  }
  return triples;
}
function connectedMatches(garden,axis=null) {
  const cells=new Set();
  for(const group of matchingTriples(garden)) {
    if(!axis || group.axis===axis) group.cells.forEach(pos=>cells.add(pos));
  }
  return cells;
}
function axisChoicePosition(garden,key) {
  const direct=neighbour(garden.mouse,key);
  if(direct>=0) return direct;
  const opposite={L:'R',R:'L',U:'D',D:'U'}[key];
  const fallback=neighbour(garden.mouse,opposite);
  return fallback>=0?fallback:garden.mouse;
}
function primaryDecisionKey(item,mousePos) {
  if(item.pos===mousePos) return null;
  const my=Math.floor(mousePos/SIZE), mx=mousePos%SIZE;
  const cy=Math.floor(item.pos/SIZE), cx=item.pos%SIZE;
  if(item.axis==='H') return cx<mx?'L':'R';
  if(item.axis==='V') return cy<my?'U':'D';
  return cy<my?'U':'D';
}
function decisionKeyPreferences(item,mousePos) {
  const my=Math.floor(mousePos/SIZE), mx=mousePos%SIZE;
  const cy=Math.floor(item.pos/SIZE), cx=item.pos%SIZE;
  const dy=Math.sign(cy-my), dx=Math.sign(cx-mx);
  if(dy<0 && dx<0) return ['U','L','R','D'];
  if(dy<0 && dx>0) return ['U','R','L','D'];
  if(dy>0 && dx<0) return ['D','L','R','U'];
  if(dy>0 && dx>0) return ['D','R','L','U'];
  if(dx<0) return ['L','U','D','R'];
  if(dx>0) return ['R','U','D','L'];
  if(dy<0) return ['U','L','R','D'];
  if(dy>0) return ['D','L','R','U'];
  if(item.axis==='H') return ['L','R','U','D'];
  if(item.axis==='V') return ['U','D','L','R'];
  if(item.axis==='D1') return ['R','D','L','U'];
  return ['D','L','U','R'];
}
function decisionOptions(garden,options,axis=null) {
  if(options.length<=1) return [];
  // More than four overlapping trios exceed the four arrow keys. Narrow the line first.
  if(options.length>4 && !axis) {
    return MATCH_AXES
      .filter(definition=>options.some(group=>group.axis===definition.id))
      .map(definition=>({
        key:definition.choiceKey,
        axis:definition.id,
        label:definition.label,
        name:definition.name,
        pos:axisChoicePosition(garden,definition.choiceKey),
        cells:[...connectedMatches(garden,definition.id)]
      }));
  }
  const groups=options.filter(group=>!axis || group.axis===axis);
  const decisions=groups.map(group=>({...group,pos:group.cells[1],key:null}));
  const used=new Set();
  // Reserve spatial directions first, then assign any centred or conflicting choices.
  for(const item of decisions) {
    const key=primaryDecisionKey(item,garden.mouse);
    if(key && !used.has(key)) {
      item.key=key;
      used.add(key);
    }
  }
  for(const item of decisions) {
    if(item.key) continue;
    item.key=decisionKeyPreferences(item,garden.mouse).find(key=>!used.has(key));
    if(item.key) used.add(item.key);
  }
  return decisions;
}
function plant(garden, direction) {
  if(!Object.hasOwn(DIRECTIONS,direction) || garden.soil.includes(4) || matchingTriples(garden).length) return null;
  const target=neighbour(garden.mouse,direction);
  if(target<0 || garden.soil[target]!==0) return null;
  const soil=garden.soil.slice();
  soil[target]=1;
  return {soil,mouse:target};
}
function mergeTriple(garden,cells) {
  if(!Array.isArray(cells) || cells.length!==3) return null;
  const option=matchingTriples(garden).find(group=>group.cells.every((pos,index)=>pos===cells[index]));
  if(!option) return null;
  const soil=garden.soil.slice();
  const cleared=option.cells.filter(pos=>pos!==garden.mouse);
  for(const pos of cleared) soil[pos]=0;
  soil[garden.mouse]++;
  return {garden:{soil,mouse:garden.mouse},event:{level:soil[garden.mouse],cleared,soil}};
}


const $ = id => document.getElementById(id);
const SVG_NS = 'http://www.w3.org/2000/svg';
const board = $('board');
const DEV_ENDGAME = window.UNDERFOOT_DEV_ENDGAME ?? null;
const SAVE_KEY = 'underfoot.garden.v4';
const LEGACY_SAVE_KEYS = ['underfoot.garden.v3','underfoot.garden.v2','underfoot.garden.v1'];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const directionsByKey = {ArrowUp:'U',ArrowDown:'D',ArrowLeft:'L',ArrowRight:'R',w:'U',a:'L',s:'D',d:'R'};
const arrowAngles = {R:0,D:90,L:180,U:270};
const soils = ['#dfbf90','#e3c496','#dabb8e','#dfbd90','#e4c79c','#d9b98d','#e0c191'];
const plots = [], crops = [];
let garden = freshGarden(), moves = [], history = [], actions = [], record = 1, sound = false;
let choices = [], decisions = [], choiceAxis = null;
let faceLeft = false, busy = false, generation = 0, audio = null;
let gesture = null, suppressClickUntil = 0, lastKeyAt = 0, dialogTrigger = null;
let endStateTimer = null, endStatePresented = null;

function svgUse(id, className) {
  const svg = document.createElementNS(SVG_NS,'svg');
  svg.setAttribute('aria-hidden','true');
  if (className) svg.setAttribute('class',className);
  const use = document.createElementNS(SVG_NS,'use');
  use.setAttribute('href','#'+id);
  svg.append(use);
  return svg;
}
const mouse = document.createElement('span');
mouse.className = 'mouse';
mouse.append(svgUse('fieldmouse'));

function prepareBoard() {
  board.style.setProperty('--board-size',SIZE);
  board.setAttribute('aria-label',SIZE+' by '+SIZE+' garden. Use the arrow keys to walk on bare soil.');
  const grain = '<svg xmlns="http://www.w3.org/2000/svg" width="88" height="78" viewBox="0 0 88 78"><g fill="none" stroke="#987b50" stroke-width="1" stroke-linecap="round" opacity=".59"><path d="m8 14 3-1m50 8 4-1m9 17 1-.3M38 61l3-1m-25 7 1 .2m34-27 2-.6m-23-9 1.3-.8"/></g><g fill="#b29972" opacity=".7"><circle cx="21" cy="21" r=".7"/><circle cx="68" cy="64" r=".9"/><circle cx="42" cy="17" r=".6"/></g></svg>';
  board.style.setProperty('--grain','url("data:image/svg+xml,'+encodeURIComponent(grain)+'")');
  for (let pos=0; pos<SIZE*SIZE; pos++) {
    const tile = document.createElement('button');
    tile.type = 'button'; tile.className = 'plot'; tile.tabIndex = -1;
    tile.dataset.pos = pos;
    tile.style.setProperty('--soil',soils[(pos*11+Math.floor(pos/SIZE)*3)%soils.length]);
    tile.style.setProperty('--grain-x',((pos*17)%88)+'px');
    tile.style.setProperty('--grain-y',((pos*11)%78)+'px');
    const crop = document.createElementNS(SVG_NS,'svg');
    crop.setAttribute('class','crop'); crop.setAttribute('aria-hidden','true');
    const hint = document.createElement('span'); hint.className = 'hintmark';
    const ring = document.createElement('span'); ring.append(svgUse('i-arrow','icon'));
    hint.append(ring); tile.append(crop,hint); board.append(tile);
    plots.push(tile); crops.push(crop);
  }
  const rim = $('rim');
  const parts = ['<defs><g id="grass"><path d="M0 9Q2 4 0-1m1 9Q4 2 9 1M0 9Q-2 4-6 3" fill="none" stroke="#405a37" stroke-width="1.2" stroke-linecap="round"/><path d="M2 8 6 3" stroke="#9da96e" stroke-width="1.1"/></g><g id="smallflower"><g fill="#f2df9e"><ellipse cy="-2.8" rx="1.7" ry="2.5"/><ellipse cy="-2.8" rx="1.7" ry="2.5" transform="rotate(72)"/><ellipse cy="-2.8" rx="1.7" ry="2.5" transform="rotate(144)"/><ellipse cy="-2.8" rx="1.7" ry="2.5" transform="rotate(216)"/><ellipse cy="-2.8" rx="1.7" ry="2.5" transform="rotate(288)"/></g><circle r="1.8" fill="#b98a35"/></g></defs>'];
  for (let edge=0; edge<4; edge++) {
    parts.push('<g transform="rotate('+(edge*90)+' 275 275)">');
    for (let i=0;i<26;i++) {
      const x=9+i*21+(i*7+edge*5)%8, y=5+(i*11+edge*3)%12;
      parts.push('<use href="#grass" transform="translate('+x+' '+y+') rotate('+((i*19+edge*9)%50-25)+') scale('+(.6+(i%4)*.12)+')"/>');
      if ((i+edge*3)%9===3) parts.push('<use href="#smallflower" transform="translate('+(x+4)+' '+y+') scale(.72)"/>');
    }
    parts.push('</g>');
  }
  rim.innerHTML = parts.join('');
}

function positionName(pos) { return String.fromCharCode(65+pos%SIZE)+(Math.floor(pos/SIZE)+1); }
function renderSoil(soil,pos,showLegal) {
  const legal = showLegal ? legalMoves({soil,mouse:pos}) : [];
  for (let i=0;i<plots.length;i++) {
    const tile=plots[i], level=soil[i], crop=crops[i];
    if (crop.dataset.level !== String(level)) {
      crop.replaceChildren();
      if (level) {
        const use=document.createElementNS(SVG_NS,'use'); use.setAttribute('href','#plant'+level);
        crop.append(use);
      }
      crop.dataset.level=level;
    }
    crop.style.visibility='';
    tile.classList.toggle('current',i===pos);
    const dir = legal.find(d=>neighbour(pos,d)===i);
    tile.classList.toggle('legal',Boolean(dir));
    if(dir) tile.querySelector('.hintmark svg').style.transform='rotate('+arrowAngles[dir]+'deg)';
    tile.setAttribute('aria-label',positionName(i)+', '+NAMES[level]+(i===pos?', field mouse':dir?', available step':''));
  }
  if(mouse.parentNode!==plots[pos]) plots[pos].append(mouse);
  mouse.classList.toggle('face-left',faceLeft);
}
function save() {
  if(DEV_ENDGAME) return;
  try { localStorage.setItem(SAVE_KEY,JSON.stringify({v:4,size:SIZE,actions,choiceAxis,record,sound})); }
  catch { /* Play remains available when browser storage is restricted. */ }
}
function restore() {
  try {
    const saved=localStorage.getItem(SAVE_KEY);
    if(saved===null) {
      // Previous rules cannot replay the same path. Retain achievements and sound.
      for(const key of LEGACY_SAVE_KEYS) {
        const legacy=JSON.parse(localStorage.getItem(key));
        if(legacy && [1,2,3].includes(legacy.v) && Number.isInteger(legacy.record) && legacy.record>=1 && legacy.record<=4) {
          record=legacy.record; sound=legacy.sound===true;
          break;
        }
      }
      return;
    }
    const data=JSON.parse(saved);
    if(!data || data.v!==4 || data.size!==SIZE) return;
    if(!Number.isInteger(data.record) || data.record<1 || data.record>4) return;
    record=data.record; sound=data.sound===true;
    if(!Array.isArray(data.actions) || data.actions.length>2000) return;
    let next=freshGarden();
    const past=[], steps=[];
    for(const action of data.actions) {
      let result;
      if(typeof action==='string') {
        result=plant(next,action);
      } else {
        const merged=mergeTriple(next,action);
        if(!merged) return;
        result=merged.garden;
      }
      if(!result) return;
      past.push({garden:next,moves:steps.slice()});
      if(typeof action==='string') steps.push(action);
      next=result;
    }
    garden=next; history=past; moves=steps; actions=data.actions;
    choiceAxis=MATCH_AXES.some(axis=>axis.id===data.choiceAxis) && matchingTriples(garden).length>4?data.choiceAxis:null;
    record=Math.max(record,...next.soil);
    updateFacing();
  } catch { /* An unreadable save starts a fresh garden. */ }
}
function applyDeveloperEndState() {
  if(!DEV_ENDGAME) return false;

  if(!['win','stuck'].includes(DEV_ENDGAME)) {
    console.warn('UNDERFOOT_DEV_ENDGAME must be null, \"win\", or \"stuck\".');
    return false;
  }

  const previous=freshGarden();
  history=[{garden:previous,moves:[]}];
  actions=[];
  choiceAxis=null;
  faceLeft=false;
  moves=['R'];

  if(DEV_ENDGAME==='win') {
    const soil=Array(SIZE*SIZE).fill(0);
    const mouse=Math.floor((SIZE*SIZE)/2)-1;
    soil[mouse]=4;
    garden={soil,mouse};
    record=4;
    return true;
  }

  const soil=Array(SIZE*SIZE).fill(0);
  soil[0]=1;
  soil[1]=2;
  soil[SIZE]=2;
  garden={soil,mouse:0};
  return true;
}

function updateFacing() {
  faceLeft=moves.slice().reverse().find(d=>d==='L'||d==='R')==='L';
}
function updateHud() {
  $('moves').textContent=moves.length;
  $('best').textContent=NAMES[record];
  $('undo').disabled=!history.length;
  document.body.classList.toggle('earned',record===4);
  $('statusbar').classList.toggle('win',garden.soil.includes(4));
}
function moveMessage(last) {
  if(garden.soil.includes(4)) return 'A seed head in '+moves.length+' moves. A sunflower now grows by the gate.';
  if(!legalMoves(garden).length) return 'The mouse is tucked into a corner. Undo a step to find another way through.';
  if(!moves.length) return 'Walk right twice to grow your first bud.';
  if(last) return NAMES[last]+' grown.';
  if(moves.length===1 && moves[0]==='R') return 'Two shoots in a row. One more step right will make a bud.';
  if(moves.length===1 && moves[0]==='D') return 'Two shoots in a column. One more step down will make a bud.';
  if(legalMoves(garden).length===1) return 'One way out. Look for a line that will open more soil.';
  return 'Leave the mouse a way through.';
}
function status(message) { $('status').textContent=message; }
function soundButton() {
  $('sound').setAttribute('aria-pressed',String(sound));
  $('sound').setAttribute('aria-label',sound?'Turn sound off':'Turn sound on');
  $('sound').title=sound?'Turn sound off':'Turn sound on';
  $('sound').querySelector('use').setAttribute('href',sound?'#i-sound':'#i-mute');
  $('sound').querySelector('span').textContent=sound?'Sound on':'Sound off';
}
function playTone(level) {
  if(!sound) return;
  try {
    const Audio=window.AudioContext || window.webkitAudioContext;
    if(!Audio) return;
    if(!audio) audio=new Audio();
    if(audio.state==='suspended') audio.resume().catch(()=>{});
    const osc=audio.createOscillator(), gain=audio.createGain(), t=audio.currentTime;
    const length=level===1?.13:.38;
    osc.type='sine';osc.frequency.setValueAtTime([0,220,392,523.25,659.25][level],t);
    gain.gain.setValueAtTime(.0001,t);
    gain.gain.exponentialRampToValueAtTime(level===1?.045:.105,t+.015);
    gain.gain.exponentialRampToValueAtTime(.0001,t+length);
    osc.connect(gain);gain.connect(audio.destination);osc.start(t);osc.stop(t+length+.03);
    osc.onended=()=>{osc.disconnect();gain.disconnect();};
  } catch { /* Audio is optional. */ }
}
const sleep = ms => new Promise(resolve=>setTimeout(resolve,ms));
function motion(element,frames,options) {
  if(!reduceMotion.matches && element.animate) return element.animate(frames,options);
  return null;
}
function clearEndStatePresentation() {
  if(endStateTimer!==null) {
    clearTimeout(endStateTimer);
    endStateTimer=null;
  }
  endStatePresented=null;
  board.querySelectorAll('.harvest-seed,.harvest-bloom').forEach(el=>el.remove());
}
function stopMotion() {
  generation++; busy=false;
  clearEndStatePresentation();
  for(const anim of board.getAnimations ? board.getAnimations({subtree:true}) : []) anim.cancel();
  board.querySelectorAll('.ghost,.soil-flash').forEach(el=>el.remove());
}
function hop(from,to) {
  const a=plots[from].getBoundingClientRect(), b=plots[to].getBoundingClientRect();
  const dx=a.left-b.left, dy=a.top-b.top;
  motion(mouse,[{transform:'translate('+dx+'px,'+dy+'px)'},{transform:'translate('+(dx*.45)+'px,'+(dy*.45-8)+'px)',offset:.55},{transform:'translate(0,0)'}],{duration:175,easing:'ease-out'});
}
function gather(event,target) {
  const frame=board.getBoundingClientRect(), dest=plots[target].getBoundingClientRect();
  for(const cell of event.cleared) {
    const rect=plots[cell].getBoundingClientRect();
    const ghost=svgUse('plant'+(event.level-1),'ghost');
    Object.assign(ghost.style,{left:(rect.left-frame.left)+'px',top:(rect.top-frame.top)+'px',width:rect.width+'px',height:rect.height+'px'});
    board.append(ghost); crops[cell].style.visibility='hidden';
    motion(ghost,[{transform:'translate(0,0) scale(1)',opacity:1},{transform:'translate('+(dest.left-rect.left)+'px,'+(dest.top-rect.top)+'px) scale(.53)',opacity:.1}],{duration:165,fill:'forwards',easing:'ease-in'});
  }
}
function sprout(target,large) {
  motion(crops[target],[{transform:'scale(.76,.63)'},{transform:'scale(1.09,1.12)',offset:.65},{transform:'scale(1)'}],{duration:large?280:155,easing:'ease-out'});
  if(large&&!reduceMotion.matches) {
    const flash=document.createElement('span'); flash.className='soil-flash'; plots[target].append(flash);
    motion(flash,[{opacity:.9,transform:'scale(.5)'},{opacity:0,transform:'scale(1.1)'}],{duration:310});
    setTimeout(()=>flash.remove(),310);
  }
}
function highlightChoice(cells=[]) {
  plots.forEach((tile,pos)=>tile.classList.toggle('selected-match',cells.includes(pos)));
}
function choiceButtonOffset(index,count) {
  if(count===2) return [[-17,0],[17,0]][index];
  if(count===3) return [[0,-16],[-18,14],[18,14]][index];
  if(count>=4) return [[-17,-15],[17,-15],[-17,15],[17,15]][index] || [0,0];
  return [0,0];
}
function renderDecisions() {
  board.querySelectorAll('.choice-arrow').forEach(button=>button.remove());
  const frame=board.getBoundingClientRect();
  for(const option of decisions) {
    const rect=plots[option.pos].getBoundingClientRect();
    const button=document.createElement('button');
    button.type='button'; button.className='choice-arrow axis-'+option.axis;
    const sameCentre=decisions.filter(item=>item.pos===option.pos);
    const sameIndex=sameCentre.indexOf(option);
    const [offsetX,offsetY]=choiceButtonOffset(sameIndex,sameCentre.length);
    const anchorY=sameCentre.length>1?.5:.76;
    button.style.left=((rect.left-frame.left+rect.width/2)/frame.width*100)+'%';
    button.style.top=((rect.top-frame.top+rect.height*anchorY)/frame.height*100)+'%';
    button.style.marginLeft=offsetX+'px';
    button.style.marginTop=offsetY+'px';
    const arrow=svgUse('i-arrow','icon'); arrow.style.transform='rotate('+arrowAngles[option.key]+'deg)';
    button.append(arrow);
    const keyNames={L:'Left',R:'Right',U:'Up',D:'Down'};
    const lineName=option.name || option.label?.toLowerCase();
    const description=option.label?'choose '+lineName:'grow '+option.cells.map(positionName).join(', ');
    button.setAttribute('aria-label',keyNames[option.key]+': '+description);
    button.title=keyNames[option.key]+': '+description;
    if(option.label) button.append(document.createTextNode(option.label));
    button.addEventListener('pointerenter',()=>highlightChoice(option.cells));
    button.addEventListener('pointerleave',()=>highlightChoice());
    button.addEventListener('focus',()=>highlightChoice(option.cells));
    button.addEventListener('blur',()=>highlightChoice());
    button.addEventListener('click',event=>{event.stopPropagation();chooseDirection(option.key);});
    board.append(button);
  }
}
function currentEndState() {
  if(garden.soil.includes(4)) return 'win';
  if(moves.length && matchingTriples(garden).length===0 && legalMoves(garden).length===0) return 'stuck';
  return null;
}
function harvestBloom(pos,delay=0) {
  const bloom=svgUse('plant3','harvest-bloom');
  plots[pos].append(bloom);
  if(reduceMotion.matches || !Element.prototype.animate) {
    bloom.style.opacity='1';
    return;
  }
  motion(
    bloom,
    [
      {opacity:0,transform:'scale(.18) translateY(8px)'},
      {opacity:1,transform:'scale(1.08) translateY(-2px)',offset:.72},
      {opacity:1,transform:'scale(1) translateY(0)'}
    ],
    {duration:390,delay,fill:'forwards',easing:'cubic-bezier(.2,.8,.3,1)'}
  );
}
async function celebrateHarvest(ticket) {
  const sourceRect=plots[garden.mouse].getBoundingClientRect();
  const boardRect=board.getBoundingClientRect();
  const sourceX=sourceRect.left-boardRect.left+sourceRect.width*.58;
  const sourceY=sourceRect.top-boardRect.top+sourceRect.height*.42;

  if(!reduceMotion.matches && Element.prototype.animate) {
    for(let pos=0;pos<plots.length;pos++) {
      const rect=plots[pos].getBoundingClientRect();
      const targetX=rect.left-boardRect.left+rect.width/2;
      const targetY=rect.top-boardRect.top+rect.height/2;
      const dx=targetX-sourceX;
      const dy=targetY-sourceY;
      const arc=18+(pos%5)*5;

      const seed=document.createElement('span');
      seed.className='harvest-seed';
      seed.style.left=(sourceX-3)+'px';
      seed.style.top=(sourceY-2)+'px';
      board.append(seed);

      motion(
        seed,
        [
          {opacity:0,transform:'translate(0,0) rotate(-20deg)'},
          {opacity:1,transform:'translate(0,0) rotate(0deg)',offset:.08},
          {opacity:1,transform:'translate('+(dx*.52)+'px,'+(dy*.42-arc)+'px) rotate('+(130+(pos%4)*45)+'deg)',offset:.55},
          {opacity:.92,transform:'translate('+dx+'px,'+dy+'px) rotate('+(260+(pos%6)*35)+'deg)'}
        ],
        {
          duration:540+(pos%7)*32,
          delay:(pos%6)*18,
          fill:'forwards',
          easing:'cubic-bezier(.2,.72,.3,1)'
        }
      );
    }

    await sleep(790);
    if(ticket!==generation) return false;
    board.querySelectorAll('.harvest-seed').forEach(el=>el.remove());
  }

  const originY=Math.floor(garden.mouse/SIZE);
  const originX=garden.mouse%SIZE;
  const order=[...Array(plots.length).keys()].sort((a,b)=>{
    const ay=Math.floor(a/SIZE),ax=a%SIZE;
    const by=Math.floor(b/SIZE),bx=b%SIZE;
    return (Math.abs(ay-originY)+Math.abs(ax-originX))-(Math.abs(by-originY)+Math.abs(bx-originX));
  });

  order.forEach((pos,index)=>harvestBloom(pos,reduceMotion.matches?0:index*18));

  if(!reduceMotion.matches) await sleep(720);
  return ticket===generation;
}



function openEndStateDialog(state) {
  if(state==='win') {
    openDialog(
      'You won! 🌻',
      ['A Seed head matured in time for harvest. Its seeds have spread across the garden, and the whole field is in bloom.'],
      [['Play again',newGarden,true],['Undo',undoMove,false]]
    );
    return;
  }
	
  openDialog(
  	'Mouse is stuck. Try again.',
  	['No path remains to reach a Seed head before harvest.'],
  	[['Undo',undoMove,true],['New garden',newGarden,false]]
	); 
}

async function presentEndState(state,ticket) {
  endStateTimer=null;
  if(ticket!==generation || currentEndState()!==state || endStatePresented===state) return;

  while($('dialog').open) {
    await sleep(180);
    if(ticket!==generation || currentEndState()!==state) return;
  }

  endStatePresented=state;

  if(state==='win') {
    status('Seeds are spreading…');
    const completed=await celebrateHarvest(ticket);
    if(!completed || currentEndState()!==state) return;
    status('The field is ready for harvest.');
  }

  while($('dialog').open) {
    await sleep(180);
    if(ticket!==generation || currentEndState()!==state) return;
  }

  if(ticket!==generation || currentEndState()!==state) return;
  openEndStateDialog(state);
}
function scheduleEndState() {
  const state=currentEndState();
  if(!state || busy || endStateTimer!==null || endStatePresented===state) return;

  const ticket=generation;
  const delay=state==='win' ? 620 : 720;

  endStateTimer=setTimeout(()=>presentEndState(state,ticket),delay);
}

function refresh(lastLevel) {
  choices=matchingTriples(garden);
  decisions=!busy?decisionOptions(garden,choices,choiceAxis):[];
  renderSoil(garden.soil,garden.mouse,!choices.length && !busy);
  const connected=decisions.length?connectedMatches(garden):new Set();
  for(let pos=0;pos<plots.length;pos++) {
    plots[pos].classList.toggle('match-option',connected.has(pos));
    plots[pos].classList.remove('selected-match');
    plots[pos].removeAttribute('aria-pressed');
    if(connected.has(pos)) plots[pos].setAttribute('aria-label',plots[pos].getAttribute('aria-label')+', matching plant');
  }
  renderDecisions();
  $('selection-detail').textContent=decisions.map(option=>option.key+': '+(option.label || option.cells.map(positionName).join(', '))).join('. ');
  updateHud();
  if(busy || choices.length===1) status('Growing…');
  else if(decisions.some(option=>option.label)) status('Choose a line with a shown arrow.');
  else if(decisions.length) status('Choose three. Press or tap a shown arrow.');
  else status(moveMessage(lastLevel));

  if(!busy && !choices.length) scheduleEndState();
}
function chooseDirection(direction) {
  if(busy || $('dialog').open) return;
  const option=decisions.find(item=>item.key===direction);
  if(!option) return;
  if(option.label) {
    choiceAxis=option.axis; refresh(); save(); board.focus({preventScroll:true});
    return;
  }
  resolveGrowth(option.cells);
}
function remember(action) {
  history.push({garden,moves:moves.slice()});
  actions.push(action);
}
function walk(direction) {
  if($('dialog').open || busy) return;
  if(decisions.length) { chooseDirection(direction); return; }
  const result=plant(garden,direction);
  if(!result) {
    if(legalMoves(garden).length) status('Choose a neighbouring bare plot.');
    return;
  }
  const previous=garden;
  remember(direction); moves.push(direction); garden=result; choiceAxis=null;
  if(direction==='L'||direction==='R') faceLeft=direction==='L';
  refresh(); save(); hop(previous.mouse,garden.mouse); sprout(garden.mouse,false); playTone(1);
  resolveGrowth();
}
async function resolveGrowth(chosenCells=null) {
  if(busy) return;
  const options=matchingTriples(garden);
  if(!chosenCells && options.length!==1) { refresh(); return; }
  const ticket=++generation;
  let cells=chosenCells || options[0].cells;
  busy=true;
  if(document.activeElement?.classList.contains('choice-arrow')) board.focus({preventScroll:true});
  while(cells) {
    const result=mergeTriple(garden,cells);
    if(!result) break;
    const target=garden.mouse;
    remember(cells.slice()); garden=result.garden; choiceAxis=null;
    record=Math.max(record,...garden.soil); save();
    board.querySelectorAll('.choice-arrow').forEach(button=>button.remove());
    decisions=[]; highlightChoice();
    plots.forEach(tile=>tile.classList.remove('match-option'));
    status('Growing…'); updateHud();
    if(!reduceMotion.matches && Element.prototype.animate) {
      gather(result.event,target); await sleep(165);
      if(ticket!==generation) return;
      board.querySelectorAll('.ghost').forEach(el=>el.remove());
    }
    if(ticket!==generation) return;
    renderSoil(garden.soil,target,false); sprout(target,true); playTone(result.event.level);
    const next=matchingTriples(garden);
    if(next.length!==1) {
      busy=false; refresh(result.event.level); return;
    }
    cells=next[0].cells;
  }
  busy=false; refresh();
}
function undoMove() {
  if(!history.length) return;
  stopMotion();
  // Skip forced growth snapshots so Undo cannot immediately redo the same merge.
  let previous;
  do {
    previous=history.pop(); actions.pop();
  } while(history.length && matchingTriples(previous.garden).length===1);
  garden=previous.garden; moves=previous.moves; choiceAxis=null;
  updateFacing(); refresh(); save();
  resolveGrowth();
}
function newGarden() {
  stopMotion(); garden=freshGarden(); history=[]; moves=[]; actions=[]; choiceAxis=null; faceLeft=false;
  refresh(); save();
}
function closeDialog() {
  $('dialog').close();
}
function openDialog(title,paragraphs,actions) {
  dialogTrigger=document.activeElement;
  $('dialog-title').textContent=title;
  $('dialog-body').replaceChildren(...paragraphs.map(value=>{const p=document.createElement('p');p.textContent=value;return p;}));
  $('dialog-actions').replaceChildren();
  for (const [label,handler,primary] of actions) {
    const button=document.createElement('button');
    button.type='button';button.className='btn'+(primary?' solid':'');button.textContent=label;
    button.addEventListener('click',()=>{closeDialog();handler?.();});$('dialog-actions').append(button);
  }
  $('dialog').showModal();$('dialog-actions').firstElementChild?.focus();
}
$('close').onclick=closeDialog;
$('dialog').addEventListener('click',event=>{if(event.target!==$('dialog')) return;const r=$('dialog').getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom) closeDialog();});
$('dialog').addEventListener('close',()=>{const target=dialogTrigger&&dialogTrigger.isConnected?dialogTrigger:board;target.focus({preventScroll:true});});
$('help').onclick=()=>openDialog('How to play',[
  'Walk onto bare soil to plant a shoot. The mouse only walks up, down, left, or right. Use the arrow keys or WASD, tap a neighbouring plot, or swipe across the bed.',
  'A single matching trio grows automatically, including each forced step in a cascade. Exactly three matching plants combine each time, horizontally, vertically, or diagonally.',
  'When several trios are possible, matching plants glow. Each shown arrow sits at the centre of its trio. Press that arrow key, swipe that direction, or tap the arrow to grow it immediately. Hover or focus an arrow to preview the exact three.',
  'At crowded crossings with more than four choices, choose a line first, then a trio. Escape returns to the line choice. Grow a seed head to win.',
  'If the mouse runs out of neighbouring bare soil, the garden ends. Undo to find another route or start a new garden.',
  'Undo or Z returns to the previous move or choice, including its automatic growth. You can undo all the way to the beginning.'
],[['Back to the garden',null,true]]);
$('restart').onclick=()=>{
  if(!moves.length || garden.soil.includes(4)) { newGarden(); return; }
  openDialog('Start a new garden?',['Your current path will be cleared. Your best plant stays in the field guide.'],[['Keep playing',null,true],['New garden',newGarden,false]]);
};
$('undo').onclick=undoMove;
$('sound').onclick=()=>{sound=!sound;soundButton();save();if(sound) playTone(2);};
document.addEventListener('keydown',event=>{
  if($('dialog').open || event.altKey || event.shiftKey) return;
  const key=event.key.length===1?event.key.toLowerCase():event.key;
  if(key==='z') {event.preventDefault();undoMove();return;}
  if(event.metaKey||event.ctrlKey) return;
  if(key==='Escape' && choiceAxis) { event.preventDefault(); choiceAxis=null; refresh(); save(); return; }
  const direction=directionsByKey[key];
  if(!direction) return;
  event.preventDefault();
  const now=performance.now();
  if(event.repeat && (busy || decisions.length || now-lastKeyAt<135)) return;
  lastKeyAt=now;walk(direction);
});
board.addEventListener('click',event=>{
  if(performance.now()<suppressClickUntil) return;
  const tile=event.target.closest('.plot');
  if(!tile) return;
  const pos=Number(tile.dataset.pos);
  if(busy) return;
  if(decisions.length) return;
  const direction=Object.keys(DIRECTIONS).find(d=>neighbour(garden.mouse,d)===pos);
  if(direction) walk(direction);
  else if(legalMoves(garden).length) status('Tap a neighbouring bare plot to take one step.');
});
board.addEventListener('pointerdown',event=>{
  if(!event.isPrimary || event.button!==0 || event.target.closest('.choice-arrow')) return;
  gesture={x:event.clientX,y:event.clientY,id:event.pointerId};
});
window.addEventListener('pointerup',event=>{
  if(!gesture||event.pointerId!==gesture.id) return;
  const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;gesture=null;
  if(Math.max(Math.abs(dx),Math.abs(dy))<Math.max(18,board.clientWidth*.055)) return;
  suppressClickUntil=performance.now()+350;
  walk(Math.abs(dx)>Math.abs(dy)?(dx>0?'R':'L'):(dy>0?'D':'U'));
});
window.addEventListener('pointercancel',()=>{gesture=null;});
window.addEventListener('blur',()=>{gesture=null;});
prepareBoard();restore();applyDeveloperEndState();soundButton();
refresh();resolveGrowth();
