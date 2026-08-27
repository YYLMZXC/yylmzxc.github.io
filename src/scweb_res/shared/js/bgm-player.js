/**
 * 生存战争网 - BGM 背景音乐播放器
 * 功能：
 * - 侧边浮动音乐图标，点击展开/收起播放面板
 * - 播放/暂停、上一首/下一首
 * - 音量调节、进度条
 * - 自动播放下一首
 * - 记住音量设置（localStorage）
 */
(function () {
    'use strict';

    /* ===== 歌曲列表 ===== */
    var TRACKS = [
        { src: './bgm/蔷薇偶像 (Live at @Gamepulse武道馆).mp3', name: '蔷薇偶像 (Live at @Gamepulse武道馆)' },
        { src: './bgm/小石DISCO.wav', name: '小石DISCO' },
        { src: './bgm/献给你的荆棘之歌(Acoustic.ver).mp3', name: '献给你的荆棘之歌 (Acoustic.ver)' }
    ];

    var STORAGE_KEY_VOL = 'bgm_volume';
    var STORAGE_KEY_IDX = 'bgm_index';

    var audio = new Audio();
    audio.preload = 'auto';
    audio.loop = false;

    var currentIndex = 0;
    var isPlaying = false;
    var panelOpen = false;
    var audioReady = false;
    var mutedByUser = false; // 用户是否手动静音

    /* ===== 构建 DOM ===== */
    function buildUI() {
        // 浮动按钮
        var fab = document.createElement('button');
        fab.className = 'bgm-fab';
        fab.title = '背景音乐';
        fab.setAttribute('aria-label', '背景音乐');
        fab.innerHTML = '<span class="bgm-icon">🎵</span>';
        document.body.appendChild(fab);

        // 面板
        var panel = document.createElement('div');
        panel.className = 'bgm-panel';
        panel.innerHTML =
            '<div class="bgm-panel-header">' +
                '<div class="bgm-panel-title">🎵 背景音乐</div>' +
            '</div>' +
            '<div class="bgm-now-playing">' +
                '<p class="bgm-track-name" id="bgmTrackName">未播放</p>' +
            '</div>' +
            '<div class="bgm-progress-wrap">' +
                '<div class="bgm-progress-bar" id="bgmProgressBar">' +
                    '<div class="bgm-progress-fill" id="bgmProgressFill"></div>' +
                '</div>' +
                '<div class="bgm-time">' +
                    '<span id="bgmTimeCurrent">0:00</span>' +
                    '<span id="bgmTimeTotal">0:00</span>' +
                '</div>' +
            '</div>' +
            '<div class="bgm-controls">' +
                '<button class="bgm-ctrl-btn" id="bgmPrevBtn" title="上一首">⏮</button>' +
                '<button class="bgm-ctrl-btn bgm-play-btn" id="bgmPlayBtn" title="播放/暂停">▶</button>' +
                '<button class="bgm-ctrl-btn" id="bgmNextBtn" title="下一首">⏭</button>' +
            '</div>' +
            '<div class="bgm-volume-wrap">' +
                '<span class="bgm-volume-icon" id="bgmVolumeIcon">🔊</span>' +
                '<input type="range" class="bgm-volume-slider" id="bgmVolumeSlider" min="0" max="100" value="70">' +
            '</div>' +
            '<div class="bgm-playlist" id="bgmPlaylist"></div>';
        document.body.appendChild(panel);

        return { fab: fab, panel: panel };
    }

    /* ===== 渲染播放列表 ===== */
    function renderPlaylist(activeIdx) {
        var list = document.getElementById('bgmPlaylist');
        if (!list) return;
        var html = '';
        for (var i = 0; i < TRACKS.length; i++) {
            html += '<div class="bgm-playlist-item' + (i === activeIdx ? ' active' : '') + '" data-index="' + i + '">' +
                '<span class="bgm-item-index">' + (i === activeIdx && isPlaying ? '♫' : (i + 1)) + '</span>' +
                '<span class="bgm-item-name">' + TRACKS[i].name + '</span>' +
            '</div>';
        }
        list.innerHTML = html;
    }

    /* ===== 工具函数 ===== */
    function formatTime(s) {
        if (isNaN(s) || !isFinite(s)) return '0:00';
        var m = Math.floor(s / 60);
        var sec = Math.floor(s % 60);
        return m + ':' + (sec < 10 ? '0' : '') + sec;
    }

    function saveVol(v) {
        try { localStorage.setItem(STORAGE_KEY_VOL, String(v)); } catch (e) {}
    }
    function loadVol() {
        try { return localStorage.getItem(STORAGE_KEY_VOL); } catch (e) { return null; }
    }
    function saveIdx(i) {
        try { localStorage.setItem(STORAGE_KEY_IDX, String(i)); } catch (e) {}
    }
    function loadIdx() {
        try { return localStorage.getItem(STORAGE_KEY_IDX); } catch (e) { return null; }
    }


    /* ===== 播放控制 ===== */
    function loadTrack(idx, autoplay) {
        if (idx < 0 || idx >= TRACKS.length) idx = 0;
        currentIndex = idx;
        audio.src = TRACKS[idx].src;
        audio.load();
        audioReady = true;
        var nameEl = document.getElementById('bgmTrackName');
        if (nameEl) nameEl.textContent = TRACKS[idx].name;
        renderPlaylist(idx);
        saveIdx(idx);
        if (autoplay) {
            audio.play().then(function () {
                isPlaying = true;
                updatePlayBtn();
                renderPlaylist(currentIndex);
            }).catch(function () {});
        }
    }

    function togglePlay() {
        if (!audioReady) {
            loadTrack(currentIndex, true);
            return;
        }
        if (isPlaying) {
            audio.pause();
            isPlaying = false;
        } else {
            audio.play().then(function () {
                isPlaying = true;
            }).catch(function () {});
        }
        updatePlayBtn();
        renderPlaylist(currentIndex);
    }

    function playNext() {
        var next = (currentIndex + 1) % TRACKS.length;
        loadTrack(next, true);
    }

    function playPrev() {
        var prev = (currentIndex - 1 + TRACKS.length) % TRACKS.length;
        loadTrack(prev, true);
    }

    function updatePlayBtn() {
        var btn = document.getElementById('bgmPlayBtn');
        var fab = document.querySelector('.bgm-fab');
        if (btn) btn.textContent = isPlaying ? '⏸' : '▶';
        if (fab) {
            if (isPlaying) {
                fab.classList.add('playing');
            } else {
                fab.classList.remove('playing');
            }
        }
    }

    function updateProgress() {
        if (!audio.duration) return;
        var pct = (audio.currentTime / audio.duration) * 100;
        var fill = document.getElementById('bgmProgressFill');
        var cur = document.getElementById('bgmTimeCurrent');
        var tot = document.getElementById('bgmTimeTotal');
        if (fill) fill.style.width = pct + '%';
        if (cur) cur.textContent = formatTime(audio.currentTime);
        if (tot) tot.textContent = formatTime(audio.duration);
    }

    /* ===== 初始化 ===== */
    function init() {
        var ui = buildUI();
        var fab = ui.fab;
        var panel = ui.panel;

        // 恢复音量
        var savedVol = loadVol();
        var vol = savedVol !== null ? parseInt(savedVol, 10) : 70;
        audio.volume = vol / 100;
        var slider = document.getElementById('bgmVolumeSlider');
        if (slider) slider.value = vol;

        // 恢复曲目索引
        var savedIdx = loadIdx();
        if (savedIdx !== null) {
            currentIndex = parseInt(savedIdx, 10) || 0;
        }

        // FAB 点击 → 展开/收起
        fab.addEventListener('click', function () {
            panelOpen = !panelOpen;
            if (panelOpen) {
                panel.classList.add('visible');
                fab.classList.add('open');
            } else {
                panel.classList.remove('visible');
                fab.classList.remove('open');
            }
        });

        // 播放/暂停
        document.getElementById('bgmPlayBtn').addEventListener('click', function (e) {
            e.stopPropagation();
            togglePlay();
        });

        // 上一首/下一首
        document.getElementById('bgmPrevBtn').addEventListener('click', function (e) {
            e.stopPropagation();
            playPrev();
        });
        document.getElementById('bgmNextBtn').addEventListener('click', function (e) {
            e.stopPropagation();
            playNext();
        });

        // 音量
        slider.addEventListener('input', function () {
            var v = parseInt(this.value, 10);
            audio.volume = v / 100;
            saveVol(v);
            var icon = document.getElementById('bgmVolumeIcon');
            if (icon) icon.textContent = v === 0 ? '🔇' : v < 50 ? '🔉' : '🔊';
        });

        // 静音切换
        document.getElementById('bgmVolumeIcon').addEventListener('click', function () {
            if (audio.volume > 0) {
                audio._prevVol = audio.volume;
                audio.volume = 0;
                mutedByUser = true;
                slider.value = 0;
                this.textContent = '🔇';
            } else {
                mutedByUser = false;
                var restore = (audio._prevVol || 0.7);
                audio.volume = restore;
                audio.muted = false;
                slider.value = Math.round(restore * 100);
                this.textContent = restore < 0.5 ? '🔉' : '🔊';
            }
        });

        // 进度条点击
        document.getElementById('bgmProgressBar').addEventListener('click', function (e) {
            e.stopPropagation();
            if (!audio.duration) return;
            var rect = this.getBoundingClientRect();
            var pct = (e.clientX - rect.left) / rect.width;
            audio.currentTime = pct * audio.duration;
        });

        // 播放列表点击
        panel.querySelector('.bgm-playlist').addEventListener('click', function (e) {
            var item = e.target.closest('.bgm-playlist-item');
            if (!item) return;
            var idx = parseInt(item.getAttribute('data-index'), 10);
            loadTrack(idx, true);
        });

        // audio 事件
        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('ended', function () {
            playNext();
        });
        audio.addEventListener('play', function () {
            isPlaying = true;
            updatePlayBtn();
        });
        audio.addEventListener('pause', function () {
            isPlaying = false;
            updatePlayBtn();
        });

        // ===== 自动播放策略 =====
        // 先以静音方式播放（浏览器允许静音自动播放），用户交互后取消静音
        audio.muted = true;
        loadTrack(currentIndex, true);

        // 首次用户交互时取消静音
        var unmuteOnInteraction = function () {
            if (audio.muted && !mutedByUser) {
                audio.muted = false;
                var savedVol = loadVol();
                audio.volume = savedVol !== null ? parseInt(savedVol, 10) / 100 : 0.7;
            }
            document.removeEventListener('click', unmuteOnInteraction);
            document.removeEventListener('scroll', unmuteOnInteraction);
            document.removeEventListener('keydown', unmuteOnInteraction);
        };
        document.addEventListener('click', unmuteOnInteraction);
        document.addEventListener('scroll', unmuteOnInteraction);
        document.addEventListener('keydown', unmuteOnInteraction);
    }

    // DOM Ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
