/* peixun 考试目录 SPA 引擎：哈希路由 + 点击即判分 + 做题进度
   数据来自 catalog.js（window.EXAMS）。做题记录经 store.js 抽象层持久化：
   登录云端账号（手机号）后随账号同步，未登录则仅存本机 localStorage。 */
(function () {
  "use strict";
  var EXAMS = window.EXAMS || [];

  /* ---------- 做题统计（随账号系统同步，无本地多用户切换） ---------- */
  function statsKey() { return "peixun_stats_v1"; }
  function loadStats() {
    var s = Sget(statsKey());
    return (s && s.stats) ? s.stats : {};
  }
  function saveStats(st) { Sset(statsKey(), { stats: st }); }
  function record(qkey, ok) {
    var st = loadStats();
    var e = st[qkey] || { c: 0, w: 0 };
    if (ok) e.c++; else e.w++;
    st[qkey] = e;
    saveStats(st);
  }
  // 累计做题历史（每场考试完成即落盘，供历史页时间线聚合）
  var ATTEMPT_KEY = "peixun_spa_attempts_v1";
  function recordAttempt() {
    if (quiz && quiz.attempted) return; // 每场只记一次，防止 re-render 钩子重复触发
    try {
      if (!quiz) return;
      var total = quiz.list.length; if (!total) return;
      var acc = Math.round(100 * quiz.correct / total);
      var a = Sget(ATTEMPT_KEY); if (!Array.isArray(a)) a = [];
      a.unshift({ ts: Date.now(), catId: quiz.catId, examId: quiz.examId, ids: quiz.ids,
                  total: total, correct: quiz.correct, wrong: quiz.wrong, acc: acc });
      if (a.length > 50) a.length = 50;
      Sset(ATTEMPT_KEY, a);
      quiz.attempted = true;
    } catch (e) {}
  }
  function userProgress(qkeys) {
    var st = loadStats(), done = 0, cor = 0;
    qkeys.forEach(function (k) {
      var e = st[k];
      if (e && (e.c + e.w) > 0) { done++; if (e.c >= e.w && e.c > 0) cor++; }
    });
    return { done: done, total: qkeys.length, cor: cor };
  }

  /* ---------- 语音朗读（Web Speech API，纯前端，只读题干） ---------- */
  var speechOK = !!(window.speechSynthesis) && (typeof SpeechSynthesisUtterance !== "undefined");
  var synth = speechOK ? window.speechSynthesis : null;
  var zhVoice = null, voiceReady = false, speechUnlocked = false, _speakToken = 0;
  var reading = false;
  var lastReadId = null;
  var AUTO_READ_KEY = "peixun_autoread_v1";
  function loadAutoRead(){ try { return localStorage.getItem(AUTO_READ_KEY) === "1"; } catch(e){ return false; } }
  function saveAutoRead(){ try { localStorage.setItem(AUTO_READ_KEY, autoRead ? "1" : "0"); } catch(e){} }
  var autoRead = loadAutoRead();
  function pickVoice(){
    if(!synth) return;
    var vs = synth.getVoices() || [];
    zhVoice = vs.filter(function(v){ return /zh|cmn|Chinese/i.test(v.lang + " " + v.name); })[0] || null;
    voiceReady = vs.length > 0;
  }
  function unlockSpeech(){ speechUnlocked = true; if(synth && !voiceReady) pickVoice(); }
  if(synth){
    pickVoice();
    if("onvoiceschanged" in synth) synth.onvoiceschanged = pickVoice;
    setTimeout(pickVoice, 250); // 部分浏览器首次异步加载嗓音
  }
  function stopRead(){ if(synth) synth.cancel(); }
  function readAloud(text){
    if(!synth) return;
    synth.cancel();
    var tok = ++_speakToken;
    var u = new SpeechSynthesisUtterance(String(text == null ? "" : text));
    u.lang = "zh-CN"; u.rate = 1; u.pitch = 1;
    if(zhVoice) u.voice = zhVoice;
    u.onend = function(){ if(tok!==_speakToken) return; reading = false; renderReadBtn(); };
    u.onerror = function(){ if(tok!==_speakToken) return; reading = false; renderReadBtn(); };
    synth.speak(u);
    // 移动端 Chromium 偶发不发声：稍后检测，未开始则重试一次
    setTimeout(function(){
      if(tok!==_speakToken) return;
      try { if(synth && !synth.speaking) synth.speak(u); } catch(e){}
    }, 300);
  }
  function renderReadBtn(){
    var el = document.querySelector("#app .btn.read");
    if(!el) return;
    el.className = "btn read" + (reading ? " on" : "");
    el.textContent = reading ? "停止朗读" : "朗读题干";
  }
  function appEl(){ return document.getElementById("app"); }

  /* ---------- 工具 ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function letterOf(i) { return String.fromCharCode(65 + i); }
  function findCat(id) {
    for (var i = 0; i < EXAMS.length; i++) if (EXAMS[i].id === id) return EXAMS[i];
    return null;
  }
  function findExam(cat, eid) {
    if (!cat) return null;
    for (var i = 0; i < cat.exams.length; i++) if (cat.exams[i].id === eid) return cat.exams[i];
    return null;
  }

  /* ---------- 判分引擎（与既有模块一致） ---------- */
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
  function correctIdx(q) {
    if (q.type === "bool") return [q.answer === "正确" ? 0 : 1];
    if (q.type === "multi") return q.answer.map(function (L) { return L.charCodeAt(0) - 65; });
    return [q.answer.charCodeAt(0) - 65];
  }
  function matchSet(q, arr) {
    var S = arr.map(letterOf).sort().join("");
    var C = q.answer.slice().sort().join("");
    return S === C;
  }
  function answerText(q) {
    if (q.type === "multi") return q.answer.join("、");
    return q.answer;
  }
  // 朗读正确选项的【具体内容文字】，而非字母标签（如 B）
  function correctText(q) {
    if (q.type === "bool") return q.answer;
    if (q.type === "multi") return q.answer.map(function (L) { var i = (typeof L === "number") ? L : (L.charCodeAt(0) - 65); return q.options[i]; }).join("；");
    var i = (typeof q.answer === "number") ? q.answer : (q.answer.charCodeAt(0) - 65);
    return q.options[i];
  }
  // 判分后朗读正确答案（与自动朗读题干相互独立；朗读的是选项内容）
  function readAnswer(q) {
    if (!synth) return;
    var isCor = grade(q, quiz.sel[q.id]);
    readAloud(correctText(q));
  }

  /* ---------- 当前刷题会话 ---------- */
  var quiz = null;

  /* ---------- 主观题阅读卡（例题+参考答案，不计分、可收藏） ---------- */
  var readState = null;
  var READ_FAV_KEY = "peixun_reads_fav_v1";
  function loadReadFavs() { var a = Sget(READ_FAV_KEY); return Array.isArray(a) ? a : []; }
  function toggleReadFav(key) { var a = loadReadFavs(); var i = a.indexOf(key); if (i >= 0) a.splice(i, 1); else a.push(key); Sset(READ_FAV_KEY, a); }
  function countReads(exam) {
    var n = 0;
    if (exam.reads) n += exam.reads.length;
    if (exam.sub) exam.sub.forEach(function (s) { if (s.reads) n += s.reads.length; });
    return n;
  }
  function gatherReads(cat, exam, ids) {
    ids = ids || [];
    var list = [];
    function pushFrom(arr, ctx) { (arr || []).forEach(function (r, i) { list.push({ q: r.q, a: r.a, e: r.e || null, key: ctx + "/" + i }); }); }
    function collect(node, ctx) {
      pushFrom(node.reads, ctx);
      childrenOf(node).forEach(function (c) { collect(c, ctx + "/" + c.id); });
    }
    if (ids.length === 0) {
      pushFrom(exam.reads, cat.id + "/" + exam.id);
      examTopLevel(exam).forEach(function (n) { collect(n, cat.id + "/" + exam.id + "/" + n.id); });
    } else {
      var r = resolvePath(exam, ids);
      if (!r || !r.current) return list;
      collect(r.current, pathKey(cat.id, exam.id, ids));
    }
    return list;
  }
  // 将 catalog 中的 options 字符串（"A 文本|B 文本|..."）规范为纯文本数组，
  // 字母下标由 letterOf(index) 提供，避免重复。兼容已经为数组的情况。
  function parseOptions(raw) {
    if (Array.isArray(raw)) return raw.map(function (o) { return typeof o === "string" ? o : (o.t != null ? o.t : o.k); });
    return String(raw).split("|").map(function (s) {
      var m = String(s).trim().match(/^[A-Za-z]\s*(.*)$/);
      return m ? m[1] : s.trim();
    });
  }
  function findSub(exam, subId) {
    if (!exam || !exam.sub || !subId) return null;
    for (var i = 0; i < exam.sub.length; i++) if (exam.sub[i].id === subId) return exam.sub[i];
    return null;
  }
  // ---- 四层导航：考试→阶段→科目→知识点（任意层可选）----
  function examTopLevel(exam) {
    if (exam.stages && exam.stages.length) return exam.stages;
    if (exam.sub && exam.sub.length) return exam.sub;
    if (exam.questions && exam.questions.length) return [exam];
    return [];
  }
  function childrenOf(node) { return (node.subs || node.topics || []); }
  function resolvePath(exam, ids) {
    var arr = examTopLevel(exam), chain = [];
    for (var i = 0; i < ids.length; i++) {
      var found = null;
      for (var j = 0; j < arr.length; j++) if (arr[j].id === ids[i]) { found = arr[j]; break; }
      if (!found) return null;
      chain.push(found); arr = childrenOf(found);
    }
    return { chain: chain, current: ids.length ? chain[chain.length - 1] : null, top: examTopLevel(exam) };
  }
  function nodeQuestions(node) { return node.questions || []; }
  function descendantQCount(node) {
    var n = (node.questions || []).length;
    childrenOf(node).forEach(function (c) { n += descendantQCount(c); });
    return n;
  }
  function descendantReadCount(node) {
    var n = (node.reads ? node.reads.length : 0);
    childrenOf(node).forEach(function (c) { n += descendantReadCount(c); });
    return n;
  }
  function countReadsExam(exam) {
    var n = exam.reads ? exam.reads.length : 0;
    examTopLevel(exam).forEach(function (s) { n += descendantReadCount(s); });
    return n;
  }
  function pathKey(catId, examId, ids) { return catId + "/" + examId + (ids && ids.length ? "/" + ids.join("/") : ""); }
  function pathEq(a, b) { a = a || []; b = b || []; if (a.length !== b.length) return false; for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; }

  function startQuiz(catId, examId, ids) {
    ids = ids || [];
    var cat = findCat(catId), exam = findExam(cat, examId);
    if (!exam) return;
    var r = resolvePath(exam, ids);
    var node = r ? r.current : null;
    var source = node || exam;
    var qs = nodeQuestions(source);
    if (!qs.length) return;
    var list = qs.map(function (q, i) {
      return {
        id: "q" + i,
        type: q.t,
        q: q.q,
        options: parseOptions(q.options),
        answer: q.t === "multi"
          ? (Array.isArray(q.a) ? q.a : String(q.a).split("|").map(function (x) { return x.trim(); }))
          : (Array.isArray(q.a) ? q.a[0] : q.a),
        exp: q.e || null,
        qkey: pathKey(catId, examId, ids) + "/" + i
      };
    });
    quiz = { catId: catId, examId: examId, ids: ids.slice(), list: list, idx: 0, sel: {}, graded: {}, correct: 0, wrong: 0, attempted: false };
    lastReadId = null;
    // 同步 URL hash，否则 render() 按 route.ids（阶段层）判定不匹配 quiz.ids（科目层），会重渲染目录页而不进题目
    location.hash = "#/exam/" + catId + "/" + examId + (ids.length ? "/" + ids.join("/") : "");
    render();
  }
  function doGrade(q) {
    if (quiz.graded[q.id]) return;
    quiz.graded[q.id] = true;
    var ok = grade(q, quiz.sel[q.id]);
    if (ok) quiz.correct++; else quiz.wrong++;
    record(q.qkey, ok);
  }

  /* ---------- 进度持久化（断点续刷，按用户+考试隔离） ---------- */
  function Sget(k){ if(window.Store) return window.Store.get(k); try { return JSON.parse(localStorage.getItem(k) || "null"); } catch(e){ return null; } }
  function Sset(k,v){ if(window.Store) return window.Store.set(k,v); try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
  function Srem(k){ if(window.Store) return window.Store.remove(k); try { localStorage.removeItem(k); } catch(e){} }
  function progressKey(catId, examId, ids) {
    var suf = "";
    if (Array.isArray(ids) && ids.length) suf = "_" + ids.join("_");
    else if (typeof ids === "string" && ids) suf = "_" + ids;
    return "peixun_quiz_v1_" + catId + "_" + examId + suf;
  }
  function saveQuizProgress() {
    try {
      if (!quiz) return;
      Sset(progressKey(quiz.catId, quiz.examId, quiz.ids), {
        idx: quiz.idx, sel: quiz.sel, graded: quiz.graded,
        correct: quiz.correct, wrong: quiz.wrong, ts: Date.now()
      });
    } catch (e) {}
  }
  function loadQuizProgress(catId, examId, ids) {
    try {
      var p = Sget(progressKey(catId, examId, ids));
      if (!p) return null;
      return p;
    } catch (e) { return null; }
  }
  function clearQuizProgress(catId, examId, ids) {
    try { Srem(progressKey(catId, examId, ids)); } catch (e) {}
  }

  /* ---------- 渲染：选项 ---------- */
  function optHtml(q) {
    var cur = quiz.sel[q.id];
    var graded = quiz.graded[q.id];
    var isMulti = q.type === "multi";
    var corr = correctIdx(q);
    return q.options.map(function (o, oi) {
      var lab = (q.type === "bool") ? o : letterOf(oi);
      var selected = isMulti ? (cur && cur.indexOf(oi) >= 0) : (cur === oi);
      var cls = "opt";
      if (graded) {
        if (corr.indexOf(oi) >= 0) cls += " ok";
        else if (selected) cls += " no";
      } else if (selected) {
        cls += " on";
      }
      return '<div class="' + cls + '" data-opt="' + oi + '"><span class="lk">' + lab +
        '</span><span class="lt">' + esc(o) + '</span></div>';
    }).join("");
  }

  // 局部更新：避免整题 innerHTML 重建导致的布局跳动
  function paintOptions(q) {
    var graded = !!quiz.graded[q.id];
    var cur = quiz.sel[q.id];
    var corr = correctIdx(q);
    var isMulti = q.type === "multi";
    var opts = appEl().querySelectorAll(".q .opt");
    for (var i = 0; i < opts.length; i++) {
      var el = opts[i];
      var oi = parseInt(el.getAttribute("data-opt"), 10);
      var selected = isMulti ? (cur && cur.indexOf(oi) >= 0) : (cur === oi);
      var cls = "opt";
      if (graded) {
        if (corr.indexOf(oi) >= 0) cls += " ok";
        else if (selected) cls += " no";
      } else if (selected) {
        cls += " on";
      }
      el.className = cls;
    }
  }
  // 判分反馈 HTML（含解析/考点）；showFeedback 与 renderQuiz 共用，保证一致
  function fbHtml(q) {
    var isCor = grade(q, quiz.sel[q.id]);
    var html = '<div class="fb ' + (isCor ? "ok" : "no") + '">' + (isCor ? "回答正确" : "回答错误") +
      ' · 正确答案：' + esc(answerText(q)) + '</div>';
    if (q.exp) {
      var ex = String(q.exp).replace(/^考点[：:]\s*/, "");
      html += '<div class="exp"><span class="exp-h">解析 / 考点</span>' + esc(ex) + '</div>';
    }
    return html;
  }
  function showFeedback(q) {
    var fb = appEl().querySelector(".q .fb");
    if (quiz.graded[q.id]) {
      var html = fbHtml(q);
      var oldExp = appEl().querySelector(".q .exp");
      if (oldExp) oldExp.parentNode.removeChild(oldExp);
      if (fb) {
        fb.insertAdjacentHTML("afterend", html);
        fb.parentNode.removeChild(fb);
      } else {
        var acts = appEl().querySelector(".q .acts");
        if (acts) acts.insertAdjacentHTML("beforebegin", html);
      }
    } else if (fb) { fb.parentNode.removeChild(fb); }
  }
  function renderActions(q) {
    var acts = appEl().querySelector(".q .acts");
    if (!acts) return;
    var graded = !!quiz.graded[q.id];
    var html = "";
    if (graded) { html = '<button class="btn primary" data-act="next">下一题</button>'; }
    else if (q.type === "multi") {
      var has = quiz.sel[q.id] && quiz.sel[q.id].length > 0;
      html = '<button class="btn primary" data-act="confirm"' + (has ? "" : ' disabled style="opacity:.45;cursor:not-allowed;"') + '>确认本题</button>';
    } else { html = ''; }
    acts.innerHTML = html + '<button class="btn ghost" data-act="exit">保存并退出</button>';
  }

  /* ---------- 路由 ---------- */
  function parseHash() {
    var h = location.hash.replace(/^#\/?/, "");
    var parts = h.split("/").filter(Boolean);
    if (parts[0] === "cat" && parts[1]) return { view: "cat", catId: parts[1] };
    if (parts[0] === "exam" && parts[1] && parts[2]) return { view: "exam", catId: parts[1], examId: parts[2], ids: parts.slice(3) };
    if (parts[0] === "read" && parts[1] && parts[2]) return { view: "read", catId: parts[1], examId: parts[2], ids: parts.slice(3) };
    return { view: "home" };
  }

  function renderRead(route) {
    var cat = findCat(route.catId), exam = findExam(cat, route.examId);
    if (!exam) { location.hash = "#/cat/" + route.catId; return; }
    var ids = route.ids || [];
    var list = gatherReads(cat, exam, ids);
    if (!list.length) { location.hash = "#/exam/" + route.catId + "/" + route.examId + (ids.length ? "/" + ids.join("/") : ""); return; }
    var idx = (readState && readState.catId === route.catId && readState.examId === route.examId && pathEq(readState.ids, ids))
      ? Math.min(readState.idx, list.length - 1) : 0;
    readState = { catId: route.catId, examId: route.examId, ids: ids, list: list, idx: idx };
    var card = list[idx];
    var favs = loadReadFavs();
    var faved = favs.indexOf(card.key) >= 0;
    var nodeName = "";
    if (ids.length) { var rr = resolvePath(exam, ids); if (rr && rr.current) nodeName = rr.chain.map(function (n) { return n.name; }).join(" / "); }
    var title = exam.name + (nodeName ? " · " + nodeName : "");
    var backHash = "#/exam/" + cat.id + "/" + exam.id + (ids.length ? "/" + ids.join("/") : "");
    document.getElementById("app").innerHTML =
      '<p class="crumb"><a href="#">职业资格考试</a> / <a href="#/cat/' + cat.id + '">' + esc(cat.name) + '</a> / <a href="#/exam/' + cat.id + '/' + exam.id + '">' + esc(exam.name) + '</a> / 阅读卡</p>' +
      '<div class="modnav"><a href="' + backHash + '">返回</a></div>' +
      '<h1 class="page-title">主观题 / 例题 参考答案</h1>' +
      '<p class="page-sub">' + esc(title) + ' · 第 ' + (idx + 1) + ' / ' + list.length + ' 张（不计分，供背诵与对照）</p>' +
      '<div class="q read-card"><div class="qt">' + esc(card.q) + '</div>' +
        '<div class="acts">' +
          '<button class="btn" data-act="show-ans">显示参考答案</button>' +
          '<button class="btn ghost' + (faved ? ' fav' : '') + '" data-act="fav-read">' + (faved ? '已收藏' : '收藏') + '</button>' +
        '</div>' +
        '<div class="ans" data-ans style="display:none;">' +
          '<div class="ans-h">参考答案</div><div class="ans-b">' + esc(card.a).replace(/\n/g, '<br>') + '</div>' +
          (card.e ? '<div class="exp"><span class="exp-h">解析 / 考点</span>' + esc(String(card.e).replace(/^考点[：:]\s*/, '')) + '</div>' : '') +
        '</div>' +
      '</div>' +
      '<div class="acts">' +
        (idx > 0 ? '<button class="btn" data-act="prev-read">上一张</button>' : '') +
        (idx < list.length - 1 ? '<button class="btn primary" data-act="next-read">下一张</button>' : '<button class="btn primary" data-act="read-done">完成</button>') +
      '</div>';
  }

  function renderHome() {
    var cats = EXAMS.map(function (c) {
      var n = c.exams.length;
      var quizN = 0;
      c.exams.forEach(function (e) { if (e.quiz !== false) quizN++; });
      return '<a class="card" href="#/cat/' + c.id + '">' +
        '<div class="ct">' + esc(c.name) + '</div>' +
        '<div class="cd">共 ' + n + ' 项' + (quizN ? '，可刷题 ' + quizN + ' 项' : '') + '</div>' +
        '<div class="cm">进入 ›</div></a>';
    }).join("");
    var app = document.getElementById("app");
    app.innerHTML =
      '<h1 class="page-title">职业资格考试 · 刷题目录</h1>' +
      '<p class="page-sub">国家职业资格考试（笔试形态）目录 + 技能人员职业资格信息。点击分类进入，选择考试即可刷题。' +
      '每考试附少量贴合其真实科目范围的演示题（非官方真题，仅供参考）。</p>' +
      '<div class="notebox">本目录为各职业资格考试（笔试形态）的演示题库，题目依据公开科目范围编写，<b>非官方真题</b>，仅供参考。进入考试后可刷题，<b>判分后会自动朗读正确答案</b>；做题记录登录云端账号后随手机同步，未登录则仅存本机。下方为既有的独立刷题模块。</div>' +
      '<div class="modnav"><span class="cur">刷题目录</span><a href="jianhu/">监护刷题</a><a href="wuxiandian/">业余无线电刷题</a></div>' +
      '<div class="cards">' + cats + '</div>' +
      '<div class="section-h">其他刷题模块（既有）</div>' +
      '<div class="cards">' +
        '<a class="card" href="jianhu/"><div class="ct">监护培训考核</div><div class="cd">第三方施工旁站监护题库</div><div class="cm">进入 ›</div></a>' +
        '<a class="card" href="wuxiandian/"><div class="ct">业余无线电台操作技术能力验证</div><div class="cd">2025 年版题库（683 题）</div><div class="cm">进入 ›</div></a>' +
      '</div>';
  }

  function renderCat(route) {
    var cat = findCat(route.catId);
    if (!cat) { location.hash = ""; return; }
    var cards = cat.exams.map(function (e) {
      var tag = e.quiz === false ? "信息" : "可刷题";
      return '<a class="card" href="#/exam/' + cat.id + '/' + e.id + '">' +
        '<div class="ct">' + esc(e.name) + '</div>' +
        '<div class="cd">' + esc((e.body || "") + (e.levels ? " · " + e.levels.join("/") : "")) + '</div>' +
        '<div class="cm">' + tag + ' ›</div></a>';
    }).join("");
    document.getElementById("app").innerHTML =
      '<p class="crumb"><a href="#">职业资格考试</a> / ' + esc(cat.name) + '</p>' +
      '<div class="modnav"><a href="#">刷题目录</a><a href="jianhu/">监护刷题</a><a href="wuxiandian/">业余无线电刷题</a></div>' +
      '<h1 class="page-title">' + esc(cat.name) + '</h1>' +
      (cat.note ? '<p class="page-sub">' + esc(cat.note) + '</p>' : '') +
      '<div class="notebox">点击考试卡片进入；可刷题的考试点「开始刷题」即进入题目，<b>判分后自动朗读正确答案</b>。</div>' +
      '<div class="cards">' + cards + '</div>';
  }

  function allQkeys(catId, exam) {
    var keys = [];
    function walk(node, prefix) {
      (node.questions || []).forEach(function (_, i) { keys.push(prefix + "/" + i); });
      childrenOf(node).forEach(function (c) { walk(c, prefix + "/" + c.id); });
    }
    examTopLevel(exam).forEach(function (n) { walk(n, catId + "/" + exam.id + "/" + n.id); });
    return keys;
  }

  function renderTree(route) {
    var cat = findCat(route.catId), exam = findExam(cat, route.examId);
    if (!exam) { location.hash = "#/cat/" + route.catId; return; }
    var ids = route.ids || [];
    var children, curNode = null, breadcrumb = [exam.name];
    if (ids.length === 0) {
      children = examTopLevel(exam);
    } else {
      var r = resolvePath(exam, ids);
      if (!r) { location.hash = "#/cat/" + route.catId; return; }
      curNode = r.current;
      breadcrumb = r.chain.map(function (n) { return n.name; });
      children = childrenOf(curNode);
    }
    var qkeys = allQkeys(route.catId, exam);
    var prog = userProgress(qkeys);
    var chip = function (arr, label) {
      if (!arr || !arr.length) return "";
      return '<div class="section-h">' + label + '</div><div class="chips">' +
        arr.map(function (x) { return '<span class="chip on">' + esc(x) + '</span>'; }).join("") + '</div>';
    };
    var body;
    if (children.length) {
      body = renderNodeList(cat, exam, ids, children);
    } else {
      body = renderLeaf(cat, exam, ids, curNode || exam);
    }
    var introHtml = (ids.length === 0 && exam.intro) ? '<div class="infobox intro"><div class="ib-h">考试介绍</div><div class="ib-b">' + esc(exam.intro) + '</div></div>' : "";
    var benefitHtml = (ids.length === 0 && exam.benefit) ? '<div class="infobox benefit"><div class="ib-h">通过的好处</div><div class="ib-b">' + esc(exam.benefit) + '</div></div>' : "";
    var crumbTrail = breadcrumb.slice(1).map(function (n) { return esc(n); }).join(" &rsaquo; ");
    var readsHere = ids.length ? descendantReadCount(curNode || exam) : countReadsExam(exam);
    document.getElementById("app").innerHTML =
      '<p class="crumb"><a href="#">职业资格考试</a> / <a href="#/cat/' + cat.id + '">' + esc(cat.name) + '</a>' + (crumbTrail ? ' / ' + crumbTrail : '') + '</p>' +
      '<div class="modnav"><a href="#">刷题目录</a><a href="jianhu/">监护刷题</a><a href="wuxiandian/">业余无线电刷题</a></div>' +
      '<h1 class="page-title">' + esc(exam.name) + '</h1>' +
      (ids.length === 0 ? ('<p class="page-sub">组织：' + esc(exam.body || "—") + (exam.site ? ' · 官网：' + esc(exam.site) : '') + '</p>') : '') +
      (exam.intro || exam.benefit ? '<div class="info-wrap">' + introHtml + benefitHtml + '</div>' : '') +
      '<div class="notebox">进入任一' + (ids.length === 0 ? '阶段 / 科目' : '下一级') + '即只刷该部分题目；判分后<b>自动朗读正确答案</b>；进度按' + (ids.length === 0 ? '科目' : '当前层级') + '分别保存并可「继续上次」。</div>' +
      (ids.length === 0 ? chip(exam.levels, "层级 / 阶段") : "") +
      (ids.length === 0 && (!exam.stages) ? chip(exam.subjects, "主要科目") : "") +
      (exam.quiz === false ? "" : '<div class="section-h">朗读</div><div class="chips"><span class="chip' + (autoRead ? " on" : "") + '" data-act="toggle-autoread">自动朗读题干：' + (autoRead ? "开" : "关") + '</span></div>') +
      body +
      (exam.quiz === false ? "" : '<div class="hint">总进度：已答 ' + prog.done + ' / 共 ' + prog.total + '，掌握 ' + prog.cor + '。做题记录随登录的云端账号同步。</div>') +
      (readsHere ? '<div class="section-h">主观题 / 例题（阅读卡）</div><div class="acts"><a class="btn" href="#/read/' + cat.id + '/' + exam.id + (ids.length ? '/' + ids.join("/") : '') + '">📖 阅读参考答案（' + readsHere + ' 张）</a></div>' : '');
  }

  function renderNodeList(cat, exam, ids, children) {
    var cards = children.map(function (ch) {
      var qn = descendantQCount(ch);
      var rn = descendantReadCount(ch);
      var hasKids = childrenOf(ch).length > 0;
      var childIds = ids.concat([ch.id]);
      var p = loadQuizProgress(cat.id, exam.id, childIds);
      var acts = "";
      if (hasKids) {
        acts = '<a class="btn primary" href="#/exam/' + cat.id + '/' + exam.id + '/' + childIds.join("/") + '">进入（' + qn + ' 题）</a>';
      } else {
        if (qn > 0) {
          var resume = p ? '<button class="btn" data-act="resume-quiz" data-cat="' + cat.id + '" data-exam="' + exam.id + '" data-ids="' + childIds.join(",") + '">继续上次（第 ' + Math.min(p.idx + 1, qn) + '/' + qn + '）</button>' : '';
          acts += resume + '<button class="btn primary" data-act="start-quiz" data-cat="' + cat.id + '" data-exam="' + exam.id + '" data-ids="' + childIds.join(",") + '">' + (p ? "重新开始" : ("开始刷题（" + qn + " 题）")) + '</button>';
        }
        if (rn > 0) acts += '<a class="btn ghost" href="#/read/' + cat.id + '/' + exam.id + '/' + childIds.join("/") + '">📖 阅读卡（' + rn + '）</a>';
      }
      return '<div class="subcard"><div class="sub-name">' + esc(ch.name) + '</div>' +
        '<div class="sub-meta">' + (qn ? qn + ' 题' : '') + (rn ? (qn ? ' · ' : '') + rn + ' 阅' : '') + '</div>' +
        '<div class="acts">' + acts + '</div></div>';
    }).join("");
    var label = ids.length === 0 ? (exam.stages && exam.stages.length ? "选择阶段" : "选择科目") : "选择下一级";
    return '<div class="section-h">' + label + '</div><div class="subs">' + cards + '</div>';
  }

  function renderLeaf(cat, exam, ids, node) {
    var qn = descendantQCount(node);
    var rn = descendantReadCount(node);
    var p = loadQuizProgress(cat.id, exam.id, ids);
    var acts = "";
    var lvlName = ids.length >= 3 ? "知识点" : (ids.length === 2 ? "科目" : "阶段");
    if (qn > 0) {
      var resume = p ? '<button class="btn" data-act="resume-quiz" data-cat="' + cat.id + '" data-exam="' + exam.id + '" data-ids="' + ids.join(",") + '">继续上次（第 ' + Math.min(p.idx + 1, qn) + '/' + qn + '）</button>' : '';
      acts += resume + '<button class="btn primary" data-act="start-quiz" data-cat="' + cat.id + '" data-exam="' + exam.id + '" data-ids="' + ids.join(",") + '">' + (p ? "重新开始" : ("开始刷题（" + qn + " 题）")) + '</button>';
    }
    if (rn > 0) acts += '<a class="btn ghost" href="#/read/' + cat.id + '/' + exam.id + '/' + ids.join("/") + '">📖 阅读参考答案（' + rn + ' 张）</a>';
    return '<div class="section-h">' + esc(node.name) + '</div>' +
      '<div class="q"><div class="qt">本' + lvlName + '共 <b>' + qn + '</b> 道客观题' + (rn ? '，另含 <b>' + rn + '</b> 张阅读卡' : '') + '。点击开始即只刷这部分题目。</div></div>' +
      '<div class="acts">' + acts + '</div>';
  }

  function renderQuiz() {
    var q = quiz.list[quiz.idx];
    var autoFire = autoRead && lastReadId !== q.id;
    var total = quiz.list.length;
    var graded = quiz.graded[q.id];
    var fb = "";
    if (graded) {
      fb = fbHtml(q);
    }
    var hint = "", actBtn;
    if (graded) {
      actBtn = '<button class="btn primary" data-act="next">下一题</button>';
    } else if (q.type === "multi") {
      hint = '<div class="hint">本题为多选，勾选多个选项后点「确认本题」判分</div>';
      var has = quiz.sel[q.id] && quiz.sel[q.id].length > 0;
      actBtn = '<button class="btn primary" data-act="confirm"' + (has ? "" : ' disabled style="opacity:.45;cursor:not-allowed;"') + '>确认本题</button>';
    } else {
      hint = '<div class="hint">点击选项即可自动判分</div>';
      actBtn = '';
    }
    var readNote = (!speechOK) ? '<div class="hint">当前浏览器不支持语音朗读，可手动阅读题干。</div>'
                  : (autoRead
                      ? '<div class="hint">已开启自动朗读（移动端需先点击一次解锁声音）；判分后会自动朗读正确答案。</div>'
                      : '<div class="hint">判分后会自动朗读正确答案；可在考试页开启「自动朗读题干」让每题先读题干。</div>');
    document.getElementById("app").innerHTML =
      '<p class="crumb"><a href="#">职业资格考试</a> / <a href="#/cat/' + quiz.catId + '">' + esc(findCat(quiz.catId).name) +
        '</a> / <a href="#/exam/' + quiz.catId + '/' + quiz.examId + '">' + esc(findExam(findCat(quiz.catId), quiz.examId).name) + '</a></p>' +
      '<div class="bar"><div class="meta">第 ' + (quiz.idx + 1) + ' / ' + total + ' 题 · ' + (q.type === "multi" ? "多项选择题" : "单项选择题") + '</div>' +
        '<div class="score">答对 ' + quiz.correct + ' · 答错 ' + quiz.wrong + '</div></div>' +
      '<div class="prog"><div class="fill" style="width:' + (100 * (quiz.idx + 1) / total) + '%"></div></div>' +
      '<div class="q"><div class="qt">' + esc(q.q) + '</div>' +
        '<button class="btn read' + (reading || autoFire ? " on" : "") + '" data-act="read"' + (speechOK ? "" : ' disabled style="opacity:.45;cursor:not-allowed;" title="当前浏览器不支持语音朗读"') + '>' + (reading || autoFire ? "停止朗读" : "朗读题干") + '</button>' +
        readNote +
        '<div class="opts">' + hint + optHtml(q) + '</div>' +
        (graded ? fb : '') +
        '<div class="acts">' + actBtn + '<button class="btn ghost" data-act="exit">保存并退出</button></div></div>';
    if (autoFire) {
      lastReadId = q.id; reading = true;
      setTimeout(function () { if (quiz.graded[q.id]) return; readAloud(q.q); }, 80);
    }
  }

  function renderSummary() {
    recordAttempt();
    clearQuizProgress(quiz.catId, quiz.examId, quiz.ids);
    var total = quiz.list.length;
    var acc = total ? Math.round(100 * quiz.correct / total) : 0;
    document.getElementById("app").innerHTML =
      '<h1 class="page-title">本次演示完成</h1>' +
      '<div class="sum"><div class="big">' + acc + '%</div>' +
        '<div class="row"><span>共 <b>' + total + '</b> 题</span><span>答对 <b>' + quiz.correct + '</b></span>' +
          '<span>答错 <b>' + quiz.wrong + '</b></span></div>' +
        '<p class="page-sub">演示题依据该考试公开科目范围编写，非官方真题，仅供参考。</p>' +
        '<div class="acts">' +
          '<button class="btn primary" data-act="again">再来一次</button>' +
          '<button class="btn ghost" data-act="back">返回考试</button>' +
        '</div></div>';
  }

  function render() {
    var route = parseHash();
    if (route.view === "read") { renderRead(route); return; }
    // 若正在刷题且路由仍在同一路径，则渲染题目/总结
    if (quiz && route.view === "exam" && route.catId === quiz.catId && route.examId === quiz.examId && pathEq(route.ids, quiz.ids)) {
      if (quiz.summary) { renderSummary(); return; }
      renderQuiz(); return;
    }
    if (route.view === "exam") { renderTree(route); return; }
    if (route.view === "cat") { renderCat(route); return; }
    renderHome();
  }

  /* ---------- 交互 ---------- */
  function onClick(e) {
    var t = e.target.closest ? e.target.closest("[data-act],[data-opt]") : null;
    if (!t) return;
    e.preventDefault();
    try {
      unlockSpeech();
      var _act0 = t.getAttribute("data-act");
      if (_act0 !== "read") { stopRead(); reading = false; }
      var optAttr = t.getAttribute("data-opt");
      if (optAttr != null) {
        var q = quiz.list[quiz.idx];
        if (quiz.graded[q.id]) return;
        var oi = parseInt(optAttr, 10);
        if (q.type === "multi") {
          var arr = quiz.sel[q.id] || [];
          var k = arr.indexOf(oi);
          if (k >= 0) arr.splice(k, 1); else arr.push(oi);
          quiz.sel[q.id] = arr;
          var el = appEl().querySelector('.q .opt[data-opt="' + oi + '"]');
          if (el) el.className = "opt" + (arr.indexOf(oi) >= 0 ? " on" : "");
          renderActions(q);
        } else {
          quiz.sel[q.id] = oi;
          doGrade(q);
          paintOptions(q); showFeedback(q); renderActions(q);
          readAnswer(q);
        }
        saveQuizProgress();
        return;
      }
      var act = t.getAttribute("data-act");
      if (act === "start-quiz") {
        var _sc = t.getAttribute("data-cat"), _se = t.getAttribute("data-exam");
        var _sd = t.getAttribute("data-ids");
        var _ids = _sd ? _sd.split(",") : [];
        clearQuizProgress(_sc, _se, _ids);
        startQuiz(_sc, _se, _ids);
      } else if (act === "resume-quiz") {
        var rc = t.getAttribute("data-cat"), re = t.getAttribute("data-exam");
        var _rd = t.getAttribute("data-ids");
        var _rids = _rd ? _rd.split(",") : [];
        var rp = loadQuizProgress(rc, re, _rids); if (!rp) return;
        startQuiz(rc, re, _rids);
        quiz.idx = Math.min(rp.idx || 0, quiz.list.length - 1);
        quiz.sel = rp.sel || {}; quiz.graded = rp.graded || {};
        quiz.correct = rp.correct || 0; quiz.wrong = rp.wrong || 0;
        quiz.summary = false;
        render();
      } else if (act === "confirm") {
        var qc = quiz.list[quiz.idx];
        if (quiz.graded[qc.id]) return;
        if (!(quiz.sel[qc.id] && quiz.sel[qc.id].length > 0)) return;
        doGrade(qc); paintOptions(qc); showFeedback(qc); renderActions(qc);
        readAnswer(qc);
        saveQuizProgress();
      } else if (act === "next") {
        quiz.idx++;
        if (quiz.idx >= quiz.list.length) quiz.summary = true;
        render();
        saveQuizProgress();
      } else if (act === "again") {
        clearQuizProgress(quiz.catId, quiz.examId, quiz.ids);
        quiz.idx = 0; quiz.sel = {}; quiz.graded = {}; quiz.correct = 0; quiz.wrong = 0; quiz.summary = false;
        render();
      } else if (act === "back") {
        var _bc = quiz.catId, _be = quiz.examId;
        quiz = null;
        location.hash = "#/exam/" + _bc + "/" + _be;
        render();
      } else if (act === "exit") {
        var _xc = quiz.catId, _xe = quiz.examId;
        quiz = null;
        location.hash = "#/exam/" + _xc + "/" + _xe;
        render();
      } else if (act === "toggle-autoread") {
        autoRead = !autoRead; saveAutoRead(); render();
      } else if (act === "show-ans") {
        var ans = appEl().querySelector("[data-ans]");
        if (ans) ans.style.display = (ans.style.display === "none") ? "" : "none";
      } else if (act === "fav-read") {
        if (!readState) return;
        var ck = readState.list[readState.idx].key;
        toggleReadFav(ck);
        var favs2 = loadReadFavs();
        t.className = "btn ghost" + (favs2.indexOf(ck) >= 0 ? " fav" : "");
        t.textContent = favs2.indexOf(ck) >= 0 ? "已收藏" : "收藏";
      } else if (act === "next-read") {
        if (readState) { readState.idx = Math.min(readState.idx + 1, readState.list.length - 1); render(); }
      } else if (act === "prev-read") {
        if (readState) { readState.idx = Math.max(readState.idx - 1, 0); render(); }
      } else if (act === "read-done") {
        location.hash = "#/exam/" + (readState ? readState.catId : "") + "/" + (readState ? readState.examId : "") + (readState && readState.ids && readState.ids.length ? "/" + readState.ids.join("/") : "");
      } else if (act === "read") {
        if (reading) { stopRead(); reading = false; renderReadBtn(); }
        else { readAloud(quiz.list[quiz.idx].q); reading = true; lastReadId = quiz.list[quiz.idx].id; renderReadBtn(); }
      }
    } catch (err) {
      document.getElementById("app").innerHTML = '<div class="empty">交互出错：' + esc(String(err && err.message || err)) + '</div>';
    }
  }

  document.addEventListener("click", onClick);
  window.addEventListener("hashchange", function () { render(); });
  render();
  // 供 PeixunAuth.init() 切换云端后端后重渲染（修复：登录用户刷新后从云端读回进度）
  window.__peixunReRender = render;
})();
