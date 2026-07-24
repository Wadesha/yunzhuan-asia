// push_peixun_batch.js — 单提交批量推送：把本地 peixun/ 与远程的差异（新增+改动）合并成 1 个 commit
// 避免逐个 PUT 触发几十次 Vercel 部署。仅推 peixun/ 前缀文件，保留仓库其余文件。
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const TOKEN = process.env.GITHUB_TOKEN;
const REPO = "Wadesha/yunzhuan-asia";
const API = "https://api.github.com/repos/" + REPO + "/";
const H = { Authorization: "Bearer " + TOKEN, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "peixun-batch", "Content-Type": "application/json" };
const BASE = "C:/Users/wade/WorkBuddy/2026-07-20-06-41-19/peixun";
const EXCLUDE = new Set(["_diff.js", "__pycache__/generate_banks.cpython-313.pyc"]);
const MSG = "feat(peixun): 四轮目录扩展(14分类/149条目)+普通话重写为192道真实题; 同步全库至24836题(单提交)";

function gitBlobSha(buf) {
  return crypto.createHash("sha1").update(Buffer.concat([Buffer.from("blob " + buf.length + "\0", "utf8"), buf])).digest("hex");
}
function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (["node_modules", ".git", ".workbuddy"].includes(e.name)) continue; walk(p, out); }
    else { const rel = path.relative(BASE, p).split("\\").join("/"); if (!EXCLUDE.has(rel)) out.push(rel); }
  }
}
async function gh(url, opt) {
  const r = await fetch(url, opt); const t = await r.text();
  if (r.status < 200 || r.status >= 300) throw new Error(r.status + " " + url + " " + t.slice(0, 200));
  return t ? JSON.parse(t) : {};
}

(async function () {
  const files = []; walk(BASE, files);
  const local = {}; for (const f of files) local[f] = gitBlobSha(fs.readFileSync(path.join(BASE, f)));

  const tree = await gh(API + "git/trees/main?recursive=1", { headers: H });
  const remote = {}; for (const it of tree.tree) if (it.type === "blob" && it.path.startsWith("peixun/")) remote[it.path.slice(7)] = it.sha;

  const toPush = files.filter(f => !remote[f] || remote[f] !== local[f]);
  console.log("待推送(" + toPush.length + "):");
  toPush.forEach(f => console.log("  " + (remote[f] ? "~" : "+") + " " + f + "  " + (fs.statSync(path.join(BASE, f)).size / 1024).toFixed(0) + "KB"));

  // 1) 取当前提交
  const ref = await gh(API + "git/refs/heads/main", { headers: H });
  const baseCommit = ref.object.sha;
  const commit = await gh(API + "git/commits/" + baseCommit, { headers: H });
  const baseTree = commit.tree.sha;

  // 2) 创建 blob
  const entries = [];
  for (const f of toPush) {
    const buf = fs.readFileSync(path.join(BASE, f));
    const b = await gh(API + "git/blobs", { method: "POST", headers: H, body: JSON.stringify({ content: buf.toString("base64"), encoding: "base64" }) });
    entries.push({ path: f, mode: "100644", type: "blob", sha: b.sha });
  }
  // 3) 创建 tree（基于远程完整 tree，仅覆盖 peixun 改动）
  const t = await gh(API + "git/trees", { method: "POST", headers: H, body: JSON.stringify({ base_tree: baseTree, tree: entries }) });
  // 4) 创建 commit
  const c = await gh(API + "git/commits", { method: "POST", headers: H, body: JSON.stringify({ message: MSG, tree: t.sha, parents: [baseCommit] }) });
  // 5) 更新分支引用
  const u = await gh(API + "git/refs/heads/main", { method: "PATCH", headers: H, body: JSON.stringify({ sha: c.sha, force: false }) });
  console.log("\n已创建单提交:", c.sha.slice(0, 12), "| 推送文件数:", toPush.length, "| 1 次 Vercel 部署");
})().catch(e => { console.error("推送失败:", e.message); process.exit(1); });
