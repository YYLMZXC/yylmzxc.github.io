#!/usr/bin/env node
/**
 * BGM 目录扫描器
 * 用法：node tools/bgm-scan.js
 *
 * 扫描 src/bgm/ 下所有子目录，自动生成 bgm-manifest.json
 * 每个子目录 = 一张专辑，目录内的图片文件自动识别为封面
 *
 * 目录结构约定：
 *   src/bgm/
 *   ├── AlbumName/
 *   │   ├── cover.jpg      ← 封面（支持 jpg/png/webp/gif）
 *   │   ├── 01.歌曲名.mp3
 *   │   └── 02.歌曲名.wav
 *   └── AnotherAlbum/
 *       └── ...
 */
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, extname, relative, posix } from 'node:path';

const BGM_ROOT = join(import.meta.dirname, '..', 'bgm');
const AUDIO_EXTS = new Set(['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.wma']);
const COVER_NAMES = new Set([
    'cover', 'main', 'album', 'artwork', 'front', 'poster', 'thumb'
]);
const COVER_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);

function isCoverFile(name) {
    const base = extname(name).toLowerCase();
    const stem = name.slice(0, name.length - base.length).toLowerCase();
    return COVER_EXTS.has(base) && COVER_NAMES.has(stem);
}

function stripAudioExt(name) {
    const ext = extname(name).toLowerCase();
    return AUDIO_EXTS.has(ext) ? name.slice(0, name.length - ext.length) : null;
}

function scanDir(dir) {
    const entries = readdirSync(dir, { withFileTypes: true });
    const folders = [];
    const rootTracks = [];

    for (const entry of entries) {
        if (entry.isDirectory()) {
            folders.push(entry.name);
        } else if (AUDIO_EXTS.has(extname(entry.name).toLowerCase())) {
            rootTracks.push(entry.name);
        }
    }

    const albums = [];

    // 扫描子目录（每张专辑）
    for (const folder of folders) {
        const folderPath = join(dir, folder);
        const files = readdirSync(folderPath);
        let cover = '';
        const tracks = [];

        for (const file of files) {
            if (isCoverFile(file)) {
                cover = file;
            } else if (stripAudioExt(file) !== null) {
                tracks.push(file);
            }
        }

        // 按文件名排序（支持数字前缀排序）
        tracks.sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }));

        albums.push({
            name: folder,
            cover: cover ? `./bgm/${folder}/${cover}` : '',
            tracks: tracks.map(f => ({
                src: `./bgm/${folder}/${f}`,
                name: stripAudioExt(f)
            }))
        });
    }

    // 按目录名排序
    albums.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

    // 根目录散曲（如果有）
    if (rootTracks.length > 0) {
        rootTracks.sort((a, b) => a.localeCompare(b, 'zh-CN', { numeric: true }));
        albums.unshift({
            name: '其他',
            cover: '',
            tracks: rootTracks.map(f => ({
                src: `./bgm/${f}`,
                name: stripAudioExt(f)
            }))
        });
    }

    return albums;
}

const manifest = scanDir(BGM_ROOT);
const outPath = join(BGM_ROOT, 'bgm-manifest.json');
writeFileSync(outPath, JSON.stringify(manifest, null, 2), 'utf-8');

let totalTracks = 0;
for (const album of manifest) {
    totalTracks += album.tracks.length;
    console.log(`📀 ${album.name} (${album.tracks.length} 首)${album.cover ? ' 🎨' : ''}`);
}
console.log(`\n✅ 已生成 bgm-manifest.json — ${manifest.length} 张专辑, ${totalTracks} 首歌曲`);
