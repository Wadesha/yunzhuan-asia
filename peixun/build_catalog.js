#!/usr/bin/env node
// 题库构建器：读 banks/_base.json（考试基底 + 元信息）+ banks/<examId>.json（真实题覆盖）
// 输出 catalog.js（window.EXAMS = [...]）
//
// bank 支持两种形态（均兼容）：
//   1) 旧 flat 数组：[ {t,q,options,a}, ... ]            -> exam.questions
//   2) 新 object：{ intro, benefit, levels, subjects,
//        stages:[ {id,name, subs:[ {id,name, topics?:[{id,name,questions,reads}], questions?, reads?} ]} ],
//        sub:[ {id,name, topics?:[{id,name,questions,reads}], questions?, reads?} ] }
//      - stages 与 sub 二选一（有阶段用 stages，否则用 sub 直接挂科目）
//      - topics 可选（科目下再分知识点）
//      - 任意节点可带 reads（阅读卡，不计分）
//      - 汇总 exam.questions（全量扁平）供统计/单入口；结构信息存 stages/sub（含 topics）
const fs = require("fs");
const path = require("path");

const BANKS = path.join(__dirname, "banks");
const base = JSON.parse(fs.readFileSync(path.join(BANKS, "_base.json"), "utf8"));

// 建立 examId -> {ci, ei} 索引
const loc = {};
base.forEach((c, ci) => c.exams.forEach((e, ei) => { loc[e.id] = { ci, ei }; }));

function mapTopic(t) {
  return { id: t.id, name: t.name, questions: t.questions || [], reads: Array.isArray(t.reads) ? t.reads : undefined };
}
function mapSub(s) {
  return {
    id: s.id, name: s.name,
    topics: Array.isArray(s.topics) ? s.topics.map(mapTopic) : undefined,
    questions: s.questions || [],
    reads: Array.isArray(s.reads) ? s.reads : undefined
  };
}
function mapStage(st) {
  return { id: st.id, name: st.name, subs: (st.subs || []).map(mapSub) };
}
function countReadsNode(node) {
  var n = node.reads ? node.reads.length : 0;
  (node.topics || []).forEach(function (t) { n += countReadsNode(t); });
  (node.subs || []).forEach(function (s) { n += countReadsNode(s); });
  return n;
}
function countReadsExam(exam) {
  var n = exam.reads ? exam.reads.length : 0;
  (exam.stages || []).forEach(function (st) { st.subs.forEach(function (s) { n += countReadsNode(s); }); });
  (exam.sub || []).forEach(function (s) { n += countReadsNode(s); });
  return n;
}

let replaced = 0, totalQ = 0, withSub = 0, withMeta = 0, totalReads = 0;
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
    let flat = [];
    function collect(node) {
      (node.questions || []).forEach(q => flat.push(q));
      if (Array.isArray(node.reads)) totalReads += node.reads.length;
      (node.topics || []).forEach(collect);
      (node.subs || []).forEach(collect);
    }
    if (Array.isArray(bank.stages) && bank.stages.length) {
      exam.stages = bank.stages.map(mapStage);
      exam.stages.forEach(st => st.subs.forEach(s => collect(s)));
      withSub++;
    } else if (Array.isArray(bank.sub) && bank.sub.length) {
      exam.sub = bank.sub.map(mapSub);
      exam.sub.forEach(collect);
      withSub++;
    } else if (Array.isArray(bank.questions)) {
      exam.questions = bank.questions;
      totalQ += bank.questions.length;
      if (Array.isArray(bank.reads)) { exam.reads = bank.reads; totalReads += bank.reads.length; }
    }
    exam.questions = flat.length ? flat : (exam.questions || []);
    totalQ += flat.length;
    if (typeof bank.intro === "string") { exam.intro = bank.intro; withMeta++; }
    if (typeof bank.benefit === "string") { exam.benefit = bank.benefit; withMeta++; }
    if (Array.isArray(bank.levels)) exam.levels = bank.levels;
    if (Array.isArray(bank.subjects)) exam.subjects = bank.subjects;
  }
  replaced++;
  const rn = countReadsExam(exam);
  const sk = exam.stages ? ("分 " + exam.stages.length + " 阶段") : (exam.sub ? ("分 " + exam.sub.length + " 科") : "");
  console.log(`  + ${examId}: ${exam.questions.length} 题` + (sk ? `（${sk}）` : "") + (rn ? ` + ${rn} 阅读卡` : ""));
}

const out = "window.EXAMS = " + JSON.stringify(base) + ";\n";
fs.writeFileSync(path.join(__dirname, "catalog.js"), out);

let allQ = 0;
base.forEach(c => c.exams.forEach(e => { allQ += (e.questions || []).length; }));
console.log(`\nDone. 覆盖 ${replaced} 个考试 bank；含分科/阶段 ${withSub} 个；catalog 总题量 ${allQ}（客观）+ 阅读卡 ${totalReads}`);
