/* ==========================================================================
   effects.js — 页面小动效
   1) whoami 打字机
   2) 技能条进入视口时生长
   3) 背景图鼠标视差 + 聚光渐变跟随
   ========================================================================== */

const TYPED_LINE  = 'LKM // ECE @ SJTU';  // 打字机内容
const TYPE_SPEED  = 70;                   // 每字符间隔 ms
const PARALLAX_PX = 30;                   // 背景反向漂移最大像素

/* ---------- 打字机 ---------- */
function initTyping(){
  const el = document.getElementById('typed');
  let i = 0;
  (function tick(){
    el.innerHTML = TYPED_LINE.slice(0, i) + '<span class="cursor">█</span>';
    if(i++ < TYPED_LINE.length) setTimeout(tick, TYPE_SPEED);
  })();
}

/* ---------- 技能条 ---------- */
function initSkillBars(){
  const box = document.getElementById('skillBox');
  new IntersectionObserver((entries, ob) => {
    entries.forEach(e => {
      if(!e.isIntersecting) return;
      box.querySelectorAll('.skill-row').forEach(row => {
        row.querySelector('i').style.width = row.dataset.pct + '%';
      });
      ob.disconnect();
    });
  }, { threshold: .4 }).observe(box);
}

/* ---------- 背景视差 + 聚光 ---------- */
function initParallax(){
  const bg = document.getElementById('bg-image');
  window.addEventListener('mousemove', e => {
    const rx = e.clientX / window.innerWidth;
    const ry = e.clientY / window.innerHeight;
    // 背景朝光标反方向轻微漂移,营造景深
    bg.style.transform =
      `translate(${(rx - .5) * -PARALLAX_PX}px,${(ry - .5) * -PARALLAX_PX}px) scale(1.06)`;
    // 聚光渐变中心跟随光标(css 变量 --mx/--my)
    document.body.style.setProperty('--mx', rx * 100 + '%');
    document.body.style.setProperty('--my', ry * 100 + '%');
  });
}

export function initEffects(){
  initTyping();
  initSkillBars();
  initParallax();
}
