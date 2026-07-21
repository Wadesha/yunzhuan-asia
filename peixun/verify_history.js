/*
 * verify_history.js — 刷题历史 / 续刷 真实运行时验证（jsdom）
 *
 * 覆盖：
 *   A. 登录用户刷新后能从云端读回进度并显示「继续上次」（修复顺序 bug）
 *   B. 完成一场后累计历史 peixun_<mod>_attempts_v1 落盘 + 首页"最近一次"
 *   C. history.html 聚合三模块记录成时间线
 *
 * 运行：NODE_PATH=<workspace>/node_modules node verify_history.js
 */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const BASE = "C:/Users/wade/WorkBuddy/2026-07-20-06-41-19/peixun";

// 忠实 supabase-js mock：rpc 返回 thenable，resolve {data,error}，构造器无 .catch
const FAKE_SUPABASE = [
  "window.supabase = { createClient: function(u, k) {",
  "  return { rpc: function(name, params) {",
  "    var payload = { data: null, error: null };",
  "    if (name === 'kv_slot_get') payload.data = window.__CLOUD_ROWS__ || [];",
  "    else if (name === 'create_slot' || name === 'login_slot') payload.data = { slot_id: 's1', slot_secret: 'sec' };",
  "    var thenable = {",
  "      single: function() { return thenable; },",
  "      then: function(onF, onR) { return Promise.resolve(payload).then(onF, onR); }",
  "    };",
  "    return thenable;",
  "  } };",
  "} };"
].join("\n");

// 各页面所需的外部脚本（按 HTML 中实际相对路径，保持浏览器执行顺序）；CDN supabase 用 fake 替代
function externalFor(relPath) {
  if (relPath.indexOf("history.html") >= 0)
    return ["store.js", "catalog.js", "store.supabase.js", "auth.js"];
  return ["../store.js", "../store.supabase.js", "../auth.js"];
}

let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log("  PASS  " + name); }
  else { fail++; console.log("  FAIL  " + name + (extra ? "  :: " + extra : "")); }
}

async function loadPage(relPath, { identity, cloudRows, localSeed } = {}) {
  const file = path.join(BASE, relPath);
  const dir = path.dirname(file);
  // 保留完整 HTML（静态结构不动），仅剥离外部 <script src> 标签，
  // 内联脚本照常执行；解析后再按浏览器顺序 eval 注入后端脚本。
  let html = fs.readFileSync(file, "utf8").replace(/<script src="[^"]+"><\/script>/g, "");
  const dom = new JSDOM(html, {
    url: "https://yunzhuan.asia/peixun/" + relPath,
    runScripts: "dangerously",
    beforeParse(window) {
      window.__CLOUD_ROWS__ = cloudRows || [];
      if (localSeed) Object.keys(localSeed).forEach(k => window.localStorage.setItem(k, JSON.stringify(localSeed[k])));
      if (identity) window.localStorage.setItem("peixun_cloud_identity_v1", JSON.stringify(identity));
    }
  });
  await new Promise(r => setTimeout(r, 50)); // 内联脚本已执行
  const win = dom.window;
  win.eval(FAKE_SUPABASE);
  externalFor(relPath).forEach(f => win.eval(fs.readFileSync(path.resolve(dir, f), "utf8")));
  win.eval('if(window.PeixunAuth&&window.SupabaseBackend)PeixunAuth.init();');
  await new Promise(r => setTimeout(r, 300)); // 等异步 hydrate + 重渲染
  return dom;
}

function click(dom, sel) {
  const el = dom.window.document.querySelector(sel);
  if (!el) return false;
  el.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  return true;
}

async function driveJianhu(dom, skipStart) {
  const win = dom.window, doc = win.document;
  if (!skipStart && !click(dom, '[data-act="start"]')) return "no-start";
  const QB = win.QBANK;
  for (let i = 0; i < 60; i++) {
    const qtEl = doc.querySelector("#app .q .qt");
    if (!qtEl) break;
    const qtext = qtEl.textContent.trim();
    const q = QB.find(x => x.q === qtext);
    if (!q) return "q-not-found:" + qtext.slice(0, 12);
    if (q.type === "multi") {
      const ans = Array.isArray(q.answer) ? q.answer : [q.answer];
      ans.forEach(L => {
        const idx = L.charCodeAt(0) - 65;
        const opt = doc.querySelector('.q .opt[data-opt="' + idx + '"]');
        if (opt) opt.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
      });
      if (!click(dom, '[data-act="confirm"]')) return "no-confirm@i" + i;
    } else if (q.type === "bool") {
      const opts = doc.querySelectorAll("#app .q .opt");
      let target = null;
      opts.forEach(o => { const lt = o.querySelector(".lt"); if (lt && lt.textContent.trim() === q.answer) target = o; });
      if (target) target.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
      else return "no-opt-bool@i" + i;
    } else {
      const idx = q.answer.charCodeAt(0) - 65;
      const opt = doc.querySelector('.q .opt[data-opt="' + idx + '"]');
      if (opt) opt.dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
      else return "no-opt@i" + i + " ans=" + q.answer;
    }
    if (!click(dom, '[data-act="next"]')) return "no-next@i" + i + " type=" + q.type + " optHtml=" + (doc.querySelector("#app .opts") ? doc.querySelector("#app .opts").outerHTML.slice(0, 200) : "none");
    if (doc.querySelector("#app .sum")) break;
  }
  return "done";
}

(async function () {
  console.log("=== A. 登录用户刷新后从云端续刷 ===");
  const PROGRESS = { qids: ["single-0", "single-1", "single-2"], idx: 1, sel: {}, graded: {}, correct: 1, wrong: 0, filter: "all", shuffle: false, ts: Date.now() };
  const domA = await loadPage("jianhu/index.html", {
    identity: { slot_id: "s1", slot_secret: "sec", phone: "13141315365" },
    cloudRows: [{ key: "peixun_jianhu_progress_v1", value: PROGRESS }]
  });
  const appA = domA.window.document.querySelector("#app").innerHTML;
  ok("登录态后端已切到 supabase", domA.window.Store && domA.window.Store.backendName() === "supabase", domA.window.Store && domA.window.Store.backendName());
  ok("首页出现「继续上次」(云端进度读回)", appA.indexOf("继续上次") >= 0, "idx=" + appA.indexOf("继续上次"));
  ok("重渲染钩子已注册", typeof domA.window.__peixunReRender === "function");

  console.log("=== B. 完成一场 → 累计历史落盘 + 首页最近一次 ===");
  const domB = await loadPage("jianhu/index.html", { localSeed: {} });
  const drv = await driveJianhu(domB);
  ok("完整跑完 24 题", drv === "done", drv);
  const attempts = JSON.parse(domB.window.localStorage.getItem("peixun_jianhu_attempts_v1") || "null");
  ok("attempts 数组已写入", Array.isArray(attempts) && attempts.length === 1, JSON.stringify(attempts));
  ok("attempt 记录 total=24", !!(attempts && attempts[0] && attempts[0].total === 24), attempts && JSON.stringify(attempts[0]));
  ok("attempt 含正确率 acc", !!(attempts && typeof attempts[0].acc === "number"), attempts && JSON.stringify(attempts[0]));
  click(domB, '[data-act="home"]');
  const appB = domB.window.document.querySelector("#app").innerHTML;
  ok("首页显示「最近一次」", appB.indexOf("最近一次") >= 0, "idx=" + appB.indexOf("最近一次"));

  console.log("=== C. history.html 聚合三模块时间线 ===");
  const seed = {
    peixun_jianhu_attempts_v1: [{ ts: Date.now() - 5000, mode: "顺序", filter: "all", total: 24, correct: 18, wrong: 6, acc: 75 }],
    peixun_wuxiandian_attempts_v1: [{ ts: Date.now() - 2000, mode: "乱序", filter: "single", total: 100, correct: 80, wrong: 20, acc: 80 }],
    peixun_spa_attempts_v1: [{ ts: Date.now(), catId: "a", examId: "b", total: 10, correct: 9, wrong: 1, acc: 90 }],
    peixun_jianhu_wrong_v1: ["single-3", "single-5"]
  };
  const domC = await loadPage("history.html", { localSeed: seed });
  const tl = domC.window.document.querySelector("#timeline");
  const ov = domC.window.document.querySelector("#overview-grid");
  ok("时间线容器存在", !!tl);
  ok("时间线渲染了 3 条记录", tl && tl.children.length === 3, tl && (tl.children ? tl.children.length : "none"));
  ok("总览做题次数=3", !!ov && /3<\/b>/.test(ov.innerHTML), ov && ov.innerHTML.replace(/\s+/g, " ").slice(0, 80));
  ok("显示错题待巩固", domC.window.document.querySelector("#wrongs-body").innerHTML.indexOf("监护错题") >= 0);
  ok("历史页注册重渲染钩子", typeof domC.window.__peixunReRender === "function");

  console.log("=== D. 中途退出保留进度（保存并退出）===");
  const domD = await loadPage("jianhu/index.html", { localSeed: {} });
  const winD = domD.window, docD = domD.window.document;
  ok("D: 能开始刷题", click(domD, '[data-act="start"]'));
  // 做 2 题（每题判分 + 下一题，触发 saveProgress）
  for (let s = 0; s < 2; s++) {
    const qtEl = docD.querySelector("#app .q .qt");
    if (!qtEl) break;
    const qtext = qtEl.textContent.trim();
    const q = winD.QBANK.find(x => x.q === qtext);
    if (!q) { ok("D: 第" + s + "题可定位", false, qtext.slice(0, 12)); break; }
    if (q.type === "multi") {
      const ans = Array.isArray(q.answer) ? q.answer : [q.answer];
      ans.forEach(L => { const idx = L.charCodeAt(0) - 65; const o = docD.querySelector('.q .opt[data-opt="' + idx + '"]'); if (o) o.dispatchEvent(new winD.MouseEvent("click", { bubbles: true })); });
      click(domD, '[data-act="confirm"]');
    } else if (q.type === "bool") {
      const opts = docD.querySelectorAll("#app .q .opt");
      let t = null; opts.forEach(o => { const lt = o.querySelector(".lt"); if (lt && lt.textContent.trim() === q.answer) t = o; });
      if (t) t.dispatchEvent(new winD.MouseEvent("click", { bubbles: true }));
    } else {
      const idx = q.answer.charCodeAt(0) - 65; const o = docD.querySelector('.q .opt[data-opt="' + idx + '"]');
      if (o) o.dispatchEvent(new winD.MouseEvent("click", { bubbles: true }));
    }
    ok("D: 第" + s + "题判分后「保存并退出」仍在操作区", !!docD.querySelector('#app .q .acts [data-act="exit"]'),
       docD.querySelector("#app .q .acts") ? docD.querySelector("#app .q .acts").innerHTML.slice(0, 120) : "no-acts");
    click(domD, '[data-act="next"]');
  }
  const progBefore = JSON.parse(winD.localStorage.getItem("peixun_jianhu_progress_v1") || "null");
  ok("D: 中途已存档进度(idx>=2)", !!(progBefore && progBefore.idx >= 2), JSON.stringify(progBefore));
  ok("D: 做题界面有「保存并退出」按钮", !!docD.querySelector('[data-act="exit"]'));
  click(domD, '[data-act="exit"]');
  const appD = docD.querySelector("#app").innerHTML;
  ok("D: 退出后首页显示「继续上次」", appD.indexOf("继续上次") >= 0, "idx=" + appD.indexOf("继续上次"));
  const progAfter = JSON.parse(winD.localStorage.getItem("peixun_jianhu_progress_v1") || "null");
  ok("D: 退出不清空进度存档", !!(progAfter && progAfter.idx >= 2), JSON.stringify(progAfter));
  ok("D: 点继续上次恢复到做题界面", click(domD, '[data-act="resume"]') && !!docD.querySelector("#app .q .qt"));

  console.log("\n=== E. 底部导航链接 ===");
  function hasFooterLink(relPath, href) {
    const html = fs.readFileSync(path.join(BASE, relPath), "utf8");
    const dom = new JSDOM(html); // 仅解析静态结构，不执行脚本
    return !!dom.window.document.querySelector('footer .footnav a[href="' + href + '"]');
  }
  const FOOTER = {
    "index.html": ["jianhu/index.html", "wuxiandian/index.html", "history.html", "../"],
    "jianhu/index.html": ["../", "../wuxiandian/index.html", "../history.html", "../../"],
    "wuxiandian/index.html": ["../", "../jianhu/index.html", "../history.html", "../../"],
    "history.html": ["index.html", "jianhu/index.html", "wuxiandian/index.html", "../"]
  };
  Object.keys(FOOTER).forEach(function (rel) {
    FOOTER[rel].forEach(function (l) {
      ok("E: " + rel + " 含底部导航 " + l, hasFooterLink(rel, l));
    });
  });

  console.log("=== F. 连做两场 → 累计 2 条（不丢、不重）===");
  const domF = await loadPage("jianhu/index.html", { localSeed: {} });
  ok("F: 第一场跑完", (await driveJianhu(domF)) === "done");
  const a1 = JSON.parse(domF.window.localStorage.getItem("peixun_jianhu_attempts_v1") || "null");
  ok("F: 第一场后 attempts=1", Array.isArray(a1) && a1.length === 1, JSON.stringify(a1));
  ok("F: 点「再来一次」可重新开始", click(domF, '[data-act="again"]') && !!domF.window.document.querySelector("#app .q"));
  ok("F: 第二场跑完", (await driveJianhu(domF, true)) === "done");
  const a2 = JSON.parse(domF.window.localStorage.getItem("peixun_jianhu_attempts_v1") || "null");
  ok("F: 两场后 attempts=2（累加不覆盖）", Array.isArray(a2) && a2.length === 2, a2 && JSON.stringify(a2.map(x => x.total)));

  console.log("=== G. 完成后 re-render 钩子不重复记（防 double-count）===");
  const domG = await loadPage("jianhu/index.html", { localSeed: {} });
  ok("G: 跑完一场", (await driveJianhu(domG)) === "done");
  const before = (JSON.parse(domG.window.localStorage.getItem("peixun_jianhu_attempts_v1") || "null") || []).length;
  // 模拟登录态 hydrate 完成后触发的全局重渲染（修复前的 bug：phase=summary 会再记一次 → 2）
  if (domG.window.__peixunReRender) domG.window.__peixunReRender();
  await new Promise(r => setTimeout(r, 60));
  const after = (JSON.parse(domG.window.localStorage.getItem("peixun_jianhu_attempts_v1") || "null") || []).length;
  ok("G: re-render 后 attempts 仍为 1（守卫防重复）", before === 1 && after === 1, "before=" + before + " after=" + after);

  console.log("\n=== 结果 ===");
  console.log("PASS=" + pass + "  FAIL=" + fail);
  process.exit(fail ? 1 : 0);
})();
