#!/usr/bin/env node
// 向 banks/_base.json 增加「公职与编制」类别（civil/institution/teacherrec 三考试），并同步 _index.json
const fs = require("fs");
const path = require("path");
const BANKS = path.join(__dirname, "banks");
const base = JSON.parse(fs.readFileSync(path.join(BANKS, "_base.json"), "utf8"));
const idx = JSON.parse(fs.readFileSync(path.join(BANKS, "_index.json"), "utf8"));

const CAT_ID = "gov";
if (base.some(c => c.id === CAT_ID)) { console.log("类别已存在，跳过"); process.exit(0); }

base.push({
  id: CAT_ID,
  name: "公职与编制",
  note: "公务员、事业单位、教师招聘等进入体制内/事业编的常见笔试，招聘网站与公考社区讨论热度极高。",
  exams: [
    { id: "civil", name: "公务员录用考试（国考/省考）", body: "中央公务员主管部门（国家公务员局）/ 各省公务员局", levels: ["笔试（行测+申论）", "面试"] },
    { id: "institution", name: "事业单位公开招聘考试", body: "各省人力资源和社会保障厅（局）/ 事业单位人事综合管理部门", levels: ["笔试（公基+职测）", "面试"] },
    { id: "teacherrec", name: "教师招聘考试（教综+学科）", body: "各县区教育局 / 人社局（事业单位公开招聘）", levels: ["笔试（教育综合+学科专业）", "面试（试讲）"] }
  ]
});

Object.assign(idx, {
  civil: { cat: CAT_ID, name: "公务员录用考试" },
  institution: { cat: CAT_ID, name: "事业单位公开招聘" },
  teacherrec: { cat: CAT_ID, name: "教师招聘考试" }
});

fs.writeFileSync(path.join(BANKS, "_base.json"), JSON.stringify(base, null, 2) + "\n");
fs.writeFileSync(path.join(BANKS, "_index.json"), JSON.stringify(idx, null, 2) + "\n");
console.log("已添加类别「公职与编制」+ civil/institution/teacherrec，并同步 _index.json");
