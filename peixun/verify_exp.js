const fs = require("fs");
const { JSDOM } = require("jsdom");
const html = fs.readFileSync("index.html", "utf8").replace(/<script\s+src=[^>]*><\/script>/g, "");
const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true, url: "https://yunzhuan.asia/peixun/" });
const w = dom.window; global.window = w; global.document = w.document; w.HTMLDocument = w.document;
w.eval(fs.readFileSync("catalog.js", "utf8")); w.eval(fs.readFileSync("store.js", "utf8")); w.eval(fs.readFileSync("app.js", "utf8"));
function go(h) { w.location.hash = h; w.dispatchEvent(new w.Event("hashchange")); }
go("#/exam/lawfin/account");
w.document.querySelector('[data-act="start-quiz"]').click();
let found = false, at = 0;
for (let i = 0; i < 54 && !found; i++) {
  let confirm = w.document.querySelector('.acts [data-act="confirm"]');
  if (confirm) {
    const opt = w.document.querySelector(".q .opt"); if (opt) opt.click();
    confirm = w.document.querySelector('.acts [data-act="confirm"]'); // 重查：renderActions 已重建
    if (confirm) confirm.click();
  } else {
    const opt = w.document.querySelector(".q .opt"); if (!opt) { console.log("break 无opt@" + i); break; }
    opt.click();
  }
  const qel = w.document.querySelector(".q");
  const exp = qel.querySelector(".exp");
  if (exp) { found = true; at = i + 1; console.log("第" + at + "题渲染 .exp →", exp.textContent.replace(/\s+/g, " ").slice(0, 46)); break; }
  const n = w.document.querySelector('.acts [data-act="next"]');
  if (n) n.click(); else { console.log("break 无next@" + i + " 题:" + qel.querySelector(".qt").textContent.slice(0, 14)); break; }
}
console.log("含 e 题目上 .exp 是否渲染:", found, found ? "(第" + at + "题)" : "→ 需排查");
