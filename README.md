# KimonLu.github.io

我的个人主页 / My personal homepage — **https://kimonlu.github.io**

终端风格的个人站点:白天/夜间双主题、Codex 风格的光标字符尾迹、一只住在页面里的像素小螃蟹 Clawd,以及一个纯静态的 Markdown 博客。无框架、无构建步骤,原生 HTML/CSS/JS(ES Modules)直接部署在 GitHub Pages 上。

## ✨ 特性

- **终端 UI**:等宽字体、命令行提示符、CRT 扫描线,`whoami` 打字机开场
- **白天/夜间主题**:默认跟随系统,右上角 ☀/🌙 手动切换并记忆
- **字符云**:鼠标划过处,`_ - > o` 等字符沿轨迹在固定网格上点亮、停留、淡出
- **Clawd 桌宠**:完整状态机——眼睛跟着鼠标转;待机时随机看书/听歌/写码/施法;
  可拖拽(会朝拖动方向挣扎);连点会头晕→恼火→死机;挂机会打哈欠→瞌睡→低电量→睡着;
  切主题/语言时摇铃铛。另有一只 mini Clawd 不定时从屏幕边缘探头、横爬、围观、打盹
- **中英双语**:一键切换,文案写在 `data-en` / `data-zh` 属性里
- **静态博客**:Markdown 写作 + front matter 元信息,首页卡片自动生成,
  阅读页用 [marked](https://github.com/markedjs/marked) 渲染(CDN 失败自动降级纯文本)

## 🚀 本地运行

桌宠素材与博客文章靠 `fetch` 加载,需要通过 HTTP 访问(直接双击 `index.html` 不行):

```bash
git clone https://github.com/KimonLu/KimonLu.github.io.git
cd KimonLu.github.io
python -m http.server 8000
# 打开 http://localhost:8000
```

## 📁 结构

```
├─ index.html        # 首页
├─ blog.html         # 博客阅读页(?post=文件名)
├─ css/style.css     # 样式(开头是两套主题的 CSS 变量)
├─ js/               # 各功能模块(主题/双语/字符云/桌宠/博客…)
├─ posts/            # Markdown 博客文章 + posts.json 清单
├─ assets/clawd/     # Clawd 桌宠素材(SVG 动画)
└─ 编辑指南.md        # 内容维护文档(改资料/写文章/调参数)
```

## ✍️ 写一篇博客

1. 在 `posts/` 新建 `YYYY-MM-DD-标题.md`,开头写 front matter(`title` / `date` / `summary`);
2. 把文件名加进 `posts/posts.json`;
3. push,完成。详见[编辑指南](编辑指南.md)。

## 🦀 彩蛋

打开控制台试试 `__clawdDebug.set('working-wizard')`,或者干脆什么都不做,等两分半钟看看 Clawd 会怎样。

## 致谢

- 桌宠形象为 Anthropic 的像素小螃蟹 Clawd
- 字符云效果参考 [openai.com/codex](https://openai.com/codex/)
- 字体:JetBrains Mono
