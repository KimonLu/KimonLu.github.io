/* ==========================================================================
   blog-reader.js — 博客阅读页(blog.html)入口
   1) 从 URL 读取 ?post=文件名,校验其确在 posts.json 清单中;
   2) fetch 对应 Markdown,去掉 front matter 后用 marked(CDN)渲染;
      CDN 加载失败时降级为纯文本 <pre> 展示,内容不丢;
   3) 同时初始化主题 / 中英切换 / 字符云 / 桌宠,与首页体验一致。
   ========================================================================== */

import { initI18n }      from './i18n.js';
import { initTheme }     from './theme.js';
import { initCharCloud } from './charcloud.js';
import { initClawdPet }  from './clawd-pet.js';
import { parseFrontMatter, isKnownPost } from './blog.js';

const MARKED_CDN = 'https://cdn.jsdelivr.net/npm/marked@12.0.2/lib/marked.esm.js';

initI18n();
initTheme();
initCharCloud();
initClawdPet();

/* ---------- Markdown 渲染器(带降级) ---------- */
async function getRenderer(){
  try {
    const { marked } = await import(MARKED_CDN);
    return md => marked.parse(md);
  } catch(err) {
    console.warn('[blog] marked CDN 加载失败,降级为纯文本', err);
    return md => {
      const pre = document.createElement('pre');
      pre.textContent = md;
      return pre.outerHTML;
    };
  }
}

/* ---------- 加载并渲染文章 ---------- */
async function main(){
  const body  = document.getElementById('mdBody');
  const title = document.getElementById('postTitle');
  const date  = document.getElementById('postDate');
  const head  = document.getElementById('termTitle');

  const file = new URLSearchParams(location.search).get('post') || '';
  if(!file || !(await isKnownPost(file))){
    body.innerHTML = '<p>404 — 文章不存在,或未在 posts/posts.json 中登记。</p>';
    return;
  }

  try {
    const text = await fetch('posts/' + file).then(r => {
      if(!r.ok) throw new Error(r.status);
      return r.text();
    });
    const { meta, body: md } = parseFrontMatter(text);
    title.textContent = meta.title || file.replace(/\.md$/, '');
    date.textContent  = meta.date || '';
    head.textContent  = '~/blog/' + file;
    document.title    = (meta.title || file) + ' // LKM blog';
    body.innerHTML    = (await getRenderer())(md);
  } catch(err) {
    console.warn('[blog] 文章加载失败:', err);
    body.innerHTML = '<p>加载失败:请通过 http 访问本页(直接双击打开 file:// 无法 fetch 文章)。</p>';
  }
}
main();
