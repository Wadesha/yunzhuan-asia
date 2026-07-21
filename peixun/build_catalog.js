#!/usr/bin/env node
// 题库构建器：读 banks/_base.json（考试基底 + 元信息）+ banks/<examId>.json（真实题覆盖）
// 输出 catalog.js（window.EXAMS = [...]）
//
// bank 文件两种形态（均兼容）：
//   1) 旧 flat 数组：[ {t,q,options,a}, ... ]            -> exam.questions
//   2) 新 object：{ intro, benefit, levels, subjects,
//                   sub:[ {id,name,questions:[...]}, ... ] }  -> 分科题库 + 介绍/好处
//      - 若有 sub，exam.sub 存分科，exam.questions 存其扁平汇总（兼容统计/单入口）
//      - intro/benefit 写入 exam，供详情页渲染
const fs = require("fs");
const path = require("path");

const BANKS = path.join(__dirname, "banks");
const base = JSON.parse(fs.readFileSync(path.join(BANKS, "_base.json"), "utf8"));

// 建立 examId -> {ci, ei} 索引
const loc = {};
base.forEach((c, ci) => c.exams.forEach((e, ei) => { loc[e.id] = { ci, ei }; }));

let replaced = 0, totalQ = 0, withSub = 0, withMeta = 0;
for (const f of fs.readdirSync(BANKS)) {
  if (!f.endsWith(".json")) continue;
  if (f === "_base.json" || f === "_index.json") continue;
  const examId = f.replace(/\.json$/, "");
  if (!loc[examId]) { console.warn("skip unknown bank:", f); continue; }
  const bank = JSON.parse(fs.readFileSync(path.join(BANKS, f), "utf8"));
  const { ci, ei } = loc[examId];
  const exam = base[ci].exams[ei];

  if (Array.isArray(bank)) {
    exam.questions = bank;
    totalQ += bank.length;
  } else {
    if (Array.isArray(bank.sub) && bank.sub.length) {
      exam.sub = bank.sub.map(s => ({
        id: s.id,
        name: s.name,
        questions: s.questions || []
      }));
      const flat = [];
      bank.sub.forEach(s => (s.questions || []).forEach(q => flat.push(q)));
      exam.questions = flat;
      totalQ += flat.length;
      withSub++;
    } else if (Array.isArray(bank.questions)) {
      exam.questions = bank.questions;
      totalQ += bank.questions.length;
    }
    if (typeof bank.intro === "string") { exam.intro = bank.intro; withMeta++; }
    if (typeof bank.benefit === "string") { exam.benefit = bank.benefit; withMeta++; }
    if (Array.isArray(bank.levels)) exam.levels = bank.levels;
    if (Array.isArray(bank.subjects)) exam.subjects = bank.subjects;
  }
  replaced++;
  console.log(`  + ${examId}: ${exam.questions.length} 题` + (exam.sub ? `（分 ${exam.sub.length} 科）` : ""));
}

const out = "window.EXAMS = " + JSON.stringify(base) + ";\n";
fs.writeFileSync(path.join(__dirname, "catalog.js"), out);

let allQ = 0;
base.forEach(c => c.exams.forEach(e => { allQ += (e.questions || []).length; }));
console.log(`\nDone. 覆盖 ${replaced} 个考试 bank；含分科 ${withSub} 个；含介绍/好处 ${withMeta} 项；catalog 总题量 ${allQ}`);
