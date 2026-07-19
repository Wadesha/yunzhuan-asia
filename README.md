# yunzhuan.asia

> Hello World 落地页 · 域名 `yunzhuan.asia` 的占位主页

![status](https://img.shields.io/badge/status-coming%20soon-e8a857)
![stack](https://img.shields.io/badge/stack-static%20HTML%2FCSS%2FJS-1a2a4f)
![deploy](https://img.shields.io/badge/deploy-Vercel-000000)

---

## 项目简介

为 `yunzhuan.asia` 域名打造的单文件 Hello World 落地页。采用 **"东方云意 / Ethereal Cloud"** 美学：深青墨底色配暖橘金点缀，呼应"云转日出"的意境，体现域名"云转"二字。

## 视觉特性

| 元素 | 描述 |
| --- | --- |
| 背景 | 深青墨色（`#0d1f24`）→ 青绿（`#16302f`）多层渐变 |
| 点缀 | 暖橘金（`#e8a857`）用于标题、光晕、印章 |
| 云层 | 4 层径向渐变 + 60s 模糊滤镜，缓慢漂移循环 |
| 光晕 | 标题背后橘金月轮，8s 呼吸缩放动画 |
| 噪点 | SVG `feTurbulence` 纹理叠加，营造胶片质感 |
| 视差 | 鼠标/触摸移动时，云层与主内容反向位移 |
| 入场 | 标题逐词渐显 + 上浮，staggered `animation-delay` |
| 装饰 | 角落金线边框 + 底部"云"字印章 + 罗马数字 `MMXXVI` |

## 技术栈

- **HTML / CSS / 原生 JS**，零依赖、零构建
- 单文件 `index.html`（CSS / JS 全内联）
- 字体走 Google Fonts CDN：`Cormorant Garamond`（展示）+ `JetBrains Mono`（域名标识）
- 响应式断点 768px，尊重 `prefers-reduced-motion`

## 文件结构

```
yunzhuan-asia/
├── index.html      # 单文件应用
└── README.md       # 本文档
```

## 本地预览

任选其一：

```bash
# Python
python3 -m http.server 8000
# 浏览器打开 http://localhost:8000

# Node
npx serve .

# 或直接双击 index.html
```

## 部署到 Vercel

1. **GitHub 仓库**：本仓库 `https://github.com/Wadesha/yunzhuan-asia`
2. **导入 Vercel**：登录 [vercel.com](https://vercel.com) → New Project → Import 该仓库
   - Framework Preset：选 **Other**
   - Root Directory：默认（仓库根目录）
   - Build Command：留空
   - Output Directory：留空
   - 直接点 **Deploy**
3. **绑定域名**：
   - Vercel 项目 → Settings → Domains → Add → 输入 `yunzhuan.asia`
   - 按提示在域名注册商处添加 DNS 记录：
     - 类型：`CNAME`
     - 主机：`@` 或 `www`
     - 值：`cname.vercel-dns.com`
   - 等待 DNS 生效（通常几分钟到几小时），Vercel 会自动签发 SSL 证书

## 后续更新流程

```bash
# 修改 index.html 后
git add index.html
git commit -m "描述你的改动"
git push
# Vercel 会自动触发重新部署
```

## 设计快照

页面内容自上而下：

```
┌────────────────────────────────────┐
│  ——— yunzhuan.asia ———             │  域名
│                                    │
│         Hello World                │  主标题（Hello 白 / World 橘金斜体）
│       云转 · 万象初现                │  副标题
│                                    │
│   • 站点建设中 / COMING SOON        │  状态指示
│                                    │
│  [云] YUNZHUAN · MMXXVI   © 2026   │  页脚
└────────────────────────────────────┘
```

## License

MIT — 自由使用、修改、分发。

---

© 2026 [yunzhuan.asia](https://yunzhuan.asia)
