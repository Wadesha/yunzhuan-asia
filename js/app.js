/* ============================================================
   寰宇零售集团 · 内站交互逻辑（纯文本）
   ============================================================ */
(function () {
  "use strict";

  var GROUP = window.GROUP;
  var LEVELS = window.LEVELS;
  var DEPARTMENTS = window.DEPARTMENTS;
  var REPORTS = window.REPORTS;

  var state = {
    view: "overview",          // overview | org | positions | reports
    posDept: DEPARTMENTS[0].id,
    rep: { week: "all", dept: "all", level: "all", reviewed: "all" },
    repOpen: null
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function deptById(id) { return DEPARTMENTS.filter(function (d) { return d.id === id; })[0]; }
  function levelByCode(c) { return LEVELS.filter(function (l) { return l.code === c; })[0]; }

  /* 批阅状态（localStorage 持久化） */
  function lsKey(id) { return "gs_review_" + id; }
  function isReviewed(id) {
    try { return localStorage.getItem(lsKey(id)) === "1"; } catch (e) { return false; }
  }
  function toggleReviewed(id) {
    try {
      var v = isReviewed(id) ? "0" : "1";
      localStorage.setItem(lsKey(id), v);
    } catch (e) { /* 忽略隐私模式异常 */ }
  }

  /* 微信内置浏览器检测与提示弹窗 */
  function maybeWeChat() {
    var ua = navigator.userAgent || "";
    if (/MicroMessenger/i.test(ua)) showWxModal();
  }

  /* 复制文本到剪贴板（兼容无 Clipboard API 的旧 WebView） */
  function copyText(t) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t);
        return true;
      }
    } catch (e) { /* 降级 */ }
    try {
      var ta = document.createElement("textarea");
      ta.value = t;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-9999px";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      var ok = document.execCommand && document.execCommand("copy");
      document.body.removeChild(ta);
      return !!ok;
    } catch (e) { return false; }
  }

  /* 弹窗：提供一键复制链接，便于在系统浏览器打开（微信无法由网页直接跳转） */
  function showWxModal() {
    if (document.getElementById("wxModal")) return;
    var m = document.createElement("div");
    m.className = "wx-mask";
    m.id = "wxModal";
    m.innerHTML =
      '<div class="wx-box">' +
      "<h3>请在浏览器中打开</h3>" +
      '<p class="wx-tip">微信内无法直接跳转系统浏览器。点击下方按钮复制链接，再粘贴到系统浏览器地址栏，即可获得完整体验。</p>' +
      '<button type="button" class="wx-jump" data-act="wxjump">复制链接，去浏览器打开</button>' +
      '<p class="wx-copied" id="wxCopied" style="display:none"></p>' +
      '<div class="wx-alt">或点页面右上角 ··· → 在浏览器中打开</div>' +
      '<a href="#" class="wx-skip" data-act="wxclose">暂不使用，继续浏览</a>' +
      "</div>";
    document.body.appendChild(m);
  }

  var NAV = [
    { v: "overview", zh: "集团概况" },
    { v: "org", zh: "组织架构" },
    { v: "positions", zh: "部门与职位" },
    { v: "reports", zh: "每周工作报告" },
    { v: "admin", zh: "管理后台" }
  ];

  /* ---------------- 顶部导航 ---------------- */
  function navHtml() {
    return NAV.map(function (n) {
      var on = state.view === n.v ? " active" : "";
      return '<a href="#" data-act="nav" data-view="' + n.v + '" class="' + on.trim() + '">' + n.zh + "</a>";
    }).join("");
  }

  /* ---------------- 侧栏 ---------------- */
  function sideHtml() {
    if (state.view === "positions") {
      var items = DEPARTMENTS.map(function (d) {
        var on = state.posDept === d.id ? " active" : "";
        return '<a href="#" data-act="posdept" data-id="' + d.id + '" class="' + on.trim() + '">' +
          esc(d.name) + "</a>";
      }).join("");
      return '<div class="side-h">部门导航</div>' + items;
    }
    if (state.view === "reports" || state.view === "admin") {
      var weeks = uniqueWeeks();
      var wItems = '<a href="#" data-act="repfilter" data-key="week" data-val="all" class="' +
        (state.rep.week === "all" ? "active" : "") + '">全部周次</a>' +
        weeks.map(function (w) {
          var on = state.rep.week === w ? " active" : "";
          return '<a href="#" data-act="repfilter" data-key="week" data-val="' + w + '" class="' + on.trim() + '">' + w + "</a>";
        }).join("");
      var lItems = '<a href="#" data-act="repfilter" data-key="level" data-val="all" class="' +
        (state.rep.level === "all" ? "active" : "") + '">全部层级</a>' +
        LEVELS.map(function (l) {
          var on = state.rep.level === l.code ? " active" : "";
          return '<a href="#" data-act="repfilter" data-key="level" data-val="' + l.code + '" class="' + on.trim() + '">' +
            l.code + " " + esc(l.name) + "</a>";
        }).join("");
      return '<div class="side-h">按周次</div>' + wItems +
        '<div class="grp"><div class="side-h">按层级</div>' + lItems + "</div>";
    }
    // overview / org：隐藏侧栏
    return "";
  }

  function uniqueWeeks() {
    var seen = {}; var arr = [];
    REPORTS.forEach(function (r) { if (!seen[r.week]) { seen[r.week] = 1; arr.push(r.week); } });
    arr.sort().reverse();
    return arr;
  }

  /* ---------------- 主视图 ---------------- */
  function mainHtml() {
    if (state.view === "overview") return overviewHtml();
    if (state.view === "org") return orgHtml();
    if (state.view === "positions") return positionsHtml();
    if (state.view === "reports") return reportsHtml();
    if (state.view === "admin") return adminHtml();
    return "";
  }

  function overviewHtml() {
    var facts = GROUP.facts.map(function (f) {
      return '<div class="cell"><div class="k">' + esc(f.label) + '</div><div class="v">' + esc(f.value) + "</div></div>";
    }).join("");
    var depts = DEPARTMENTS.map(function (d) {
      return '<span class="tag">' + esc(d.name) + "</span>";
    }).join("");
    return '' +
      '<h1 class="page-title">' + esc(GROUP.name) + "</h1>" +
      '<p class="page-sub">' + esc(GROUP.nameEn) + " · " + esc(GROUP.tagline) + "</p>" +
      '<p class="lead">' + esc(GROUP.profile) + "</p>" +
      '<div class="facts">' + facts + "</div>" +
      '<div class="section-h">业务部门</div>' +
      '<div>' + depts + "</div>";
  }

  function orgHtml() {
    var legend = LEVELS.map(function (l) {
      return '<span class="lvl sm">' + l.code + "</span> " + esc(l.name) +
        ' <span style="color:var(--muted);font-size:12px;">· ' + esc(l.note) + "</span>";
    }).join("<br><br>");

    var rows = DEPARTMENTS.map(function (d, i) {
      var lvls = d.positions.map(function (p) { return p.level; })
        .filter(function (v, idx, a) { return a.indexOf(v) === idx; })
        .map(function (c) { return '<span class="lvl sm">' + c + "</span>"; }).join(" ");
      return "<tr>" +
        '<td class="idx">' + (i + 1) + "</td>" +
        '<td><div class="dept-name">' + esc(d.name) + '</div><div class="dept-en">' + esc(d.nameEn) + "</div></td>" +
        "<td>" + esc(d.desc) + "</td>" +
        "<td>" + esc(d.regions) + "</td>" +
        "<td>" + esc(d.headcount) + "</td>" +
        "<td>" + lvls + "</td>" +
        "</tr>";
    }).join("");

    return '' +
      '<h1 class="page-title">组织架构</h1>' +
      '<p class="page-sub">矩阵式管理：纵向十大职能部门，横向三大区域总部</p>' +
      '<div class="section-h">层级定义</div>' +
      '<div class="card" style="line-height:1.9">' + legend + "</div>" +
      '<div class="section-h">部门总览</div>' +
      '<table class="grid"><thead><tr>' +
      "<th></th><th>部门</th><th>职责</th><th>覆盖</th><th>编制</th><th>涉及层级</th>" +
      "</tr></thead><tbody>" + rows + "</tbody></table>";
  }

  function positionsHtml() {
    var d = deptById(state.posDept);
    if (!d) return "";
    var blocks = LEVELS.map(function (lv) {
      var ps = d.positions.filter(function (p) { return p.level === lv.code; });
      if (!ps.length) return "";
      var cards = ps.map(function (p) {
        var resp = '<ul class="plain">' + p.responsibilities.map(function (x) {
          return "<li>" + esc(x) + "</li>";
        }).join("") + "</ul>";
        var req = '<ul class="plain">' + p.requirements.map(function (x) {
          return "<li>" + esc(x) + "</li>";
        }).join("") + "</ul>";
        return '<div class="pos">' +
          '<div class="head"><span class="lvl">' + p.level + "</span>" +
          "<h3>" + esc(p.title) + "</h3>" +
          '<span class="en">' + esc(p.titleEn) + "</span></div>" +
          '<div class="reports">汇报对象：<b>' + esc(p.reportsTo) + "</b></div>" +
          "<p style='margin:0;color:var(--ink-soft)'>" + esc(p.summary) + "</p>" +
          '<div class="blk-h">核心职责</div>' + resp +
          '<div class="blk-h">任职要求</div>' + req +
          "</div>";
      }).join("");
      return '<div class="section-h"><span class="lvl sm">' + lv.code + "</span> " +
        esc(lv.name) + " · " + esc(lv.nameEn) + "</div>" + cards;
    }).join("");

    return '' +
      '<h1 class="page-title">' + esc(d.name) + "</h1>" +
      '<p class="page-sub">' + esc(d.nameEn) + " · 编制约 " + esc(d.headcount) + " 人 · 覆盖 " + esc(d.regions) + "</p>" +
      '<p class="lead">' + esc(d.desc) + "</p>" +
      blocks;
  }

  /* 报告卡片（withReview 控制是否显示批阅按钮） */
  function reportCardHtml(r, withReview) {
    var d = deptById(r.deptId);
    var rv = isReviewed(r.id);
    var metrics = (r.metrics || []).map(function (m) {
      return '<div class="metric"><div class="mk">' + esc(m.k) + '</div><div class="mv">' + esc(m.v) + "</div></div>";
    }).join("");
    return '<div class="report' + (rv ? " reviewed" : "") + '" data-act="openrep" data-id="' + r.id + '">' +
      '<div class="r-head">' +
      '<span class="lvl sm">' + esc(r.level) + "</span>" +
      '<span class="tag fill">' + esc(d ? d.name : r.deptId) + "</span>" +
      '<span class="tag">' + esc(r.week) + "</span>" +
      (rv ? '<span class="reviewed-flag">已批阅</span>' : "") +
      "</div>" +
      "<h3>" + esc(r.title) + "</h3>" +
      '<div class="r-sub">' + esc(r.author) + " · " + esc(r.authorTitle) + " · " + esc(r.dateRange) + "</div>" +
      '<div class="r-summary">' + esc(r.summary) + "</div>" +
      (metrics ? '<div class="r-metrics">' + metrics + "</div>" : "") +
      (withReview ? '<div class="r-actions"><span class="btn ' + (rv ? "done" : "") + '" data-act="review" data-id="' + r.id + '">' + (rv ? "已批阅" : "批阅") + "</span></div>" : "") +
      "</div>";
  }

  /* 报告筛选条（withReviewed 控制是否显示批阅筛选） */
  function reportFiltersHtml(f, withReviewed) {
    var weeks = uniqueWeeks();
    var weekChips = ['<span class="fl' + (f.week === "all" ? " on" : "") + '" data-act="repfilter" data-key="week" data-val="all">全部</span>']
      .concat(weeks.map(function (w) {
        return '<span class="fl' + (f.week === w ? " on" : "") + '" data-act="repfilter" data-key="week" data-val="' + w + '">' + w + "</span>";
      })).join("");
    var deptChips = ['<span class="fl' + (f.dept === "all" ? " on" : "") + '" data-act="repfilter" data-key="dept" data-val="all">全部</span>']
      .concat(DEPARTMENTS.map(function (d) {
        return '<span class="fl' + (f.dept === d.id ? " on" : "") + '" data-act="repfilter" data-key="dept" data-val="' + d.id + '">' + esc(d.name) + "</span>";
      })).join("");
    var lvlChips = ['<span class="fl' + (f.level === "all" ? " on" : "") + '" data-act="repfilter" data-key="level" data-val="all">全部</span>']
      .concat(LEVELS.map(function (l) {
        return '<span class="fl' + (f.level === l.code ? " on" : "") + '" data-act="repfilter" data-key="level" data-val="' + l.code + '">' + l.code + "</span>";
      })).join("");
    var html = '<div class="filters">' +
      '<div class="fl-grp"><span class="fl-label">周次</span>' + weekChips + "</div>" +
      '<div class="fl-grp"><span class="fl-label">部门</span>' + deptChips + "</div>" +
      '<div class="fl-grp"><span class="fl-label">层级</span>' + lvlChips + "</div>";
    if (withReviewed) {
      var revChips = ['<span class="fl' + (f.reviewed === "all" ? " on" : "") + '" data-act="repfilter" data-key="reviewed" data-val="all">全部</span>',
        '<span class="fl' + (f.reviewed === "done" ? " on" : "") + '" data-act="repfilter" data-key="reviewed" data-val="done">已批阅</span>',
        '<span class="fl' + (f.reviewed === "todo" ? " on" : "") + '" data-act="repfilter" data-key="reviewed" data-val="todo">待批阅</span>'].join("");
      html += '<div class="fl-grp"><span class="fl-label">批阅</span>' + revChips + "</div>";
    }
    return html + "</div>";
  }

  function filterReports(f) {
    return REPORTS.filter(function (r) {
      var okRev = f.reviewed === "all" ||
        (f.reviewed === "done" ? isReviewed(r.id) : !isReviewed(r.id));
      return (f.week === "all" || r.week === f.week) &&
             (f.dept === "all" || r.deptId === f.dept) &&
             (f.level === "all" || r.level === f.level) && okRev;
    });
  }

  /* 公共：每周工作报告（只读，无批阅按钮） */
  function reportsHtml() {
    if (state.repOpen) return reportDetailHtml(state.repOpen, false);
    var f = state.rep;
    var list = filterReports(f);
    list.sort(function (a, b) { return a.week < b.week ? 1 : a.week > b.week ? -1 : 0; });
    var cards = list.map(function (r) { return reportCardHtml(r, false); }).join("");
    return '' +
      '<h1 class="page-title">每周工作报告</h1>' +
      '<p class="page-sub">按周次、部门、层级检索集团各岗位周报 · 共 ' + list.length + " 篇命中</p>" +
      reportFiltersHtml(f, false) +
      (cards || '<div class="empty">没有符合条件的工作报告。</div>');
  }

  /* 管理后台：周报批阅管理（含批阅按钮与批阅筛选） */
  function adminHtml() {
    if (state.repOpen) return reportDetailHtml(state.repOpen, true);
    var f = state.rep;
    var total = REPORTS.length;
    var done = REPORTS.filter(function (r) { return isReviewed(r.id); }).length;
    var todo = total - done;
    var list = filterReports(f);
    list.sort(function (a, b) { return a.week < b.week ? 1 : a.week > b.week ? -1 : 0; });
    var cards = list.map(function (r) { return reportCardHtml(r, true); }).join("");
    return '' +
      '<h1 class="page-title">管理后台</h1>' +
      '<p class="page-sub">周报批阅管理 · 共 ' + total + " 篇 · 已批阅 " + done + " · 待批阅 " + todo + "</p>" +
      reportFiltersHtml(f, true) +
      (cards || '<div class="empty">没有符合条件的工作报告。</div>');
  }

  function reportDetailHtml(id, withReview) {
    var r = REPORTS.filter(function (x) { return x.id === id; })[0];
    if (!r) return '<div class="empty">未找到该报告。</div>';
    var d = deptById(r.deptId);
    var lv = levelByCode(r.level);
    var rv = isReviewed(r.id);
    var backLabel = state.view === "admin" ? "返回管理后台" : "返回报告列表";
    function block(h, arr) {
      if (!arr || !arr.length) return "";
      return '<div class="report-block"><div class="rb-h">' + h + "</div><ul class='plain'>" +
        arr.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></div>";
    }
    var metrics = (r.metrics || []).map(function (m) {
      return '<div class="metric"><div class="mk">' + esc(m.k) + '</div><div class="mv">' + esc(m.v) + "</div></div>";
    }).join("");
    return '' +
      '<a href="#" class="back" data-act="backrep">' + backLabel + '</a>' +
      '<div class="detail-head">' +
      '<div class="r-meta">' +
      '<span class="lvl">' + esc(r.level) + " " + esc(lv ? lv.name : "") + "</span>" +
      '<span class="tag fill">' + esc(d ? d.name : r.deptId) + "</span>" +
      '<span class="tag">' + esc(r.week) + " · " + esc(r.dateRange) + "</span>" +
      '<span class="tag">' + esc(r.id) + "</span>" +
      "</div>" +
      "<h2>" + esc(r.title) + "</h2>" +
      '<div class="r-sub">报告人：' + esc(r.author) + " · " + esc(r.authorTitle) + "</div>" +
      (metrics ? '<div class="r-metrics" style="margin-top:14px">' + metrics + "</div>" : "") +
      "</div>" +
      (withReview ? '<div class="r-actions" style="margin:16px 0 4px;">' +
        '<span class="btn ' + (rv ? "done" : "") + '" data-act="review" data-id="' + r.id + '">' + (rv ? "已批阅（点击取消）" : "标记批阅") + "</span></div>" +
        (rv ? '<div class="reviewed-flag" style="margin-bottom:6px;">本篇已由上级批阅</div>' : "") : "") +
      '<div class="report-block"><div class="rb-h">本周概述</div><p style="margin:0;color:var(--ink-soft)">' + esc(r.summary) + "</p></div>" +
      block("关键进展", r.highlights) +
      block("面临的挑战", r.challenges) +
      block("下周计划", r.nextWeek);
  }

  /* ---------------- 渲染 ---------------- */
  function render() {
    document.getElementById("nav").innerHTML = navHtml();
    document.getElementById("side").innerHTML = sideHtml();
    document.getElementById("main").innerHTML = mainHtml();

    var layout = document.getElementById("layout");
    if (state.view === "overview" || state.view === "org") {
      layout.classList.add("single");
      layout.style.gridTemplateColumns = "1fr";
      document.getElementById("side").style.display = "none";
    } else {
      layout.classList.remove("single");
      layout.style.gridTemplateColumns = "";
      document.getElementById("side").style.display = "";
    }
    window.scrollTo(0, 0);
  }

  /* 兼容旧版 WebView（无 Element.closest）的冒泡查找 */
  function closestAct(node) {
    while (node && node !== document.body) {
      if (node.getAttribute && node.getAttribute("data-act")) return node;
      node = node.parentNode;
    }
    return null;
  }

  /* ---------------- 事件委托 ---------------- */
  document.addEventListener("click", function (e) {
    var el = e.target && e.target.closest ? e.target.closest("[data-act]") : closestAct(e.target);
    if (!el) return;
    e.preventDefault();
    try {
    var act = el.getAttribute("data-act");
    if (act === "nav") {
      state.view = el.getAttribute("data-view");
      state.repOpen = null;
      if (state.view === "reports") state.rep.reviewed = "all";
      if (state.view === "positions" && !deptById(state.posDept)) state.posDept = DEPARTMENTS[0].id;
      render();
    } else if (act === "posdept") {
      state.posDept = el.getAttribute("data-id");
      render();
    } else if (act === "repfilter") {
      var key = el.getAttribute("data-key");
      state.rep[key] = el.getAttribute("data-val");
      render();
    } else if (act === "openrep") {
      state.repOpen = el.getAttribute("data-id");
      render();
    } else if (act === "backrep") {
      state.repOpen = null;
      render();
    } else if (act === "review") {
      toggleReviewed(el.getAttribute("data-id"));
      render();
    } else if (act === "wxclose") {
      var wx = document.getElementById("wxModal");
      if (wx && wx.parentNode) wx.parentNode.removeChild(wx);
    } else if (act === "wxjump") {
      var url = location.href;
      try { window.open(url, "_blank"); } catch (e) { /* 微信内无效，忽略 */ }
      var copied = copyText(url);
      var c = document.getElementById("wxCopied");
      if (c) {
        c.style.display = "block";
        c.textContent = copied
          ? "已复制 ✓ 去系统浏览器粘贴地址栏打开即可"
          : "复制失败，请手动复制地址栏链接";
      }
      if (el && el.tagName === "BUTTON") el.textContent = "已复制，去浏览器打开";
    }
    } catch (err) {
      showBootError("交互执行出错：" + (err && err.message ? err.message : String(err)));
    }
  });

  /* ---------------- 错误面板（防白屏兜底） ---------------- */
  function showBootError(msg) {
    var m = document.getElementById("main");
    if (!m) return;
    m.innerHTML =
      '<div class="boot-error">' +
      '<h1 class="page-title">页面加载异常</h1>' +
      '<p class="lead">系统未能正常渲染本页。错误详情如下，可截图反馈给内部系统管理员。</p>' +
      '<div class="card"><div class="blk-h">错误定位</div><p style="margin:0;color:var(--ink-soft)">' +
      esc(msg) + "</p></div>" +
      '<div class="card"><div class="blk-h">建议操作</div><ul class="plain">' +
      "<li>微信内：点击右上角 ··· → 在浏览器中打开，使用系统默认浏览器访问。</li>" +
      "<li>其他环境：检查网络后刷新页面（下拉刷新或重新进入）。</li>" +
      "<li>若反复异常，请清除浏览器缓存或更换浏览器后重试。</li>" +
      "</ul></div></div>";
  }

  /* ---------------- 多步反复验证机制 ---------------- */
  function boot() {
    // 第 1 步：数据模块加载校验
    if (typeof GROUP === "undefined" || !GROUP)
      { showBootError("数据模块未加载（data.js 未执行或被拦截）。"); return false; }
    if (typeof LEVELS === "undefined" || !LEVELS)
      { showBootError("数据模块缺失：LEVELS。"); return false; }
    if (typeof DEPARTMENTS === "undefined" || !DEPARTMENTS)
      { showBootError("数据模块缺失：DEPARTMENTS。"); return false; }
    if (typeof REPORTS === "undefined" || !REPORTS)
      { showBootError("数据模块缺失：REPORTS。"); return false; }

    // 第 2 步：DOM 挂载点校验
    var navEl = document.getElementById("nav");
    var sideEl = document.getElementById("side");
    var mainEl = document.getElementById("main");
    if (!navEl || !sideEl || !mainEl)
      { showBootError("页面骨架缺失（#nav / #side / #main 未找到）。"); return false; }

    // 第 3 步：首屏渲染校验
    try { render(); }
    catch (err) {
      showBootError("首屏渲染失败：" + (err && err.message ? err.message : String(err)));
      return false;
    }

    // 第 4 步：各视图冒烟测试（确保任一视图不会单独报错导致白屏）
    var views = ["overview", "org", "positions", "reports", "admin"];
    for (var i = 0; i < views.length; i++) {
      try {
        state.view = views[i];
        if (views[i] === "positions") state.posDept = DEPARTMENTS[0].id;
        var html = mainHtml();
        if (!html || html.length < 5)
          { showBootError("视图「" + views[i] + "」渲染结果为空。"); return false; }
      } catch (err) {
        showBootError("视图「" + views[i] + "」渲染异常：" + (err && err.message ? err.message : String(err)));
        return false;
      }
    }

    // 第 5 步：恢复首页并标记启动成功
    state.view = "overview";
    state.posDept = DEPARTMENTS[0].id;
    render();
    window.__gsBooted = true;
    return true;
  }

  // 全局兜底：脚本运行期未捕获错误也展示面板，避免无声白屏
  window.addEventListener("error", function (e) {
    if (!window.__gsBooted) {
      showBootError("脚本运行出错：" + (e && e.message ? e.message : "未知错误"));
    }
  });

  // 启动：多步验证 + 微信弹框（成功后才弹，避免干扰错误展示）
  try {
    var ok = boot();
    if (ok) maybeWeChat();
  } catch (err) {
    showBootError("初始化失败：" + (err && err.message ? err.message : String(err)));
  }
})();
