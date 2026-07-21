// 校验 banks/ 下各考试 bank：格式、答案命中、single/multi 类型
const fs = require("fs");
const path = require("path");
const BANKS = path.join(__dirname, "banks");

let errors = 0, total = 0, totalReads = 0;
function collectReads(bank) {
  let reads = [];
  if (bank && Array.isArray(bank.sub)) bank.sub.forEach(s => { if (Array.isArray(s.reads)) reads = reads.concat(s.reads); });
  else if (bank && Array.isArray(bank.reads)) reads = bank.reads;
  return reads;
}
for (const f of fs.readdirSync(BANKS)) {
  if (!f.endsWith(".json") || f === "_base.json" || f === "_index.json") continue;
  const id = f.replace(/\.json$/, "");
  let bank;
  try { bank = JSON.parse(fs.readFileSync(path.join(BANKS, f), "utf8")); }
  catch (e) { console.log(`✗ ${id}: JSON 解析失败 ${e.message}`); errors++; continue; }
  let arr;
  if (Array.isArray(bank)) arr = bank;
  else if (bank && Array.isArray(bank.sub)) arr = [].concat.apply([], bank.sub.map(s => s.questions || []));
  else if (bank && Array.isArray(bank.questions)) arr = bank.questions;
  else { console.log(`✗ ${id}: 非数组且不含 sub/questions`); errors++; continue; }
  arr.forEach((q, i) => {
    total++;
    const tag = `${id}[${i}]`;
    if (!q.t || !["single", "multi"].includes(q.t)) { console.log(`✗ ${tag}: 题型异常 ${q.t}`); errors++; return; }
    if (!q.q || typeof q.q !== "string") { console.log(`✗ ${tag}: 题干缺失`); errors++; }
    if (!q.options || typeof q.options !== "string") { console.log(`✗ ${tag}: options 缺失`); errors++; return; }
    const opts = q.options.split("|").map(s => s.trim()).filter(Boolean);
    if (opts.length < 2) { console.log(`✗ ${tag}: 选项不足2个 (${opts.length})`); errors++; }
    const letters = opts.map(o => o.charAt(0));
    if (new Set(letters).size !== letters.length) { console.log(`✗ ${tag}: 选项字母重复 ${letters.join(",")}`); errors++; }
    if (q.t === "single") {
      if (typeof q.a !== "string") { console.log(`✗ ${tag}: single 答案应为字符串，实际 ${JSON.stringify(q.a)}`); errors++; return; }
      if (!letters.includes(q.a)) { console.log(`✗ ${tag}: 答案 ${q.a} 不在选项 ${letters.join(",")}`); errors++; }
    } else {
      if (!Array.isArray(q.a) || q.a.length < 1) { console.log(`✗ ${tag}: multi 答案应为非空数组`); errors++; return; }
      for (const x of q.a) if (!letters.includes(x)) { console.log(`✗ ${tag}: 答案项 ${x} 不在选项 ${letters.join(",")}`); errors++; }
    }
  });
  // 阅读卡（主观题例题+参考答案）校验：q/a 必填，e 可选
  const reads = collectReads(bank);
  reads.forEach((r, i) => {
    totalReads++;
    const tag = `${id}.read[${i}]`;
    if (!r.q || typeof r.q !== "string") { console.log(`✗ ${tag}: 阅读卡题干缺失`); errors++; }
    if (!r.a || typeof r.a !== "string") { console.log(`✗ ${tag}: 阅读卡参考答案缺失`); errors++; }
  });
  console.log(`  ${id}: ${arr.length} 题校验通过` + (reads.length ? ` · ${reads.length} 阅读卡` : ""));
}
console.log(`\n总计 ${total} 客观题 + ${totalReads} 阅读卡，发现 ${errors} 处问题`);
process.exit(errors ? 1 : 0);
