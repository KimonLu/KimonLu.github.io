/* ==========================================================================
   i18n.js — 中英双语切换
   页面上所有带 data-en / data-zh 属性的元素,文本由当前语言决定。
   其他模块可通过 getLang() 读取当前语言,或监听 'langchange' 事件。
   ========================================================================== */

let lang = 'en';

/** 当前语言:'en' | 'zh' */
export function getLang(){ return lang; }

/** 把 data-en / data-zh 应用到全部元素 */
function applyLang(){
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-en]').forEach(el => {
    const v = el.getAttribute('data-' + lang);
    if(v !== null) el.textContent = v;
  });
  const btn = document.getElementById('langBtn');
  if(btn) btn.textContent = lang === 'en' ? '中文' : 'EN';
}

export function initI18n(){
  const btn = document.getElementById('langBtn');
  btn.addEventListener('click', () => {
    lang = lang === 'en' ? 'zh' : 'en';
    applyLang();
    // 通知其他模块(如桌宠气泡短语)语言已切换
    window.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  });
  applyLang();
}
