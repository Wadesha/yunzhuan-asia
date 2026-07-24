/*
 * push_root.js — 上传文件到仓库根目录（不带 peixun/ 前缀），用于修复根域名 404。
 * 用法：node push_root.js <localRel> <remoteRel> [message]
 */
const fs = require("fs");
const path = require("path");
const TOKEN = process.env.GITHUB_TOKEN || (function(){console.error("缺少 GITHUB_TOKEN");process.exit(3);})();
const REPO = "Wadesha/yunzhuan-asia";
const BRANCH = "main";
const API = "https://api.github.com/repos/" + REPO + "/contents/";
const HEADERS = {
  "Authorization": "Bearer " + TOKEN,
  "Content-Type": "application/json",
  "Accept": "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "root-push"
};
const LOCAL_BASE = "C:/Users/wade/WorkBuddy/2026-07-20-06-41-19";

async function getSha(rel){
  const r = await fetch(API + rel, { headers: HEADERS });
  if(r.status === 200){ const j = await r.json(); return j.sha; }
  if(r.status === 404) return null;
  throw new Error("GET "+rel+" -> "+r.status+" "+(await r.text()).slice(0,120));
}

(async function(){
  const localRel = process.argv[2];
  const remoteRel = process.argv[3] || localRel;
  const msg = process.argv[4] || ("chore: add root " + remoteRel + " to fix domain 404");
  if(!localRel){ console.log("usage: node push_root.js <localRel> <remoteRel> [message]"); process.exit(2); }
  const abs = path.join(LOCAL_BASE, localRel);
  const content = fs.readFileSync(abs).toString("base64");
  const sha = await getSha(remoteRel);
  const body = { message: msg, content, branch: BRANCH };
  if(sha) body.sha = sha;
  const r = await fetch(API + remoteRel, { method: "PUT", headers: HEADERS, body: JSON.stringify(body) });
  const txt = await r.text();
  if(r.status >= 200 && r.status < 300){ console.log("OK   " + remoteRel + (sha ? " (updated)" : " (created)")); process.exit(0); }
  console.log("FAIL " + remoteRel + " -> " + r.status + " " + txt.slice(0,300));
  process.exit(1);
})();
