/* ============================================================
   YYLMZXC 离线导航站 · 触屏手势适配
   只关心「手指在干什么」，不关心页面上是谁：
     · 检测触屏设备（ontouchstart / pointer: coarse，与视口宽度无关，
       横屏、平板、WebView 缩放都能识别）；
     · 检测到就给 <html> 挂契约里的 touch 类——styles.css 据此关闭
       分组内层滚动，让页面作为整体滑动（内层滚动 + overscroll-behavior:
       contain 会把滑动困在分组里，滚到底也带不动整页）；
     · 手指位移超过阈值判定为「滑动」，滑动后的那次 click 不再触发
       链接 / 按钮的默认行为，避免想滚动页面却误打开了书签网站。
   本模块位于基础层：只读契约的类名，不引用 store / render / actions，
   触屏行为因此与业务彻底解耦；装配层只需在首屏前调用一次 setup()。
   ============================================================ */
window.Nav = window.Nav || {};
(function (Nav) {
  'use strict';

  var contract = Nav.contract;

  // 滑动判定阈值：位移超过它就认为用户在滚动而非点按（px）
  var MOVE_THRESHOLD = 10;

  // 供测试与装配层确认当前是否按触屏处理
  var enabled = false;

  function isTouchDevice() {
    if ('ontouchstart' in window) return true;
    // 部分 WebView 不暴露 ontouchstart，用指针类型兜底
    return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  }

  function setup() {
    if (enabled || !isTouchDevice()) return;
    enabled = true;

    // 与 styles.css 的约定：html.touch 下取消分组内层滚动、启用惯性滚动、
    // 可点元素只保留点按与平移。类名来自契约，改名只动契约一处。
    document.documentElement.classList.add(contract.cls.touch);

    var moved = false, sx = 0, sy = 0;

    // passive：不拦截浏览器原生滚动，只是旁听并做标记
    document.addEventListener('touchstart', function (e) {
      moved = false;
      var t = e.changedTouches[0];
      sx = t.clientX; sy = t.clientY;
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
      if (moved) return;
      var t = e.changedTouches[0];
      if (Math.abs(t.clientX - sx) > MOVE_THRESHOLD ||
          Math.abs(t.clientY - sy) > MOVE_THRESHOLD) moved = true;
    }, { passive: true });

    // 捕获阶段拦截：抢在浏览器默认的链接导航与各模块的 click 分派之前。
    // 只在「这一轮手势滑动过」时生效，普通点按完全不受影响。
    document.addEventListener('click', function (e) {
      if (!moved) return;
      if (e.target.closest('a, button')) { e.preventDefault(); e.stopPropagation(); }
    }, true);
  }

  Nav.touch = { setup: setup };
})(window.Nav);
