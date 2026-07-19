# 寰宇零售集团 · 内部职位与周报站

> 跨国零售集团内部站：部门与层级职位介绍 + 每周工作报告系统

[![stack](https://img.shields.io/badge/stack-HTML%2FCSS%2FJS-1a2a4f)](https://github.com/Wadesha/yunzhuan-asia)
[![deploy](https://img.shields.io/badge/deploy-Vercel-000000)](https://vercel.com)

---

## 项目简介

为跨国零售集团「**寰宇零售集团 GlobalSphere Retail Group**」打造的内部站点，用于集中展示各部门的职位介绍，并收集、检索各层级员工的每周工作报告。

整站**纯文本、无图标、无 emoji**，仅依靠排版、边框与字距建立信息层级，适合企业内网与低带宽环境。

## 核心功能

| 模块 | 说明 |
| --- | --- |
| 集团概况 | 集团简介与关键经营事实 |
| 组织架构 | 五大层级（L1–L5）定义 + 十大部门总览表 |
| 部门与职位 | 按部门导航，逐层级展示职位「汇报对象 / 概述 / 核心职责 / 任职要求」 |
| 每周工作报告 | 按周次、部门、层级三维筛选，只读查看报告与详情 |
| 管理后台 | 周报批阅管理：一键「批阅」、整篇变灰、按批阅状态筛选，含已批阅 / 待批阅统计 |
| 微信识别 | 检测到微信内置浏览器时弹出提示，引导用系统浏览器打开 |

## 设计说明

- 零依赖、零构建，原生 HTML / CSS / JS
- 全部内容由 `js/data.js` 驱动，增删职位或周报只需改数据
- 交互通过事件委托实现，无第三方框架
- 响应式布局，窄屏自动转为单栏

## 文件结构

```
yunzhuan-asia/
├── index.html      # 站点入口
├── css/
│   └── styles.css  # 纯文本企业级样式
├── js/
│   ├── data.js     # 组织 / 职位 / 周报数据
│   └── app.js      # 渲染与交互逻辑
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
```

或直接双击 `index.html`。

## 部署到 Vercel

1. **GitHub 仓库**：本仓库 `https://github.com/Wadesha/yunzhuan-asia`
2. **导入 Vercel**：登录 [vercel.com](https://vercel.com) → New Project → Import 该仓库
   - Framework Preset：选 **Other**
   - Root Directory：默认（仓库根目录）
   - Build Command：留空
   - Output Directory：留空
   - 直接点 **Deploy**
3. **绑定域名**（可选）：Vercel 项目 → Settings → Domains → 输入 `yunzhuan.asia`，按提示添加 DNS 的 `CNAME` 记录指向 `cname.vercel-dns.com`

## 后续更新流程

```bash
# 修改内容后
git add -A
git commit -m "描述你的改动"
git push
# Vercel 会自动触发重新部署
```

## License

MIT — 自由使用、修改、分发。

---

© 2026 寰宇零售集团内部站
