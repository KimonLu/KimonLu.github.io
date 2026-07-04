/* ==========================================================================
   clawd-mini.js — mini Clawd 彩蛋
   一只迷你 Clawd 随机现身,节目单:
     peek  从屏幕边缘探头挥手      (mini-peek)
     walk  沿底边横着爬过整个屏幕  (mini-crabwalk)
     type  蹲在底边角落打字        (mini-typing)
     watch 钻出来蹲着看你          (mini-enter → mini-idle)
     nap   缩到角落打盹            (mini-enter-sleep → mini-sleep)
   被点到会吃惊/开心(mini-alert / mini-happy)然后溜走。
   带 #eyes-js 的素材眼睛会跟着鼠标转。
   调试:__clawdDebug.miniPeek()/.miniWalk()/.miniType()/.miniWatch()/.miniSleep()
   ========================================================================== */

import { renderState } from './clawd-pet.js';

/* ---------- 可调参数 ---------- */
const FIRST_DELAY  = 40000;            // 首次出场延迟 ms
const NEXT_DELAY   = [90000, 180000];  // 之后每次间隔范围 ms
const PEEK_STAY    = 3500;             // 探头停留 ms
const WALK_TIME    = 12000;            // 横爬穿屏耗时 ms
const TYPE_STAY    = 6000;             // 角落打字 ms
const WATCH_STAY   = 5000;             // 蹲着围观 ms
const NAP_STAY     = 8000;             // 角落打盹 ms
const ENTER_LEN    = 1500;             // enter 类过渡动画时长 ms

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

  /* ---------- 眼神跟随(mini 素材大多带 #eyes-js) ---------- */
  window.addEventListener('mousemove', e => {
    const eyes = shadow.querySelector('#eyes-js');
    if(!eyes || host.style.display === 'none') return;
    const r = host.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const d  = Math.hypot(dx, dy) || 1;
    eyes.style.transform = `translate(${dx / d * 0.8}px,${dy / d * 0.8}px)`;
  });

  /** 淡入 → 停留 → 淡出 的通用节目框架 */
  function fadeShow(stay){
    currentAnim = host.animate(
      [{ opacity: 0 }, { opacity: 1, offset: 0.1 },
       { opacity: 1, offset: 0.9 }, { opacity: 0 }],
      { duration: stay, easing: 'ease-in-out' });
    currentAnim.onfinish = hide;
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

  /* ---------- 节目 3:底边角落打字 ---------- */
  async function type(){
    if(busy) return; busy = true;
    await renderState(shadow, 'mini-typing');
    // 随机蹲左下或屏幕中下,避开右下角的主桌宠
    host.style.left = pick(['14px', '40vw']); host.style.right = 'auto';
    host.style.top = 'auto'; host.style.bottom = '4px';
    show();
    fadeShow(TYPE_STAY);
  }

  /* ---------- 节目 4:钻出来蹲着围观 ---------- */
  async function watch(){
    if(busy) return; busy = true;
    host.style.left = rand(15, 60) + 'vw'; host.style.right = 'auto';
    host.style.top = 'auto'; host.style.bottom = '4px';
    await renderState(shadow, 'mini-enter');      // 先播出场动画
    show();
    setTimeout(async () => {
      if(!busy) return;                           // 期间被点走了
      await renderState(shadow, 'mini-idle');     // 蹲着看你
      fadeShow(WATCH_STAY);
    }, ENTER_LEN);
  }

  /* ---------- 节目 5:角落打盹 ---------- */
  async function nap(){
    if(busy) return; busy = true;
    host.style.left = '14px'; host.style.right = 'auto';
    host.style.top = 'auto'; host.style.bottom = '6px';
    await renderState(shadow, 'mini-enter-sleep');  // 躺下过渡
    show();
    setTimeout(async () => {
      if(!busy) return;
      await renderState(shadow, 'mini-sleep');      // 睡熟
      fadeShow(NAP_STAY);
    }, ENTER_LEN);
  }

  /* ---------- 被点到:吃惊/开心 → 溜走 ---------- */
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
  const SHOWS = [peek, peek, walk, type, watch, nap];   // 探头概率稍高
  function schedule(delay){
    setTimeout(() => {
      if(!document.hidden && !busy) pick(SHOWS)();
      schedule(rand(NEXT_DELAY[0], NEXT_DELAY[1]));
    }, delay);
  }
  schedule(FIRST_DELAY);

  /* ---------- 调试钩子 ---------- */
  window.__clawdDebug = Object.assign(window.__clawdDebug || {}, {
    miniPeek: peek, miniWalk: walk, miniType: type,
    miniWatch: watch, miniSleep: nap,
  });
}
