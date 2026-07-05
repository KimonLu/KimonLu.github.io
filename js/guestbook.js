/* ==========================================================================
   guestbook.js — 留言板(基于 giscus,留言存储在本仓库的 GitHub Discussions)
   工作方式:动态注入 giscus 官方脚本,由它在 #giscusBox 里渲染留言组件;
   访客用 GitHub 账号登录留言,数据存进仓库的 Discussions,无需任何后端。
   本模块同时负责:主题(白天/夜间)与语言切换时,同步更新 giscus 的外观。

   ★ 启用步骤(只需一次,详见《编辑指南.md》"留言板"一节):
     1. 仓库 Settings → General → Features 勾选 Discussions;
     2. 安装 GitHub App:https://github.com/apps/giscus;
     3. 打开 https://giscus.app 填入仓库名,复制生成代码中的
        data-repo-id 和 data-category-id,填进下方 GISCUS 配置。
   repoId / categoryId 未填时,页面会显示配置指引提示,不会报错。
   ========================================================================== */

import { getTheme } from './theme.js';
import { getLang }  from './i18n.js';

/* ---------- giscus 配置(从 giscus.app 生成的代码里抄) ---------- */
const GISCUS = {
  repo:       'KimonLu/KimonLu.github.io',
  repoId:     'R_kgDOTDa5Uw',                // ★ 待填:data-repo-id
  category:   'Announcements',   // Discussions 分类名(建议选"仅维护者可发起"的分类)
  categoryId: 'DIC_kwDOTDa5U84DAiAs',                // ★ 待填:data-category-id
  term:       'guestbook',       // 所有留言挂在这一个固定的 discussion 下
};

/* 站点主题 → giscus 主题名 */
const THEME_MAP = { dark: 'transparent_dark', light: 'light' };
const langCode = () => getLang() === 'zh' ? 'zh-CN' : 'en';

/* ---------- 未配置时的指引提示 ---------- */
function renderSetupHint(box){
  const zh = getLang() === 'zh';
  box.innerHTML =
    `<p class="gb-hint">${zh
      ? '📝 留言板还差最后一步:按《编辑指南.md》"留言板"一节完成 giscus 注册,把 repoId / categoryId 填入 js/guestbook.js 即可启用。'
      : '📝 One step left: register giscus per the guide and fill repoId / categoryId in js/guestbook.js.'}</p>`;
}

/* ---------- 注入 giscus 官方脚本 ---------- */
function mountGiscus(box){
  const s = document.createElement('script');
  s.src = 'https://giscus.app/client.js';
  s.async = true;
  s.crossOrigin = 'anonymous';
  const attrs = {
    'data-repo':              GISCUS.repo,
    'data-repo-id':           GISCUS.repoId,
    'data-category':          GISCUS.category,
    'data-category-id':       GISCUS.categoryId,
    'data-mapping':           'specific',     // 固定挂在 term 对应的讨论下
    'data-term':              GISCUS.term,
    'data-strict':            '0',
    'data-reactions-enabled': '1',
    'data-emit-metadata':     '0',
    'data-input-position':    'top',
    'data-theme':             THEME_MAP[getTheme()],
    'data-lang':              langCode(),
    'data-loading':           'lazy',         // 滚动到可视区才加载
  };
  for(const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  box.appendChild(s);
}

/** 运行中更新 giscus 配置(向其 iframe 发消息) */
function updateGiscus(config){
  const iframe = document.querySelector('iframe.giscus-frame');
  if(iframe) iframe.contentWindow.postMessage(
    { giscus: { setConfig: config } }, 'https://giscus.app');
}

/* ========================================================================== */
export function initGuestbook(){
  const box = document.getElementById('giscusBox');
  if(!box) return;

  if(!GISCUS.repoId || !GISCUS.categoryId){
    renderSetupHint(box);
    window.addEventListener('langchange', () => renderSetupHint(box));
    return;
  }

  mountGiscus(box);
  // 跟随站点的主题/语言切换
  window.addEventListener('themechange', e =>
    updateGiscus({ theme: THEME_MAP[e.detail.theme] }));
  window.addEventListener('langchange', () =>
    updateGiscus({ lang: langCode() }));
}
