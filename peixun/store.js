/*
 * store.js — 统一的进度/痕迹存储抽象层（peixun 刷题工具）
 *
 * 设计目的：把"数据存哪里"从各刷题页里抽出来。
 *   - 现在：后端 = LocalBackend（浏览器 localStorage），零成本、零运维。
 *   - 以后：把后端换成 SupabaseBackend（同 Store.get/set/remove 接口），
 *           三个刷题页（jianhu / wuxiandian / SPA）一行都不用改。
 *
 * 调用方只认 Store.get(k) / Store.set(k, obj) / Store.remove(k)：
 *   - 存入的值必须是可 JSON 序列化的对象/数组；
 *   - Store.get 返回已解析的对象（取不到返回 null）。
 */
(function (root) {
  "use strict";

  var _ls = (typeof localStorage !== "undefined") ? localStorage : (root.localStorage || null);

  function lsGet(k) {
    try { return JSON.parse(_ls.getItem(k) || "null"); } catch (e) { return null; }
  }
  function lsSet(k, v) {
    try { _ls.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; }
  }
  function lsRem(k) {
    try { _ls.removeItem(k); } catch (e) {}
  }

  // 默认后端：浏览器本地存储
  var LocalBackend = {
    name: "local",
    get: lsGet,
    set: lsSet,
    remove: lsRem
  };

  var backend = LocalBackend;

  var Store = {
    // 默认本地后端引用（logout 时退回用）
    _local: LocalBackend,
    // 切换后端（以后接 Supabase 时调用 Store.use(SupabaseBackend)）
    use: function (b) { if (b) backend = b; return backend; },
    backendName: function () { return backend.name; },
    get: function (k) { return backend.get(k); },
    set: function (k, v) { return backend.set(k, v); },
    remove: function (k) { return backend.remove(k); }
  };

  root.Store = Store;
})(typeof window !== "undefined" ? window : (typeof globalThis !== "undefined" ? globalThis : this));
