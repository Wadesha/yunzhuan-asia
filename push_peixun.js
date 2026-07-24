/*
 * push_peixun.js — 通过 GitHub REST Contents API 推送/删除文件到 Wadesha/yunzhuan-asia (main)
 * 本地根目录 peixun/ 对应仓库 peixun/ 子目录（仓库根是零售集团主站）。
 * 用法：
 *   node push_peixun.js push <rel> [rel...]   // rel 含 peixun/ 前缀，如 peixun/jianhu/index.html
 *   node push_peixun.js del  <rel> [rel...]    // 删除仓库中指定文件
 */
const fs = require("fs");
const path = require("path");
const TOKEN = process.env.GITHUB_TOKEN || (function () {
  console.error("缺少 GITHUB_TOKEN 环境变量，请先 export GITHUB_TOKEN=ghp_...");
  process.exit(3);
})();
const REPO = "Wadesha/yunzhuan-asia";
const BRANCH = "main";
const API = "https://api.github.com/repos/" + REPO + "/contents/";
const HEADERS = {
  "Authorization": "Bearer " + TOKEN,
  "Content-Type": "application/json",
  "Accept": "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "peixun-push"
};
const BASE = "C:/Users/wade/WorkBuddy/2026-07-20-06-41-19/peixun";

// 本地在 peixun/ 下；仓库里刷题工具也在 peixun/ 子目录，故远程路径统一加 peixun/ 前缀
function remotePath(rel) { return "peixun/" + rel; }

async function getSha(rel) {
  const r = await fetch(API + remotePath(rel), { headers: HEADERS });
  if (r.status === 200) { const j = await r.json(); return j.sha; }
  if (r.status === 404) return null;
  throw new Error("GET " + rel + " -> " + r.status + " " + (await r.text()).slice(0, 120));
}

async function putFile(rel) {
  const abs = path.join(BASE, rel);
  const content = fs.readFileSync(abs).toString("base64");
  const sha = await getSha(rel);
  const body = { message: "feat(peixun): o轮加厚——4个n新考(enveng/mecheng/auction/realtagent各+20事实→196-200题)与7个低题量旧库(audit/broadcaster/comm/journalist/metrologist/publish/stat各+18事实→192-208题)全部拉到约200题; 总92库客观题24844+阅读卡126; 验证全绿(24844判分0/24844=24844/34UI); index.html ?v=20260722o 强刷", content, branch: BRANCH };
  if (sha) body.sha = sha;
  const r = await fetch(API + remotePath(rel), { method: "PUT", headers: HEADERS, body: JSON.stringify(body) });
  const txt = await r.text();
  if (r.status >= 200 && r.status < 300) { console.log("  OK   " + rel + (sha ? " (updated)" : " (created)")); return true; }
  console.log("  FAIL " + rel + " -> " + r.status + " " + txt.slice(0, 200));
  return false;
}

async function delFile(rel) {
  const sha = await getSha(rel);
  if (!sha) { console.log("  SKIP " + rel + " (not found)"); return true; }
  const r = await fetch(API + remotePath(rel), { method: "DELETE", headers: HEADERS,
    body: JSON.stringify({ message: "chore: remove stray root file", sha, branch: BRANCH }) });
  if (r.status >= 200 && r.status < 300) { console.log("  DEL  " + rel); return true; }
  console.log("  FAIL DEL " + rel + " -> " + r.status + " " + (await r.text()).slice(0, 200));
  return false;
}

(async function () {
  const mode = process.argv[2];
  const files = process.argv.slice(3);
  if (!mode || !files.length) { console.log("usage: node push_peixun.js push|del <rel> ..."); process.exit(2); }
  let ok = 0;
  for (const f of files) { if (await (mode === "del" ? delFile(f) : putFile(f))) ok++; }
  console.log("\n" + mode + " " + ok + "/" + files.length);
  process.exit(ok === files.length ? 0 : 1);
})();
