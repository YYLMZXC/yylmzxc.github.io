/**
 * 生存战争网 - 站点导航渲染（首页 / 关于页共用）
 *
 * 把 NavStore 当前页面的分组画成 <section class="nav-section"> +
 * <div class="banner-grid"> + <a class="nav-link">：
 * 两个页面用的是同一套结构与类名，各自用页面 CSS 调样子
 * （首页在 index_main.css 里，关于页用 components.css 里的默认样式），
 * 所以这里不写样式、也不碰数据，只管「把数据变成 DOM」。
 * 挂载到全局 window.NavRender
 */
class NavRender {
    /**
     * 渲染到容器（容器原有内容会被整份替换；没有链接的分组不占版面）
     * @param {Element} container - 承载区块的容器
     * @param {Object} store - NavStore 实例（用它绑定的页面身份取分组）
     * @param {Object} translations - 词条表，见 NavStore.translationsFor
     */
    static sections(container, store, translations) {
        if (!container || !store) return;

        const fragment = document.createDocumentFragment();

        store.groups().forEach(group => {
            const links = (group.links || []).filter(link => link.url);
            if (!links.length) return;

            const section = document.createElement('section');
            section.className = 'nav-section';

            const title = document.createElement('h3');
            title.textContent = NavStore.groupTitle(group, translations);
            section.appendChild(title);

            const grid = document.createElement('div');
            grid.className = 'banner-grid';
            links.forEach(link => grid.appendChild(NavRender.linkElement(link, translations)));
            section.appendChild(grid);

            fragment.appendChild(section);
        });

        container.innerHTML = '';
        container.appendChild(fragment);
    }

    /**
     * 生成一个导航链接元素
     * 标题的「词条优先、原文兜底」由 NavStore.linkTitle 统一判定，
     * 与编辑器里显示的名字保持同一份逻辑
     * @param {Object} link - { key, title, url, external }
     * @param {Object} translations - 词条表，见 NavStore.translationsFor
     */
    static linkElement(link, translations) {
        const text = NavStore.linkTitle(link, translations);

        const a = document.createElement('a');
        a.href = link.url;
        a.textContent = text;
        a.title = text;
        a.className = 'nav-link';

        if (link.external) {
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
        }

        return a;
    }
}

window.NavRender = NavRender;
