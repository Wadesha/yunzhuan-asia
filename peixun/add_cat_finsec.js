#!/usr/bin/env node
// 新增「金融从业延伸」类别到 _base.json（build 真正读取的源）与 _index.json（索引，供一致性/未来使用）
const fs = require("fs");
const path = require("path");
const BANKS = path.join(__dirname, "banks");

const base = JSON.parse(fs.readFileSync(path.join(BANKS, "_base.json"), "utf8"));
const idx = JSON.parse(fs.readFileSync(path.join(BANKS, "_index.json"), "utf8"));

const CATNAME = "金融从业延伸";
const CATCODE = "finsec";

// 每考试先放 2 道 demo，后续由 banks/<id>.json 覆盖
const newExams = [
  {
    id: "securities", name: "证券从业资格考试",
    demo: [
      { t: "single", q: "根据《证券法》，向不特定对象发行证券累计超过（ ）人的，属于公开发行。", options: "A 100|B 200|C 300|D 500", a: "B" },
      { t: "single", q: "负责证券投资基金行业监管的主体是（ ）。", options: "A 中国证券投资基金业协会|B 中国证券业协会|C 中国证监会|D 中国人民银行", a: "C" }
    ]
  },
  {
    id: "fund", name: "基金从业资格考试",
    demo: [
      { t: "single", q: "设立公募基金管理公司的注册资本应不低于（ ）且必须为实缴货币资本。", options: "A 5000万元人民币|B 1亿元人民币|C 3亿元人民币|D 5亿元人民币", a: "B" },
      { t: "single", q: "私募基金募集完毕后，应当在（ ）内向中国证券投资基金业协会备案。", options: "A 10个工作日|B 20个工作日|C 30个工作日|D 40个工作日", a: "B" }
    ]
  },
  {
    id: "futures", name: "期货从业资格考试",
    demo: [
      { t: "single", q: "期货市场可对冲现货市场价格风险的原理是（ ）。", options: "A 期货与现货价格变动趋势相同，且临近到期日两价格间差距变小|B 期货与现货价格变动趋势相反|C 期货价格波动幅度更大|D 现货价格波动幅度更大", a: "A" },
      { t: "single", q: "进行多头套期保值时，期货和现货两个市场盈亏相抵后有净盈利的情形是（ ）。", options: "A 基差走强|B 基差走弱|C 基差不变|D 基差为零", a: "B" }
    ]
  },
  {
    id: "actuary", name: "中国精算师（准精算师）",
    demo: [
      { t: "single", q: "已知年利率 i=0.05，则 100 元在 3 年末的复利终值为（ ）。", options: "A 115.76|B 112.50|C 110.25|D 105.00", a: "A" },
      { t: "single", q: "生命表中，符号 q_x 表示的是（ ）。", options: "A x岁的生存人数|B x岁的死亡人数|C x岁的死亡率|D x岁的平均余命", a: "C" }
    ]
  }
];

// 避免重复添加
if (base.some(c => c.name === CATNAME)) { console.error("类别已存在:", CATNAME); process.exit(1); }

base.push({
  name: CATNAME,
  exams: newExams.map(e => ({ id: e.id, name: e.name, questions: e.demo }))
});

for (const e of newExams) {
  if (idx[e.id]) { console.error("examId 已存在:", e.id); process.exit(1); }
  idx[e.id] = { cat: CATCODE, name: e.name };
}

fs.writeFileSync(path.join(BANKS, "_base.json"), JSON.stringify(base, null, 2) + "\n", "utf8");
fs.writeFileSync(path.join(BANKS, "_index.json"), JSON.stringify(idx, null, 2) + "\n", "utf8");
console.log("已新增类别:", CATNAME, "考试数:", newExams.length, "->", newExams.map(e => e.id).join(", "));
