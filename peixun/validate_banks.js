#!/usr/bin/env node
// 校验 banks/ 下所有题库文件（递归 stages→subs→topics→reads）
// 规则：每道客观题 t∈{single,multi,bool}、有题干、选项带 A/B/C/D 字母前缀、有答案；
//       每张阅读卡有 q 与 a。统计客观题与阅读卡总数。
const fs = require("fs");
const path = require("path");

const BANKS = path.join(__dirname, "banks");
let problems = 0, totalObj = 0, totalReads = 0;

function err(msg) { problems++; console.log("  [✗] " + msg); }

function checkQ(q, ctx) {
  if (!q || typeof q !== "object") { err(ctx + ": 题目非对象"); return; }
  if (q.t !== "single" && q.t !== "multi" && q.t !== "bool") err(ctx + ": 题型 t 非法 (" + q.t + ")");
  if (typeof q.q !== "string" || !q.q.trim()) err(ctx + ": 题干 q 缺失");
  if (!q.options || typeof q.options !== "string" || !q.options.trim()) err(ctx + ": 选项 options 缺失");
  else {
    const opts = q.options.split("|").map(s => s.trim());
    if (opts.length < 2) err(ctx + ": 选项少于 2 个");
    opts.forEach(function (o, i) { if (!/^[A-Za-z]\s/.test(o)) err(ctx + ": 选项未带字母前缀 -> " + o.slice(0, 14)); });
  }
  if (q.a == null || q.a === "") err(ctx + ": 答案 a 缺失");
  totalObj++;
}

function checkRead(r, ctx) {
  if (!r || typeof r !== "object") { err(ctx + ": 阅读卡非对象"); return; }
  if (typeof r.q !== "string" || !r.q.trim()) err(ctx + ": 阅读卡题干 q 缺失");
  if (typeof r.a !== "string" || !r.a.trim()) err(ctx + ": 阅读卡参考答案 a 缺失");
  totalReads++;
}

function walk(node, ctx) {
  (node.questions || []).forEach(function (q, i) { checkQ(q, ctx + " 题#" + i); });
  (node.reads || []).forEach(function (r, i) { checkRead(r, ctx + " 阅#" + i); });
  (node.topics || []).forEach(function (t) { walk(t, ctx + "/" + t.name); });
  (node.subs || []).forEach(function (s) { walk(s, ctx + "/" + s.name); });
}

for (const f of fs.readdirSync(BANKS)) {
  if (!f.endsWith(".json")) continue;
  if (f === "_base.json" || f === "_index.json") continue;
  const examId = f.replace(/\.json$/, "");
  let bank;
  try { bank = JSON.parse(fs.readFileSync(path.join(BANKS, f), "utf8")); }
  catch (e) { err(examId + ": JSON 解析失败 - " + e.message); continue; }
  if (Array.isArray(bank)) {
    bank.forEach(function (q, i) { checkQ(q, examId + "#" + i); });
  } else if (bank.stages) {
    bank.stages.forEach(function (st) { (st.subs || []).forEach(function (s) { walk(s, examId + "/" + st.name + "/" + s.name); }); });
  } else if (bank.sub) {
    bank.sub.forEach(function (s) { walk(s, examId + "/" + s.name); });
  } else if (bank.questions) {
    bank.questions.forEach(function (q, i) { checkQ(q, examId + "#" + i); });
    if (bank.reads) bank.reads.forEach(function (r, i) { checkRead(r, examId + " 阅#" + i); });
  } else {
    err(examId + ": 既无 stages/sub 也无 questions");
  }
}

console.log("\n校验完成：问题 " + problems + " 处；客观题 " + totalObj + " + 阅读卡 " + totalReads);
process.exit(problems > 0 ? 1 : 0);
