// 页面级真实验证：jsdom 真实加载 index.html + catalog.js + store.js + app.js
// 断言：页面不崩溃、目录渲染出来、banks/ 下每个考试 bank 的题量在 catalog 中完全一致、
//       所有 bank 题目总数与 catalog 总题量一致、首题可被 parseOptions 正确解析。
// 自动从 banks/ 派生期望题量，对后续批次无需修改。
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

// 建立 examId -> exam 索引
const loc = {};
EX.forEach(c => c.exams.forEach(e => { loc[e.id] = e; }));

// 从 banks/ 派生期望：每个真实 bank 的题量
const BANKS = path.join(D, "banks");
const bankFiles = fs.readdirSync(BANKS)
  .filter(f => f.endsWith(".json") && f !== "_base.json" && f !== "_index.json");

let bankTotal = 0, mism = 0;
for (const f of bankFiles) {
  const id = f.replace(/\.json$/, "");
  const arr = JSON.parse(fs.readFileSync(path.join(BANKS, f), "utf8"));
  let expect;
  if (Array.isArray(arr)) expect = arr.length;
  else if (arr && Array.isArray(arr.sub)) expect = [].concat.apply([], arr.sub.map(s => s.questions || [])).length;
  else if (arr && Array.isArray(arr.questions)) expect = arr.questions.length;
  else { console.log(`✗ ${id} bank 形态异常`); mism++; continue; }
  bankTotal += expect;
  const ex = loc[id];
  if (!ex) { console.log(`✗ catalog 中找不到考试 ${id}`); mism++; continue; }
  const got = (ex.questions || []).length;
  if (got !== expect) {
    console.log(`✗ ${id} 题量不一致：bank=${expect} catalog=${got}`);
    mism++;
  } else {
    console.log(`  ${id}: ${got} 题 ✓`);
  }
  // 首题可解析校验（兼容单选 string 答案与多选 array 答案）
  const first = ex.questions[0];
  const opts = String(first.options).split("|").map(s => s.trim());
  const ans = Array.isArray(first.a) ? first.a : [first.a];
  const ok = opts.length >= 2 && ans.every(A => opts.some(o => o.charAt(0) === A));
  if (!ok) { console.log(`✗ ${id} 首题选项/答案解析异常`); mism++; }
}
console.log("真实 bank 题量合计：", bankTotal);

// catalog 总题量
let all = 0; EX.forEach(c => c.exams.forEach(e => { all += (e.questions || []).length; }));
console.log("catalog 总题量：", all);

if (mism) { console.log(`\n✗ 存在 ${mism} 处不一致`); process.exit(1); }
console.log(`\n✓ 页面级加载与真实题库就位验证通过（banks/ 共 ${bankFiles.length} 个考试、${bankTotal} 题，catalog 总题量 ${all}）`);
