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
      a.unshift({ ts: Date.now(), catId: quiz.catId, examId: quiz.examId, subId: quiz.subId,
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
    readAloud((isCor ? "回答正确。" : "回答错误。") + "正确答案：" + correctText(q));
  }

  /* ---------- 当前刷题会话 ---------- */
  var quiz = null;
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
  function startQuiz(catId, examId, subId) {
    var cat = findCat(catId), exam = findExam(cat, examId);
    if (!exam) return;
    var source = findSub(exam, subId) || exam;
    var qs = source.questions || [];
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
        qkey: catId + "/" + examId + (subId ? "/" + subId : "") + "/" + i
      };
    });
    quiz = { catId: catId, examId: examId, subId: subId || null, list: list, idx: 0, sel: {}, graded: {}, correct: 0, wrong: 0, attempted: false };
    lastReadId = null;
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
  function progressKey(catId, examId, subId) {
    return "peixun_quiz_v1_" + catId + "_" + examId + (subId ? "_" + subId : "");
  }
  function saveQuizProgress() {
    try {
      if (!quiz) return;
      Sset(progressKey(quiz.catId, quiz.examId), {
        idx: quiz.idx, sel: quiz.sel, graded: quiz.graded,
        correct: quiz.correct, wrong: quiz.wrong, ts: Date.now()
      });
    } catch (e) {}
  }
  function loadQuizProgress(catId, examId) {
    try {
      var p = Sget(progressKey(catId, examId));
      if (!p) return null;
      return p;
    } catch (e) { return null; }
  }
  function clearQuizProgress(catId, examId) {
    try { Srem(progressKey(catId, examId)); } catch (e) {}
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
    if (parts[0] === "exam" && parts[1] && parts[2]) return { view: "exam", catId: parts[1], examId: parts[2] };
    return { view: "home" };
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
    if (exam.sub && exam.sub.length) {
      exam.sub.forEach(function (s) {
        (s.questions || []).forEach(function (_, i) { keys.push(catId + "/" + exam.id + "/" + s.id + "/" + i); });
      });
    } else {
      (exam.questions || []).forEach(function (_, i) { keys.push(catId + "/" + exam.id + "/" + i); });
    }
    return keys;
  }

  function renderExamDetail(route) {
    var cat = findCat(route.catId), exam = findExam(cat, route.examId);
    if (!exam) { location.hash = "#/cat/" + route.catId; return; }
    var qkeys = allQkeys(route.catId, exam);
    var prog = userProgress(qkeys);
    var chip = function (arr, label) {
      if (!arr || !arr.length) return "";
      return '<div class="section-h">' + label + '</div><div class="chips">' +
        arr.map(function (x) { return '<span class="chip on">' + esc(x) + '</span>'; }).join("") + '</div>';
    };
    var body;
    if (exam.quiz === false) {
      body = '<div class="q"><div class="qt">该考试以实操考核为主体，非纯笔试形态，本目录仅作信息列举。</div>' +
        (exam.note ? '<div class="hint">' + esc(exam.note) + '</div>' : '') + '</div>';
    } else if (exam.sub && exam.sub.length) {
      var subs = exam.sub.map(function (s) {
        var qn = s.questions ? s.questions.length : 0;
        if (!qn) return "";
        var p = loadQuizProgress(cat.id, exam.id, s.id);
        var resume = p ? '<button class="btn" data-act="resume-quiz" data-cat="' + cat.id + '" data-exam="' + exam.id + '" data-sub="' + s.id + '">继续上次（第 ' + Math.min(p.idx + 1, qn) + '/' + qn + '）</button>' : '';
        var startTxt = p ? '重新开始' : ('开始刷题（' + qn + ' 题）');
        return '<div class="subcard"><div class="sub-name">' + esc(s.name) + '</div>' +
          '<div class="sub-meta">' + qn + ' 题</div>' +
          '<div class="acts">' + resume +
          '<button class="btn primary" data-act="start-quiz" data-cat="' + cat.id + '" data-exam="' + exam.id + '" data-sub="' + s.id + '">' + startTxt + '</button></div></div>';
      }).join("");
      body = '<div class="section-h">分科刷题</div><div class="subs">' + subs + '</div>';
    } else {
      var qn = exam.questions ? exam.questions.length : 0;
      var p = loadQuizProgress(cat.id, exam.id);
      body = (p ? '<div class="acts"><button class="btn" data-act="resume-quiz" data-cat="' + cat.id + '" data-exam="' + exam.id + '">继续上次（第 ' + Math.min(p.idx + 1, qn) + ' / ' + qn + ' 题）</button></div>' : '') +
        '<div class="acts"><button class="btn primary" data-act="start-quiz" data-cat="' + cat.id +
        '" data-exam="' + exam.id + '">' + (p ? "重新开始" : ("开始刷题（" + qn + ' 题）')) + '</button></div>';
    }
    var introHtml = exam.intro ? '<div class="infobox intro"><div class="ib-h">考试介绍</div><div class="ib-b">' + esc(exam.intro) + '</div></div>' : "";
    var benefitHtml = exam.benefit ? '<div class="infobox benefit"><div class="ib-h">通过的好处</div><div class="ib-b">' + esc(exam.benefit) + '</div></div>' : "";
    document.getElementById("app").innerHTML =
      '<p class="crumb"><a href="#">职业资格考试</a> / <a href="#/cat/' + cat.id + '">' + esc(cat.name) + '</a> / ' + esc(exam.name) + '</p>' +
      '<div class="modnav"><a href="#">刷题目录</a><a href="jianhu/">监护刷题</a><a href="wuxiandian/">业余无线电刷题</a></div>' +
      '<h1 class="page-title">' + esc(exam.name) + '</h1>' +
      '<p class="page-sub">组织：' + esc(exam.body || "—") + (exam.site ? ' · 官网：' + esc(exam.site) : '') + '</p>' +
      (exam.intro || exam.benefit ? '<div class="info-wrap">' + introHtml + benefitHtml + '</div>' : '') +
      '<div class="notebox">开始刷题后 <b>判分会自动朗读正确答案</b>；做题记录在<b>登录云端账号后随手机同步</b>（未登录则仅存本机）。进度支持「继续上次」。</div>' +
      chip(exam.levels, "层级 / 阶段") +
      (exam.sub && exam.sub.length ? "" : chip(exam.subjects, "主要科目")) +
      (exam.quiz === false ? "" : '<div class="section-h">朗读</div><div class="chips"><span class="chip' + (autoRead ? " on" : "") + '" data-act="toggle-autoread">自动朗读题干：' + (autoRead ? "开" : "关") + '</span></div>') +
      body +
      (exam.quiz === false ? "" : '<div class="hint">进度：已答 ' + prog.done + ' / 共 ' + prog.total + '，掌握 ' + prog.cor + '。' + (exam.sub && exam.sub.length ? ' 分科进度各自保存。' : (p ? ' 已保存上次刷题进度，可「继续上次」或「重新开始」。' : '')) + ' 做题记录随登录的云端账号同步。</div>');
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
    clearQuizProgress(quiz.catId, quiz.examId);
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
    // 若正在该考试刷题，且路由仍在该考试，则渲染题目/总结
    if (quiz && route.view === "exam" && route.catId === quiz.catId && route.examId === quiz.examId) {
      if (quiz.summary) { renderSummary(); return; }
      renderQuiz(); return;
    }
    if (route.view === "exam") { renderExamDetail(route); return; }
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
        var _sc = t.getAttribute("data-cat"), _se = t.getAttribute("data-exam"), _ss = t.getAttribute("data-sub") || null;
        clearQuizProgress(_sc, _se, _ss);
        startQuiz(_sc, _se, _ss);
      } else if (act === "resume-quiz") {
        var rc = t.getAttribute("data-cat"), re = t.getAttribute("data-exam"), rs = t.getAttribute("data-sub") || null;
        var rp = loadQuizProgress(rc, re, rs); if (!rp) return;
        startQuiz(rc, re, rs);
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
        clearQuizProgress(quiz.catId, quiz.examId);
        quiz.idx = 0; quiz.sel = {}; quiz.graded = {}; quiz.correct = 0; quiz.wrong = 0; quiz.summary = false;
        render();
      } else if (act === "back") {
        quiz = null; render();
      } else if (act === "exit") {
        quiz = null; render();
      } else if (act === "toggle-autoread") {
        autoRead = !autoRead; saveAutoRead(); render();
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
