// 运行时校验：用与 app.js 的 startQuiz/grade/parseOptions/selectedValue 完全一致的逻辑，
// 对 banks/ 下 6 个 lawfin 考试的真实题目逐题判分，断言：选正确项=对、选错项=错。
const fs = require("fs");
const path = require("path");
const BANKS = path.join(__dirname, "banks");

// ---- 以下 4 个函数逐字照搬 app.js（保证与线上引擎一致）----
function letterOf(i) { return String.fromCharCode(65 + i); }
function parseOptions(raw) {
  if (Array.isArray(raw)) return raw.map(function (o) { return typeof o === "string" ? o : (o.t != null ? o.t : o.k); });
  return String(raw).split("|").map(function (s) {
    var m = String(s).trim().match(/^[A-Za-z]\s*(.*)$/);
    return m ? m[1] : s.trim();
  });
}
function selectedValue(q, sel) {
  if (sel == null) return null;
  if (q.type === "bool") return sel === 0 ? "正确" : (sel === 1 ? "错误" : null);
  if (q.type === "multi") return sel.map(function (i) { return letterOf(i); });
  return letterOf(sel);
}
function grade(q, sel) {
  var v = selectedValue(q, sel);
  if (q.type === "multi") {
    if (!v || v.length !== q.answer.length) return false;
    var a = v.slice().sort(), b = q.answer.slice().sort();
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }
  return v === q.answer;
}

// 把 catalog 题目 {t,q,options,a} 规范为与 startQuiz 内部一致的 {type,options,answer}
function normalize(q) {
  return {
    type: q.t,
    options: parseOptions(q.options),
    answer: q.t === "multi"
      ? (Array.isArray(q.a) ? q.a : String(q.a).split("|").map(x => x.trim()))
      : (Array.isArray(q.a) ? q.a[0] : q.a)
  };
}
function optLetters(opts) { return opts.map((_, i) => letterOf(i)); }

const ids = ["lawyer", "cpa", "account", "audit", "stat", "taxagent"];
let pass = 0, fail = 0;
const fails = [];
for (const id of ids) {
  const arr = JSON.parse(fs.readFileSync(path.join(BANKS, id + ".json"), "utf8"));
  arr.forEach((q, i) => {
    const n = normalize(q);
    const letters = optLetters(n.options);
    // 正确选支
    let correctSel;
    if (n.type === "multi") correctSel = n.answer.map(L => letters.indexOf(L));
    else correctSel = letters.indexOf(n.answer);
    const okCor = grade(n, correctSel);
    // 错误选支：选一个不等于正确答案的组合
    let wrongSel;
    if (n.type === "multi") {
      // 取第一个非答案字母，替换掉答案第一项
      const alt = letters.find(L => !n.answer.includes(L));
      wrongSel = [letters.indexOf(alt)];
    } else {
      const alt = letters.find(L => L !== n.answer);
      wrongSel = letters.indexOf(alt);
    }
    const okWr = grade(n, wrongSel);
    if (okCor && !okWr) { pass++; }
    else { fail++; fails.push(`${id}[${i}] correct=${okCor} wrong=${okWr}`); }
  });
}
console.log(`\n判分校验：通过 ${pass} / 失败 ${fail}`);
if (fail) { console.log("失败项："); fails.forEach(f => console.log("  " + f)); process.exit(1); }
console.log("✓ 全部 lawfin 真实题目判分链路正确");
