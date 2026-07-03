/* ==========================================================================
   charcloud.js — Codex 风格字符云(光标尾迹)
   实现要点(参考 openai.com/codex 与 demo 视频):
   - 屏幕划分为固定字符网格,字符只会"点亮"在格点上,不做物理移动;
   - 光标划过时,沿轨迹在附近随机点亮少量格子,形成稀疏字符簇;
   - 每个字符原地停留(hold)一段时间后线性淡出(fade),停留期间偶尔闪变字符;
   - 颜色读取 CSS 变量 --char-color / --char-alpha,自动适配白天/夜间主题。
   ========================================================================== */

/* ---------- 可调参数 ---------- */
const CELL_W = 13;                 // 网格单元宽(px)
const CELL_H = 17;                 // 网格单元高(px)
const FONT   = '13px "JetBrains Mono", monospace';
const CHARS  = ['_','_','_','-','-','-','>','>','o','~'];  // 加权字符集
const RADIUS = 2;                  // 采样点周围点亮半径(格)
const SPAWN_PER_SAMPLE = [1, 3];   // 每个采样点点亮格数范围
const HOLD_MS = [600, 1800];       // 停留时长范围
const FADE_MS = [800, 1500];       // 淡出时长范围
const MUTATE_CHANCE = 0.15;        // 停留期间闪变字符的概率(每格一次)
const MAX_CELLS = 800;             // 活跃格子上限

const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[Math.floor(Math.random() * arr.length)];

export function initCharCloud(){
  const cv  = document.getElementById('ascii');
  const ctx = cv.getContext('2d');
  let W, H;

  /* 高分屏适配:画布按 devicePixelRatio 放大,绘制坐标仍用 CSS 像素 */
  function resize(){
    const dpr = window.devicePixelRatio || 1;
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  /* 主题颜色缓存(--char-color 为 "r,g,b" 字符串) */
  let colorRGB = '200,255,225', maxAlpha = 0.9;
  function readThemeColor(){
    const cs = getComputedStyle(document.documentElement);
    colorRGB = cs.getPropertyValue('--char-color').trim() || colorRGB;
    maxAlpha = parseFloat(cs.getPropertyValue('--char-alpha')) || maxAlpha;
  }
  readThemeColor();
  window.addEventListener('themechange', readThemeColor);

  /* 活跃格子表:key = "col,row" */
  const cells = new Map();

  /** 在(col,row)点亮一个字符;已点亮则刷新寿命 */
  function light(col, row){
    if(col < 0 || row < 0 || col > W / CELL_W || row > H / CELL_H) return;
    cells.set(col + ',' + row, {
      col, row,
      ch: pick(CHARS),
      born: performance.now(),
      hold: rand(HOLD_MS[0], HOLD_MS[1]),
      fade: rand(FADE_MS[0], FADE_MS[1]),
      alpha: rand(0.7, 1),          // 每格的峰值透明度略有差异,更接近 demo 的错落感
      mutated: false,
    });
    // 超上限时淘汰最早的格子(Map 迭代顺序即插入顺序)
    if(cells.size > MAX_CELLS){
      cells.delete(cells.keys().next().value);
    }
  }

  /** 在采样点(px 坐标)附近随机点亮几格 */
  function burst(x, y){
    const c0 = Math.round(x / CELL_W), r0 = Math.round(y / CELL_H);
    const n = Math.round(rand(SPAWN_PER_SAMPLE[0], SPAWN_PER_SAMPLE[1]));
    for(let i = 0; i < n; i++){
      const dc = Math.round(rand(-RADIUS, RADIUS));
      const dr = Math.round(rand(-RADIUS, RADIUS));
      // 距离越远越不容易点亮 → 形成中心密、边缘稀的簇
      if(Math.random() < 1 / (1 + Math.hypot(dc, dr))) light(c0 + dc, r0 + dr);
    }
  }

  /* 指针轨迹采样:两次事件之间按步长插值,快速划动不断线 */
  let px = null, py = null;
  function onMove(x, y){
    if(px === null){ px = x; py = y; }
    const dist = Math.hypot(x - px, y - py);
    const steps = Math.max(1, Math.floor(dist / CELL_W));
    for(let i = 1; i <= steps; i++){
      burst(px + (x - px) * i / steps, py + (y - py) * i / steps);
    }
    px = x; py = y;
  }
  window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
  window.addEventListener('touchmove', e => {
    const t = e.touches[0]; onMove(t.clientX, t.clientY);
  }, { passive: true });

  /* 渲染循环:只遍历活跃格子 */
  function draw(now){
    ctx.clearRect(0, 0, W, H);
    ctx.font = FONT;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    for(const [key, c] of cells){
      const age = now - c.born;
      let a;
      if(age < c.hold){
        a = c.alpha;
        // 停留期间小概率闪变一次字符
        if(!c.mutated && Math.random() < MUTATE_CHANCE / 60){
          c.ch = pick(CHARS); c.mutated = true;
        }
      } else {
        a = c.alpha * (1 - (age - c.hold) / c.fade);
        if(a <= 0){ cells.delete(key); continue; }
      }
      ctx.fillStyle = `rgba(${colorRGB},${a * maxAlpha})`;
      ctx.fillText(c.ch, c.col * CELL_W + CELL_W / 2, c.row * CELL_H + CELL_H / 2);
    }
    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
}
