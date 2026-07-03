/* ==========================================================================
   clawd-mini.js — mini Clawd 彩蛋
   一只迷你 Clawd 随机现身:从屏幕边缘探头挥手 / 沿底边横着爬过 / 在角落打盹。
   被点到会吃惊(mini-alert)然后溜走。
   调试:__clawdDebug.miniPeek() / .miniWalk() / .miniSleep() 立即触发。
   ========================================================================== */

import { renderState } from './clawd-pet.js';

/* ---------- 可调参数 ---------- */
const FIRST_DELAY  = 40000;            // 首次出场延迟 ms
const NEXT_DELAY   = [90000, 180000];  // 之后每次间隔范围 ms
const PEEK_STAY    = 3500;             // 探头停留 ms
const WALK_TIME    = 12000;            // 横爬穿屏耗时 ms
const SLEEP_STAY   = 8000;             // 角落打盹 ms

const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

export function initClawdMini(){
  const host   = document.getElementById('clawd-mini');
  const shadow = host.attachShadow({ mode: 'open' });

  let busy = false;         // 一次只演一个节目
  let currentAnim = null;

  function show(){ host.style.display = 'block'; }
  function hide(){
    host.style.display = 'none';
    host.style.transform = '';
    currentAnim = null;
    busy = false;
  }

  /* ---------- 节目 1:边缘探头挥手 ---------- */
  async function peek(){
    if(busy) return; busy = true;
    const fromLeft = Math.random() < 0.5;
    await renderState(shadow, 'mini-peek');
    const w = host.offsetWidth || 64;
    // mini-peek 素材朝右倾,从右边出场时水平镜像
    const flip = fromLeft ? '' : ' scaleX(-1)';
    host.style.left = fromLeft ? '0px' : 'auto';
    host.style.right = fromLeft ? 'auto' : '0px';
    host.style.top = rand(20, 60) + 'vh';
    host.style.bottom = 'auto';
    show();
    const off = `translateX(${fromLeft ? -w : w}px)${flip}`;
    const on  = `translateX(${fromLeft ? -w * 0.25 : w * 0.25}px)${flip}`;
    currentAnim = host.animate(
      [{ transform: off }, { transform: on, offset: 0.12 },
       { transform: on, offset: 0.88 }, { transform: off }],
      { duration: PEEK_STAY + 1000, easing: 'ease-in-out' });
    currentAnim.onfinish = hide;
  }

  /* ---------- 节目 2:沿底边横爬穿屏 ---------- */
  async function walk(){
    if(busy) return; busy = true;
    const toRight = Math.random() < 0.5;
    await renderState(shadow, 'mini-crabwalk');
    const w = host.offsetWidth || 64;
    host.style.left = '0px'; host.style.right = 'auto';
    host.style.top = 'auto'; host.style.bottom = '2px';
    show();
    const startX = toRight ? -w : innerWidth + w;
    const endX   = toRight ? innerWidth + w : -w;
    const flip   = toRight ? '' : ' scaleX(-1)';   // 素材默认朝右爬
    currentAnim = host.animate(
      [{ transform: `translateX(${startX}px)${flip}` },
       { transform: `translateX(${endX}px)${flip}` }],
      { duration: WALK_TIME, easing: 'linear' });
    currentAnim.onfinish = hide;
  }

  /* ---------- 节目 3:左下角打盹 ---------- */
  async function sleep(){
    if(busy) return; busy = true;
    await renderState(shadow, 'mini-sleep');
    host.style.left = '14px'; host.style.right = 'auto';
    host.style.top = 'auto'; host.style.bottom = '6px';
    show();
    currentAnim = host.animate(
      [{ opacity: 0 }, { opacity: 1, offset: 0.1 },
       { opacity: 1, offset: 0.9 }, { opacity: 0 }],
      { duration: SLEEP_STAY, easing: 'ease-in-out' });
    currentAnim.onfinish = hide;
  }

  /* ---------- 被点到:吃惊 → 溜走 ---------- */
  host.addEventListener('click', async () => {
    if(!busy) return;
    currentAnim?.cancel();
    // 保留当前位置,原地换成吃惊/开心表情
    await renderState(shadow, pick(['mini-alert', 'mini-happy']));
    currentAnim = host.animate(
      [{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }],
      { duration: 1400 });
    currentAnim.onfinish = hide;
  });

  /* ---------- 随机排期 ---------- */
  const SHOWS = [peek, peek, walk, sleep];   // 探头概率稍高
  function schedule(delay){
    setTimeout(() => {
      if(!document.hidden && !busy) pick(SHOWS)();
      schedule(rand(NEXT_DELAY[0], NEXT_DELAY[1]));
    }, delay);
  }
  schedule(FIRST_DELAY);

  /* ---------- 调试钩子 ---------- */
  window.__clawdDebug = Object.assign(window.__clawdDebug || {}, {
    miniPeek: peek, miniWalk: walk, miniSleep: sleep,
  });
}
