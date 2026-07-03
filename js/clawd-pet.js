/* ==========================================================================
   clawd-pet.js — Clawd 主桌宠(完整状态机)
   素材:assets/clawd/clawd-<状态名>.svg(仅 conducting 为 GIF)。
   要点:
   - SVG 文本 fetch 后注入容器的 Shadow DOM —— 各素材内部的 keyframes/class
     大量重名,Shadow DOM 隔离后互不冲突;
   - 含 #eyes-js 钩子的素材支持"眼神跟随鼠标";
   - 状态机:待机轮播 / 点击反应(连点会生气)/ 拖拽 / 挂机打盹→睡着 / 唤醒;
   - window.__clawdDebug.set('状态名') 可手动切换任意状态,便于调试验证。
   ========================================================================== */

import { getLang } from './i18n.js';

/* ---------- 可调参数 ---------- */
const ASSET_DIR = 'assets/clawd/';
const IDLE_STATE = 'idle-living';            // 常驻待机动画
const FLOURISH_POOL = [                      // 待机轮播池(随机抽取)
  'idle-look','idle-reading','headphones-groove',
  'working-typing','working-thinking','working-sweeping','working-juggling',
  'working-building','working-carrying','working-debugger',
  'working-wizard','working-ultrathink',
  'coffee-hand','coffee-head-flip','conducting',
];
const CLICK_POOL = ['happy','react-double-jump','aegyo-shy'];  // 普通点击反应
const FLOURISH_DELAY = [12000, 25000];       // 两次轮播的间隔范围 ms
const FLOURISH_LEN   = [6000, 10000];        // 单次轮播播放时长范围 ms
const REACT_LEN      = 2600;                 // 点击反应时长 ms
const WAKE_LEN       = 1500;                 // wake.svg 一次性动画时长 ms
const DOZE_AFTER     = 45000;                // 无操作 → 打盹 ms
const SLEEP_AFTER    = 120000;               // 无操作 → 睡着 ms
const RAPID_CLICKS   = 4;                    // 3 秒内连点该次数 → 头晕
const EYE_MAX_SHIFT  = 0.8;                  // 眼睛平移上限(SVG 坐标系 px)

/* 点击桌宠时的随机台词(中英对照,索引一致) */
const PHRASES = {
  en: [
    'Clawd here! 🦀','Welcome to my terminal!','Try the ☀/🌙 button up top.',
    'Move your mouse — characters follow it.','Drag me around!',
    'I nap if you idle too long…','Snip snip ✂','ultrathink…',
  ],
  zh: [
    '我是 Clawd!🦀','欢迎来到我的终端!','试试右上角的 ☀/🌙 按钮。',
    '动动鼠标,字符会跟着你。','可以拖着我到处走!',
    '你太久不动我会睡着的…','咔嚓咔嚓 ✂','ultrathink…',
  ],
};

/* ---------- SVG 加载(带缓存) ---------- */
const cache = new Map();
async function loadSvg(name){
  if(!cache.has(name)){
    cache.set(name, fetch(`${ASSET_DIR}clawd-${name}.svg`)
      .then(r => { if(!r.ok) throw new Error(r.status); return r.text(); })
      .catch(err => { console.warn(`[clawd] 加载失败: ${name}`, err); return ''; }));
  }
  return cache.get(name);
}

/**
 * 把状态素材注入 shadowRoot(SVG 内联,GIF 用 <img>)。
 * 所有素材共用 viewBox,去掉 width/height 属性让其填满容器。
 */
export async function renderState(shadow, name){
  if(name === 'conducting'){
    shadow.innerHTML =
      `<style>:host{display:block}img{width:100%;height:100%;object-fit:contain;display:block}</style>` +
      `<img src="${ASSET_DIR}clawd-conducting.gif" alt="clawd">`;
    return;
  }
  const raw = await loadSvg(name);
  if(!raw) return;
  shadow.innerHTML =
    `<style>:host{display:block}svg{width:100%;height:100%;display:block}</style>` +
    raw.replace(/<svg([^>]*?)\swidth="[^"]*"/, '<svg$1')
       .replace(/<svg([^>]*?)\sheight="[^"]*"/, '<svg$1');
}

/* ========================================================================== */
export function initClawdPet(){
  const host   = document.getElementById('clawd');
  const bubble = document.getElementById('bubble');
  const shadow = host.attachShadow({ mode: 'open' });

  /* ---------- 状态切换 ---------- */
  // state 大类:idle | flourish | react | drag | dozing | sleeping | waking
  let state = 'idle';
  let stateToken = 0;            // 每次切换 +1,使遗留的 setTimeout 失效
  let flourishTimer = null;

  async function setState(next, visual = next){
    state = next;
    const token = ++stateToken;
    await renderState(shadow, visual);
    if(token !== stateToken) return;   // 期间又切换了,丢弃本次渲染
    hookEyes();
  }

  /** 回到待机并预约下一次轮播 */
  function toIdle(){
    setState('idle', IDLE_STATE);
    scheduleFlourish();
  }

  /** 在 ms 后执行 fn;若期间状态被切换则自动作废 */
  function after(ms, fn){
    const token = stateToken;
    setTimeout(() => { if(token === stateToken) fn(); }, ms);
  }

  /* ---------- 待机轮播 ---------- */
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  function scheduleFlourish(){
    clearTimeout(flourishTimer);
    flourishTimer = setTimeout(() => {
      if(state !== 'idle') return;          // 非待机(拖拽/睡觉等)则跳过本轮
      setState('flourish', pick(FLOURISH_POOL));
      after(rand(FLOURISH_LEN[0], FLOURISH_LEN[1]), toIdle);
    }, rand(FLOURISH_DELAY[0], FLOURISH_DELAY[1]));
  }

  /* ---------- 眼神跟随 ---------- */
  let mouseX = innerWidth / 2, mouseY = innerHeight / 2;
  let eyes = null;
  function hookEyes(){ eyes = shadow.querySelector('#eyes-js'); moveEyes(); }
  function moveEyes(){
    if(!eyes) return;
    const r = host.getBoundingClientRect();
    const dx = mouseX - (r.left + r.width / 2);
    const dy = mouseY - (r.top + r.height / 2);
    const d  = Math.hypot(dx, dy) || 1;
    // 朝光标方向平移,幅度封顶(SVG 内部已带 0.2s transition)
    const k = Math.min(1, d / 200) * EYE_MAX_SHIFT;
    eyes.style.transform = `translate(${dx / d * k}px,${dy / d * k}px)`;
  }

  /* ---------- 对话气泡 ---------- */
  function placeBubble(){
    const r = host.getBoundingClientRect();
    bubble.style.left = Math.max(8, r.left - 150) + 'px';
    bubble.style.top  = (r.top - bubble.offsetHeight - 12) + 'px';
  }
  function say(text){
    bubble.textContent = text;
    bubble.classList.add('show');
    placeBubble();
    clearTimeout(say._t);
    say._t = setTimeout(() => bubble.classList.remove('show'), 3200);
  }
  let phraseIdx = 0;
  function sayNext(){
    const arr = PHRASES[getLang()] || PHRASES.en;
    say(arr[phraseIdx++ % arr.length]);
    // 待机时说话,换成"冒气泡"素材,说完再回待机
    if(state === 'idle'){
      setState('idle', 'idle-bubble');
      after(3200, () => setState('idle', IDLE_STATE));
    }
  }

  /* ---------- 点击反应(含连点惩罚) ---------- */
  let clickTimes = [];
  host.addEventListener('click', () => {
    if(host._dragged) return;              // 拖拽松手误触不算点击
    const now = Date.now();
    clickTimes = clickTimes.filter(t => now - t < 3000).concat(now);

    if(state === 'dozing' || state === 'sleeping'){ wakeUp(); return; }
    if(state === 'drag') return;

    if(clickTimes.length >= RAPID_CLICKS + 2){       // 还在狂点 → 恼火
      setState('react', 'react-annoyed');
    } else if(clickTimes.length >= RAPID_CLICKS){    // 连点 → 头晕
      setState('react', 'dizzy');
    } else {
      setState('react', pick(CLICK_POOL));
      sayNext();
    }
    after(REACT_LEN, toIdle);
  });

  /* ---------- 拖拽 ---------- */
  let offX = 0, offY = 0;
  host.addEventListener('mousedown', e => {
    host._dragging = true; host._dragged = false;
    offX = e.clientX - host.offsetLeft;
    offY = e.clientY - host.offsetTop;
    e.preventDefault();
  });
  window.addEventListener('mousemove', e => {
    mouseX = e.clientX; mouseY = e.clientY;
    if(host._dragging){
      if(!host._dragged){ host._dragged = true; setState('drag', 'react-drag'); }
      host.style.right = 'auto'; host.style.bottom = 'auto';
      host.style.left = (e.clientX - offX) + 'px';
      host.style.top  = (e.clientY - offY) + 'px';
      if(bubble.classList.contains('show')) placeBubble();
    }
    moveEyes();
  });
  window.addEventListener('mouseup', () => {
    if(host._dragging && host._dragged){
      setState('waking', 'wake');          // 落地缓一下再回待机
      after(WAKE_LEN, toIdle);
    }
    host._dragging = false;
    setTimeout(() => host._dragged = false, 50);
  });

  /* ---------- 挂机 → 打盹 → 睡着;有动静 → 唤醒 ---------- */
  let lastActive = Date.now();
  function wakeUp(){
    setState('waking', 'wake');
    after(WAKE_LEN, toIdle);
  }
  ['mousemove','mousedown','keydown','scroll','touchstart'].forEach(ev =>
    window.addEventListener(ev, () => {
      lastActive = Date.now();
      if(state === 'dozing' || state === 'sleeping') wakeUp();
    }, { passive: true })
  );
  setInterval(() => {
    const idleMs = Date.now() - lastActive;
    if(state === 'sleeping') return;
    if(idleMs > SLEEP_AFTER && state === 'dozing'){
      setState('sleeping', 'sleeping');
    } else if(idleMs > DOZE_AFTER && (state === 'idle' || state === 'flourish')){
      setState('dozing', 'idle-yawn');     // 先打个哈欠
      after(2500, () => setState('dozing', 'idle-doze'));
    }
  }, 1000);

  /* ---------- 启动 ---------- */
  toIdle();
  after(900, sayNext);                     // 开场打个招呼
  // 预取常用素材,减少首次切换的闪烁
  ['wake','react-drag','idle-yawn','idle-doze','sleeping',...CLICK_POOL]
    .forEach(loadSvg);

  /* ---------- 调试钩子(mini 彩蛋模块会往里追加) ---------- */
  window.__clawdDebug = Object.assign(window.__clawdDebug || {}, {
    /** 切到任意素材看效果,如 __clawdDebug.set('working-wizard') */
    set: name => setState('flourish', name),
    sleep: () => setState('sleeping', 'sleeping'),
    say: sayNext,
  });
}
