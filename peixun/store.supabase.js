/*
 * store.supabase.js — Supabase 后端（手机号=用户名，不验证；可选 PIN）
 *
 * 依赖：supabase-js 已通过 CDN 加载（window.supabase）、store.js 已加载（window.Store）。
 *
 * 用法：
 *   var backend = new SupabaseBackend();
 *   backend.createSlot(phone, pin)          // 注册占坑（冲突会抛 conflict 错误）
 *          .then(function(){ Store.use(backend); });
 *   backend.login(phone, pin)               // 登录（凭手机号+PIN 取回凭证）
 *          .then(function(){ Store.use(backend); });
 *
 * Store.get/set 仍"同步"：读走内存缓存（秒回），写先改缓存、后台回写云端。
 * 三模块的 Sget/Sset/Srem 调用方零改动。
 */
(function (root) {
  "use strict";

  // Supabase 项目连接信息（publishable key 可安全放前端，前提是表已开 RLS —— 本项目 schema 已开）
  var SUPABASE_URL = "https://agogyjmnuvsihdlxlkgp.supabase.co";
  var SUPABASE_ANON = "sb_publishable_uEpd3WOEjLlg5YE1E39Ddg_MwTMUw4v";

  function SupabaseBackend() {
    this.name = "supabase";
    this._client = root.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
    this._cache = {};
    this._slotId = null;
    this._slotSecret = null;
  }

  SupabaseBackend.prototype._rpc = function (name, params) {
    return this._client.rpc(name, params);
  };

  SupabaseBackend.prototype._hydrate = function () {
    var self = this;
    return this._rpc("kv_slot_get", { p_slot_id: this._slotId, p_slot_secret: this._slotSecret })
      .then(function (res) {
        (res.data || []).forEach(function (r) { self._cache[r.key] = r.value; });
        return self;
      });
  };

  // 注册占坑（手机号已存在则抛 conflict 错误）
  SupabaseBackend.prototype.createSlot = function (phone, pin) {
    var self = this;
    return this._rpc("create_slot", { p_phone: phone, p_pin: pin || null }).single()
      .then(function (res) {
        if (res.error) throw res.error;               // 网络/权限错误原样抛出
        var row = res.data || {};
        if (row.conflict) { var e = new Error("phone_taken"); e.conflict = true; throw e; }
        self._slotId = row.slot_id;
        self._slotSecret = row.slot_secret;
        return self._hydrate();
      });
  };

  // 登录：手机号 + 可选 PIN，取回凭证
  SupabaseBackend.prototype.login = function (phone, pin) {
    var self = this;
    return this._rpc("login_slot", { p_phone: phone, p_pin: pin || null }).single()
      .then(function (res) {
        if (res.error) throw res.error;
        var row = res.data || {};
        if (row.not_found) { var e = new Error("not_found"); e.not_found = true; throw e; }
        if (row.bad_pin) { var e2 = new Error("bad_pin"); e2.bad_pin = true; throw e2; }
        self._slotId = row.slot_id;
        self._slotSecret = row.slot_secret;
        return self._hydrate();
      });
  };

  SupabaseBackend.prototype.get = function (k) {
    return this._cache[k] !== undefined ? this._cache[k] : null;
  };

  SupabaseBackend.prototype.set = function (k, v) {
    this._cache[k] = v;
    // 后台回写云端；构造器是 thenable，须 Promise.resolve 后才能 .catch
    var p = this._rpc("kv_slot_set", {
      p_slot_id: this._slotId, p_slot_secret: this._slotSecret, p_key: k, p_value: v
    });
    Promise.resolve(p).catch(function () {});
    return true;
  };

  SupabaseBackend.prototype.remove = function (k) {
    delete this._cache[k];
    var p = this._rpc("kv_slot_del", {
      p_slot_id: this._slotId, p_slot_secret: this._slotSecret, p_key: k
    });
    Promise.resolve(p).catch(function () {});
    return true;
  };

  root.SupabaseBackend = SupabaseBackend;
})(typeof window !== "undefined" ? window : this);
