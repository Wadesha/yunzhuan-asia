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
ok("公务员页含行测分科", h.indexOf("行政职业能力测验") >= 0);
ok("公务员页含申论分科", h.indexOf("申论") >= 0);

// 2) 教师资格（3 分科）
go("#/exam/edu/teacher");
h = appHtml();
ok("教资页渲染 3 个分科卡片", window.document.querySelectorAll(".subcard").length === 3);
ok("教资页含「综合素质」分科", h.indexOf("综合素质（通用）") >= 0);

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

// 5) 真实进入分科刷题并判一题（civil 行测）
go("#/exam/gov/civil");
const xingceBtn = window.document.querySelector('.subcard [data-sub="xingce"]');
ok("找到行测「开始刷题」按钮", !!xingceBtn);
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

console.log("\nUI 验证：" + pass + " 通过 / " + fail + " 失败");
process.exit(fail ? 1 : 0);
