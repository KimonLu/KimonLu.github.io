/* ==========================================================================
   main.js — 入口:按序初始化各功能模块
   注意:SVG 桌宠依赖 fetch,请通过 http 访问(本地预览:python -m http.server),
   直接双击 index.html(file://)桌宠不会显示,其余功能正常。
   ========================================================================== */

import { initI18n }      from './i18n.js';
import { initTheme }     from './theme.js';
import { initEffects }   from './effects.js';
import { initCharCloud } from './charcloud.js';
import { initClawdPet }  from './clawd-pet.js';
import { initClawdMini } from './clawd-mini.js';
import { initBlogCards } from './blog.js';
import { initGuestbook } from './guestbook.js';

initI18n();        // 中英切换(需最先执行,填充 data-en/zh 文本)
initTheme();       // 白天/夜间主题
initEffects();     // 打字机 / 技能条 / 背景视差
initCharCloud();   // Codex 风格字符云
initClawdPet();    // Clawd 主桌宠
initClawdMini();   // mini Clawd 彩蛋
initBlogCards();   // 技术博客卡片(读 posts/posts.json)
initGuestbook();   // 留言板(giscus,未配置时显示指引)
