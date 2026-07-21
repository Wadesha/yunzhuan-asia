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
      "#peixun-cloud-banner,#peixun-cloud-bar{position:fixed;left:12px;bottom:12px;z-index:9999;" +
      "background:#2f4858;color:#fff;padding:10px 12px;border-radius:10px;font:13px/1.4 sans-serif;" +
      "display:flex;gap:8px;align-items:center;box-shadow:0 4px 16px rgba(0,0,0,.25)}" +
      "#peixun-cloud-bar{right:12px;left:auto}" +
      "#peixun-cloud-banner button,#peixun-cloud-bar button{background:#fff;color:#2f4858;border:0;" +
      "border-radius:6px;padding:4px 10px;cursor:pointer;font:13px sans-serif}" +
      "#peixun-cloud-modal{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:10000;" +
      "display:flex;align-items:center;justify-content:center}" +
      ".pc-modal-box{background:#fff;color:#222;border-radius:12px;padding:20px;width:300px;max-width:90vw;" +
      "font:13px/1.5 sans-serif;display:flex;flex-direction:column;gap:10px}" +
      ".pc-modal-box h3{margin:0;font-size:15px}.pc-modal-box label{display:flex;flex-direction:column;gap:4px}" +
      ".pc-modal-box input{border:1px solid #ccc;border-radius:6px;padding:6px}" +
      ".pc-hint{color:#b00;font-size:12px;margin:0}" +
      ".pc-modal-box button{background:#2f4858;color:#fff;border:0;border-radius:6px;padding:8px;cursor:pointer}";
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
      if (id) {
        var sb = newBackend();
        sb._slotId = id.slot_id; sb._slotSecret = id.slot_secret;
        sb._hydrate().then(function () { root.Store.use(sb); self.renderBar(); })
          .catch(function () { self.renderBar(); });
      } else {
        this.renderBar();
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
        '<h3>存到云端（手机号即用户名，不验证）</h3>' +
        '<label>手机号 <input id="pc-phone" placeholder="11 位手机号"></label>' +
        '<label>再输一遍 <input id="pc-phone2" placeholder="确认手机号"></label>' +
        '<label>简单 PIN（可选，云端密码）<input id="pc-pin" placeholder="可留空"></label>' +
        '<p class="pc-hint">仅靠手机号标识，无额外验证；建议设 PIN 更安全。</p>' +
        '<button id="pc-create">创建并同步</button>' +
        '<button id="pc-cancel">取消</button>' +
        '</div>';
      document.body.appendChild(m);
      m.querySelector("#pc-cancel").onclick = function () { m.remove(); };
      m.querySelector("#pc-create").onclick = function () {
        var p1 = m.querySelector("#pc-phone").value.trim();
        var p2 = m.querySelector("#pc-phone2").value.trim();
        if (!/^1\d{10}$/.test(p1)) { alert("手机号格式不对"); return; }
        if (p1 !== p2) { alert("两次手机号不一致"); return; }
        var pin = m.querySelector("#pc-pin").value;
        var sb = newBackend();
        sb.createSlot(p1, pin).then(function () {
          migrateLocalToCloud(sb);   // 首次占坑：把本机已有进度并入云端
          saveIdentity({ slot_id: sb._slotId, slot_secret: sb._slotSecret, phone: p1 });
          root.Store.use(sb);
          m.remove();
          PeixunAuth.renderBar();
        }).catch(function (e) {
          if (e && e.conflict) {
            m.querySelector(".pc-modal-box").innerHTML =
              '<h3>该手机号已注册</h3>' +
              '<p>这个手机号已经在云端有账号了。</p>' +
              '<button id="pc-tologin">我是本人，去登录</button>' +
              '<button id="pc-change">换一个手机号</button>';
            m.querySelector("#pc-tologin").onclick = function () { m.remove(); PeixunAuth.showLogin(p1); };
            m.querySelector("#pc-change").onclick = function () { m.remove(); PeixunAuth.showRegister(); };
          } else {
            alert("创建失败：" + (e && e.message));
          }
        });
      };
    },

    showLogin: function (prefill) {
      var m = document.createElement("div"); m.id = "peixun-cloud-modal";
      m.innerHTML =
        '<div class="pc-modal-box">' +
        '<h3>登录云端账号</h3>' +
        '<label>手机号 <input id="pc-phone" placeholder="11 位手机号" value="' + (prefill || "") + '"></label>' +
        '<label>PIN（若设置）<input id="pc-pin" placeholder="留空若未设 PIN" type="password"></label>' +
        '<button id="pc-go">登录</button>' +
        '<button id="pc-cancel">取消</button>' +
        '</div>';
      document.body.appendChild(m);
      m.querySelector("#pc-cancel").onclick = function () { m.remove(); };
      m.querySelector("#pc-go").onclick = function () {
        var phone = m.querySelector("#pc-phone").value.trim();
        var pin = m.querySelector("#pc-pin").value;
        var sb = newBackend();
        sb.login(phone, pin).then(function () {
          migrateLocalToCloud(sb);   // 登录：把云端还没有的本机 key 补传上去（不覆盖云端）
          saveIdentity({ slot_id: sb._slotId, slot_secret: sb._slotSecret, phone: phone });
          root.Store.use(sb);
          m.remove();
          PeixunAuth.renderBar();
        }).catch(function (e) {
          if (e && e.not_found) alert("该手机号未注册，请先注册");
          else if (e && e.bad_pin) alert("PIN 错误");
          else alert("登录失败：" + (e && e.message));
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
      var id = loadIdentity();
      var bar = document.getElementById("peixun-cloud-bar");
      if (!bar) { bar = document.createElement("div"); bar.id = "peixun-cloud-bar"; document.body.appendChild(bar); }
      if (id) {
        bar.innerHTML = '<span>已登录（' + maskPhone(id.phone) + '）·云端同步中</span>' +
          '<button id="pc-out">退出</button>';
        bar.querySelector("#pc-out").onclick = this.logout;
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
