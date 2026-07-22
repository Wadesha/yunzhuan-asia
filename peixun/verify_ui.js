// 针对「四层树（考试→阶段→科目→题目）」新 UI 的真实验证（jsdom 真实渲染）
// 重点：① 阶段/科目分节点、逐层下钻、点科目即只刷该科目题；② 判分后朗读仅读答案本身（无前缀）
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
global.window = window; global.document = window.document;
window.HTMLDocument = window.document;

// ---- 语音朗读 mock：捕获每次 speak 的文本，验证「只读答案本身」 ----
let spoken = [];
window.SpeechSynthesisUtterance = function (text) { this.text = text; };
window.speechSynthesis = {
  speak: function (u) { spoken.push(u.text); },
  cancel: function () {},
  getVoices: function () { return []; },
};

window.eval(catalog); window.eval(store); window.eval(app);

let pass = 0, fail = 0;
function ok(name, cond) { if (cond) { pass++; console.log("  ✓ " + name); } else { fail++; console.log("  ✗ " + name); } }
function go(hash) {
  window.location.hash = hash;
  window.dispatchEvent(new window.Event("hashchange"));
}
function appHtml() { return window.document.getElementById("app").innerHTML; }
function $(sel) { return window.document.querySelector(sel); }
function $all(sel) { return Array.prototype.slice.call(window.document.querySelectorAll(sel)); }
function gradeAll() {
  for (let i = 0; i < 300; i++) {
    if ($(".sum")) return true;
    const opt = $(".q .opt");
    if (opt && !$(".fb")) opt.click();
    const nx = $('.acts [data-act="next"]');
    if (nx) nx.click(); else break;
  }
  return !!$(".sum");
}

// 1) 法考（分两阶段：客观题 / 主观题）——顶层是阶段卡片，逐层下钻
go("#/exam/lawfin/lawyer");
let h = appHtml();
ok("法考顶层含「客观题」阶段", h.indexOf("客观题") >= 0);
ok("法考顶层含「主观题」阶段", h.indexOf("主观题") >= 0);
ok("分阶段考试顶层用「进入（N 题）」下钻（非整体打包）", h.indexOf("进入（") >= 0);
// 进入客观题阶段 → 看到科目（刑法等）与「开始刷题」
go("#/exam/lawfin/lawyer/st00");
h = appHtml();
ok("进入客观题阶段后含科目卡片（刑法）", h.indexOf("刑法") >= 0);
ok("客观题阶段内含「开始刷题」按钮", $all('[data-act="start-quiz"]').length > 0);

// 2) 公务员（分两阶段：行测 / 申论）
go("#/exam/gov/civil");
ok("公务员顶层含「行政职业能力测验」阶段", appHtml().indexOf("行政职业能力测验") >= 0);
go("#/exam/gov/civil/st00");
ok("进入行测阶段后含科目（行测-常识等）", appHtml().indexOf("行测-常识") >= 0);
ok("行测阶段内含「开始刷题」按钮", $all('[data-act="start-quiz"]').length > 0);

// 3) 教资（单阶段，直接分科目）
go("#/exam/edu/teacher");
h = appHtml();
ok("教资页含科目卡片（教育学）", h.indexOf("教育学") >= 0);
ok("教资页含「开始刷题」按钮", $all('[data-act="start-quiz"]').length > 0);

// 4) 点进某科目即只刷该科目题（范围隔离）：取首个开始刷题按钮，记录声明题量，刷完核对
go("#/exam/lawfin/lawyer/st00");
const firstBtn = $('[data-act="start-quiz"]');
const m = (firstBtn.textContent || "").match(/（(\d+)\s*题）/);
const declared = m ? parseInt(m[1], 10) : -1;
ok("开始刷题按钮显示该题量", declared > 0);
firstBtn.click();
const bar = $(".bar .meta");
ok("进入科目刷题渲染题号（第 1 / N 题）", !!bar && /第 1 \/ \d+ 题/.test(bar.textContent));
const totalFromBar = bar ? parseInt((bar.textContent.match(/第 1 \/ (\d+) 题/) || [])[1], 10) : -1;
ok("题号总量与按钮声明一致", totalFromBar === declared);
const reached = gradeAll();
ok("刷完该科目到达总结页", reached);
const sumText = $(".sum") ? $(".sum").textContent : "";
const sumTotal = (sumText.match(/共\s*(\d+)\s*题/) || [])[1];
ok("总结页题量=该科目题量（范围隔离）", sumTotal && parseInt(sumTotal, 10) === declared);

// 5) 判分后朗读仅读答案本身（无「正确答案」/「回答正确」/「回答错误」前缀）
go("#/exam/lawfin/lawyer/st00");
$('[data-act="start-quiz"]').click();
const opt = $(".q .opt");
ok("渲染首题选项", !!opt);
spoken = [];
opt.click(); // 单选自动判分 → 触发 readAnswer（仅读答案）
const fb = $(".q .fb");
ok("点击选项后渲染判分反馈 .fb", !!fb);
ok("判分后展示解析/考点 .exp", !!$(".q .exp"));
ok("判分后至少朗读了一次", spoken.length >= 1);
const ansText = spoken[spoken.length - 1] || "";
ok("朗读内容非空", ansText.length > 0);
ok("朗读不含「正确答案」前缀", ansText.indexOf("正确答案") < 0);
ok("朗读不含「回答正确」前缀", ansText.indexOf("回答正确") < 0);
ok("朗读不含「回答错误」前缀", ansText.indexOf("回答错误") < 0);

// 6) 阅读卡页（主观题例题+参考答案）：真实渲染与交互
go("#/read/lawfin/lawyer");
ok("阅读卡页渲染 .read-card", !!$(".read-card"));
ok("阅读卡页含题干 .qt 文本", (function () { const t = $(".read-card .qt"); return !!t && t.textContent.length > 0; })());
ok("阅读卡页有「显示参考答案」按钮", !!$('[data-act="show-ans"]'));
ok("阅读卡页有「收藏」按钮", !!$('[data-act="fav-read"]'));
let ansEl = $("[data-ans]");
ok("参考答案初始隐藏", ansEl && ansEl.style.display === "none");
$('[data-act="show-ans"]').click();
ansEl = $("[data-ans]");
ok("点击后参考答案可见且含 .ans-b 文本", !!ansEl && ansEl.style.display !== "none" && (function () { const b = ansEl.querySelector(".ans-b"); return !!b && b.textContent.length > 0; })());
let favBtn = $('[data-act="fav-read"]');
favBtn.click();
favBtn = $('[data-act="fav-read"]');
ok("点击收藏后按钮变「已收藏」", !!favBtn && favBtn.textContent.indexOf("已收藏") >= 0);
let nextBtn = $('[data-act="next-read"]');
ok("有「下一张」按钮", !!nextBtn);
if (nextBtn) { nextBtn.click(); ok("下一张后进度更新（第 2 /）", appHtml().indexOf("第 2 /") >= 0); }

// 7) 技能信息卡（焊工）仍展示介绍/好处
go("#/exam/skill/welder");
h = appHtml();
ok("焊工信息卡页含考试介绍", h.indexOf("考试介绍") >= 0);
ok("焊工信息卡页含实操说明", h.indexOf("实操考核") >= 0);

console.log("\nUI 验证：" + pass + " 通过 / " + fail + " 失败");
process.exit(fail ? 1 : 0);
