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
 *
 * 支持多文件夹 BGM，通过 bgm-manifest.json 自动识别目录
 * 新增音乐：运行 node tools/bgm-scan.mjs 重新生成清单
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
    var DEFAULT_COVER = './scweb_res/sczzw.png';
    var MANIFEST_URL = './bgm/bgm-manifest.json';

    var _albums    = [];       // 原始专辑数据
    var _flatTracks = [];      // 扁平化后的播放列表（带 album 元数据）
    var _audio     = new Audio();
    var _index     = 0;
    var _playing   = false;
    var _mutedByUser = false;

    /* --- Web Audio API：用于解锁自动播放 --- */
    var _ctx = null;       // AudioContext
    var _gain = null;      // GainNode（控制音量）
    var _source = null;    // MediaElementSourceNode
    var _ctxUnlocked = false;

    _audio.preload = 'auto';
    _audio.loop    = false;

    /* ---------- 回调 ---------- */
    var _onPlayStateChange = null;
    var _onTrackChange     = null;
    var _onTimeUpdate      = null;
    var _onEnded           = null;
    var _onLoad            = null;  // manifest 加载完成

    /* ---------- 扁平化专辑 → 播放列表 ---------- */
    function _flattenAlbums(albums) {
        var list = [];
        for (var a = 0; a < albums.length; a++) {
            var album = albums[a];
            for (var t = 0; t < album.tracks.length; t++) {
                var track = album.tracks[t];
                list.push({
                    src:   track.src,
                    name:  track.name,
                    album: album.name,
                    cover: album.cover || DEFAULT_COVER
                });
            }
        }
        return list;
    }

    return {
        /* --- 属性 --- */
        DEFAULT_COVER: DEFAULT_COVER,
        get albums()     { return _albums; },
        get flatTracks() { return _flatTracks; },
        get index()      { return _index; },
        get playing()    { return _playing; },
        get muted()      { return _audio.muted; },
        get mutedByUser() { return _mutedByUser; },
        get duration()   { return _audio.duration || 0; },
        get currentTime() { return _audio.currentTime || 0; },
        set currentTime(t) {
            var wasPlaying = !_audio.paused;
            try {
                _audio.currentTime = t;
            } catch (e) {
                console.warn('[BGM] seek failed, retrying...', e.message);
                // seek 失败时先 load 再重试
                _audio.load();
                var self = this;
                _audio.addEventListener('canplay', function handler() {
                    _audio.removeEventListener('canplay', handler);
                    try { _audio.currentTime = t; } catch (_) {}
                    if (wasPlaying) _audio.play();
                });
            }
        },

        currentTrack: function () {
            return _flatTracks[_index] || null;
        },

        /* --- 回调绑定 --- */
        on: function (event, fn) {
            if (event === 'stateChange') _onPlayStateChange = fn;
            if (event === 'trackChange') _onTrackChange = fn;
            if (event === 'timeUpdate')  _onTimeUpdate = fn;
            if (event === 'ended')       _onEnded = fn;
            if (event === 'load')        _onLoad = fn;
        },

        /* --- 加载清单 --- */
        loadManifest: function () {
            return fetch(MANIFEST_URL + '?v=' + Date.now())
                .then(function (res) {
                    if (!res.ok) throw new Error(res.status);
                    return res.json();
                })
                .then(function (data) {
                    _albums = data;
                    _flatTracks = _flattenAlbums(data);
                    if (_onLoad) _onLoad(_albums, _flatTracks);
                    return _flatTracks;
                })
                .catch(function (err) {
                    console.warn('[BGM] 清单加载失败:', err);
                    _albums = [];
                    _flatTracks = [];
                    return [];
                });
        },

        /* --- 核心操作 --- */
        load: function (idx, autoplay) {
            if (_flatTracks.length === 0) return;
            if (idx < 0 || idx >= _flatTracks.length) idx = 0;
            _index = idx;
            var track = _flatTracks[idx];
            _audio.src = track.src;
            _audio.load();

            BgmStore.setTrackIdx(idx);
            if (_onTrackChange) _onTrackChange(idx, track);

            if (autoplay) this.play();
        },

        play: function () {
            // 不使用 audio.play() 返回的 Promise（浏览器原生 Promise 在某些情况下
            // 即使有 .catch() 仍会报 "Uncaught (in promise)"）
            // 改用 addEventListener 监听 play/pause/error 事件
            try {
                _audio.play();
            } catch (e) {
                console.warn('[BGM] play() sync error:', e.message);
            }
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
            if (_flatTracks.length === 0) return;
            this.load((_index + 1) % _flatTracks.length, true);
        },

        prev: function () {
            if (_flatTracks.length === 0) return;
            this.load((_index - 1 + _flatTracks.length) % _flatTracks.length, true);
        },

        /* --- 音量（走 GainNode） --- */
        setVolume: function (v) {
            if (_gain) {
                _gain.gain.value = v / 100;
            } else {
                _audio.volume = v / 100;
            }
            BgmStore.setVolume(v);
        },

        getVolumePercent: function () {
            if (_gain) return Math.round(_gain.gain.value * 100);
            return Math.round(_audio.volume * 100);
        },

        mute: function () {
            _mutedByUser = true;
            if (_gain) {
                _audio._savedGain = _gain.gain.value;
                _gain.gain.value = 0;
            } else {
                _audio._savedVol = _audio.volume;
                _audio.volume = 0;
            }
        },

        unmute: function () {
            _mutedByUser = false;
            if (_gain) {
                _gain.gain.value = _audio._savedGain || BgmStore.getVolume() / 100;
            } else {
                _audio.volume = _audio._savedVol || 0.7;
            }
        },

        /* --- Web Audio API 解锁 --- */
        /**
         * 在首次用户手势中调用，创建 AudioContext 并解锁自动播放
         * 之后 audio.play() 不再需要用户手势
         */
        unlockAudioContext: function () {
            if (_ctxUnlocked) return;
            try {
                var AC = window.AudioContext || window.webkitAudioContext;
                if (!AC) return;
                if (!_ctx) {
                    _ctx = new AC();
                    _gain = _ctx.createGain();
                    _gain.gain.value = BgmStore.getVolume() / 100;
                    _source = _ctx.createMediaElementSource(_audio);
                    _source.connect(_gain);
                    _gain.connect(_ctx.destination);
                }
                if (_ctx.state === 'suspended') {
                    _ctx.resume();
                }
                // 播放静音 buffer 解锁
                var buf = _ctx.createBuffer(1, 1, 22050);
                var src = _ctx.createBufferSource();
                src.buffer = buf;
                src.connect(_ctx.destination);
                src.start(0);
                _ctxUnlocked = true;
                console.log('[BGM] AudioContext 已解锁');
            } catch (e) {
                console.warn('[BGM] AudioContext 解锁失败:', e);
            }
        },

        /**
         * 检查 AudioContext 是否已解锁
         */
        isUnlocked: function () {
            return _ctxUnlocked;
        },

        /* --- 浏览器自动播放兼容（静音兜底） --- */
        startMuted: function () {
            _audio.muted = true;
        },

        unmuteIfAllowed: function () {
            if (_audio.muted && !_mutedByUser) {
                _audio.muted = false;
                if (_gain) {
                    _gain.gain.value = BgmStore.getVolume() / 100;
                } else {
                    _audio.volume = BgmStore.getVolume() / 100;
                }
            }
        },

        /* --- 内部事件绑定 --- */
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
            // seek 完成后强制刷新进度条（timeupdate 在长歌曲 seek 后可能延迟）
            _audio.addEventListener('seeked', function () {
                console.log('[BGM] seeked to', _audio.currentTime.toFixed(1));
                if (_onTimeUpdate) _onTimeUpdate(_audio.currentTime, _audio.duration);
            });
            // 音频错误处理
            _audio.addEventListener('error', function () {
                var err = _audio.error;
                console.warn('[BGM] Audio error:', err ? ('code=' + err.code + ' msg=' + err.message) : 'unknown');
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
    var _defaultCover = BgmAudio.DEFAULT_COVER;

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
                '<div class="bgm-cover" id="bgmCover"><img src="' + _defaultCover + '" alt="封面" draggable="false"></div>' +
                '<div class="bgm-now-playing-info">' +
                    '<p class="bgm-track-name" id="bgmTrackName">未播放</p>' +
                    '<p class="bgm-track-album" id="bgmTrackAlbum"></p>' +
                '</div>' +
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

    /* ---------- 更新方法 ---------- */
    function updatePlayBtn(playing) {
        var btn = document.getElementById('bgmPlayBtn');
        if (btn) btn.textContent = playing ? '⏸' : '▶';
        if (_fab) _fab.classList.toggle('playing', playing);
    }

    function updateCover(imgSrc, playing) {
        var container = document.getElementById('bgmCover');
        if (!container) return;
        var img = container.querySelector('img');
        if (img) {
            img.src = imgSrc || _defaultCover;
            img.onerror = function () { this.src = _defaultCover; };
        }
        container.classList.toggle('spinning', playing);
    }

    function updateTrackInfo(track) {
        var nameEl = document.getElementById('bgmTrackName');
        var albumEl = document.getElementById('bgmTrackAlbum');
        if (nameEl) nameEl.textContent = track ? track.name : '未播放';
        if (albumEl) {
            albumEl.textContent = (track && track.album) ? track.album : '';
            albumEl.style.display = (track && track.album) ? '' : 'none';
        }
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

    /**
     * 渲染播放列表（含专辑分组标题）
     * @param {Array} flatTracks  扁平化播放列表
     * @param {number} activeIdx  当前播放索引
     * @param {boolean} playing   是否正在播放
     */
    function renderPlaylist(flatTracks, activeIdx, playing) {
        var list = document.getElementById('bgmPlaylist');
        if (!list) return;

        if (flatTracks.length === 0) {
            list.innerHTML = '<div class="bgm-playlist-empty">暂无音乐</div>';
            return;
        }

        var html = '';
        var lastAlbum = '';

        for (var i = 0; i < flatTracks.length; i++) {
            var track = flatTracks[i];
            var isActive = i === activeIdx;

            // 专辑分组标题
            if (track.album !== lastAlbum) {
                lastAlbum = track.album;
                var albumCover = track.cover || _defaultCover;
                html += '<div class="bgm-playlist-group">' +
                    '<img class="bgm-playlist-group-cover" src="' + albumCover + '" alt="" draggable="false" onerror="this.src=\'' + _defaultCover + '\'">' +
                    '<span class="bgm-playlist-group-name">' + _escHtml(track.album) + '</span>' +
                '</div>';
            }

            html += '<div class="bgm-playlist-item' + (isActive ? ' active' : '') + '" data-index="' + i + '">' +
                '<span class="bgm-item-index">' + (isActive && playing ? '♫' : (i + 1)) + '</span>' +
                '<span class="bgm-item-name">' + _escHtml(track.name) + '</span>' +
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

    /* ---------- 事件委托 ---------- */
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

        /* --- 进度条：点击 + 拖拽 seek --- */
        (function () {
            var bar = document.getElementById('bgmProgressBar');
            var dragging = false;

            function getSeekPct(e) {
                var rect = bar.getBoundingClientRect();
                var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
                return Math.max(0, Math.min(1, x / rect.width));
            }

            function formatTime(s) {
                if (isNaN(s) || !isFinite(s)) return '0:00';
                var m = Math.floor(s / 60);
                var sec = Math.floor(s % 60);
                return m + ':' + (sec < 10 ? '0' : '') + sec;
            }

            bar.addEventListener('click', function (e) {
                e.stopPropagation();
                var pct = getSeekPct(e);
                var targetTime = pct * BgmAudio.duration;
                console.log('[BGM] 进度条点击: ' + (pct * 100).toFixed(1) + '% → ' + formatTime(targetTime) + ' / ' + formatTime(BgmAudio.duration));
                callbacks.onSeek(pct);
            });

            // 鼠标拖拽
            bar.addEventListener('mousedown', function (e) {
                e.preventDefault();
                dragging = true;
                var pct = getSeekPct(e);
                var targetTime = pct * BgmAudio.duration;
                console.log('[BGM] 拖拽开始(鼠标): ' + (pct * 100).toFixed(1) + '% → ' + formatTime(targetTime));
                callbacks.onSeek(pct);
                document.addEventListener('mousemove', onDragMove);
                document.addEventListener('mouseup', onDragEnd);
            });

            // 触摸拖拽
            bar.addEventListener('touchstart', function (e) {
                dragging = true;
                var pct = getSeekPct(e);
                var targetTime = pct * BgmAudio.duration;
                console.log('[BGM] 拖拽开始(触摸): ' + (pct * 100).toFixed(1) + '% → ' + formatTime(targetTime));
                callbacks.onSeek(pct);
                document.addEventListener('touchmove', onDragMove, { passive: false });
                document.addEventListener('touchend', onDragEnd);
            }, { passive: true });

            var _logThrottle = 0;
            function onDragMove(e) {
                if (!dragging) return;
                e.preventDefault();
                var pct = getSeekPct(e);
                // 节流日志：每 200ms 最多输出一次
                var now = Date.now();
                if (now - _logThrottle > 200) {
                    var targetTime = pct * BgmAudio.duration;
                    console.log('[BGM] 拖拽中: ' + (pct * 100).toFixed(1) + '% → ' + formatTime(targetTime));
                    _logThrottle = now;
                }
                callbacks.onSeek(pct);
            }

            function onDragEnd() {
                var pct = getSeekPct({ clientX: 0 }); // 简化，实际值已在最后一次 onDragMove 中设置
                console.log('[BGM] 拖拽结束');
                dragging = false;
                document.removeEventListener('mousemove', onDragMove);
                document.removeEventListener('mouseup', onDragEnd);
                document.removeEventListener('touchmove', onDragMove);
                document.removeEventListener('touchend', onDragEnd);
            }
        })();

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

    function _escHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    return {
        create: create,
        updatePlayBtn: updatePlayBtn,
        updateCover: updateCover,
        updateTrackInfo: updateTrackInfo,
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
    function formatTime(s) {
        if (isNaN(s) || !isFinite(s)) return '0:00';
        var m = Math.floor(s / 60);
        var sec = Math.floor(s % 60);
        return m + ':' + (sec < 10 ? '0' : '') + sec;
    }

    function init() {
        /* 0. 读取配置：用户偏好(localStorage) > 站点默认(site-config.js) */
        function _cfg(key, fallback) {
            try { var v = localStorage.getItem('settings_' + key); return v !== null ? v === 'true' : fallback; }
            catch (_) { return fallback; }
        }
        var _bgmCfg = (window.SITE_CONFIG && window.SITE_CONFIG.bgm) || {};
        if (!_cfg('bgm_enabled', _bgmCfg.enabled !== false)) return;   // BGM 已禁用
        var autoPlay = _cfg('bgm_autoplay', _bgmCfg.autoPlay !== false);

        /* 1. 创建 DOM */
        BgmUI.create();

        /* 2. 绑定音频引擎回调 → UI 更新 */
        BgmAudio.on('stateChange', function (playing) {
            BgmUI.updatePlayBtn(playing);
            var track = BgmAudio.currentTrack();
            if (track) BgmUI.updateCover(track.cover, playing);
            BgmUI.renderPlaylist(BgmAudio.flatTracks, BgmAudio.index, playing);
        });
        BgmAudio.on('trackChange', function (i, track) {
            BgmUI.updateTrackInfo(track);
            BgmUI.updateCover(track.cover, BgmAudio.playing);
            BgmUI.renderPlaylist(BgmAudio.flatTracks, i, BgmAudio.playing);
        });
        BgmAudio.on('timeUpdate', function (cur, dur) {
            BgmUI.updateProgress(cur, dur);
        });
        BgmAudio._bindAudioEvents();

        /* 3. 绑定 UI 事件 → 音频引擎操作 */
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
                var targetTime = pct * BgmAudio.duration;
                var currentTime = BgmAudio.currentTime;
                console.log('[BGM] seek执行: ' + formatTime(currentTime) + ' → ' + formatTime(targetTime) + ' (差值: ' + (targetTime - currentTime > 0 ? '+' : '') + (targetTime - currentTime).toFixed(1) + 's)');
                BgmAudio.currentTime = targetTime;
            }
        });

        /* 4. 恢复状态 */
        var vol = BgmStore.getVolume();
        BgmAudio.setVolume(vol);
        BgmUI.setVolumeSlider(vol);
        BgmUI.setVolumeIcon(vol);

        /* 5. 加载清单 → 自动播放 */
        BgmAudio.loadManifest().then(function (tracks) {
            if (tracks.length === 0) return;

            var idx = BgmStore.getTrackIdx();
            if (idx >= tracks.length) idx = 0;

            // 预加载曲目（不播放）
            BgmAudio.load(idx, false);

            if (!autoPlay) return;   // autoPlay=false：仅预加载，不播放

            // === 自动播放策略 ===
            // 第1层：尝试有声播放（部分浏览器直接允许）
            // 第2层：注册交互监听，用户点击/滚动时解锁 + 播放
            var started = false;

            function startPlayback() {
                if (started) return;
                started = true;
                BgmAudio.unlockAudioContext();
                BgmAudio.unmuteIfAllowed();
                BgmAudio.play();
                var v = BgmAudio.getVolumePercent();
                BgmUI.setVolumeSlider(v);
                BgmUI.setVolumeIcon(v);
                removeInteractionListeners();
            }

            function onInteraction() {
                startPlayback();
            }

            function removeInteractionListeners() {
                document.removeEventListener('click',     onInteraction);
                document.removeEventListener('scroll',    onInteraction);
                document.removeEventListener('keydown',   onInteraction);
                document.removeEventListener('touchstart', onInteraction);
            }

            // 注册交互监听（始终注册，确保至少有一次能播放）
            document.addEventListener('click',     onInteraction);
            document.addEventListener('scroll',    onInteraction);
            document.addEventListener('keydown',   onInteraction);
            document.addEventListener('touchstart', onInteraction);

            // 同时尝试直接播放（如果浏览器允许，用户无需点击）
            BgmAudio.play();
        });
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
