// 针对「分科刷题卡片 + 考试介绍/好处」新 UI 的真实验证（jsdom 真实渲染）
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const D = __dirname;
const html = fs.readFileSync(path.join(D, "index.html"), "utf8");
const catalog = fs.readFileSync(path.join(D, "catalog.js"), "utf8");
const store = fs.readFileSync(path.join(D, "store.js"), "utf8");
const app = fs.readFileSync(path.join(D, "app.js"), "utf8");
const cleaned = html.replace(/<script\s+src=[^>]*><\/script>/g, "");

const dom = new JSDOM(cleaned, { runScripts: "outside-only", pretendToBeVisual: true, url: "https://yunzhuan.asia/peixun/" });
const { window } = dom;
window.HTMLDocument = window.document;
global.window = window; global.document = window.document;
window.eval(catalog); window.eval(store); window.eval(app);

let pass = 0, fail = 0;
function ok(name, cond) { if (cond) { pass++; console.log("  ✓ " + name); } else { fail++; console.log("  ✗ " + name); } }
function go(hash) {
  window.location.hash = hash;
  window.dispatchEvent(new window.Event("hashchange"));
}
function appHtml() { return window.document.getElementById("app").innerHTML; }

// 1) 公务员（有分科）
go("#/exam/gov/civil");
let h = appHtml();
ok("公务员页含「考试介绍」框", h.indexOf("考试介绍") >= 0);
ok("公务员页含「通过的好处」框", h.indexOf("通过的好处") >= 0);
ok("公务员页含「分科刷题」区", h.indexOf("分科刷题") >= 0);
ok("公务员页渲染 2 个分科卡片", window.document.querySelectorAll(".subcard").length === 2);
ok("公务员页含行测/公基考点分科", h.indexOf("行测") >= 0);
ok("公务员页含申论/例题分科", h.indexOf("申论") >= 0);

// 2) 教师资格（2 分科：客观题 / 案例）
go("#/exam/edu/teacher");
h = appHtml();
ok("教资页渲染 2 个分科卡片", window.document.querySelectorAll(".subcard").length === 2);
ok("教资页含「客观题」分科", h.indexOf("客观题") >= 0);
ok("教资页含「材料分析 / 例题」分科", h.indexOf("材料分析") >= 0);

// 3) 法考（已分科：客观题/主观题）
go("#/exam/lawfin/lawyer");
h = appHtml();
ok("律师页渲染 2 个分科卡片", window.document.querySelectorAll(".subcard").length === 2);
ok("律师页含「客观题」分科", h.indexOf("客观题") >= 0);
ok("律师页含「主观题」分科", h.indexOf("主观题") >= 0);
ok("律师页含考试介绍/好处", h.indexOf("考试介绍") >= 0 && h.indexOf("通过的好处") >= 0);

// 4) 技能信息卡（焊工）也展示介绍/好处
go("#/exam/skill/welder");
h = appHtml();
ok("焊工信息卡页含考试介绍", h.indexOf("考试介绍") >= 0);
ok("焊工信息卡页含实操说明", h.indexOf("实操考核") >= 0);

// 5) 真实进入分科刷题并判一题（civil 客观题）
go("#/exam/gov/civil");
const xingceBtn = window.document.querySelector('.subcard [data-sub="obj"]');
ok("找到客观题「开始刷题」按钮", !!xingceBtn);
xingceBtn.click();
const q = window.document.querySelector(".q .qt");
ok("进入行测刷题渲染首题题干", !!q && q.textContent.length > 0);
const firstOpt = window.document.querySelector(".q .opt");
firstOpt.click(); // 单选自动判分
const fb = window.document.querySelector(".q .fb");
ok("点击选项后渲染判分反馈", !!fb);
ok("首题判分后含正确答案文本", fb && fb.textContent.indexOf("正确答案") >= 0);

// 6) 解析/考点字段（e）在判分后展示：进入含 e 题库，逐题判分直到出现 .exp
go("#/exam/lawfin/account");
const accStart = window.document.querySelector('[data-act="start-quiz"]');
ok("会计页含「开始刷题」按钮", !!accStart);
accStart.click();
let expShown = false;
for (let k = 0; k < 60 && !expShown; k++) {
  const cfm = window.document.querySelector('.acts [data-act="confirm"]');
  if (cfm) {
    const o = window.document.querySelector(".q .opt"); if (o) o.click();
    const c2 = window.document.querySelector('.acts [data-act="confirm"]'); if (c2) c2.click();
  } else {
    const o = window.document.querySelector(".q .opt"); if (!o) break; o.click();
  }
  if (window.document.querySelector(".q .exp")) { expShown = true; break; }
  const nx = window.document.querySelector('.acts [data-act="next"]'); if (nx) nx.click(); else break;
}
ok("判分后展示「解析/考点」(.exp)", expShown);

// 7) 阅读卡（主观题例题+参考答案）：真实渲染与交互
go("#/read/lawfin/lawyer");
h = appHtml();
ok("阅读卡页渲染 .read-card", !!window.document.querySelector(".read-card"));
ok("阅读卡页含题干 .qt 文本", (function () { var t = window.document.querySelector(".read-card .qt"); return !!t && t.textContent.length > 0; })());
ok("阅读卡页有「显示参考答案」按钮", !!window.document.querySelector('[data-act="show-ans"]'));
ok("阅读卡页有「收藏」按钮", !!window.document.querySelector('[data-act="fav-read"]'));
let ansEl = window.document.querySelector("[data-ans]");
ok("参考答案初始隐藏 (display:none)", ansEl && ansEl.style.display === "none");
window.document.querySelector('[data-act="show-ans"]').click();
ansEl = window.document.querySelector("[data-ans]");
ok("点击后参考答案可见且含 .ans-b 文本", !!ansEl && ansEl.style.display !== "none" && (function () { var b = ansEl.querySelector(".ans-b"); return !!b && b.textContent.length > 0; })());
let favBtn = window.document.querySelector('[data-act="fav-read"]');
favBtn.click();
favBtn = window.document.querySelector('[data-act="fav-read"]');
ok("点击收藏后按钮变「已收藏」", !!favBtn && favBtn.textContent.indexOf("已收藏") >= 0);
ok("收藏写入 localStorage (peixun_reads_fav_v1)", (window.localStorage.getItem("peixun_reads_fav_v1") || "").indexOf("lawfin/lawyer") >= 0);
let nextBtn = window.document.querySelector('[data-act="next-read"]');
ok("有「下一张」按钮", !!nextBtn);
if (nextBtn) { nextBtn.click(); ok("下一张后进度更新 (第 2 张)", appHtml().indexOf("第 2 /") >= 0); }

console.log("\nUI 验证：" + pass + " 通过 / " + fail + " 失败");
process.exit(fail ? 1 : 0);
