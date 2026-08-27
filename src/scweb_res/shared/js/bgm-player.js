/**
 * 生存战争网 - BGM 背景音乐播放器
 *
 * 架构：高内聚 · 低耦合
 * ┌─────────────────────────────────────────────────┐
 * │  BgmPlayer（编排层）                             │
 * │  ├─ BgmStore  — 持久化（localStorage）          │
 * │  ├─ BgmAudio  — 音频引擎（播放/暂停/切歌/音量）│
 * │  └─ BgmUI     — 界面渲染（DOM 构建/更新）       │
 * └─────────────────────────────────────────────────┘
 */
;(function () {
'use strict';

/* ================================================================
 *  BgmStore — 持久化存储
 *  职责：读写 localStorage，对上层屏蔽存储细节
 * ================================================================ */
var BgmStore = {
    _NS: 'bgm_',

    get: function (key, fallback) {
        try {
            var v = localStorage.getItem(this._NS + key);
            return v !== null ? v : fallback;
        } catch (_) { return fallback; }
    },

    set: function (key, value) {
        try { localStorage.setItem(this._NS + key, String(value)); } catch (_) {}
    },

    /* 便捷方法 */
    getVolume:  function ()  { return parseInt(this.get('volume', '70'), 10); },
    setVolume:  function (v) { this.set('volume', v); },
    getTrackIdx: function ()  { return parseInt(this.get('track', '0'), 10); },
    setTrackIdx: function (i) { this.set('track', i); }
};

/* ================================================================
 *  BgmAudio — 音频引擎
 *  职责：管理 Audio 对象、播放列表、播放状态
 *  对外通过回调通知 UI 层，不直接操作 DOM
 * ================================================================ */
var BgmAudio = (function () {
    var TRACKS = [
        { src: './bgm/蔷薇偶像 (Live at @Gamepulse武道馆).mp3', name: '蔷薇偶像 (Live at @Gamepulse武道馆)' },
        { src: './bgm/小石DISCO.wav',                          name: '小石DISCO' },
        { src: './bgm/献给你的荆棘之歌(Acoustic.ver).mp3',      name: '献给你的荆棘之歌 (Acoustic.ver)' }
    ];

    var _audio    = new Audio();
    var _index    = 0;
    var _playing  = false;
    var _mutedByUser = false;

    _audio.preload = 'auto';
    _audio.loop    = false;

    /* ---------- 回调注册 ---------- */
    var _onPlayStateChange = null;  // function(playing)
    var _onTrackChange     = null;  // function(index, track)
    var _onTimeUpdate      = null;  // function(currentTime, duration)
    var _onEnded           = null;  // function()

    return {
        /* --- 属性 --- */
        tracks: TRACKS,
        get index()    { return _index; },
        get playing()  { return _playing; },
        get muted()    { return _audio.muted; },
        get mutedByUser() { return _mutedByUser; },
        get duration() { return _audio.duration || 0; },
        get currentTime() { return _audio.currentTime || 0; },
        set currentTime(t) { _audio.currentTime = t; },

        /* --- 回调绑定 --- */
        on: function (event, fn) {
            if (event === 'stateChange') _onPlayStateChange = fn;
            if (event === 'trackChange') _onTrackChange = fn;
            if (event === 'timeUpdate')  _onTimeUpdate = fn;
            if (event === 'ended')       _onEnded = fn;
        },

        /* --- 核心操作 --- */
        load: function (idx, autoplay) {
            if (idx < 0 || idx >= TRACKS.length) idx = 0;
            _index = idx;
            _audio.src = TRACKS[idx].src;
            _audio.load();

            BgmStore.setTrackIdx(idx);
            if (_onTrackChange) _onTrackChange(idx, TRACKS[idx]);

            if (autoplay) this.play();
        },

        play: function () {
            _audio.play().then(function () {
                _playing = true;
                if (_onPlayStateChange) _onPlayStateChange(true);
            }).catch(function () {});
        },

        pause: function () {
            _audio.pause();
            _playing = false;
            if (_onPlayStateChange) _onPlayStateChange(false);
        },

        toggle: function () {
            _playing ? this.pause() : this.play();
        },

        next: function () {
            this.load((_index + 1) % TRACKS.length, true);
        },

        prev: function () {
            this.load((_index - 1 + TRACKS.length) % TRACKS.length, true);
        },

        /* --- 音量 --- */
        setVolume: function (v) {
            _audio.volume = v / 100;
            BgmStore.setVolume(v);
        },

        getVolumePercent: function () {
            return Math.round(_audio.volume * 100);
        },

        mute: function () {
            _mutedByUser = true;
            _audio._savedVol = _audio.volume;
            _audio.volume = 0;
        },

        unmute: function () {
            _mutedByUser = false;
            _audio.muted = false;
            var v = _audio._savedVol || 0.7;
            _audio.volume = v;
        },

        /* --- 浏览器自动播放适配 --- */
        startMuted: function () {
            _audio.muted = true;
        },

        unmuteIfAllowed: function () {
            if (_audio.muted && !_mutedByUser) {
                _audio.muted = false;
                _audio.volume = BgmStore.getVolume() / 100;
            }
        },

        /* --- 内部事件绑定（由 init 调用一次） --- */
        _bindAudioEvents: function () {
            var self = this;
            _audio.addEventListener('timeupdate', function () {
                if (_onTimeUpdate) _onTimeUpdate(_audio.currentTime, _audio.duration);
            });
            _audio.addEventListener('ended', function () {
                if (_onEnded) _onEnded();
                self.next();
            });
            _audio.addEventListener('play', function () {
                _playing = true;
                if (_onPlayStateChange) _onPlayStateChange(true);
            });
            _audio.addEventListener('pause', function () {
                _playing = false;
                if (_onPlayStateChange) _onPlayStateChange(false);
            });
        }
    };
})();

/* ================================================================
 *  BgmUI — 界面渲染
 *  职责：DOM 构建、样式更新、事件委托
 *  不包含任何业务逻辑，只做「展示」和「转发用户操作」
 * ================================================================ */
var BgmUI = (function () {
    var _fab   = null;
    var _panel = null;
    var _panelOpen = false;

    /* ---------- DOM 构建 ---------- */
    function create() {
        _fab = document.createElement('button');
        _fab.className = 'bgm-fab';
        _fab.title = '背景音乐';
        _fab.setAttribute('aria-label', '背景音乐');
        _fab.innerHTML = '<span class="bgm-icon">🎵</span>';
        document.body.appendChild(_fab);

        _panel = document.createElement('div');
        _panel.className = 'bgm-panel';
        _panel.innerHTML =
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
        document.body.appendChild(_panel);
    }

    /* ---------- 更新方法（纯展示，无逻辑） ---------- */
    function updatePlayBtn(playing) {
        var btn = document.getElementById('bgmPlayBtn');
        if (btn) btn.textContent = playing ? '⏸' : '▶';
        if (_fab) _fab.classList.toggle('playing', playing);
    }

    function updateTrackName(name) {
        var el = document.getElementById('bgmTrackName');
        if (el) el.textContent = name || '未播放';
    }

    function updateProgress(currentTime, duration) {
        if (!duration) return;
        var pct = (currentTime / duration) * 100;
        var fill = document.getElementById('bgmProgressFill');
        var cur  = document.getElementById('bgmTimeCurrent');
        var tot  = document.getElementById('bgmTimeTotal');
        if (fill) fill.style.width = pct + '%';
        if (cur)  cur.textContent  = _fmtTime(currentTime);
        if (tot)  tot.textContent  = _fmtTime(duration);
    }

    function renderPlaylist(tracks, activeIdx, playing) {
        var list = document.getElementById('bgmPlaylist');
        if (!list) return;
        var html = '';
        for (var i = 0; i < tracks.length; i++) {
            var isActive = i === activeIdx;
            html += '<div class="bgm-playlist-item' + (isActive ? ' active' : '') + '" data-index="' + i + '">' +
                '<span class="bgm-item-index">' + (isActive && playing ? '♫' : (i + 1)) + '</span>' +
                '<span class="bgm-item-name">' + tracks[i].name + '</span>' +
            '</div>';
        }
        list.innerHTML = html;
    }

    function setVolumeSlider(v) {
        var slider = document.getElementById('bgmVolumeSlider');
        if (slider) slider.value = v;
    }

    function setVolumeIcon(v) {
        var icon = document.getElementById('bgmVolumeIcon');
        if (icon) icon.textContent = v === 0 ? '🔇' : v < 50 ? '🔉' : '🔊';
    }

    function togglePanel() {
        _panelOpen = !_panelOpen;
        _panel.classList.toggle('visible', _panelOpen);
        _fab.classList.toggle('open', _panelOpen);
    }

    /* ---------- 事件委托（转发用户操作） ---------- */
    function bindActions(callbacks) {
        _fab.addEventListener('click', callbacks.onTogglePanel);

        document.getElementById('bgmPlayBtn').addEventListener('click', function (e) {
            e.stopPropagation(); callbacks.onPlay();
        });
        document.getElementById('bgmPrevBtn').addEventListener('click', function (e) {
            e.stopPropagation(); callbacks.onPrev();
        });
        document.getElementById('bgmNextBtn').addEventListener('click', function (e) {
            e.stopPropagation(); callbacks.onNext();
        });

        document.getElementById('bgmVolumeSlider').addEventListener('input', function () {
            callbacks.onVolumeChange(parseInt(this.value, 10));
        });

        document.getElementById('bgmVolumeIcon').addEventListener('click', function () {
            callbacks.onMuteToggle();
        });

        document.getElementById('bgmProgressBar').addEventListener('click', function (e) {
            e.stopPropagation();
            var rect = this.getBoundingClientRect();
            callbacks.onSeek((e.clientX - rect.left) / rect.width);
        });

        _panel.querySelector('.bgm-playlist').addEventListener('click', function (e) {
            var item = e.target.closest('.bgm-playlist-item');
            if (!item) return;
            callbacks.onSelectTrack(parseInt(item.getAttribute('data-index'), 10));
        });
    }

    /* ---------- 工具 ---------- */
    function _fmtTime(s) {
        if (isNaN(s) || !isFinite(s)) return '0:00';
        var m = Math.floor(s / 60);
        var sec = Math.floor(s % 60);
        return m + ':' + (sec < 10 ? '0' : '') + sec;
    }

    return {
        create: create,
        updatePlayBtn: updatePlayBtn,
        updateTrackName: updateTrackName,
        updateProgress: updateProgress,
        renderPlaylist: renderPlaylist,
        setVolumeSlider: setVolumeSlider,
        setVolumeIcon: setVolumeIcon,
        togglePanel: togglePanel,
        bindActions: bindActions
    };
})();

/* ================================================================
 *  BgmPlayer — 编排层
 *  职责：协调 BgmStore / BgmAudio / BgmUI，处理初始化与自动播放
 * ================================================================ */
var BgmPlayer = (function () {
    function init() {
        /* 1. 创建 DOM */
        BgmUI.create();

        /* 2. 恢复状态 */
        var vol  = BgmStore.getVolume();
        var idx  = BgmStore.getTrackIdx();
        BgmAudio.setVolume(vol);
        BgmUI.setVolumeSlider(vol);
        BgmUI.setVolumeIcon(vol);

        /* 3. 绑定音频引擎回调 → UI 更新 */
        BgmAudio.on('stateChange', function (playing) {
            BgmUI.updatePlayBtn(playing);
            BgmUI.renderPlaylist(BgmAudio.tracks, BgmAudio.index, playing);
        });
        BgmAudio.on('trackChange', function (i, track) {
            BgmUI.updateTrackName(track.name);
            BgmUI.renderPlaylist(BgmAudio.tracks, i, BgmAudio.playing);
        });
        BgmAudio.on('timeUpdate', function (cur, dur) {
            BgmUI.updateProgress(cur, dur);
        });
        BgmAudio._bindAudioEvents();

        /* 4. 绑定 UI 事件 → 音频引擎操作 */
        BgmUI.bindActions({
            onTogglePanel:  function ()  { BgmUI.togglePanel(); },
            onPlay:         function ()  { BgmAudio.toggle(); },
            onPrev:         function ()  { BgmAudio.prev(); },
            onNext:         function ()  { BgmAudio.next(); },
            onSelectTrack:  function (i) { BgmAudio.load(i, true); },
            onVolumeChange: function (v) { BgmAudio.setVolume(v); BgmUI.setVolumeIcon(v); },
            onMuteToggle:   function () {
                if (BgmAudio.mutedByUser) {
                    BgmAudio.unmute();
                    var v = BgmAudio.getVolumePercent();
                    BgmUI.setVolumeSlider(v);
                    BgmUI.setVolumeIcon(v);
                } else {
                    BgmAudio.mute();
                    BgmUI.setVolumeSlider(0);
                    BgmUI.setVolumeIcon(0);
                }
            },
            onSeek: function (pct) {
                BgmAudio.currentTime = pct * BgmAudio.duration;
            }
        });

        /* 5. 自动播放（静音启动 → 首次交互后取消静音） */
        BgmAudio.startMuted();
        BgmAudio.load(idx, true);

        var unmute = function () {
            BgmAudio.unmuteIfAllowed();
            var v = BgmAudio.getVolumePercent();
            BgmUI.setVolumeSlider(v);
            BgmUI.setVolumeIcon(v);
            document.removeEventListener('click',    unmute);
            document.removeEventListener('scroll',   unmute);
            document.removeEventListener('keydown',  unmute);
        };
        document.addEventListener('click',   unmute);
        document.addEventListener('scroll',  unmute);
        document.addEventListener('keydown', unmute);
    }

    return { init: init };
})();

/* ---- 启动 ---- */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', BgmPlayer.init);
} else {
    BgmPlayer.init();
}

})();
