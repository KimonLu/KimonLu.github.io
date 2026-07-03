/* ==========================================================================
   blog.js — 技术博客:文章清单加载 + 首页卡片
   文章为 posts/ 目录下的 Markdown 文件,开头带 front matter 元信息:
     ---
     title: 文章标题
     date: 2026-07-04
     summary: 一句话摘要
     ---
   posts/posts.json 是文章清单(文件名数组),新文章需在其中登记。
   阅读页 blog.html 复用本模块的 loadPosts/parseFrontMatter。
   ========================================================================== */

const POSTS_DIR  = 'posts/';
const MANIFEST   = 'posts/posts.json';

/**
 * 解析 front matter。
 * @returns {{meta:Object, body:string}} meta 为键值对,body 为去掉头部后的正文
 */
export function parseFrontMatter(text){
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if(!m) return { meta: {}, body: text };
  const meta = {};
  m[1].split(/\r?\n/).forEach(line => {
    const i = line.indexOf(':');
    if(i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  });
  return { meta, body: text.slice(m[0].length) };
}

/** 读取清单并逐篇解析元信息,按日期倒序返回 [{file,title,date,summary}] */
export async function loadPosts(){
  const files = await fetch(MANIFEST).then(r => {
    if(!r.ok) throw new Error('posts.json ' + r.status);
    return r.json();
  });
  const posts = await Promise.all(files.map(async file => {
    try {
      const text = await fetch(POSTS_DIR + file).then(r => {
        if(!r.ok) throw new Error(r.status);
        return r.text();
      });
      const { meta } = parseFrontMatter(text);
      return {
        file,
        title:   meta.title   || file.replace(/\.md$/, ''),
        date:    meta.date    || '',
        summary: meta.summary || '',
      };
    } catch(err) {
      console.warn('[blog] 文章加载失败:', file, err);
      return null;
    }
  }));
  return posts.filter(Boolean)
              .sort((a, b) => b.date.localeCompare(a.date));
}

/** 校验文件名是否在清单里(阅读页用,防止拼接任意路径) */
export async function isKnownPost(file){
  try {
    const files = await fetch(MANIFEST).then(r => r.json());
    return files.includes(file);
  } catch { return false; }
}

/* ---------- 首页卡片 ---------- */
export async function initBlogCards(){
  const grid = document.getElementById('blogGrid');
  if(!grid) return;                       // 阅读页没有该容器,直接跳过
  try {
    const posts = await loadPosts();
    grid.innerHTML = '';
    posts.forEach(p => {
      const card = document.createElement('a');
      card.className = 'proj post';
      card.href = 'blog.html?post=' + encodeURIComponent(p.file);
      card.innerHTML =
        `<span class="pt"></span>` +
        `<span class="post-date"></span>` +
        `<span class="pd"></span>`;
      card.querySelector('.pt').textContent = p.title;
      card.querySelector('.post-date').textContent = p.date;
      card.querySelector('.pd').textContent = p.summary;
      grid.appendChild(card);
    });
    if(!posts.length) grid.innerHTML =
      '<div class="proj add">posts/ 目录暂无文章</div>';
  } catch(err) {
    // 常见于 file:// 直接打开页面(fetch 被禁),提示走 http
    console.warn('[blog] 清单加载失败:', err);
    grid.innerHTML = '<div class="proj add">加载失败:请通过 http 访问(见编辑指南)</div>';
  }
}
