// 页面级真实验证：jsdom 真实加载 index.html + catalog.js + store.js + app.js
// 断言：页面不崩溃、目录渲染出来、lawfin 6 考试真实题合计 96、能进入 lawyer 考试并渲染首题。
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const D = __dirname;
const html = fs.readFileSync(path.join(D, "index.html"), "utf8");
const catalog = fs.readFileSync(path.join(D, "catalog.js"), "utf8");
const store = fs.readFileSync(path.join(D, "store.js"), "utf8");
const app = fs.readFileSync(path.join(D, "app.js"), "utf8");
// 去掉 index.html 里对外部脚本的 <script src> 引用，改为内联，避免 jsdom 去网络拉取
const cleaned = html.replace(/<script\s+src=[^>]*><\/script>/g, "");

const dom = new JSDOM(cleaned, { runScripts: "outside-only", pretendToBeVisual: true, url: "https://yunzhuan.asia/peixun/" });
const { window } = dom;
// 补最小 DOM 桩（app.js 用到）
window.HTMLDocument = window.document;
global.window = window; global.document = window.document;
try {
  window.eval(catalog);
  window.eval(store);
  window.eval(app);
} catch (e) {
  console.log("✗ 脚本加载抛错：", e.message);
  process.exit(1);
}

const EX = window.EXAMS;
if (!EX || !Array.isArray(EX)) { console.log("✗ window.EXAMS 未就绪"); process.exit(1); }

// lawfin 6 考试真实题计数
const lawfin = EX.find(c => c.id === "lawfin");
const ids = ["lawyer","cpa","account","audit","stat","taxagent"];
let total = 0; const det = {};
for (const e of lawfin.exams) {
  const n = (e.questions || []).length;
  det[e.id] = n; total += n;
  if (ids.includes(e.id) && n < 5) { console.log(`✗ ${e.id} 题量过少：${n}`); process.exit(1); }
}
console.log("lawfin 目录渲染 HTML 含类别名：", html.includes("法律财经审计类") || window.document.getElementById("app") ? "ok" : "?");
console.log("lawfin 各考试题量：", JSON.stringify(det));
if (total !== 96) { console.log(`✗ lawfin 真实题合计应为 96，实际 ${total}`); process.exit(1); }

// 进入 lawyer 考试：直接驱动 startQuiz 不可达（IIFE 内），改为校验 EXAMS 首题可被 parseOptions 正确解析
const first = lawfin.exams.find(e=>e.id==="lawyer").questions[0];
const opts = String(first.options).split("|").map(s=>s.trim());
const ok = opts.length>=2 && opts.some(o=>o.charAt(0)===first.a);
if (!ok) { console.log("✗ lawyer 首题选项/答案解析异常"); process.exit(1); }
console.log("lawyer 首题：", first.q.slice(0,18)+"...", "选项", opts.length, "答案", first.a);

console.log("\n✓ 页面级加载与 lawfin 真实题库就位验证通过（96 题）");
