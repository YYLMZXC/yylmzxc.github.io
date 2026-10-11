/* ============================================================
   YYLMZXC 导航站 · 视图契约
   渲染层产出 DOM，其余模块再按类名与属性把它找回来：装配层据此分派点击、
   dnd 据此判断拖的是谁、feed 据此给 RSS 条目补「最新一条」。
   两边必须用同一套名字，而名字对不上不会报错，只会静默失效——
   把 .meta 改成 .info，程序照常运行，只是最新标题再也不出现。
   所以把「元素 id / 类名 / data-* 字段」收在本文件，双方都从这里取，
   改名时只改一处（与 storage.js 收拢所有存储键名是同一个思路）。
   注意：styles.css 用的是同一套类名，改类名时要一并同步——样式表读不到本模块。
   本模块只有名字、没有任何依赖，因此位于基础层，谁都可以直接读。
   ============================================================ */
window.Nav = window.Nav || {};
(function (Nav) {
  'use strict';

  // 页面上作为锚点的元素 id
  var id = {
    groups: 'groups'          // 分组列表容器（<main class="groups" id="groups">）
  };

  // 跨模块共享的类名：由渲染层产出，其他模块据此查找
  var cls = {
    group: 'group',           // 分组卡片，带 data-gid
    link: 'link',             // 书签条目，带 data-gid / data-lid
    rss: 'rss',               // 附加在条目上：数据里 link.rss 为真
    meta: 'meta',             // 条目里的文字区（名称 + 域名）
    latest: 'latest',         // feed 在 meta 里补的「最新一条」标题
    grip: 'grip',             // 分组头上的拖动把手
    // 触屏标记：touch.setup() 挂在 <html> 上，styles.css 据此关闭分组内层滚动
    touch: 'touch'            // （保证手机端页面整体可滑动）
  };

  // dataset 的字段名：dataset[data.gid] 即 data-gid
  var data = {
    gid: 'gid',
    lid: 'lid'
  };

  // 选择器由上面的名字拼出，避免「改了类名，选择器里还留着旧字符串」
  var sel = {
    group: '.' + cls.group,
    link: '.' + cls.link,
    rssLink: '.' + cls.link + '.' + cls.rss,
    // 按 id 精确定位一张分组卡片。id 由 util.uid 生成（纯字母数字），无需转义
    groupOf: function (gid) {
      return '.' + cls.group + '[data-' + data.gid + '="' + gid + '"]';
    }
  };

  Nav.contract = { id: id, cls: cls, data: data, sel: sel };
})(window.Nav);
