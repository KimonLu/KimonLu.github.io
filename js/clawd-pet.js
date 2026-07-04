/* ==========================================================================
   clawd-pet.js — Clawd 主桌宠(完整状态机)
   素材:assets/clawd/clawd-<状态名>.svg(仅 conducting 为 GIF)。
   要点:
   - SVG 文本 fetch 后注入容器的 Shadow DOM —— 各素材内部的 keyframes/class
     大量重名,Shadow DOM 隔离后互不冲突;
   - 常驻待机用 idle-follow(素材中唯一带 #eyes-js/#body-js 钩子的主形态),
     眼睛和身体会朝鼠标方向微动;其余形态进待机轮播池;
   - 状态机:待机轮播 / 点击反应(连点逐级升级:头晕→恼火→死机)/
     拖拽(按拖动方向换表情)/ 挂机四级(哈欠→瞌睡→低电量→瘫倒睡着)/
     唤醒 / 主题与语言切换时摇铃铛;
   - window.__clawdDebug.set('状态名') 可手动切换任意素材,便于调试验证。
   ========================================================================== */

import { getLang } from './i18n.js';

/* ---------- 可调参数 ---------- */
const ASSET_DIR = 'assets/clawd/';
const IDLE_STATE = 'idle-follow';            // 常驻待机(带眼神/身体跟随钩子)
const FLOURISH_POOL = [                      // 待机轮播池(随机抽取)
  'idle-living','idle-look','idle-reading','headphones-groove','idle-collapse',
  'working-typing','working-typing-boss','working-thinking','working-sweeping',
  'working-juggling','working-building','working-carrying','working-debugger',
  'working-wizard','working-ultrathink',
  'coffee-hand','coffee-head-flip','conducting',
];
const CLICK_POOL = ['happy','react-double-jump','aegyo-shy','react-double'];
const FLOURISH_DELAY = [8000, 18000];        // 两次轮播的间隔范围 ms
const FLOURISH_LEN   = [6000, 10000];        // 单次轮播播放时长范围 ms
const REACT_LEN      = 2600;                 // 点击/通知反应时长 ms
const WAKE_LEN       = 1500;                 // wake.svg 一次性动画时长 ms
const DOZE_AFTER     = 45000;                // 无操作 → 打哈欠+瞌睡 ms
const LOWBAT_AFTER   = 90000;                // 无操作 → 低电量 ms
const SLEEP_AFTER    = 150000;               // 无操作 → 瘫倒睡着 ms
const RAPID_CLICKS   = 4;                    // 3 秒内连点该次数 → 头晕(再点恼火/死机)
const EYE_MAX_SHIFT  = 0.8;                  // 眼睛平移上限(SVG 坐标系 px)
const BODY_MAX_SHIFT = 0.6;                  // 身体倾斜上限(SVG 坐标系 px)
const DRAG_V_SWITCH  = 5;                    // 拖拽横向速度阈值(px/事件,超过换朝向表情)

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
const NOTIFY_LINES = { en: 'Switched! 🔔', zh: '切换完成!🔔' };

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
  let visual = '';               // 当前实际展示的素材名(挂机分级要用)
  let stateToken = 0;            // 每次切换 +1,使遗留的 setTimeout 失效
  let flourishTimer = null;

  async function setState(next, vis = next){
    state = next;
    visual = vis;
    const token = ++stateToken;
    await renderState(shadow, vis);
    if(token !== stateToken) return;   // 期间又切换了,丢弃本次渲染
    hookFollow();
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
  let lastFlourish = '';

  function scheduleFlourish(){
    clearTimeout(flourishTimer);
    flourishTimer = setTimeout(() => {
      if(state !== 'idle') return;          // 非待机(拖拽/睡觉等)则跳过本轮
      let show = pick(FLOURISH_POOL);
      if(show === lastFlourish) show = pick(FLOURISH_POOL);  // 降低连续重复概率
      lastFlourish = show;
      setState('flourish', show);
      after(rand(FLOURISH_LEN[0], FLOURISH_LEN[1]), toIdle);
    }, rand(FLOURISH_DELAY[0], FLOURISH_DELAY[1]));
  }

  /* ---------- 眼神/身体跟随(仅素材带钩子时生效,如 idle-follow) ---------- */
  let mouseX = innerWidth / 2, mouseY = innerHeight / 2;
  let eyes = null, bodyEl = null;
  function hookFollow(){
    eyes   = shadow.querySelector('#eyes-js');
    bodyEl = shadow.querySelector('#body-js');
    moveFollow();
  }
  function moveFollow(){
    if(!eyes && !bodyEl) return;
    const r = host.getBoundingClientRect();
    const dx = mouseX - (r.left + r.width / 2);
    const dy = mouseY - (r.top + r.height / 2);
    const d  = Math.hypot(dx, dy) || 1;
    const k  = Math.min(1, d / 200);        // 200px 内按距离渐变,更近更含蓄
    // 眼睛朝光标方向平移(素材内部自带 0.2s transition)
    if(eyes) eyes.style.transform =
      `translate(${dx / d * k * EYE_MAX_SHIFT}px,${dy / d * k * EYE_MAX_SHIFT}px)`;
    // 身体同方向轻微倾出,幅度更小
    if(bodyEl) bodyEl.style.transform =
      `translate(${dx / d * k * BODY_MAX_SHIFT}px,${dy / d * k * BODY_MAX_SHIFT * 0.4}px)`;
  }

  /* ---------- 对话气泡 ---------- */
  function placeBubble(){
    const r = host.getBoundingClientRect();
    bubble.style.left = Math.max(8, r.left - 150) + 'px';
    bubble.style.top  = Math.max(8, r.top - bubble.offsetHeight - 12) + 'px';
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

  /* ---------- 点击反应(连点逐级升级:头晕→恼火→死机) ---------- */
  let clickTimes = [];
  host.addEventListener('click', () => {
    if(host._dragged) return;              // 拖拽松手误触不算点击
    const now = Date.now();
    clickTimes = clickTimes.filter(t => now - t < 3000).concat(now);

    if(state === 'dozing' || state === 'sleeping'){ wakeUp(); return; }
    if(state === 'drag') return;

    const n = clickTimes.length;
    if(n >= RAPID_CLICKS + 4){             // 还在狂点 → 死机
      setState('react', 'error');
    } else if(n >= RAPID_CLICKS + 2){      // 继续点 → 恼火
      setState('react', 'react-annoyed');
    } else if(n >= RAPID_CLICKS){          // 连点 → 头晕
      setState('react', 'dizzy');
    } else {
      setState('react', pick(CLICK_POOL));
      sayNext();
    }
    after(REACT_LEN, toIdle);
  });

  /* ---------- 拖拽(按横向拖动方向切换表情) ---------- */
  let offX = 0, offY = 0;
  let dragVX = 0, dragLastSwitch = 0;
  host.addEventListener('mousedown', e => {
    host._dragging = true; host._dragged = false;
    offX = e.clientX - host.offsetLeft;
    offY = e.clientY - host.offsetTop;
    dragVX = 0;
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

      // 横向速度指数平滑;明显朝一侧拖动时换成对应朝向的表情
      dragVX = dragVX * 0.8 + (e.movementX || 0) * 0.2;
      const want = dragVX < -DRAG_V_SWITCH ? 'react-left'
                 : dragVX >  DRAG_V_SWITCH ? 'react-right' : 'react-drag';
      if(want !== visual && Date.now() - dragLastSwitch > 300){
        dragLastSwitch = Date.now();
        setState('drag', want);
      }
    }
    moveFollow();
  });
  window.addEventListener('mouseup', () => {
    if(host._dragging && host._dragged){
      setState('waking', 'wake');          // 落地缓一下再回待机
      after(WAKE_LEN, toIdle);
    }
    host._dragging = false;
    setTimeout(() => host._dragged = false, 50);
  });

  /* ---------- 挂机四级:哈欠→瞌睡→低电量→瘫倒睡着;有动静 → 唤醒 ---------- */
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
      setState('sleeping', 'collapse-sleep');            // 瘫倒过渡
      after(2000, () => setState('sleeping', 'sleeping'));
    } else if(idleMs > LOWBAT_AFTER && state === 'dozing' && visual === 'idle-doze'){
      setState('dozing', 'idle-low-battery');            // 电量告急
    } else if(idleMs > DOZE_AFTER && (state === 'idle' || state === 'flourish')){
      setState('dozing', 'idle-yawn');                   // 先打个哈欠
      after(2500, () => setState('dozing', 'idle-doze'));
    }
  }, 1000);

  /* ---------- 主题/语言切换 → 摇铃铛 ---------- */
  function notify(){
    if(state !== 'idle' && state !== 'flourish') return;
    setState('react', 'notification');
    say(NOTIFY_LINES[getLang()] || NOTIFY_LINES.en);
    after(REACT_LEN, toIdle);
  }
  window.addEventListener('themechange', notify);
  window.addEventListener('langchange', notify);

  /* ---------- 启动 ---------- */
  toIdle();
  after(900, sayNext);                     // 开场打个招呼
  // 预取常用素材,减少首次切换的闪烁
  ['wake','react-drag','react-left','react-right','idle-yawn','idle-doze',
   'idle-low-battery','collapse-sleep','sleeping','idle-bubble','notification',
   ...CLICK_POOL].forEach(loadSvg);

  /* ---------- 调试钩子(mini 彩蛋模块会往里追加) ---------- */
  window.__clawdDebug = Object.assign(window.__clawdDebug || {}, {
    /** 切到任意素材看效果,如 __clawdDebug.set('working-wizard') */
    set: name => setState('flourish', name),
    sleep: () => setState('sleeping', 'sleeping'),
    say: sayNext,
  });
}
