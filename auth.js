/*
 * auth.js — 软注册软登录 UI + 逻辑（peixun 刷题工具）
 *
 * 模型（2026-07-21 定稿）：手机号 = 用户名，不验证；可选 PIN = 实际密码。
 *   - 不注册不登录 = 100% 可用（进度留本机 localStorage）。
 *   - 注册：自然节点弹可忽略横幅 → 手机号输两遍 + 可选 PIN → 占坑即同步。
 *     手机号已存在 → 弹"该手机号已注册"冲突提示，引导[登录]或[换手机号]。
 *   - 登录：凭手机号(+PIN) 从云端取回凭证，继续同步。
 *   - PIN 仅本机解锁/云端密码，不是服务器验证流程。
 *
 * 依赖（本文件之前加载）：supabase-js(CDN) -> store.js -> store.supabase.js
 * 集成：各页面 </body> 前加
 *   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   <script src="store.js"></script>
 *   <script src="store.supabase.js"></script>
 *   <script src="auth.js"></script>
 *   <script>PeixunAuth.init();</script>
 *   并在"出结果/刷完一阵"处调用 PeixunAuth.maybePrompt();
 */
(function (root) {
  "use strict";

  var ID_KEY = "peixun_cloud_identity_v1";   // {slot_id, slot_secret, phone}
  var LS = root.localStorage;

  function loadIdentity() { try { return JSON.parse(LS.getItem(ID_KEY) || "null"); } catch (e) { return null; } }
  function saveIdentity(o) { try { LS.setItem(ID_KEY, JSON.stringify(o)); } catch (e) {} }
  function clearIdentity() { try { LS.removeItem(ID_KEY); } catch (e) {} }
  function backend() { return root._peixunSB; }
  function maskPhone(p) { return p && p.length >= 7 ? p.slice(0, 3) + "****" + p.slice(7) : p; }

  function ensureCss() {
    if (document.getElementById("peixun-auth-css")) return;
    var s = document.createElement("style"); s.id = "peixun-auth-css";
    s.textContent =
      "#peixun-cloud-banner{position:fixed;left:12px;bottom:12px;z-index:9999;" +
      "background:#2f4858;color:#fff;padding:10px 12px;border-radius:12px;font:13px/1.4 sans-serif;" +
      "display:flex;gap:8px;align-items:center;box-shadow:0 4px 16px rgba(0,0,0,.25)}" +
      "#peixun-cloud-bar{display:inline-flex;gap:8px;align-items:center;background:#2f4858;color:#fff;" +
      "padding:6px 12px;border-radius:10px;font:13px/1.4 sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.15)}" +
      "#peixun-cloud-banner button,#peixun-cloud-bar button{background:#fff;color:#2f4858;border:0;" +
      "border-radius:8px;padding:5px 12px;cursor:pointer;font:13px sans-serif}" +
      "#peixun-cloud-bar a.pc-hist{color:#fff;text-decoration:none;cursor:pointer;outline:none}" +
      "#peixun-cloud-bar a.pc-hist:hover{text-decoration:underline}" +
      "#peixun-cloud-modal{position:fixed;inset:0;background:rgba(20,30,40,.5);z-index:10000;" +
      "display:flex;align-items:center;justify-content:center;padding:16px}" +
      ".pc-modal-box{background:#fff;color:#222;border-radius:16px;padding:24px;width:330px;max-width:100%;" +
      "font:14px/1.5 sans-serif;display:flex;flex-direction:column;gap:14px;box-shadow:0 12px 40px rgba(0,0,0,.3)}" +
      ".pc-modal-box h3{margin:0;font-size:17px;font-weight:500;color:#2f4858}" +
      ".pc-field{display:flex;flex-direction:column;gap:6px}" +
      ".pc-field label{font-size:13px;color:#555;font-weight:500;display:flex;flex-direction:row;justify-content:space-between;align-items:center}" +
      ".pc-pin-toggle{background:none;border:0;color:#2f4858;font-size:12px;cursor:pointer;padding:0}" +
      ".pc-field input{border:1.5px solid #d8dce0;border-radius:10px;padding:11px 12px;font-size:16px;" +
      "outline:none;transition:border-color .15s;letter-spacing:1px;width:100%;box-sizing:border-box}" +
      ".pc-field input:focus{border-color:#2f4858}" +
      ".pc-field.bad input{border-color:#d8503a}" +
      ".pc-err{color:#d8503a;font-size:12px;margin:0;min-height:14px}" +
      ".pc-note{color:#8a9099;font-size:12px;margin:0;line-height:1.5}" +
      ".pc-actions{display:flex;gap:10px;margin-top:2px}" +
      ".pc-btn{flex:1;border:0;border-radius:10px;padding:12px;cursor:pointer;font-size:15px;font-weight:500}" +
      ".pc-btn-primary{background:#2f4858;color:#fff}" +
      ".pc-btn-ghost{background:#eef0f2;color:#2f4858}";
    document.head.appendChild(s);
  }

  function newBackend() {
    var sb = new root.SupabaseBackend();
    root._peixunSB = sb;
    return sb;
  }

  // 把本机已有的 peixun_ 进度/错题上传到云端。
  // 合并策略：仅上传云端还没有的 key（云端已有 → 尊重云端，不覆盖），防止首次注册后本机进度"消失"。
  function migrateLocalToCloud(sb) {
    if (!LS) return;
    var keys = [];
    for (var i = 0; i < LS.length; i++) {
      var k = LS.key(i);
      if (k && k.indexOf("peixun_") === 0 && k !== ID_KEY) keys.push(k);
    }
    keys.forEach(function (k) {
      var cur = sb.get(k);
      if (cur !== null && cur !== undefined) return;      // 云端已有，尊重云端
      try { sb.set(k, JSON.parse(LS.getItem(k))); } catch (e) {}
    });
  }

  var PeixunAuth = {
    init: function () {
      ensureCss();
      var self = this;
      var id = loadIdentity();
      // 登录态恢复后（或本机模式）触发各刷题页重渲染，
      // 这样登录用户刷新页面后能从云端读回进度并显示「继续上次」。
      var done = function () {
        if (root.__peixunReRender) { try { root.__peixunReRender(); } catch (e) {} }
      };
      if (id) {
        var sb = newBackend();
        sb._slotId = id.slot_id; sb._slotSecret = id.slot_secret;
        sb._hydrate().then(function () { root.Store.use(sb); self.renderBar(); done(); })
          .catch(function () { self.renderBar(); done(); });
      } else {
        this.renderBar();
        done();
      }
    },

    // 自然节点调用：刷了一阵 / 出结果时。可忽略。
    maybePrompt: function () {
      if (loadIdentity()) return;
      this.showBanner();
    },

    showBanner: function () {
      if (document.getElementById("peixun-cloud-banner")) return;
      var b = document.createElement("div");
      b.id = "peixun-cloud-banner";
      b.innerHTML = '<span>想把进度存云端、换设备接着刷吗？</span>' +
        '<button id="pcb-reg">存到云端</button>' +
        '<button id="pcb-login">登录</button>' +
        '<button id="pcb-no">不用，谢谢</button>';
      b.querySelector("#pcb-reg").onclick = function () { b.remove(); PeixunAuth.showRegister(); };
      b.querySelector("#pcb-login").onclick = function () { b.remove(); PeixunAuth.showLogin(); };
      b.querySelector("#pcb-no").onclick = function () { b.remove(); };
      document.body.appendChild(b);
    },

    showRegister: function () {
      var m = document.createElement("div"); m.id = "peixun-cloud-modal";
      m.innerHTML =
        '<div class="pc-modal-box">' +
        '<h3>存到云端</h3>' +
        '<p class="pc-note">手机号就是你的账号，无需验证；可选设 6 位 PIN 当云端密码，更安全。</p>' +
        '<div class="pc-field" id="f-phone"><label>手机号</label>' +
          '<input id="pc-phone" type="tel" inputmode="numeric" autocomplete="off" maxlength="11" placeholder="11 位手机号">' +
          '<p class="pc-err" id="e-phone"></p></div>' +
        '<div class="pc-field" id="f-phone2"><label>再输一遍</label>' +
          '<input id="pc-phone2" type="tel" inputmode="numeric" autocomplete="off" maxlength="11" placeholder="确认手机号">' +
          '<p class="pc-err" id="e-phone2"></p></div>' +
        '<div class="pc-field" id="f-pin"><label>简单 PIN（可选，云端密码）<button type="button" class="pc-pin-toggle" id="pc-pin-toggle">显示</button></label>' +
          '<input id="pc-pin" type="password" inputmode="numeric" autocomplete="off" maxlength="6" placeholder="6 位数字，可留空">' +
          '<p class="pc-err" id="e-pin"></p></div>' +
        '<div class="pc-actions">' +
          '<button class="pc-btn pc-btn-ghost" id="pc-cancel">取消</button>' +
          '<button class="pc-btn pc-btn-primary" id="pc-create">创建并同步</button>' +
        '</div>' +
        '</div>';
      document.body.appendChild(m);

      var phone = m.querySelector("#pc-phone"), phone2 = m.querySelector("#pc-phone2"), pin = m.querySelector("#pc-pin");
      function onlyDigits(el, max) { el.value = el.value.replace(/\D/g, "").slice(0, max); }
      phone.addEventListener("input", function () { onlyDigits(phone, 11); clearErr("phone"); });
      phone2.addEventListener("input", function () { onlyDigits(phone2, 11); clearErr("phone2"); });
      pin.addEventListener("input", function () { onlyDigits(pin, 6); clearErr("pin"); });
      var pinToggle = m.querySelector("#pc-pin-toggle");
      if (pinToggle) pinToggle.onclick = function () {
        var show = pin.type === "password";
        pin.type = show ? "text" : "password";
        pinToggle.textContent = show ? "隐藏" : "显示";
      };

      function setErr(field, msg) {
        var f = m.querySelector("#f-" + field), e = m.querySelector("#e-" + field);
        if (f) f.classList.add("bad");
        if (e) e.textContent = msg;
      }
      function clearErr(field) {
        var f = m.querySelector("#f-" + field), e = m.querySelector("#e-" + field);
        if (f) f.classList.remove("bad");
        if (e) e.textContent = "";
      }

      m.querySelector("#pc-cancel").onclick = function () { m.remove(); };
      m.querySelector("#pc-create").onclick = function () {
        var p1 = phone.value, p2 = phone2.value, pinv = pin.value;
        var ok = true;
        if (!/^1\d{10}$/.test(p1)) { setErr("phone", "请输入 11 位手机号（以 1 开头）"); ok = false; }
        if (ok && p1 !== p2) { setErr("phone2", "两次手机号不一致"); ok = false; }
        if (pinv && !/^\d{6}$/.test(pinv)) { setErr("pin", "PIN 需为 6 位数字"); ok = false; }
        if (!ok) return;
        var sb = newBackend();
        sb.createSlot(p1, pinv).then(function () {
          migrateLocalToCloud(sb);   // 首次占坑：把本机已有进度并入云端
          saveIdentity({ slot_id: sb._slotId, slot_secret: sb._slotSecret, phone: p1 });
          root.Store.use(sb);
          m.remove();
          PeixunAuth.renderBar();
        }).catch(function (e) {
          if (e && e.conflict) {
            m.querySelector(".pc-modal-box").innerHTML =
              '<h3>该手机号已注册</h3>' +
              '<p class="pc-note">这个手机号已经在云端有账号了。如果你是本人，直接登录即可。</p>' +
              '<div class="pc-actions">' +
                '<button class="pc-btn pc-btn-ghost" id="pc-change">换一个手机号</button>' +
                '<button class="pc-btn pc-btn-primary" id="pc-tologin">我是本人，去登录</button>' +
              '</div>';
            m.querySelector("#pc-tologin").onclick = function () { m.remove(); PeixunAuth.showLogin(p1); };
            m.querySelector("#pc-change").onclick = function () { m.remove(); PeixunAuth.showRegister(); };
          } else {
            setErr("phone", "创建失败：" + (e && e.message));
          }
        });
      };
    },

    showLogin: function (prefill) {
      var m = document.createElement("div"); m.id = "peixun-cloud-modal";
      m.innerHTML =
        '<div class="pc-modal-box">' +
        '<h3>登录云端账号</h3>' +
        '<p class="pc-note">用注册时的手机号和 PIN 登录，进度会从云端拉回本机。</p>' +
        '<div class="pc-field" id="f-phone"><label>手机号</label>' +
          '<input id="pc-phone" type="tel" inputmode="numeric" autocomplete="off" maxlength="11" placeholder="11 位手机号" value="' + (prefill || "") + '">' +
          '<p class="pc-err" id="e-phone"></p></div>' +
        '<div class="pc-field" id="f-pin"><label>PIN（若设置）<button type="button" class="pc-pin-toggle" id="pc-pin-toggle">显示</button></label>' +
          '<input id="pc-pin" type="password" inputmode="numeric" autocomplete="off" maxlength="6" placeholder="留空若未设 PIN">' +
          '<p class="pc-err" id="e-pin"></p></div>' +
        '<div class="pc-actions">' +
          '<button class="pc-btn pc-btn-ghost" id="pc-cancel">取消</button>' +
          '<button class="pc-btn pc-btn-primary" id="pc-go">登录</button>' +
        '</div>' +
        '</div>';
      document.body.appendChild(m);
      var phone = m.querySelector("#pc-phone"), pin = m.querySelector("#pc-pin");
      phone.addEventListener("input", function () {
        phone.value = phone.value.replace(/\D/g, "").slice(0, 11);
        var f = m.querySelector("#f-phone"), e = m.querySelector("#e-phone");
        if (f) f.classList.remove("bad"); if (e) e.textContent = "";
      });
      var pinInput = m.querySelector("#pc-pin");
      var pinToggle = m.querySelector("#pc-pin-toggle");
      if (pinToggle) pinToggle.onclick = function () {
        var show = pinInput.type === "password";
        pinInput.type = show ? "text" : "password";
        pinToggle.textContent = show ? "隐藏" : "显示";
      };
      function setErr(field, msg) {
        var f = m.querySelector("#f-" + field), e = m.querySelector("#e-" + field);
        if (f) f.classList.add("bad"); if (e) e.textContent = msg;
      }
      m.querySelector("#pc-cancel").onclick = function () { m.remove(); };
      m.querySelector("#pc-go").onclick = function () {
        var p = phone.value, pinv = pin.value;
        if (!/^1\d{10}$/.test(p)) { setErr("phone", "请输入 11 位手机号"); return; }
        var sb = newBackend();
        sb.login(p, pinv).then(function () {
          migrateLocalToCloud(sb);   // 登录：把云端还没有的本机 key 补传上去（不覆盖云端）
          saveIdentity({ slot_id: sb._slotId, slot_secret: sb._slotSecret, phone: p });
          root.Store.use(sb);
          m.remove();
          PeixunAuth.renderBar();
        }).catch(function (e) {
          if (e && e.not_found) setErr("phone", "该手机号未注册，请先注册");
          else if (e && e.bad_pin) setErr("pin", "PIN 错误");
          else setErr("phone", "登录失败：" + (e && e.message));
        });
      };
    },

    logout: function () {
      clearIdentity();
      root._peixunSB = null;
      // 退回本地后端（store.js 默认 LocalBackend）
      if (root.Store && root.Store._local) root.Store.use(root.Store._local);
      PeixunAuth.renderBar();   // 注意：作为 onclick 时 this=按钮，必须用 PeixunAuth
    },

    renderBar: function () {
      // 做题历史页自身已展示账号状态，不在页头再挂一个指向自己的链接
      if (/\/history\.html$/.test(location.pathname)) return;
      var id = loadIdentity();
      var bar = document.getElementById("peixun-cloud-bar");
      if (!bar) {
        bar = document.createElement("div"); bar.id = "peixun-cloud-bar";
        // 放进页头右上角（离开拇指误触区），无页头时回退为右上角浮动
        var shell = document.querySelector("header.site-head .shell");
        if (shell) { bar.style.marginLeft = "auto"; shell.appendChild(bar); }
        else { bar.style.position = "fixed"; bar.style.top = "10px"; bar.style.right = "10px"; bar.style.zIndex = "9999"; document.body.appendChild(bar); }
      }
      // 做题历史页链接：子模块在子目录用 ../history.html，SPA 同目录用 history.html
      var histHref = /\/(jianhu|wuxiandian)\//.test(location.pathname) ? "../history.html" : "history.html";
      if (id) {
        bar.innerHTML = '<a class="pc-hist" href="' + histHref + '" title="查看做题历史">已登录（' +
          maskPhone(id.phone) + '）·云端同步中</a>' +
          '<button id="pc-out">退出</button>';
        bar.querySelector("#pc-out").onclick = function () { PeixunAuth.logout(); };
      } else {
        bar.innerHTML = '<span>进度仅存本机</span>' +
          '<button id="pc-reg2">存到云端</button>' +
          '<button id="pc-login2">登录</button>';
        bar.querySelector("#pc-reg2").onclick = function () { PeixunAuth.showRegister(); };
        bar.querySelector("#pc-login2").onclick = function () { PeixunAuth.showLogin(); };
      }
    }
  };

  root.PeixunAuth = PeixunAuth;
})(typeof window !== "undefined" ? window : this);
