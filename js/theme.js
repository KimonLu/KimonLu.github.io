/* ==========================================================================
   theme.js — 白天/夜间主题切换
   优先级:用户手动选择(localStorage)> 系统偏好(prefers-color-scheme)。
   切换时在 <html> 上设置 data-theme="light|dark",配色全部由 CSS 变量完成;
   同时派发 'themechange' 事件,供字符云等模块刷新颜色。
   ========================================================================== */

const STORAGE_KEY = 'theme';                 // localStorage 键名
const media = window.matchMedia('(prefers-color-scheme: light)');

/** 当前主题:'light' | 'dark' */
export function getTheme(){
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function apply(theme){
  document.documentElement.dataset.theme = theme;
  const btn = document.getElementById('themeBtn');
  // 按钮显示"将要切换到"的那一侧图标
  if(btn) btn.textContent = theme === 'light' ? '🌙' : '☀';
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
}

export function initTheme(){
  // 初始:有手动记录用记录,否则跟随系统
  const saved = localStorage.getItem(STORAGE_KEY);
  apply(saved || (media.matches ? 'light' : 'dark'));

  // 用户未手动选择过时,持续跟随系统深浅色变化
  media.addEventListener('change', e => {
    if(!localStorage.getItem(STORAGE_KEY)) apply(e.matches ? 'light' : 'dark');
  });

  // 顶栏按钮:手动切换并记住
  document.getElementById('themeBtn').addEventListener('click', () => {
    const next = getTheme() === 'light' ? 'dark' : 'light';
    localStorage.setItem(STORAGE_KEY, next);
    apply(next);
  });
}
