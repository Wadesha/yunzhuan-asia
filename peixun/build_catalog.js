#!/usr/bin/env node
// 题库构建器：读 banks/_base.json（53 考试 demo 基底）+ banks/<examId>.json（真实题覆盖）
// 输出 catalog.js（window.EXAMS = [...]）
const fs = require("fs");
const path = require("path");

const BANKS = path.join(__dirname, "banks");
const base = JSON.parse(fs.readFileSync(path.join(BANKS, "_base.json"), "utf8"));

// 建立 examId -> {catIdx, examIdx} 索引
const loc = {};
base.forEach((c, ci) => c.exams.forEach((e, ei) => { loc[e.id] = { ci, ei }; }));

let replaced = 0, totalQ = 0;
for (const f of fs.readdirSync(BANKS)) {
  if (!f.endsWith(".json")) continue;
  if (f === "_base.json" || f === "_index.json") continue;
  const examId = f.replace(/\.json$/, "");
  if (!loc[examId]) { console.warn("skip unknown bank:", f); continue; }
  const qs = JSON.parse(fs.readFileSync(path.join(BANKS, f), "utf8"));
  if (!Array.isArray(qs)) { console.warn("bank not array:", f); continue; }
  const { ci, ei } = loc[examId];
  base[ci].exams[ei].questions = qs;
  replaced++;
  totalQ += qs.length;
  console.log(`  + ${examId}: ${qs.length} 题`);
}

const out = "window.EXAMS = " + JSON.stringify(base) + ";\n";
fs.writeFileSync(path.join(__dirname, "catalog.js"), out);

let allQ = 0;
base.forEach(c => c.exams.forEach(e => { allQ += (e.questions || []).length; }));
console.log(`\nDone. 覆盖 ${replaced} 个考试 bank；本次 bank 题量 ${totalQ}；catalog 总题量 ${allQ}`);
