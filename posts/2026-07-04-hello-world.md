---
title: Hello World — 这个博客是怎么运作的
date: 2026-07-04
summary: 第一篇文章:如何在这个站点里写新博客,以及 Markdown 渲染效果演示。
---

# Hello World

这是本站博客的第一篇文章,同时也是一份**写作说明**和渲染效果演示。

## 如何发布一篇新文章

1. 在 `posts/` 目录新建一个 `.md` 文件(建议命名 `YYYY-MM-DD-标题.md`);
2. 文件开头写好三行元信息(front matter):

```markdown
---
title: 文章标题
date: 2026-07-04
summary: 一句话摘要,会显示在首页卡片上。
---
```

3. 把文件名追加到 `posts/posts.json` 里;
4. `git add / commit / push`,完成。

## 渲染效果演示

### 行内样式

支持 **加粗**、*斜体*、`行内代码`、[链接](https://github.com/KimonLu),以及删除线 ~~像这样~~。

### 代码块

```python
def hello(name: str) -> str:
    """打个招呼"""
    return f"Hello, {name}!"

print(hello("world"))
```

### 引用

> 任何足够先进的技术都与魔法无异。
> —— Arthur C. Clarke

### 表格

| 语言 | 用途 | 熟练度 |
|------|------|--------|
| Python | 深度学习 / 脚本 | ★★★★ |
| C/C++ | 系统 / 性能 | ★★★ |
| MATLAB | 信号 / 仿真 | ★★★ |

### 列表

- 无序列表项
- 另一项
  - 嵌套一层

完。🦀
