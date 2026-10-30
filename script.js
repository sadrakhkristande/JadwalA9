// ==========================================================================
// PORTAL AKADEMIK A9 - SATU FILE (script.js + tambahan-v2.js + desain v3 + tutorial per blok + tema klasik)
// Urutan: inti portal -> tampilan dasar & fitur kecil -> navigasi/panduan/laporan
//         -> CBT/progres/Drive -> jadwal/folder/progres admin -> OSCE/admin -> desain v3
// ==========================================================================

// ==========================================================================
// BAGIAN 1 - INTI PORTAL
// ==========================================================================
const allowedUsers = {
    "21105032610023": "ALICA MARATU SULHA", "21105032610047": "AYESHA LILIAN PUTRI",
    "21105032610049": "AYSAR HAMMAM IBRAHIM", "21105032610087": "FATHURAHMAN NUR AZIZ DENIRA",
    "21105032610089": "FATIKHATUNNISA ALYA FAHIRA", "21105032610125": "KEYSHA AURELL ANINDIKAZZAHRA",
    "21105032610149": "MUHAMMAD FIKRI HIDAYATULLOH", "21105032610171": "NATHANIA MENGDA JAMIPUTRI",
    "21105032610201": "RAFIDA HAMIDAH PUTRI", "21105032610227": "SADRAKH KRISTANDE GWIHARTO",
    "21105032610239": "SHERILLA AUDREY NASYWA", "21105032610191": "KAORI"
};

let currentUser = null;
const INACTIVITY_LIMIT = 30 * 60 * 1000;

const SUPABASE_URL = "https://vqzklxbfrvmvcoeykias.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_-NTQ0VL2xQmIYJ_ieREXkg_WUcU3L0t";

// URL Web App Google Apps Script milik kelompok.a9.2026@gmail.com (lihat drive-uploader.gs dan langkah pasang).
// Kalau masih kosong, unggahan memakai penyimpanan Supabase seperti sebelumnya.
const DRIVE_UPLOAD_URL = 'https://script.google.com/macros/s/AKfycbxkCOOQGt9BqzMvBFeewZqoTlOngiUZUN4Jq-bOxSHH3NZPAEcByR7QYpH7eeCtKHai/exec';

let supabaseClient = null;
try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch (err) { console.error('Supabase error:', err); }

let dbData = {
    pengumuman: [], reminder: [], jadwalUpdates: [], tugas: [], laboratorium: [],
    skills_lab: [], tutorial: [], materi: [], jadwalCustom: [], soal: [], cbt_soal: [],
    maintenance: false, globalAnnouncement: '', adminCode: 'A9ACOR', theme: 'light'
};

// Bersihkan sisa sitasi seperti "[cite: 1]" dari teks yang ditampilkan
function cleanText(t) {
    return String(t == null ? '' : t).replace(/\s*\[cite:[^\]]*\]/g, '');
}

// ==========================================================================
// INISIALISASI & LOGIN
// ==========================================================================
let dbReady = Promise.resolve();

// Tema disimpan per perangkat (bukan global), supaya mahasiswa tidak menimpa pengaturan admin
const myTheme = () => { try { return localStorage.getItem('a9_theme'); } catch (e) { return null; } };

window.addEventListener('DOMContentLoaded', async () => {
    const loadP = fetchDatabaseFromCloud();   // data tersimpan tampil dulu, data terbaru menyusul
    dbReady = loadP;
    applyTheme(myTheme() || dbData.theme || 'light');
    loadP.then(() => applyTheme(myTheme() || dbData.theme || 'light'));

    const nimInput = document.getElementById('login-nim-input');
    const adminInput = document.getElementById('login-admin-code');
    if (nimInput) nimInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleLogin(); });
    if (adminInput) adminInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleLogin(); });

    const savedUser = sessionStorage.getItem('portal_current_user');
    const lastActive = sessionStorage.getItem('portal_last_active');
    if (savedUser && lastActive && (Date.now() - parseInt(lastActive) < INACTIVITY_LIMIT)) {
        try { currentUser = JSON.parse(savedUser); finishLogin(); } catch (e) { sessionStorage.clear(); }
    }
});

const CACHE_KEY = 'a9_cache_v1';

function applyKey(k, v) {
    if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { console.error('JSON "' + k + '" rusak:', e); } }
    if (k === 'config') {
        v = v || {};
        dbData.maintenance = v.maintenance || false;
        dbData.theme = v.theme || 'light';
        dbData.globalAnnouncement = v.globalAnnouncement || '';
        dbData.adminCode = v.adminCode || dbData.adminCode || 'A9ACOR';
    } else if (k === 'jadwal') {
        dbData.jadwalCustom = Array.isArray(v) ? v : (v && Array.isArray(v.jadwal) ? v.jadwal : []);
    } else {
        dbData[k] = v || [];
    }
}

async function fetchDatabaseFromCloud() {
    // 1) Tampilkan data tersimpan lebih dulu supaya portal terasa instan
    try {
        const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
        if (c) { Object.keys(c).forEach(k => applyKey(k, c[k])); renderAll(); }
    } catch (e) { }
    // 2) Ambil data terbaru dari server secara paralel
    try {
        if (supabaseClient) {
            const keys = ['pengumuman', 'reminder', 'jadwalUpdates', 'tugas', 'laboratorium', 'skills_lab', 'tutorial', 'materi', 'jadwal', 'soal', 'config', 'cbt_soal'];
            const results = await Promise.all(keys.map(k =>
                supabaseClient.from('portal_db').select('value').eq('key', k).maybeSingle()
                    .then(r => [k, r]).catch(() => [k, null])));
            // Mulai dari cache lama supaya key yang gagal diambil tidak hilang dari cache
            let cache = {};
            try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') || {}; } catch (e) { }
            results.forEach(([k, r]) => {
                if (r && !r.error && r.data && r.data.value) {
                    applyKey(k, r.data.value);
                    if (k === 'config') {
                        const v = typeof r.data.value === 'string' ? JSON.parse(r.data.value) : r.data.value;
                        cache.config = { maintenance: v.maintenance, theme: v.theme, globalAnnouncement: v.globalAnnouncement };
                    } else cache[k] = r.data.value;
                }
            });
            try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (e) { }
        }
    } catch (err) { console.error("Gagal memuat Supabase:", err); }

    if (!Array.isArray(dbData.soal) || dbData.soal.length === 0) {
        dbData.soal = [{ id: 1, category: "anatomi", question: "Sebutkan tulang selangka?", answer: "Clavicula", explanation: "Tulang penghubung sternum dan scapula." }];
    }
    if (!Array.isArray(dbData.cbt_soal)) dbData.cbt_soal = [];
    renderAll();
}

// Mengembalikan true bila tersimpan, false bila gagal (dan memberi tahu pengguna)
async function saveCategoryData(categoryKey) {
    renderAll();
    if (!supabaseClient) { alert('Server belum terhubung. Perubahan belum tersimpan.'); return false; }
    try {
        let payload = dbData[categoryKey];
        if (categoryKey === 'config') {
            payload = { maintenance: dbData.maintenance, theme: dbData.theme, globalAnnouncement: dbData.globalAnnouncement, adminCode: dbData.adminCode };
        } else if (categoryKey === 'jadwal') {
            payload = dbData.jadwalCustom;
        }
        // upsert: baris dibuat otomatis kalau belum ada
        const { error } = await supabaseClient.from('portal_db').upsert({ key: categoryKey, value: payload }, { onConflict: 'key' });
        if (error) throw error;
        // Cek ulang: pastikan server benar-benar menyimpan (izin tabel yang salah kadang tidak memberi error)
        if (Array.isArray(payload)) {
            const chk = await supabaseClient.from('portal_db').select('value').eq('key', categoryKey).maybeSingle();
            let sv = chk && chk.data && chk.data.value;
            if (typeof sv === 'string') { try { sv = JSON.parse(sv); } catch (e) { sv = null; } }
            if (!chk.error && Array.isArray(sv) && sv.length !== payload.length) {
                alert('Server tidak menerima perubahan (data di server masih ' + sv.length + ' item, seharusnya ' + payload.length + '). Cek izin (policy) tabel portal_db di Supabase.');
                return false;
            }
        }
        // Samakan cache lokal supaya data lama tidak muncul lagi saat server lambat
        try {
            const c = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') || {};
            if (categoryKey === 'config') c.config = { maintenance: payload.maintenance, theme: payload.theme, globalAnnouncement: payload.globalAnnouncement };
            else c[categoryKey] = payload;
            localStorage.setItem(CACHE_KEY, JSON.stringify(c));
        } catch (e) { }
        return true;
    } catch (err) {
        console.error(`Gagal simpan ${categoryKey}:`, err);
        alert('Gagal menyimpan ke server. Cek koneksi lalu coba lagi.');
        return false;
    }
}

// ==========================================================================
// UTILITAS: dialog, status sibuk, tanggal, pengumuman otomatis, unggah file
// ==========================================================================
function askDialog(title, fields, okText) {
    return new Promise(resolve => {
        const h = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        const ov = document.createElement('div'); ov.className = 'fd-ov';
        const lists = [];
        const body = fields.map(f => {
            if (f.type === 'note') return `<p class="hint">${h(f.text)}</p>`;
            if (f.type === 'select') return `<div class="form-group"><label>${h(f.label)}</label><select class="modern-input" data-k="${f.id}">${f.options.map(o => `<option value="${h(o.v)}"${o.v === f.value ? ' selected' : ''}>${h(o.t)}</option>`).join('')}</select></div>`;
            if (f.type === 'textarea') return `<div class="form-group"><label>${h(f.label)}</label><textarea class="modern-input" data-k="${f.id}" style="height:120px;" placeholder="${h(f.placeholder || '')}">${h(f.value || '')}</textarea></div>`;
            const lid = f.list && f.list.length ? 'dl-' + f.id : '';
            if (lid) lists.push(`<datalist id="${lid}">${f.list.map(o => `<option value="${h(o)}">`).join('')}</datalist>`);
            return `<div class="form-group"><label>${h(f.label)}</label><input class="modern-input" data-k="${f.id}" type="${f.type || 'text'}"${f.multiple ? ' multiple' : ''}${f.type === 'file' ? '' : ` value="${h(f.value || '')}"`} placeholder="${h(f.placeholder || '')}"${lid ? ` list="${lid}"` : ''}></div>`;
        }).join('');
        ov.innerHTML = `<div class="fd-modal" role="dialog" aria-modal="true" aria-label="${h(title)}"><h3>${h(title)}</h3>${body}${lists.join('')}` +
            `<div class="fd-modal-acts"><button type="button" class="btn btn-outline" data-x>Batal</button><button type="button" class="btn btn-primary" data-ok>${h(okText || 'Simpan')}</button></div></div>`;
        const collect = () => { const o = {}; ov.querySelectorAll('[data-k]').forEach(el => { o[el.dataset.k] = el.type === 'file' ? (el.multiple ? Array.from(el.files) : (el.files[0] || null)) : el.value; }); return o; };
        const close = v => { document.removeEventListener('keydown', onKey, true); ov.remove(); resolve(v); };
        const onKey = e => {
            if (e.key === 'Escape') { e.stopPropagation(); close(null); }
            else if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && ov.contains(e.target)) { e.preventDefault(); close(collect()); }
        };
        ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-x]')) close(null); else if (e.target.closest('[data-ok]')) close(collect()); });
        document.addEventListener('keydown', onKey, true);
        document.body.appendChild(ov);
        const first = ov.querySelector('[data-k]'); if (first) { first.focus(); if (first.select && first.type !== 'file') first.select(); }
    });
}

// Pesan "sedang bekerja" yang tetap tampil sampai fungsi pengembaliannya dipanggil
function busy(msg) {
    const wrap = document.getElementById('toast-wrap') || document.body;
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; wrap.appendChild(t);
    return () => t.remove();
}

// Panggil Supabase Edge Function dan tampilkan alasan gagal yang sebenarnya (bukan hanya "non-2xx")
async function invokeEdge(name, body) {
    if (!supabaseClient) throw new Error('Server belum terhubung.');
    const { data, error } = await supabaseClient.functions.invoke(name, { body });
    if (!error) {
        if (data && typeof data === 'object' && data.error) throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
        return data;
    }
    let status = 0, detail = '';
    try {
        const res = error.context;
        if (res && typeof res.status === 'number') {
            status = res.status;
            const txt = await res.text();
            try { const j = JSON.parse(txt); detail = j.error || j.message || j.msg || txt; } catch (e) { detail = txt; }
            if (typeof detail !== 'string') detail = JSON.stringify(detail);
        }
    } catch (e) { }
    let hint = '';
    if (status === 404) hint = ' \u2014 fungsi "' + name + '" belum di-deploy atau namanya berbeda';
    else if (status === 401 || /jwt/i.test(detail)) hint = ' \u2014 matikan "Verify JWT" pada fungsi "' + name + '" (portal memakai kunci sb_publishable)';
    else if (!status) hint = ' \u2014 permintaan tidak sampai ke fungsi: cek nama fungsi, deploy, dan CORS';
    const e2 = new Error('[' + name + (status ? ' ' + status : '') + '] ' + String(detail || error.message || 'gagal').slice(0, 300) + hint);
    e2.status = status; throw e2;
}

const isoLocal = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
function tglIndo(iso) {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return String(iso || '');
    return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// Setiap pembaruan penting otomatis masuk ke Pengumuman (hanya admin yang memicu).
// opt: { until:'YYYY-MM-DD' | days, key, merge(n) }. Dengan "key", beberapa pembaruan sejenis dalam 30 menit digabung.
function postUpdate(kind, judul, isi, opt) {
    opt = opt || {};
    if (!currentUser || currentUser.role !== 'admin') return Promise.resolve(false);
    const now = Date.now();
    let until = opt.until;
    if (!until) { const d = new Date(); d.setDate(d.getDate() + (opt.days || 7)); until = isoLocal(d); }
    if (!Array.isArray(dbData.pengumuman)) dbData.pengumuman = [];
    if (opt.key) {
        const ex = dbData.pengumuman.find(p => p.auto && p.key === opt.key && now - (p.ts || 0) < 30 * 60000);
        if (ex) {
            ex.n = (ex.n || 1) + 1; if (opt.merge) ex.isi = opt.merge(ex.n);
            ex.ts = now; ex.tgl = new Date(now).toISOString(); ex.deadline = until;
            return saveCategoryData('pengumuman');
        }
    }
    dbData.pengumuman.unshift({ id: now, kind: kind || 'info', auto: true, key: opt.key || null, n: 1, ts: now, tgl: new Date(now).toISOString(), judul, isi, deadline: until });
    return saveCategoryData('pengumuman');
}

// Unggah ke Google Drive kelompok (lewat Apps Script). Mengembalikan tautan file, atau null bila gagal.
const DRIVE_SMALL = 20 * 1024 * 1024;   // sampai sini: dikirim sekali lewat Apps Script
const DRIVE_MAX = 200 * 1024 * 1024;    // di atas DRIVE_SMALL: dikirim per potongan langsung ke Google Drive
async function uploadToDrive(file, path) {
    if (file.size > DRIVE_MAX) { alert('File ' + file.name + ' lebih dari 200 MB. Unggah manual ke Drive lalu tempel tautannya.'); return null; }
    let key = '';
    try { key = localStorage.getItem('a9_drive_key') || ''; } catch (e) { }
    if (!key) {
        const r = await askDialog('Kunci unggah ke Drive', [
            { type: 'note', text: 'Masukkan kunci unggah (UPLOAD_KEY) yang kamu atur di Apps Script. Cukup sekali di perangkat ini.' },
            { id: 'k', label: 'Kunci unggah', type: 'password' }], 'Simpan');
        if (!r || !r.k.trim()) return null;
        key = r.k.trim();
        try { localStorage.setItem('a9_drive_key', key); } catch (e) { }
    }
    if (file.size > DRIVE_SMALL) return await uploadDriveBesar(file, path, key);
    const done = busy('Mengunggah ' + file.name + ' ke Drive...');
    try {
        const data = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = rej; fr.readAsDataURL(file); });
        const r = await fetch(DRIVE_UPLOAD_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ key, name: file.name, mime: file.type, path, data }) });
        const j = await r.json();
        if (!j.ok) { if (/kunci/i.test(j.error || '')) { try { localStorage.removeItem('a9_drive_key'); } catch (e) { } } throw new Error(j.error || 'tidak diketahui'); }
        return j.url;
    } catch (e) {
        console.error(e); alert('Unggah ke Drive gagal: ' + (e.message || e)); return null;
    } finally { done(); }
}

// File besar (20-200 MB): Apps Script hanya menyiapkan sesi unggah, lalu browser mengirim file per potongan langsung ke Google
function putChunk(url, blob, start, end, total) {
    return new Promise((resolve, reject) => {
        let tries = 0;
        const retry = why => { if (++tries >= 4) reject(new Error('Gagal mengirim potongan file (' + why + ')')); else setTimeout(go, 1500 * tries); };
        function go() {
            const x = new XMLHttpRequest();
            x.open('PUT', url);
            x.setRequestHeader('Content-Range', 'bytes ' + start + '-' + end + '/' + total);
            x.onload = () => {
                if (x.status === 308) return resolve(null);                       // potongan diterima, lanjut
                if (x.status >= 200 && x.status < 300) { let j = null; try { j = JSON.parse(x.responseText); } catch (e) { } return resolve(j); }
                retry('HTTP ' + x.status + ' ' + String(x.responseText || '').slice(0, 120));
            };
            x.onerror = () => retry('jaringan putus atau diblokir');
            x.send(blob);
        }
        go();
    });
}
async function uploadDriveBesar(file, path, key) {
    const wrap = document.getElementById('toast-wrap') || document.body;
    const tt = document.createElement('div'); tt.className = 'toast'; wrap.appendChild(tt);
    const say = p => { tt.textContent = 'Mengunggah ' + file.name + ' ke Drive... ' + p + '%'; };
    say(0);
    const call = async payload => {
        const r = await fetch(DRIVE_UPLOAD_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ key }, payload)) });
        const j = await r.json();
        if (!j.ok) { if (/kunci/i.test(j.error || '')) { try { localStorage.removeItem('a9_drive_key'); } catch (e) { } } throw new Error(j.error || 'tidak diketahui'); }
        return j;
    };
    try {
        const mime = file.type || 'application/octet-stream';
        const s0 = await call({ action: 'mulaiUnggah', name: file.name, mime, size: file.size, path, origin: location.origin });
        const CH = 8 * 1024 * 1024;                       // kelipatan 256 KB, syarat Google
        let off = 0, last = null;
        while (off < file.size) {
            const end = Math.min(off + CH, file.size);
            last = await putChunk(s0.sessionUrl, file.slice(off, end), off, end - 1, file.size);
            off = end; say(Math.floor(off * 100 / file.size));
        }
        if (!last || !last.id) throw new Error('Google tidak mengembalikan ID berkas');
        const s1 = await call({ action: 'selesaiUnggah', id: last.id });
        return s1.url;
    } catch (e) {
        console.error(e);
        alert('Unggah file besar ke Drive gagal: ' + (e.message || e) + '\n\nKalau pesannya menyebut aksi tidak dikenal atau izin, pasang code.gs versi 7 dan deploy versi baru. Atau unggah manual ke Drive lalu tempel tautannya.');
        return null;
    } finally { tt.remove(); }
}

// Satu pintu unggah: Drive bila sudah diatur, selain itu Supabase Storage
async function uploadFileObj(file, path) {
    if (!file) return null;
    if (DRIVE_UPLOAD_URL) return await uploadToDrive(file, path || 'Umum');
    if (file.size > 50 * 1024 * 1024) { alert('File melebihi 50 MB. Gunakan link Google Drive.'); return null; }
    if (!supabaseClient) { alert('Server belum terhubung.'); return null; }
    const done = busy('Mengunggah ' + file.name + '...');
    try {
        // Hanya huruf, angka, titik, minus, dan garis bawah (Supabase menolak karakter lain)
        const filePath = `uploads/${Date.now()}_${file.name.replace(/[^\w.\-]+/g, '_')}`;
        const { error } = await supabaseClient.storage.from('portal-files').upload(filePath, file);
        if (error) throw error;
        return supabaseClient.storage.from('portal-files').getPublicUrl(filePath).data.publicUrl;
    } catch (err) { console.error(err); alert('Upload gagal. Coba lagi atau pakai link Google Drive.'); return null; }
    finally { done(); }
}

async function uploadFileToSupabaseStorage(fileInputId, path) {
    const input = document.getElementById(fileInputId);
    if (!input || !input.files || input.files.length === 0) return null;
    return await uploadFileObj(input.files[0], path);
}

// ===== Hapus berkas dari penyimpanannya (Google Drive via Apps Script, atau Supabase Storage) =====
function driveIdOf(u) {
    const m = String(u || '').match(/drive\.google\.com\/file\/d\/([\w-]+)/) || String(u || '').match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([\w-]+)/);
    return m ? m[1] : null;
}
const linkInUse = url => ['tugas', 'materi', 'laboratorium', 'skills_lab', 'tutorial'].some(k => (dbData[k] || []).some(it => it && it.link === url));

async function deleteStoredFile(url) {
    url = String(url || '');
    const id = driveIdOf(url);
    if (id) {
        if (!DRIVE_UPLOAD_URL) return { ok: false, why: 'DRIVE_UPLOAD_URL belum diisi' };
        let key = ''; try { key = localStorage.getItem('a9_drive_key') || ''; } catch (e) { }
        if (!key) {
            const r = await askDialog('Kunci unggah ke Drive', [
                { type: 'note', text: 'Masukkan UPLOAD_KEY dari Apps Script untuk menghapus berkas di Drive. Cukup sekali di perangkat ini.' },
                { id: 'k', label: 'Kunci unggah', type: 'password' }], 'Simpan');
            if (!r || !r.k.trim()) return { ok: false, why: 'kunci tidak diisi' };
            key = r.k.trim(); try { localStorage.setItem('a9_drive_key', key); } catch (e) { }
        }
        try {
            const r = await fetch(DRIVE_UPLOAD_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ key, action: 'delete', id }) });
            const j = await r.json();
            if (!j.ok) { if (/kunci/i.test(j.error || '')) { try { localStorage.removeItem('a9_drive_key'); } catch (e) { } } return { ok: false, why: j.error || 'gagal' }; }
            return { ok: true };
        } catch (e) { return { ok: false, why: e.message || 'koneksi gagal' }; }
    }
    const m = url.match(/\/storage\/v1\/object\/public\/portal-files\/([^?#]+)/);
    if (m && supabaseClient) {
        const { error } = await supabaseClient.storage.from('portal-files').remove([decodeURIComponent(m[1])]);
        return error ? { ok: false, why: error.message } : { ok: true };
    }
    return { ok: true, skipped: true };   // tautan luar (YouTube, folder, dll.) tidak dihapus
}

// Mengembalikan kalimat tambahan untuk notifikasi. Tidak menghapus bila berkas masih dipakai data lain.
async function purgeFileOf(it) {
    const url = it && typeof it === 'object' ? it.link : '';
    if (!url || url === '#' || linkInUse(url)) return '';
    const done = busy('Menghapus berkas...');
    try {
        const r = await deleteStoredFile(url);
        return r.ok ? (r.skipped ? '' : ' Berkasnya ikut terhapus.') : ' Data terhapus, tapi berkas belum terhapus dari penyimpanan (' + r.why + ').';
    } finally { done(); }
}

window.handleLogin = async function () {
    // Tunggu data terbaru (maintenance, kode admin) sebentar, tapi jangan membuat pengguna menunggu lama
    try { await Promise.race([dbReady, new Promise(r => setTimeout(r, 1500))]); } catch (e) { }
    try {
        const role = document.getElementById('login-role').value;
        if (role === 'admin') {
            const code = document.getElementById('login-admin-code').value.trim();
            if (code === (dbData.adminCode || 'A9ACOR')) {
                currentUser = { role: 'admin', name: 'Admin Utama' };
                finishLogin();
            } else { alert('Kode Admin Salah!'); }
        } else {
            if (dbData.maintenance) { alert('\u26a0\ufe0f PORTAL SEDANG MAINTENANCE.'); return; }
            const nim = document.getElementById('login-nim-input').value.trim();
            if (allowedUsers[nim]) {
                currentUser = { role: 'guest', name: allowedUsers[nim], nim: nim };
                finishLogin();
            } else { alert('Nomor Identitas tidak terdaftar!'); }
        }
    } catch (error) { alert("Error sistem login: " + error.message); }
};

function finishLogin() {
    sessionStorage.setItem('portal_current_user', JSON.stringify(currentUser));
    sessionStorage.setItem('portal_last_active', Date.now().toString());

    document.getElementById('login-page').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    document.getElementById('user-info').innerText = `${currentUser.name} (${currentUser.role === 'admin' ? 'Admin' : 'Mahasiswa'})`;

    if (currentUser.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'inline-block');
        document.querySelectorAll('.admin-form-box').forEach(el => el.style.display = 'block');
    } else {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.admin-form-box').forEach(el => el.style.display = 'none');
    }
    renderAll();
    setupInactivityTracker();
    startClock();
}

window.handleLogout = function () { sessionStorage.clear(); location.reload(); };

let inactivityReady = false, sessionEnding = false;
function setupInactivityTracker() {
    if (inactivityReady) return;
    inactivityReady = true;
    // Menulis ke sessionStorage di setiap gerakan mouse/ketukan membuat mengetik tersendat,
    // jadi cukup catat paling sering sekali per 15 detik.
    let lastWrite = 0;
    const update = () => {
        if (!currentUser) return;
        const n = Date.now();
        if (n - lastWrite < 15000) return;
        lastWrite = n;
        sessionStorage.setItem('portal_last_active', n.toString());
    };
    ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'].forEach(ev => window.addEventListener(ev, update, { passive: true }));
    setInterval(() => {
        const lastActive = sessionStorage.getItem('portal_last_active');
        if (currentUser && !sessionEnding && lastActive && (Date.now() - parseInt(lastActive) > INACTIVITY_LIMIT)) {
            sessionEnding = true;
            alert('Sesi berakhir karena tidak ada aktivitas.');
            setTimeout(handleLogout, 1500);   // beri waktu pesan terbaca sebelum halaman dimuat ulang
        }
    }, 60000);
}

let clockOn = false;
function startClock() {
    if (clockOn) return;
    clockOn = true;
    const tickClock = () => {
        const el = document.getElementById('wib-clock');
        if (el) el.innerText = `${new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', weekday: 'short', day: 'numeric', month: 'short' })}`;
    };
    tickClock();
    setInterval(tickClock, 15000);
}

// ==========================================================================
// PENGATURAN CBT (dipakai oleh modul CBT di bagian bawah)
// ==========================================================================
let cbtTimeInSeconds = 0, cbtStarted = false;
let cbtMode = 'practice';
const EXAM_DURATION = 100 * 60; // 100 menit

function cbtFormatTime(total) {
    if (total < 0) total = 0;
    const h = String(Math.floor(total / 3600)).padStart(2, '0');
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

// ==========================================================================
// FUNGSI UI, TAB, & FITUR HAPUS (ADMIN)
// ==========================================================================
window.switchTab = function (tab, btn) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-pill').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(`tab-${tab}`);
    if (target) target.style.display = 'block';
    if (btn) btn.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.toggleLoginFields = function () {
    const role = document.getElementById('login-role').value;
    document.getElementById('guest-fields').style.display = role === 'guest' ? 'block' : 'none';
    document.getElementById('admin-fields').style.display = role === 'admin' ? 'block' : 'none';
};

window.closeModal = function (id) { document.getElementById(id).style.display = 'none'; };

function applyTheme(theme) {
    const dark = theme === 'dark';
    document.body.classList.toggle('theme-dark', dark);
    let m = document.querySelector('meta[name="theme-color"]');
    if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
    m.content = dark ? '#16120d' : '#efe6d2';
}

// Tema hanya mengubah tampilan di perangkat ini, tidak menulis ke database
window.toggleThemeSwitch = function () {
    const next = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
    try { localStorage.setItem('a9_theme', next); } catch (e) { }
    applyTheme(next);
};

// FITUR HAPUS (ADMIN): berkas yang diunggah lewat portal ikut terhapus
window.deleteItem = async function (category, index) {
    if (!confirm('Hapus data ini secara permanen? Berkas yang diunggah lewat portal (Google Drive / penyimpanan portal) ikut dihapus.')) return;
    if (!Array.isArray(dbData[category])) return;
    const item = dbData[category][index];
    dbData[category].splice(index, 1);
    if (!(await saveCategoryData(category))) { dbData[category].splice(index, 0, item); renderAll(); return; }
    alert('Data berhasil dihapus.' + await purgeFileOf(item));
};

function applyBanners() {
    const mb = document.getElementById('maintenance-banner');
    if (mb) mb.style.display = dbData.maintenance ? 'block' : 'none';
    const gb = document.getElementById('global-announcement-banner');
    const gt = document.getElementById('global-announcement-text');
    if (gb && gt) {
        gt.innerText = dbData.globalAnnouncement || '';
        gb.style.display = dbData.globalAnnouncement ? 'block' : 'none';
    }
}

const escH = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ANN_TAG = { info: '\ud83d\udce2 Pengumuman', tugas: '\ud83d\udcdd Tugas', materi: '\ud83d\udcda Materi', file: '\ud83d\udcda Berkas baru', jadwal: '\ud83d\uddd3\ufe0f Jadwal', ujian: '\ud83d\udccc Ujian / Kegiatan', penting: '\u26a0\ufe0f Penting' };

function renderAll() {
    const isAdmin = currentUser && currentUser.role === 'admin';
    applyBanners();

    // Render Pengumuman
    const pList = document.getElementById('pengumuman-list');
    if (pList) pList.innerHTML = dbData.pengumuman.length === 0 ? '<p style="color:var(--text-muted);">Belum ada pengumuman.</p>' : dbData.pengumuman.map((p, idx) => `
        <div style="background:var(--bg-base); border-radius:var(--radius-md); padding:20px; margin-bottom:15px; border-left:4px solid var(--primary); position: relative;">
            <small style="display:block; color:var(--text-muted); margin-bottom:4px;">${ANN_TAG[p.kind] || ANN_TAG.info}${p.tgl ? ' \u00b7 ' + new Date(p.tgl).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}</small>
            <h4 style="margin-bottom:8px; color:var(--text-main); font-size:16px; padding-right: 80px;">${escH(p.judul)}</h4>
            <p style="font-size:14px; color:var(--text-muted); margin-bottom:12px; white-space:pre-line;">${escH(p.isi)}</p>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <small style="color:var(--primary); font-weight:600;">\ud83d\uddd3\ufe0f s/d ${p.deadline}</small>
                <a href="https://wa.me/?text=${encodeURIComponent(p.judul + ' - ' + p.isi)}" target="_blank" class="badge badge-wa">Bagikan</a>
            </div>
            ${isAdmin ? `<button class="btn btn-danger btn-sm" style="position: absolute; top: 15px; right: 15px;" onclick="deleteItem('pengumuman', ${idx})">Hapus</button>` : ''}
        </div>
    `).join('');

    // Render Tugas
    const tBody = document.getElementById('tugas-table-body');
    if (tBody) tBody.innerHTML = dbData.tugas.map((t, idx) => `
        <tr>
            <td data-label="Tugas"><strong>${t.nama}</strong></td>
            <td data-label="Deadline">${t.deadline}</td>
            <td data-label="Berkas">${t.link !== '#' ? `<a href="${t.link}" target="_blank" class="btn btn-sm btn-primary">Lihat</a>` : '-'}</td>
            ${isAdmin ? `<td class="admin-only" data-label="Aksi"><button class="btn btn-danger btn-sm" onclick="deleteItem('tugas', ${idx})">Hapus</button></td>` : ''}
        </tr>
    `).join('');

    // Render Materi
    const mBody = document.getElementById('materi-table-body');
    if (mBody) mBody.innerHTML = dbData.materi.map((m, idx) => `
        <tr>
            <td data-label="Mata Kuliah"><strong>${m.kuliah}</strong></td>
            <td data-label="Topik">${m.materi}</td>
            <td data-label="Akses"><a href="${m.link}" target="_blank" class="btn btn-sm btn-outline">Buka</a></td>
            ${isAdmin ? `<td class="admin-only" data-label="Aksi"><button class="btn btn-danger btn-sm" onclick="deleteItem('materi', ${idx})">Hapus</button></td>` : ''}
        </tr>
    `).join('');

    // Render Lab, Skills, Tutorial
    ['laboratorium', 'skills_lab', 'tutorial'].forEach(cat => {
        const el = document.getElementById(cat === 'laboratorium' ? 'lab-list' : cat === 'skills_lab' ? 'skills-list' : 'tutorial-list');
        if (el) {
            el.innerHTML = dbData[cat].map((item, idx) => `
                <div style="background: var(--bg-base); border: 1px solid var(--border-color); padding: 15px; border-radius: var(--radius-md); position: relative;">
                    <h4 style="color: var(--text-main); margin-bottom: 5px; padding-right: 60px;">${item.nama}</h4>
                    <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 10px;">Modul: ${item.skenario || '-'}</p>
                    ${item.link !== '#' ? `<a href="${item.link}" target="_blank" class="btn btn-sm btn-primary">Buka Berkas</a>` : ''}
                    ${isAdmin ? `<button class="btn btn-danger btn-sm" style="position: absolute; top: 10px; right: 10px;" onclick="deleteItem('${cat}', ${idx})">Hapus</button>` : ''}
                </div>
            `).join('');
        }
    });

    // Render Reminder & Jadwal Updates
    const remList = document.getElementById('reminder-list');
    if (remList) remList.innerHTML = dbData.reminder.map((r, idx) => `
        <li><span>${r}</span> ${isAdmin ? `<button class="btn btn-danger btn-sm" onclick="deleteItem('reminder', ${idx})">Hapus</button>` : ''}</li>
    `).join('');

    const upList = document.getElementById('jadwal-update-list');
    if (upList) upList.innerHTML = dbData.jadwalUpdates.map((u, idx) => `
        <li><span>${u}</span> ${isAdmin ? `<button class="btn btn-danger btn-sm" onclick="deleteItem('jadwalUpdates', ${idx})">Hapus</button>` : ''}</li>
    `).join('');
}

// ==========================================================================
// FORM ADMIN
// ==========================================================================
window.addPengumuman = async function () {
    const judul = document.getElementById('p-judul').value;
    const isi = document.getElementById('p-isi').value;
    const deadline = document.getElementById('p-deadline').value;
    if (!judul || !isi || !deadline) return alert('Semua kolom wajib diisi!');
    const kind = document.getElementById('p-judul').dataset.kind || 'info';
    dbData.pengumuman.unshift({ id: Date.now(), kind, tgl: new Date().toISOString(), judul, isi, deadline });
    if (!(await saveCategoryData('pengumuman'))) return;
    document.getElementById('p-judul').value = ''; document.getElementById('p-isi').value = ''; document.getElementById('p-deadline').value = '';
    delete document.getElementById('p-judul').dataset.kind;
    alert('Pengumuman ditambahkan!');
};

window.addTugasItem = async function () {
    const nama = document.getElementById('t-nama').value;
    const deadline = document.getElementById('t-deadline').value;
    const ket = document.getElementById('t-ket').value;
    const manualLink = document.getElementById('t-link-manual').value.trim();
    if (!nama || !deadline) return alert('Nama dan Deadline wajib diisi!');

    let finalLink = manualLink || '#';
    const uploadedUrl = await uploadFileToSupabaseStorage('t-file-pc', 'Tugas');
    if (uploadedUrl) { finalLink = uploadedUrl; }

    dbData.tugas.push({ id: Date.now(), nama, deadline, ket, link: finalLink });
    if (!(await saveCategoryData('tugas'))) return;
    document.getElementById('t-nama').value = ''; document.getElementById('t-deadline').value = ''; document.getElementById('t-ket').value = '';
    document.getElementById('t-file-pc').value = ''; document.getElementById('t-link-manual').value = '';
    alert('Tugas disimpan!');
    postUpdate('tugas', '\ud83d\udcdd Tugas baru: ' + nama, nama + (ket ? ' \u2014 ' + ket : '') + '. Deadline ' + tglIndo(deadline) + '.', { until: deadline });
};

window.handlePraktikumUpload = async function (category, idNama, idSkenario, idKet, idFilePc, idLink) {
    const nama = document.getElementById(idNama).value;
    const skenario = document.getElementById(idSkenario).value;
    const ketEl = document.getElementById(idKet);          // elemen "ket" tidak ada di HTML, jadi dicek dulu
    const ket = ketEl ? ketEl.value : '';
    const manualLink = document.getElementById(idLink).value.trim();
    if (!nama) return alert('Nama wajib diisi!');

    let finalLink = manualLink || '#';
    const uploadedUrl = await uploadFileToSupabaseStorage(idFilePc, ({ laboratorium: 'Lab', skills_lab: 'Skills Lab', tutorial: 'Tutorial' }[category] || category) + '/' + (skenario || 'Umum'));
    if (uploadedUrl) { finalLink = uploadedUrl; }

    dbData[category].push({ id: Date.now(), nama, skenario, ket, link: finalLink });
    if (!(await saveCategoryData(category))) return;
    document.getElementById(idNama).value = ''; document.getElementById(idSkenario).value = '';
    if (ketEl) ketEl.value = '';
    document.getElementById(idFilePc).value = ''; document.getElementById(idLink).value = '';
    alert('Berhasil disimpan!');
    const lbl = { laboratorium: 'Lab', skills_lab: 'Skills Lab', tutorial: 'Tutorial' }[category] || category;
    postUpdate('file', '\ud83d\udcda Berkas baru di ' + lbl, nama + (skenario ? ' (' + skenario + ')' : '') + ' telah ditambahkan.', { key: 'file:' + category, merge: n => n + ' berkas baru ditambahkan ke ' + lbl + '.' });
};

window.handleMateriUpload = async function () {
    const kuliah = document.getElementById('m-kuliah').value;
    const materi = document.getElementById('m-materi').value;
    const manualLink = document.getElementById('m-link-manual').value.trim();
    if (!kuliah || !materi) return alert('Nama kuliah dan materi wajib diisi!');

    let finalLink = manualLink || '#';
    const uploadedUrl = await uploadFileToSupabaseStorage('m-file-pc', 'Materi/' + kuliah);
    if (uploadedUrl) { finalLink = uploadedUrl; }

    dbData.materi.push({ id: Date.now(), kuliah, materi, link: finalLink });
    if (!(await saveCategoryData('materi'))) return;
    document.getElementById('m-kuliah').value = ''; document.getElementById('m-materi').value = '';
    document.getElementById('m-file-pc').value = ''; document.getElementById('m-link-manual').value = '';
    alert('Materi disimpan!');
    postUpdate('materi', '\ud83d\udcda Materi baru: ' + materi, kuliah + ': ' + materi + ' telah ditambahkan di menu Kuliah \u203a Materi.', { key: 'materi', merge: n => n + ' materi baru ditambahkan di menu Kuliah \u203a Materi.' });
};

window.addReminder = async function () {
    const val = document.getElementById('rem-text').value; if (!val) return;
    dbData.reminder.push(val); await saveCategoryData('reminder'); document.getElementById('rem-text').value = '';
};

window.addJadwalUpdateWithFile = async function () {
    const title = document.getElementById('up-title').value; if (!title) return;
    dbData.jadwalUpdates.push(title); await saveCategoryData('jadwalUpdates'); document.getElementById('up-title').value = '';
    postUpdate('jadwal', '\ud83d\uddd3\ufe0f Update jadwal', title);
};

window.toggleMaintenanceMode = async function () {
    dbData.maintenance = !dbData.maintenance;
    if (await saveCategoryData('config')) alert('Status pemeliharaan: ' + (dbData.maintenance ? 'AKTIF' : 'NONAKTIF'));
};

window.openAdminSettingsModal = function () {
    document.getElementById('cfg-global-msg').value = dbData.globalAnnouncement || '';
    document.getElementById('cfg-admin-code').value = '';
    document.getElementById('admin-settings-modal').style.display = 'flex';
};

window.saveAdminSettings = async function () {
    dbData.globalAnnouncement = document.getElementById('cfg-global-msg').value;
    const newCode = document.getElementById('cfg-admin-code').value.trim();
    if (newCode) dbData.adminCode = newCode;               // kosong = kode lama tidak diubah
    if (!(await saveCategoryData('config'))) return;
    window.closeModal('admin-settings-modal');
    alert('Tersimpan');
};

window.openPreviewModal = function (url) { document.getElementById('preview-frame').src = url; document.getElementById('preview-modal').style.display = 'flex'; };
window.closePreviewModal = function () { document.getElementById('preview-modal').style.display = 'none'; document.getElementById('preview-frame').src = ''; };

// ==========================================================================
// LATIHAN SOAL ISIAN (DENGAN GAMBAR & PENILAIAN)
// ==========================================================================

// Samakan format jawaban: huruf kecil, tanpa tanda baca, tanpa awalan Os/M./N./Nervus/Musculus/Foramen
function normAns(t) {
    return String(t || '').toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\b(os|m|n|nervus|musculus|foramen)\b/g, ' ')
        .replace(/\s+/g, ' ').trim();
}

window.startQuiz = function () {
    document.getElementById('quiz-start-card').style.display = 'none';
    document.getElementById('quiz-active-area').style.display = 'block';
    document.getElementById('quiz-result-card').style.display = 'none';
    document.getElementById('submit-quiz-btn').style.display = 'inline-flex';
    document.getElementById('reset-quiz-btn').style.display = 'none';

    document.getElementById('soal-cards-container').innerHTML = dbData.soal.map((s, i) => `
        <div class="card">
            <p><strong>${i + 1}.</strong> ${cleanText(s.question)}</p>
            ${s.image ? `<div class="cbt-image-container"><img src="${s.image}" class="cbt-image" alt="Ilustrasi soal" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none'"><small style="display:block;color:var(--text-muted);margin-top:6px;font-size:11px;">${s.image_credit || ''}</small></div>` : ''}
            <input type="text" id="ans_${s.id}" class="modern-input" placeholder="Ketik jawaban...">
            <div id="fb_${s.id}" class="cbt-feedback" style="display:none;"></div>
        </div>`).join('');
};

window.submitQuiz = function () {
    let benar = 0;
    dbData.soal.forEach(s => {
        const input = document.getElementById('ans_' + s.id);
        if (!input) return;
        const user = normAns(input.value);
        const key = normAns(s.answer);
        const ok = user !== '' && (key === '' ? user === String(s.answer).toLowerCase().trim() : (user === key || user.includes(key)));
        if (ok) benar++;
        input.disabled = true;

        const fb = document.getElementById('fb_' + s.id);
        fb.style.display = 'block';
        fb.className = 'cbt-feedback ' + (ok ? 'feedback-success' : 'feedback-danger');
        fb.innerHTML = (ok ? '<strong>\u2705 Benar!</strong>' : `<strong>\u274c Salah.</strong> Jawaban: <strong>${s.answer}</strong>`)
            + (s.explanation ? `<br><br><em>Pembahasan:</em> ${cleanText(s.explanation)}` : '');
    });

    const total = dbData.soal.length;
    document.getElementById('quiz-score-text').innerText =
        `Skor: ${benar} dari ${total} (${total ? Math.round(benar / total * 100) : 0}%)`;
    document.getElementById('quiz-result-card').style.display = 'block';
    document.getElementById('submit-quiz-btn').style.display = 'none';
    document.getElementById('reset-quiz-btn').style.display = 'inline-flex';
};

window.resetQuiz = function () { window.startQuiz(); };

window.openJadwalModal = function () { alert("Fitur edit jadwal via UI sedang dalam pengembangan. Menggunakan Supabase."); };

// ==========================================================================
// BAGIAN 2 - TAMPILAN DASAR & FITUR KECIL
// ==========================================================================
(function () {
    const st = document.createElement('style');
    st.id = 'tambahan-css';
    st.textContent = `
html { scroll-behavior: smooth; }
body { font-size: 16px; }
.btn, .nav-pill, .btn-icon { min-height: 40px; }
.nav-pill { padding: 10px 20px; }
.modern-input { font-size: 16px; }
.option-label { padding: 16px 20px; }
@media (max-width: 768px) {
    .main-content { padding: 0 12px; margin: 16px auto; }
    .card { padding: 18px; }
    .q-text { font-size: 16px; }
}
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; scroll-behavior: auto !important; } }

/* Notifikasi (menggantikan pop-up alert) */
#toast-wrap { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 20000; display: flex; flex-direction: column; gap: 8px; align-items: center; width: min(92vw, 420px); pointer-events: none; }
.toast { background: var(--text-main); color: var(--bg-card); padding: 12px 18px; border-radius: 12px; font-size: 14px; font-weight: 600; box-shadow: var(--shadow-lg); width: 100%; animation: toastIn .25s ease; }
@keyframes toastIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

/* Sapaan di beranda */
.greeting { background: var(--primary); color: #fff; border-radius: var(--radius-xl); padding: 22px 26px; margin-bottom: 25px; }
.greeting h3 { font-size: 22px; margin-bottom: 2px; }
.greeting p { opacity: .92; font-size: 14px; }
.greeting .quote { font-size: 16px; font-weight: 600; opacity: 1; margin-top: 8px; line-height: 1.5; }
.greeting .sub { margin-top: 10px; }

/* Label deadline tugas & pencarian tabel */
.dl-badge { display: inline-block; margin-left: 8px; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
.dl-late { background: #fee2e2; color: #991b1b; }
.dl-soon { background: #fef3c7; color: #92400e; }
.dl-ok { background: var(--primary-light); color: var(--primary); }
.search-box { margin-bottom: 15px; }

.cbt-timer.cbt-timer-warn { background: var(--danger); animation: pulseCorrect 1s infinite; }

/* Tombol kembali ke atas */
#to-top { position: fixed; right: 18px; bottom: 90px; z-index: 650; width: 44px; height: 44px; border-radius: 50%; border: none; background: var(--primary); color: #fff; font-size: 18px; cursor: pointer; box-shadow: var(--shadow-lg); display: none; }
`;
    document.head.appendChild(st);
})();

(function () {
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const $ = id => document.getElementById(id);

    // 1. Notifikasi toast menggantikan pop-up alert
    const wrap = document.createElement('div');
    wrap.id = 'toast-wrap'; wrap.setAttribute('role', 'status'); wrap.setAttribute('aria-live', 'polite');
    document.body.appendChild(wrap);
    window.alert = function (msg) {
        const t = document.createElement('div');
        t.className = 'toast'; t.textContent = String(msg);
        wrap.appendChild(t);
        setTimeout(() => t.remove(), 3800);
    };

    // 2. Timer memerah pada 10 menit terakhir (mode CBT ujian)
    setInterval(() => {
        const t = $('cbt-timer'); if (!t) return;
        let warn = false;
        try { warn = cbtStarted && cbtMode === 'exam' && cbtTimeInSeconds <= 600; } catch (e) { }
        t.classList.toggle('cbt-timer-warn', warn);
    }, 1000);

    // 3. Sapaan, label deadline tugas, dan kolom pencarian (dijalankan setiap renderAll)
    function addSearch(bodyId, placeholder) {
        const body = $(bodyId); if (!body || $('search-' + bodyId)) return;
        const input = document.createElement('input');
        input.type = 'search'; input.id = 'search-' + bodyId; input.className = 'modern-input search-box'; input.placeholder = placeholder;
        input.addEventListener('input', () => applyFilter(bodyId));
        body.closest('.table-responsive').before(input);
    }
    function applyFilter(bodyId) {
        const input = $('search-' + bodyId), body = $(bodyId); if (!input || !body) return;
        const q = input.value.toLowerCase();
        body.querySelectorAll('tr').forEach(tr => { tr.style.display = tr.textContent.toLowerCase().includes(q) ? '' : 'none'; });
    }
    function deadlineBadges() {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        document.querySelectorAll('#tugas-table-body td[data-label="Deadline"]').forEach(td => {
            if (td.querySelector('.dl-badge')) return;
            const m = td.textContent.trim().match(/^\d{4}-\d{2}-\d{2}$/); if (!m) return;
            // Bandingkan tanggal saja (jam diabaikan) supaya "Hari ini" dan "1 hari lagi" akurat
            const days = Math.round((new Date(m[0] + 'T00:00:00') - today) / 86400000);
            const b = document.createElement('span');
            if (days < 0) { b.className = 'dl-badge dl-late'; b.textContent = 'Terlewat'; }
            else if (days === 0) { b.className = 'dl-badge dl-soon'; b.textContent = 'Hari ini'; }
            else { b.className = 'dl-badge ' + (days <= 3 ? 'dl-soon' : 'dl-ok'); b.textContent = days + ' hari lagi'; }
            td.appendChild(b);
        });
    }
    // Kata penyemangat: berganti tiap hari, sama untuk semua orang pada hari yang sama
    const QUOTES = [
        'Satu halaman hari ini lebih baik daripada seribu rencana besok.',
        'Dokter hebat dibentuk dari rasa ingin tahu yang tidak pernah selesai.',
        'Lelahmu hari ini adalah kompetensimu di masa depan.',
        'Jangan bandingkan bab satumu dengan bab sepuluh orang lain.',
        'Pelan tidak apa-apa, asal tidak berhenti.',
        'Setiap pasien kelak akan berterima kasih pada malam-malam belajarmu.',
        'Kamu tidak harus sempurna, cukup lebih paham dari kemarin.',
        'Konsisten kecil mengalahkan semangat besar yang sebentar.',
        'Istirahat itu bagian dari belajar, bukan lawannya.',
        'Kalau hari ini berat, ingat: kamu sudah sampai sejauh ini.',
        'Ilmu yang kamu pelajari hari ini mungkin menolong nyawa suatu hari nanti.',
        'Bertanya bukan tanda lemah, tapi tanda sedang bertumbuh.',
        'Satu soal salah hari ini adalah satu kesalahan yang tidak terulang di ujian.',
        'A9 kuat karena saling menguatkan.',
        'Fokus 25 menit, istirahat 5 menit, ulangi. Kamu bisa.',
        'Mimpi besar dimulai dari jadwal belajar yang dipatuhi.',
        'Hari ini kamu belajar, besok kamu melayani.',
        'Tidak ada jalan pintas menuju paham, tapi ada banyak teman seperjalanan.',
        'Banggalah pada prosesmu, bukan hanya nilaimu.',
        'Tarik napas dalam, kerjakan satu hal, lalu satu hal berikutnya.',
        'Setiap istilah medis yang kamu hafal adalah bahasa baru untuk menolong.',
        'Ujian hanya mengukur persiapan, dan persiapan bisa dimulai sekarang.',
        'Tetap rendah hati, tetap haus belajar.',
        'Gagal sekali bukan akhir. Itu bahan belajar.',
        'Hari baru, halaman baru, peluang baru.',
        'Yang sulit sekarang akan terasa ringan setelah dipahami.',
        'Kamu ada di jalan ini bukan tanpa alasan.',
        'Rapikan jadwal, rapikan hati, mulai dari yang paling mudah.',
        'Teman belajar yang baik membuat bab tersulit terasa lebih pendek.',
        'Semangat, calon dokter hebat!'
    ];
    window.a9Quote = () => QUOTES[Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000) % QUOTES.length];

    function greeting() {
        if (typeof currentUser === 'undefined' || !currentUser || $('greeting')) return;
        const home = $('tab-home'); if (!home) return;
        const nama = (currentUser.name || '').split(' ')[0];
        const jam = new Date().getHours();
        const sapa = jam < 11 ? 'Selamat pagi' : jam < 15 ? 'Selamat siang' : jam < 18 ? 'Selamat sore' : 'Selamat malam';
        const d = document.createElement('div');
        d.id = 'greeting'; d.className = 'greeting';
        d.innerHTML = `<h3>${sapa}, ${esc(nama.charAt(0) + nama.slice(1).toLowerCase())}! \ud83d\udc4b</h3><p class="quote">\u201c${esc(window.a9Quote())}\u201d</p><p class="sub">Cek pengingat, jadwal, dan tugasmu di bawah.</p>`;
        home.prepend(d);
    }

    const origRender = window.renderAll;
    window.renderAll = function () {
        origRender();
        try {
            addSearch('tugas-table-body', '\ud83d\udd0e Cari tugas...');
            addSearch('materi-table-body', '\ud83d\udd0e Cari materi...');
            deadlineBadges(); greeting();
            applyFilter('tugas-table-body'); applyFilter('materi-table-body');
        } catch (e) { console.error(e); }
    };
    window.renderAll();

    // 4. Tombol kembali ke atas
    const up = document.createElement('button');
    up.id = 'to-top'; up.type = 'button'; up.setAttribute('aria-label', 'Kembali ke atas'); up.textContent = '\u25b2';
    up.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.appendChild(up);
    let upShown = false;
    window.addEventListener('scroll', () => {
        const show = window.scrollY > 400;
        if (show !== upShown) { upShown = show; up.style.display = show ? 'block' : 'none'; }
    }, { passive: true });
})();

// ==========================================================================
// BAGIAN 3 - NAVIGASI SEDERHANA, PANDUAN, & LAPORAN (STATUS UNTUK MAHASISWA, KELOLA UNTUK ADMIN)
// ==========================================================================
(function () {
    const $ = id => document.getElementById(id);
    const esc = x => String(x == null ? '' : x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const isAdmin = () => typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'admin';
    const isGuest = () => typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'guest';
    const fmt = d => new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    const KEY = 'laporan';
    const STAT = { baru: 'Terkirim', proses: 'Sedang diproses', selesai: 'Selesai' };
    dbData.laporan = [];

    const st = document.createElement('style');
    st.textContent = `
    .simple-nav { flex-direction: column; gap: 8px; padding: 12px 25px; }
    .sn-row { display: flex; gap: 10px; overflow-x: auto; scrollbar-width: none; }
    .sn-row::-webkit-scrollbar { display: none; }
    .sn-chip { border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-main); padding: 6px 16px; border-radius: 50px; font-weight: 600; font-size: 13px; cursor: pointer; white-space: nowrap; }
    .sn-chip.active { background: var(--primary-light); color: var(--primary); border-color: var(--primary); }
    .sn-badge { background: var(--danger); color: #fff; border-radius: 20px; font-size: 11px; padding: 0 6px; margin-left: 6px; font-weight: 800; line-height: 18px; display: inline-block; }
    @media (max-width: 768px) { .simple-nav { padding: 10px 12px; } }
    .guide details { border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px 18px; margin-bottom: 10px; background: var(--bg-base); }
    .guide summary { cursor: pointer; font-weight: 700; font-size: 15px; }
    .guide details[open] { border-color: var(--primary); }
    .guide ol, .guide ul { margin: 10px 0 0 22px; font-size: 14px; color: var(--text-muted); }
    .guide li { margin-bottom: 6px; }
    .guide p { font-size: 14px; color: var(--text-muted); margin-top: 8px; }
    .report-hint { font-size: 13px; color: var(--text-muted); margin-bottom: 18px; }
    select.modern-input { appearance: auto; }
    .lap-item { border: 1px solid var(--border-color); border-left: 4px solid var(--warning); border-radius: var(--radius-md); padding: 14px 16px; margin-bottom: 12px; background: var(--bg-base); }
    .lap-item.s-proses { border-left-color: #3b82f6; } .lap-item.s-selesai { border-left-color: var(--primary); }
    .lap-top { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; font-size: 13px; color: var(--text-muted); margin-bottom: 6px; }
    .lap-cat { background: var(--primary-light); color: var(--primary); border-radius: 20px; padding: 2px 10px; font-weight: 700; font-size: 12px; }
    .lap-body { white-space: pre-wrap; font-size: 14px; margin: 8px 0; }
    .lap-note { background: var(--primary-light); border-radius: var(--radius-sm); padding: 10px 12px; font-size: 14px; margin-top: 8px; }
    .lap-acts { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
    .trk { display: flex; gap: 6px; margin: 8px 0; font-size: 12px; }
    .trk span { flex: 1; text-align: center; padding: 5px; border-radius: 8px; background: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-muted); }
    .trk span.on { background: var(--primary); color: #fff; border-color: var(--primary); font-weight: 700; }
    .upd-card { background: var(--primary-light); border: 1px solid var(--primary); border-radius: var(--radius-xl); padding: 18px 22px; margin-bottom: 25px; }
    .upd-card h3 { font-size: 17px; margin-bottom: 10px; }
    .upd-row { padding: 10px 0; border-top: 1px solid var(--border-color); font-size: 14px; }
    .lap-filter.active { background: var(--primary); color: #fff; border-color: var(--primary); }`;
    document.head.appendChild(st);

    // ---------- Isi tab ----------
    const main = document.querySelector('.main-content');
    main.insertAdjacentHTML('beforeend', `
    <div id="tab-panduan" class="tab-content" style="display:none;">
      <div class="card guide">
        <div class="card-header"><h3 class="card-title">\ud83d\udcd6 Panduan Penggunaan Portal</h3></div>
        <details open><summary>1. Cara menggunakan menu</summary>
          <p>Menu utama ada di bagian atas: <strong>Beranda, Kuliah, Praktikum, Latihan, Bantuan</strong>. Klik salah satunya, lalu pilih halaman di baris kedua. Contoh: Kuliah berisi Jadwal, Tugas, dan Materi.</p></details>
        <details><summary>2. Masuk ke portal</summary>
          <ol><li>Pilih peran <strong>Mahasiswa</strong>, lalu isi NIM.</li><li>Klik <strong>Masuk Portal</strong>. Kalau NIM tidak terdaftar, hubungi admin.</li><li>Sesi berakhir setelah 30 menit tanpa aktivitas.</li></ol></details>
        <details><summary>3. Jadwal dan Tugas (menu Kuliah)</summary>
          <ul><li><strong>Jadwal:</strong> kegiatan hari ini dan besok per sesi.</li><li><strong>Tugas:</strong> daftar tugas dengan label sisa waktu (hijau aman, kuning mendekati, merah terlewat). Gunakan kolom pencarian untuk mencari.</li><li><strong>Materi:</strong> klik <em>Buka</em> untuk membuka berkas.</li></ul></details>
        <details><summary>4. Lab, Skills Lab, dan Tutorial (menu Praktikum)</summary>
          <p>Pilih halamannya, lalu klik <strong>Buka Berkas</strong> untuk melihat modul.</p></details>
        <details><summary>5. Latihan soal isian</summary>
          <ol><li>Buka <strong>Latihan, Soal Isian</strong>, lalu klik <strong>Mulai Latihan</strong>.</li><li>Ketik jawaban. Huruf besar-kecil dan awalan "Os", "M.", "N." tidak berpengaruh.</li><li>Klik <strong>Submit Jawaban</strong> untuk melihat skor dan pembahasan.</li></ol></details>
        <details><summary>6. Simulasi CBT</summary>
          <ul><li><strong>Tampilan:</strong> satu soal per halaman. Pakai tombol Sebelumnya/Berikutnya, atau klik nomor di <strong>Daftar Soal</strong> untuk memilih soal mana yang mau dikerjakan.</li><li><strong>Warna nomor:</strong> abu-abu = belum dikerjakan, hijau = sudah dijawab, titik oranye = ditandai ragu-ragu.</li><li><strong>Mode Latihan:</strong> tanpa waktu. Jawaban yang kamu pilih disimpan dulu dan bisa diganti. Tekan <em>Periksa jawaban</em> untuk melihat benar/salah dan pembahasan soal itu. Menu lain tetap bisa dibuka.</li><li><strong>Mode CBT:</strong> ada waktu 100 menit (timer merah di 10 menit terakhir). Jawaban boleh diubah sebelum dikumpulkan, dan <strong>menu lain terkunci</strong> sampai jawaban dikumpulkan. Pembahasan bisa dilihat setelah dikumpulkan lewat tombol <em>Review &amp; Pembahasan</em>.</li><li><strong>Ganti mode:</strong> tombol <em>Beranda CBT</em> membawamu kembali ke pilihan mode (latihan atau ujian yang sedang jalan dibatalkan).</li><li><strong>Tombol cepat:</strong> A-E atau 1-5 untuk memilih jawaban, panah kiri/kanan untuk pindah soal, F untuk tandai ragu.</li><li>Di akhir sesi kamu mendapat apresiasi, laporan nilai, dan rekomendasi topik belajar. Hasilnya otomatis tersimpan.</li></ul></details>
        <details class="guest-guide"><summary>\ud83d\udcc8 Progres dan hasil belajar</summary>
          <ol><li>Setiap selesai CBT atau Soal Isian, nilaimu tersimpan otomatis di akunmu (NIM), jadi bisa dilihat dari HP atau laptop mana pun.</li><li>Buka <strong>Latihan, Progres Saya</strong> untuk melihat grafik nilai, rata-rata, nilai terbaik, dan apakah kamu meningkat dibanding pengerjaan sebelumnya.</li><li>Bagian <em>Topik yang perlu diperkuat</em> menunjukkan topik yang paling sering salah, sebagai panduan belajar.</li></ol></details>
        <details class="guest-guide"><summary>7. Melapor masalah dan melihat perkembangannya</summary>
          <ol><li>Buka <strong>Bantuan, Lapor Masalah</strong>, isi jenis, bagian, dan penjelasan, lalu klik <strong>Kirim Laporan</strong>.</li><li>Di halaman yang sama, bagian <strong>Laporan Saya</strong> menunjukkan perkembangannya: Terkirim, Sedang diproses, lalu Selesai.</li><li>Kalau admin mengubah status atau menulis catatan, kamu mendapat notifikasi dan kartu <strong>\ud83d\udd14 Update laporanmu</strong> di Beranda. Klik <em>Tandai sudah dibaca</em> kalau sudah dilihat.</li></ol></details>
        <details class="admin-guide" style="display:none;"><summary>\ud83d\udee0\ufe0f Panduan Admin</summary>
          <ol><li><strong>Menambah konten:</strong> form berwarna putus-putus di tiap halaman (pengumuman, tugas, dan seterusnya) hanya terlihat oleh admin. Isi lalu klik Simpan. Tombol Hapus muncul di tiap data, dan berkas yang diunggah lewat portal ikut terhapus.</li>
          <li><strong>Menu Laporan:</strong> buka <em>Bantuan, Laporan Masuk</em>. Angka merah di menu menunjukkan laporan yang belum selesai.</li>
          <li><strong>Mengolah laporan:</strong> tulis catatan untuk pelapor (opsional), lalu klik <em>Proses</em> saat mulai dikerjakan, dan <em>Selesai</em> kalau sudah beres. Mahasiswa pelapor otomatis mendapat notifikasi di Beranda.</li>
          <li><strong>Filter:</strong> pakai tombol Belum selesai, Selesai, atau Semua. Klik Muat ulang untuk mengecek laporan baru.</li>
          <li><strong>Setelan:</strong> tombol \u2699\ufe0f Setelan di kanan atas untuk mode maintenance, pengumuman global, dan mengganti kode admin.</li></ol></details>
        <details class="admin-guide" style="display:none;"><summary>\ud83d\udcc1 Upload materi dan file besar lewat Google Drive (Admin)</summary>
          <ol><li>Buka <strong>drive.google.com</strong> dan buat folder, misalnya "Portal A9". Drive gratis 15 GB dan bisa menyimpan PDF, PPT, atau video besar.</li><li>Cara termudah: di halaman Materi, Lab, Skills Lab, atau Tutorial, klik <strong>Tambah</strong>, pilih satu atau banyak file, isi <strong>Kategori</strong>, lalu klik Tambah. Judul otomatis memakai nama file, dan file masuk ke folder Drive sesuai kategori (setelah Apps Script dipasang).</li><li>Untuk file yang sudah ada di Drive: klik kanan file, pilih <strong>Bagikan</strong>, ubah Akses umum menjadi <strong>Siapa saja yang memiliki link</strong> dengan peran <strong>Pelihat</strong>, <strong>Salin link</strong>, lalu tempel di kolom tautan (satu per baris, boleh <em>Judul | tautan</em>).</li><li>Mahasiswa yang klik kartu akan melihat pratinjau file di jendela portal, dengan tombol <em>Buka di Drive</em> dan <em>Unduh</em>. Link folder juga didukung, isinya tampil sebagai daftar.</li><li>Kalau mahasiswa melihat "Anda memerlukan akses", berarti akses umum belum diatur ke "Siapa saja yang memiliki link". Perbaiki di Drive, tidak perlu mengubah data di portal.</li><li><strong>Menghapus:</strong> menghapus berkas di portal juga memindahkan file yang diunggah lewat portal ke Sampah Drive (bisa dipulihkan 30 hari). File Drive milik orang lain atau di luar folder portal tidak ikut terhapus.</li></ol></details>
        <details><summary>\ud83d\udd0e Filter materi, pencarian, dan favorit</summary>
          <ul><li><strong>Materi, Lab, Skills Lab, dan Tutorial</strong> punya filter sendiri: <strong>Kategori</strong>, <strong>Jenis</strong> berkas, dan urutan. Pilihan kategori otomatis mengikuti data di halaman itu.</li><li>Ketik di kolom cari untuk mencari judul atau kategori. Tombol <em>Atur ulang filter</em> mengosongkan semuanya.</li><li>Klik kartu untuk <strong>pratinjau</strong>: PDF, slide, gambar, dan video tampil langsung. Pakai panah kiri/kanan atau tombol Sebelumnya/Berikutnya untuk pindah berkas. Tekan \u2606 untuk menyimpan ke <em>Favorit saya</em>; berkas yang baru dibuka muncul di <em>Terakhir dibuka</em>.</li><li><strong>Video YouTube</strong> diputar di dalam portal, dan di bawahnya muncul <strong>rangkuman otomatis</strong> (ringkasan, poin penting dengan waktu yang bisa diklik, istilah, dan pertanyaan latihan). Rangkuman dibuat AI dari subtitle video, jadi cocokkan lagi dengan materi resmi.</li><li class="admin-guide" style="display:none;"><strong>Admin:</strong> tombol <em>Tambah</em> di tiap halaman: pilih satu atau banyak file, isi kategori, selesai. Menu \u22ef di kartu untuk ubah atau hapus.</li><li><strong>Alat Belajar</strong> (menu Kuliah): timer fokus, catatan cepat, dan kalkulator IPS/IPK. Di halaman Jadwal ada tombol untuk menambahkan jadwal ke kalender HP.</li><li><strong>Tugas:</strong> pakai tombol Semua atau Akan datang, dan kolom pencarian.</li><li><strong>Jadwal:</strong> pilih Hari ini &amp; besok, Minggu ini, atau Semua, atau ketik kata kunci seperti "Tutor" atau nama dosen.</li></ul></details>
        <details class="admin-guide" style="display:none;"><summary>\ud83d\udcca Progres mahasiswa dan jadwal (Admin)</summary>
          <ol><li>Buka <strong>Latihan, Progres Mahasiswa</strong> untuk melihat jumlah pengerjaan, rata-rata, nilai terbaik, nilai terakhir, dan tren tiap mahasiswa. Gunakan pencarian dan filter jenis latihan.</li><li>Klik <strong>Detail</strong> untuk melihat semua pengerjaan satu mahasiswa. Tombol <em>Hapus</em> di tiap baris menghapus satu pengerjaan, dan <em>Hapus semua progres</em> mengosongkan progres mahasiswa itu. Pakai ini kalau terjadi kesalahan sistem. Penghapusan tidak bisa dibatalkan.</li><li><strong>Jadwal:</strong> buka Kuliah, Jadwal, lalu tempel isi JSON jadwal di kotak admin dan klik <em>Simpan jadwal ke database</em>. Format array langsung atau berbentuk {"jadwal": [...]} sama-sama diterima.</li></ol></details>
        <details><summary>\ud83c\udfae Game santai</summary>
          <ul><li>Buka <strong>Latihan, Game Santai</strong> untuk istirahat sebentar. Ada tiga game: <strong>Memory medis</strong>, <strong>Ular</strong>, dan <strong>2048</strong>.</li><li>Di HP, geser jari di papan untuk bermain. Di laptop, pakai tombol panah atau WASD.</li><li>Skor terbaikmu tersimpan di perangkat ini. Permainan berhenti otomatis saat kamu pindah menu, dan ada pengingat lembut setelah 5 menit.</li></ul></details>
        <details><summary>8. Masalah yang sering terjadi</summary>
          <ul><li><strong>Gambar soal tidak muncul:</strong> cek internet, lalu refresh dengan Ctrl+Shift+R. Kalau masih kosong, laporkan nomor soalnya.</li><li><strong>Halaman tidak merespons:</strong> refresh. Jawaban CBT yang belum diselesaikan tidak tersimpan.</li><li><strong>Portal maintenance:</strong> mahasiswa tidak bisa masuk sampai admin selesai.</li></ul></details>
      </div>
    </div>

    <div id="tab-lapor" class="tab-content" style="display:none;">
      <div class="card">
        <div class="card-header"><h3 class="card-title">\ud83d\udce3 Lapor Masalah</h3></div>
        <p class="report-hint">Laporan masuk ke admin, dan perkembangannya bisa kamu pantau di bagian Laporan Saya di bawah.</p>
        <div class="form-group"><label for="lap-nama">Nama</label><input type="text" id="lap-nama" class="modern-input"></div>
        <div class="form-group"><label for="lap-nim">NIM</label><input type="text" id="lap-nim" class="modern-input" readonly></div>
        <div class="form-group"><label for="lap-kategori">Jenis laporan</label>
          <select id="lap-kategori" class="modern-input"><option>Soal atau jawaban keliru</option><option>Gambar tidak muncul</option><option>Error atau bug di portal</option><option>Jadwal, tugas, atau materi tidak sesuai</option><option>Saran fitur</option><option>Lainnya</option></select></div>
        <div class="form-group"><label for="lap-lokasi">Bagian atau nomor soal (kalau ada)</label><input type="text" id="lap-lokasi" class="modern-input" placeholder="Contoh: CBT soal 17, atau halaman Tugas"></div>
        <div class="form-group"><label for="lap-isi">Penjelasan</label><textarea id="lap-isi" class="modern-input" style="height:120px;resize:vertical;" placeholder="Ceritakan apa yang terjadi, dan apa yang seharusnya tampil."></textarea></div>
        <button class="btn btn-primary btn-lg" id="lap-kirim">\ud83d\udce8 Kirim Laporan</button>
      </div>
      <div class="card"><div class="card-header"><h3 class="card-title">\ud83d\udccb Laporan Saya</h3></div><div id="lap-mine"></div></div>
    </div>

    <div id="tab-laporan-admin" class="tab-content" style="display:none;">
      <div class="card">
        <div class="card-header flex-between"><h3 class="card-title">\ud83d\udee0\ufe0f Laporan Masuk</h3><button class="btn btn-outline btn-sm" id="lap-refresh">\ud83d\udd04 Muat ulang</button></div>
        <details class="guide" style="margin-bottom:15px;"><summary style="cursor:pointer;font-weight:700;">\ud83d\udcd8 Cara memakai halaman ini</summary>
          <ol style="margin:10px 0 0 22px;font-size:14px;color:var(--text-muted);"><li>Baca laporan, lalu tulis catatan untuk pelapor (opsional).</li><li>Klik <strong>Proses</strong> saat mulai dikerjakan dan <strong>Selesai</strong> kalau sudah beres.</li><li>Mahasiswa pelapor otomatis mendapat notifikasi di Beranda mereka.</li><li>Pakai filter di bawah untuk memisahkan laporan yang belum dan sudah selesai.</li></ol></details>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:15px;">
          <button class="btn btn-outline btn-sm lap-filter active" data-f="baru">Belum selesai</button>
          <button class="btn btn-outline btn-sm lap-filter" data-f="selesai">Selesai</button>
          <button class="btn btn-outline btn-sm lap-filter" data-f="semua">Semua</button>
        </div>
        <div id="lap-list"></div>
      </div>
    </div>`);

    // ---------- Supabase ----------
    async function fetchLaporan() {
        const { data, error } = await supabaseClient.from('portal_db').select('value').eq('key', KEY).maybeSingle();
        if (error) throw error;
        let v = data && data.value;
        if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { v = []; } }
        return Array.isArray(v) ? v : [];
    }
    async function writeLaporan(list) {
        const { error } = await supabaseClient.from('portal_db').upsert({ key: KEY, value: list }, { onConflict: 'key' });
        if (error) throw error;
    }

    // ---------- Navigasi sederhana ----------
    const GROUPS = [
        { id: 'home', ico: '\ud83c\udfe0', label: 'Beranda', tabs: [['home', 'Beranda']] },
        { id: 'kuliah', ico: '\ud83d\udcc5', label: 'Kuliah', tabs: [['jadwal', 'Jadwal'], ['tugas', 'Tugas'], ['materi', 'Materi'], ['alat', 'Alat Belajar']] },
        { id: 'praktikum', ico: '\ud83d\udd2c', label: 'Praktikum', tabs: [['lab', 'Lab'], ['skills', 'Skills Lab'], ['tutorial', 'Tutorial']] },
        { id: 'latihan', ico: '\u270d\ufe0f', label: 'Latihan', tabs: () => [['soal', 'Soal Isian'], ['cbt', 'Simulasi CBT'], isAdmin() ? ['progres-admin', 'Progres Mahasiswa'] : ['progres', 'Progres Saya'], ['game', 'Game Santai']] },
        { id: 'bantuan', ico: '\ud83d\udcac', label: 'Bantuan', tabs: () => [['panduan', 'Panduan'], isAdmin() ? ['laporan-admin', 'Laporan Masuk'] : ['lapor', 'Lapor Masalah']] }
    ];
    const tabsOf = g => typeof g.tabs === 'function' ? g.tabs() : g.tabs;
    const oldNav = document.querySelector('.modern-nav');
    oldNav.style.display = 'none';
    const nav = document.createElement('nav');
    nav.className = 'modern-nav simple-nav';
    nav.innerHTML = '<div id="sn-main" class="sn-row"></div><div id="sn-sub" class="sn-row"></div>';
    oldNav.after(nav);

    let curTab = 'home', adminBaru = 0, mine = [], seen = {}, lastUnread = 0, lastBaru = 0, filter = 'baru', poll = null;
    const badge = () => isAdmin() ? adminBaru : unread().length;

    function renderNav() {
        const g = GROUPS.find(x => tabsOf(x).some(t => t[0] === curTab)) || GROUPS[0];
        $('sn-main').innerHTML = GROUPS.map(x => `<button class="nav-pill ${x === g ? 'active' : ''}" data-g="${x.id}">${x.ico} ${x.label}${x.id === 'bantuan' && badge() ? `<span class="sn-badge">${badge()}</span>` : ''}</button>`).join('');
        const ts = tabsOf(g);
        $('sn-sub').style.display = ts.length > 1 ? 'flex' : 'none';
        $('sn-sub').innerHTML = ts.length > 1 ? ts.map(t => `<button class="sn-chip ${t[0] === curTab ? 'active' : ''}" data-t="${t[0]}">${t[1]}${(t[0] === 'laporan-admin' && adminBaru) ? `<span class="sn-badge">${adminBaru}</span>` : ''}</button>`).join('') : '';
        document.querySelectorAll('.admin-guide').forEach(e => e.style.display = isAdmin() ? 'block' : 'none');
        document.querySelectorAll('.guest-guide').forEach(e => e.style.display = isAdmin() ? 'none' : 'block');
    }
    $('sn-main').addEventListener('click', e => {
        const b = e.target.closest('[data-g]'); if (!b) return;
        const g = GROUPS.find(x => x.id === b.dataset.g), ts = tabsOf(g);
        window.switchTab((g.id === 'bantuan' && badge() && ts[1]) ? ts[1][0] : ts[0][0], null);
    });
    $('sn-sub').addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) window.switchTab(b.dataset.t, null); });

    const origSw = window.switchTab;
    window.switchTab = function (tab, btn) {
        origSw(tab, btn);
        curTab = tab; renderNav();
        if (tab === 'lapor' && isGuest()) {
            if (!$('lap-nama').value) $('lap-nama').value = currentUser.name || '';
            $('lap-nim').value = currentUser.nim || '';
            refreshMine(false).then(markAllSeen);
        }
        if (tab === 'laporan-admin') refreshAdmin(false);
    };

    // ---------- Mahasiswa: kirim & pantau laporan ----------
    const seenKey = () => 'a9_lap_seen_' + (currentUser && currentUser.nim);
    const loadSeen = () => { try { seen = JSON.parse(localStorage.getItem(seenKey())) || {}; } catch (e) { seen = {}; } };
    const saveSeen = () => { try { localStorage.setItem(seenKey(), JSON.stringify(seen)); } catch (e) { } };
    const sig = x => x.status + '|' + (x.tglUpdate || '') + '|' + (x.catatan || '');
    const unread = () => mine.filter(x => x.status !== 'baru' && seen[x.id] !== sig(x));
    function markAllSeen() { unread().forEach(x => { seen[x.id] = sig(x); }); saveSeen(); lastUnread = 0; renderUpdateCard(); renderNav(); }

    $('lap-kirim').addEventListener('click', async () => {
        const v = id => $(id).value.trim();
        if (!v('lap-nama')) { alert('Nama wajib diisi.'); return; }
        if (v('lap-isi').length < 10) { alert('Tulis penjelasan minimal 10 karakter ya.'); return; }
        if (!supabaseClient) { alert('Koneksi ke server belum siap. Coba lagi nanti.'); return; }
        const btn = $('lap-kirim'); btn.disabled = true;
        try {
            const list = await fetchLaporan(); // ambil data terbaru dulu supaya laporan lain tidak tertimpa
            list.unshift({ id: Date.now(), tgl: new Date().toISOString(), nama: v('lap-nama'), nim: currentUser.nim || v('lap-nim') || '-', kategori: v('lap-kategori'), lokasi: v('lap-lokasi') || '-', isi: v('lap-isi'), perangkat: navigator.userAgent.slice(0, 90), status: 'baru', catatan: '', tglUpdate: '' });
            await writeLaporan(list.slice(0, 300));
            $('lap-isi').value = ''; $('lap-lokasi').value = '';
            alert('Laporan terkirim. Pantau perkembangannya di Laporan Saya.');
            await refreshMine(false);
        } catch (e) { console.error(e); alert('Gagal mengirim laporan. Coba lagi sebentar lagi.'); }
        btn.disabled = false;
    });

    function renderMine() {
        const el = $('lap-mine'); if (!el) return;
        if (!mine.length) { el.innerHTML = '<p style="color:var(--text-muted);">Belum ada laporan. Laporan yang kamu kirim akan muncul di sini beserta perkembangannya.</p>'; return; }
        el.innerHTML = mine.map(x => {
            const i = x.status === 'selesai' ? 2 : x.status === 'proses' ? 1 : 0;
            return `<div class="lap-item s-${x.status}">
              <div class="lap-top"><span><span class="lap-cat">${esc(x.kategori)}</span> &nbsp;${esc(x.lokasi)}</span><span>${esc(fmt(x.tgl))}</span></div>
              <div class="trk">${['Terkirim', 'Diproses', 'Selesai'].map((t, k) => `<span class="${k <= i ? 'on' : ''}">${t}</span>`).join('')}</div>
              <div class="lap-body">${esc(x.isi)}</div>
              ${x.catatan ? `<div class="lap-note"><strong>Catatan admin:</strong> ${esc(x.catatan)}</div>` : ''}</div>`;
        }).join('');
    }

    function renderUpdateCard() {
        let c = $('lap-update-card'); const u = isGuest() ? unread() : [];
        if (!u.length) { if (c) c.remove(); return; }
        if (!c) {
            c = document.createElement('div'); c.id = 'lap-update-card'; c.className = 'upd-card';
            const ref = document.querySelector('#tab-home .grid-2-1');
            if (ref) ref.before(c); else if ($('tab-home')) $('tab-home').appendChild(c);   // cadangan bila struktur Beranda berbeda
        }
        c.innerHTML = `<h3>\ud83d\udd14 Update laporanmu (${u.length})</h3>
          ${u.map(x => `<div class="upd-row"><strong>${esc(x.kategori)}</strong> (${esc(x.lokasi)}): ${x.status === 'selesai' ? '\u2705 <strong>Selesai</strong>' : '\ud83d\udd35 <strong>Sedang diproses</strong>'}${x.catatan ? `<br><em>Catatan admin: ${esc(x.catatan)}</em>` : ''}</div>`).join('')}
          <div class="lap-acts"><button class="btn btn-primary btn-sm" id="upd-lihat">Lihat laporan saya</button><button class="btn btn-outline btn-sm" id="upd-baca">Tandai sudah dibaca</button></div>`;
        $('upd-lihat').onclick = () => window.switchTab('lapor', null);
        $('upd-baca').onclick = markAllSeen;
    }

    async function refreshMine(notify) {
        if (!isGuest() || !supabaseClient) return;
        try {
            loadSeen();
            mine = (await fetchLaporan()).filter(x => x.nim === currentUser.nim);
            const n = unread().length;
            if (n > 0 && (notify || n > lastUnread)) alert(`\ud83d\udd14 Ada ${n} update untuk laporanmu. Lihat di Beranda.`);
            lastUnread = n; renderMine(); renderUpdateCard(); renderNav();
        } catch (e) { console.error('Gagal memuat laporan:', e); }
    }

    // ---------- Admin: kelola laporan ----------
    function renderAdmin() {
        const all = dbData.laporan || [];
        adminBaru = all.filter(x => x.status !== 'selesai').length;
        document.querySelectorAll('.lap-filter').forEach(b => b.classList.toggle('active', b.dataset.f === filter));
        const shown = all.filter(x => filter === 'semua' || (filter === 'baru' ? x.status !== 'selesai' : x.status === 'selesai'));
        $('lap-list').innerHTML = shown.length ? shown.map(x => `
          <div class="lap-item s-${x.status}">
            <div class="lap-top"><span><span class="lap-cat">${esc(x.kategori)}</span> &nbsp;<strong>${esc(x.nama)}</strong> (${esc(x.nim)}) \u00b7 <strong>${esc(STAT[x.status] || x.status)}</strong></span><span>${esc(fmt(x.tgl))}</span></div>
            <small>Bagian: <strong>${esc(x.lokasi)}</strong></small>
            <div class="lap-body">${esc(x.isi)}</div>
            <small style="color:var(--text-muted)">${esc(x.perangkat)}</small>
            <input type="text" class="modern-input" style="margin-top:8px;" data-note="${x.id}" value="${esc(x.catatan || '')}" placeholder="Catatan untuk pelapor (opsional)">
            <div class="lap-acts">
              ${x.status !== 'proses' ? `<button class="btn btn-sm btn-outline" data-act="proses" data-id="${x.id}">\ud83d\udd35 Proses</button>` : ''}
              ${x.status !== 'selesai' ? `<button class="btn btn-sm btn-primary" data-act="selesai" data-id="${x.id}">\u2705 Selesai</button>` : ''}
              ${x.status !== 'baru' ? `<button class="btn btn-sm btn-outline" data-act="baru" data-id="${x.id}">\u21a9\ufe0f Buka lagi</button>` : ''}
              <button class="btn btn-sm btn-danger" data-act="del" data-id="${x.id}">Hapus</button>
            </div></div>`).join('') : '<p style="color:var(--text-muted);">Tidak ada laporan di kategori ini.</p>';
        renderNav();
    }

    async function refreshAdmin(notify) {
        if (!isAdmin() || !supabaseClient) return;
        try {
            dbData.laporan = await fetchLaporan();
            const baru = dbData.laporan.filter(x => x.status !== 'selesai').length;
            if (baru > 0 && (notify || baru > lastBaru)) alert(`\ud83d\udd14 Ada ${baru} laporan belum selesai. Buka Bantuan, Laporan Masuk.`);
            lastBaru = baru; renderAdmin();
        } catch (e) { console.error('Gagal memuat laporan:', e); }
    }

    async function mutate(fn) {
        try {
            const out = fn(await fetchLaporan());
            await writeLaporan(out);
            dbData.laporan = out; lastBaru = out.filter(x => x.status !== 'selesai').length; renderAdmin();
        } catch (e) { console.error(e); alert('Gagal memperbarui laporan.'); }
    }

    $('lap-list').addEventListener('click', e => {
        const b = e.target.closest('button[data-act]'); if (!b) return;
        const id = +b.dataset.id, act = b.dataset.act;
        if (act === 'del') { if (confirm('Hapus laporan ini secara permanen?')) mutate(l => l.filter(x => x.id !== id)); return; }
        const note = (document.querySelector(`[data-note="${id}"]`) || {}).value || '';
        mutate(l => l.map(x => x.id === id ? Object.assign({}, x, { status: act, catatan: note.trim(), tglUpdate: new Date().toISOString() }) : x));
    });
    document.querySelectorAll('.lap-filter').forEach(b => b.addEventListener('click', () => { filter = b.dataset.f; renderAdmin(); }));
    $('lap-refresh').addEventListener('click', () => refreshAdmin(false));

    // ---------- Saat login ----------
    const origLogin = window.finishLogin;
    window.finishLogin = function () {
        origLogin();
        curTab = 'home'; renderNav();
        if (poll) clearInterval(poll);
        if (isAdmin()) { refreshAdmin(true); poll = setInterval(() => refreshAdmin(false), 60000); }
        else if (isGuest()) {
            if ($('lap-nama')) $('lap-nama').value = currentUser.name || '';
            refreshMine(true); poll = setInterval(() => refreshMine(false), 60000);
        }
    };
    renderNav();
})();

// ==========================================================================
// BAGIAN 4 - CBT MODEL UJIAN (SATU SOAL PER HALAMAN) + HASIL TERSIMPAN + PROGRES + GOOGLE DRIVE
// ==========================================================================
(function () {
    const $ = id => document.getElementById(id);
    const esc = x => String(x == null ? '' : x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const isGuest = () => typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'guest';
    const L = ['A', 'B', 'C', 'D', 'E'];
    const JENIS = { 'cbt-ujian': 'CBT (Ujian)', 'cbt-latihan': 'CBT (Latihan)', 'isian': 'Soal Isian' };
    const fmtTgl = t => new Date(t).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

    const st = document.createElement('style');
    st.textContent = `
    #cbt-question-container { scroll-margin-top: 170px; }
    .cbtx { display: grid; grid-template-columns: 1fr 290px; gap: 22px; align-items: start; }
    .cbtx-main { min-width: 0; }
    .cbtx-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
    .cbtx-title { font-weight: 800; color: var(--primary); font-size: 17px; }
    button.option-label { width: 100%; text-align: left; font: inherit; color: inherit; }
    button.option-label:disabled { opacity: 1; cursor: default; }
    button.option-label.picked { border-color: var(--primary); background: var(--primary-light); }
    .cbtx-nav { display: flex; justify-content: space-between; gap: 10px; margin-top: 22px; flex-wrap: wrap; }
    .cbtx-side { background: var(--bg-base); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 16px; position: sticky; top: 150px; }
    .cbtx-side h4 { font-size: 15px; margin-bottom: 4px; }
    .cx-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(40px, 1fr)); gap: 6px; margin: 12px 0; max-height: 44vh; overflow-y: auto; padding: 2px; }
    .cx-btn { padding: 8px 0; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-main); font-weight: 700; font-size: 13px; cursor: pointer; position: relative; }
    .cx-btn.done { background: var(--primary); color: #fff; border-color: var(--primary); }
    .cx-btn.ok { background: #10b981; color: #fff; border-color: #10b981; }
    .cx-btn.bad { background: #ef4444; color: #fff; border-color: #ef4444; }
    .cx-btn.blank { background: var(--border-color); }
    .cx-btn.flag::after { content: ''; position: absolute; top: 2px; right: 2px; width: 9px; height: 9px; border-radius: 50%; background: var(--warning); border: 1px solid #fff; }
    .cx-btn.cur { outline: 3px solid var(--text-main); outline-offset: 1px; }
    .cx-legend { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 12px; color: var(--text-muted); }
    .cx-legend i { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 4px; vertical-align: -1px; border: 1px solid var(--border-color); }
    .cx-stats { font-size: 13px; margin: 10px 0; }
    .cx-side-acts { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
    .cx-toggle { display: none; }
    @media (max-width: 900px) { .cbtx { grid-template-columns: 1fr; } .cbtx-side { position: static; display: none; } .cbtx-side.open { display: block; } .cx-toggle { display: inline-flex; } }
    .apres { background: var(--primary); color: #fff; border-radius: var(--radius-lg); padding: 20px; text-align: center; margin-bottom: 16px; }
    .apres .big { font-size: 42px; } .apres h4 { font-size: 20px; margin: 4px 0; } .apres p { font-size: 14px; opacity: .95; margin: 0 0 8px; }
    .apres .cmp { font-weight: 700; background: rgba(255,255,255,.2); border-radius: 20px; display: inline-block; padding: 3px 14px; font-size: 13px; }
    .prog-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; margin-bottom: 18px; }
    .prog-stat { background: var(--bg-base); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px; text-align: center; }
    .prog-stat b { display: block; font-size: 26px; color: var(--primary); } .prog-stat small { color: var(--text-muted); }
    .prog-chart { width: 100%; height: auto; background: var(--bg-base); border: 1px solid var(--border-color); border-radius: var(--radius-md); margin-bottom: 16px; }
    .prog-trend { background: var(--primary-light); border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 16px; font-weight: 600; }`;
    document.head.appendChild(st);

    // ================= Hasil tersimpan (per NIM) =================
    let myResults = [];
    const rKey = () => 'hasil_' + currentUser.nim;
    async function loadResults() {
        if (!isGuest() || !supabaseClient) return myResults;
        try {
            const { data, error } = await supabaseClient.from('portal_db').select('value').eq('key', rKey()).maybeSingle();
            if (error) throw error;
            let v = data && data.value;
            if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { v = []; } }
            myResults = Array.isArray(v) ? v : [];
        } catch (e) { console.error('Gagal memuat hasil:', e); }
        return myResults;
    }
    async function saveResult(r) {
        if (!isGuest() || !supabaseClient) return;
        try {
            const cur = await loadResults();
            const next = cur.concat([r]).slice(-100);
            const { error } = await supabaseClient.from('portal_db').upsert({ key: rKey(), value: next }, { onConflict: 'key' });
            if (error) throw error;
            myResults = next;
        } catch (e) { console.error(e); alert('Hasil belum tersimpan ke server. Cek koneksi internetmu.'); }
    }
    function prevScore(jenis) {
        if (!isGuest()) return undefined;
        const a = myResults.filter(r => r.jenis === jenis);
        return a.length ? a[a.length - 1].skor : null;
    }
    function apresiasi(skor, prev) {
        let ico = '\ud83c\udf31', t = 'Terus berlatih!', m = 'Setiap latihan membuatmu lebih siap. Baca pembahasan soal yang salah, lalu coba lagi.';
        if (skor >= 85) { ico = '\ud83c\udfc6'; t = 'Luar biasa!'; m = 'Pemahamanmu sangat baik. Pertahankan, dan bantu temanmu yang masih belajar.'; }
        else if (skor >= 70) { ico = '\ud83d\udc4f'; t = 'Bagus sekali!'; m = 'Kamu sudah menguasai sebagian besar materi. Sedikit lagi menuju sempurna.'; }
        else if (skor >= 50) { ico = '\ud83d\udcaa'; t = 'Sudah di jalur yang benar!'; m = 'Fokus pada topik yang masih sering salah di rekomendasi belajar.'; }
        let cmp = '';
        if (prev === null) cmp = '\ud83c\udfaf Ini pengerjaan pertamamu, jadikan patokan untuk berikutnya';
        else if (prev !== undefined) { const d = skor - prev; cmp = d > 0 ? `\ud83d\udcc8 Naik ${d} poin dari pengerjaan sebelumnya` : d < 0 ? `\ud83d\udcc9 Turun ${-d} poin dari pengerjaan sebelumnya` : '\u2796 Sama dengan pengerjaan sebelumnya'; }
        return `<div class="apres"><div class="big">${ico}</div><h4>${t}</h4><p>${m}</p>${cmp ? `<span class="cmp">${cmp}</span>` : ''}</div>`;
    }

    // ================= CBT satu soal per halaman =================
    let cbt = null, timer = null;
    const leaveGuard = e => { e.preventDefault(); e.returnValue = ''; };
    const active = () => cbt && $('cbt-active-area') && $('cbt-active-area').style.display === 'block';

    window.startCBT = function (mode) {
        if (cbtStarted) return;
        const bank = dbData.cbt_soal || [];
        if (!bank.length) { alert('Soal CBT belum tersedia di database (key: cbt_soal).'); return; }
        const qs = bank.slice();
        for (let i = qs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [qs[i], qs[j]] = [qs[j], qs[i]]; }
        cbt = { mode, qs: qs.slice(0, 100), idx: 0, ans: {}, flag: {}, chk: {}, leaves: 0, away: false, review: false, side: false, startedAt: Date.now(), endAt: mode === 'exam' ? Date.now() + EXAM_DURATION * 1000 : 0 };
        cbtStarted = true; cbtMode = mode; cbtTimeInSeconds = mode === 'exam' ? EXAM_DURATION : 0;
        const tm = $('cbt-timer'); tm.style.display = mode === 'exam' ? '' : 'none'; tm.textContent = cbtFormatTime(cbtTimeInSeconds);
        $('cbt-start-card').style.display = 'none'; $('cbt-result-card').style.display = 'none'; $('cbt-active-area').style.display = 'block';
        const ft = document.querySelector('#cbt-active-area .cbt-footer'); if (ft) ft.style.display = 'none';
        if (timer) clearInterval(timer);
        if (mode === 'exam') timer = setInterval(tick, 500);
        window.addEventListener('beforeunload', leaveGuard);
        loadResults();
        renderCbt(); window.scrollTo({ top: 0 });
    };

    function tick() {
        if (!cbt || cbt.mode !== 'exam') return;
        const rem = Math.max(0, Math.ceil((cbt.endAt - Date.now()) / 1000));
        cbtTimeInSeconds = rem; $('cbt-timer').textContent = cbtFormatTime(rem); document.querySelectorAll('[data-timer]').forEach(e => { e.textContent = cbtFormatTime(rem); });
        if (rem <= 0) { clearInterval(timer); timer = null; alert('\u23f0 Waktu habis! Jawaban dikumpulkan otomatis.'); finish(); }
    }

    function renderCbt() {
        const c = cbt, q = c.qs[c.idx], n = c.qs.length, ans = c.ans[q.id], rv = c.review, pr = c.mode === 'practice';
        // Mode latihan: jawaban disimpan dulu, benar/salah baru tampil setelah "Periksa jawaban"
        const reveal = rv || (pr && !!c.chk[q.id]);
        const opts = q.options.map((o, i) => {
            let cls = 'option-label';
            if (reveal) { if (o === q.answer) cls += ' correct-answer'; else if (o === ans) cls += ' wrong-answer'; }
            else if (ans === o) cls += ' picked';
            return `<li><button type="button" class="${cls}" data-opt="${i}"${reveal ? ' disabled' : ''}><span class="option-text"><strong>${L[i]}.</strong> ${esc(o)}</span></button></li>`;
        }).join('');
        let fb = '';
        if (reveal) {
            const ok = ans === q.answer;
            const head = ans === undefined ? '\u26aa <strong>Tidak dijawab.</strong>' : ok ? '\u2705 <strong>Benar!</strong>' : '\u274c <strong>Salah.</strong>';
            fb = `<div class="cbt-feedback ${ok ? 'feedback-success' : 'feedback-danger'}" style="display:block;">${head}${ok ? '' : ` Jawaban benar: <strong>${esc(q.answer)}</strong>`}${rv && q.topic ? `<br><small>Topik: ${esc(q.topic)}</small>` : ''}<br><br><em>Pembahasan:</em> ${esc(cleanText(q.explanation || 'Belum ada pembahasan untuk soal ini.'))}</div>`;
        }
        const img = q.image ? `<div class="cbt-image-container"><img src="${esc(q.image)}" class="cbt-image" alt="Ilustrasi soal" referrerpolicy="no-referrer" onerror="this.style.display='none'"><small style="display:block;color:var(--text-muted);margin-top:6px;font-size:11px;">${esc(q.image_credit || '')}</small></div>` : '';

        const answered = Object.keys(c.ans).length, flagged = Object.keys(c.flag).length;
        const grid = c.qs.map((x, i) => {
            const a = c.ans[x.id]; let s = '';
            if (rv) s = a === undefined ? 'blank' : a === x.answer ? 'ok' : 'bad';
            else if (pr && c.chk[x.id]) s = a === x.answer ? 'ok' : 'bad';
            else if (a !== undefined) s = 'done';
            return `<button type="button" class="cx-btn ${s}${c.flag[x.id] ? ' flag' : ''}${i === c.idx ? ' cur' : ''}" data-go="${i}" aria-label="Soal ${i + 1}">${i + 1}</button>`;
        }).join('');
        const sw = (bg, t) => `<span><i style="background:${bg}"></i>${t}</span>`;
        const legend = rv ? sw('#10b981', 'Benar') + sw('#ef4444', 'Salah') + sw('var(--border-color)', 'Kosong')
            : pr ? sw('var(--bg-card)', 'Belum') + sw('var(--primary)', 'Terjawab (belum diperiksa)') + sw('#10b981', 'Benar') + sw('#ef4444', 'Salah') + sw('var(--warning)', 'Ragu')
                : sw('var(--bg-card)', 'Belum dikerjakan') + sw('var(--primary)', 'Sudah dijawab') + sw('var(--warning)', 'Ragu-ragu');
        const stats = rv ? `Review: ${Object.keys(c.ans).filter(id => { const x = c.qs.find(y => String(y.id) === id); return x && c.ans[id] === x.answer; }).length} benar dari ${n} soal`
            : `Terjawab <strong>${answered}</strong> \u00b7 Ragu <strong>${flagged}</strong> \u00b7 Belum <strong>${n - answered}</strong>`;
        const acts = rv ? '<button class="btn btn-primary" data-act="back">\u2190 Kembali ke laporan</button>'
            : `<button class="btn btn-outline" data-act="blank">\u23ed Ke soal belum dijawab</button><button class="btn btn-primary" data-act="submit">${c.mode === 'exam' ? '\ud83d\udce4 Kumpulkan Jawaban' : '\u2705 Selesai Latihan'}</button>`;

        $('cbt-question-container').innerHTML = `
        <div class="cbtx">
          <div class="cbtx-main">
            <div class="cbtx-head">
              <span class="cbtx-title">${rv ? '\ud83d\udcd6 Review \u00b7 ' : ''}Soal ${c.idx + 1} dari ${n}</span>
              <span style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn btn-outline btn-sm" data-act="exit">\ud83c\udfe0 Beranda CBT</button>
                <button class="btn btn-outline btn-sm cx-toggle" data-act="side">\ud83d\udccb Daftar soal</button>
                ${rv ? '' : `<button class="btn btn-outline btn-sm" data-act="flag">${c.flag[q.id] ? '\ud83d\udea9 Ragu-ragu (klik untuk batal)' : '\ud83c\udff3\ufe0f Tandai ragu-ragu'}</button>`}
              </span>
            </div>
            <div class="q-text">${q.text}</div>
            ${img}
            <ul class="options">${opts}</ul>
            ${fb}
            <div class="cbtx-nav">
              <button class="btn btn-outline" data-act="prev"${c.idx === 0 ? ' disabled' : ''}>\u25c0 Sebelumnya</button>
              ${c.mode === 'exam' && !rv ? `<span class="cbtx-time" data-timer>${cbtFormatTime(cbtTimeInSeconds)}</span>` : ''}
              ${pr && !rv ? `<button class="btn btn-primary" data-act="check"${ans === undefined || c.chk[q.id] ? ' disabled' : ''}>\u2714 Periksa jawaban</button>` : ''}
              <button class="btn btn-primary" data-act="next"${c.idx === n - 1 ? ' disabled' : ''}>Berikutnya \u25b6</button>
            </div>
          </div>
          <aside class="cbtx-side${c.side ? ' open' : ''}">
            <div class="cx-sidehead"><h4>Daftar Soal</h4><button type="button" class="btn btn-outline btn-sm cx-close" data-act="side">\u2715 Tutup</button></div>
            <div class="cx-legend">${legend}</div>
            <div class="cx-grid">${grid}</div>
            <div class="cx-stats">${stats}</div>
            <div class="cx-side-acts">${acts}</div>
          </aside>
        </div>`;
    }

    function go(i) {
        if (!cbt) return;
        cbt.idx = Math.max(0, Math.min(cbt.qs.length - 1, i));
        if (window.innerWidth <= 900) cbt.side = false;   // di HP daftar soal menutup setelah memilih nomor
        renderCbt();
        const nx = cbt.qs[cbt.idx + 1]; if (nx && nx.image) { new Image().src = nx.image; }
        $('cbt-question-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    // Memilih jawaban hanya menyimpannya (bisa diganti atau dibatalkan dengan klik lagi)
    function pick(i) {
        if (!cbt || cbt.review) return;
        const c = cbt, q = c.qs[c.idx];
        const o = q.options[i]; if (o === undefined) return;
        if (c.mode === 'practice' && c.chk[q.id]) return;      // sudah diperiksa: terkunci
        if (c.ans[q.id] === o) delete c.ans[q.id]; else c.ans[q.id] = o;
        renderCbt();
    }
    function checkAns() {
        if (!cbt || cbt.mode !== 'practice' || cbt.review) return;
        const q = cbt.qs[cbt.idx];
        if (cbt.ans[q.id] === undefined) { alert('Pilih jawaban dulu.'); return; }
        cbt.chk[q.id] = true; renderCbt();
    }
    function exitCbt() {
        if (!cbt) return;
        if (!cbt.review && !confirm(cbt.mode === 'exam'
            ? 'Keluar dari CBT? Ujian dibatalkan, jawabanmu tidak dinilai dan tidak tersimpan.'
            : 'Kembali ke beranda CBT? Latihan ini tidak dinilai dan tidak tersimpan.')) return;
        window.resetCBT();   // kembali ke kartu pilihan mode
    }
    function toggleFlag() { const q = cbt.qs[cbt.idx]; if (cbt.flag[q.id]) delete cbt.flag[q.id]; else cbt.flag[q.id] = true; renderCbt(); }
    function jumpBlank() {
        const n = cbt.qs.length;
        for (let k = 1; k <= n; k++) { const i = (cbt.idx + k) % n; if (cbt.ans[cbt.qs[i].id] === undefined) { go(i); return; } }
        alert('Semua soal sudah dijawab \ud83c\udf89');
    }

    $('cbt-question-container').addEventListener('click', e => {
        if (!cbt) return;
        const o = e.target.closest('[data-opt]'); if (o) { pick(+o.dataset.opt); return; }
        const g = e.target.closest('[data-go]'); if (g) { go(+g.dataset.go); return; }
        const a = e.target.closest('[data-act]'); if (!a) return;
        const act = a.dataset.act;
        if (act === 'prev') go(cbt.idx - 1);
        else if (act === 'next') go(cbt.idx + 1);
        else if (act === 'flag') toggleFlag();
        else if (act === 'blank') jumpBlank();
        else if (act === 'submit') window.submitCBT();
        else if (act === 'back') showReport();
        else if (act === 'check') checkAns();
        else if (act === 'exit') exitCbt();
        else if (act === 'side') { cbt.side = !cbt.side; renderCbt(); }
    });

    document.addEventListener('keydown', e => {
        if (!active() || e.ctrlKey || e.metaKey || e.altKey) return;
        const tg = e.target.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA' || tg === 'SELECT') return;
        const k = e.key.toLowerCase();
        if (k === 'arrowright') { go(cbt.idx + 1); e.preventDefault(); }
        else if (k === 'arrowleft') { go(cbt.idx - 1); e.preventDefault(); }
        else if (k === 'f' && !cbt.review) toggleFlag();
        else if (k.length === 1) { const n = 'abcde'.indexOf(k) >= 0 ? 'abcde'.indexOf(k) : '12345'.indexOf(k); if (n >= 0) pick(n); }
    });

    // Mode ujian: catat berapa kali peserta meninggalkan halaman (browser tidak bisa mencegahnya)
    document.addEventListener('visibilitychange', () => {
        if (!cbt || cbt.mode !== 'exam' || !cbtStarted) return;
        if (document.hidden) { cbt.leaves++; cbt.away = true; }
        else if (cbt.away) { cbt.away = false; alert(`\u26a0\ufe0f Kamu meninggalkan halaman ujian (${cbt.leaves}\u00d7). Tetap fokus di CBT ya.`); }
    });

    window.submitCBT = function () {
        if (!cbt || cbt.review) return;
        const n = cbt.qs.length, done = Object.keys(cbt.ans).length, fl = Object.keys(cbt.flag).length;
        const verb = cbt.mode === 'exam' ? 'mengumpulkan' : 'menyelesaikan';
        const msg = done < n ? `Kamu baru menjawab ${done} dari ${n} soal${fl ? ` dan menandai ${fl} soal ragu-ragu` : ''}. Yakin ingin ${verb}?`
            : `Semua soal sudah dijawab${fl ? ` (${fl} ditandai ragu-ragu)` : ''}. Yakin ingin ${verb}?`;
        if (!confirm(msg)) return;
        finish();
    };

    function finish() {
        if (!cbt) return;
        if (timer) { clearInterval(timer); timer = null; }
        window.removeEventListener('beforeunload', leaveGuard);
        cbtStarted = false;
        const c = cbt, n = c.qs.length;
        let benar = 0, salah = 0, kosong = 0; const wrong = {};
        c.qs.forEach(q => {
            const a = c.ans[q.id];
            if (a === undefined) kosong++; else if (a === q.answer) benar++; else salah++;
            if (a !== q.answer && q.topic) wrong[q.topic] = (wrong[q.topic] || 0) + 1;
        });
        const skor = n ? Math.round(benar / n * 100) : 0;
        const durasi = Math.min(Math.round((Date.now() - c.startedAt) / 1000), c.mode === 'exam' ? EXAM_DURATION : 1e9);
        const jenis = c.mode === 'exam' ? 'cbt-ujian' : 'cbt-latihan';
        c.result = { benar, salah, kosong, skor, durasi, wrong, jenis, leaves: c.leaves || 0, prev: prevScore(jenis) };
        if (isGuest()) saveResult({ t: Date.now(), jenis, skor, benar, total: n, kosong, durasi, wrong });
        showReport();
    }

    function showReport() {
        const c = cbt; if (!c || !c.result) return;
        c.review = false; const r = c.result;
        const topics = Object.entries(r.wrong).sort((a, b) => b[1] - a[1]);
        $('cbt-report-content').innerHTML = `
          ${apresiasi(r.skor, r.prev)}
          <div class="report-score"><h4>Nilai Akhir</h4><div class="score-number">${r.skor}</div><small style="color:var(--text-muted);">Skala 0 - 100 \u00b7 ${c.mode === 'exam' ? 'Mode CBT' : 'Mode Latihan'}</small></div>
          <div class="report-row"><span>Jawaban Benar</span><span class="report-value report-correct">${r.benar} Soal</span></div>
          <div class="report-row"><span>Jawaban Salah</span><span class="report-value report-wrong">${r.salah} Soal</span></div>
          <div class="report-row"><span>Tidak Dijawab</span><span class="report-value">${r.kosong} Soal</span></div>
          <div class="report-row"><span>Waktu Pengerjaan</span><span class="report-value">${cbtFormatTime(r.durasi)}</span></div>
          ${r.leaves ? `<div class="report-row"><span>Keluar dari halaman ujian</span><span class="report-value report-wrong">${r.leaves}\u00d7</span></div>` : ''}
          ${topics.length ? `<div class="report-recommendation"><h5>\ud83d\udcda Rekomendasi Belajar (Fokus Tingkatkan):</h5><ul>${topics.map(([t, k]) => `<li><strong>${esc(t)}</strong> (${k} soal)</li>`).join('')}</ul></div>`
                : `<div class="report-recommendation" style="background:#ecfdf5;border-color:#10b981;"><h5 style="color:#065f46;">\ud83c\udf1f Luar Biasa!</h5><ul style="color:#065f46;"><li>Semua jawabanmu benar.</li></ul></div>`}
          <div class="lap-acts" style="margin-top:18px;justify-content:center;">
            <button class="btn btn-primary" data-rep="review">\ud83d\udcd6 Review &amp; Pembahasan</button>
            <button class="btn btn-outline" data-rep="progres">\ud83d\udcc8 Lihat Progres</button>
          </div>
          ${isGuest() ? '<p style="font-size:12px;color:var(--text-muted);margin-top:12px;text-align:center;">Hasil ini tersimpan otomatis di akunmu.</p>' : ''}`;
        $('cbt-active-area').style.display = 'none'; $('cbt-result-card').style.display = 'block';
        window.scrollTo({ top: 0 });
    }

    $('cbt-report-content').addEventListener('click', e => {
        const b = e.target.closest('[data-rep]'); if (!b || !cbt) return;
        if (b.dataset.rep === 'review') { cbt.review = true; cbt.idx = 0; $('cbt-result-card').style.display = 'none'; $('cbt-active-area').style.display = 'block'; renderCbt(); window.scrollTo({ top: 0 }); }
        else window.switchTab('progres', null);
    });

    window.resetCBT = function () {
        if (timer) { clearInterval(timer); timer = null; }
        window.removeEventListener('beforeunload', leaveGuard);
        cbt = null; cbtStarted = false; cbtTimeInSeconds = 0;
        const tm = $('cbt-timer'); tm.style.display = ''; tm.textContent = '00:00:00'; tm.classList.remove('cbt-timer-warn');
        $('cbt-start-card').style.display = 'block'; $('cbt-active-area').style.display = 'none'; $('cbt-result-card').style.display = 'none';
        $('cbt-question-container').innerHTML = '';
    };

    // ================= Soal isian: apresiasi + simpan hasil =================
    const origSubmitQuiz = window.submitQuiz;
    window.submitQuiz = function () {
        origSubmitQuiz();
        const total = dbData.soal.length, benar = document.querySelectorAll('#soal-cards-container .feedback-success').length;
        const skor = total ? Math.round(benar / total * 100) : 0;
        const card = $('quiz-result-card');
        card.querySelectorAll('.apres').forEach(x => x.remove());
        card.insertAdjacentHTML('afterbegin', apresiasi(skor, prevScore('isian')));
        if (isGuest()) saveResult({ t: Date.now(), jenis: 'isian', skor, benar, total, kosong: total - document.querySelectorAll('#soal-cards-container .feedback-success, #soal-cards-container .feedback-danger').length, durasi: 0, wrong: {} });
    };

    // ================= Halaman Progres =================
    $('tab-lapor').insertAdjacentHTML('afterend', `
    <div id="tab-progres" class="tab-content" style="display:none;">
      <div class="card">
        <div class="card-header flex-between"><h3 class="card-title">\ud83d\udcc8 Progres Belajar Saya</h3>
          <select id="prog-filter" class="modern-input" style="width:auto;margin:0;"><option value="all">Semua pengerjaan</option><option value="cbt-ujian">CBT (Ujian)</option><option value="cbt-latihan">CBT (Latihan)</option><option value="isian">Soal Isian</option></select></div>
        <div id="progres-body"></div>
      </div>
    </div>`);

    function chart(arr) {
        const pts = arr.slice(-20), W = 640, H = 200, P = 30;
        const x = i => P + (pts.length === 1 ? (W - 2 * P) / 2 : i * (W - 2 * P) / (pts.length - 1));
        const y = v => H - P - (v / 100) * (H - 2 * P);
        const grid = [0, 50, 100].map(v => `<line x1="${P}" x2="${W - P}" y1="${y(v)}" y2="${y(v)}" style="stroke:var(--border-color)"/><text x="4" y="${y(v) + 4}" style="fill:var(--text-muted);font-size:11px">${v}</text>`).join('');
        const line = pts.map((r, i) => `${x(i).toFixed(1)},${y(r.skor).toFixed(1)}`).join(' ');
        const dots = pts.map((r, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(r.skor).toFixed(1)}" r="5" style="fill:var(--primary)"><title>${esc(fmtTgl(r.t))}: ${r.skor}</title></circle><text x="${x(i).toFixed(1)}" y="${(y(r.skor) - 10).toFixed(1)}" text-anchor="middle" style="fill:var(--text-main);font-size:11px;font-weight:700">${r.skor}</text>`).join('');
        return `<svg class="prog-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafik nilai dari waktu ke waktu">${grid}<polyline points="${line}" style="fill:none;stroke:var(--primary);stroke-width:3"/>${dots}</svg>`;
    }

    function renderProgress() {
        const el = $('progres-body');
        if (!isGuest()) { el.innerHTML = '<p style="color:var(--text-muted);">Halaman ini menampilkan progres belajar mahasiswa setelah mengerjakan soal.</p>'; return; }
        const f = $('prog-filter').value;
        const arr = myResults.filter(r => f === 'all' || r.jenis === f).sort((a, b) => a.t - b.t);
        if (!arr.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">\ud83c\udf31</div><h3>Belum ada hasil</h3><p>Kerjakan CBT atau Soal Isian. Nilaimu otomatis tersimpan di sini supaya kamu bisa melihat peningkatannya.</p></div>'; return; }
        const avg = a => a.length ? Math.round(a.reduce((s, r) => s + r.skor, 0) / a.length) : 0;
        const last = arr[arr.length - 1], best = Math.max(...arr.map(r => r.skor));
        let trend = 'Kerjakan satu sesi lagi untuk melihat perbandingannya.';
        if (arr.length >= 2) {
            const d = last.skor - arr[arr.length - 2].skor;
            trend = d > 0 ? `\ud83d\udcc8 Nilai terakhirmu naik ${d} poin dari sebelumnya. Pertahankan!` : d < 0 ? `\ud83d\udcc9 Nilai terakhirmu turun ${-d} poin dari sebelumnya. Cek pembahasan soal yang salah.` : '\u2796 Nilai terakhirmu sama dengan sebelumnya.';
            if (arr.length >= 4) { const a1 = avg(arr.slice(-3)), a0 = avg(arr.slice(Math.max(0, arr.length - 6), arr.length - 3)); const dd = a1 - a0; trend += ` Rata-rata 3 terakhir ${dd >= 0 ? 'naik' : 'turun'} ${Math.abs(dd)} poin dibanding 3 sebelumnya.`; }
        }
        const wrongAgg = {}; arr.forEach(r => Object.entries(r.wrong || {}).forEach(([t, k]) => { wrongAgg[t] = (wrongAgg[t] || 0) + k; }));
        const weak = Object.entries(wrongAgg).sort((a, b) => b[1] - a[1]).slice(0, 5);
        el.innerHTML = `
          <div class="prog-stats">
            <div class="prog-stat"><b>${arr.length}</b><small>Pengerjaan</small></div>
            <div class="prog-stat"><b>${avg(arr)}</b><small>Rata-rata</small></div>
            <div class="prog-stat"><b>${best}</b><small>Terbaik</small></div>
            <div class="prog-stat"><b>${last.skor}</b><small>Terakhir</small></div>
          </div>
          <div class="prog-trend">${trend}</div>
          ${chart(arr)}
          ${weak.length ? `<div class="report-recommendation" style="margin-bottom:16px;"><h5>\ud83c\udfaf Topik yang perlu diperkuat</h5><ul>${weak.map(([t, k]) => `<li><strong>${esc(t)}</strong> (${k} kali salah)</li>`).join('')}</ul></div>` : ''}
          <div class="table-responsive"><table class="modern-table"><thead><tr><th>Tanggal</th><th>Jenis</th><th>Nilai</th><th>Benar</th><th>Waktu</th></tr></thead><tbody>
            ${arr.slice().reverse().slice(0, 10).map(r => `<tr><td data-label="Tanggal">${esc(fmtTgl(r.t))}</td><td data-label="Jenis">${esc(JENIS[r.jenis] || r.jenis)}</td><td data-label="Nilai"><strong>${r.skor}</strong></td><td data-label="Benar">${r.benar}/${r.total}</td><td data-label="Waktu">${r.durasi ? cbtFormatTime(r.durasi) : '-'}</td></tr>`).join('')}
          </tbody></table></div>`;
    }
    $('prog-filter').addEventListener('change', renderProgress);

    const osw = window.switchTab;
    window.switchTab = async function (t, b) {
        osw(t, b);
        if (t === 'progres') { if (isGuest()) { $('progres-body').innerHTML = '<p>Memuat...</p>'; await loadResults(); } renderProgress(); }
    };
    const olog = window.finishLogin;
    window.finishLogin = function () { olog(); if (isGuest()) loadResults(); };

    // ================= Google Drive: pratinjau di portal =================
    function driveInfo(u) {
        let m;
        if ((m = u.match(/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([\w-]+)/))) return { open: u, embed: `https://drive.google.com/embeddedfolderview?id=${m[1]}#list`, download: null };
        if ((m = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/)) || (m = u.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([\w-]+)/)))
            return { open: `https://drive.google.com/file/d/${m[1]}/view`, embed: `https://drive.google.com/file/d/${m[1]}/preview`, download: `https://drive.google.com/uc?export=download&id=${m[1]}` };
        if ((m = u.match(/docs\.google\.com\/(document|presentation|spreadsheets)\/d\/([\w-]+)/))) return { open: u, embed: `https://docs.google.com/${m[1]}/d/${m[2]}/preview`, download: null };
        return null;
    }
    function openDrive(info) {
        openPreviewModal(info.embed);
        $('preview-title').textContent = 'Pratinjau berkas';
        let bar = $('preview-links');
        if (!bar) { bar = document.createElement('div'); bar.id = 'preview-links'; bar.style.cssText = 'padding:8px 20px;display:flex;gap:16px;font-size:13px;border-bottom:1px solid var(--border-color);'; document.querySelector('#preview-modal .modal-header').after(bar); }
        bar.innerHTML = `<a href="${esc(info.open)}" target="_blank" rel="noopener">\u2197 Buka di Drive</a>${info.download ? `<a href="${esc(info.download)}" target="_blank" rel="noopener">\u2b07 Unduh</a>` : ''}`;
    }
    function wireDrive() {
        document.querySelectorAll('#main-app a[href*="google.com"], #main-app a[href*="youtu"]').forEach(a => {
            if (a.dataset.drive) return;
            const href = a.getAttribute('href') || '';
            const info = driveInfo(href), yt = typeof a9YtId === 'function' && a9YtId(href);
            if (!info && !yt) return;
            a.dataset.drive = '1';
            a.addEventListener('click', e => {
                e.preventDefault();
                if (window.openViewer) window.openViewer({ url: href, title: (a.textContent || '').trim() || 'Berkas' }); else if (info) openDrive(info);
            });
        });
    }
    const orr = window.renderAll;
    window.renderAll = function () { orr(); try { wireDrive(); } catch (e) { } };
    window.wireDriveAll = wireDrive;

    ['t-link-manual', 'lab-link-manual', 'skills-link-manual', 'tut-link-manual', 'm-link-manual'].forEach(id => {
        const el = $(id); if (!el) return;
        el.placeholder = 'Link Google Drive / URL lainnya';
        el.insertAdjacentHTML('afterend', '<small style="display:block;color:var(--text-muted);margin:-4px 0 10px;">\ud83d\udca1 File besar? Upload ke Google Drive, bagikan "Siapa saja yang memiliki link" (Pelihat), lalu tempel link-nya di sini. Lihat Bantuan, Panduan, Panduan Admin.</small>');
    });
    window.renderAll();
})();

// ==========================================================================
// BAGIAN 5 - JADWAL, FOLDER & FILTER MATERI, PROGRES MAHASISWA UNTUK ADMIN
// ==========================================================================
(function () {
    const $ = id => document.getElementById(id);
    const esc = x => String(x == null ? '' : x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const isAdmin = () => typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'admin';
    const fmtTgl = t => new Date(t).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    const JENIS = { 'cbt-ujian': 'CBT (Ujian)', 'cbt-latihan': 'CBT (Latihan)', 'isian': 'Soal Isian' };

    const st = document.createElement('style');
    st.textContent = `
    .chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
    .chip { border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-main); padding: 6px 16px; border-radius: 50px; font-weight: 600; font-size: 13px; cursor: pointer; }
    .chip.active { background: var(--primary); color: #fff; border-color: var(--primary); }
    .jd { border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 14px 18px; margin-bottom: 12px; background: var(--bg-base); }
    .jd.today { border-color: var(--primary); box-shadow: var(--shadow-glow); background: var(--primary-light); }
    .jd-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
    .jd-tag { background: var(--primary); color: #fff; border-radius: 20px; padding: 1px 10px; font-size: 12px; font-weight: 700; }
    .jd-row { display: grid; grid-template-columns: 110px 1fr; gap: 10px; padding: 7px 0; border-top: 1px dashed var(--border-color); font-size: 14px; }
    .jd-jam { color: var(--primary); font-weight: 700; font-variant-numeric: tabular-nums; }
    .fv-bar { display: grid; grid-template-columns: 1fr 220px; gap: 10px; margin-bottom: 6px; }
    .fv-crumb { font-size: 14px; margin-bottom: 12px; color: var(--text-muted); min-height: 22px; }
    .fv-crumb a { color: var(--primary); cursor: pointer; font-weight: 600; }
    .fv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 14px; }
    .fv-folder { background: var(--bg-base); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 18px 14px; text-align: center; cursor: pointer; font: inherit; color: var(--text-main); }
    .fv-folder:hover { border-color: var(--primary); background: var(--primary-light); transform: translateY(-2px); }
    .fv-folder .ico { font-size: 40px; display: block; }
    .fv-folder strong { display: block; margin: 6px 0 2px; font-size: 14px; word-break: break-word; }
    .fv-folder small { color: var(--text-muted); }
    .fv-file { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: var(--radius-md); margin-bottom: 8px; background: var(--bg-base); }
    .fv-file .ico { font-size: 26px; }
    .fv-meta { flex: 1; min-width: 0; } .fv-meta strong { display: block; word-break: break-word; } .fv-meta small { color: var(--text-muted); }
    .pa-trend-up { color: #10b981; font-weight: 700; } .pa-trend-down { color: #ef4444; font-weight: 700; }
    .jd-moved { display: block; font-size: 12px; color: var(--warning); font-weight: 600; margin-top: 2px; }
    .jd-mv { margin-top: 6px; min-height: 32px; padding: 4px 12px; font-size: 12px; }
    @media (max-width: 768px) { .fv-bar { grid-template-columns: 1fr; } .jd-row { grid-template-columns: 1fr; gap: 2px; } }`;
    document.head.appendChild(st);

    // ======================= JADWAL =======================
    const MON = { jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5, jul: 6, agu: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11 };
    function parseTgl(t) {
        const m = String(t).match(/(\d{1,2})[-\s]([A-Za-z]{3})[a-z]*[-\s](\d{2,4})/); if (!m) return null;
        const mo = MON[m[2].toLowerCase()]; if (mo === undefined) return null;
        let y = +m[3]; if (y < 100) y += 2000; return new Date(y, mo, +m[1]);
    }
    const sod = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    let jView = 'dekat';

    const jCard = $('tab-jadwal').querySelector('.card');
    jCard.querySelector('.table-responsive').style.display = 'none';
    jCard.querySelector('.card-title').textContent = '\ud83d\udcc5 Jadwal Kuliah';
    jCard.querySelector('.card-header').insertAdjacentHTML('afterend', `
      <div class="chips" id="jd-chips"><button class="chip active" data-v="dekat">Hari ini &amp; besok</button><button class="chip" data-v="minggu">Minggu ini</button><button class="chip" data-v="semua">Semua</button></div>
      <input type="search" id="jd-search" class="modern-input" placeholder="\ud83d\udd0e Cari kegiatan, dosen, atau hari (contoh: Tutor, Anatomi, Selasa)">
      <div id="jd-view"></div>
      <details class="admin-form-box" style="margin-top:20px;"><summary style="cursor:pointer;font-weight:700;">\u2699\ufe0f Admin: ganti seluruh jadwal (tempel JSON)</summary>
        <p style="font-size:13px;color:var(--text-muted);margin:8px 0;">Tempel isi JSON jadwal. Format array langsung atau {"jadwal": [...]} sama-sama diterima. Ini menggantikan jadwal yang ada.</p>
        <textarea id="jd-json" class="modern-input" style="height:140px;font-family:monospace;font-size:12px;" placeholder='{"jadwal":[{"tgl":"Senin, 21-Sep-26","sesi":[{"jam":"07.50-09.30","kegiatan":"-"}]}]}'></textarea>
        <button class="btn btn-primary" id="jd-save">Simpan jadwal ke database</button></details>`);

    function renderJadwal() {
        const all = a9DropPast((dbData.jadwalCustom || []).filter(j => j && Array.isArray(j.sesi)), sod(new Date()));
        const today = sod(new Date()), tmr = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        const q = ($('jd-search').value || '').trim().toLowerCase();
        const items = all.map(j => ({ j, d: parseTgl(j.tgl) }));
        let shown, note = '';
        if (q) shown = items.filter(x => (x.j.tgl + ' ' + x.j.sesi.map(s => s.jam + ' ' + s.kegiatan).join(' ')).toLowerCase().includes(q));
        else if (jView === 'semua') shown = items;
        else if (jView === 'minggu') {
            const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7)), end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
            shown = items.filter(x => x.d && x.d >= start && x.d <= end);
        } else {
            shown = items.filter(x => x.d && (x.d.getTime() === today.getTime() || x.d.getTime() === tmr.getTime()));
            if (!shown.length) { const nx = items.find(x => x.d && x.d > today); if (nx) { shown = [nx]; note = 'Tidak ada jadwal hari ini atau besok. Ini jadwal terdekat berikutnya:'; } }
        }
        $('jd-view').innerHTML = (note ? `<p style="color:var(--text-muted);margin-bottom:10px;">${note}</p>` : '') +
            (shown.length ? shown.map(({ j, d }) => {
                const isT = d && d.getTime() === today.getTime(), isTm = d && d.getTime() === tmr.getTime();
                const rows = j.sesi.map((s, i) => ({ s, i })).filter(r => r.s && r.s.kegiatan && r.s.kegiatan.trim() !== '-');
                return `<div class="jd ${isT ? 'today' : ''}"><div class="jd-head"><strong>${esc(j.tgl)}</strong>${isT ? '<span class="jd-tag">Hari ini</span>' : isTm ? '<span class="jd-tag" style="background:#3b82f6">Besok</span>' : ''}</div>
                    ${rows.length ? rows.map(({ s, i }) => `<div class="jd-row"><span class="jd-jam">${esc(s.jam)}</span><span>${esc(s.kegiatan)}${s.pindahDari ? `<small class="jd-moved">\ud83d\udd01 Jadwal berubah (semula ${esc(s.pindahDari)})${s.catatan ? ' \u00b7 ' + esc(s.catatan) : ''}</small>` : ''}${isAdmin() ? `<button type="button" class="btn btn-outline btn-sm jd-mv" data-jd-day="${esc(j.tgl)}" data-jd-mv="${i}">\u21aa Pindah</button>` : ''}</span></div>`).join('') : '<div class="jd-row"><span></span><span style="color:var(--text-muted)">Tidak ada kegiatan</span></div>'}</div>`;
            }).join('') : '<p style="color:var(--text-muted);">Tidak ada jadwal yang cocok.</p>');
    }
    $('jd-chips').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; jView = b.dataset.v; document.querySelectorAll('#jd-chips .chip').forEach(c => c.classList.toggle('active', c === b)); renderJadwal(); });
    $('jd-search').addEventListener('input', renderJadwal);
    $('jd-view').addEventListener('click', async e => {
        const b = e.target.closest('[data-jd-mv]'); if (!b || !isAdmin()) return;
        const day = (dbData.jadwalCustom || []).find(j => j && j.tgl === b.dataset.jdDay), idx = +b.dataset.jdMv;
        const it = day && day.sesi && day.sesi[idx]; if (!it) { alert('Kegiatan tidak ditemukan. Muat ulang halaman lalu coba lagi.'); return; }
        const d0 = parseTgl(day.tgl), iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        const r = await askDialog('Pindahkan kegiatan', [
            { type: 'note', text: it.kegiatan + ' (' + day.tgl + ', ' + it.jam + ')' },
            { id: 'tgl', label: 'Pindah ke tanggal', type: 'date', value: d0 ? iso(d0) : '' },
            { id: 'jam', label: 'Jam baru (biarkan kalau jamnya tetap)', value: it.jam, placeholder: '07.50-09.30' },
            { id: 'ket', label: 'Catatan untuk mahasiswa (opsional)', value: it.catatan || '', placeholder: 'Mis. dosen berhalangan' }
        ], 'Pindahkan');
        if (!r) return;
        if (!r.tgl) { alert('Pilih tanggal tujuan dulu.'); return; }
        const nd = new Date(r.tgl + 'T00:00:00');
        if (nd < sod(new Date()) && !confirm('Tanggal tujuan sudah lewat, jadwalnya akan langsung terhapus otomatis. Lanjut?')) return;
        const res = a9MoveSesi(dbData.jadwalCustom, day.tgl, idx, nd, r.jam, (r.ket || '').trim());
        if (!res) { alert('Tidak ada yang berubah.'); return; }
        const before = dbData.jadwalCustom;
        dbData.jadwalCustom = res.list;
        if (!(await saveCategoryData('jadwal'))) { dbData.jadwalCustom = before; renderAll(); return; }
        alert('Jadwal dipindah ke ' + res.to + '.');
        postUpdate('jadwal', '\ud83d\uddd3\ufe0f Jadwal berubah', res.nama + ' dipindah dari ' + res.from + ' ke ' + res.to + '.', { key: 'jadwal-pindah', merge: n => n + ' kegiatan dipindah jadwalnya. Cek menu Kuliah \u203a Jadwal.', until: iso(nd) });
    });
    $('jd-save').addEventListener('click', async () => {
        let p; try { p = JSON.parse($('jd-json').value); } catch (e) { alert('JSON tidak valid: ' + e.message); return; }
        const arr = Array.isArray(p) ? p : (p && p.jadwal);
        if (!Array.isArray(arr) || !arr.length || arr.some(j => !j || !j.tgl || !Array.isArray(j.sesi))) { alert('Format salah. Tiap hari harus punya "tgl" dan daftar "sesi".'); return; }
        if (!confirm(`Ganti seluruh jadwal dengan ${arr.length} hari dari JSON ini?`)) return;
        dbData.jadwalCustom = arr;
        if (await saveCategoryData('jadwal')) { $('jd-json').value = ''; alert('Jadwal tersimpan.'); postUpdate('jadwal', '\ud83d\uddd3\ufe0f Jadwal diperbarui', 'Jadwal kuliah telah diperbarui. Cek menu Kuliah \u203a Jadwal.', { key: 'jadwal' }); }
    });

    // ======================= FILTER TUGAS =======================
    let tF = 'semua';
    const tw = document.querySelector('#tab-tugas .table-responsive');
    tw.insertAdjacentHTML('beforebegin', '<div class="chips" id="t-chips"><button class="chip active" data-f="semua">Semua</button><button class="chip" data-f="soon">Akan datang</button></div>');
    function tugasFilter() {
        const q = ($('search-tugas-table-body') || { value: '' }).value.toLowerCase();
        document.querySelectorAll('#tugas-table-body tr').forEach(tr => {
            const late = !!tr.querySelector('.dl-late');
            const okF = tF === 'semua' || !late;
            tr.style.display = (okF && tr.textContent.toLowerCase().includes(q)) ? '' : 'none';
        });
    }
    $('t-chips').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; tF = b.dataset.f; document.querySelectorAll('#t-chips .chip').forEach(c => c.classList.toggle('active', c === b)); tugasFilter(); });
    let tHooked = false;

    // ======================= PROGRES MAHASISWA (ADMIN) =======================
    $('tab-lapor').insertAdjacentHTML('afterend', `
    <div id="tab-progres-admin" class="tab-content" style="display:none;">
      <div class="card">
        <div class="card-header flex-between"><h3 class="card-title">\ud83d\udcca Progres Mahasiswa</h3><button class="btn btn-outline btn-sm" id="pa-refresh">\ud83d\udd04 Muat ulang</button></div>
        <div class="fv-bar"><input type="search" id="pa-search" class="modern-input" placeholder="\ud83d\udd0e Cari nama atau NIM...">
          <select id="pa-jenis" class="modern-input"><option value="all">Semua jenis</option><option value="cbt-ujian">CBT (Ujian)</option><option value="cbt-latihan">CBT (Latihan)</option><option value="isian">Soal Isian</option></select></div>
        <div id="pa-body"></div>
        <div id="pa-detail"></div>
      </div>
    </div>`);

    let adminRes = {}, selNim = null;
    const avg = a => a.length ? Math.round(a.reduce((s, r) => s + r.skor, 0) / a.length) : 0;
    async function loadAll() {
        if (!supabaseClient) return;
        const { data, error } = await supabaseClient.from('portal_db').select('key,value').like('key', 'hasil_%');
        if (error) throw error;
        adminRes = {};
        (data || []).forEach(r => {
            if (!r.key.startsWith('hasil_')) return;
            let v = r.value; if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { v = []; } }
            adminRes[r.key.slice(6)] = Array.isArray(v) ? v : [];
        });
    }
    async function writeRes(nim, arr) {
        const { error } = await supabaseClient.from('portal_db').upsert({ key: 'hasil_' + nim, value: arr }, { onConflict: 'key' });
        if (error) throw error; adminRes[nim] = arr;
    }
    function renderPA() {
        const q = $('pa-search').value.trim().toLowerCase(), f = $('pa-jenis').value;
        const nims = [...new Set([...Object.keys(allowedUsers), ...Object.keys(adminRes)])];
        const rows = nims.map(n => {
            const arr = (adminRes[n] || []).filter(r => f === 'all' || r.jenis === f).sort((a, b) => a.t - b.t);
            return { n, name: allowedUsers[n] || '(tidak terdaftar)', arr };
        }).filter(x => !q || x.n.includes(q) || x.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name));
        const aktif = rows.filter(x => x.arr.length), all = [].concat(...aktif.map(x => x.arr));
        $('pa-body').innerHTML = `
          <div class="prog-stats" style="margin-top:14px;">
            <div class="prog-stat"><b>${aktif.length}/${rows.length}</b><small>Mahasiswa sudah mengerjakan</small></div>
            <div class="prog-stat"><b>${all.length}</b><small>Total pengerjaan</small></div>
            <div class="prog-stat"><b>${avg(all)}</b><small>Rata-rata kelas</small></div></div>
          <div class="table-responsive"><table class="modern-table"><thead><tr><th>Nama</th><th>NIM</th><th>Pengerjaan</th><th>Rata-rata</th><th>Terbaik</th><th>Terakhir</th><th>Tren</th><th>Aksi</th></tr></thead><tbody>
          ${rows.map(x => {
            const a = x.arr, last = a[a.length - 1]; let tr = '-';
            if (a.length >= 2) { const d = last.skor - a[a.length - 2].skor; tr = d > 0 ? `<span class="pa-trend-up">\u25b2 ${d}</span>` : d < 0 ? `<span class="pa-trend-down">\u25bc ${-d}</span>` : '\u2796'; }
            return `<tr><td data-label="Nama"><strong>${esc(x.name)}</strong></td><td data-label="NIM">${esc(x.n)}</td><td data-label="Pengerjaan">${a.length}</td><td data-label="Rata-rata">${a.length ? avg(a) : '-'}</td><td data-label="Terbaik">${a.length ? Math.max(...a.map(r => r.skor)) : '-'}</td><td data-label="Terakhir">${last ? `${last.skor} <small>(${esc(fmtTgl(last.t))})</small>` : '-'}</td><td data-label="Tren">${tr}</td><td data-label="Aksi"><button class="btn btn-outline btn-sm" data-det="${esc(x.n)}">Detail</button></td></tr>`;
        }).join('')}</tbody></table></div>`;
        renderDetail();
    }
    function renderDetail() {
        const el = $('pa-detail'); if (!selNim) { el.innerHTML = ''; return; }
        const arr = (adminRes[selNim] || []).slice().sort((a, b) => b.t - a.t);
        el.innerHTML = `<div class="card" style="margin-top:20px;border-color:var(--primary);">
          <div class="card-header flex-between"><h3 class="card-title">${esc(allowedUsers[selNim] || selNim)} <small style="color:var(--text-muted);font-weight:400;">(${esc(selNim)})</small></h3>
            <span style="display:flex;gap:8px;"><button class="btn btn-danger btn-sm" data-delall="${esc(selNim)}"${arr.length ? '' : ' disabled'}>Hapus semua progres</button><button class="btn btn-outline btn-sm" data-close="1">Tutup</button></span></div>
          ${arr.length ? `<div class="table-responsive"><table class="modern-table"><thead><tr><th>Tanggal</th><th>Jenis</th><th>Nilai</th><th>Benar</th><th>Waktu</th><th>Aksi</th></tr></thead><tbody>
          ${arr.map(r => `<tr><td data-label="Tanggal">${esc(fmtTgl(r.t))}</td><td data-label="Jenis">${esc(JENIS[r.jenis] || r.jenis)}</td><td data-label="Nilai"><strong>${r.skor}</strong></td><td data-label="Benar">${r.benar}/${r.total}</td><td data-label="Waktu">${r.durasi ? cbtFormatTime(r.durasi) : '-'}</td><td data-label="Aksi"><button class="btn btn-danger btn-sm" data-delone="${r.t}">Hapus</button></td></tr>`).join('')}</tbody></table></div>`
                : '<p style="color:var(--text-muted);">Belum ada progres untuk mahasiswa ini.</p>'}</div>`;
    }
    $('tab-progres-admin').addEventListener('click', async e => {
        const d = e.target.closest('[data-det]'); if (d) { selNim = d.dataset.det; renderDetail(); $('pa-detail').scrollIntoView({ behavior: 'smooth' }); return; }
        if (e.target.closest('[data-close]')) { selNim = null; renderDetail(); return; }
        const one = e.target.closest('[data-delone]'), all = e.target.closest('[data-delall]');
        try {
            if (one) { if (!confirm('Hapus pengerjaan ini dari progres mahasiswa? Tindakan ini tidak bisa dibatalkan.')) return; await writeRes(selNim, (adminRes[selNim] || []).filter(r => String(r.t) !== one.dataset.delone)); renderPA(); alert('Pengerjaan dihapus.'); }
            else if (all) { if (!confirm(`Hapus SEMUA progres ${allowedUsers[selNim] || selNim}? Tindakan ini tidak bisa dibatalkan.`)) return; await writeRes(selNim, []); renderPA(); alert('Semua progres dihapus.'); }
        } catch (err) { console.error(err); alert('Gagal menghapus. Cek izin tabel di Supabase.'); }
    });
    async function openPA() { $('pa-body').innerHTML = '<p>Memuat...</p>'; try { await loadAll(); } catch (e) { console.error(e); alert('Gagal memuat progres mahasiswa.'); } renderPA(); }
    $('pa-refresh').addEventListener('click', openPA);
    $('pa-search').addEventListener('input', renderPA);
    $('pa-jenis').addEventListener('change', renderPA);

    const osw = window.switchTab;
    window.switchTab = function (t, b) { osw(t, b); if (t === 'progres-admin') openPA(); };

    // ======================= RENDER ULANG SETIAP renderAll =======================
    const orr = window.renderAll;
    window.renderAll = function () {
        orr();
        try {
            renderJadwal(); if (window.finderRender) window.finderRender();
            if (!tHooked && $('search-tugas-table-body')) { $('search-tugas-table-body').addEventListener('input', tugasFilter); tHooked = true; }
            tugasFilter();
            document.querySelectorAll('#tab-jadwal .admin-form-box').forEach(el => { el.style.display = isAdmin() ? 'block' : 'none'; });
            if (typeof wireDriveAll === 'function') wireDriveAll();
        } catch (e) { console.error(e); }
    };
    window.renderAll();
})();

// ==========================================================================
// BAGIAN 5B - PERPUSTAKAAN MATERI (filter Kategori), PRATINJAU FILE,
//             VIDEO YOUTUBE + RANGKUMAN OTOMATIS
//   Dipakai oleh: Materi, Lab, Skills Lab, Tutorial. Tiap halaman punya filternya sendiri.
//   Admin: satu tombol Tambah (1 atau banyak file, judul = nama file, pilih/buat kategori).
// ==========================================================================

// ---- fungsi murni (tanpa DOM) supaya mudah diuji ----
function a9YtId(u) {
    const m = String(u || '').match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})/);
    return m ? m[1] : null;
}
function a9KindOf(u, tipe) {
    u = String(u || ''); if (!u || u === '#') return 'none';
    if (a9YtId(u)) return 'youtube';
    if (/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\//.test(u)) return 'folder';
    if (/docs\.google\.com\/(document|presentation|spreadsheets)\/d\//.test(u)) return 'gdoc';
    if (/drive\.google\.com\/(file\/d\/|open\?|uc\?)/.test(u)) return tipe === 'video' ? 'drivevideo' : 'drive';
    const p = u.split('?')[0].split('#')[0].toLowerCase();
    if (/\.(mp4|webm|mov|m4v|ogv)$/.test(p)) return 'video';
    if (/\.(mp3|wav|m4a|ogg|aac)$/.test(p)) return 'audio';
    if (/\.pdf$/.test(p)) return 'pdf';
    if (/\.(png|jpe?g|gif|webp|svg)$/.test(p)) return 'image';
    if (/\.(pptx?|docx?|xlsx?)$/.test(p)) return 'office';
    return 'link';
}
function a9Hash(s) { let x = 5381; s = String(s); for (let i = 0; i < s.length; i++) x = ((x << 5) + x + s.charCodeAt(i)) | 0; return (x >>> 0).toString(36); }
const a9BlokNo = s => parseInt(String(s).replace(/\D+/g, ''), 10) || 0;
const a9CmpBlok = (a, b) => a9BlokNo(a) - a9BlokNo(b) || String(a).localeCompare(String(b), 'id', { numeric: true });

(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const esc = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const lc = s => String(s || '').toLowerCase();
    const isAdmin = () => !!currentUser && currentUser.role === 'admin';
    const nimKey = () => (currentUser && currentUser.nim) || 'admin';
    const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
    const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
    const fmtT = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); };

    const KIND = {
        youtube: { ico: '\u25b6\ufe0f', label: 'Video YouTube', g: 'video' }, video: { ico: '\ud83c\udfac', label: 'Video', g: 'video' }, drivevideo: { ico: '\ud83c\udfac', label: 'Video (Drive)', g: 'video' },
        audio: { ico: '\ud83c\udfa7', label: 'Audio', g: 'lain' }, pdf: { ico: '\ud83d\udcd5', label: 'PDF', g: 'pdf' }, office: { ico: '\ud83d\udcca', label: 'Slide / dokumen', g: 'dok' },
        gdoc: { ico: '\ud83d\udcdd', label: 'Google Docs', g: 'dok' }, drive: { ico: '\ud83d\udcc4', label: 'Berkas Drive', g: 'dok' }, folder: { ico: '\ud83d\udcc1', label: 'Folder Drive', g: 'lain' },
        image: { ico: '\ud83d\uddbc\ufe0f', label: 'Gambar', g: 'gambar' }, link: { ico: '\ud83d\udd17', label: 'Tautan', g: 'lain' }, none: { ico: '\ud83d\udcc4', label: 'Tanpa berkas', g: 'lain' }
    };
    const JENIS = [['', 'Semua jenis'], ['video', 'Video'], ['pdf', 'PDF'], ['dok', 'Slide & dokumen'], ['gambar', 'Gambar'], ['lain', 'Lainnya']];

    const css = document.createElement('style');
    css.textContent = `
    /* ---- perpustakaan ---- */
    .lb-top { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; }
    .lb-top .fd-search { margin: 0; flex: 1; }
    .fd-views { display: flex; border: 1px solid var(--border-color); border-radius: 10px; overflow: hidden; flex: none; }
    .fd-vbtn { border: none; background: var(--bg-card); color: var(--text-muted); width: 42px; min-height: 42px; cursor: pointer; font-size: 16px; }
    .fd-vbtn.active { background: var(--primary-light); color: var(--primary); }
    .lb-filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; align-items: end; margin-bottom: 10px; }
    .lb-f span { display: block; font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 4px; }
    .lb-f select { margin: 0; min-height: 40px; padding: 8px 10px; font-size: 14px; }
    .lb-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 4px 0 12px; }
    .lb-count { font-size: 13px; color: var(--text-muted); margin-right: auto; }
    .lb-sec { font-size: 13px; font-weight: 700; color: var(--text-muted); margin: 14px 0 8px; }
    .lb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 14px; }
    .lb-card { position: relative; display: flex; flex-direction: column; border: 1px solid var(--border-color); border-radius: 16px; background: var(--bg-card); overflow: hidden; cursor: pointer; text-align: left; padding: 0; color: inherit; font: inherit; }
    .lb-card:hover { border-color: var(--primary); box-shadow: var(--shadow-lg); }
    .lb-thumb { position: relative; aspect-ratio: 16 / 9; display: flex; align-items: center; justify-content: center; font-size: 40px; background: var(--primary-light); overflow: hidden; }
    .lb-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .lb-thumb.k-pdf { background: rgba(239,68,68,.12); } .lb-thumb.k-drive, .lb-thumb.k-gdoc, .lb-thumb.k-office { background: rgba(245,158,11,.14); }
    .lb-thumb.k-video, .lb-thumb.k-youtube, .lb-thumb.k-drivevideo { background: #0b1220; } .lb-thumb.k-image { background: rgba(59,130,246,.12); }
    .lb-play { position: absolute; width: 46px; height: 46px; border-radius: 50%; background: rgba(0,0,0,.6); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 18px; padding-left: 3px; }
    .lb-kind { position: absolute; left: 8px; bottom: 8px; background: rgba(15,23,42,.78); color: #fff; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 999px; }
    .lb-body { padding: 12px 14px 14px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
    .lb-title { font-weight: 700; font-size: 15px; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word; }
    .lb-mk { font-size: 13px; color: var(--text-muted); }
    .lb-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: auto; }
    .lb-tag { font-size: 12px; font-weight: 600; padding: 2px 10px; border-radius: 999px; background: var(--primary-light); color: var(--primary); }
    .lb-tag.s { background: var(--bg-base); color: var(--text-muted); border: 1px solid var(--border-color); }
    .lb-fav, .lb-more { position: absolute; top: 8px; z-index: 2; width: 34px; height: 34px; border-radius: 50%; border: none; background: rgba(15,23,42,.55); color: #fff; cursor: pointer; font-size: 16px; line-height: 1; }
    .lb-fav { right: 8px; } .lb-fav.on { background: #f59e0b; } .lb-more { left: 8px; }
    .lb-list .lb-grid { grid-template-columns: 1fr; gap: 8px; }
    .lb-list .lb-card { flex-direction: row; align-items: center; }
    .lb-list .lb-thumb { width: 120px; flex: none; font-size: 28px; }
    .lb-list .lb-tags { margin-top: 0; }
    .lb-empty { text-align: center; color: var(--text-muted); padding: 40px 12px; grid-column: 1 / -1; }
    #fd-menu { position: fixed; z-index: 30000; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; box-shadow: 0 16px 40px -12px rgba(15,23,42,.35); padding: 6px; min-width: 190px; }
    #fd-menu button { display: block; width: 100%; text-align: left; padding: 10px 12px; border: none; background: none; border-radius: 8px; color: var(--text-main); cursor: pointer; font-size: 14px; }
    #fd-menu button:hover { background: var(--primary-light); } #fd-menu button.danger { color: var(--danger); }
    .fd-ov { position: fixed; inset: 0; z-index: 31000; background: rgba(15,23,42,.5); display: flex; align-items: center; justify-content: center; padding: 16px; }
    .fd-modal { background: var(--bg-card); color: var(--text-main); border-radius: 18px; padding: 22px; width: min(460px, 100%); max-height: 90vh; overflow: auto; box-shadow: 0 24px 60px -16px rgba(0,0,0,.5); }
    .fd-modal h3 { margin-bottom: 14px; } .fd-modal-acts { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
    /* ---- pratinjau ---- */
    .vw-ov { position: fixed; inset: 0; z-index: 32000; background: rgba(8,12,22,.78); display: flex; align-items: center; justify-content: center; padding: 18px; }
    .vw-ov[hidden] { display: none; }
    .vw { background: var(--bg-card); color: var(--text-main); width: min(1080px, 100%); max-height: 100%; border-radius: 20px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 30px 80px -20px rgba(0,0,0,.6); }
    .vw-h { display: flex; align-items: flex-start; gap: 12px; padding: 14px 18px; border-bottom: 1px solid var(--border-color); }
    .vw-x { flex: none; width: 38px; height: 38px; border-radius: 50%; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-main); cursor: pointer; font-size: 16px; }
    .vw-t { flex: 1; min-width: 0; } .vw-t b { display: block; font-size: 17px; line-height: 1.3; word-break: break-word; }
    .vw-chips { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
    .vw-pos { flex: none; font-size: 13px; color: var(--text-muted); padding-top: 8px; }
    .vw-bar { display: flex; gap: 8px; flex-wrap: wrap; padding: 10px 18px; border-bottom: 1px solid var(--border-color); background: var(--bg-base); }
    .vw-bar .btn { min-height: 38px; }
    .vw-body { overflow: auto; flex: 1; }
    .vw-stage { position: relative; background: #0b1220; min-height: 200px; display: flex; align-items: center; justify-content: center; }
    .vw-ratio { position: relative; width: 100%; aspect-ratio: 16 / 9; } .vw-ratio iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
    .vw-doc { width: 100%; height: min(72vh, 760px); border: 0; background: #fff; display: block; }
    .vw-video { width: 100%; max-height: 72vh; background: #000; display: block; } .vw-audio { width: min(92%, 520px); margin: 40px 0; }
    .vw-img { max-width: 100%; max-height: 72vh; object-fit: contain; cursor: zoom-in; display: block; } .vw-img.zoom { max-width: none; max-height: none; cursor: zoom-out; }
    .vw-stage.scroll { overflow: auto; display: block; text-align: center; }
    .vw-load { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #cbd5e1; font-size: 14px; pointer-events: none; }
    .vw-load i { width: 22px; height: 22px; border: 3px solid rgba(255,255,255,.25); border-top-color: #fff; border-radius: 50%; margin-right: 10px; animation: vwspin .8s linear infinite; }
    @keyframes vwspin { to { transform: rotate(360deg); } }
    .vw-fallback { color: #e2e8f0; text-align: center; padding: 48px 20px; } .vw-fallback .big { font-size: 56px; display: block; margin-bottom: 8px; }
    .vw-help { font-size: 13px; color: var(--text-muted); padding: 10px 18px 0; }
    .vw-extra { padding: 6px 18px 18px; }
    .vw-nav { display: flex; justify-content: space-between; gap: 8px; padding: 10px 18px; border-top: 1px solid var(--border-color); }
    /* ---- rangkuman ---- */
    .sm-card { border: 1px solid var(--border-color); border-radius: 16px; padding: 16px 18px; margin-top: 14px; background: var(--bg-base); }
    .sm-h { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
    .sm-badge { font-size: 12px; font-weight: 600; color: var(--primary); background: var(--primary-light); border-radius: 999px; padding: 2px 10px; }
    .sm-ring { line-height: 1.65; max-width: 75ch; }
    .sm-card h5 { margin: 14px 0 6px; font-size: 14px; }
    .sm-pts { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; max-width: 75ch; }
    .sm-pts li { display: flex; gap: 10px; align-items: flex-start; line-height: 1.5; }
    .sm-t { flex: none; border: 1px solid var(--primary); background: var(--primary-light); color: var(--primary); border-radius: 8px; padding: 1px 8px; font-weight: 700; font-size: 12px; cursor: pointer; font-variant-numeric: tabular-nums; }
    .sm-dl { display: grid; gap: 6px; max-width: 75ch; } .sm-dl div { line-height: 1.5; } .sm-dl b { color: var(--primary); }
    .sm-q { margin-left: 20px; max-width: 75ch; line-height: 1.6; }
    .sm-note { font-size: 12px; color: var(--text-muted); margin-top: 12px; }
    .sm-acts { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
    .sm-skel i { display: block; height: 12px; border-radius: 6px; background: var(--border-color); margin: 10px 0; animation: smpulse 1.2s ease-in-out infinite; } .sm-skel i:nth-child(2) { width: 88%; } .sm-skel i:nth-child(3) { width: 62%; }
    @keyframes smpulse { 50% { opacity: .45; } }
    @media (max-width: 700px) {
        .vw-ov { padding: 0; } .vw { border-radius: 0; width: 100%; height: 100%; max-height: 100%; }
        .lb-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; } .lb-list .lb-grid { grid-template-columns: 1fr; }
        .lb-list .lb-thumb { width: 96px; } .vw-doc { height: 62vh; }
    }
    @media (max-width: 380px) { .lb-grid { grid-template-columns: 1fr; } }`;
    document.head.appendChild(css);

    // ======================= PERPUSTAKAAN =======================
    const CATS = [
        { id: 'materi', cat: 'materi', label: 'Materi', title: 'materi', lg: 'kuliah', mk: true, host: () => document.querySelector('#tab-materi .table-responsive') },
        { id: 'lab', cat: 'laboratorium', label: 'Lab', title: 'nama', lg: 'skenario', mk: true, mkLegacy: false, host: () => $('lab-list') },
        { id: 'skills', cat: 'skills_lab', label: 'Skills Lab', title: 'nama', lg: 'skenario', mk: true, mkLegacy: false, host: () => $('skills-list') },
        { id: 'tut', cat: 'tutorial', label: 'Tutorial', title: 'nama', lg: 'skenario', host: () => $('tutorial-list') }
    ];
    const savedView = lsGet('a9_lb_view', 'grid');
    CATS.forEach(c => { c.f = { matkul: '', kategori: '', jenis: '', fav: false, q: '', sort: 'baru' }; c.view = savedView; c.root = null; c.last = ''; c.lastSel = ''; c.shown = []; c.all = []; });

    // kategori: data baru memakai "kategori"; data lama memakai mata kuliah / blok / sumber sebagai cadangan
    const meta = (c, it) => {
        const matkul = String(it.matkul || (c.mkLegacy === false ? '' : it[c.lg]) || '').trim();
        let kategori = String(it.kategori || it.matkul || it[c.lg] || it.blok || it.sumber || '').trim();
        if (c.mk && kategori === matkul) kategori = '';   // Materi: mata kuliah dan kategori dipisah
        return {
            title: String(it[c.title] || 'Tanpa judul'), link: it.link && it.link !== '#' ? it.link : '',
            kategori, blok: String(it.blok || '').trim(), sumber: String(it.sumber || '').trim(), matkul, tipe: it.tipe || ''
        };
    };
    const driveFileId = u => { const m = String(u || '').match(/(?:drive\.google\.com\/(?:file\/d\/|open\?(?:[^#]*&)?id=|uc\?(?:[^#]*&)?id=)|docs\.google\.com\/(?:document|presentation|spreadsheets)\/d\/)([\w-]+)/); return m ? m[1] : null; };
    const thumbSrc = x => {
        const yt = x.kind === 'youtube' ? a9YtId(x.link) : null;
        if (yt) return 'https://i.ytimg.com/vi/' + yt + '/hqdefault.jpg';
        if (x.kind === 'image') return x.link;
        if (['drive', 'gdoc', 'drivevideo'].includes(x.kind)) { const d = driveFileId(x.link); if (d) return 'https://drive.google.com/thumbnail?id=' + d + '&sz=w480'; }
        return '';
    };
    const extOf = x => { const e = String(x.link || '').split('?')[0].split('#')[0].split('.').pop().toLowerCase(); return /^[a-z0-9]{2,5}$/.test(e) ? e.toUpperCase() : ''; };
    const keyOf = (c, it) => c.cat + ':' + (it.id != null ? it.id : (it[c.title] + '|' + (it.link || '')));
    const favs = () => lsGet('a9_fav_' + nimKey(), []);
    const recents = () => lsGet('a9_rec_' + nimKey(), []);
    function toggleFav(k) { const f = favs(), i = f.indexOf(k); if (i >= 0) f.splice(i, 1); else f.push(k); lsSet('a9_fav_' + nimKey(), f); return i < 0; }
    function pushRecent(k) { const r = recents().filter(x => x !== k); r.unshift(k); lsSet('a9_rec_' + nimKey(), r.slice(0, 12)); }

    function mount(c) {
        const host = c.host(); if (!host || c.root) return;
        const root = document.createElement('div'); root.className = 'lb'; root.id = 'lb-' + c.id;
        root.innerHTML = `
          <div class="lb-top"><input type="search" class="modern-input fd-search" placeholder="\ud83d\udd0e Cari judul atau kategori..." aria-label="Cari">
            <div class="fd-views" role="group" aria-label="Tampilan"><button type="button" class="fd-vbtn" data-view="grid" title="Kartu" aria-label="Tampilan kartu">\u25a6</button><button type="button" class="fd-vbtn" data-view="list" title="Daftar" aria-label="Tampilan daftar">\u2630</button></div></div>
          <div class="lb-filters">
            ${c.mk ? '<label class="lb-f"><span>Mata kuliah</span><select class="modern-input" data-f="matkul"></select></label>' : ''}
            <label class="lb-f"><span>Kategori</span><select class="modern-input" data-f="kategori"></select></label>
            <label class="lb-f"><span>Jenis</span><select class="modern-input" data-f="jenis">${JENIS.map(j => `<option value="${j[0]}">${j[1]}</option>`).join('')}</select></label>
            <label class="lb-f"><span>Urutkan</span><select class="modern-input" data-f="sort"><option value="baru">Terbaru</option><option value="nama">Judul A-Z</option><option value="kategori">Kategori</option></select></label>
          </div>
          <div class="lb-bar"><span class="lb-count"></span><button type="button" class="chip" data-fav>\u2b50 Favorit saya</button><button type="button" class="chip" data-reset>Atur ulang filter</button><button type="button" class="btn btn-primary btn-sm" data-add style="display:none;">\u2795 Tambah ${esc(c.label.toLowerCase())}</button></div>
          <div class="lb-content"></div>`;
        host.style.display = 'none'; host.after(root); c.root = root; wire(c);
    }

    function draw(c) {
        if (!c.root) mount(c); const root = c.root; if (!root) return;
        const admin = isAdmin(), f = c.f, fv = favs();
        const all = (dbData[c.cat] || []).map((it, idx) => Object.assign({ it, idx, key: keyOf(c, it) }, meta(c, it)));
        all.forEach(x => { x.kind = a9KindOf(x.link, x.tipe); });
        c.all = all;

        // pilihan kategori diisi dari data yang ada, jadi tiap halaman punya daftarnya sendiri
        const set = {}; let none = 0;
        all.forEach(x => { if (x.kategori) set[x.kategori] = (set[x.kategori] || 0) + 1; else none++; });
        const names = Object.keys(set).sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
        if (f.kategori && f.kategori !== '__none' && !set[f.kategori]) f.kategori = '';
        const mset = {}; let mnone = 0; if (c.mk) all.forEach(x => { if (x.matkul) mset[x.matkul] = (mset[x.matkul] || 0) + 1; else mnone++; });
        const mnames = Object.keys(mset).sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
        if (f.matkul && f.matkul !== '__none' && !mset[f.matkul]) f.matkul = '';
        const sig = JSON.stringify([names, set, none, f.kategori, f.jenis, f.sort, mnames, mset, f.matkul, mnone]);
        if (sig !== c.lastSel) {
            c.lastSel = sig;
            const s = root.querySelector('[data-f="kategori"]');
            s.innerHTML = '<option value="">Semua kategori</option>' + names.map(n => `<option value="${esc(n)}">${esc(n)} (${set[n]})</option>`).join('') + (none && names.length ? `<option value="__none">(Tanpa kategori) (${none})</option>` : '');
            s.value = f.kategori;
            const ms = root.querySelector('[data-f="matkul"]');
            if (ms) { ms.innerHTML = '<option value="">Semua mata kuliah</option>' + mnames.map(n => `<option value="${esc(n)}">${esc(n)} (${mset[n]})</option>`).join('') + (mnone && mnames.length ? `<option value="__none">(Tanpa mata kuliah) (${mnone})</option>` : ''); ms.value = f.matkul; }
            root.querySelector('[data-f="jenis"]').value = f.jenis; root.querySelector('[data-f="sort"]').value = f.sort;
        }
        root.classList.toggle('lb-list', c.view === 'list');
        root.querySelectorAll('.fd-vbtn').forEach(b => b.classList.toggle('active', b.dataset.view === c.view));
        root.querySelector('[data-add]').style.display = admin ? 'inline-flex' : 'none';
        root.querySelector('[data-fav]').classList.toggle('active', f.fav);

        const q = lc(f.q);
        const pass = x => (!f.matkul || (f.matkul === '__none' ? !x.matkul : x.matkul === f.matkul)) && (!f.kategori || (f.kategori === '__none' ? !x.kategori : x.kategori === f.kategori))
            && (!f.jenis || KIND[x.kind].g === f.jenis) && (!f.fav || fv.includes(x.key))
            && (!q || lc([x.title, x.kategori, x.blok, x.sumber, x.matkul].join(' ')).includes(q));
        const shown = all.filter(pass);
        shown.sort(f.sort === 'nama' ? (a, b) => a.title.localeCompare(b.title, 'id', { numeric: true })
            : f.sort === 'kategori' ? (a, b) => a.kategori.localeCompare(b.kategori, 'id', { numeric: true }) || a.title.localeCompare(b.title, 'id', { numeric: true })
                : (a, b) => (Number(b.it.id) || b.idx) - (Number(a.it.id) || a.idx));
        c.shown = shown;
        const filtered = !!(f.matkul || f.kategori || f.jenis || f.fav || q);
        root.querySelector('.lb-count').textContent = filtered ? `${shown.length} dari ${all.length} berkas` : `${all.length} berkas`;
        root.querySelector('[data-reset]').style.display = filtered ? 'inline-flex' : 'none';

        const card = x => {
            const k = KIND[x.kind], yt = x.kind === 'youtube' ? a9YtId(x.link) : null, on = fv.includes(x.key);
            const src = thumbSrc(x), ext = extOf(x);
            const ph = `<span class="lb-ph"><span class="lb-ico">${k.ico}</span>${ext ? `<small>${esc(ext)}</small>` : ''}</span>`;
            const thumb = ph + (src ? `<img src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : '') + (k.g === 'video' ? '<span class="lb-play">\u25b6</span>' : '');
            return `<div class="lb-card" data-k="${esc(x.key)}" role="button" tabindex="0" aria-label="Buka ${esc(x.title)}">
              <div class="lb-thumb k-${x.kind}">${thumb}<span class="lb-kind">${esc(k.label)}</span></div>
              <button type="button" class="lb-fav${on ? ' on' : ''}" data-fav-k="${esc(x.key)}" aria-label="${on ? 'Hapus dari favorit' : 'Tambah ke favorit'}">${on ? '\u2605' : '\u2606'}</button>${admin ? `<button type="button" class="lb-more" data-more-k="${esc(x.key)}" aria-label="Menu">\u22ef</button>` : ''}
              <div class="lb-body"><div class="lb-title">${esc(x.title)}</div>
                <div class="lb-tags">${c.mk && x.matkul ? `<span class="lb-tag mk">${esc(x.matkul)}</span>` : ''}${x.kategori ? `<span class="lb-tag">${esc(x.kategori)}</span>` : ''}</div></div></div>`;
        };
        let html = '';
        if (!filtered) {
            const rec = recents().map(k => all.find(x => x.key === k)).filter(Boolean).slice(0, 4);
            if (rec.length) html += `<div class="lb-sec">\ud83d\udd58 Terakhir dibuka</div><div class="lb-grid">${rec.map(card).join('')}</div><div class="lb-sec">Semua ${esc(c.label.toLowerCase())}</div>`;
        }
        html += `<div class="lb-grid">${shown.length ? shown.map(card).join('') : `<div class="lb-empty">${all.length ? 'Tidak ada yang cocok dengan filter ini.' : 'Belum ada berkas.'}${admin && !all.length ? '<br><small>Klik tombol Tambah di atas untuk mulai.</small>' : ''}</div>`}</div>`;
        if (c.last !== html) { c.last = html; root.querySelector('.lb-content').innerHTML = html; }
    }

    // ---------- menu admin ----------
    let menuCtx = null;
    const closeMenu = () => { const m = $('fd-menu'); if (m) m.remove(); menuCtx = null; };
    document.addEventListener('click', e => { if (!e.target.closest('#fd-menu') && !e.target.closest('[data-more-k]')) closeMenu(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
    window.addEventListener('scroll', closeMenu, { passive: true });
    function openMenu(c, x, px, py) {
        closeMenu();
        const el = document.createElement('div'); el.id = 'fd-menu';
        el.innerHTML = '<button type="button" data-m="open">\u2197 Buka</button><button type="button" data-m="edit">\u270f\ufe0f Ubah detail</button><button type="button" data-m="del" class="danger">\ud83d\uddd1\ufe0f Hapus</button>';
        document.body.appendChild(el);
        el.style.left = Math.max(8, Math.min(px, window.innerWidth - el.offsetWidth - 8)) + 'px';
        el.style.top = Math.max(8, Math.min(py, window.innerHeight - el.offsetHeight - 8)) + 'px';
        menuCtx = { c, x };
        el.addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; const m = menuCtx; closeMenu(); if (m) act(m.c, m.x, b.dataset.m); });
    }

    // ---------- tambah / ubah / hapus (admin) ----------
    const nameOf = f => String(f.name || '').replace(/\.[^.]+$/, '').replace(/_+/g, ' ').replace(/\s+/g, ' ').trim() || String(f.name || 'Berkas');
    const linkTitle = u => {
        if (a9YtId(u)) return 'Video YouTube';
        if (/google\.com/.test(u)) return 'Berkas Google Drive';
        try { return nameOf({ name: decodeURIComponent(new URL(u).pathname.split('/').pop() || '') }) || new URL(u).hostname; } catch (e) { return 'Tautan'; }
    };
    const mkList = c => [...new Set((dbData[c.cat] || []).map(i => meta(c, i).matkul).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
    const catList = c => [...new Set((dbData[c.cat] || []).map(i => meta(c, i).kategori).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));

    // Satu pintu tambah: 1 atau banyak file, judul = nama file, admin cukup isi kategori
    async function addFlow(c) {
        const r = await askDialog('Tambah ' + c.label.toLowerCase(), [
            { type: 'note', text: 'Pilih satu atau banyak file sekaligus. Judul otomatis memakai nama file.' },
            { id: 'files', label: 'File (boleh lebih dari satu)', type: 'file', multiple: true },
            { id: 'links', label: 'Atau tempel tautan, satu per baris (boleh "Judul | tautan")', type: 'textarea', placeholder: 'https://drive.google.com/...' },
            ...(c.mk ? [{ id: 'matkul', label: 'Mata kuliah', value: c.f.matkul || '', placeholder: 'Pilih dari daftar, atau ketik nama baru', list: mkList(c) }] : []),
            { id: 'kategori', label: c.mk ? 'Kategori (opsional, mis. Kuliah pakar, Skenario)' : 'Kategori', value: c.f.kategori && c.f.kategori !== '__none' ? c.f.kategori : '', placeholder: 'Pilih dari daftar, atau ketik nama baru', list: catList(c) }
        ], 'Tambah');
        if (!r) return;
        const kategori = r.kategori.trim(), matkul = c.mk ? String(r.matkul || '').trim() : '';
        if (c.mk && !matkul) return alert('Isi mata kuliah dulu. Ketik nama baru kalau belum ada.');
        if (!c.mk && !kategori) return alert('Isi kategori dulu. Ketik nama baru kalau belum ada.');
        const where = c.mk ? matkul : kategori;
        const jobs = (r.files || []).map(f => ({ title: nameOf(f), file: f }));
        String(r.links || '').split('\n').map(s => s.trim()).filter(Boolean).forEach(ln => {
            const i = ln.indexOf('|'), url = (i > 0 ? ln.slice(i + 1) : ln).trim(), t = i > 0 ? ln.slice(0, i).trim() : '';
            jobs.push({ title: t || linkTitle(url), url });
        });
        if (!jobs.length) return alert('Pilih file atau tempel tautan dulu.');

        let ok = 0, last = '';
        for (const j of jobs) {
            let link = j.url;
            if (j.file) {
                link = await uploadFileObj(j.file, c.label + '/' + where);
                if (!link) { if (confirm(`"${j.title}" gagal diunggah. Lanjut ke file berikutnya?`)) continue; break; }
            }
            (dbData[c.cat] = dbData[c.cat] || []).push({ id: Date.now() + ok, ket: '', [c.title]: j.title, [c.lg]: where, ...(c.mk ? { matkul } : {}), kategori, link, tipe: j.file && /^video\//.test(j.file.type) ? 'video' : '' });
            ok++; last = j.title;
        }
        if (!ok) return;
        if (!(await saveCategoryData(c.cat))) return;
        alert(ok + ' berkas ditambahkan.');
        postUpdate('file', '\ud83d\udcda ' + c.label + ' baru', ok === 1 ? last + ' ditambahkan ke ' + where + '.' : ok + ' berkas baru di ' + where + '.', { key: 'lib:' + c.cat, merge: n => n + ' berkas baru ditambahkan ke ' + c.label + '.' });
    }

    async function editFlow(c, x) {
        const r = await askDialog('Ubah berkas', [
            { id: 'judul', label: 'Judul', value: x.title },
            ...(c.mk ? [{ id: 'matkul', label: 'Mata kuliah', value: x.matkul, placeholder: 'Pilih atau ketik mata kuliah baru', list: mkList(c) }] : []),
            { id: 'kategori', label: c.mk ? 'Kategori (opsional)' : 'Kategori', value: x.kategori, placeholder: 'Pilih atau ketik kategori baru', list: catList(c) },
            { id: 'link', label: 'Tautan', value: x.link },
            { id: 'file', label: 'Atau ganti dengan file baru', type: 'file' }
        ], 'Simpan');
        if (!r) return;
        if (!r.judul.trim()) return alert('Judul wajib diisi.');
        const kategori = r.kategori.trim(), matkul = c.mk ? String(r.matkul || '').trim() : '', old = x.link; let link = r.link.trim();
        if (c.mk && !matkul) return alert('Mata kuliah wajib diisi.');
        const where = c.mk ? matkul : kategori;
        if (r.file) { const u = await uploadFileObj(r.file, c.label + '/' + (where || 'Umum')); if (!u) return; link = u; }
        if (!link) return alert('Tautan tidak boleh kosong.');
        Object.assign(x.it, { [c.title]: r.judul.trim(), [c.lg]: where, ...(c.mk ? { matkul } : {}), kategori, link });
        if (!(await saveCategoryData(c.cat))) return;
        alert('Perubahan disimpan.' + (old && old !== link ? await purgeFileOf({ link: old }) : ''));
    }

    async function act(c, x, a) {
        if (a === 'open') { openKey(c, x.key); return; }
        if (!isAdmin()) return;
        if (a === 'edit') await editFlow(c, x);
        else if (a === 'del') {
            if (!confirm(`Hapus "${x.title}"? Berkas yang diunggah lewat portal (Google Drive / penyimpanan portal) ikut dihapus.`)) return;
            const lst = dbData[c.cat] || [];
            let i = lst.indexOf(x.it);
            if (i < 0 && x.it && x.it.id != null) i = lst.findIndex(z => z && z.id === x.it.id && z.link === x.it.link);
            if (i < 0) { alert('Data tidak ditemukan (daftar baru saja diperbarui). Coba klik Hapus sekali lagi.'); return; }
            const removed = lst.splice(i, 1)[0];
            if (await saveCategoryData(c.cat)) alert('Berkas dihapus.' + await purgeFileOf(removed));
            else { lst.splice(i, 0, removed); renderAll(); }
        }
    }
    function openKey(c, k) {
        let list = c.shown, i = list.findIndex(x => x.key === k);
        if (i < 0) { list = c.all; i = list.findIndex(x => x.key === k); }
        if (i >= 0) viewerOpen(c, list, i);
    }

    function wire(c) {
        const root = c.root, byKey = k => c.all.find(x => x.key === k);
        root.querySelector('.fd-search').addEventListener('input', e => { c.f.q = e.target.value.trim(); draw(c); });
        root.querySelectorAll('select[data-f]').forEach(s => s.addEventListener('change', () => { c.f[s.dataset.f] = s.value; c.lastSel = ''; draw(c); }));
        root.addEventListener('click', async e => {
            const v = e.target.closest('[data-view]'); if (v) { CATS.forEach(x => { x.view = v.dataset.view; if (x.root) draw(x); }); lsSet('a9_lb_view', v.dataset.view); return; }
            if (e.target.closest('[data-fav]')) { c.f.fav = !c.f.fav; draw(c); return; }
            if (e.target.closest('[data-reset]')) { Object.assign(c.f, { matkul: '', kategori: '', jenis: '', fav: false, q: '', sort: 'baru' }); root.querySelector('.fd-search').value = ''; c.lastSel = ''; draw(c); return; }
            if (e.target.closest('[data-add]')) { await addFlow(c); return; }
            const fav = e.target.closest('[data-fav-k]'); if (fav) { e.stopPropagation(); toggleFav(fav.dataset.favK); draw(c); return; }
            const more = e.target.closest('[data-more-k]');
            if (more) { e.stopPropagation(); const x = byKey(more.dataset.moreK), r = more.getBoundingClientRect(); if (x) openMenu(c, x, r.left, r.bottom + 4); return; }
            const card = e.target.closest('.lb-card'); if (card) openKey(c, card.dataset.k);
        });
        root.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList && e.target.classList.contains('lb-card')) { e.preventDefault(); e.target.click(); } });
        root.addEventListener('contextmenu', e => {
            if (!isAdmin()) return; const card = e.target.closest('.lb-card'); if (!card) return;
            const x = byKey(card.dataset.k); if (x) { e.preventDefault(); openMenu(c, x, e.clientX, e.clientY); }
        });
    }

    // ======================= PRATINJAU =======================
    let V = null, cur = { c: null, list: [], i: 0 }, vTok = 0, lastFocus = null;
    function driveInfo(u) {
        let m;
        if ((m = u.match(/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([\w-]+)/))) return { open: u, embed: `https://drive.google.com/embeddedfolderview?id=${m[1]}#grid`, dl: null };
        if ((m = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/)) || (m = u.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([\w-]+)/)))
            return { open: `https://drive.google.com/file/d/${m[1]}/view`, embed: `https://drive.google.com/file/d/${m[1]}/preview`, dl: `https://drive.google.com/uc?export=download&id=${m[1]}` };
        if ((m = u.match(/docs\.google\.com\/(document|presentation|spreadsheets)\/d\/([\w-]+)/))) return { open: u, embed: `https://docs.google.com/${m[1]}/d/${m[2]}/preview`, dl: null };
        return null;
    }
    function ensureViewer() {
        if (V) return V;
        V = document.createElement('div'); V.className = 'vw-ov'; V.hidden = true;
        V.innerHTML = `<div class="vw" role="dialog" aria-modal="true" aria-label="Pratinjau berkas">
          <div class="vw-h"><button type="button" class="vw-x" data-v="close" aria-label="Tutup">\u2715</button><div class="vw-t"><b id="vw-title"></b><div class="vw-chips" id="vw-chips"></div></div><span class="vw-pos" id="vw-pos"></span></div>
          <div class="vw-bar" id="vw-bar"></div>
          <div class="vw-body"><div class="vw-stage" id="vw-stage"></div><div class="vw-help" id="vw-help"></div><div class="vw-extra" id="vw-extra"></div></div>
          <div class="vw-nav"><button type="button" class="btn btn-outline" data-v="prev">\u25c0 Sebelumnya</button><button type="button" class="btn btn-outline" data-v="next">Berikutnya \u25b6</button></div></div>`;
        document.body.appendChild(V);
        V.addEventListener('click', e => {
            if (e.target === V || e.target.closest('[data-v="close"]')) return closeViewer();
            if (e.target.closest('[data-v="prev"]')) return step(-1);
            if (e.target.closest('[data-v="next"]')) return step(1);
            const b = e.target.closest('[data-vb]'); if (b) return barAct(b.dataset.vb);
            const t = e.target.closest('.sm-t'); if (t) return seek(+t.dataset.t);
            const img = e.target.closest('.vw-img'); if (img) { img.classList.toggle('zoom'); $('vw-stage').classList.toggle('scroll', img.classList.contains('zoom')); }
        });
        document.addEventListener('keydown', e => {
            if (V.hidden) return;
            if (e.key === 'Escape') { e.stopPropagation(); closeViewer(); return; }
            const t = e.target.tagName; if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
            if (e.key === 'ArrowRight') step(1); else if (e.key === 'ArrowLeft') step(-1);
        }, true);
        return V;
    }
    function closeViewer() {
        if (!V || V.hidden) return;
        V.hidden = true; vTok++; $('vw-stage').innerHTML = ''; $('vw-extra').innerHTML = '';   // menghentikan video yang sedang diputar
        document.body.style.overflow = ''; if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    function step(d) { const n = cur.i + d; if (n >= 0 && n < cur.list.length) show(n); }
    function viewerOpen(c, list, i) { ensureViewer(); cur = { c, list, i }; lastFocus = document.activeElement; V.hidden = false; document.body.style.overflow = 'hidden'; show(i); V.querySelector('.vw-x').focus(); }

    function stageHtml(x) {
        const u = x.link, k = x.kind, dr = driveInfo(u), coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
        const wrap = inner => inner + '<div class="vw-load"><i></i>Memuat pratinjau...</div>';
        switch (k) {
            case 'youtube': return `<div class="vw-ratio"><iframe id="vw-yt" src="https://www.youtube-nocookie.com/embed/${a9YtId(u)}?rel=0&modestbranding=1&enablejsapi=1&origin=${encodeURIComponent(location.origin)}" title="${esc(x.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>`;
            case 'video': return `<video class="vw-video" controls playsinline preload="metadata" src="${esc(u)}"></video>`;
            case 'audio': return `<audio class="vw-audio" controls src="${esc(u)}"></audio>`;
            case 'image': return `<img class="vw-img" src="${esc(u)}" alt="${esc(x.title)}">`;
            case 'pdf': return wrap(`<iframe class="vw-doc" src="${coarse ? 'https://docs.google.com/gview?embedded=1&url=' + encodeURIComponent(u) : esc(u) + '#view=FitH'}" title="${esc(x.title)}"></iframe>`);
            case 'office': return wrap(`<iframe class="vw-doc" src="https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(u)}" title="${esc(x.title)}"></iframe>`);
            case 'drive': case 'gdoc': case 'folder': case 'drivevideo': if (dr) return wrap(`<iframe class="vw-doc" src="${esc(dr.embed)}" title="${esc(x.title)}" allow="autoplay; fullscreen"></iframe>`);
            // jatuh ke bawah bila bukan tautan Drive yang dikenali
            default: return `<div class="vw-fallback"><span class="big">${KIND[k].ico}</span>Berkas ini tidak bisa ditampilkan di sini.<br><br><a class="btn btn-primary" href="${esc(u)}" target="_blank" rel="noopener">Buka tautan</a></div>`;
        }
    }
    function barBtns(x) {
        const dr = driveInfo(x.link || ''), fav = favs().includes(x.key);
        const b = [`<button type="button" class="btn btn-outline btn-sm" data-vb="fav">${fav ? '\u2605 Favorit' : '\u2606 Favorit'}</button>`];
        if (x.link) {
            b.push(`<a class="btn btn-outline btn-sm" href="${esc(dr ? dr.open : x.link)}" target="_blank" rel="noopener">\u2197 Buka di tab baru</a>`);
            const dl = dr ? dr.dl : (['pdf', 'office', 'image', 'video', 'audio'].includes(x.kind) ? x.link : null);
            if (dl) b.push(`<a class="btn btn-outline btn-sm" href="${esc(dl)}" target="_blank" rel="noopener">\u2b07 Unduh</a>`);
            b.push('<button type="button" class="btn btn-outline btn-sm" data-vb="copy">\ud83d\udd17 Salin tautan</button>');
        }
        b.push('<button type="button" class="btn btn-outline btn-sm" data-vb="full">\u26f6 Layar penuh</button>');
        return b.join('');
    }
    function show(i) {
        cur.i = i; const x = cur.list[i], tok = ++vTok;
        $('vw-title').textContent = x.title;
        $('vw-chips').innerHTML = [x.kategori && `<span class="lb-tag">${esc(x.kategori)}</span>`, `<span class="lb-tag s">${esc(KIND[x.kind].label)}</span>`].filter(Boolean).join('');
        $('vw-pos').textContent = cur.list.length > 1 ? (i + 1) + ' / ' + cur.list.length : '';
        $('vw-bar').innerHTML = barBtns(x);
        const st = $('vw-stage'); st.classList.remove('scroll'); st.innerHTML = stageHtml(x);
        st.querySelectorAll('iframe').forEach(f => f.addEventListener('load', () => { const l = st.querySelector('.vw-load'); if (l) l.remove(); }));
        $('vw-help').textContent = ['pdf', 'office', 'drive', 'gdoc', 'folder', 'drivevideo'].includes(x.kind) ? 'Pratinjau tidak tampil atau kosong? Pakai tombol "Buka di tab baru".' : '';
        V.querySelector('[data-v="prev"]').disabled = i === 0; V.querySelector('[data-v="next"]').disabled = i === cur.list.length - 1;
        const ex = $('vw-extra'); ex.innerHTML = ''; ex.onclick = null;
        pushRecent(x.key); if (cur.c && cur.c.root) draw(cur.c);
        if (['youtube', 'video', 'drivevideo'].includes(x.kind)) summaryFor(x, ex, tok);
    }
    function barAct(a) {
        const x = cur.list[cur.i];
        if (a === 'fav') { const on = toggleFav(x.key); $('vw-bar').innerHTML = barBtns(x); if (cur.c && cur.c.root) draw(cur.c); alert(on ? 'Ditambahkan ke favorit.' : 'Dihapus dari favorit.'); }
        else if (a === 'copy') { (navigator.clipboard ? navigator.clipboard.writeText(x.link) : Promise.reject()).then(() => alert('Tautan disalin.')).catch(() => alert('Tidak bisa menyalin otomatis. Salin dari tombol Buka di tab baru.')); }
        else if (a === 'full') { const el = $('vw-stage'); (el.requestFullscreen || el.webkitRequestFullscreen || (() => alert('Layar penuh tidak didukung browser ini.'))).call(el); }
    }
    function seek(t) {
        const f = $('vw-yt'); if (!f || !f.contentWindow) return;
        f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [t, true] }), '*');
        f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*');
        $('vw-stage').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    // ======================= RANGKUMAN VIDEO =======================
    const refOf = x => x.kind === 'youtube' ? a9YtId(x.link) : 'u' + a9Hash(x.link);
    async function cachedSummary(ref) {
        const loc = lsGet('a9_sum_' + ref, null); if (loc && loc.ringkasan) return loc;
        if (!supabaseClient) return null;
        try {
            const { data, error } = await supabaseClient.from('portal_db').select('value').eq('key', 'ringkasan_' + ref).maybeSingle();
            if (error) throw error;
            let v = data && data.value; if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { v = null; } }
            if (v && v.ringkasan) { lsSet('a9_sum_' + ref, v); return v; }
        } catch (e) { console.error('Ringkasan:', e); }
        return null;
    }
    async function generate(body) {
        if (!supabaseClient) throw new Error('Server belum terhubung.');
        const data = await invokeEdge('video-summary', body);
        if (!data) throw new Error('Respons tidak valid');
        return data;
    }
    function sumHtml(s, canSeek) {
        const src = s.sumber === 'transkrip' ? 'dari transkrip video' : s.sumber === 'teks' ? 'dari teks yang ditempel' : 'dari judul & deskripsi';
        return `<div class="sm-card"><div class="sm-h"><b>\ud83e\udd16 Rangkuman video</b><span class="sm-badge">dibuat AI \u00b7 ${src}</span></div>
          <p class="sm-ring">${esc(s.ringkasan)}</p>
          ${(s.poin || []).length ? `<h5>Poin penting</h5><ul class="sm-pts">${s.poin.map(p => `<li>${canSeek && p.t != null ? `<button type="button" class="sm-t" data-t="${+p.t}">${fmtT(+p.t)}</button>` : ''}<span>${esc(p.teks)}</span></li>`).join('')}</ul>` : ''}
          ${(s.istilah || []).length ? `<h5>Istilah penting</h5><div class="sm-dl">${s.istilah.map(t => `<div><b>${esc(t.kata)}</b>: ${esc(t.arti)}</div>`).join('')}</div>` : ''}
          ${(s.latihan || []).length ? `<h5>Cek pemahamanmu</h5><ol class="sm-q">${s.latihan.map(q => `<li>${esc(q)}</li>`).join('')}</ol>` : ''}
          <p class="sm-note">Rangkuman dibuat otomatis oleh AI dan bisa keliru. Cocokkan dengan materi resmi sebelum dipakai belajar.</p>
          <div class="sm-acts"><button type="button" class="btn btn-outline btn-sm" data-sm="copy">\ud83d\udccb Salin rangkuman</button>${isAdmin() ? '<button type="button" class="btn btn-outline btn-sm" data-sm="redo">\ud83d\udd04 Buat ulang</button>' : ''}</div></div>`;
    }
    const sumText = s => [s.ringkasan, '', 'Poin penting:'].concat((s.poin || []).map(p => '- ' + (p.t != null ? '[' + fmtT(+p.t) + '] ' : '') + p.teks)).join('\n');
    const skeleton = '<div class="sm-card"><div class="sm-h"><b>\ud83e\udd16 Rangkuman video</b><span class="sm-badge">sedang disusun</span></div><div class="sm-skel"><i></i><i></i><i></i></div><p class="sm-note">Menyusun rangkuman, biasanya 10 sampai 40 detik. Tonton videonya dulu, rangkuman muncul di sini.</p></div>';

    async function summaryFor(x, box, tok) {
        const ref = refOf(x), yt = x.kind === 'youtube';
        const paint = html => { if (tok === vTok) box.innerHTML = html; };
        const ready = s => {
            paint(sumHtml(s, yt));
            box.onclick = async e => {
                const b = e.target.closest('[data-sm]'); if (!b) return;
                if (b.dataset.sm === 'copy') { try { await navigator.clipboard.writeText(sumText(s)); alert('Rangkuman disalin.'); } catch (er) { alert('Tidak bisa menyalin otomatis.'); } }
                else if (b.dataset.sm === 'redo') { try { localStorage.removeItem('a9_sum_' + ref); } catch (er) { } run(true); }
            };
        };
        const run = async force => {
            paint(skeleton); box.onclick = null;
            try {
                const s = await generate({ ref, videoId: yt ? a9YtId(x.link) : null, title: x.title, matkul: x.kategori, force: !!force });
                lsSet('a9_sum_' + ref, s); if (tok === vTok) ready(s);
            } catch (e) {
                console.error(e);
                paint(`<div class="sm-card"><div class="sm-h"><b>\ud83e\udd16 Rangkuman video</b></div><p class="sm-ring">${esc(isAdmin() ? 'Rangkuman gagal dibuat: ' + (e.message || e) : 'Rangkuman belum tersedia untuk video ini.')}</p><div class="sm-acts"><button type="button" class="btn btn-outline btn-sm" data-sm="retry">Coba lagi</button></div></div>`);
                box.onclick = ev => { if (ev.target.closest('[data-sm="retry"]')) run(false); };
            }
        };
        const have = await cachedSummary(ref); if (tok !== vTok) return;
        if (have) { ready(have); return; }
        if (yt) { run(false); return; }
        // video selain YouTube: tidak ada transkrip otomatis, jadi admin menempelkan transkrip/catatan
        if (!isAdmin()) { paint(''); return; }
        paint(`<div class="sm-card"><div class="sm-h"><b>\ud83e\udd16 Rangkuman video</b></div><p class="sm-ring">Rangkuman otomatis penuh hanya untuk video YouTube yang punya subtitle. Untuk video ini, tempel transkrip atau catatan isi video, lalu AI akan merangkumnya untuk mahasiswa.</p>
          <textarea id="sm-paste" class="modern-input" style="height:130px;" placeholder="Tempel transkrip atau catatan video di sini (minimal beberapa paragraf)"></textarea><div class="sm-acts"><button type="button" class="btn btn-primary btn-sm" data-sm="paste">\u2728 Buat rangkuman</button></div></div>`);
        box.onclick = async e => {
            if (!e.target.closest('[data-sm="paste"]')) return;
            const text = ($('sm-paste').value || '').trim(); if (text.length < 200) { alert('Teksnya terlalu pendek. Tempel minimal beberapa paragraf.'); return; }
            paint(skeleton);
            try { const s = await generate({ ref, title: x.title, matkul: x.kategori, transcriptText: text, adminCode: dbData.adminCode }); lsSet('a9_sum_' + ref, s); if (tok === vTok) ready(s); }
            catch (er) { console.error(er); alert('Gagal: ' + (er.message || er)); }
        };
    }

    // tautan Drive/YouTube di halaman lain (Tugas, dll.) ikut memakai pratinjau baru
    window.openViewer = function (o) {
        const link = o.url || '', x = { title: o.title || 'Berkas', link, kategori: '', blok: '', sumber: '', matkul: '', tipe: '', key: 'x:' + a9Hash(link), it: {} };
        x.kind = a9KindOf(link, '');
        viewerOpen({ root: null }, [x], 0);
    };

    window.finderRender = () => CATS.forEach(draw);
    window.finderRender();
})();

// ==========================================================================
// BAGIAN 6 - ADMIN & OSCE
//   1) UI & sub menu (responsif, bottom-bar di HP)
//   2) Admin: edit jadwal (visual) + kelola folder/berkas
//   3) Tugas & pengumuman lewat deadline dihapus otomatis
//   4) Modul OSCE (setting -> mulai, timer per stase, soal per akun, rotasi/geser, AI)
// ==========================================================================
(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const esc = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const isAdmin = () => !!currentUser && currentUser.role === 'admin';
    const isGuest = () => !!currentUser && currentUser.role === 'guest';
    const clone = o => JSON.parse(JSON.stringify(o));
    const parseV = v => { if (typeof v === 'string') { try { return JSON.parse(v); } catch (e) { return null; } } return v; };
    const lines = s => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
    const fmt = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

    // ======================================================================
    // CSS
    // ======================================================================
    const css = document.createElement('style');
    css.textContent = `
    /* ---- Navigasi ---- */
    .simple-nav { display: flex; position: sticky; top: 0; z-index: 900; background: var(--bg-card); border-bottom: 1px solid var(--border-color); padding: 10px 20px; gap: 10px; }
    #sn-main { justify-content: center; }
    #sn-main .nav-pill { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; position: relative; }
    #sn-sub { background: var(--bg-base); border-radius: 14px; padding: 4px; gap: 4px; }
    #sn-sub .sn-chip { flex: 1 0 auto; border: none; background: transparent; border-radius: 10px; padding: 9px 16px; font-size: 14px; color: var(--text-muted); }
    #sn-sub .sn-chip:hover { color: var(--text-main); }
    #sn-sub .sn-chip.active { background: var(--bg-card); color: var(--primary); box-shadow: 0 2px 8px rgba(0,0,0,.1); }
    .live-dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: #ef4444; margin-left: 6px; animation: livep 1.2s infinite; }
    @keyframes livep { 50% { opacity: .25; } }
    @media (max-width: 768px) {
        body { padding-bottom: 84px; }
        .simple-nav { padding: 8px 10px; }
        #sn-main { position: fixed; left: 0; right: 0; bottom: 0; z-index: 950; background: var(--bg-card); border-top: 1px solid var(--border-color); box-shadow: 0 -4px 14px rgba(0,0,0,.1); padding: 6px 6px calc(6px + env(safe-area-inset-bottom)); justify-content: space-around; gap: 2px; overflow: visible; }
        #sn-main .nav-pill { flex: 1; min-width: 0; flex-direction: column; gap: 2px; padding: 6px 2px; font-size: 11px; border-radius: 12px; white-space: normal; text-align: center; line-height: 1.15; min-height: 52px; justify-content: center; }
        #sn-sub .sn-chip { padding: 9px 12px; font-size: 13px; }
        #toast-wrap { bottom: 96px; }
        #to-top { bottom: 104px; }
    }
    /* ---- Umum ---- */
    .hint { font-size: 13px; color: var(--text-muted); margin: 6px 0 12px; }
    .pre { white-space: pre-wrap; }
    .admin-form-box summary { cursor: pointer; font-weight: 700; padding: 6px 0; }
    /* ---- Editor jadwal ---- */
    .jde-day { border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 14px; margin: 12px 0; background: var(--bg-base); }
    .jde-top { display: grid; grid-template-columns: 170px 1fr auto; gap: 8px; margin-bottom: 8px; }
    .jde-ses { display: grid; grid-template-columns: 130px 1fr auto; gap: 8px; margin-bottom: 6px; }
    .jde-top .modern-input, .jde-ses .modern-input { margin: 0; }
    @media (max-width: 768px) { .jde-top, .jde-ses { grid-template-columns: 1fr; } }
    /* ---- Kelola folder ---- */
    .mg-folders { display: grid; gap: 8px; margin: 10px 0 18px; }
    .mg-f { display: grid; grid-template-columns: 1fr auto auto; gap: 8px; align-items: center; }
    .mg-f .modern-input, .mg-row .modern-input { margin: 0; }
    .mg-row { display: grid; grid-template-columns: 1.2fr 1fr 1.4fr auto auto; gap: 8px; padding: 10px 0; border-top: 1px dashed var(--border-color); }
    @media (max-width: 900px) { .mg-row, .mg-f { grid-template-columns: 1fr; } }
    /* ---- OSCE ---- */
    .osce-row3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
    .osce-stase { border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 12px 16px; margin-bottom: 10px; background: var(--bg-base); }
    .osce-stase summary { cursor: pointer; font-weight: 700; display: flex; justify-content: space-between; gap: 10px; }
    .osce-stase textarea { min-height: 80px; resize: vertical; }
    .osce-peserta { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 8px; margin: 12px 0; }
    .osce-peserta label { display: flex; align-items: center; gap: 8px; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 8px 12px; cursor: pointer; font-size: 14px; background: var(--bg-base); }
    .osce-peserta label.on { border-color: var(--primary); background: var(--primary-light); }
    .osce-ord { background: var(--primary); color: #fff; border-radius: 20px; padding: 0 8px; font-size: 12px; font-weight: 800; }
    .osce-round { background: var(--primary-light); color: var(--primary); border-radius: 20px; padding: 4px 14px; font-weight: 800; }
    .live-tag { background: #ef4444; color: #fff; border-radius: 6px; padding: 1px 8px; font-size: 12px; margin-left: 8px; }
    .osce-banner { border-radius: var(--radius-md); padding: 14px 18px; font-weight: 800; font-size: 16px; margin-bottom: 14px; }
    .osce-banner.warn { background: #fef3c7; color: #92400e; border: 2px solid #f59e0b; }
    .osce-banner.end { background: #fee2e2; color: #991b1b; border: 2px solid #ef4444; animation: livep 1s infinite; }
    .osce-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 14px; }
    .osce-st { border: 2px solid var(--border-color); border-radius: var(--radius-lg); padding: 14px; background: var(--bg-base); }
    .osce-st.warn { border-color: #f59e0b; background: #fffbeb; color: #78350f; }
    .osce-st.done { border-color: #ef4444; background: #fef2f2; color: #7f1d1d; }
    .osce-st-h { display: flex; justify-content: space-between; align-items: baseline; }
    .osce-who { font-weight: 700; margin: 6px 0; min-height: 22px; }
    .osce-time { font-size: 38px; font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: 1px; }
    .osce-bar { height: 8px; border-radius: 8px; background: var(--border-color); overflow: hidden; margin: 6px 0 8px; }
    .osce-bar i { display: block; height: 100%; width: 100%; background: var(--primary); transition: width .5s linear; }
    .osce-st details { margin-top: 8px; font-size: 13px; }
    .osce-st ol { margin: 6px 0 0 18px; }
    .osce-me-top { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
    .osce-chip { background: var(--primary-light); color: var(--primary); border-radius: 20px; padding: 4px 14px; font-weight: 700; font-size: 13px; }
    .osce-big { text-align: center; border: 3px solid var(--primary); border-radius: var(--radius-xl); padding: 18px; margin-bottom: 18px; background: var(--primary-light); }
    .osce-big #g-timer { font-size: 64px; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--primary); line-height: 1.1; }
    .osce-big.warn { border-color: #f59e0b; background: #fffbeb; } .osce-big.warn #g-timer { color: #b45309; }
    .osce-big.done { border-color: #ef4444; background: #fef2f2; } .osce-big.done #g-timer { color: #b91c1c; }
    .osce-sec { margin: 14px 0; } .osce-sec h4 { margin-bottom: 4px; color: var(--primary); }
    .osce-sec ol { margin-left: 20px; }
    `;
    document.head.appendChild(css);

    // ======================================================================
    // 1) Hapus otomatis tugas & pengumuman yang sudah lewat deadline
    // ======================================================================
    const todayStr = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    const isExpired = dl => { const m = String(dl || '').match(/^(\d{4}-\d{2}-\d{2})/); return !!m && m[1] < todayStr(); };

    function purgeLocal() {
        const ch = [];
        ['tugas', 'pengumuman'].forEach(k => {
            if (!Array.isArray(dbData[k])) return;
            const keep = dbData[k].filter(x => !isExpired(x.deadline));
            if (keep.length !== dbData[k].length) { dbData[k] = keep; ch.push(k); }
        });
        return ch;
    }
    // Admin: bersihkan di database. Baca data TERBARU dulu supaya tidak menimpa dengan cache lama.
    let purging = false;
    async function purgeRemote() {
        if (!isAdmin() || !supabaseClient || purging) return;
        purging = true;
        try {
            for (const k of ['tugas', 'pengumuman']) {
                const { data, error } = await supabaseClient.from('portal_db').select('value').eq('key', k).maybeSingle();
                if (error) throw error;
                const v = parseV(data && data.value);
                if (!Array.isArray(v)) continue;
                const keep = v.filter(x => !isExpired(x.deadline));
                if (keep.length !== v.length) {
                    const r = await supabaseClient.from('portal_db').upsert({ key: k, value: keep }, { onConflict: 'key' });
                    if (r.error) throw r.error;
                    dbData[k] = keep;
                }
            }
        } catch (e) { console.error('Purge gagal:', e); }
        purging = false;
        window.renderAll();
    }
    setInterval(() => { if (isAdmin()) purgeRemote(); }, 60 * 60 * 1000);

    // ======================================================================
    // 2) Admin: edit jadwal secara visual
    // ======================================================================
    const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const MONI = { jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5, jul: 6, agu: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11 };
    function parseTgl(t) {
        const m = String(t).match(/(\d{1,2})[-\s]([A-Za-z]{3})[a-z]*[-\s](\d{2,4})/); if (!m) return null;
        const mo = MONI[m[2].toLowerCase()]; if (mo === undefined) return null;
        let y = +m[3]; if (y < 100) y += 2000; return new Date(y, mo, +m[1]);
    }
    const isoD = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const tglStr = d => `${HARI[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')}-${BLN[d.getMonth()]}-${String(d.getFullYear()).slice(2)}`;

    let jd = null;
    const jdBox = document.createElement('details');
    jdBox.className = 'admin-form-box'; jdBox.id = 'jde'; jdBox.style.cssText = 'display:none;margin-top:20px;';
    jdBox.innerHTML = '<summary>\u270f\ufe0f Admin: edit jadwal (per hari &amp; sesi)</summary><div id="jde-body"></div>';
    $('jd-view').after(jdBox);

    function drawJde() {
        if (!jd) jd = clone(dbData.jadwalCustom || []);
        $('jde-body').innerHTML = '<p class="hint">Pilih tanggal lewat kalender, teks tanggal ikut terisi otomatis. Klik Simpan jadwal setelah selesai.</p>' +
            jd.map((day, i) => {
                const d = parseTgl(day.tgl);
                return `<div class="jde-day"><div class="jde-top">
                  <input type="date" class="modern-input" data-d="${i}" data-f="date" value="${d ? isoD(d) : ''}" aria-label="Tanggal">
                  <input class="modern-input" data-d="${i}" data-f="tgl" value="${esc(day.tgl)}" aria-label="Teks tanggal">
                  <button class="btn btn-danger btn-sm" data-jact="delday" data-d="${i}">Hapus hari</button></div>
                  ${day.sesi.map((s, k) => `<div class="jde-ses">
                    <input class="modern-input" data-d="${i}" data-s="${k}" data-f="jam" value="${esc(s.jam)}" placeholder="07.50-09.30" aria-label="Jam">
                    <input class="modern-input" data-d="${i}" data-s="${k}" data-f="kegiatan" value="${esc(s.kegiatan)}" placeholder="Kegiatan / dosen" aria-label="Kegiatan">
                    <button class="btn btn-outline btn-sm" data-jact="delses" data-d="${i}" data-s="${k}" aria-label="Hapus sesi">\u2715</button></div>`).join('')}
                  <button class="btn btn-outline btn-sm" data-jact="addses" data-d="${i}">+ Sesi</button></div>`;
            }).join('') +
            `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;">
              <button class="btn btn-outline" data-jact="addday">+ Tambah hari</button>
              <button class="btn btn-primary" data-jact="save">\ud83d\udcbe Simpan jadwal</button>
              <button class="btn btn-outline" data-jact="reset">\u21a9\ufe0f Batalkan perubahan</button></div>`;
    }
    jdBox.addEventListener('toggle', () => { if (jdBox.open) { jd = null; drawJde(); } });
    $('jde-body').addEventListener('input', e => {
        const t = e.target, i = t.dataset.d; if (i === undefined || !jd) return;
        const day = jd[+i], f = t.dataset.f;
        if (f === 'date') { if (t.value) { const d = new Date(t.value + 'T00:00:00'); day.tgl = tglStr(d); t.nextElementSibling.value = day.tgl; } }
        else if (f === 'tgl') day.tgl = t.value;
        else if (t.dataset.s !== undefined) day.sesi[+t.dataset.s][f] = t.value;
    });
    $('jde-body').addEventListener('click', async e => {
        const b = e.target.closest('[data-jact]'); if (!b || !jd) return;
        const a = b.dataset.jact, i = +b.dataset.d, k = +b.dataset.s;
        if (a === 'addday') { const last = jd.length ? parseTgl(jd[jd.length - 1].tgl) : null; const d = last ? new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1) : new Date(); jd.push({ tgl: tglStr(d), sesi: [{ jam: '', kegiatan: '' }] }); drawJde(); }
        else if (a === 'delday') { if (confirm('Hapus hari ini beserta semua sesinya?')) { jd.splice(i, 1); drawJde(); } }
        else if (a === 'addses') { jd[i].sesi.push({ jam: '', kegiatan: '' }); drawJde(); }
        else if (a === 'delses') { jd[i].sesi.splice(k, 1); drawJde(); }
        else if (a === 'reset') { jd = null; drawJde(); }
        else if (a === 'save') {
            if (jd.some(d => !String(d.tgl).trim())) { alert('Ada hari yang tanggalnya masih kosong.'); return; }
            jd.sort((x, y) => { const a1 = parseTgl(x.tgl), b1 = parseTgl(y.tgl); return (a1 && b1) ? a1 - b1 : 0; });
            dbData.jadwalCustom = clone(jd);
            if (await saveCategoryData('jadwal')) { jd = null; drawJde(); alert('Jadwal tersimpan.'); postUpdate('jadwal', '\ud83d\uddd3\ufe0f Jadwal diperbarui', 'Jadwal kuliah telah diperbarui. Cek menu Kuliah \u203a Jadwal.', { key: 'jadwal' }); }
        }
    });

    // ======================================================================
    // 4) OSCE
    // ======================================================================
    const OSCE_KEY = 'osce';
    let S = null;            // state tersimpan (server)
    let draft = null;        // setelan yang sedang diedit admin
    let draftOpen = false;   // admin membuka form setup setelah sesi selesai
    let curTab = 'home', lastBanner = null, firstLoad = true, guestPoll = null;
    const fired = {};
    const blank = () => ({ v: 1, status: 'setup', judul: 'OSCE', stase: [1, 2, 3, 4].map(i => ({ id: i, nama: 'Stase ' + i, durasi: 10, kasus: { judul: '', skenario: '', instruksi: '', tugas: '', checklist: '' } })), peserta: [], round: 0, roundStart: 0, startedAt: 0, warnSec: 60, autoGeser: false, sound: true, soundTheme: 'lonceng' });

    const main = document.querySelector('.main-content');
    main.insertAdjacentHTML('beforeend', '<div id="tab-osce" class="tab-content" style="display:none;"><div id="osce-root"></div></div>');

    // ---- suara: lonceng lembut (bukan bunyi beep tajam), 3 pilihan gaya ----
    let AC = null;
    function ctx() { if (!AC) { const C = window.AudioContext || window.webkitAudioContext; if (C) AC = new C(); } if (AC && AC.state === 'suspended') AC.resume(); return AC; }
    document.addEventListener('click', () => ctx());
    // satu nada: beberapa harmonik sinus dengan peluruhan halus
    function bell(freq, dur, delay, vol, partials) {
        const a = ctx(); if (!a) return;
        const t = a.currentTime + (delay || 0), master = a.createGain();
        master.gain.value = vol == null ? .5 : vol; master.connect(a.destination);
        (partials || [[1, 1], [2.01, .35], [3.0, .15], [4.2, .08]]).forEach(([r, g], i) => {
            const o = a.createOscillator(), e = a.createGain();
            o.type = 'sine'; o.frequency.value = freq * r;
            e.gain.setValueAtTime(.0001, t);
            e.gain.exponentialRampToValueAtTime(g, t + .012);
            e.gain.exponentialRampToValueAtTime(.0001, t + dur / (1 + i * .55));
            o.connect(e); e.connect(master); o.start(t); o.stop(t + dur + .1);
        });
    }
    const GONG = [[1, 1], [1.52, .6], [2.0, .45], [2.76, .3], [4.07, .15]];
    const ping = (f, dur, delay) => bell(f, dur, delay, .4, [[1, 1], [2, .12]]);
    const SOUNDS = {
        lonceng: { warn: () => { bell(784, 1.4, 0, .45); bell(988, 1.4, .28, .4); }, end: () => bell(523, 2.6, 0, .6), geser: () => [523, 659, 784, 1047].forEach((f, i) => bell(f, 1.8, i * .32, .5)) },
        gong: { warn: () => bell(196, 2.2, 0, .6, GONG), end: () => bell(130, 3.4, 0, .75, GONG), geser: () => { bell(130, 3.4, 0, .7, GONG); bell(196, 3, .9, .6, GONG); } },
        digital: { warn: () => { ping(880, .25, 0); ping(880, .25, .3); }, end: () => ping(660, .8, 0), geser: () => [0, .45, .9].forEach(d => ping(1175, .35, d)) }
    };
    const vib = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { } };
    function cue(kind, o) {
        if (!(o && o.force) && (!S || S.sound === false)) return;
        const th = (o && o.theme) || (S && S.soundTheme) || 'lonceng';
        const set = SOUNDS[th] || SOUNDS.lonceng;
        (set[kind] || set.geser)();
        if (kind === 'warn') vib([150, 100, 150]); else if (kind === 'end') vib([500]); else vib([300, 150, 300, 150, 300]);
    }
    function testSound() {
        const o = { force: true, theme: (draft && draft.soundTheme) || (S && S.soundTheme) || 'lonceng' };
        cue('warn', o); setTimeout(() => cue('end', o), 2000); setTimeout(() => cue('geser', o), 5000);
    }
    function paintBanner() {
        const el = $('osce-banner'); if (!el) return;
        if (!lastBanner) { el.style.display = 'none'; return; }
        el.style.display = 'block'; el.className = 'osce-banner ' + lastBanner.kind; el.textContent = lastBanner.msg;
    }
    function banner(msg, kind) { lastBanner = { msg, kind }; paintBanner(); alert(msg); }

    // ---- data ----
    async function loadOsce() {
        if (!supabaseClient) return;
        try {
            const { data, error } = await supabaseClient.from('portal_db').select('value').eq('key', OSCE_KEY).maybeSingle();
            if (error) throw error;
            const v = parseV(data && data.value);
            S = (v && typeof v === 'object' && !Array.isArray(v) && Array.isArray(v.stase)) ? v : null;
        } catch (e) { console.error('OSCE load:', e); }
    }
    async function persist(nx) {
        if (!supabaseClient) { alert('Koneksi ke server belum siap.'); return false; }
        try {
            const { error } = await supabaseClient.from('portal_db').upsert({ key: OSCE_KEY, value: nx }, { onConflict: 'key' });
            if (error) throw error;
            S = nx; return true;
        } catch (e) { console.error(e); alert('Gagal menyimpan ke server. Cek koneksi/izin tabel.'); return false; }
    }
    const sig = () => S ? [S.status, S.round, S.roundStart, S.startedAt, S.updated].join('|') : 'none';
    const adminView = () => (S && S.status === 'running') ? 'run' : (S && S.status === 'finished' && !draftOpen) ? 'done' : 'setup';
    const initDraft = () => { draft = Object.assign(blank(), clone(S || {})); draft.status = 'setup'; draft.round = 0; };
    const occupant = i => { const N = S.stase.length, p = (((i - S.round) % N) + N) % N; return S.peserta[p] || null; };
    const nextOcc = i => { const N = S.stase.length; if (S.round + 1 >= N) return null; const p = (((i - (S.round + 1)) % N) + N) % N; return S.peserta[p] || null; };
    const myStase = () => {
        if (!S || !isGuest()) return null; const idx = S.peserta.findIndex(p => p.nim === currentUser.nim); if (idx < 0) return null;
        const i = (idx + S.round) % S.stase.length; return { st: S.stase[i], i, idx };
    };

    // ---- navigasi: tambahkan tombol OSCE ke menu yang sudah ada ----
    const snMain = $('sn-main');
    function injectPill() {
        if (!currentUser) return;
        let b = $('sn-osce');
        if (!b) { b = document.createElement('button'); b.id = 'sn-osce'; b.className = 'nav-pill'; snMain.appendChild(b); }
        b.innerHTML = '\ud83e\ude7a OSCE' + (S && S.status === 'running' ? '<span class="live-dot"></span>' : '');
        const on = curTab === 'osce'; b.classList.toggle('active', on);
        if (on) snMain.querySelectorAll('.nav-pill:not(#sn-osce)').forEach(x => x.classList.remove('active'));
    }
    new MutationObserver(injectPill).observe(snMain, { childList: true });
    snMain.addEventListener('click', e => { if (e.target.closest('#sn-osce')) window.switchTab('osce', null); });

    const prevSw = window.switchTab;
    window.switchTab = function (t, b) {
        prevSw(t, b); curTab = t; injectPill();
        if (t === 'osce') { if (isAdmin()) { loadOsce().then(renderOsce); } else renderOsce(); }
    };

    // ---- render ----
    function renderOsce() {
        const root = $('osce-root'); if (!root) return;
        if (isAdmin()) {
            const v = adminView();
            if (v === 'setup' && !draft) initDraft();
            root.innerHTML = v === 'run' ? runHtml() : v === 'done' ? doneHtml() : setupHtml();
        } else root.innerHTML = guestHtml();
        paintBanner(); tick();
    }

    function setupHtml() {
        const d = draft, N = d.stase.length, entries = Object.entries(allowedUsers);
        const over = d.peserta.length > N;
        const opts = (dbData.skills_lab || []).map((it, i) => it.link && it.link !== '#' ? `<option value="${i}">${esc(it.nama)}</option>` : '').join('');
        return `
        <div class="card"><div class="card-header"><h3 class="card-title">\ud83e\ude7a OSCE \u00b7 Pengaturan Sesi</h3></div>
          <p class="report-hint">Alur: \u2460 atur stase &amp; waktu \u2461 isi soal kasus (manual atau AI) \u2462 pilih peserta \u2463 Simpan \u2464 Mulai. Tiap peserta mendapat soal berbeda, lalu berpindah (geser) setiap putaran sampai semua stase terlewati.</p>
          <div class="form-group"><label>Judul sesi</label><input class="modern-input" data-g="judul" value="${esc(d.judul)}"></div>
          <div class="osce-row3">
            <div class="form-group"><label>Peringatan geser (detik sebelum habis)</label><input type="number" min="5" class="modern-input" data-g="warnSec" value="${d.warnSec}"></div>
            <div class="form-group"><label>Geser otomatis</label><select class="modern-input" data-g="autoGeser"><option value="0"${d.autoGeser ? '' : ' selected'}>Tidak, admin menekan tombol</option><option value="1"${d.autoGeser ? ' selected' : ''}>Ya, 5 detik setelah semua habis</option></select></div>
            <div class="form-group"><label>Bunyi notifikasi</label><select class="modern-input" data-g="sound"><option value="1"${d.sound !== false ? ' selected' : ''}>Aktif</option><option value="0"${d.sound === false ? ' selected' : ''}>Mati</option></select></div>
            <div class="form-group"><label>Jenis suara</label><select class="modern-input" data-g="soundTheme"><option value="lonceng"${(d.soundTheme || 'lonceng') === 'lonceng' ? ' selected' : ''}>Lonceng lembut</option><option value="gong"${d.soundTheme === 'gong' ? ' selected' : ''}>Gong</option><option value="digital"${d.soundTheme === 'digital' ? ' selected' : ''}>Digital halus</option></select></div>
          </div></div>

        <div class="card"><div class="card-header flex-between"><h3 class="card-title">\ud83e\udde9 Stase (${N})</h3><button class="btn btn-outline btn-sm" data-oact="addStase">+ Tambah stase</button></div>
          ${d.stase.map((st, i) => `<details class="osce-stase"${i === 0 ? ' open' : ''}><summary><span>${i + 1}. ${esc(st.nama)}</span><span>\u23f1 ${st.durasi} menit</span></summary>
            <div class="osce-row3" style="margin-top:12px;">
              <div class="form-group"><label>Nama stase</label><input class="modern-input" data-s="${i}" data-f="nama" value="${esc(st.nama)}"></div>
              <div class="form-group"><label>Durasi (menit)</label><input type="number" min="1" class="modern-input" data-s="${i}" data-f="durasi" value="${st.durasi}"></div></div>
            <div class="form-group"><label>Judul kasus</label><input class="modern-input" data-s="${i}" data-f="judul" value="${esc(st.kasus.judul)}"></div>
            <div class="form-group"><label>Skenario / vignette</label><textarea class="modern-input" data-s="${i}" data-f="skenario">${esc(st.kasus.skenario)}</textarea></div>
            <div class="form-group"><label>Instruksi untuk peserta</label><textarea class="modern-input" data-s="${i}" data-f="instruksi">${esc(st.kasus.instruksi)}</textarea></div>
            <div class="form-group"><label>Tugas peserta (satu baris = satu tugas)</label><textarea class="modern-input" data-s="${i}" data-f="tugas">${esc(st.kasus.tugas)}</textarea></div>
            <div class="form-group"><label>Checklist penilaian (hanya untuk admin/penguji, satu baris = satu butir)</label><textarea class="modern-input" data-s="${i}" data-f="checklist">${esc(st.kasus.checklist)}</textarea></div>
            <button class="btn btn-danger btn-sm" data-oact="delStase" data-i="${i}">Hapus stase ini</button></details>`).join('')}
        </div>

        <div class="card"><details><summary style="cursor:pointer;font-weight:700;font-size:16px;">\ud83e\udd16 Buat soal kasus dengan AI (dari berkas Skills Lab)</summary>
          <p class="hint">AI membuat <strong>${N} kasus berbeda</strong> (satu per stase) dari materi yang kamu pilih. Hasilnya masuk ke form stase di atas dan <strong>tetap bisa kamu edit</strong> sebelum disimpan. Format berkas yang didukung: PDF atau teks. Berkas Word/PPT: ekspor ke PDF dulu. Link Google Drive tidak bisa dibaca langsung, unduh dulu lalu unggah di kolom kedua.</p>
          <div class="form-group"><label>\u2460 Pilih berkas Skills Lab (yang diunggah ke portal)</label><select id="ai-src" class="modern-input"><option value="">\u2014 tidak dipakai \u2014</option>${opts}</select></div>
          <div class="form-group"><label>\u2461 Atau unggah PDF/TXT dari perangkat</label><input type="file" id="ai-file" class="modern-input" accept=".pdf,.txt,.md"></div>
          <div class="form-group"><label>\u2462 Atau tempel teks materi</label><textarea id="ai-text" class="modern-input" style="height:90px;"></textarea></div>
          <div class="form-group"><label>Arahan tambahan (opsional)</label><input id="ai-extra" class="modern-input" placeholder="Contoh: fokus keterampilan anamnesis, tingkat semester 5"></div>
          <button class="btn btn-primary" data-oact="ai">\u2728 Buat ${N} soal kasus</button> <span id="ai-status" class="hint"></span>
        </details></div>

        <div class="card"><div class="card-header flex-between"><h3 class="card-title">\ud83d\udc65 Peserta (${d.peserta.length}/${N} stase)</h3>
          <span style="display:flex;gap:6px;flex-wrap:wrap;"><button class="btn btn-outline btn-sm" data-oact="selAll">Pilih semua</button><button class="btn btn-outline btn-sm" data-oact="selNone">Kosongkan</button><button class="btn btn-outline btn-sm" data-oact="shuffle">\ud83d\udd00 Acak urutan</button></span></div>
          <p class="hint">Urutan peserta menentukan soal awal: peserta #1 mulai di stase 1, #2 di stase 2, dst.${over ? ' <strong style="color:#b91c1c;">Jumlah peserta melebihi jumlah stase, kurangi atau tambah stase.</strong>' : ''}</p>
          <div class="osce-peserta">${entries.map(([nim, nama]) => { const o = d.peserta.findIndex(p => p.nim === nim); return `<label class="${o >= 0 ? 'on' : ''}"><input type="checkbox" data-p="${nim}"${o >= 0 ? ' checked' : ''}><span style="flex:1">${esc(nama)}<br><small style="color:var(--text-muted)">${nim}</small></span>${o >= 0 ? `<span class="osce-ord">#${o + 1}</span>` : ''}</label>`; }).join('')}</div>
          ${d.peserta.length ? `<details><summary style="cursor:pointer;font-weight:600;">Lihat pembagian soal awal</summary><ol style="margin:8px 0 0 20px;font-size:14px;">${d.peserta.map((p, i) => `<li>${esc(p.nama)} \u2192 ${d.stase[i] ? esc(d.stase[i].nama) : '\u26a0\ufe0f tidak ada stase'}</li>`).join('')}</ol></details>` : ''}
        </div>

        <div class="card"><div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-outline btn-lg" data-oact="save">\ud83d\udcbe Simpan setelan</button>
          <button class="btn btn-primary btn-lg" data-oact="launch">\u25b6\ufe0f Mulai OSCE</button>
          <button class="btn btn-outline btn-lg" data-oact="sound">\ud83d\udd0a Tes suara</button></div>
          <p class="hint" style="margin-top:10px;">Saat Mulai ditekan, semua timer stase berjalan bersamaan dan peserta langsung melihat soalnya. Biarkan tab ini tetap terbuka selama sesi supaya alarm berbunyi tepat waktu.</p></div>`;
    }

    function runHtml() {
        const N = S.stase.length, last = S.round + 1 >= N;
        return `<div class="card">
          <div class="card-header flex-between"><h3 class="card-title">\ud83e\ude7a ${esc(S.judul)} <span class="live-tag">LIVE</span></h3><span class="osce-round">Putaran ${S.round + 1} / ${N}</span></div>
          <div id="osce-banner" class="osce-banner" style="display:none"></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
            <button class="btn btn-primary btn-lg" data-oact="geser">${last ? '\ud83c\udfc1 Selesaikan OSCE' : '\u23ed Geser ke putaran ' + (S.round + 2)}</button>
            <button class="btn btn-outline" data-oact="sound">\ud83d\udd0a Tes suara</button>
            <button class="btn btn-danger" data-oact="stop">\u23f9 Batalkan sesi</button></div>
          <div class="osce-grid">${S.stase.map((st, i) => { const p = occupant(i), nx = nextOcc(i), k = st.kasus || {}; return `
            <div class="osce-st"><div class="osce-st-h"><strong>${esc(st.nama)}</strong><small>${st.durasi} menit</small></div>
              <div class="osce-who">${p ? esc(p.nama) : '<em style="color:var(--text-muted)">kosong</em>'}</div>
              <div class="osce-time" id="tm-${i}">--:--</div><div class="osce-bar"><i id="pb-${i}"></i></div>
              <small>${last ? 'Putaran terakhir' : 'Setelah geser: ' + (nx ? esc(nx.nama) : '\u2014')}</small>
              <details><summary>Soal &amp; checklist penguji</summary>
                <p class="pre"><strong>${esc(k.judul || '')}</strong>\n${esc(k.skenario || '')}</p>
                ${lines(k.tugas).length ? '<strong>Tugas</strong><ol>' + lines(k.tugas).map(x => `<li>${esc(x)}</li>`).join('') + '</ol>' : ''}
                ${lines(k.checklist).length ? '<strong>Checklist</strong><ol>' + lines(k.checklist).map(x => `<li>${esc(x)}</li>`).join('') + '</ol>' : ''}</details></div>`; }).join('')}</div></div>`;
    }

    function doneHtml() {
        return `<div class="card"><div class="empty-state"><div class="empty-icon">\ud83c\udfc1</div><h3>OSCE "${esc(S.judul)}" selesai</h3><p>${S.peserta.length} peserta telah melewati ${S.stase.length} stase.</p>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:14px;"><button class="btn btn-primary" data-oact="newSession">Buat sesi baru (pakai setelan ini)</button><button class="btn btn-outline" data-oact="resetAll">Hapus sesi</button></div></div></div>`;
    }

    function guestHtml() {
        const card = (t, m) => `<div class="card"><div class="empty-state"><div class="empty-icon">\ud83e\ude7a</div><h3>${t}</h3><p>${m}</p></div></div>`;
        if (!S || S.status === 'setup') {
            const reg = S && S.peserta.some(p => p.nim === currentUser.nim);
            return card('OSCE belum dimulai', reg ? 'Kamu terdaftar sebagai peserta. Soal akan muncul otomatis begitu admin menekan Mulai.' : 'Belum ada sesi OSCE yang berjalan.');
        }
        const me = myStase();
        if (!me) return card('Kamu tidak terdaftar', 'Kamu bukan peserta sesi OSCE ini. Hubungi admin bila ini keliru.');
        if (S.status === 'finished') return card('OSCE selesai', 'Terima kasih sudah mengikuti. Semoga hasilnya memuaskan!');
        const k = me.st.kasus || {}, N = S.stase.length;
        return `<div class="card">
          <div class="osce-me-top"><span class="osce-chip">${esc(S.judul)}</span><span class="osce-chip">Putaran ${S.round + 1} dari ${N}</span><span class="osce-chip">${esc(me.st.nama)}</span></div>
          <div class="osce-big" id="g-wrap"><div id="g-timer">--:--</div><small id="g-status">Sisa waktu di stase ini</small></div>
          <h3>${esc(k.judul || 'Kasus')}</h3>
          <div class="osce-sec"><h4>Skenario</h4><p class="pre">${esc(k.skenario || '-')}</p></div>
          ${k.instruksi ? `<div class="osce-sec"><h4>Instruksi</h4><p class="pre">${esc(k.instruksi)}</p></div>` : ''}
          ${lines(k.tugas).length ? `<div class="osce-sec"><h4>Tugasmu</h4><ol>${lines(k.tugas).map(x => `<li>${esc(x)}</li>`).join('')}</ol></div>` : ''}
          <p class="hint">Saat waktu habis, hentikan pekerjaanmu dan tunggu aba-aba geser dari admin. Layar ini otomatis berganti ke stase berikutnya.</p></div>`;
    }

    // ---- timer & alarm (jalan tiap 0,5 detik, hanya bila sesi berjalan dan tab OSCE terbuka/admin) ----
    function tick() {
        if (!S || S.status !== 'running' || !currentUser) return;
        const now = Date.now(), warn = (S.warnSec || 60) * 1000, k = S.startedAt + ':' + S.round;
        const rems = S.stase.map(st => S.roundStart + st.durasi * 60000 - now);
        if (isAdmin()) {
            rems.forEach((r, i) => {
                const el = $('tm-' + i); if (el) { el.textContent = fmt(r); const c = el.closest('.osce-st'); c.classList.toggle('warn', r > 0 && r <= warn); c.classList.toggle('done', r <= 0); }
                const bar = $('pb-' + i); if (bar) bar.style.width = Math.max(0, Math.min(100, r / (S.stase[i].durasi * 600))) + '%';
            });
            const used = rems.filter((r, i) => occupant(i)), maxRem = Math.max(...(used.length ? used : rems));
            rems.forEach((r, i) => {
                if (!occupant(i)) return;
                if (r > 0 && r <= warn && !fired[k + 'w' + i]) { fired[k + 'w' + i] = 1; banner(`${S.stase[i].nama}: sisa ${fmt(r)}`, 'warn'); cue('warn'); }
                if (r <= 0 && !fired[k + 'e' + i]) { fired[k + 'e' + i] = 1; cue('end'); }
            });
            if (maxRem > 0 && maxRem <= warn && !fired[k + 'gw']) { fired[k + 'gw'] = 1; banner('\u26a0\ufe0f Bersiap geser, sisa ' + fmt(maxRem) + '. Siapkan peserta berpindah.', 'warn'); cue('geser'); }
            if (maxRem <= 0) {
                if (!fired[k + 'ge']) { fired[k + 'ge'] = 1; fired[k + 'gt'] = now; banner('\ud83d\udd14 WAKTU HABIS di semua stase. SILAKAN GESER.', 'end'); cue('geser'); }
                else if (now - fired[k + 'gt'] > 8000 && !fired[k + 'gr']) { fired[k + 'gr'] = 1; cue('geser'); }
                if (S.autoGeser && now - fired[k + 'gt'] > 5000 && !fired[k + 'auto']) { fired[k + 'auto'] = 1; geser(true); }
            }
        } else if (isGuest()) {
            const me = myStase(); if (!me) return;
            const r = S.roundStart + me.st.durasi * 60000 - now, gk = k + 'g' + me.i;
            const el = $('g-timer'); if (el) {
                el.textContent = fmt(r); const w = $('g-wrap'); w.classList.toggle('warn', r > 0 && r <= warn); w.classList.toggle('done', r <= 0);
                $('g-status').textContent = r <= 0 ? 'Waktu habis, tunggu aba-aba geser' : r <= warn ? 'Waktu hampir habis!' : 'Sisa waktu di stase ini';
            }
            if (r > 0 && r <= warn && !fired[gk + 'w']) { fired[gk + 'w'] = 1; cue('warn'); }
            if (r <= 0 && !fired[gk + 'e']) { fired[gk + 'e'] = 1; cue('end'); }
        }
    }
    setInterval(tick, 500);

    // ---- aksi admin ----
    async function geser(auto) {
        if (!isAdmin() || !S || S.status !== 'running') return;
        const now = Date.now();
        const allDone = S.stase.every((st, i) => !occupant(i) || S.roundStart + st.durasi * 60000 <= now);
        if (!auto && !allDone && !confirm('Masih ada stase yang waktunya belum habis. Tetap geser sekarang?')) return;
        const nx = Object.assign({}, S, { updated: now });
        if (S.round + 1 >= S.stase.length) nx.status = 'finished'; else { nx.round = S.round + 1; nx.roundStart = now; }
        lastBanner = null; if (await persist(nx)) { injectPill(); renderOsce(); }
    }
    async function launch() {
        const N = draft.stase.length;
        if (!draft.peserta.length) return alert('Pilih minimal satu peserta.');
        if (draft.peserta.length > N) return alert(`Peserta (${draft.peserta.length}) lebih banyak dari stase (${N}).`);
        if (draft.stase.some(s => !(s.durasi >= 1))) return alert('Durasi tiap stase minimal 1 menit.');
        const kosong = draft.stase.filter(s => !String(s.kasus.skenario).trim()).length;
        if (kosong && !confirm(`${kosong} stase belum punya skenario soal. Tetap mulai?`)) return;
        if (!confirm('Mulai OSCE sekarang? Timer berjalan dan peserta langsung melihat soalnya.')) return;
        ctx(); const now = Date.now();
        const nx = Object.assign(clone(draft), { status: 'running', round: 0, roundStart: now, startedAt: now, updated: now });
        Object.keys(fired).forEach(x => delete fired[x]); lastBanner = null; draftOpen = false;
        if (await persist(nx)) { injectPill(); renderOsce(); }
    }

    // ---- AI ----
    const toB64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
    async function aiGenerate() {
        if (!supabaseClient) return alert('Koneksi ke server belum siap.');
        const n = draft.stase.length, st = $('ai-status'); let pdf = null, text = ($('ai-text').value || '').trim(), blob = null, name = '';
        const f = $('ai-file').files[0], sel = $('ai-src').value;
        if (f) { blob = f; name = f.name; }
        else if (sel !== '') {
            const it = (dbData.skills_lab || [])[+sel];
            try { const r = await fetch(it.link); if (!r.ok) throw new Error(r.status); blob = await r.blob(); name = it.link.split('?')[0]; }
            catch (e) { return alert('Berkas tidak bisa dibaca langsung (mungkin link Google Drive). Unduh dulu lalu unggah di kolom \u2461, atau tempel teksnya.'); }
        }
        if (blob) {
            if (/\.pdf$/i.test(name) || blob.type === 'application/pdf') pdf = await toB64(blob);
            else if (/\.(txt|md)$/i.test(name) || (blob.type || '').startsWith('text/')) text += '\n' + await blob.text();
            else return alert('Format belum didukung. Gunakan PDF atau teks (Word/PPT: ekspor ke PDF).');
        }
        if (!pdf && !text) return alert('Pilih berkas atau tempel teks materi terlebih dulu.');
        if (pdf && pdf.length > 6000000) return alert('PDF terlalu besar (maks sekitar 4 MB). Pecah atau kompres dulu.');
        if (draft.stase.some(s => String(s.kasus.skenario).trim()) && !confirm('Soal yang sudah terisi akan ditimpa hasil AI. Lanjutkan?')) return;
        st.textContent = '\u23f3 AI sedang menyusun soal, tunggu sekitar 20-60 detik...';
        try {
            const data = await invokeEdge('osce-ai', { n, pdf, text, extra: $('ai-extra').value, judul: draft.judul, adminCode: dbData.adminCode || 'A9ACOR' });
            if (!data || !Array.isArray(data.kasus)) throw new Error('Respons tidak valid');
            data.kasus.slice(0, n).forEach((k, i) => {
                const j = x => Array.isArray(x) ? x.join('\n') : String(x || '');
                draft.stase[i].kasus = { judul: j(k.judul), skenario: j(k.skenario), instruksi: j(k.instruksi), tugas: j(k.tugas), checklist: j(k.checklist) };
                if (k.nama && /^stase \d+$/i.test(draft.stase[i].nama)) draft.stase[i].nama = String(k.nama);
            });
            renderOsce(); alert('Soal dari AI sudah masuk. Periksa & edit dulu, lalu Simpan setelan.');
        } catch (e) { console.error(e); st.textContent = ''; alert('AI gagal: ' + (e.message || e)); }
    }

    // ---- event delegasi di tab OSCE ----
    const tabO = $('tab-osce');
    function onField(t) {
        if (!isAdmin() || !draft) return;
        if (t.dataset.g) { const g = t.dataset.g; if (g === 'soundTheme') { draft.soundTheme = t.value; return; } draft[g] = (t.tagName === 'SELECT') ? t.value === '1' : t.type === 'number' ? (+t.value || 0) : t.value; return; }
        if (t.dataset.s !== undefined && t.dataset.f) {
            const s = draft.stase[+t.dataset.s], f = t.dataset.f;
            if (f === 'nama') s.nama = t.value; else if (f === 'durasi') s.durasi = Math.max(1, +t.value || 1); else s.kasus[f] = t.value;
        }
    }
    tabO.addEventListener('input', e => { if (e.target.tagName !== 'SELECT' && e.target.type !== 'checkbox') onField(e.target); });
    tabO.addEventListener('change', e => {
        const t = e.target;
        if (t.dataset.p !== undefined && draft) {
            const nim = t.dataset.p, i = draft.peserta.findIndex(p => p.nim === nim);
            if (t.checked && i < 0) draft.peserta.push({ nim, nama: allowedUsers[nim] }); else if (!t.checked && i >= 0) draft.peserta.splice(i, 1);
            renderOsce();
        } else onField(t);
    });
    tabO.addEventListener('click', async e => {
        const b = e.target.closest('[data-oact]'); if (!b) return; const a = b.dataset.oact; ctx();
        if (a === 'sound') { testSound(); return; }
        if (!isAdmin()) return;
        if (a === 'geser') geser(false);
        else if (a === 'stop') { if (confirm('Batalkan sesi OSCE yang sedang berjalan? Peserta tidak melihat soal lagi.')) { const nx = Object.assign({}, S, { status: 'setup', round: 0, updated: Date.now() }); lastBanner = null; if (await persist(nx)) { initDraft(); injectPill(); renderOsce(); } } }
        else if (a === 'newSession') { draftOpen = true; initDraft(); renderOsce(); }
        else if (a === 'resetAll') { if (confirm('Hapus sesi OSCE ini?')) { draftOpen = false; draft = null; if (await persist(blank())) { initDraft(); injectPill(); renderOsce(); } } }
        else if (!draft) return;
        else if (a === 'addStase') { const n = draft.stase.length; draft.stase.push({ id: Date.now(), nama: 'Stase ' + (n + 1), durasi: draft.stase[n - 1] ? draft.stase[n - 1].durasi : 10, kasus: { judul: '', skenario: '', instruksi: '', tugas: '', checklist: '' } }); renderOsce(); }
        else if (a === 'delStase') { if (draft.stase.length <= 1) return alert('Minimal satu stase.'); if (confirm('Hapus stase ini?')) { draft.stase.splice(+b.dataset.i, 1); renderOsce(); } }
        else if (a === 'selAll') { draft.peserta = Object.entries(allowedUsers).map(([nim, nama]) => ({ nim, nama })); renderOsce(); }
        else if (a === 'selNone') { draft.peserta = []; renderOsce(); }
        else if (a === 'shuffle') { for (let i = draft.peserta.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [draft.peserta[i], draft.peserta[j]] = [draft.peserta[j], draft.peserta[i]]; } renderOsce(); }
        else if (a === 'save') { if (await persist(Object.assign(clone(draft), { status: 'setup', round: 0, roundStart: 0, updated: Date.now() }))) alert('Setelan OSCE tersimpan.'); }
        else if (a === 'launch') launch();
        else if (a === 'ai') aiGenerate();
    });

    // ---- polling untuk mahasiswa ----
    async function pollGuest() {
        if (!isGuest()) return;
        const before = sig(); await loadOsce(); const after = sig();
        if (after !== before) {
            if (!firstLoad && S) {
                const bs = before.split('|');
                if (S.status === 'running' && bs[0] !== 'running') { alert('\ud83e\ude7a OSCE dimulai! Buka menu OSCE.'); cue('warn'); }
                else if (S.status === 'running' && String(S.round) !== bs[1]) { alert('\ud83d\udd04 Geser! Kamu pindah ke stase berikutnya.'); cue('geser'); }
                else if (S.status === 'finished' && bs[0] === 'running') alert('\ud83c\udfc1 OSCE selesai.');
            }
            injectPill(); if (curTab === 'osce') renderOsce();
        }
        firstLoad = false;
    }

    // ---- hook login ----
    const prevLogin = window.finishLogin;
    window.finishLogin = function () {
        prevLogin(); curTab = 'home'; firstLoad = true;
        jdBox.style.display = isAdmin() ? 'block' : 'none';
        loadOsce().then(() => { injectPill(); firstLoad = false; });
        if (guestPoll) { clearInterval(guestPoll); guestPoll = null; }
        if (isGuest()) guestPoll = setInterval(pollGuest, 3000);
        if (isAdmin()) purgeRemote();
    };

    // ---- hook renderAll ----
    const prevRender = window.renderAll;
    window.renderAll = function () {
        const ch = purgeLocal();
        prevRender();
        try {
            jdBox.style.display = isAdmin() ? 'block' : 'none';
        } catch (e) { console.error(e); }
        if (ch.length && isAdmin()) purgeRemote();
    };
    window.renderAll();
})();

// ==========================================================================
// BAGIAN 8 - BERANDA CERDAS: PENGINGAT (tugas mepet + jadwal besok paling krusial)
//            & TEMPLATE PENGUMUMAN UNTUK ADMIN
// ==========================================================================
(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const esc = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const isAdmin = () => !!currentUser && currentUser.role === 'admin';

    const css = document.createElement('style');
    css.textContent = `
    .smart-rem h3 { font-size: 18px; margin-bottom: 4px; }
    .rem-sec { margin-top: 16px; }
    .rem-sec h4 { font-size: 14px; color: var(--text-muted); font-weight: 700; margin-bottom: 8px; }
    .rem-top { border-radius: var(--radius-md); padding: 14px 16px; margin-bottom: 8px; border: 1.5px solid var(--border-color); background: var(--bg-base); }
    .rem-top b { display: block; font-size: 16px; margin: 2px 0; }
    .rem-top small { color: var(--text-muted); }
    .rem-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 10px 2px; border-top: 1px solid var(--border-color); font-size: 14px; }
    .rem-row:first-of-type { border-top: none; }
    .rem-pill { flex: none; border-radius: 999px; padding: 2px 10px; font-size: 12px; font-weight: 700; background: var(--primary-light); color: var(--primary); white-space: nowrap; }
    .lv5 { border-color: #ef4444; background: rgba(239,68,68,.08); } .lv5 .rem-pill, .rem-pill.lv5 { background: #ef4444; color: #fff; }
    .lv4 { border-color: #f97316; background: rgba(249,115,22,.08); } .lv4 .rem-pill, .rem-pill.lv4 { background: #f97316; color: #fff; }
    .lv3 { border-color: #f59e0b; background: rgba(245,158,11,.09); } .lv3 .rem-pill, .rem-pill.lv3 { background: #f59e0b; color: #fff; }
    .rem-pill.late { background: #ef4444; color: #fff; } .rem-pill.today { background: #ef4444; color: #fff; } .rem-pill.soon { background: #f59e0b; color: #fff; }
    .rem-empty { color: var(--text-muted); font-size: 14px; }
    .tpl-box { border: 1.5px dashed var(--primary); border-radius: var(--radius-lg); padding: 14px 16px; margin-bottom: 16px; background: var(--primary-light); }
    .tpl-box > label { font-weight: 700; display: block; margin-bottom: 8px; }
    .tpl-row { display: grid; grid-template-columns: 1fr 160px; gap: 8px; }
    .tpl-box .modern-input { margin-bottom: 8px; }
    #tpl-fields .form-group { margin-bottom: 0; }
    @media (max-width: 560px) { .tpl-row { grid-template-columns: 1fr; } }`;
    document.head.appendChild(css);

    // ======================== PENGINGAT ========================
    const MON = { jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5, jul: 6, agu: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11 };
    function parseTgl(t) {
        const m = String(t).match(/(\d{1,2})[-\s]([A-Za-z]{3})[a-z]*[-\s](\d{2,4})/); if (!m) return null;
        const mo = MON[m[2].toLowerCase()]; if (mo === undefined) return null;
        let y = +m[3]; if (y < 100) y += 2000; return new Date(y, mo, +m[1]);
    }
    const sod = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

    // Urutan kepentingan: UB > Responsi > Praktikum/Ujian/OSCE > Tutorial > Kelas > lainnya
    const RANK = [
        [/\bUB\b|ujian\s*blok/i, 5, 'UB'],
        [/responsi/i, 4, 'Responsi'],
        [/osce|ujian|praktikum|skills?\s*lab|\blab(oratorium)?\b|kuis|quiz|\btes\b/i, 3, 'Praktikum / Ujian'],
        [/tutor/i, 2, 'Tutorial'],
        [/kuliah|kelas|pleno|ceramah|diskusi|\bdr\.|prof/i, 1, 'Kelas']
    ];
    function rank(txt) { for (const [re, sc, lb] of RANK) if (re.test(txt)) return { sc, lb }; return { sc: 0, lb: 'Kegiatan' }; }

    function dayItems(J, d) {
        const e = J.find(x => x.d.getTime() === d.getTime()); if (!e) return null;
        return e.j.sesi.filter(s => s && s.kegiatan && s.kegiatan.trim() !== '-')
            .map(s => Object.assign({ jam: s.jam, kegiatan: s.kegiatan }, rank(s.kegiatan)))
            .sort((a, b) => b.sc - a.sc || String(a.jam).localeCompare(String(b.jam)));
    }

    function reminderData() {
        const today = sod(new Date()), tmr = addDays(today, 1);
        const J = (dbData.jadwalCustom || []).filter(j => j && Array.isArray(j.sesi)).map(j => ({ j, d: parseTgl(j.tgl) })).filter(x => x.d);
        const besok = dayItems(J, tmr);
        const tugas = (dbData.tugas || []).map(t => {
            const m = String(t.deadline || '').match(/^\d{4}-\d{2}-\d{2}/); if (!m) return null;
            return { nama: t.nama, days: Math.round((new Date(m[0] + 'T00:00:00') - today) / 86400000) };
        }).filter(t => t && t.days <= 3).sort((a, b) => a.days - b.days);
        const next = [];
        for (let o = 2; o <= 7; o++) {
            const it = dayItems(J, addDays(today, o)); if (!it) continue;
            it.filter(x => x.sc >= 3).forEach(x => next.push(Object.assign({ off: o, d: addDays(today, o) }, x)));
        }
        next.sort((a, b) => a.off - b.off || b.sc - a.sc);
        return { tmr, besok, tugas, next: next.slice(0, 5) };
    }

    const pillDays = n => n < 0 ? ['Terlewat', 'late'] : n === 0 ? ['Hari ini', 'today'] : n === 1 ? ['Besok', 'soon'] : [n + ' hari lagi', ''];
    const dm = d => d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });

    function reminderHtml(R) {
        let h = '<h3>\ud83d\udd14 Pengingat</h3>';
        h += `<div class="rem-sec"><h4>Besok \u00b7 ${esc(dm(R.tmr))}</h4>`;
        if (R.besok === null) h += '<p class="rem-empty">Jadwal besok belum diisi.</p>';
        else if (!R.besok.length) h += '<p class="rem-empty">Tidak ada kegiatan terjadwal besok. Waktu yang pas untuk mengulang materi. \ud83d\udcd6</p>';
        else {
            const top = R.besok[0];
            h += `<div class="rem-top ${top.sc >= 3 ? 'lv' + top.sc : ''}"><small>${top.sc >= 3 ? '\u2b50 Paling krusial besok' : 'Kegiatan pertama besok'} \u00b7 <span class="rem-pill ${top.sc >= 3 ? 'lv' + top.sc : ''}">${esc(top.lb)}</span></small><b>${esc(top.kegiatan)}</b><small>\ud83d\udd52 ${esc(top.jam)}</small></div>`;
            h += R.besok.slice(1).map(x => `<div class="rem-row"><span>${esc(x.kegiatan)}<br><small style="color:var(--text-muted)">\ud83d\udd52 ${esc(x.jam)}</small></span><span class="rem-pill ${x.sc >= 3 ? 'lv' + x.sc : ''}">${esc(x.lb)}</span></div>`).join('');
        }
        h += '</div>';
        h += '<div class="rem-sec"><h4>Tugas yang deadline-nya mepet</h4>';
        h += R.tugas.length ? R.tugas.map(t => { const [lb, cl] = pillDays(t.days); return `<div class="rem-row"><span>${esc(t.nama)}</span><span class="rem-pill ${cl}">${lb}</span></div>`; }).join('') : '<p class="rem-empty">Tidak ada tugas yang mepet. \ud83c\udf89</p>';
        h += '</div>';
        if (R.next.length) {
            h += '<div class="rem-sec"><h4>Segera (7 hari ke depan)</h4>' + R.next.map(x => `<div class="rem-row"><span>${esc(x.kegiatan)}<br><small style="color:var(--text-muted)">${esc(dm(x.d))} \u00b7 ${esc(x.jam)}</small></span><span class="rem-pill lv${x.sc}">${esc(x.lb)} \u00b7 ${x.off} hari</span></div>`).join('') + '</div>';
        }
        return h;
    }

    function renderReminder() {
        const home = $('tab-home'); if (!home || !currentUser) return;
        let c = $('smart-rem');
        if (!c) {
            c = document.createElement('div'); c.id = 'smart-rem'; c.className = 'card smart-rem';
            const g = $('greeting'); if (g) g.after(c); else home.prepend(c);
        }
        const html = reminderHtml(reminderData());
        if (c.dataset.h !== html) { c.innerHTML = html; c.dataset.h = html; }
    }

    function loginToast() {
        try { if (sessionStorage.getItem('a9_rem_shown')) return; sessionStorage.setItem('a9_rem_shown', '1'); } catch (e) { }
        const R = reminderData(), parts = [];
        if (R.besok && R.besok.length) { const t = R.besok[0]; parts.push(`Besok: ${t.lb} ${t.jam}`); }
        if (R.tugas.length) parts.push(`${R.tugas.length} tugas mepet`);
        if (parts.length) alert('\ud83d\udd14 ' + parts.join(' \u00b7 '));
    }

    const prevRender = window.renderAll;
    window.renderAll = function () {
        prevRender();
        try { renderReminder(); } catch (e) { console.error(e); }
    };
    // hari berganti saat halaman terbuka: perbarui pengingat
    let lastDay = new Date().toDateString();
    setInterval(() => { const d = new Date().toDateString(); if (d !== lastDay) { lastDay = d; window.renderAll(); } }, 5 * 60 * 1000);

    const prevLogin = window.finishLogin;
    window.finishLogin = function () {
        prevLogin();
        try { renderReminder(); } catch (e) { }
        (typeof dbReady !== 'undefined' ? dbReady : Promise.resolve()).then(() => setTimeout(() => { try { renderReminder(); loginToast(); } catch (e) { } }, 900));
    };
    window.renderAll();

    // ======================== TEMPLATE PENGUMUMAN ========================
    const JENIS = ['UB (Ujian Blok)', 'Responsi', 'Praktikum', 'Skills Lab', 'OSCE', 'Tutorial', 'Kuis / Tes', 'Kuliah / Kelas'];
    const opt = (s, k) => s ? `\n${k}${s}` : '';
    const TPL = {
        tugas: {
            label: '\ud83d\udcdd Tugas baru', kind: 'tugas',
            fields: [['mk', 'Mata kuliah / blok'], ['nama', 'Nama tugas'], ['dl', 'Deadline', 'date'], ['cara', 'Cara mengumpulkan (opsional)'], ['cat', 'Catatan (opsional)']],
            need: ['mk', 'nama', 'dl'],
            build: (f, t) => ({
                judul: `\ud83d\udcdd Tugas ${f.mk}: ${f.nama}`, until: f.dl,
                isi: t === 'santai'
                    ? `Halo A9! \ud83d\udc4b Ada tugas ${f.mk}: "${f.nama}". Deadline ${tglIndo(f.dl)}.${f.cara ? ' Kumpulkan lewat ' + f.cara + '.' : ''}${opt(f.cat, 'Catatan: ')}\nJangan ditunda ya, semangat! \ud83d\udcaa`
                    : `Diberitahukan kepada seluruh mahasiswa A9 bahwa terdapat tugas ${f.mk} berjudul "${f.nama}". Batas pengumpulan: ${tglIndo(f.dl)}.${f.cara ? ' Pengumpulan melalui ' + f.cara + '.' : ''}${opt(f.cat, 'Catatan: ')}\nMohon dikerjakan dan dikumpulkan tepat waktu. Terima kasih.`
            })
        },
        ujian: {
            label: '\ud83d\udccc UB / Responsi / Praktikum / Ujian', kind: 'ujian',
            fields: [['jenis', 'Jenis kegiatan', 'select', JENIS], ['materi', 'Materi / cakupan (opsional)'], ['tgl', 'Tanggal', 'date'], ['jam', 'Jam (contoh 07.50-09.30)'], ['tempat', 'Tempat (opsional)'], ['bawa', 'Yang perlu dibawa (opsional)'], ['cat', 'Catatan (opsional)']],
            need: ['jenis', 'tgl'],
            build: (f, t) => ({
                judul: `\ud83d\udccc ${f.jenis} \u00b7 ${tglIndo(f.tgl)}`, until: f.tgl,
                isi: t === 'santai'
                    ? `Heads up A9! \ud83d\udce3 ${f.jenis} pada ${tglIndo(f.tgl)}${f.jam ? ', jam ' + f.jam : ''}${f.tempat ? ', di ' + f.tempat : ''}.${opt(f.materi, 'Materi: ')}${opt(f.bawa, 'Bawa: ')}${opt(f.cat, 'Catatan: ')}\nYuk siap-siap dari sekarang, kamu pasti bisa! \ud83d\udd25`
                    : `${f.jenis} akan dilaksanakan pada ${tglIndo(f.tgl)}${f.jam ? ', pukul ' + f.jam : ''}${f.tempat ? ', bertempat di ' + f.tempat : ''}.${opt(f.materi, 'Materi: ')}${opt(f.bawa, 'Yang perlu dibawa/disiapkan: ')}${opt(f.cat, 'Catatan: ')}\nMohon hadir tepat waktu dan mempersiapkan diri dengan baik.`
            })
        },
        jadwal: {
            label: '\ud83d\uddd3\ufe0f Perubahan jadwal (spesifik: apa yang dipindah)', kind: 'jadwal',
            fields: [['keg', 'Kegiatan / mata kuliah yang dipindah'], ['lamaTgl', 'Tanggal LAMA', 'date'], ['lamaJam', 'Jam lama (opsional, contoh 07.50-09.30)'], ['lamaTempat', 'Tempat lama (opsional)'], ['tgl', 'Tanggal BARU', 'date'], ['jam', 'Jam baru (opsional)'], ['tempat', 'Tempat baru (opsional)'], ['dosen', 'Dosen / pengampu (opsional)'], ['alasan', 'Alasan (opsional)'], ['cat', 'Catatan lain (opsional)']],
            need: ['keg', 'tgl'],
            build: (f, t) => {
                const sh = iso => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : ''; };
                const rows = [];
                const diff = (lbl, a, b) => { if (a && b && a === b) rows.push(`\u2022 ${lbl}: tetap ${a}`); else if (a && b) rows.push(`\u2022 ${lbl}: ${a} \u2192 ${b}`); else if (b) rows.push(`\u2022 ${lbl} baru: ${b}`); else if (a) rows.push(`\u2022 ${lbl}: tetap ${a}`); };
                diff('Hari/tanggal', f.lamaTgl ? tglIndo(f.lamaTgl) : '', tglIndo(f.tgl));
                diff('Jam', f.lamaJam, f.jam);
                diff('Tempat', f.lamaTempat, f.tempat);
                const daftar = rows.join('\n');
                return {
                    judul: `\ud83d\uddd3\ufe0f ${f.keg} dipindah${f.lamaTgl ? ' ' + sh(f.lamaTgl) + ' \u2192 ' + sh(f.tgl) : ' ke ' + sh(f.tgl)}`, until: f.tgl,
                    isi: t === 'santai'
                        ? `Info perubahan jadwal ya, A9! \ud83d\udd04\n${f.keg}${f.dosen ? ' (' + f.dosen + ')' : ''} dipindah. Yang berubah:\n${daftar}${opt(f.alasan, 'Alasan: ')}${opt(f.cat, 'Catatan: ')}\nMohon sesuaikan jadwalmu ya!`
                        : `Diinformasikan bahwa jadwal ${f.keg}${f.dosen ? ' (' + f.dosen + ')' : ''} mengalami perubahan.\nRincian perubahan:\n${daftar}${opt(f.alasan, 'Alasan: ')}${opt(f.cat, 'Catatan: ')}\nMohon menyesuaikan jadwal masing-masing. Terima kasih.`
                };
            }
        },
        tiada: {
            label: '\ud83d\udeab Kelas ditiadakan / diganti', kind: 'jadwal',
            fields: [['keg', 'Kegiatan'], ['tgl', 'Tanggal', 'date'], ['ganti', 'Pengganti / tindak lanjut (opsional)'], ['alasan', 'Alasan (opsional)']],
            need: ['keg', 'tgl'],
            build: (f, t) => ({
                judul: `\ud83d\udeab ${f.keg} ditiadakan (${tglIndo(f.tgl)})`, until: f.tgl,
                isi: t === 'santai'
                    ? `Kabar baik/buruk, A9! ${f.keg} pada ${tglIndo(f.tgl)} ditiadakan.${opt(f.alasan, 'Alasan: ')}${opt(f.ganti, 'Gantinya: ')}\nManfaatkan waktunya untuk belajar mandiri ya! \ud83d\udcda`
                    : `Diberitahukan bahwa ${f.keg} pada ${tglIndo(f.tgl)} ditiadakan.${opt(f.alasan, 'Alasan: ')}${opt(f.ganti, 'Pengganti/tindak lanjut: ')}\nTerima kasih atas perhatiannya.`
            })
        },
        materi: {
            label: '\ud83d\udcda Materi baru', kind: 'materi',
            fields: [['mk', 'Mata kuliah / blok'], ['topik', 'Topik materi'], ['lokasi', 'Lokasi di portal (opsional)']],
            need: ['mk', 'topik'],
            build: (f, t) => ({
                judul: `\ud83d\udcda Materi baru: ${f.topik}`, until: '',
                isi: t === 'santai'
                    ? `Materi baru sudah naik, A9! \ud83d\udcda ${f.mk}: ${f.topik}. Cek di ${f.lokasi || 'menu Kuliah \u203a Materi'}. Selamat belajar! \u2728`
                    : `Materi ${f.mk} dengan topik "${f.topik}" telah diunggah dan dapat diakses di ${f.lokasi || 'menu Kuliah \u203a Materi'}. Silakan dipelajari. Terima kasih.`
            })
        },
        penting: {
            label: '\u26a0\ufe0f Penting / mendesak', kind: 'penting',
            fields: [['isi', 'Isi informasi'], ['tgl', 'Berlaku sampai (opsional)', 'date']],
            need: ['isi'],
            build: (f, t) => ({
                judul: '\u26a0\ufe0f PENTING: mohon dibaca', until: f.tgl || '',
                isi: t === 'santai' ? `Perhatian A9! \u26a0\ufe0f\n${f.isi}\nMohon segera ditindaklanjuti ya. Terima kasih!` : `Perhatian kepada seluruh mahasiswa.\n${f.isi}\nMohon segera ditindaklanjuti. Terima kasih.`
            })
        },
        umum: {
            label: '\ud83d\udce2 Pengumuman umum', kind: 'info',
            fields: [['judul', 'Judul'], ['isi', 'Isi pengumuman'], ['tgl', 'Berlaku sampai (opsional)', 'date']],
            need: ['judul', 'isi'],
            build: (f, t) => ({
                judul: f.judul, until: f.tgl || '',
                isi: t === 'santai' ? `Halo A9! \ud83d\udc4b\n${f.isi}\nTerima kasih, semangat terus! \ud83d\udcaa` : `Kepada seluruh mahasiswa A9,\n${f.isi}\nDemikian disampaikan. Terima kasih.`
            })
        }
    };

    const jf = $('p-judul');
    if (jf) {
        const box = document.createElement('div');
        box.className = 'tpl-box';
        box.innerHTML = `<label for="tpl-type">\u2728 Pakai template (opsional)</label>
          <div class="tpl-row"><select id="tpl-type" class="modern-input"><option value="">\u2014 pilih jenis pengumuman \u2014</option>${Object.entries(TPL).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select>
            <select id="tpl-tone" class="modern-input" aria-label="Gaya bahasa"><option value="resmi">Gaya resmi</option><option value="santai">Gaya santai</option></select></div>
          <div id="tpl-fields"></div>
          <button type="button" class="btn btn-outline btn-sm" id="tpl-fill" style="display:none;">Isi otomatis ke form di bawah</button>
          <p class="hint" style="margin:8px 0 0;">Hasilnya masuk ke judul, isi, dan batas tampil di bawah. Kamu masih bisa mengeditnya sebelum disimpan.</p>`;
        (jf.closest('.form-group') || jf).before(box);

        $('tpl-type').addEventListener('change', () => {
            const T = TPL[$('tpl-type').value], wrap = $('tpl-fields');
            $('tpl-fill').style.display = T ? 'inline-flex' : 'none';
            wrap.innerHTML = T ? T.fields.map(([k, l, type, ops]) => type === 'select'
                ? `<div class="form-group"><label>${esc(l)}</label><select class="modern-input" data-f="${k}">${ops.map(o => `<option>${esc(o)}</option>`).join('')}</select></div>`
                : `<div class="form-group"><label>${esc(l)}</label><input class="modern-input" data-f="${k}" type="${type || 'text'}"></div>`).join('') : '';
        });
        $('tpl-fill').addEventListener('click', () => {
            const T = TPL[$('tpl-type').value]; if (!T) return;
            const f = {}; $('tpl-fields').querySelectorAll('[data-f]').forEach(el => { f[el.dataset.f] = el.value.trim(); });
            if (T.need.some(k => !f[k])) { alert('Lengkapi dulu kolom yang wajib (nama, tanggal, dan sejenisnya).'); return; }
            const r = T.build(f, $('tpl-tone').value);
            $('p-judul').value = r.judul; $('p-isi').value = r.isi;
            const dl = $('p-deadline'); if (dl) { if (r.until) dl.value = r.until; else { const d = new Date(); d.setDate(d.getDate() + 7); dl.value = isoLocal(d); } }
            $('p-judul').dataset.kind = T.kind;
            alert('Template terisi. Periksa lalu klik simpan pengumuman.');
        });
    }
})();

// ==========================================================================
// BAGIAN 9 - GAME SANTAI: Memory Medis, Ular, 2048
//   Menu: Latihan > Game Santai. Skor terbaik tersimpan di perangkat, per akun.
//   Jeda otomatis saat pindah menu, dan ada pengingat lembut setelah 5 menit.
// ==========================================================================

// Logika 2048 dibuat murni (tanpa DOM) supaya mudah diuji
function slide4(line) {
    const a = line.filter(Boolean); let gain = 0;
    for (let i = 0; i < a.length - 1; i++) {
        if (a[i] === a[i + 1]) { a[i] *= 2; gain += a[i]; a.splice(i + 1, 1); }
    }
    while (a.length < 4) a.push(0);
    return { a, gain };
}
// dir: 0 kiri, 1 kanan, 2 atas, 3 bawah
function moveBoard(b, dir) {
    const n = b.map(r => r.slice()); let moved = false, gain = 0;
    for (let k = 0; k < 4; k++) {
        let line = dir < 2 ? n[k].slice() : n.map(r => r[k]);
        if (dir % 2 === 1) line.reverse();
        const s = slide4(line), out = s.a;
        if (dir % 2 === 1) out.reverse();
        gain += s.gain;
        for (let i = 0; i < 4; i++) {
            const r = dir < 2 ? k : i, c = dir < 2 ? i : k;
            if (n[r][c] !== out[i]) { moved = true; n[r][c] = out[i]; }
        }
    }
    return { b: n, moved, gain };
}

(function () {
    'use strict';
    if (window.CanvasRenderingContext2D && !CanvasRenderingContext2D.prototype.roundRect) CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };
    const $ = id => document.getElementById(id);
    const fmt = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

    // ---------- skor terbaik (per akun, di perangkat ini) ----------
    const bkey = () => 'a9_game_' + ((currentUser && currentUser.nim) || 'admin');
    const bests = () => { try { return JSON.parse(localStorage.getItem(bkey())) || {}; } catch (e) { return {}; } };
    function setBest(k, v, lowerBetter) {
        const b = bests();
        if (b[k] === undefined || (lowerBetter ? v < b[k] : v > b[k])) {
            b[k] = v; try { localStorage.setItem(bkey(), JSON.stringify(b)); } catch (e) { }
            return true;
        }
        return false;
    }

    const css = document.createElement('style');
    css.textContent = `
    .gm-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
    .gm-stage { display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .gm-stats { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
    .gm-stat { background: var(--bg-base); border: 1px solid var(--border-color); border-radius: 12px; padding: 8px 16px; font-size: 13px; color: var(--text-muted); text-align: center; min-width: 84px; }
    .gm-stat b { display: block; font-size: 20px; color: var(--text-main); font-variant-numeric: tabular-nums; }
    .gm-msg { min-height: 24px; font-weight: 600; text-align: center; }
    .gm-hint { font-size: 13px; color: var(--text-muted); text-align: center; max-width: 46ch; }
    .gm-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
    /* memory */
    .mm-grid { display: grid; gap: 10px; width: min(100%, 460px); }
    .mm-card { aspect-ratio: 1; perspective: 700px; border: none; background: none; padding: 0; cursor: pointer; }
    .mm-in { position: relative; display: block; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform .35s; }
    .mm-card.open .mm-in, .mm-card.done .mm-in { transform: rotateY(180deg); }
    .mm-b, .mm-f { position: absolute; inset: 0; border-radius: 14px; display: flex; align-items: center; justify-content: center; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
    .mm-b { background: var(--primary); color: var(--bg-card); font-size: 22px; font-weight: 800; }
    .mm-f { background: var(--bg-card); border: 2px solid var(--border-color); transform: rotateY(180deg); font-size: clamp(26px, 7vw, 40px); }
    .mm-card.done .mm-f { border-color: #10b981; background: rgba(16,185,129,.12); }
    .mm-card:hover:not(.open):not(.done) .mm-b { filter: brightness(1.08); }
    /* ular */
    #sn-cv { width: min(100%, 400px); aspect-ratio: 1; border-radius: 16px; background: var(--bg-base); border: 1px solid var(--border-color); touch-action: none; display: block; }
    .sn-pad { display: none; grid-template-columns: repeat(3, 58px); grid-template-rows: repeat(2, 58px); gap: 8px; justify-content: center; }
    .sn-pad button { border-radius: 14px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-main); font-size: 22px; cursor: pointer; }
    .sn-pad button:active { background: var(--primary-light); }
    .sn-pad [data-d="up"] { grid-column: 2; grid-row: 1; } .sn-pad [data-d="left"] { grid-column: 1; grid-row: 2; }
    .sn-pad [data-d="down"] { grid-column: 2; grid-row: 2; } .sn-pad [data-d="right"] { grid-column: 3; grid-row: 2; }
    @media (pointer: coarse) { .sn-pad { display: grid; } }
    /* 2048 */
    #g48 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; width: min(100%, 400px); padding: 8px; background: var(--border-color); border-radius: 16px; touch-action: none; }
    .t48 { aspect-ratio: 1; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: clamp(18px, 6vw, 30px); background: var(--bg-card); color: var(--text-main); font-variant-numeric: tabular-nums; }
    .t48.pop { animation: t48pop .16s ease-out; }
    @keyframes t48pop { from { transform: scale(.82); } to { transform: scale(1); } }`;
    document.head.appendChild(css);

    document.querySelector('.main-content').insertAdjacentHTML('beforeend', `
    <div id="tab-game" class="tab-content" style="display:none;">
      <div class="card">
        <div class="card-header"><h3 class="card-title">\ud83c\udfae Game santai</h3></div>
        <p class="hint">Istirahat sebentar biar otak segar lagi. Skor terbaikmu tersimpan di perangkat ini.</p>
        <div class="gm-chips" id="gm-chips" role="tablist">
          <button class="chip active" data-g="memory" role="tab">\ud83e\udde0 Memory medis</button>
          <button class="chip" data-g="snake" role="tab">\ud83d\udc0d Ular</button>
          <button class="chip" data-g="g2048" role="tab">\ud83d\udd22 2048</button>
        </div>
        <div id="gm-stage" class="gm-stage"></div>
      </div>
    </div>`);
    const stage = $('gm-stage');

    // ======================= MEMORY MEDIS =======================
    function memory() {
        const EMO = ['\ud83e\udec0', '\ud83e\udec1', '\ud83e\udde0', '\ud83e\uddb4', '\ud83e\uddb7', '\ud83d\udc41\ufe0f', '\ud83d\udc89', '\ud83d\udc8a', '\ud83e\ude7a', '\ud83e\uddec', '\ud83d\udd2c', '\ud83e\ude78'];
        const LV = { mudah: { c: 4, r: 3, l: 'Mudah' }, sedang: { c: 4, r: 4, l: 'Sedang' }, sulit: { c: 6, r: 4, l: 'Sulit' } };
        let lv = 'sedang', cards = [], first = null, lock = false, moves = 0, matched = 0, sec = 0, ti = null, to = null;

        function build() {
            const L = LV[lv], pairs = L.c * L.r / 2;
            stop(); first = null; lock = false; moves = 0; matched = 0; sec = 0;
            cards = shuffle(EMO.slice(0, pairs).concat(EMO.slice(0, pairs)));
            stage.innerHTML = `
              <div class="gm-chips" id="mm-lv">${Object.entries(LV).map(([k, v]) => `<button class="chip${k === lv ? ' active' : ''}" data-lv="${k}">${v.l}</button>`).join('')}</div>
              <div class="gm-stats"><div class="gm-stat">Langkah<b id="mm-moves">0</b></div><div class="gm-stat">Waktu<b id="mm-time">00:00</b></div><div class="gm-stat">Terbaik<b id="mm-best">${bests()['memory_' + lv] ?? '-'}</b></div></div>
              <div class="mm-grid" id="mm-grid" style="grid-template-columns:repeat(${L.c},1fr)">${cards.map((e, i) => `<button type="button" class="mm-card" data-i="${i}" aria-label="Kartu ${i + 1}"><span class="mm-in"><span class="mm-b">?</span><span class="mm-f">${e}</span></span></button>`).join('')}</div>
              <div class="gm-msg" id="mm-msg" aria-live="polite"></div>
              <p class="gm-hint">Cari pasangan gambar yang sama dengan langkah sesedikit mungkin.</p>
              <div class="gm-actions"><button class="btn btn-outline" id="mm-new">\ud83d\udd04 Acak ulang</button></div>`;
        }
        function stats() { $('mm-moves').textContent = moves; $('mm-time').textContent = fmt(sec); }
        function stop() { clearInterval(ti); ti = null; clearTimeout(to); to = null; }
        function flip(i, on) { const el = stage.querySelector(`.mm-card[data-i="${i}"]`); if (el) el.classList.toggle('open', on); return el; }

        function click(e) {
            const lvb = e.target.closest('[data-lv]'); if (lvb) { lv = lvb.dataset.lv; build(); return; }
            if (e.target.closest('#mm-new')) { build(); return; }
            const c = e.target.closest('.mm-card'); if (!c || lock) return;
            const i = +c.dataset.i;
            if (c.classList.contains('open') || c.classList.contains('done')) return;
            if (!ti) ti = setInterval(() => { sec++; stats(); }, 1000);
            flip(i, true);
            if (first === null) { first = i; return; }
            moves++; stats();
            const a = first, b = i; first = null;
            if (cards[a] === cards[b]) {
                [a, b].forEach(k => { const el = stage.querySelector(`.mm-card[data-i="${k}"]`); el.classList.remove('open'); el.classList.add('done'); });
                matched++;
                if (matched === cards.length / 2) finish();
            } else {
                lock = true;
                to = setTimeout(() => { flip(a, false); flip(b, false); lock = false; }, 800);
            }
        }
        function finish() {
            stop();
            const fresh = setBest('memory_' + lv, moves, true);
            $('mm-best').textContent = bests()['memory_' + lv];
            $('mm-msg').textContent = `\ud83c\udf89 Selesai dalam ${moves} langkah, ${fmt(sec)}.${fresh ? ' Rekor baru!' : ''}`;
        }
        stage.onclick = click;
        return { init: build, stop, key() { } };
    }

    // ======================= ULAR =======================
    function snake() {
        const N = 20, CELL = 20;
        let cv, g, body, dir, queue, food, score, timer = null, running = false, over = false, speed, col;

        function mount() {
            stage.innerHTML = `
              <div class="gm-stats"><div class="gm-stat">Skor<b id="sn-score">0</b></div><div class="gm-stat">Terbaik<b id="sn-best">${bests().snake ?? 0}</b></div></div>
              <canvas id="sn-cv" width="${N * CELL}" height="${N * CELL}" aria-label="Papan permainan ular"></canvas>
              <div class="gm-msg" id="sn-msg" aria-live="polite"></div>
              <div class="gm-actions"><button class="btn btn-primary" id="sn-go">\u25b6 Mulai</button></div>
              <div class="sn-pad"><button data-d="up" aria-label="Atas">\u25b2</button><button data-d="left" aria-label="Kiri">\u25c0</button><button data-d="down" aria-label="Bawah">\u25bc</button><button data-d="right" aria-label="Kanan">\u25b6</button></div>
              <p class="gm-hint">Pakai panah atau WASD, geser jari di papan, atau tombol arah. Spasi untuk jeda. Makan titik merah, jangan menabrak dinding atau badan sendiri.</p>`;
            cv = $('sn-cv'); g = cv.getContext('2d');
            const cs = getComputedStyle(document.body);
            col = { p: cs.getPropertyValue('--primary').trim() || '#0f766e', bg: cs.getPropertyValue('--bg-base').trim() || '#f4f6f9', ln: cs.getPropertyValue('--border-color').trim() || '#e2e8f0', tx: cs.getPropertyValue('--text-main').trim() || '#0f172a' };
            reset(); draw();
            let sx = 0, sy = 0;
            cv.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
            cv.addEventListener('touchend', e => {
                const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
                if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
                if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 1 : -1, 0); else setDir(0, dy > 0 ? 1 : -1);
            }, { passive: true });
        }
        function reset() {
            body = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }]; dir = { x: 1, y: 0 }; queue = [];
            score = 0; over = false; speed = 130; spawn(); upd(); const m = $('sn-msg'); if (m) m.textContent = '';
        }
        function spawn() {
            let p; do { p = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) }; } while (body.some(s => s.x === p.x && s.y === p.y));
            food = p;
        }
        function upd() { const s = $('sn-score'); if (s) s.textContent = score; }
        function loop() { clearInterval(timer); timer = setInterval(step, speed); }
        function start() {
            if (over || !body) reset();
            running = true; loop(); $('sn-go').textContent = '\u23f8 Jeda'; $('sn-msg').textContent = '';
        }
        function pause() { running = false; clearInterval(timer); timer = null; const b = $('sn-go'); if (b && !over) b.textContent = '\u25b6 Lanjut'; }
        function setDir(dx, dy) {
            if (over) return;
            const last = queue.length ? queue[queue.length - 1] : dir;
            if ((last.x === -dx && last.y === -dy) || (last.x === dx && last.y === dy)) return;
            if (queue.length < 2) queue.push({ x: dx, y: dy });
            if (!running) start();
        }
        function step() {
            if (queue.length) dir = queue.shift();
            const h = { x: body[0].x + dir.x, y: body[0].y + dir.y };
            const eat = h.x === food.x && h.y === food.y;
            const solid = eat ? body : body.slice(0, -1);
            if (h.x < 0 || h.y < 0 || h.x >= N || h.y >= N || solid.some(s => s.x === h.x && s.y === h.y)) return die();
            body.unshift(h);
            if (eat) {
                score++; upd(); spawn();
                if (score % 4 === 0 && speed > 70) { speed -= 10; loop(); }
            } else body.pop();
            draw();
        }
        function die() {
            over = true; pause(); draw();
            const fresh = setBest('snake', score, false);
            $('sn-best').textContent = bests().snake ?? 0;
            $('sn-msg').textContent = `Permainan selesai. Skor ${score}.${fresh && score > 0 ? ' Rekor baru! \ud83c\udf89' : ''}`;
            $('sn-go').textContent = '\ud83d\udd04 Main lagi';
        }
        function draw() {
            if (!g) return;
            g.fillStyle = col.bg; g.fillRect(0, 0, cv.width, cv.height);
            g.fillStyle = col.ln; g.globalAlpha = .35;
            for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if ((x + y) % 2 === 0) g.fillRect(x * CELL, y * CELL, CELL, CELL);
            g.globalAlpha = 1;
            g.fillStyle = '#ef4444'; g.beginPath(); g.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL * .36, 0, 7); g.fill();
            body.forEach((s, i) => {
                g.globalAlpha = Math.max(.45, 1 - i * .03); g.fillStyle = col.p;
                g.beginPath(); g.roundRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2, i === 0 ? 8 : 5); g.fill();
            });
            g.globalAlpha = 1;
            const h = body[0]; g.fillStyle = col.bg;
            [[-.2, -.15], [.2, -.15]].forEach(([ox, oy]) => { g.beginPath(); g.arc(h.x * CELL + CELL / 2 + ox * CELL + dir.x * 3, h.y * CELL + CELL / 2 + oy * CELL + dir.y * 3, 2, 0, 7); g.fill(); });
        }
        function key(e) {
            const k = e.key.toLowerCase();
            const map = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] };
            if (map[k]) { e.preventDefault(); setDir(...map[k]); }
            else if (k === ' ') { e.preventDefault(); running ? pause() : start(); }
        }
        stage.onclick = e => {
            if (e.target.closest('#sn-go')) { running ? pause() : start(); return; }
            const d = e.target.closest('[data-d]');
            if (d) { const m = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[d.dataset.d]; setDir(m[0], m[1]); }
        };
        return { init: mount, stop() { pause(); }, key };
    }

    // ======================= 2048 =======================
    function g2048() {
        let b, score, won, over;
        function mount() {
            stage.innerHTML = `
              <div class="gm-stats"><div class="gm-stat">Skor<b id="g48-score">0</b></div><div class="gm-stat">Terbaik<b id="g48-best">${bests().g2048 ?? 0}</b></div></div>
              <div id="g48" aria-label="Papan 2048"></div>
              <div class="gm-msg" id="g48-msg" aria-live="polite"></div>
              <p class="gm-hint">Geser atau pakai panah/WASD. Gabungkan angka yang sama sampai mencapai 2048.</p>
              <div class="gm-actions"><button class="btn btn-outline" id="g48-new">\ud83d\udd04 Mulai baru</button></div>`;
            let sx = 0, sy = 0; const el = $('g48');
            el.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
            el.addEventListener('touchend', e => {
                const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
                if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
                if (Math.abs(dx) > Math.abs(dy)) go(dx > 0 ? 1 : 0); else go(dy > 0 ? 3 : 2);
            }, { passive: true });
            fresh();
        }
        function fresh() {
            b = Array.from({ length: 4 }, () => [0, 0, 0, 0]); score = 0; won = false; over = false;
            add(); add(); draw(null); $('g48-msg').textContent = '';
        }
        function add() {
            const e = []; b.forEach((r, i) => r.forEach((v, j) => { if (!v) e.push([i, j]); }));
            if (!e.length) return null;
            const [i, j] = e[Math.floor(Math.random() * e.length)]; b[i][j] = Math.random() < .9 ? 2 : 4; return i * 4 + j;
        }
        function draw(pop) {
            $('g48').innerHTML = b.flat().map((v, i) => {
                const k = v ? Math.log2(v) : 0;
                const st = v ? `background:hsl(172 55% ${Math.max(24, 93 - k * 6)}%);color:${k >= 4 ? '#fff' : '#0f172a'};` : '';
                return `<div class="t48${i === pop ? ' pop' : ''}" style="${st}">${v || ''}</div>`;
            }).join('');
            $('g48-score').textContent = score;
        }
        function stuck() {
            if (b.flat().includes(0)) return false;
            for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { if ((j < 3 && b[i][j] === b[i][j + 1]) || (i < 3 && b[i][j] === b[i + 1][j])) return false; }
            return true;
        }
        function go(dir) {
            if (over) return;
            const r = moveBoard(b, dir); if (!r.moved) return;
            b = r.b; score += r.gain;
            const p = add(); draw(p);
            const m = $('g48-msg');
            if (!won && b.flat().includes(2048)) { won = true; m.textContent = '\ud83c\udf89 Kamu mencapai 2048! Boleh lanjut atau mulai baru.'; }
            if (stuck()) { over = true; m.textContent = `Tidak ada gerakan lagi. Skor ${score}.`; }
            if (setBest('g2048', score, false)) $('g48-best').textContent = score;
        }
        function key(e) {
            const map = { arrowleft: 0, a: 0, arrowright: 1, d: 1, arrowup: 2, w: 2, arrowdown: 3, s: 3 };
            const d = map[e.key.toLowerCase()];
            if (d !== undefined) { e.preventDefault(); go(d); }
        }
        stage.onclick = e => { if (e.target.closest('#g48-new')) fresh(); };
        return { init: mount, stop() { }, key };
    }

    // ======================= PENGENDALI =======================
    const GAMES = { memory, snake, g2048 };
    let cur = 'memory', inst = null, nudge = null;
    const visible = () => { const t = $('tab-game'); return t && t.style.display === 'block'; };

    function show(name) {
        if (inst) inst.stop();
        cur = name; stage.onclick = null;
        document.querySelectorAll('#gm-chips .chip').forEach(c => c.classList.toggle('active', c.dataset.g === name));
        inst = GAMES[name](); inst.init();
    }
    $('gm-chips').addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (b) show(b.dataset.g); });

    document.addEventListener('keydown', e => {
        if (!visible() || !inst || e.ctrlKey || e.metaKey || e.altKey) return;
        const t = e.target.tagName; if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
        inst.key(e);
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && inst) inst.stop(); });

    const prevSw = window.switchTab;
    window.switchTab = function (t, b) {
        prevSw(t, b);
        if (t === 'game') {
            show(cur);
            clearTimeout(nudge);
            nudge = setTimeout(() => alert('\u2615 Sudah 5 menit istirahat. Sudah segar? Yuk lanjut belajar sebentar.'), 5 * 60 * 1000);
        } else {
            if (inst) inst.stop();
            clearTimeout(nudge);
        }
    };
})();

// ==========================================================================
// BAGIAN 10 - ALAT BELAJAR: fokus belajar (Pomodoro), catatan cepat, kalkulator IPS/IPK
//             + ekspor jadwal ke kalender (.ics). Menu: Kuliah > Alat Belajar.
//             Semua data pribadi tersimpan di perangkat ini, terpisah per akun.
// ==========================================================================
(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    const esc = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const nim = () => (currentUser && currentUser.nim) || 'admin';
    const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
    const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } };
    const mmss = s => { s = Math.max(0, Math.ceil(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
    const dayKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

    const css = document.createElement('style');
    css.textContent = `
    .al-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 18px; align-items: start; }
    .al-grid .card { margin-bottom: 0; }
    .pm-time { font-size: clamp(52px, 12vw, 76px); font-weight: 800; text-align: center; font-variant-numeric: tabular-nums; line-height: 1.1; margin: 4px 0; }
    .pm-mode { text-align: center; font-weight: 700; color: var(--primary); margin-bottom: 8px; }
    .pm-bar { height: 8px; border-radius: 8px; background: var(--border-color); overflow: hidden; margin: 10px 0 14px; } .pm-bar i { display: block; height: 100%; width: 0; background: var(--primary); transition: width .5s linear; }
    .pm-acts { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
    .pm-sel { display: flex; gap: 8px; justify-content: center; margin-bottom: 12px; flex-wrap: wrap; }
    .pm-stats { display: flex; justify-content: space-between; gap: 10px; margin-top: 16px; font-size: 14px; color: var(--text-muted); }
    .pm-stats b { color: var(--text-main); font-size: 18px; display: block; }
    .pm-chart { width: 100%; height: 90px; margin-top: 8px; }
    .nt-top { display: flex; gap: 8px; margin-bottom: 10px; } .nt-top select { flex: 1; margin: 0; }
    #nt-text { height: 220px; resize: vertical; line-height: 1.55; }
    .nt-hint { font-size: 12px; color: var(--text-muted); }
    .ip-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .ip-table th { text-align: left; font-size: 12px; color: var(--text-muted); padding: 4px 4px 6px; }
    .ip-table td { padding: 3px 3px; } .ip-table .modern-input { margin: 0; padding: 8px 10px; min-height: 40px; font-size: 14px; }
    .ip-res { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 14px; }
    .ip-box { flex: 1; min-width: 120px; background: var(--primary-light); border-radius: 14px; padding: 12px 16px; text-align: center; color: var(--text-muted); font-size: 13px; }
    .ip-box b { display: block; font-size: 28px; color: var(--primary); font-variant-numeric: tabular-nums; }
    .ip-prev { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0 4px; }
    .ip-prev label { font-size: 12px; font-weight: 600; color: var(--text-muted); } .ip-prev .modern-input { margin: 4px 0 0; }
    @media (max-width: 480px) { .al-grid { grid-template-columns: 1fr; } }`;
    document.head.appendChild(css);

    document.querySelector('.main-content').insertAdjacentHTML('beforeend', `
    <div id="tab-alat" class="tab-content" style="display:none;">
      <div class="al-grid">
        <div class="card">
          <div class="card-header"><h3 class="card-title">\u23f1\ufe0f Fokus belajar</h3></div>
          <div class="pm-sel" id="pm-sel"><button class="chip active" data-p="25,5">25 / 5 menit</button><button class="chip" data-p="45,10">45 / 10 menit</button><button class="chip" data-p="50,10">50 / 10 menit</button></div>
          <div class="pm-mode" id="pm-mode">Fokus</div>
          <div class="pm-time" id="pm-time" aria-live="off">25:00</div>
          <div class="pm-bar"><i id="pm-fill"></i></div>
          <div class="pm-acts"><button class="btn btn-primary" id="pm-go">\u25b6 Mulai</button><button class="btn btn-outline" id="pm-skip">\u23ed Lewati</button><button class="btn btn-outline" id="pm-reset">\u21ba Reset</button></div>
          <div class="pm-stats"><div><b id="pm-today">0</b>menit fokus hari ini</div><div style="text-align:right;"><b id="pm-week">0</b>menit 7 hari terakhir</div></div>
          <svg class="pm-chart" id="pm-chart" viewBox="0 0 280 90" role="img" aria-label="Grafik menit fokus 7 hari terakhir"></svg>
        </div>
        <div class="card">
          <div class="card-header"><h3 class="card-title">\ud83d\uddd2\ufe0f Catatan cepat</h3></div>
          <div class="nt-top"><select id="nt-sel" class="modern-input" aria-label="Pilih catatan"></select><button class="btn btn-outline btn-sm" id="nt-new">\u2795 Baru</button><button class="btn btn-danger btn-sm" id="nt-del">Hapus</button></div>
          <textarea id="nt-text" class="modern-input" placeholder="Tulis catatan belajar, rumus, atau daftar hafalan di sini. Tersimpan otomatis."></textarea>
          <p class="nt-hint" id="nt-hint">Catatan tersimpan otomatis di perangkat ini.</p>
        </div>
        <div class="card">
          <div class="card-header"><h3 class="card-title">\ud83e\uddee Kalkulator IPS / IPK</h3></div>
          <table class="ip-table"><thead><tr><th>Mata kuliah</th><th style="width:70px;">SKS</th><th style="width:90px;">Nilai</th><th style="width:36px;"></th></tr></thead><tbody id="ip-rows"></tbody></table>
          <button class="btn btn-outline btn-sm" id="ip-add" style="margin-top:8px;">\u2795 Tambah mata kuliah</button>
          <div class="ip-prev"><div><label for="ip-pi">IPK sebelumnya (opsional)</label><input id="ip-pi" class="modern-input" type="number" step="0.01" min="0" max="4" inputmode="decimal"></div><div><label for="ip-ps">Total SKS sebelumnya</label><input id="ip-ps" class="modern-input" type="number" min="0" inputmode="numeric"></div></div>
          <div class="ip-res"><div class="ip-box"><b id="ip-ips">0.00</b>IPS semester ini</div><div class="ip-box"><b id="ip-ipk">-</b>IPK gabungan</div></div>
          <p class="nt-hint" style="margin-top:10px;">Memakai skala 4,0: A=4, A-=3,7, B+=3,3, B=3, B-=2,7, C+=2,3, C=2, D=1, E=0. Skala kampus bisa berbeda, anggap ini perkiraan.</p>
        </div>
      </div>
    </div>`);

    // ======================= FOKUS BELAJAR =======================
    const ac = { ctx: null };
    function chime() {
        try {
            const C = window.AudioContext || window.webkitAudioContext; if (!ac.ctx && C) ac.ctx = new C(); const a = ac.ctx; if (!a) return; if (a.state === 'suspended') a.resume();
            [659, 784, 988].forEach((f, i) => {
                const t = a.currentTime + i * .28, o = a.createOscillator(), g = a.createGain();
                o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.3, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + 1.4);
                o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + 1.5);
            });
        } catch (e) { }
    }
    const P = { f: 25, b: 5, mode: 'fokus', running: false, end: 0, left: 25 * 60 };
    const total = () => (P.mode === 'fokus' ? P.f : P.b) * 60;
    const logKey = () => 'a9_focus_' + nim();
    const baseTitle = document.title;
    function paintP() {
        const left = P.running ? (P.end - Date.now()) / 1000 : P.left;
        $('pm-time').textContent = mmss(left);
        $('pm-mode').textContent = P.mode === 'fokus' ? '\ud83c\udfaf Fokus' : '\u2615 Istirahat';
        $('pm-fill').style.width = Math.min(100, Math.max(0, (1 - left / total()) * 100)) + '%';
        $('pm-go').textContent = P.running ? '\u23f8 Jeda' : (P.left < total() ? '\u25b6 Lanjut' : '\u25b6 Mulai');
        document.title = P.running ? '\u23f1 ' + mmss(left) + ' \u00b7 ' + baseTitle : baseTitle;
    }
    function paintStats() {
        const log = lsGet(logKey(), {}), days = [];
        for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push({ k: dayKey(d), m: log[dayKey(d)] || 0, l: d.toLocaleDateString('id-ID', { weekday: 'short' }) }); }
        $('pm-today').textContent = days[6].m; $('pm-week').textContent = days.reduce((s, d) => s + d.m, 0);
        const mx = Math.max(30, ...days.map(d => d.m));
        $('pm-chart').innerHTML = days.map((d, i) => {
            const h = Math.round(d.m / mx * 56), x = 8 + i * 38;
            return `<rect x="${x}" y="${66 - h}" width="26" height="${Math.max(h, 2)}" rx="5" style="fill:${i === 6 ? 'var(--primary)' : 'var(--primary-light)'}"><title>${d.m} menit</title></rect><text x="${x + 13}" y="84" text-anchor="middle" style="fill:var(--text-muted);font-size:10px">${esc(d.l)}</text>${d.m ? `<text x="${x + 13}" y="${60 - h}" text-anchor="middle" style="fill:var(--text-main);font-size:10px;font-weight:700">${d.m}</text>` : ''}`;
        }).join('');
    }
    function finishP(auto) {
        if (P.mode === 'fokus' && auto) { const log = lsGet(logKey(), {}); log[dayKey()] = (log[dayKey()] || 0) + P.f; lsSet(logKey(), log); }
        P.running = false; P.mode = P.mode === 'fokus' ? 'istirahat' : 'fokus'; P.left = total();
        if (auto) { chime(); alert(P.mode === 'istirahat' ? '\ud83c\udf89 Sesi fokus selesai. Waktunya istirahat sebentar.' : '\u2615 Istirahat selesai. Siap fokus lagi?'); }
        paintP(); paintStats();
    }
    setInterval(() => { if (!P.running) return; if (P.end - Date.now() <= 0) finishP(true); else paintP(); }, 500);
    $('pm-go').addEventListener('click', () => {
        if (P.running) { P.left = Math.max(0, (P.end - Date.now()) / 1000); P.running = false; }
        else { P.running = true; P.end = Date.now() + P.left * 1000; try { const C = window.AudioContext || window.webkitAudioContext; if (!ac.ctx && C) ac.ctx = new C(); if (ac.ctx) ac.ctx.resume(); } catch (e) { } }
        paintP();
    });
    $('pm-skip').addEventListener('click', () => finishP(false));
    $('pm-reset').addEventListener('click', () => { P.running = false; P.mode = 'fokus'; P.left = total(); paintP(); });
    $('pm-sel').addEventListener('click', e => {
        const b = e.target.closest('[data-p]'); if (!b) return;
        const [f, br] = b.dataset.p.split(',').map(Number); P.f = f; P.b = br; P.running = false; P.mode = 'fokus'; P.left = total();
        document.querySelectorAll('#pm-sel .chip').forEach(c => c.classList.toggle('active', c === b)); paintP();
    });

    // ======================= CATATAN =======================
    const nKey = () => 'a9_notes_' + nim();
    let notes = [], curN = null, saveT = null;
    function titleOf(n) { const t = (n.text || '').split('\n')[0].trim(); return t ? t.slice(0, 40) : 'Catatan kosong'; }
    function loadNotes() { notes = lsGet(nKey(), []); if (!notes.length) notes = [{ id: Date.now(), text: '' }]; if (!notes.some(n => n.id === curN)) curN = notes[0].id; paintNotes(); }
    function paintNotes() {
        $('nt-sel').innerHTML = notes.map(n => `<option value="${n.id}"${n.id === curN ? ' selected' : ''}>${esc(titleOf(n))}</option>`).join('');
        const n = notes.find(x => x.id === curN); $('nt-text').value = n ? n.text : '';
    }
    $('nt-text').addEventListener('input', () => {
        const n = notes.find(x => x.id === curN); if (!n) return; n.text = $('nt-text').value;
        clearTimeout(saveT); saveT = setTimeout(() => { lsSet(nKey(), notes); const o = $('nt-sel').selectedOptions[0]; if (o) o.textContent = titleOf(n); $('nt-hint').textContent = 'Tersimpan \u2713 di perangkat ini.'; }, 500);
    });
    $('nt-sel').addEventListener('change', () => { curN = +$('nt-sel').value; paintNotes(); });
    $('nt-new').addEventListener('click', () => { const n = { id: Date.now(), text: '' }; notes.unshift(n); curN = n.id; lsSet(nKey(), notes); paintNotes(); $('nt-text').focus(); });
    $('nt-del').addEventListener('click', () => {
        if (!confirm('Hapus catatan ini?')) return;
        notes = notes.filter(n => n.id !== curN); lsSet(nKey(), notes); curN = null; loadNotes();
    });

    // ======================= KALKULATOR IPS / IPK =======================
    const GRADE = { 'A': 4, 'A-': 3.7, 'B+': 3.3, 'B': 3, 'B-': 2.7, 'C+': 2.3, 'C': 2, 'D': 1, 'E': 0 };
    const iKey = () => 'a9_ipk_' + nim();
    let ip = { rows: [], pi: '', ps: '' };
    function loadIp() { ip = Object.assign({ rows: [], pi: '', ps: '' }, lsGet(iKey(), {})); if (!ip.rows.length) ip.rows = [{ mk: '', sks: 2, n: 'A' }, { mk: '', sks: 2, n: 'A' }]; $('ip-pi').value = ip.pi; $('ip-ps').value = ip.ps; paintIp(); }
    function paintIp() {
        $('ip-rows').innerHTML = ip.rows.map((r, i) => `<tr><td><input class="modern-input" data-i="${i}" data-k="mk" value="${esc(r.mk)}" placeholder="Nama mata kuliah" aria-label="Mata kuliah ${i + 1}"></td>
          <td><input class="modern-input" type="number" min="0" step="1" inputmode="numeric" data-i="${i}" data-k="sks" value="${esc(r.sks)}" aria-label="SKS"></td>
          <td><select class="modern-input" data-i="${i}" data-k="n" aria-label="Nilai">${Object.keys(GRADE).map(g => `<option${g === r.n ? ' selected' : ''}>${g}</option>`).join('')}</select></td>
          <td><button class="btn btn-danger btn-sm" data-del="${i}" aria-label="Hapus baris" style="min-height:36px;padding:4px 10px;">\u2715</button></td></tr>`).join('');
        calcIp();
    }
    function calcIp() {
        let sks = 0, pts = 0; ip.rows.forEach(r => { const s = +r.sks || 0; sks += s; pts += s * (GRADE[r.n] ?? 0); });
        const ips = sks ? pts / sks : 0; $('ip-ips').textContent = ips.toFixed(2).replace('.', ',');
        const pi = parseFloat(ip.pi), ps = parseFloat(ip.ps);
        $('ip-ipk').textContent = (pi >= 0 && ps > 0 && sks + ps > 0) ? ((pi * ps + pts) / (ps + sks)).toFixed(2).replace('.', ',') : (sks ? ips.toFixed(2).replace('.', ',') : '-');
        lsSet(iKey(), ip);
    }
    $('ip-rows').addEventListener('input', e => { const t = e.target, i = t.dataset.i; if (i === undefined) return; ip.rows[+i][t.dataset.k] = t.dataset.k === 'sks' ? t.value : t.value; calcIp(); });
    $('ip-rows').addEventListener('click', e => { const d = e.target.closest('[data-del]'); if (!d) return; ip.rows.splice(+d.dataset.del, 1); if (!ip.rows.length) ip.rows.push({ mk: '', sks: 2, n: 'A' }); paintIp(); });
    $('ip-add').addEventListener('click', () => { ip.rows.push({ mk: '', sks: 2, n: 'A' }); paintIp(); const l = $('ip-rows').querySelectorAll('input[data-k="mk"]'); l[l.length - 1].focus(); });
    $('ip-pi').addEventListener('input', () => { ip.pi = $('ip-pi').value; calcIp(); });
    $('ip-ps').addEventListener('input', () => { ip.ps = $('ip-ps').value; calcIp(); });

    // ======================= EKSPOR JADWAL KE KALENDER =======================
    const MON = { jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5, jul: 6, agu: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11 };
    function parseTgl(t) {
        const m = String(t).match(/(\d{1,2})[-\s]([A-Za-z]{3})[a-z]*[-\s](\d{2,4})/); if (!m) return null;
        const mo = MON[m[2].toLowerCase()]; if (mo === undefined) return null;
        let y = +m[3]; if (y < 100) y += 2000; return new Date(y, mo, +m[1]);
    }
    const icsEsc = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
    const utc = d => d.getUTCFullYear() + String(d.getUTCMonth() + 1).padStart(2, '0') + String(d.getUTCDate()).padStart(2, '0') + 'T' + String(d.getUTCHours()).padStart(2, '0') + String(d.getUTCMinutes()).padStart(2, '0') + '00Z';
    function buildIcs() {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Portal A9//Jadwal//ID', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Jadwal Kuliah A9'];
        let n = 0; const stamp = utc(new Date());
        (dbData.jadwalCustom || []).forEach((day, di) => {
            const d = parseTgl(day.tgl); if (!d || d < today || !Array.isArray(day.sesi)) return;
            day.sesi.forEach((s, si) => {
                if (!s || !s.kegiatan || s.kegiatan.trim() === '-') return;
                const m = String(s.jam || '').match(/(\d{1,2})[.:](\d{2})\s*[-\u2013]\s*(\d{1,2})[.:](\d{2})/);
                L.push('BEGIN:VEVENT', `UID:a9-${di}-${si}-${d.getTime()}@portal-a9`, 'DTSTAMP:' + stamp);
                if (m) {
                    // jam di jadwal adalah WIB (UTC+7)
                    const a = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), +m[1] - 7, +m[2])), b = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), +m[3] - 7, +m[4]));
                    L.push('DTSTART:' + utc(a), 'DTEND:' + utc(b));
                } else {
                    const ymd = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
                    const nx = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1), ymd2 = nx.getFullYear() + String(nx.getMonth() + 1).padStart(2, '0') + String(nx.getDate()).padStart(2, '0');
                    L.push('DTSTART;VALUE=DATE:' + ymd, 'DTEND;VALUE=DATE:' + ymd2);
                }
                L.push('SUMMARY:' + icsEsc(s.kegiatan), 'DESCRIPTION:' + icsEsc('Jadwal kuliah A9' + (s.jam ? ' \u00b7 ' + s.jam + ' WIB' : '')), 'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(s.kegiatan), 'END:VALARM', 'END:VEVENT');
                n++;
            });
        });
        L.push('END:VCALENDAR');
        return { text: L.join('\r\n'), n };
    }
    const chips = $('jd-chips');
    if (chips) {
        chips.insertAdjacentHTML('afterend', '<div style="margin-bottom:12px;"><button type="button" class="btn btn-outline btn-sm" id="jd-ics">\ud83d\udcc5 Tambahkan ke kalender HP / laptop (.ics)</button></div>');
        $('jd-ics').addEventListener('click', () => {
            const r = buildIcs(); if (!r.n) { alert('Belum ada jadwal ke depan yang bisa diekspor.'); return; }
            const url = URL.createObjectURL(new Blob([r.text], { type: 'text/calendar;charset=utf-8' }));
            const a = document.createElement('a'); a.href = url; a.download = 'jadwal-a9.ics'; document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 2000);
            alert(r.n + ' kegiatan diekspor. Buka file .ics untuk menambahkannya ke kalender. Ada pengingat 30 menit sebelumnya.');
        });
    }

    // muat data pribadi setelah login (per akun)
    const prevLogin = window.finishLogin;
    window.finishLogin = function () { prevLogin(); curN = null; loadNotes(); loadIp(); paintStats(); };
    paintP(); paintStats();
})();

// ==========================================================================
// BAGIAN 7 - DESAIN v3 & PERFORMA KETIK
// ==========================================================================

// Tunda (debounce) semua kolom pencarian supaya daftar tidak digambar ulang di setiap huruf
(function () {
    const SEL = '#jd-search, #pa-search, .fv-bar input, .search-box, .fd-search';
    document.addEventListener('input', e => {
        const t = e.target;
        if (e.__again || !t.matches || !t.matches(SEL)) return;
        e.stopImmediatePropagation();
        clearTimeout(t.__deb);
        t.__deb = setTimeout(() => {
            const ev = new Event('input', { bubbles: true });
            ev.__again = true;
            t.dispatchEvent(ev);
        }, 160);
    }, true);
    window.addEventListener('offline', () => alert('Kamu sedang offline. Perubahan belum bisa tersimpan.'));
    window.addEventListener('online', () => alert('Kembali online.'));
})();

// --------------------------------------------------------------------------
// 1) Sistem desain
//    Arah: tenang dan klinis (teal tua + tinta biru-hitam), kartu putih datar
//    dengan garis tipis, satu huruf (Plus Jakarta Sans). Aksen kuat hanya di
//    sapaan Beranda dan tombol utama; sisanya sengaja sunyi.
// --------------------------------------------------------------------------
(function () {
    'use strict';

    // Huruf: dimuat tanpa memblokir tampilan (display=swap). Tanpa internet, jatuh ke huruf sistem.
    if (!document.getElementById('a9-font')) {
        const pc = document.createElement('link'); pc.rel = 'preconnect'; pc.href = 'https://fonts.gstatic.com'; pc.crossOrigin = '';
        const f = document.createElement('link'); f.id = 'a9-font'; f.rel = 'stylesheet';
        f.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
        document.head.append(pc, f);
    }
    if (!document.querySelector('meta[name="viewport"]')) {
        const m = document.createElement('meta'); m.name = 'viewport'; m.content = 'width=device-width, initial-scale=1, viewport-fit=cover'; document.head.appendChild(m);
    }

    const css = document.createElement('style');
    css.id = 'a9-v3';
    css.textContent = `
/* ================= Token ================= */
:root, body {
  --primary: #0f766e; --primary-hover: #115e59; --primary-light: #e7f4f1;
  --bg-base: #f4f6f9; --bg-card: #ffffff;
  --text-main: #0f172a; --text-muted: #5b6679; --border-color: #e2e8f0;
  --warning: #d97706; --danger: #dc2626;
  --radius-sm: 8px; --radius-md: 12px; --radius-lg: 16px; --radius-xl: 20px;
  --shadow-sm: 0 1px 2px rgba(15,23,42,.06);
  --shadow-lg: 0 1px 2px rgba(15,23,42,.04), 0 10px 28px -14px rgba(15,23,42,.14);
  --shadow-glow: 0 0 0 3px rgba(15,118,110,.2);
  --font: 'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}
body.theme-dark {
  --primary: #2dd4bf; --primary-hover: #5eead4; --primary-light: rgba(45,212,191,.12);
  --bg-base: #0b1220; --bg-card: #121a2c;
  --text-main: #e8edf6; --text-muted: #9aa7bd; --border-color: #243049;
  --shadow-sm: none; --shadow-lg: 0 10px 28px -16px rgba(0,0,0,.6);
  --shadow-glow: 0 0 0 3px rgba(45,212,191,.25);
}
body.theme-dark .btn-primary, body.theme-dark .nav-pill.active, body.theme-dark .chip.active,
body.theme-dark .cx-btn.done, body.theme-dark .cbt-nav-btn.done, body.theme-dark .trk span.on { color: #04211e; }
body.theme-dark .greeting { color: #04211e; }
body.theme-dark .dl-late { background: rgba(220,38,38,.18); color: #fca5a5; }
body.theme-dark .dl-soon { background: rgba(217,119,6,.2); color: #fcd34d; }
body.theme-dark .osce-st.warn { background: rgba(245,158,11,.12); color: #fcd34d; }
body.theme-dark .osce-st.done { background: rgba(239,68,68,.12); color: #fca5a5; }
body.theme-dark .osce-big.warn, body.theme-dark .osce-banner.warn { background: rgba(245,158,11,.12); color: #fcd34d; }
body.theme-dark .osce-big.done, body.theme-dark .osce-banner.end { background: rgba(239,68,68,.12); color: #fca5a5; }

/* ================= Dasar & performa ================= */
html { -webkit-text-size-adjust: 100%; }
body { font-family: var(--font); background: var(--bg-base); color: var(--text-main); line-height: 1.55; letter-spacing: -.003em; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; overscroll-behavior-y: none; }
* { -webkit-tap-highlight-color: transparent; }
button, a, input, select, textarea, summary, label { touch-action: manipulation; }
button, input, select, textarea { font-family: inherit; }
::selection { background: var(--primary-light); color: var(--text-main); }
/* blur di atas konten besar membuat ketikan tersendat, diganti permukaan solid */
* { -webkit-backdrop-filter: none !important; backdrop-filter: none !important; }
/* ganti 'transition: all' yang boros dengan properti yang perlu saja */
.card, .btn, .nav-pill, .sn-chip, .chip, .modern-input, .option-label, .fv-folder, .cx-btn {
  transition: background-color .15s ease, border-color .15s ease, color .15s ease, box-shadow .15s ease, transform .15s ease;
}
h1, h2, h3, h4 { letter-spacing: -.02em; line-height: 1.25; }
.tabular, #cbt-timer, .osce-time, #g-timer, .score-number { font-variant-numeric: tabular-nums; }
.main-content { max-width: 1120px; margin-inline: auto; padding-inline: clamp(12px, 3vw, 28px); }
@keyframes a9-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.tab-content { animation: a9-in .22s ease-out; }

/* ================= Kartu ================= */
.card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-xl); box-shadow: var(--shadow-lg); padding: clamp(16px, 2.4vw, 26px); margin-bottom: 18px; }
.card-header { padding-bottom: 14px; margin-bottom: 16px; border-bottom: 1px solid var(--border-color); }
.card-title { font-size: clamp(17px, 2vw, 20px); font-weight: 700; }

/* ================= Tombol ================= */
.btn { border-radius: 10px; font-weight: 600; font-size: 14px; padding: 10px 18px; min-height: 42px; border: 1px solid var(--border-color); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
.btn:active { transform: scale(.97); }
.btn-sm { min-height: 36px; padding: 6px 14px; font-size: 13px; }
.btn-lg { min-height: 48px; padding: 12px 24px; font-size: 15px; }
.btn-primary { background: var(--primary); border-color: var(--primary); color: #fff; box-shadow: var(--shadow-sm); }
.btn-primary:hover { background: var(--primary-hover); border-color: var(--primary-hover); }
.btn-outline { background: var(--bg-card); color: var(--text-main); }
.btn-outline:hover { background: var(--primary-light); border-color: var(--primary); color: var(--primary); }
.btn-danger { background: #fff1f1; color: var(--danger); border-color: #fecaca; }
.btn-danger:hover { background: var(--danger); color: #fff; border-color: var(--danger); }
body.theme-dark .btn-danger { background: rgba(220,38,38,.12); border-color: rgba(220,38,38,.35); color: #fca5a5; }
.btn:disabled { opacity: .5; cursor: not-allowed; transform: none; }
:focus-visible { outline: 3px solid var(--primary); outline-offset: 2px; border-radius: 6px; }

/* ================= Input ================= */
.modern-input { width: 100%; background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 10px; padding: 11px 14px; min-height: 44px; font-size: 16px; margin-bottom: 12px; }
.modern-input::placeholder { color: var(--text-muted); opacity: .8; }
.modern-input:hover { border-color: #b8c2d1; }
.modern-input:focus { outline: none; border-color: var(--primary); box-shadow: var(--shadow-glow); }
textarea.modern-input { line-height: 1.5; }
.form-group label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: var(--text-main); }
.admin-form-box { background: transparent; border: 1.5px dashed var(--border-color); border-radius: var(--radius-lg); padding: 14px 16px; }

/* ================= Navigasi ================= */
.simple-nav { background: var(--bg-card); border-bottom: 1px solid var(--border-color); box-shadow: none; }
.nav-pill { border: 1px solid transparent; background: transparent; color: var(--text-muted); font-weight: 600; border-radius: 12px; cursor: pointer; }
.nav-pill:hover { background: var(--bg-base); color: var(--text-main); }
.nav-pill.active { background: var(--primary); color: #fff; box-shadow: var(--shadow-sm); }
#sn-sub { background: var(--bg-base); }
#sn-sub .sn-chip.active { background: var(--bg-card); color: var(--primary); box-shadow: var(--shadow-sm); font-weight: 700; }
.sn-badge { background: var(--danger); }
@media (max-width: 768px) {
  #sn-main { background: var(--bg-card); border-top: 1px solid var(--border-color); box-shadow: 0 -6px 20px -12px rgba(15,23,42,.25); }
  #sn-main .nav-pill { font-size: 11px; font-weight: 600; }
  #sn-main .nav-pill.active { background: var(--primary-light); color: var(--primary); box-shadow: none; }
  body.theme-dark #sn-main .nav-pill.active { color: var(--primary); }
  #sn-sub { overflow-x: auto; scroll-snap-type: x proximity; }
  #sn-sub .sn-chip { scroll-snap-align: start; min-height: 40px; }
}

/* ================= Beranda ================= */
.greeting { background: var(--primary); color: #fff; border-radius: var(--radius-xl); padding: clamp(20px, 3vw, 30px); margin-bottom: 18px; }
.greeting h3 { font-size: clamp(20px, 3vw, 26px); font-weight: 800; }
.greeting p { opacity: .9; margin-top: 4px; }
.upd-card { background: var(--primary-light); border: 1px solid var(--primary); }

/* ================= Tabel ================= */
.table-responsive { border: 1px solid var(--border-color); border-radius: var(--radius-lg); overflow-x: auto; background: var(--bg-card); -webkit-overflow-scrolling: touch; }
.modern-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.modern-table th { text-align: left; font-size: 13px; font-weight: 700; color: var(--text-muted); background: var(--bg-base); padding: 12px 16px; border-bottom: 1px solid var(--border-color); white-space: nowrap; }
.modern-table td { padding: 13px 16px; border-bottom: 1px solid var(--border-color); vertical-align: middle; }
.modern-table tbody tr:last-child td { border-bottom: none; }
.modern-table tr:hover td { background: var(--primary-light); }
@media (max-width: 640px) {
  .modern-table td { padding: 10px 14px; }
}

/* ================= Chip, jadwal, folder ================= */
.chip, .sn-chip { border-radius: 999px; min-height: 38px; }
.chip.active { background: var(--primary); color: #fff; border-color: var(--primary); }
.jd { border-radius: var(--radius-lg); background: var(--bg-card); }
.jd.today { background: var(--primary-light); box-shadow: none; border-color: var(--primary); }
.jd-tag { border-radius: 999px; }
.fv-folder { background: var(--bg-card); border-radius: var(--radius-lg); }
.fv-folder:hover { transform: translateY(-1px); box-shadow: var(--shadow-lg); }
.fv-file { background: var(--bg-card); border-radius: var(--radius-md); }
.dl-badge { border-radius: 999px; }

/* ================= CBT & latihan ================= */
.cbtx-title { color: var(--text-main); }
.q-text { font-size: clamp(16px, 2vw, 18px); line-height: 1.65; font-weight: 500; max-width: 75ch; margin-bottom: 14px; }
.options { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
.option-label { display: flex; align-items: center; gap: 10px; min-height: 54px; border: 1.5px solid var(--border-color); border-radius: 14px; background: var(--bg-card); cursor: pointer; padding: 14px 18px; }
.option-label:hover { border-color: var(--primary); background: var(--primary-light); }
button.option-label.picked { border-color: var(--primary); background: var(--primary-light); box-shadow: inset 0 0 0 1px var(--primary); }
.option-label.correct-answer { border-color: #10b981 !important; background: rgba(16,185,129,.12) !important; }
.option-label.wrong-answer { border-color: #ef4444 !important; background: rgba(239,68,68,.1) !important; }
.cbt-feedback { border-radius: var(--radius-md); padding: 14px 16px; margin-top: 14px; line-height: 1.6; }
.cbt-image { max-width: 100%; height: auto; border-radius: var(--radius-md); border: 1px solid var(--border-color); }
.cbtx-side { background: var(--bg-card); border-radius: var(--radius-lg); }
.cx-btn { min-height: 38px; border-radius: 10px; }
.cx-btn.cur { outline-color: var(--primary); }
#cbt-timer, .cbt-timer { font-variant-numeric: tabular-nums; border-radius: 999px; font-weight: 800; }
.apres { background: var(--primary); border-radius: var(--radius-lg); }
.score-number { font-weight: 800; color: var(--primary); }
.prog-stat { background: var(--bg-card); }
.prog-stat b { font-weight: 800; }
.prog-trend, .report-recommendation { border-radius: var(--radius-md); }
.empty-state { text-align: center; padding: 40px 16px; color: var(--text-muted); }
.empty-icon { font-size: 44px; margin-bottom: 8px; }
.empty-state h3 { color: var(--text-main); margin-bottom: 4px; }
@media (max-width: 900px) {
  .cbtx-nav { position: sticky; bottom: 76px; background: var(--bg-base); padding: 10px 0; z-index: 5; }
  .cbtx-nav .btn { flex: 1; }
}

/* ================= OSCE ================= */
.osce-st, .osce-stase { background: var(--bg-card); border-radius: var(--radius-lg); }
.osce-time { font-weight: 800; }
.osce-big { border-radius: var(--radius-xl); background: var(--primary-light); border-color: var(--primary); }
.osce-big #g-timer { font-size: clamp(48px, 14vw, 76px); }
.osce-chip { border-radius: 999px; }

/* ================= Notifikasi ================= */
#toast-wrap { gap: 10px; }
.toast { background: var(--text-main); color: var(--bg-card); border-radius: 14px; padding: 13px 18px; font-weight: 600; text-align: left; box-shadow: 0 12px 32px -10px rgba(15,23,42,.45); }

/* ================= Login, modal, kecil-kecil ================= */
#login-page { background: radial-gradient(900px 500px at 15% -10%, var(--primary-light), transparent 60%), var(--bg-base); }
.modal-content, #preview-modal > div, #admin-settings-modal > div { border-radius: var(--radius-xl); border: 1px solid var(--border-color); }
#to-top { background: var(--bg-card); color: var(--primary); border: 1px solid var(--border-color); box-shadow: var(--shadow-lg); }
.hint, .report-hint { max-width: 70ch; }
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 10px; border: 2px solid var(--bg-base); }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

/* ================= HP kecil ================= */
@media (max-width: 480px) {
  .card { border-radius: var(--radius-lg); padding: 16px; }
  .btn-lg { width: 100%; }
  .card-header.flex-between { flex-wrap: wrap; gap: 10px; }
  .osce-grid, .osce-peserta { grid-template-columns: 1fr; }
  .prog-stats { grid-template-columns: repeat(2, 1fr); }
}
/* hormati preferensi kurangi gerak */
@media (prefers-reduced-motion: reduce) { .tab-content { animation: none; } }
`;
    document.head.appendChild(css);

    // Terapkan ulang tema (supaya warna meta & kelas gelap ikut sistem desain baru)
    try { window.applyTheme(document.body.classList.contains('theme-dark') ? 'dark' : (window.dbData && dbData.theme) || 'light'); } catch (e) { }
})();

// ==========================================================================
// BAGIAN 11 - KUNCI MENU SAAT CBT UJIAN + SEMBUNYIKAN FORM UNGGAH LAMA
//   Ditaruh paling akhir supaya pembungkus switchTab ini yang paling luar.
// ==========================================================================
(function () {
    const locked = () => { try { return cbtStarted && cbtMode === 'exam'; } catch (e) { return false; } };
    const st = document.createElement('style');
    st.textContent = '.lb-legacy{display:none !important} body.cbt-locked #sn-main, body.cbt-locked #sn-sub{opacity:.45}';
    document.head.appendChild(st);

    const prev = window.switchTab;
    window.switchTab = function (t, b) {
        if (locked() && t !== 'cbt') { alert('\ud83d\udd12 Mode CBT sedang berjalan. Kumpulkan jawaban dulu sebelum pindah menu.'); return; }
        return prev(t, b);
    };
    setInterval(() => {
        document.body.classList.toggle('cbt-locked', locked());
        ['materi', 'lab', 'skills', 'tutorial'].forEach(t => document.querySelectorAll('#tab-' + t + ' .admin-form-box').forEach(el => el.classList.add('lb-legacy')));
    }, 500);
})();

// ==========================================================================
// BAGIAN 12 - PERBAIKAN TAMPILAN HP (scroll terkunci, tata letak melebar/aneh)
//   Ditaruh paling akhir supaya aturannya menang atas aturan sebelumnya.
// ==========================================================================
(function () {
    const css = document.createElement('style');
    css.id = 'a9-mobile-fix';
    css.textContent = `
/* Halaman selalu boleh digulir; tidak ada elemen yang mengunci tinggi/posisi body */
html { height: auto !important; }
body { height: auto !important; min-height: 100%; position: static !important; overscroll-behavior-y: auto !important; touch-action: pan-y pinch-zoom; }
@supports (overflow: clip) { html, body { overflow-x: clip; } }
.tab-content, .card { overflow: visible; min-width: 0; max-width: 100%; }
.main-content { overflow: visible; min-width: 0; width: 100%; max-width: 1120px; margin-inline: auto; }
img, video, canvas, iframe, svg { max-width: 100%; }
.table-responsive { overflow-x: auto; -webkit-overflow-scrolling: touch; touch-action: pan-x pan-y; }
.q-text, .option-label, .lb-title, .vw-t b { overflow-wrap: anywhere; word-break: normal; }

@media (max-width: 900px) {
  .cbtx { grid-template-columns: minmax(0, 1fr) !important; gap: 14px; }
  .cbtx-main { min-width: 0; }
  .cbtx-side { position: static !important; max-height: none; }
  .cx-grid { max-height: 36vh; overscroll-behavior: contain; }
  .cbtx-nav { flex-wrap: wrap; gap: 8px; bottom: calc(72px + env(safe-area-inset-bottom)) !important; }
  .cbtx-nav .btn { flex: 1 1 120px; padding-inline: 10px; }
  .cbtx-head { gap: 8px; }
  #cbt-question-container { scroll-margin-top: 110px; }
}

@media (max-width: 768px) {
  body { padding-bottom: calc(88px + env(safe-area-inset-bottom)) !important; }
  .main-content { padding-inline: 12px; margin: 12px auto; }
  .card { padding: 14px; }
  /* Menu bawah: 6 tombol muat satu baris, tidak terpotong */
  #sn-main { overflow-x: auto; scrollbar-width: none; justify-content: space-between; }
  #sn-main::-webkit-scrollbar { display: none; }
  #sn-main .nav-pill { flex: 1 1 0; min-width: 52px; padding: 6px 2px; font-size: 10.5px; }
  .simple-nav { position: sticky; top: 0; }
  #sn-sub { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
  #sn-sub::-webkit-scrollbar { display: none; }
  .osce-big #g-timer { font-size: clamp(44px, 16vw, 64px); }
  .lb-top { flex-wrap: wrap; }
  .jd-row { grid-template-columns: 1fr; }
  .fd-modal { max-height: 86vh; }
}
@media (max-width: 480px) {
  .cbtx-title { font-size: 15px; }
  .option-label { padding: 12px 14px; min-height: 48px; }
  .q-text { font-size: 16px; }
}
`;
    document.head.appendChild(css);

    // Pengaman: kalau pratinjau/dialog sudah tertutup tapi gulir masih terkunci, buka lagi
    setInterval(() => {
        const viewerOpen = [...document.querySelectorAll('.vw-ov')].some(x => !x.hidden);
        if (!viewerOpen && document.body.style.overflow === 'hidden') document.body.style.overflow = '';
    }, 600);
})();

// ==========================================================================
// BAGIAN 13 - SAMAKAN PRAKTIKUM (Lab, Skills Lab, Tutorial) DENGAN MATERI + RAPIKAN LAPTOP
//   Ditaruh paling akhir. Tidak mengubah data, hanya tampilan dan pemasangan perpustakaan.
// ==========================================================================
(function () {
    const css = document.createElement('style');
    css.id = 'a9-fix13';
    css.textContent = `
/* Perpustakaan selalu selebar kartu induknya, walau induknya grid/flex */
.lb { grid-column: 1 / -1; width: 100%; max-width: 100%; min-width: 0; flex: 1 1 100%; display: block; }
.lb-content, .lb-grid { min-width: 0; }
.lb-grid { grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); }
.lb-list .lb-grid { grid-template-columns: 1fr; }
.lb-card { width: 100%; min-width: 0; }
@media (min-width: 1024px) { .lb-grid { grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); } .lb-list .lb-grid { grid-template-columns: 1fr; } }
@media (max-width: 700px) { .lb-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .lb-list .lb-grid { grid-template-columns: 1fr; } }
@media (max-width: 380px) { .lb-grid { grid-template-columns: 1fr; } }
`;
    document.head.appendChild(css);

    // tab (menu) tempat tiap daftar berada, ditentukan dari elemen daftarnya, bukan dari tebakan id
    const HOSTS = [
        () => document.getElementById('materi-table-body'),
        () => document.getElementById('lab-list'),
        () => document.getElementById('skills-list'),
        () => document.getElementById('tutorial-list')
    ];

    function tidy() {
        try {
            // pasang perpustakaan di halaman yang belum terpasang
            if (typeof window.finderRender === 'function') window.finderRender();
            HOSTS.forEach(get => {
                const el = get(); if (!el) return;
                const tab = el.closest('.tab-content'); if (!tab) return;
                // form unggah lama disembunyikan (admin memakai tombol Tambah di perpustakaan)
                tab.querySelectorAll('.admin-form-box').forEach(b => b.classList.add('lb-legacy'));
                // daftar lama (tabel / kartu lama) tetap tersembunyi
                const legacy = el.id === 'materi-table-body' ? el.closest('.table-responsive') : el;
                if (legacy && tab.querySelector('.lb') && legacy.style.display !== 'none') legacy.style.display = 'none';
            });
            // pengaman gulir: tidak ada yang boleh mengunci halaman saat tidak ada dialog terbuka
            const dialogOpen = [...document.querySelectorAll('.vw-ov')].some(x => !x.hidden) || !!document.querySelector('.fd-ov');
            if (!dialogOpen) {
                if (document.body.style.overflow === 'hidden') document.body.style.overflow = '';
                if (document.documentElement.style.overflow === 'hidden') document.documentElement.style.overflow = '';
                if (document.body.style.position === 'fixed') document.body.style.position = '';
            }
        } catch (e) { console.error(e); }
    }

    // setelah pindah menu, pasang ulang (menu Praktikum baru dibuka belum tentu sudah terpasang)
    const prev = window.switchTab;
    window.switchTab = function (t, b) {
        const r = prev ? prev(t, b) : undefined;
        setTimeout(tidy, 0);
        return r;
    };
    // Navigasi sederhana (Bagian 3) memanggil switchTab lewat window, jadi pembungkus ini ikut berlaku
    tidy();
    setInterval(tidy, 800);
})();

// ==========================================================================
// BAGIAN 14 - TAMPILAN SOAL DI HP, PREVIEW MATERI, TINGGI MENU
//   Ditaruh paling akhir. Hanya tampilan; data tidak diubah.
// ==========================================================================
(function () {
    const css = document.createElement('style');
    css.id = 'a9-fix14';
    css.textContent = `
/* ---- Kartu materi: preview + judul terbaca penuh ---- */
.lb-thumb { background: var(--primary-light); }
.lb-thumb img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.lb-thumb.k-image img { object-fit: contain; background: #0b1220; }
.lb-ph { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; }
.lb-ph .lb-ico { font-size: 38px; line-height: 1; }
.lb-ph small { font-weight: 800; font-size: 12px; letter-spacing: .06em; color: var(--text-muted); }
.lb-kind { z-index: 1; }
.lb-play { z-index: 1; }
.lb-title { -webkit-line-clamp: 4; line-clamp: 4; }
.lb-tag.mk { background: var(--primary); color: #fff; }
body.theme-dark .lb-tag.mk { color: #04211e; }
.lb-tags { align-items: center; }

/* ---- Soal (CBT / latihan) ---- */
.cbtx-time { font-variant-numeric: tabular-nums; font-weight: 800; font-size: 15px; padding: 8px 12px; border-radius: 999px; background: var(--primary-light); color: var(--primary); text-align: center; white-space: nowrap; }
.cx-sidehead { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.cx-close { display: none; }
.option-text { overflow-wrap: anywhere; line-height: 1.5; }
.q-text img, .options img { max-width: 100%; height: auto; }
.cbt-image { max-height: 55vh; object-fit: contain; }

@media (max-width: 900px) {
  /* bilah Sebelumnya | tengah | Berikutnya menempel di atas menu bawah, satu baris */
  .cbtx-nav { display: grid !important; grid-template-columns: 1fr auto 1fr; gap: 8px; align-items: center; position: sticky !important;
    bottom: var(--a9-bar-h, 0px) !important; background: var(--bg-card) !important; border-top: 1px solid var(--border-color); padding: 8px 0 !important; margin: 14px 0 0; z-index: 8; }
  .cbtx-nav > :first-child { grid-column: 1; } .cbtx-nav > :last-child { grid-column: 3; }
  .cbtx-nav .btn { width: 100%; min-height: 46px; padding: 8px 6px !important; font-size: 14px; flex: none !important; }
  .cbtx-nav .btn[data-act="check"] { white-space: nowrap; }
  /* kepala soal: judul di atas, tombol bisa digeser ke samping */
  .cbtx-head { flex-direction: column; align-items: stretch; }
  .cbtx-head > span:last-child { display: flex !important; flex-wrap: nowrap; overflow-x: auto; gap: 8px; scrollbar-width: none; padding-bottom: 2px; }
  .cbtx-head > span:last-child::-webkit-scrollbar { display: none; }
  .cbtx-head .btn { flex: none; white-space: nowrap; font-size: 13px; padding: 6px 12px; }
  /* daftar soal jadi lembar yang muncul dari bawah */
  .cbtx-side.open { display: block !important; position: fixed !important; left: 8px; right: 8px; top: auto !important; bottom: calc(var(--a9-bar-h, 0px) + 8px);
    max-height: 62vh; overflow-y: auto; z-index: 960; background: var(--bg-card); box-shadow: 0 -14px 44px rgba(0,0,0,.35); border-radius: 18px; padding: 14px; }
  .cbtx-side.open .cx-grid { max-height: none; overflow: visible; grid-template-columns: repeat(auto-fill, minmax(44px, 1fr)); }
  .cbtx-side.open .cx-btn { min-height: 44px; }
  .cx-close { display: inline-flex; }
  /* pilihan jawaban mudah ditekan */
  .options { gap: 8px; }
  .option-label { min-height: 52px; align-items: flex-start; padding: 12px 14px; }
  .q-text { font-size: 16px; line-height: 1.6; }
  .cbt-feedback { font-size: 14px; }
}
@media (max-width: 768px) {
  .lb-title { font-size: 14px; }
  .lb-body { padding: 10px 11px 12px; }
  .lb-tag { font-size: 11px; padding: 2px 8px; }
  .lb-ph .lb-ico { font-size: 30px; }
}
`;
    document.head.appendChild(css);

    // tinggi menu bawah diukur supaya bilah sticky dan lembar daftar soal pas di atasnya
    const root = document.documentElement;
    function measure() {
        try {
            const bar = document.getElementById('sn-main');
            const fixedBar = bar && getComputedStyle(bar).position === 'fixed';
            root.style.setProperty('--a9-bar-h', (fixedBar ? bar.offsetHeight : 0) + 'px');
            const nav = document.querySelector('.simple-nav');
            root.style.setProperty('--a9-nav-h', (nav ? nav.offsetHeight : 0) + 'px');
        } catch (e) { }
    }
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    measure();
    setInterval(measure, 1000);
})();

// ==========================================================================
// BAGIAN 15 - JADWAL: HAPUS OTOMATIS YANG SUDAH LEWAT + PINDAH HARI (RESCHEDULE)
//   Fungsi murni (tanpa DOM) dipakai oleh Bagian 5 (tampilan jadwal).
// ==========================================================================
function a9ParseTgl(t) {
    const MON = { jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5, jul: 6, agu: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11 };
    const m = String(t).match(/(\d{1,2})[-\s]([A-Za-z]{3})[a-z]*[-\s](\d{2,4})/); if (!m) return null;
    const mo = MON[m[2].toLowerCase()]; if (mo === undefined) return null;
    let y = +m[3]; if (y < 100) y += 2000; return new Date(y, mo, +m[1]);
}
function a9TglStr(d) {
    const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'], BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return HARI[d.getDay()] + ', ' + String(d.getDate()).padStart(2, '0') + '-' + BLN[d.getMonth()] + '-' + String(d.getFullYear()).slice(2);
}
// Hari yang tanggalnya sebelum "today" dibuang. Tanggal yang tidak terbaca dibiarkan.
function a9DropPast(list, today) {
    return (list || []).filter(j => { const d = a9ParseTgl(j && j.tgl); return !d || d >= today; });
}
// Pindahkan satu kegiatan ke tanggal lain (atau ubah jamnya di hari yang sama). Mengembalikan salinan baru, atau null.
function a9MoveSesi(list, tglLama, idx, tglBaru, jamBaru, ket) {
    const L = JSON.parse(JSON.stringify(list || []));
    const src = L.find(j => j && j.tgl === tglLama); if (!src || !src.sesi || !src.sesi[idx]) return null;
    const s = src.sesi[idx], oldD = a9ParseTgl(src.tgl), key = a9TglStr(tglBaru);
    const jam = String(jamBaru || '').trim() || s.jam;
    const sameDay = !!oldD && oldD.getTime() === tglBaru.getTime();
    if (sameDay && jam === s.jam && (ket || '') === (s.catatan || '')) return null;
    const moved = Object.assign({}, s, { jam });
    if (ket) moved.catatan = ket; else delete moved.catatan;
    const start = x => { const m = String(x.jam || '').match(/(\d{1,2})[.:](\d{2})/); return m ? +m[1] * 60 + +m[2] : 99999; };
    let dst = src;
    if (sameDay) { src.sesi[idx] = moved; }
    else {
        moved.pindahDari = s.pindahDari || src.tgl;           // simpan tanggal asli sekali saja
        src.sesi.splice(idx, 1);
        dst = L.find(j => { const d = a9ParseTgl(j && j.tgl); return d && d.getTime() === tglBaru.getTime(); });
        if (!dst) { dst = { tgl: key, sesi: [] }; L.push(dst); }
        dst.sesi.push(moved);
        if (!src.sesi.length) L.splice(L.indexOf(src), 1);    // hari yang kosong dihapus
    }
    dst.sesi.sort((a, b) => start(a) - start(b));
    L.sort((a, b) => { const x = a9ParseTgl(a.tgl), y = a9ParseTgl(b.tgl); return x && y ? x - y : 0; });
    return { list: L, from: src.tgl, to: dst.tgl, nama: s.kegiatan };
}

// Admin: bersihkan hari yang sudah lewat dari database, sekali per hari (dan saat tanggal berganti).
(function () {
    let lastDay = '', busy = false;
    async function purgeJadwal() {
        if (busy || !currentUser || currentUser.role !== 'admin' || !supabaseClient) return;
        const now = new Date(), today = new Date(now.getFullYear(), now.getMonth(), now.getDate()), stamp = today.toDateString();
        if (lastDay === stamp) return;
        busy = true;
        try {
            // baca data TERBARU dulu supaya tidak menimpa perubahan orang lain dengan data lama
            const { data, error } = await supabaseClient.from('portal_db').select('value').eq('key', 'jadwal').maybeSingle();
            if (error) throw error;
            let v = data && data.value; if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { v = null; } }
            const arr = Array.isArray(v) ? v : (v && Array.isArray(v.jadwal) ? v.jadwal : null);
            if (arr) {
                const keep = a9DropPast(arr, today);
                if (keep.length !== arr.length) {
                    const r = await supabaseClient.from('portal_db').upsert({ key: 'jadwal', value: keep }, { onConflict: 'key' });
                    if (r.error) throw r.error;
                    try { const c = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') || {}; c.jadwal = keep; localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch (e) { }
                    console.log('Jadwal: ' + (arr.length - keep.length) + ' hari yang sudah lewat dihapus.');
                }
                dbData.jadwalCustom = keep;
                renderAll();
            }
            lastDay = stamp;
        } catch (e) { console.error('Hapus jadwal lewat gagal:', e); }
        busy = false;
    }
    setInterval(purgeJadwal, 20 * 1000);   // cukup ringan: hanya bekerja bila admin masuk dan tanggal sudah berganti
})();

// ==========================================================================
// BAGIAN 16 - TUTORIAL: MENU BLOK -> SEVEN JUMP PER SKENARIO + MODE COBA + EKSPOR KE GOOGLE DOCS
//   Ditaruh paling akhir (sebelum Bagian 17). Data disimpan di portal_db:
//     Blok 1.3 (lama) : tutorial_sj_1..4 dan tutorial_sj_docs   (tidak berubah, data lama aman)
//     Blok baru       : tutorial_sj_<key>_<no> dan tutorial_sj_docs_<key>
//   Semua mahasiswa yang login bisa mengisi bersama; draft yang belum disimpan aman di perangkat.
//   Mode Coba: isian hanya di perangkat ini (localStorage), tidak menyentuh data kelompok.
// ==========================================================================
(function () {
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const $ = id => document.getElementById(id);
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    // ======================================================================
    // DAFTAR BLOK  <<<  SATU-SATUNYA TEMPAT YANG PERLU DIUBAH SAAT MENAMBAH BLOK BARU
    //
    // Cara menambah blok baru: salin template di bawah, tempel DI ATAS garis ">>> BLOK BARU"
    // (setelah koma penutup blok sebelumnya), lalu isi. Nomor skenario terisi otomatis.
    //
    //   {
    //       key: '1_4',                  // kode unik, tanpa titik/spasi. JANGAN diubah setelah mulai dipakai
    //       label: 'Blok 1.4',           // tulisan di tombol menu blok
    //       judul: 'Nama blok',          // judul lengkap blok
    //       skenario: [
    //           {
    //               judul: 'Judul skenario',
    //               topik: 'Topik / bidang ilmu skenario ini',
    //               teks: ['Paragraf 1 skenario.', 'Paragraf 2 skenario.'],
    //               hint: ['Istilah 1', 'Istilah 2']   // saran istilah untuk Langkah 1 (boleh kosong: [])
    //           },
    //           // skenario berikutnya ditempel di sini
    //       ]
    //   },
    //
    // Blok 1.3 memakai legacy: true supaya tetap membaca data lama (tutorial_sj_1..4). Jangan dipakai di blok baru.
    // ======================================================================
    const BLOK = [
        {
            key: '1_3', legacy: true,
            label: 'Blok 1.3',
            judul: 'Sistem Pencernaan dan Metabolisme',
            skenario: [
        {
            n: 1, judul: 'Perut Terasa Penuh Setelah Makan',
            topik: 'Anatomi-histologi-fisiologi dan biokimia saluran pencernaan atas',
            teks: [
                'Seorang perempuan berusia 25 tahun datang ke klinik dengan keluhan rasa tidak nyaman di ulu hati sejak 3 bulan terakhir. Pasien mengeluhkan rasa penuh setelah makan dalam porsi kecil (bloating), cepat merasa kenyang, dan sering bersendawa (burping). Keluhan kadang disertai rasa panas seperti terbakar di dada (heartburn) terutama setelah makan malam dan saat berbaring.',
                'Pasien mengatakan bahwa keluhan semakin sering muncul ketika jadwal makannya tidak teratur karena aktivitas kuliah. Ia sering mengonsumsi makanan pedas, asam, dan berlemak. Pasien juga mengaku sering langsung berbaring setelah makan.',
                'Pasien tidak mengalami keluhan muntah darah (hematemesis), BAB berwarna hitam (melena), maupun diare. Pemeriksaan fisik menunjukkan keadaan umum baik, tanda vital dalam batas normal. Pada pemeriksaan abdomen didapatkan nyeri tekan ringan di daerah epigastrium.',
                'Dokter menjelaskan bahwa keluhan pasien kemungkinan berhubungan dengan gangguan pada saluran pencernaan pasien. Dokter merencanakan edukasi tentang perubahan gaya hidup dan pemeriksaan lebih lanjut bila keluhan menetap.'
            ],
            hint: ['Ulu hati', 'Bloating', 'Burping (sendawa)', 'Heartburn', 'Hematemesis', 'Melena', 'Tanda vital', 'Nyeri tekan', 'Epigastrium']
        },
        {
            n: 2, judul: 'Sembelit di Pagi Hari',
            topik: 'Anatomi-histologi-fisiologi dan biokimia saluran pencernaan bawah',
            teks: [
                'Seorang mahasiswa laki-laki berusia 19 tahun datang ke medical center dengan keluhan tidak bisa buang air besar selama empat hari terakhir. Pasien mengeluh adanya rasa tidak nyaman di perut bagian bawah yang semakin meningkat. Pasien juga merasakan ingin buang air besar, tetapi ketika buang air besar, yang keluar hanya sedikit berupa tinja yang keras dan kering seperti kotoran kambing.',
                'Selama seminggu terakhir, pasien sibuk menghadapi ujian blok. Pasien mengaku bahwa menu makanan yang dikonsumsinya sebagian besar makanan cepat saji, kurang minum air, dan jarang mengonsumsi buah atau sayuran. Karena jadwalnya yang padat, ia sering menunda keinginan untuk buang air besar sampai rasa untuk buang air besar hilang.',
                'Pasien menyangkal adanya mual, muntah, tinja berdarah, demam, atau penurunan berat badan yang signifikan. Pemeriksaan fisik didapatkan tanda vital normal, perut sedikit buncit dengan sedikit nyeri di kuadran kiri bawah, suara usus terdengar normal, pemeriksaan colok dubur ditemukan adanya tinja keras di rektum.',
                'Dokter menyarankan agar pasien meningkatkan asupan airnya, mengonsumsi lebih banyak makanan berserat, melakukan olahraga secara teratur, dan memulai kebiasaan buang air besar secara teratur.'
            ],
            hint: ['Tinja keras dan kering', 'Kuadran kiri bawah', 'Suara usus', 'Colok dubur', 'Rektum', 'Makanan cepat saji', 'Makanan berserat']
        },
        {
            n: 3, judul: 'Mengapa Badan Saya Loyo dan Mata Terlihat Kuning?',
            topik: 'Biokimia metabolisme makromolekul',
            teks: [
                'Seorang perempuan berusia 19 tahun diantar orang tuanya ke IGD RS dengan keluhan utama lemas. Keluhan lain yang dirasakan adalah mata dan kulitnya kuning. Sekitar 5 hari yang lalu pasien sempat panas, mual, muntah dan tidak nafsu makan. Selama ini pasien dirawat sendiri di rumah, baru minum obat penurun panas, dan hanya mengonsumsi air dan buah-buahan yang disukai.',
                'Setelah melakukan pemeriksaan fisik, dokter menduga pasien mengalami infeksi virus yang menyebabkan kerusakan sel hepar dan mengganggu fungsinya. Kondisi lemas berkaitan dengan gangguan metabolisme tubuh yang dialami oleh pasien tersebut, kemungkinan karena kekurangan makromolekul karbohidrat, protein, lemak dan energi. Dokter merencanakan pemeriksaan laboratorium yang terkait dengan fungsi hepar, yaitu albumin, globulin, bilirubin, SGPT dan SGOT.'
            ],
            hint: ['Lemas', 'IGD', 'Infeksi virus', 'Kerusakan sel hepar', 'Makromolekul', 'Albumin', 'Globulin', 'Bilirubin', 'SGPT', 'SGOT']
        },
        {
            n: 4, judul: 'Pingsan Akibat Tidak Sarapan',
            topik: 'Anatomi-histologi tractus digestivus accesoria yang terlibat dalam metabolisme dan fisiologi regulasi metabolisme',
            teks: [
                'Rini, seorang karyawati berusia 24 tahun, terbangun kesiangan karena lembur semalam sebelumnya. Demi mengejar presensi pagi agar tidak terlambat, ia terburu-buru berangkat ke kantor. Ia hanya sempat minum segelas air putih dan melewatkan sarapan.',
                'Sesampainya di kantor, Rini langsung dihadapkan pada jadwal rapat pleno yang padat. Sebagai penanggung jawab proyek, ia harus melakukan presentasi di depan jajaran direksi di ruang rapat di lantai 4. Lift kantor sedang diperbaiki hari itu sehingga Rini terpaksa menaiki tangga dari kantornya di lantai 1 menuju ruang rapat di lantai 4 sambil membawa tumpukan dokumen yang cukup berat.',
                'Saat sedang berdiri mempresentasikan laporannya di ruang rapat, Rini tiba-tiba merasa sangat lemas, pusing, pandangannya mengabur dan berdebar-debar. Teman-teman kantornya yang berada di ruang rapat melihat wajah Rini memucat. Tidak lama kemudian, Rini jatuh pingsan.',
                'Oleh teman-temannya, Rini dibawa ke klinik di dekat kantornya. Dokter melakukan pemeriksaan fisik dan pemeriksaan kadar gula darah. Hasil pemeriksaan kadar gula darah menunjukkan penurunan dari nilai normalnya. Setelah Rini siuman, ia diberi segelas teh manis hangat. Beberapa saat kemudian, kondisi Rini berangsur membaik, rasa lemasnya berkurang, dan ia merasa tenaganya pulih kembali.'
            ],
            hint: ['Rapat pleno', 'Pandangan mengabur', 'Berdebar-debar', 'Pingsan', 'Siuman', 'Kadar gula darah', 'Nilai normal']
        }
            ]
        },
        // >>> BLOK BARU DITEMPEL DI ATAS GARIS INI <<<
    ];

    BLOK.forEach(b => {
        b.skenario.forEach((s, i) => { s.n = i + 1; s.hint = s.hint || []; s.teks = s.teks || []; });
        b.folder = b.legacy ? 'Tutorial/Seven Jump' : 'Tutorial/Seven Jump/' + b.label;
    });
    const skey = (b, n) => b.legacy ? 'tutorial_sj_' + n : 'tutorial_sj_' + b.key + '_' + n;
    const docsKey = b => b.legacy ? 'tutorial_sj_docs' : 'tutorial_sj_docs_' + b.key;
    const INFO = {};
    BLOK.forEach(b => b.skenario.forEach(s => {
        const k = skey(b, s.n);
        if (INFO[k]) console.error('Seven Jump: key blok dobel, data bisa bertabrakan:', b.key);
        INFO[k] = { b, n: s.n, s };
    }));
    // simpanan draf di perangkat: terpisah untuk mode asli dan Mode Coba
    const DRK = (k, m) => ((m || (trial ? 'trial' : 'real')) === 'trial' ? 'a9_sjT_draft_' : 'a9_sj_draft_') + (INFO[k].b.legacy ? INFO[k].n : INFO[k].b.key + '_' + INFO[k].n);
    const TRK = k => 'a9_sjT_srv_' + k;

    const blank = () => ({ istilah: [{ t: '', d: '' }], soal: [], lo: '', belajar: '', sumber: '', gambar: [], by: '', ts: 0 });
    const me = () => (currentUser && (currentUser.name || currentUser.nim)) || 'Anonim';
    const AUTOSAVE_MS = 5000;
    const NAMES = Array.from(new Set(Object.values(typeof allowedUsers !== 'undefined' ? allowedUsers : {})));

    // srv: versi di server | draft: perubahan belum tersimpan | base: ts server saat draft dimulai | conflict: versi teman yang lebih baru
    // Semua dikunci dengan key penyimpanan (mis. tutorial_sj_2), dan dipisah untuk mode asli vs Mode Coba.
    const mk = () => ({ srv: {}, draft: {}, base: {}, conflict: {}, docs: {} });
    const MODES = { real: mk(), trial: mk() };
    let trial = false; try { trial = sessionStorage.getItem('a9_sj_trial') === '1'; } catch (e) { }
    let srv, draft, base, conflict, docs;
    function useMode() { const o = MODES[trial ? 'trial' : 'real']; srv = o.srv; draft = o.draft; base = o.base; conflict = o.conflict; docs = o.docs; }

    let curB = 0, cur = 1, lastDoc = null;
    let lastFetch = 0, fetching = false, timer = null, saving = false, booted = false;
    const curKey = () => skey(BLOK[curB], cur);
    window.__sjxCtx = () => ({ b: BLOK[curB], n: cur, k: curKey(), trial });

    const clone = o => JSON.parse(JSON.stringify(o));
    const view = k => draft[k] || srv[k] || blank();
    const lines = s => String(s || '').split(/\n+/).map(x => x.trim()).filter(Boolean);
    const parse = v => { if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { v = null; } } return v; };
    // data versi lama (masalah & jawaban berupa teks) dipindah ke bentuk baru: masalah -> daftar jawaban
    function norm(d) {
        d = d || {};
        if (!Array.isArray(d.soal)) {
            const qs = String(d.masalah || '').split(/\n+/).map(x => x.trim()).filter(Boolean).map(q => ({ q, by: '', a: [] }));
            const ja = String(d.jawaban || '').trim();
            if (ja) { if (!qs.length) qs.push({ q: '', by: '', a: [] }); qs[0].a.push({ t: ja, by: '' }); }
            d.soal = qs;
        }
        delete d.masalah; delete d.jawaban;
        return d;
    }
    const fmtTs = ts => ts ? new Date(ts).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
    const hhmm = () => new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const toast = m => { const done = busy(m); setTimeout(done, 2500); };
    const imgSrc = g => g.id ? 'https://drive.google.com/thumbnail?id=' + g.id + '&sz=w800' : g.url;
    const metaText = k => (srv[k] && srv[k].ts)
        ? ((trial ? 'Disimpan (coba) \u00b7 ' : 'Tersimpan oleh ' + srv[k].by + ' \u00b7 ') + fmtTs(srv[k].ts))
        : (trial ? 'Belum ada isian coba' : 'Belum ada yang tersimpan');
    const mark = (b, n) => { const k = skey(b, n); return draft[k] ? ' \u2022' : (srv[k] && srv[k].ts ? ' \u2713' : ''); };
    const blokDirty = b => b.skenario.some(s => draft[skey(b, s.n)]);

    const cleanData = d => ({
        istilah: (d.istilah || []).map(x => ({ t: String(x.t || '').trim(), d: String(x.d || '').trim() })).filter(x => x.t || x.d),
        soal: (d.soal || []).map(x => ({ q: String(x.q || '').trim(), by: String(x.by || '').trim(), a: (x.a || []).map(a => ({ t: String(a.t || '').trim(), by: String(a.by || '').trim() })).filter(a => a.t) })).filter(x => x.q || x.a.length),
        lo: String(d.lo || '').trim(),
        belajar: String(d.belajar || '').trim(), sumber: String(d.sumber || '').trim(),
        gambar: (d.gambar || []).filter(g => g && g.url).map(g => ({ url: String(g.url), id: String(g.id || ''), cap: String(g.cap || '').trim() }))
    });
    const same = (a, b) => JSON.stringify(cleanData(a || blank())) === JSON.stringify(cleanData(b || blank()));

    // muat draf dari perangkat (mode asli & Mode Coba) dan isian Mode Coba yang sudah "tersimpan" di perangkat
    BLOK.forEach(b => b.skenario.forEach(s => {
        const k = skey(b, s.n);
        ['real', 'trial'].forEach(m => {
            try { const d = JSON.parse(localStorage.getItem(DRK(k, m)) || 'null'); if (d && d.data) { MODES[m].draft[k] = norm(d.data); MODES[m].base[k] = d.base || 0; } } catch (e) { }
        });
        try { const v = parse(localStorage.getItem(TRK(k))); if (v && typeof v === 'object') MODES.trial.srv[k] = Object.assign(blank(), norm(v)); } catch (e) { }
    }));
    useMode();

    // ---------- CSS ----------
    const css = document.createElement('style');
    css.id = 'a9-sj-css';
    css.textContent = `
#sj-root { margin: 0 0 22px; }
.sj-head { display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:space-between; margin-bottom:10px; }
.sj-head h3 { margin:0; color:var(--text-main); }
.sj-bloks { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:6px; }
.sj-bloks button { display:flex; flex-direction:column; align-items:flex-start; text-align:left; gap:2px; min-width:150px; max-width:100%; border:1px solid var(--border-color); background:var(--bg-card); color:var(--text-main); border-radius:var(--radius-md, 10px); padding:9px 14px; cursor:pointer; font:inherit; }
.sj-bloks button.on { background:var(--primary, #2563eb); color:#fff; border-color:transparent; }
.sj-bl { font-weight:700; font-size:14px; } .sj-bj { font-size:12px; opacity:.85; } .sj-bc { font-size:11px; opacity:.7; }
.sj-blokinfo { margin:0 0 10px; }
.sj-trial { border:1.5px dashed #b45309; background:rgba(180,83,9,.09); border-radius:var(--radius-md, 10px); padding:10px 12px; margin-bottom:12px; font-size:13px; color:var(--text-main); line-height:1.5; }
.sj-tabs { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
.sj-tabs button { border:1px solid var(--border-color); background:var(--bg-base); color:var(--text-main); border-radius:999px; padding:7px 14px; cursor:pointer; font:inherit; font-size:13px; }
.sj-tabs button.on { background:var(--primary, #2563eb); color:#fff; border-color:transparent; }
.sj-card { background:var(--bg-base); border:1px solid var(--border-color); border-radius:var(--radius-md, 12px); padding:14px; margin-bottom:12px; }
.sj-card h4 { margin:0 0 4px; color:var(--text-main); }
.sj-card .sj-sub { margin:0 0 10px; font-size:12.5px; color:var(--text-muted); }
.sj-case p { margin:0 0 8px; line-height:1.55; font-size:14px; color:var(--text-main); }
.sj-card textarea { width:100%; min-height:110px; box-sizing:border-box; resize:vertical; }
.sj-row { display:grid; grid-template-columns:1fr 2fr auto; gap:8px; margin-bottom:8px; align-items:start; }
.sj-row input, .sj-row textarea { width:100%; box-sizing:border-box; min-height:0; }
.sj-row textarea { min-height:42px; }
.sj-hints { display:flex; flex-wrap:wrap; gap:6px; margin:8px 0 0; }
.sj-hints button { border:1px dashed var(--border-color); background:transparent; color:var(--text-muted); border-radius:999px; padding:3px 10px; font:inherit; font-size:12px; cursor:pointer; }
.sj-acts { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-top:6px; }
.sj-status { font-size:12.5px; color:var(--text-muted); }
.sj-status.dirty { color:#b45309; }
.sj-status.warn { color:#b91c1c; font-weight:600; }
.sj-docs a { color:var(--primary, #2563eb); }
.sj-q { border:1px solid var(--border-color); border-radius:10px; padding:10px; margin-bottom:10px; }
.sj-qhead, .sj-a { display:grid; grid-template-columns:1fr 170px auto; gap:8px; align-items:start; margin-bottom:8px; }
.sj-qn { font-weight:700; color:var(--text-main); font-size:13px; margin-bottom:4px; display:block; }
.sj-ans { margin-left:14px; padding-left:10px; border-left:3px solid var(--border-color); }
.sj-q textarea { min-height:56px; }
.sj-q input { width:100%; box-sizing:border-box; }
.sj-imgs { display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:10px; margin-bottom:10px; }
.sj-img { border:1px solid var(--border-color); border-radius:10px; padding:8px; display:flex; flex-direction:column; gap:6px; }
.sj-img img { width:100%; height:130px; object-fit:cover; border-radius:6px; background:rgba(128,128,128,.12); }
.sj-img input { width:100%; box-sizing:border-box; }
.sj-link { border:1px solid #16a34a; background:rgba(22,163,74,.08); border-radius:12px; padding:12px; margin-bottom:12px; }
.sj-link strong { color:var(--text-main); }
.sj-link .sj-linkrow { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; align-items:center; }
.sj-link input { flex:1 1 220px; min-width:0; }
.sj-docs-box { border:1px solid var(--border-color); border-radius:12px; padding:12px; margin-top:12px; }
.sj-docs-box h4 { margin:0; }
.sj-docs-head { display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:space-between; margin-bottom:6px; }
.sj-doc { padding:10px 0; border-top:1px solid var(--border-color); }
.sj-doc .sj-dn { font-weight:600; word-break:break-word; }
.sj-doc .sj-linkrow { display:flex; flex-wrap:wrap; gap:8px; margin-top:6px; align-items:center; }
.sj-danger { color:#b91c1c !important; border-color:#b91c1c !important; }
@media (max-width:640px) { .sj-row, .sj-qhead, .sj-a { grid-template-columns:1fr; } .sj-ans { margin-left:4px; } .sj-bloks button { flex:1 1 100%; } }
`;
    document.head.appendChild(css);

    // ---------- Pemasangan ----------
    function host() { const l = $('tutorial-list'); return l ? l.closest('.tab-content') : null; }
    function ensureRoot() {
        const tab = host(); if (!tab) return null;
        let r = $('sj-root');
        if (!r) { r = document.createElement('div'); r.id = 'sj-root'; tab.insertBefore(r, tab.firstChild); wire(r); render(); }
        return r;
    }

    // ---------- Penyimpanan: server (mode asli) atau perangkat (Mode Coba) ----------
    async function remoteGet(k) {
        if (trial) { try { return parse(localStorage.getItem(TRK(k))); } catch (e) { return null; } }
        const r = await supabaseClient.from('portal_db').select('value').eq('key', k).maybeSingle();
        if (r.error) throw r.error;
        return r.data ? parse(r.data.value) : null;
    }
    async function remotePut(k, v) {
        if (trial) { localStorage.setItem(TRK(k), JSON.stringify(v)); return; }
        const w = await supabaseClient.from('portal_db').upsert({ key: k, value: v }, { onConflict: 'key' });
        if (w.error) throw w.error;
    }
    const canStore = () => trial || !!supabaseClient;

    // ---------- Pengambilan dari server (hanya blok yang sedang dibuka, satu permintaan) ----------
    async function fetchAll(force) {
        if (!currentUser || fetching || !canStore()) return;
        if (!force && Date.now() - lastFetch < 20000) return;
        fetching = true;
        const isTrial = trial, o = MODES[isTrial ? 'trial' : 'real'], b = BLOK[curB], dk = docsKey(b);
        try {
            const keys = b.skenario.map(s => skey(b, s.n)).concat(dk);
            let rows = [];
            if (isTrial) {
                keys.forEach(k => { try { const v = localStorage.getItem(TRK(k)); if (v) rows.push({ key: k, value: v }); } catch (e) { } });
            } else {
                const r = await supabaseClient.from('portal_db').select('key,value').in('key', keys);
                if (r.error) throw r.error;
                rows = r.data || [];
            }
            rows.forEach(row => {
                const v = parse(row.value);
                if (row.key === dk) { if (Array.isArray(v)) o.docs[b.key] = v; }
                else if (v && typeof v === 'object') o.srv[row.key] = Object.assign(blank(), norm(v));
            });
            lastFetch = Date.now();
        } catch (e) { console.error('Seven Jump: gagal memuat', e); }
        fetching = false;
        const r = $('sj-root');
        // jangan merusak ketikan: render ulang hanya bila fokus tidak di dalam form
        if (r && !r.contains(document.activeElement)) render();
    }

    // ---------- Draf, penyimpanan manual & autosave ----------
    function persistDraft(k) { try { localStorage.setItem(DRK(k), JSON.stringify({ data: draft[k], base: base[k] || 0, ts: Date.now() })); } catch (e) { } }
    function dropDraft(k) { delete draft[k]; delete base[k]; try { localStorage.removeItem(DRK(k)); } catch (e) { } }
    function setDraft(k, d) { if (!draft[k]) base[k] = (srv[k] && srv[k].ts) || 0; draft[k] = d; persistDraft(k); schedule(); queueLive(2500); }
    function setState(msg, cls) { const st = $('sj-state'); if (st) { st.textContent = msg; st.className = 'sj-status ' + (cls || ''); } }

    // Tulis satu skenario ke server. force=true: timpa walau teman sudah menyimpan versi lebih baru.
    async function push(k, force) {
        const d = draft[k]; if (!d) return { none: true };
        if (same(d, srv[k])) { dropDraft(k); return { none: true }; }
        const snap = JSON.stringify(cleanData(d));
        const latest = await remoteGet(k);
        if (!force && latest && (latest.ts || 0) > (base[k] || 0) && latest.by !== me()) { conflict[k] = latest; return { conflict: latest }; }
        const out = Object.assign(cleanData(d), { by: me(), ts: Date.now() });
        await remotePut(k, out);
        srv[k] = Object.assign(blank(), out); delete conflict[k]; queueLive();
        // bila selama menyimpan ada ketikan baru, draft tetap dipertahankan
        if (draft[k] && JSON.stringify(cleanData(draft[k])) === snap) dropDraft(k); else { base[k] = out.ts; persistDraft(k); }
        return { ok: out.ts };
    }

    function schedule() { clearTimeout(timer); timer = setTimeout(autosave, AUTOSAVE_MS); }

    async function autosave() {
        clearTimeout(timer);
        if (saving) { schedule(); return; }
        const ks = Object.keys(draft).filter(k => !conflict[k] && INFO[k]);
        if (!ks.length || !canStore() || !currentUser) return;
        saving = true;
        for (const k of ks) {
            const here = k === curKey();
            if (here) setState('Menyimpan otomatis...', 'dirty');
            try {
                const res = await push(k, false);
                if (here) {
                    if (res.conflict) setState('\u26a0 ' + (res.conflict.by || 'Teman') + ' menyimpan versi lebih baru. Autosave dihentikan: klik Simpan (menimpa) atau Muat ulang.', 'warn');
                    else if (res.ok) { setState(draft[k] ? 'Perubahan akan disimpan otomatis...' : 'Tersimpan otomatis ' + hhmm(), draft[k] ? 'dirty' : ''); const m = $('sj-meta'); if (m) m.textContent = metaText(k); }
                }
            } catch (e) {
                console.error('Autosave gagal', e);
                if (here) setState('Autosave gagal (draf aman di perangkat). Akan dicoba lagi.', 'warn');
                schedule();
            }
        }
        saving = false;
        refreshTabs();
    }

    async function autosaveNow() { clearTimeout(timer); await autosave(); }

    async function save() {
        collect();
        const k = curKey(), n = cur;
        if (!draft[k]) { toast('Semua perubahan sudah tersimpan.'); return; }
        if (!canStore()) { alert('Server belum terhubung. Perubahan belum tersimpan.'); return; }
        clearTimeout(timer);
        while (saving) await sleep(150);
        const done = busy('Menyimpan skenario ' + n + '...');
        try {
            let res = await push(k, false);
            if (res.conflict) {
                done();
                if (!confirm('Skenario ' + n + ' baru disimpan oleh ' + (res.conflict.by || 'teman') + ' pukul ' + fmtTs(res.conflict.ts) + '. Timpa dengan versimu?\n\nOK = timpa, Batal = tidak (muat ulang dulu).')) { render(); return; }
                res = await push(k, true);
            }
            toast((trial ? '(Coba) ' : '') + 'Skenario ' + n + ' tersimpan.');
        } catch (e) { console.error(e); alert('Gagal menyimpan. Draf tetap aman di perangkat ini, coba lagi sebentar.'); }
        finally { done(); }
        render();
    }

    // ---------- Mode Coba ----------
    async function setTrial(on) {
        collect();
        while (saving) await sleep(120);
        await autosaveNow();                        // simpan dulu isian mode yang sedang dipakai
        while (saving) await sleep(120);
        trial = !!on; try { sessionStorage.setItem('a9_sj_trial', on ? '1' : '0'); } catch (e) { }
        useMode(); lastDoc = null; lastFetch = 0;
        render(); fetchAll(true);
    }
    function resetTrial() {
        const b = BLOK[curB];
        if (!confirm('Kosongkan semua isian coba untuk ' + b.label + ' di perangkat ini? Data kelompok yang asli tidak tersentuh.')) return;
        const o = MODES.trial;
        b.skenario.forEach(s => {
            const k = skey(b, s.n);
            delete o.srv[k]; delete o.draft[k]; delete o.base[k]; delete o.conflict[k];
            try { localStorage.removeItem(TRK(k)); localStorage.removeItem(DRK(k, 'trial')); } catch (e) { }
        });
        render();
    }

    // ---------- Tampilan ----------
    function stateText() {
        const k = curKey();
        if (conflict[k]) return ['\u26a0 ' + (conflict[k].by || 'Teman') + ' menyimpan versi lebih baru. Autosave dihentikan: klik Simpan (menimpa) atau Muat ulang.', 'warn'];
        if (draft[k]) return ['Perubahan akan disimpan otomatis...', 'dirty'];
        return ['', ''];
    }
    function refreshTabs() {
        const r = $('sj-root'); if (!r) return;
        const b = BLOK[curB];
        r.querySelectorAll('.sj-tabs button').forEach(el => { const x = +el.dataset.n; el.textContent = 'Skenario ' + x + mark(b, x); });
        r.querySelectorAll('.sj-bloks button').forEach(el => { const bb = BLOK[+el.dataset.b], m = el.querySelector('.sj-bl'); if (bb && m) m.textContent = bb.label + (blokDirty(bb) ? ' \u2022' : ''); });
    }

    function trialBar() {
        const b = BLOK[curB];
        return trial
            ? `<div class="sj-trial"><strong>\ud83e\uddea MODE COBA aktif</strong> \u2014 isian hanya disimpan di perangkat ini. Tidak masuk ke data kelompok, tidak membuat Google Docs di Drive (hanya unduh .doc), dan unggah gambar dimatikan. Aman untuk coba-coba.
  <div class="sj-acts"><button type="button" class="btn btn-primary btn-sm" data-trial="off">Keluar Mode Coba</button><button type="button" class="btn btn-outline btn-sm" data-trialreset>Kosongkan isian coba (${esc(b.label)})</button></div></div>`
            : `<div class="sj-acts" style="margin:0 0 10px;"><button type="button" class="btn btn-outline btn-sm" data-trial="on">\ud83e\uddea Mode Coba</button><span class="sj-status">Mau coba-coba tanpa mengubah isian kelompok? Nyalakan Mode Coba.</span></div>`;
    }

    function linkCard() {
        if (!lastDoc) return '';
        return `<div class="sj-link"><strong>\u2705 Google Docs sudah dibuat</strong><div class="sj-status">${esc(lastDoc.name)}</div>
  <div class="sj-linkrow"><input class="modern-input" id="sj-linkinput" readonly value="${esc(lastDoc.url)}" onfocus="this.select()">
  <button type="button" class="btn btn-primary btn-sm" data-copy="${esc(lastDoc.url)}">Salin link</button>
  <a class="btn btn-outline btn-sm" href="${esc(lastDoc.url)}" target="_blank" rel="noopener">Buka</a>
  ${docxUrl(lastDoc) ? `<a class="btn btn-outline btn-sm" href="${esc(docxUrl(lastDoc))}" target="_blank" rel="noopener">\u2b07 Unduh .docx</a>` : ''}
  ${navigator.share ? '<button type="button" class="btn btn-outline btn-sm" data-share>Bagikan</button>' : ''}
  <button type="button" class="btn btn-outline btn-sm" data-closelink>Tutup</button></div>
  <div class="sj-status" style="margin-top:6px;">${lastDoc.shared === false ? 'Akses "siapa saja yang memiliki link" belum bisa diatur otomatis. Atur manual lewat tombol Bagikan di Google Docs.' : 'Siapa saja yang memiliki link ini bisa melihat dokumennya. Isinya ikut berubah otomatis saat skenario diisi atau diubah di portal.'}</div></div>`;
    }

    function render() {
        const r = $('sj-root'); if (!r) return;
        const b = BLOK[curB], s = b.skenario[cur - 1], k = curKey(), v = view(k), st = stateText();
        const head = `<div class="sj-head"><h3>\ud83d\udcdd Seven Jump</h3><span class="sj-status" id="sj-meta">${esc(s ? metaText(k) : '')}</span></div>${trialBar()}
<div class="sj-bloks" role="tablist" aria-label="Pilih blok">${BLOK.map((x, i) => `<button type="button" role="tab" data-b="${i}" class="${i === curB ? 'on' : ''}"><span class="sj-bl">${esc(x.label)}${blokDirty(x) ? ' \u2022' : ''}</span><span class="sj-bj">${esc(x.judul)}</span><span class="sj-bc">${x.skenario.length} skenario</span></button>`).join('')}</div>`;
        if (!s) { r.innerHTML = head + `<p class="sj-status">Blok ini belum punya skenario.</p>`; return; }
        const istilah = v.istilah && v.istilah.length ? v.istilah : [{ t: '', d: '' }];
        const gambar = v.gambar || [];
        const soal = v.soal && v.soal.length ? v.soal : [{ q: '', by: me(), a: [{ t: '', by: me() }] }];
        const used = new Set(istilah.map(x => (x.t || '').trim().toLowerCase()));
        const dl = docs[b.key] || [];
        r.innerHTML = head + `
<div class="sj-blokinfo sj-status">${esc(b.label)} \u2013 ${esc(b.judul)}</div>
<div class="sj-tabs">${b.skenario.map(x => `<button type="button" data-n="${x.n}" class="${x.n === cur ? 'on' : ''}">Skenario ${x.n}${mark(b, x.n)}</button>`).join('')}</div>
<details class="sj-card sj-case" open><summary><strong>Skenario ${s.n}: ${esc(s.judul)}</strong></summary>
  <p class="sj-sub" style="margin-top:6px;">${esc(s.topik)}</p>${s.teks.map(p => `<p>${esc(p)}</p>`).join('')}</details>
<div class="sj-card"><h4>Langkah 1 \u2013 Klarifikasi istilah / kalimat sulit</h4><p class="sj-sub">Tulis istilah dari skenario dan artinya sesuai kesepakatan kelompok.</p>
  <div id="sj-rows">${istilah.map((x, i) => `<div class="sj-row" data-i="${i}"><input class="modern-input" data-t placeholder="Istilah" value="${esc(x.t)}"><textarea class="modern-input" data-d placeholder="Arti / penjelasan">${esc(x.d)}</textarea><button type="button" class="btn btn-outline btn-sm" data-del="${i}" title="Hapus baris">\u2715</button></div>`).join('')}</div>
  <div class="sj-acts"><button type="button" class="btn btn-outline btn-sm" data-add>+ Tambah istilah</button></div>
  <div class="sj-hints">${s.hint.filter(h => !used.has(h.toLowerCase())).map(h => `<button type="button" data-hint="${esc(h)}">+ ${esc(h)}</button>`).join('')}</div></div>
<div class="sj-card"><h4>Langkah 2\u20133 \u2013 Rumusan masalah dan jawaban sementara</h4><p class="sj-sub">Tulis masalah, lalu tambahkan satu atau lebih jawaban di bawahnya. Nama terisi otomatis dengan akunmu dan bisa diganti (ketik atau pilih dari daftar). Jawaban sementara dibuat tanpa membuka gadget atau literatur.</p>
  <datalist id="sj-names">${NAMES.map(x => `<option value="${esc(x)}">`).join('')}</datalist>
  <div id="sj-soal">${soal.map((x, qi) => `<div class="sj-q" data-qi="${qi}">
    <span class="sj-qn">Masalah ${qi + 1}</span>
    <div class="sj-qhead"><textarea class="modern-input" data-q placeholder="Contoh: Mengapa ...?">${esc(x.q)}</textarea><input class="modern-input" data-qby list="sj-names" placeholder="Nama penanya" value="${esc(x.by)}"><button type="button" class="btn btn-outline btn-sm" data-delq="${qi}" title="Hapus masalah ini">\u2715</button></div>
    <div class="sj-ans">${(x.a && x.a.length ? x.a : [{ t: '', by: me() }]).map((a, ai) => `<div class="sj-a" data-ai="${ai}"><textarea class="modern-input" data-at placeholder="Jawaban ${ai + 1}">${esc(a.t)}</textarea><input class="modern-input" data-aby list="sj-names" placeholder="Nama penjawab" value="${esc(a.by)}"><button type="button" class="btn btn-outline btn-sm" data-dela="${qi}-${ai}" title="Hapus jawaban">\u2715</button></div>`).join('')}
    <button type="button" class="btn btn-outline btn-sm" data-adda="${qi}">+ Tambah jawaban</button></div></div>`).join('')}</div>
  <div class="sj-acts"><button type="button" class="btn btn-outline btn-sm" data-addq>+ Tambah masalah</button></div></div>
<div class="sj-card"><h4>Langkah 5 \u2013 Learning Objectives (LO)</h4><p class="sj-sub">Satu LO per baris.</p><textarea class="modern-input" data-f="lo" placeholder="Mahasiswa mampu menjelaskan ...">${esc(v.lo)}</textarea></div>
<div class="sj-card"><h4>Pertemuan 2 \u2013 Hasil belajar mandiri (opsional)</h4><p class="sj-sub">Informasi baru yang dilaporkan dan dibahas pada pertemuan kedua.</p><textarea class="modern-input" data-f="belajar" placeholder="Isi bila sudah ada">${esc(v.belajar)}</textarea></div>
<div class="sj-card"><h4>\ud83d\uddbc\ufe0f Gambar pendukung</h4><p class="sj-sub">Tambahkan gambar (skema, foto, tabel) untuk memperkuat alasan. Tulis keterangan di bawah tiap gambar. Foto otomatis diperkecil sebelum diunggah.${trial ? ' (Dimatikan di Mode Coba.)' : ''}</p>
  <div class="sj-imgs">${gambar.map((g, i) => `<div class="sj-img" data-url="${esc(g.url)}" data-id="${esc(g.id || '')}"><img src="${esc(imgSrc(g))}" alt="Gambar ${i + 1}" loading="lazy" referrerpolicy="no-referrer"><input class="modern-input" data-cap placeholder="Keterangan / alasan gambar ini" value="${esc(g.cap || '')}"><button type="button" class="btn btn-outline btn-sm" data-delimg="${i}">Hapus dari daftar</button></div>`).join('')}</div>
  <input type="file" id="sj-file" accept="image/*" multiple hidden>
  <div class="sj-acts"><button type="button" class="btn btn-outline btn-sm" data-addimg>+ Tambah gambar</button></div></div>
<div class="sj-card"><h4>\ud83d\udd17 Sumber / referensi</h4><p class="sj-sub">Satu sumber per baris. Boleh <em>Judul | link</em> atau tempel link saja. Tampil di akhir dokumen.</p><textarea class="modern-input" data-f="sumber" placeholder="Guyton & Hall, Textbook of Medical Physiology | https://...">${esc(v.sumber)}</textarea></div>
${trial ? '' : linkCard()}
<div class="sj-acts">
  <button type="button" class="btn btn-primary" data-save>${trial ? 'Simpan (coba) skenario ' : 'Simpan skenario '}${s.n}</button>
  <button type="button" class="btn btn-outline" data-reload>${trial ? 'Muat ulang isian coba' : 'Muat ulang'}</button>
  <button type="button" class="btn btn-outline" data-exp="one">${trial ? 'Unduh .doc' : 'Buat Google Docs'} (skenario ${s.n})</button>
  <button type="button" class="btn btn-outline" data-exp="all">${trial ? 'Unduh .doc' : 'Buat Google Docs'} (semua skenario)</button>
  <button type="button" class="btn btn-outline" data-cp="one">Salin ke Google Docs (skenario ${s.n})</button>
  <button type="button" class="btn btn-outline" data-cp="all">Salin ke Google Docs (semua skenario)</button>
  <span class="sj-status ${st[1]}" id="sj-state">${esc(st[0])}</span></div>
${trial ? '' : docsPanel()}`;
    }

    // ambil isi form ke draft
    function collect() {
        const r = $('sj-root'); if (!r || !r.querySelector('#sj-rows')) return;
        const k = curKey();
        const b = view(k), d = { istilah: [], soal: [], lo: b.lo, belajar: b.belajar, sumber: b.sumber, gambar: [] };
        r.querySelectorAll('.sj-row').forEach(row => d.istilah.push({ t: row.querySelector('[data-t]').value, d: row.querySelector('[data-d]').value }));
        r.querySelectorAll('[data-f]').forEach(el => { d[el.dataset.f] = el.value; });
        r.querySelectorAll('.sj-q').forEach(q => d.soal.push({ q: q.querySelector('[data-q]').value, by: q.querySelector('[data-qby]').value, a: Array.from(q.querySelectorAll('.sj-a')).map(a => ({ t: a.querySelector('[data-at]').value, by: a.querySelector('[data-aby]').value })) }));
        r.querySelectorAll('.sj-img').forEach(el => d.gambar.push({ url: el.dataset.url, id: el.dataset.id || '', cap: el.querySelector('[data-cap]').value }));
        if (same(d, srv[k])) { if (draft[k]) dropDraft(k); }
        else setDraft(k, d);
        const st = stateText(); setState(st[0], st[1]);
    }

    // ubah draft dari tombol (tambah/hapus baris, gambar, dst.)
    function mutate(fn) { collect(); const k = curKey(); const d = clone(view(k)); if (!d.istilah || !d.istilah.length) d.istilah = [{ t: '', d: '' }]; if (!d.soal || !d.soal.length) d.soal = [{ q: '', by: me(), a: [] }]; d.soal.forEach(x => { if (!x.a) x.a = []; }); fn(d); setDraft(k, d); render(); }

    // perkecil foto sebelum diunggah (maks 1600 px, JPEG)
    function shrink(file) {
        return new Promise(res => {
            if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return res(file);
            const img = new Image(), u = URL.createObjectURL(file);
            img.onload = () => {
                const k = Math.min(1, 1600 / Math.max(img.width, img.height));
                if (k === 1 && file.size < 1.5e6) { URL.revokeObjectURL(u); return res(file); }
                const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
                const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
                c.toBlob(b => { URL.revokeObjectURL(u); res(b ? new File([b], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file); }, 'image/jpeg', 0.85);
            };
            img.onerror = () => { URL.revokeObjectURL(u); res(file); };
            img.src = u;
        });
    }

    async function addImages(files) {
        if (trial) { toast('Unggah gambar dimatikan di Mode Coba.'); return; }
        collect();
        const b = BLOK[curB], n = cur, k = skey(b, n), added = [];
        for (const f of files) {
            if (!/^image\//.test(f.type)) { toast(f.name + ' bukan gambar, dilewati.'); continue; }
            const small = await shrink(f);
            const url = await uploadFileObj(small, b.folder + '/Skenario ' + n);
            if (url) added.push({ url, id: driveIdOf(url) || '', cap: '' });
        }
        if (!added.length) return;
        const d = clone(view(k)); d.gambar = (d.gambar || []).concat(added);
        setDraft(k, d);
        if (curKey() === k) render();
    }

    async function copyText(t) {
        try { await navigator.clipboard.writeText(t); return true; }
        catch (e) {
            const ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0;'; document.body.appendChild(ta); ta.select();
            let ok = false; try { ok = document.execCommand('copy'); } catch (x) { } ta.remove(); return ok;
        }
    }

    function wire(r) {
        r.addEventListener('input', () => collect());
        r.addEventListener('change', e => {
            if (e.target.id === 'sj-file') { const fs = Array.from(e.target.files || []); e.target.value = ''; if (fs.length) addImages(fs); }
        });
        r.addEventListener('click', e => {
            const t = e.target.closest('button'); if (!t) return;
            if (t.dataset.b != null) { const i = +t.dataset.b; if (i === curB || !BLOK[i]) return; collect(); curB = i; cur = 1; lastDoc = null; lastFetch = 0; render(); fetchAll(true); autosave(); return; }
            if (t.dataset.n) { collect(); cur = +t.dataset.n; render(); autosave(); return; }
            if (t.dataset.trial) { setTrial(t.dataset.trial === 'on'); return; }
            if (t.hasAttribute('data-trialreset')) { resetTrial(); return; }
            if (t.hasAttribute('data-add')) { mutate(d => d.istilah.push({ t: '', d: '' })); const rows = r.querySelectorAll('.sj-row'); const last = rows[rows.length - 1]; if (last) last.querySelector('[data-t]').focus(); return; }
            if (t.dataset.hint) { mutate(d => { const e0 = d.istilah.findIndex(x => !x.t && !x.d); if (e0 >= 0) d.istilah[e0].t = t.dataset.hint; else d.istilah.push({ t: t.dataset.hint, d: '' }); }); return; }
            if (t.dataset.del != null) { mutate(d => { d.istilah.splice(+t.dataset.del, 1); if (!d.istilah.length) d.istilah = [{ t: '', d: '' }]; }); return; }
            if (t.hasAttribute('data-addq')) { mutate(d => d.soal.push({ q: '', by: me(), a: [{ t: '', by: me() }] })); const qs = r.querySelectorAll('.sj-q'); const last = qs[qs.length - 1]; if (last) last.querySelector('[data-q]').focus(); return; }
            if (t.dataset.delq != null) { mutate(d => { d.soal.splice(+t.dataset.delq, 1); }); return; }
            if (t.dataset.adda != null) { const qi = +t.dataset.adda; mutate(d => { if (d.soal[qi]) { if (!d.soal[qi].a.length) d.soal[qi].a.push({ t: '', by: me() }); d.soal[qi].a.push({ t: '', by: me() }); } }); const q = r.querySelectorAll('.sj-q')[qi]; if (q) { const as = q.querySelectorAll('[data-at]'); if (as.length) as[as.length - 1].focus(); } return; }
            if (t.dataset.dela != null) { const p = t.dataset.dela.split('-').map(Number); mutate(d => { if (d.soal[p[0]]) d.soal[p[0]].a.splice(p[1], 1); }); return; }
            if (t.hasAttribute('data-addimg')) { if (trial) { toast('Unggah gambar dimatikan di Mode Coba.'); return; } const f = $('sj-file'); if (f) f.click(); return; }
            if (t.dataset.delimg != null) { mutate(d => { d.gambar.splice(+t.dataset.delimg, 1); }); return; }
            if (t.hasAttribute('data-save')) { save(); return; }
            if (t.hasAttribute('data-reload')) {
                const k = curKey();
                if (draft[k] && !confirm('Perubahan yang belum tersimpan di skenario ' + cur + ' akan dibuang. Lanjutkan?')) return;
                dropDraft(k); delete conflict[k];
                fetchAll(true).then(render); return;
            }
            if (t.dataset.cp) { copyToDocs(t.dataset.cp === 'one' ? [cur] : BLOK[curB].skenario.map(x => x.n)); return; }
            if (t.dataset.exp) { exportDocs(t.dataset.exp === 'one' ? [cur] : BLOK[curB].skenario.map(x => x.n)); return; }
            if (t.dataset.docdel != null) { deleteDocEntry(+t.dataset.docdel); return; }
            if (t.hasAttribute('data-docdelall')) { deleteAllDocs(); return; }
            if (t.hasAttribute('data-docsync')) { liveSync(true, true); return; }
            if (t.dataset.copy) { copyText(t.dataset.copy).then(ok => toast(ok ? 'Link disalin.' : 'Gagal menyalin. Pilih link lalu salin manual.')); return; }
            if (t.hasAttribute('data-share')) { if (lastDoc && navigator.share) navigator.share({ title: lastDoc.name, url: lastDoc.url }).catch(() => { }); return; }
            if (t.hasAttribute('data-closelink')) { lastDoc = null; render(); return; }
        });
    }

    // ---------- Dokumen Google Docs yang tersambung (sinkron otomatis, unduh .docx, hapus oleh admin) ----------
    const isAdm = () => !!currentUser && currentUser.role === 'admin';
    const docIdOf = u => { const m = String(u || '').match(/docs\.google\.com\/document\/d\/([\w-]+)/); return m ? m[1] : null; };
    const docxUrl = e => { const id = e && (e.id || docIdOf(e.url)); return id ? 'https://docs.google.com/document/d/' + id + '/export?format=docx' : ''; };
    const hashStr = str => { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return String(h) + ':' + str.length; };
    const getDriveKey = () => { try { return localStorage.getItem('a9_drive_key') || ''; } catch (e) { return ''; } };

    // Satu pintu ke Apps Script. interactive=true: minta kunci bila belum ada. Mengembalikan {ok, ...} dan tidak melempar error.
    async function scriptCall(payload, interactive) {
        let key = getDriveKey();
        if (!key) {
            if (!interactive) return { ok: false, silent: true, error: 'kunci belum diisi' };
            const r = await askDialog('Kunci unggah ke Drive', [
                { type: 'note', text: 'Masukkan kunci unggah (UPLOAD_KEY) dari Apps Script. Cukup sekali di perangkat ini.' },
                { id: 'k', label: 'Kunci unggah', type: 'password' }], 'Simpan');
            if (!r || !r.k.trim()) return { ok: false, silent: true, error: 'kunci tidak diisi' };
            key = r.k.trim(); try { localStorage.setItem('a9_drive_key', key); } catch (e) { }
        }
        try {
            const r = await fetch(DRIVE_UPLOAD_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ key }, payload)) });
            const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch (e) { }
            if (!j) return { ok: false, error: 'Apps Script tidak membalas dengan benar. Biasanya deploy belum diatur "Siapa saja" atau URL di script.js bukan deploy terbaru.' };
            if (!j.ok && /kunci/i.test(j.error || '')) { try { localStorage.removeItem('a9_drive_key'); } catch (e) { } }
            return j;
        } catch (e) {
            return { ok: false, error: (e && e.name === 'TypeError') ? 'Tidak bisa menghubungi Apps Script. Cek internet, dan pastikan akses deploy = "Siapa saja".' : (e.message || String(e)) };
        }
    }

    // Ubah daftar dokumen satu blok: baca versi terbaru di server dulu supaya perubahan teman tidak tertimpa
    async function mutateDocs(b, fn) {
        const dk = docsKey(b);
        let cur = docs[b.key] || [];
        if (supabaseClient) {
            try {
                const r = await supabaseClient.from('portal_db').select('value').eq('key', dk).maybeSingle();
                if (!r.error && r.data) { const v = parse(r.data.value); if (Array.isArray(v)) cur = v; }
            } catch (e) { }
        }
        const out = fn(cur.slice());
        if (supabaseClient) {
            const w = await supabaseClient.from('portal_db').upsert({ key: dk, value: out }, { onConflict: 'key' });
            if (w.error) throw w.error;
        }
        docs[b.key] = out;
        return out;
    }

    function docsPanel() {
        const b = BLOK[curB], dl = docs[b.key] || [], adm = isAdm();
        if (!dl.length) return `<div class="sj-docs-box"><h4>\ud83d\udcc4 Dokumen Google Docs</h4><p class="sj-status" style="margin:6px 0 0;">Belum ada dokumen untuk ${esc(b.label)}. Klik <em>Buat Google Docs</em>. Dokumen yang dibuat bisa dibuka, diunduh sebagai .docx, dan ikut berubah otomatis saat isi portal berubah.</p></div>`;
        const rows = dl.map((e, i) => {
            const dx = docxUrl(e);
            const st = e.gone ? '\u26a0 Dokumen tidak ditemukan di Drive (mungkin sudah dihapus).'
                : e.live ? '\ud83d\udd04 Ikut berubah otomatis \u00b7 diperbarui ' + fmtTs(e.upd || e.ts)
                : 'Salinan lama (tidak ikut berubah). Klik Buat Google Docs lagi untuk membuat dokumen yang otomatis diperbarui.';
            return `<div class="sj-doc"><div class="sj-dn">${esc(e.name)}</div><div class="sj-status">${esc(st)}${e.by ? ' \u00b7 dibuat oleh ' + esc(e.by) : ''}</div>
  <div class="sj-linkrow"><a class="btn btn-primary btn-sm" href="${esc(e.url)}" target="_blank" rel="noopener">Buka</a>${dx ? `<a class="btn btn-outline btn-sm" href="${esc(dx)}" target="_blank" rel="noopener">\u2b07 Unduh .docx</a>` : ''}<button type="button" class="btn btn-outline btn-sm" data-copy="${esc(e.url)}">Salin link</button>${adm ? `<button type="button" class="btn btn-outline btn-sm sj-danger" data-docdel="${i}">Hapus</button>` : ''}</div></div>`;
        }).join('');
        return `<div class="sj-docs-box"><div class="sj-docs-head"><h4>\ud83d\udcc4 Dokumen Google Docs (${esc(b.label)})</h4><span><button type="button" class="btn btn-outline btn-sm" data-docsync>\ud83d\udd04 Perbarui sekarang</button>${adm && dl.length > 1 ? ' <button type="button" class="btn btn-outline btn-sm sj-danger" data-docdelall>Hapus semua</button>' : ''}</span></div>${rows}</div>`;
    }

    async function deleteDocEntry(i) {
        if (!isAdm()) return;
        const b = BLOK[curB], e = (docs[b.key] || [])[i]; if (!e) return;
        if (!confirm('Hapus dokumen ini?\n\n' + e.name + '\n\nFile Google Docs dipindah ke Sampah Drive (bisa dipulihkan 30 hari) dan link-nya hilang dari portal.')) return;
        const done = busy('Menghapus dokumen...');
        try {
            const id = e.id || docIdOf(e.url);
            if (id) {
                const j = await scriptCall({ action: 'deleteDoc', id }, true);
                if (!j.ok) {
                    done();
                    if (!confirm('Dokumen belum terhapus di Drive (' + (j.error || 'gagal') + ').\n\nHapus dari daftar portal saja?')) return;
                }
            }
            await mutateDocs(b, l => l.filter(x => !(x && x.url === e.url && x.ts === e.ts)));
            if (lastDoc && lastDoc.url === e.url) lastDoc = null;
            toast('Dokumen dihapus.');
        } catch (er) { console.error(er); alert('Gagal menghapus dari daftar. Cek koneksi lalu coba lagi.'); }
        finally { done(); }
        render();
    }

    async function deleteAllDocs() {
        if (!isAdm()) return;
        const b = BLOK[curB], all = (docs[b.key] || []).slice(); if (!all.length) return;
        if (!confirm('Hapus SEMUA ' + all.length + ' dokumen untuk ' + b.label + '?\n\nFile dipindah ke Sampah Drive (bisa dipulihkan 30 hari) dan semua link hilang dari portal.')) return;
        const done = busy('Menghapus ' + all.length + ' dokumen...');
        const failed = [];
        try {
            for (const e of all) {
                const id = e.id || docIdOf(e.url);
                if (!id) continue;
                const j = await scriptCall({ action: 'deleteDoc', id }, true);
                if (!j.ok) { failed.push(e); if (j.silent) break; }
            }
            const keep = new Set(failed.map(e => e.url + '|' + e.ts));
            await mutateDocs(b, l => l.filter(x => x && keep.has(x.url + '|' + x.ts)));
            lastDoc = null;
        } catch (er) { console.error(er); alert('Gagal memperbarui daftar dokumen.'); }
        finally { done(); }
        toast(failed.length ? failed.length + ' dokumen gagal dihapus dan tetap ada di daftar.' : 'Semua dokumen dihapus.');
        render();
    }

    // Sinkron otomatis: dokumen yang dibuat lewat portal diperbarui bila isi skenario berubah
    let liveBusy = false, livePending = false, lastLive = 0, liveT = null;
    function queueLive(ms) { if (trial) return; clearTimeout(liveT); liveT = setTimeout(() => liveSync(false), ms || 2500); }
    window.__sjLiveKick = () => queueLive(2000);   // dipanggil modul pertanyaan/notulen setelah menyimpan
    async function liveSync(force, manual) {
        if (trial || !DRIVE_UPLOAD_URL || !currentUser) return;
        if (liveBusy) { livePending = true; return; }   // ada pembaruan berjalan: ulangi sesudahnya supaya ketikan terbaru ikut
        if (!manual && !getDriveKey()) return;          // otomatis berjalan diam-diam; kunci hanya diminta saat tombol ditekan
        const b = BLOK[curB];
        const list = (docs[b.key] || []).filter(e => e && e.live && !e.gone && e.id && Array.isArray(e.ns) && e.ns.length);
        lastLive = Date.now();
        if (!list.length) { if (manual) toast('Belum ada dokumen yang tersambung untuk blok ini.'); return; }
        if (!lastFetch) { if (manual) toast('Data belum selesai dimuat. Coba lagi sebentar.'); return; }   // jangan sampai dokumen ditimpa data kosong
        if (manual) { collect(); await autosaveNow(); }     // isi dokumen memakai tampilan terkini, termasuk ketikan yang belum tersimpan
        liveBusy = true;
        let n = 0, fail = '';
        try {
            const allNs = Array.from(new Set([].concat(...list.map(e => e.ns))));
            if (window.__sjxLoad) { try { await window.__sjxLoad(b, allNs); } catch (e) { console.error(e); } }
            for (const e of list) {
                if (e.ns.some(x => !b.skenario[x - 1])) continue;
                const html = docHtml(e.ns, true), h = hashStr(html + '|' + e.name);
                if (!force && e.hash === h) continue;
                const j = await scriptCall({ action: 'updateDoc', id: e.id, name: e.name, html }, !!manual);
                if (j.ok) {
                    n++;
                    await mutateDocs(b, l => l.map(x => x && x.id === e.id ? Object.assign({}, x, { hash: h, upd: Date.now(), updBy: me() }) : x));
                } else if (/tidak ditemukan/i.test(j.error || '')) {
                    await mutateDocs(b, l => l.map(x => x && x.id === e.id ? Object.assign({}, x, { gone: true }) : x));
                } else if (!j.silent) { fail = j.error || 'gagal'; console.error('Sinkron dokumen gagal:', fail); }
            }
        } catch (er) { console.error(er); fail = er.message || 'gagal'; }
        liveBusy = false;
        if (livePending) { livePending = false; queueLive(1500); }
        if (manual) toast(fail ? 'Sinkron gagal: ' + fail : n ? n + ' dokumen diperbarui.' : 'Semua dokumen sudah yang terbaru.');
        const r = $('sj-root'); if (r && !r.contains(document.activeElement)) render();
    }

    // ---------- Ekspor ke Google Docs ----------
    const URLRE = /https?:\/\/[^\s<>"']+/;
    function srcLi(line) {
        const m = line.match(URLRE); if (!m) return esc(line);
        const url = m[0].replace(/[).,;]+$/, '');
        const title = line.replace(m[0], '').replace(/\|/g, ' ').replace(/\s+[-\u2013\u2014:]\s*$/, '').replace(/\s+/g, ' ').trim();
        return (title ? esc(title) + ' \u2013 ' : '') + `<a href="${esc(url)}">${esc(url)}</a>`;
    }

    // Format dokumen mengikuti contoh "Tutor Skenario":
    //   judul tengah (SKENARIO n / topik / judul) -> teks kasus -> A. Klasifikasi kata sulit -> B. Rumusan Masalah -> LO -> dst.
    // tokens=true: gambar Drive ditandai [[IMG:id]] supaya Apps Script menyisipkannya ke Docs
    function docHtml(ns, tokens) {
        const b = BLOK[curB];
        const U = s => esc(String(s || '').toUpperCase());
        const ctr = t => `<p style="text-align:center;margin:0"><b>${t}</b></p>`;
        const sp = '<p style="margin:0">&nbsp;</p>';
        const none = '<p style="margin:0 0 6pt 36pt"><em>(belum diisi)</em></p>';
        const ol = a => a.length ? '<ol style="margin-top:0;margin-bottom:6pt">' + a.join('') + '</ol>' : none;
        const nm = (by, t) => (by ? esc(by) + ' - ' : '') + t;
        const allSrc = [], seen = new Set();
        const body = ns.map(n => {
            let li = 0; const L = () => String.fromCharCode(65 + li++) + '.';
            const hd = t => `<p style="margin:12pt 0 4pt 0">${L()} ${t}</p>`;
            const s = b.skenario[n - 1], k = skey(b, n), v = cleanData(view(k)), meta = srv[k] && srv[k].ts ? 'Terakhir disimpan oleh ' + srv[k].by + ', ' + fmtTs(srv[k].ts) : '';
            const istilah = ol(v.istilah.map(x => `<li>${esc(x.t)}${x.d ? ' - ' + esc(x.d) : ''}</li>`));
            const soal = ol(v.soal.map(x => `<li>${nm(x.by, esc(x.q) || '<em>(belum ditulis)</em>')}` +
                (x.a.length ? '<ul style="margin-top:0">' + x.a.map(a => `<li>${nm(a.by, esc(a.t))}</li>`).join('') + '</ul>' : '') + '</li>'));
            const gam = v.gambar.map((g, i) => (tokens && g.id ? `<p>[[IMG:${g.id}]]</p>` : `<p><img src="${esc(imgSrc(g))}" width="440"></p>`) +
                `<p style="font-size:9pt;color:#555"><em>Gambar ${i + 1}${g.cap ? '. ' + esc(g.cap) : ''}</em></p>`).join('');
            const sl = lines(v.sumber);
            sl.forEach(x => { const kk = x.toLowerCase(); if (!seen.has(kk)) { seen.add(kk); allSrc.push(x); } });
            return ctr('SKENARIO ' + s.n) + ctr(U(s.topik)) + sp + ctr(U(s.judul)) + sp +
                s.teks.map(p => `<p>${esc(p)}</p>`).join('') +
                hd('Klasifikasi kata sulit') + istilah +
                hd('Rumusan Masalah') + soal +
                hd('Learning Objectives (LO)') + ol(lines(v.lo).map(x => `<li>${esc(x)}</li>`)) +
                (v.belajar ? hd('Hasil belajar mandiri (pertemuan 2)') + ol(lines(v.belajar).map(x => `<li>${esc(x)}</li>`)) : '') +
                (window.__sjxDoc ? window.__sjxDoc(b, n, L) : '') +
                (gam ? hd('Gambar pendukung') + gam : '') +
                (sl.length ? hd('Sumber / referensi') + `<ol style="margin-top:0">${sl.map(x => `<li>${srcLi(x)}</li>`).join('')}</ol>` : '') +
                (meta ? `<p style="color:#888;font-size:9pt">${esc(meta)} \u2013 ${esc(b.label)} \u2013 Kelompok A9</p>` : '');
        }).join('<br style="page-break-before:always">');
        const gabungan = ns.length > 1 && allSrc.length ? `<br style="page-break-before:always"><p style="text-align:center"><b>DAFTAR SUMBER (SEMUA SKENARIO)</b></p><ol>${allSrc.map(x => `<li>${srcLi(x)}</li>`).join('')}</ol>` : '';
        return `<html><head><meta charset="utf-8"><title>Seven Jump ${esc(b.label)}</title></head><body style="font-family:Arial,sans-serif;font-size:11pt">${body}${gabungan}</body></html>`;
    }

    // Cara cadangan yang tidak butuh Apps Script: salin isi dokumen (berformat) lalu tempel di Google Docs baru
    async function copyToDocs(ns) {
        collect();
        const html = docHtml(ns, false);
        const inner = (html.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [0, html])[1];
        const bodyHtml = '<div style="font-family:Arial,sans-serif;font-size:11pt">' + inner + '</div>';
        const plain = bodyHtml.replace(/<br[^>]*>/gi, '\n').replace(/<\/(p|li|tr|h\d)>/gi, '\n').replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
        let ok = false;
        try {
            if (navigator.clipboard && window.ClipboardItem) {
                await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([bodyHtml], { type: 'text/html' }), 'text/plain': new Blob([plain], { type: 'text/plain' }) })]);
                ok = true;
            }
        } catch (e) { console.error(e); }
        if (!ok) {
            try {
                const d = document.createElement('div'); d.contentEditable = 'true'; d.style.cssText = 'position:fixed;left:-9999px;top:0;width:700px';
                d.innerHTML = bodyHtml; document.body.appendChild(d);
                const rg = document.createRange(); rg.selectNodeContents(d); const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(rg);
                ok = document.execCommand('copy'); sel.removeAllRanges(); d.remove();
            } catch (e) { console.error(e); }
        }
        if (!ok) { downloadDoc('Seven Jump ' + BLOK[curB].label + ' - Kelompok A9', html); toast('Salin otomatis gagal, dokumen diunduh sebagai .doc.'); return; }
        const w = window.open('https://docs.new', '_blank');
        toast(w ? 'Isi disalin. Di Google Docs yang terbuka, tekan Tempel (Ctrl+V / tahan lalu Tempel).' : 'Isi disalin. Buka docs.new lalu Tempel.');
    }

    async function uploadDoc(name, html, path) {
        const done = busy('Membuat Google Docs di Drive...');
        let j;
        try { j = await scriptCall({ action: 'createDoc', name, path, html }, true); } finally { done(); }
        if (j && j.ok) return { url: j.url, id: j.id || docIdOf(j.url), shared: j.shared !== false };
        if (j && j.silent) return null;
        const m = (j && j.error) || 'Apps Script belum mendukung createDoc. Pasang drive-uploader.gs terbaru, jalankan fungsi authorize sekali, lalu Deploy > Kelola deployment > versi baru.';
        await askDialog('Gagal membuat Google Docs', [{ type: 'note', text: m }, { type: 'note', text: 'File .doc tetap bisa diunduh setelah ini.' }], 'Mengerti');
        return null;
    }

    function downloadDoc(name, html) {
        // penanda Word supaya terbuka sebagai dokumen (tampilan cetak), bukan halaman web
        const wordHtml = html
            .replace('<html>', '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">')
            .replace('<head>', '<head><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->');
        const fname = String(name).replace(/[\\/:*?"<>|]+/g, '-') + '.doc';
        const blob = new Blob(['\ufeff', wordHtml], { type: 'application/msword' });
        // iPhone/iPad sering menolak unduhan blob: pakai menu Bagikan (Simpan ke Berkas)
        try {
            const file = new File([blob], fname, { type: 'application/msword' });
            if (/iP(hone|ad|od)/.test(navigator.userAgent) && navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({ files: [file], title: fname }).catch(() => { });
                return;
            }
        } catch (e) { }
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fname;
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }

    async function exportDocs(ns) {
        collect();
        await autosaveNow();
        if (window.__sjxLoad) { try { await window.__sjxLoad(BLOK[curB], ns); } catch (e) { console.error(e); } }                       // simpan dulu supaya dokumen sama dengan yang tersimpan
        const b = BLOK[curB];
        const unsaved = ns.filter(n => draft[skey(b, n)]);
        if (unsaved.length && !trial && !confirm('Skenario ' + unsaved.join(', ') + ' belum tersimpan di server (mungkin ada konflik dengan versi teman). Dokumen akan memakai isi yang tampil sekarang. Lanjutkan?')) return;
        const baseName = 'Seven Jump ' + b.label + ' - Kelompok A9 - ' + (ns.length === 1 ? 'Skenario ' + ns[0] : 'Semua Skenario');
        const name = trial ? 'COBA - ' + baseName + ' - ' + isoLocal(new Date()) : baseName;   // dokumen asli bernama tetap supaya bisa diperbarui di tempat
        if (trial) {
            downloadDoc(name, docHtml(ns, false));
            toast('Mode Coba: dokumen hanya diunduh (.doc), tidak dibuat di Drive.');
            return;
        }
        if (DRIVE_UPLOAD_URL) {
            const scope = ns.length === 1 ? 'one-' + ns[0] : 'all';
            const html = docHtml(ns, true), h = hashStr(html + '|' + name);
            const old = (docs[b.key] || []).find(e => e && e.live && !e.gone && e.id && e.scope === scope);
            let res = null, renewed = false;
            if (old) {
                // dokumen untuk bagian yang sama sudah ada: perbarui di tempat, link tetap sama
                const dn = busy('Memperbarui Google Docs...');
                let j; try { j = await scriptCall({ action: 'updateDoc', id: old.id, name, html }, true); } finally { dn(); }
                if (j && j.ok) { res = { url: old.url, id: old.id, shared: true }; renewed = true; }
                else if (j && j.silent) return;
                else if (!/tidak ditemukan/i.test((j && j.error) || '')) {
                    await askDialog('Gagal memperbarui Google Docs', [{ type: 'note', text: (j && j.error) || 'gagal' }, { type: 'note', text: 'Pastikan drive-uploader.gs terbaru sudah dipasang dan di-deploy ulang (versi baru).' }], 'Mengerti');
                    return;
                }
            }
            if (!res) res = await uploadDoc(name, html, b.folder);
            if (res && res.url) {
                lastDoc = { name, url: res.url, id: res.id, shared: res.shared };
                const entry = { id: res.id || docIdOf(res.url), name, url: res.url, ns: ns.slice(), scope, live: true, by: me(), ts: Date.now(), upd: Date.now(), hash: h };
                try { await mutateDocs(b, l => [entry].concat(l.filter(e => e && !(e.id && e.id === entry.id) && !(e.live && e.scope === scope))).slice(0, 30)); }
                catch (er) { console.error(er); alert('Dokumen sudah jadi, tapi daftar dokumen belum tersimpan di server. Salin linknya dulu.'); }
                toast(renewed ? 'Google Docs diperbarui. Link tetap sama.' : 'Google Docs dibuat. Isinya akan ikut berubah otomatis.');
                render();
                const lc = document.querySelector('#sj-root .sj-link'); if (lc && lc.scrollIntoView) lc.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return;
            }
            if (confirm('Pembuatan otomatis di Drive gagal.\n\nOK = unduh file .doc\nBatal = tutup (lalu pakai tombol "Salin ke Google Docs")')) { downloadDoc(name, docHtml(ns, false)); }
            return;
        } else {
            alert('Portal belum tersambung ke Google Drive (DRIVE_UPLOAD_URL kosong). File .doc akan diunduh. Unggah ke Drive, klik kanan, lalu Buka dengan Google Dokumen.');
        }
        downloadDoc(name, docHtml(ns, false));
    }

    // ---------- Pemicu ----------
    function tick() {
        if (!currentUser) return;
        const r = ensureRoot(); if (!r) return;
        if (!booted) { booted = true; if (Object.keys(draft).length) schedule(); }   // draf lama dari perangkat ikut disimpan
        if (r.offsetParent !== null) { fetchAll(false); if (Date.now() - lastLive > 30000) liveSync(false); }   // hanya saat menu Tutorial terbuka
    }
    const prev = window.switchTab;
    window.switchTab = function (t, b) {
        const x = prev ? prev(t, b) : undefined;
        setTimeout(() => { ensureRoot(); if (t === 'tutorial') fetchAll(true); }, 0);
        return x;
    };
    document.addEventListener('visibilitychange', () => { if (document.hidden && currentUser && Object.keys(draft).length) autosaveNow(); });
    setInterval(tick, 1500);
})();

// ==========================================================================
// BAGIAN 17 - TAMPILAN KLASIK (KEDOKTERAN) + LOGIN TANPA PENGISIAN OTOMATIS BROWSER
//   Ditaruh paling akhir. Hanya mengubah tampilan dan atribut kolom login, tidak menyentuh data.
//   Arah desain: kertas perkamen, tinta cokelat tua, merah marun + emas, huruf serif,
//   sudut tegak, garis ganda seperti buku teks / ijazah. Tanpa bayangan, gradasi, dan gerak.
// ==========================================================================
(function () {
    'use strict';

    // ---------- 1) Huruf serif klasik (tanpa internet jatuh ke Georgia / Times) ----------
    if (!document.getElementById('a9-font-classic')) {
        const f = document.createElement('link'); f.id = 'a9-font-classic'; f.rel = 'stylesheet';
        f.href = 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&family=Source+Serif+4:wght@400;500;600;700&display=swap';
        document.head.appendChild(f);
    }

    // ---------- 2) Gaya klasik ----------
    const css = document.createElement('style');
    css.id = 'a9-classic';
    css.textContent = `
/* ================= Token ================= */
:root, body {
  --primary: #6b1f2a; --primary-hover: #4f151e; --primary-light: #f1e3da;
  --bg-base: #efe6d2; --bg-card: #fbf7ec;
  --text-main: #2a1f15; --text-muted: #6c5d49; --border-color: #c9b995;
  --warning: #9a6a12; --danger: #9b1c1c; --gold: #a8843a;
  --radius-sm: 2px; --radius-md: 3px; --radius-lg: 3px; --radius-xl: 4px;
  --shadow-sm: none; --shadow-lg: none; --shadow-glow: 0 0 0 2px rgba(107,31,42,.28);
  --font: 'Source Serif 4', Georgia, 'Times New Roman', serif;
  --font-head: 'Libre Baskerville', Baskerville, Georgia, 'Times New Roman', serif;
}
body.theme-dark {
  --primary: #d9b86c; --primary-hover: #ead08e; --primary-light: rgba(217,184,108,.12);
  --bg-base: #16120d; --bg-card: #201a13;
  --text-main: #efe3c8; --text-muted: #b3a384; --border-color: #4b3f2c;
  --shadow-glow: 0 0 0 2px rgba(217,184,108,.35); --gold: #d9b86c;
}
body.theme-dark .btn-primary, body.theme-dark .nav-pill.active, body.theme-dark .chip.active,
body.theme-dark .cx-btn.done, body.theme-dark .cbt-nav-btn.done, body.theme-dark .trk span.on,
body.theme-dark .sj-tabs button.on, body.theme-dark .sj-bloks button.on { color: #1a1409; }

/* ================= Dasar ================= */
html body { background: var(--bg-base) !important; background-image: none !important; color: var(--text-main); font-family: var(--font); letter-spacing: 0; }
h1, h2, h3, h4, h5, .card-title, .greeting h3 { font-family: var(--font-head); font-weight: 700; letter-spacing: .005em; }
.tab-content { animation: none !important; }
.btn:active, .fv-folder:hover, .lb-card:hover { transform: none !important; box-shadow: none !important; }
::selection { background: var(--primary-light); color: var(--text-main); }

/* ================= Kartu: bingkai garis ganda ================= */
.card { background: var(--bg-card); border: 1px solid var(--border-color); box-shadow: inset 0 0 0 3px var(--bg-card), inset 0 0 0 4px var(--border-color) !important; }
.card-header { border-bottom: 3px double var(--border-color); }
.card-title { font-size: clamp(17px, 2vw, 20px); }
.greeting { background: var(--primary); color: #f7efdc; border: 1px solid var(--gold); box-shadow: inset 0 0 0 3px var(--primary), inset 0 0 0 4px var(--gold) !important; }
.greeting h3 { font-weight: 700; }
body.theme-dark .greeting { background: #2b2216; color: #efe3c8; }
.upd-card { background: var(--primary-light); border: 1px solid var(--gold); }

/* ================= Tombol: kapital kecil, sudut tegak ================= */
.btn { border-radius: 2px; text-transform: uppercase; letter-spacing: .07em; font-size: 12.5px; font-weight: 700; }
.btn-sm { font-size: 11.5px; }
.btn-primary { background: var(--primary); border-color: var(--primary); color: #f7efdc; }
.btn-primary:hover { background: var(--primary-hover); border-color: var(--primary-hover); }
.btn-outline { background: transparent; border: 1px solid var(--text-main); color: var(--text-main); }
.btn-outline:hover { background: var(--primary-light); border-color: var(--primary); color: var(--primary); }
.btn-danger { background: #f6e3df; color: var(--danger); border-color: #d9a9a1; }
body.theme-dark .btn-danger { background: rgba(155,28,28,.2); color: #f0b4ab; border-color: rgba(155,28,28,.5); }
:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; border-radius: 2px; }

/* ================= Input ================= */
.modern-input { background: #fffdf5; border: 1px solid var(--border-color); border-bottom: 2px solid var(--text-muted); border-radius: 2px; }
body.theme-dark .modern-input { background: #17120c; border-bottom-color: var(--border-color); }
.modern-input:hover { border-color: var(--text-muted); }
.modern-input:focus { border-color: var(--primary); border-bottom-color: var(--primary); box-shadow: var(--shadow-glow); }
.form-group label { font-family: var(--font-head); font-size: 12.5px; font-weight: 700; letter-spacing: .03em; }
.admin-form-box { border: 1px dashed var(--text-muted); }

/* ================= Navigasi ================= */
.simple-nav { border-bottom: 3px double var(--border-color); }
.nav-pill, .sn-chip, .chip, .jd-tag, .dl-badge, .osce-chip, .sm-badge, #cbt-timer, .cbt-timer,
.sj-tabs button, .sj-hints button { border-radius: 2px !important; }
.nav-pill.active { background: var(--primary); color: #f7efdc; }
#sn-sub .sn-chip.active { background: var(--bg-card); color: var(--primary); border: 1px solid var(--primary); }
@media (max-width: 768px) {
  #sn-main { border-top: 3px double var(--border-color); box-shadow: none; }
  #sn-main .nav-pill.active { background: var(--primary-light); color: var(--primary); }
}

/* ================= Tabel: gaya daftar buku teks ================= */
.table-responsive { border: 1px solid var(--text-main); }
.modern-table th { font-family: var(--font-head); font-size: 11.5px; text-transform: uppercase; letter-spacing: .08em; color: var(--text-main); background: var(--primary-light); border-bottom: 2px solid var(--text-main); }
.modern-table td { border-bottom: 1px dotted var(--border-color); }
.modern-table tbody tr:nth-child(even) td { background: rgba(120,90,40,.05); }
.modern-table tr:hover td { background: var(--primary-light); }

/* ================= Komponen lain ================= */
.jd.today { background: var(--primary-light); border: 1px solid var(--primary); }
.fv-folder, .fv-file, .lb-card, .osce-st, .osce-stase, .cbtx-side, .prog-stat { border-radius: 3px; }
.option-label { border-radius: 3px; border-width: 1px; }
.cx-btn { border-radius: 2px; }
.toast { border-radius: 2px; border: 1px solid var(--gold); }
.modal-content, #preview-modal > div, #admin-settings-modal > div { border-radius: 4px; }
#to-top { border-radius: 2px; box-shadow: none; }
.sj-card, .sj-q, .sj-img, .sj-link, .sj-trial, .sm-card { border-radius: 3px; }
.sj-bloks button { border-radius: 3px; }
.sj-bloks button.on { background: var(--primary); color: #f7efdc; }
.sj-bloks .sj-bl { font-family: var(--font-head); }
::-webkit-scrollbar-thumb { border-radius: 2px; }

/* ================= Halaman masuk ================= */
#login-page { background: var(--bg-base) !important; background-image: none !important; }
#login-page .card, #login-page .login-card, #login-page .login-box, #login-page .login-container {
  max-width: 520px; margin-left: auto; margin-right: auto; background: var(--bg-card);
  border: 1px solid var(--text-main); padding: 36px clamp(22px, 5vw, 44px);
  box-shadow: inset 0 0 0 5px var(--bg-card), inset 0 0 0 6px var(--border-color) !important;
}
#login-page h1, #login-page h2, #login-page h3 { color: var(--primary) !important; text-align: center; text-transform: uppercase; letter-spacing: .08em; }
#login-page h1::after, #login-page h2::after, #login-page h3::after { content: ''; display: block; width: 96px; margin: 12px auto 0; border-top: 3px double var(--gold); }
#login-page p { text-align: center; color: var(--text-muted); }
#login-page .btn, #login-page button { width: 100%; }
.a9-secret { -webkit-text-security: disc; text-security: disc; }
`;
    document.head.appendChild(css);

    // ---------- 3) Warna bilah alamat HP ----------
    try {
        const m = document.querySelector('meta[name="theme-color"]');
        if (m) m.content = document.body.classList.contains('theme-dark') ? '#16120d' : '#efe6d2';
    } catch (e) { }

    // ---------- 4) Login: jangan memicu isi otomatis / kunci sandi browser ----------
    //   Penyebab popup kunci (Safari/Chrome): kolom "kode admin" bertipe password di formulir yang sama
    //   membuat browser menganggap ini formulir login, lalu menawarkan akun tersimpan.
    //   Solusi: tidak ada kolom password, nama kolom acak, dan semua tanda "jangan isi otomatis".
    const textSecuritySupported = (() => { try { return !!(window.CSS && CSS.supports && (CSS.supports('-webkit-text-security', 'disc') || CSS.supports('text-security', 'disc'))); } catch (e) { return false; } })();
    function hardenLogin() {
        const nim = document.getElementById('login-nim-input');
        const adm = document.getElementById('login-admin-code');
        const role = document.getElementById('login-role');
        if (!nim && !adm) return;
        const rnd = () => 'a9f_' + Math.random().toString(36).slice(2, 10);
        [nim, adm, role].forEach(el => {
            if (!el || el.dataset.a9Hard) return;
            el.dataset.a9Hard = '1';
            el.setAttribute('autocomplete', 'off');
            el.setAttribute('name', rnd());
            el.setAttribute('data-lpignore', 'true');      // LastPass
            el.setAttribute('data-1p-ignore', 'true');     // 1Password
            el.setAttribute('data-bwignore', 'true');      // Bitwarden
            el.setAttribute('data-form-type', 'other');    // Dashlane
            if (el.tagName === 'INPUT') {
                el.setAttribute('autocapitalize', 'off');
                el.setAttribute('autocorrect', 'off');
                el.setAttribute('spellcheck', 'false');
            }
        });
        if (nim) nim.setAttribute('inputmode', 'numeric');
        // kode admin: tampil titik-titik lewat CSS, bukan type=password (di browser yang mendukung)
        if (adm && adm.type === 'password' && textSecuritySupported) { adm.type = 'text'; adm.classList.add('a9-secret'); }
        const form = (nim || adm).closest('form');
        if (form) { form.setAttribute('autocomplete', 'off'); form.setAttribute('novalidate', ''); }
        // ikon topi wisuda -> simbol medis (tongkat Asklepios), sesuai tema klasik
        const page = document.getElementById('login-page');
        if (page) {
            const w = document.createTreeWalker(page, NodeFilter.SHOW_TEXT);
            let n; while ((n = w.nextNode())) { if (n.nodeValue.indexOf('\ud83c\udf93') >= 0) n.nodeValue = n.nodeValue.replace(/\ud83c\udf93/g, '\u2695\ufe0e'); }
        }
    }
    hardenLogin();
    window.addEventListener('DOMContentLoaded', hardenLogin);
    setTimeout(hardenLogin, 300);
})();

// ==========================================================================
// BAGIAN 18 - TAMPILAN LEMBUT (ramah mata) + PEMILIH TEMA
//   Ditaruh paling akhir. Menggantikan gaya klasik Bagian 17: sudut membulat, tanpa bingkai ganda,
//   tanpa huruf kapital berjarak, warna redup (bukan hitam/putih murni, bukan blok warna pekat).
//   Tema: Embun, Kapas, Langit (terang) dan Senja, Malam (gelap), atau Otomatis mengikuti perangkat.
//   Pilihan tema hanya tersimpan di perangkat ini (localStorage "a9_theme2").
// ==========================================================================
(function () {
    'use strict';

    // ---------- 1) Huruf bulat yang nyaman dibaca (tanpa internet jatuh ke huruf sistem) ----------
    if (!document.getElementById('a9-font-soft')) {
        const f = document.createElement('link'); f.id = 'a9-font-soft'; f.rel = 'stylesheet';
        f.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&display=swap';
        document.head.appendChild(f);
    }

    // ---------- 2) Daftar tema ----------
    const THEMES = [
        { id: 'embun', nama: 'Embun', ket: 'Hijau sage, terang', dark: false, bg: '#edf1ed', sw: ['#f8faf7', '#447a6c'] },
        { id: 'kapas', nama: 'Kapas', ket: 'Krem hangat, terang', dark: false, bg: '#f4efe8', sw: ['#fcfaf6', '#a9644b'] },
        { id: 'langit', nama: 'Langit', ket: 'Biru keabuan, terang', dark: false, bg: '#eceff5', sw: ['#f8f9fc', '#4a6fa5'] },
        { id: 'senja', nama: 'Senja', ket: 'Abu hangat, gelap', dark: true, bg: '#1f2124', sw: ['#282b30', '#8dbfae'] },
        { id: 'malam', nama: 'Malam', ket: 'Biru lembut, gelap', dark: true, bg: '#1b2230', sw: ['#232c3d', '#8fb0e0'] }
    ];

    const css = document.createElement('style');
    css.id = 'a9-soft';
    css.textContent = `
/* ================= Token umum ================= */
html body.a9soft {
  --radius-sm: 10px; --radius-md: 14px; --radius-lg: 18px; --radius-xl: 22px;
  --font: 'Nunito', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --font-head: 'Nunito', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
/* ================= Warna per tema ================= */
html body.a9soft.th-embun { --bg-base:#edf1ed; --bg-card:#f8faf7; --text-main:#2d3a35; --text-muted:#5f7068; --border-color:#d6dfd8; --border-strong:#b7c5bc;
  --primary:#447a6c; --primary-hover:#3a6b5e; --on-primary:#ffffff; --primary-light:#e0ede7; --primary-text:#2f6254; --primary-bd:#a9cbbd; --input-bg:#f1f5f1;
  --ring:rgba(68,122,108,.25); --danger:#a8403a; --danger-bg:#f7e6e3; --danger-bd:#e2bab5; --warning:#8f6310; --gold:#8f6310;
  --shadow-sm:0 1px 2px rgba(45,58,53,.06); --shadow-lg:0 14px 34px -16px rgba(45,58,53,.22); --shadow-glow:0 0 0 3px rgba(68,122,108,.25); }
html body.a9soft.th-kapas { --bg-base:#f4efe8; --bg-card:#fcfaf6; --text-main:#3b342d; --text-muted:#6f6558; --border-color:#e2d9cb; --border-strong:#c9bba7;
  --primary:#a9644b; --primary-hover:#925340; --on-primary:#ffffff; --primary-light:#f3e4dc; --primary-text:#8a4a34; --primary-bd:#dcb5a5; --input-bg:#f7f3ec;
  --ring:rgba(169,100,75,.25); --danger:#a8403a; --danger-bg:#f8e6e1; --danger-bd:#e3bbb4; --warning:#8f6310; --gold:#8f6310;
  --shadow-sm:0 1px 2px rgba(59,52,45,.07); --shadow-lg:0 14px 34px -16px rgba(59,52,45,.24); --shadow-glow:0 0 0 3px rgba(169,100,75,.25); }
html body.a9soft.th-langit { --bg-base:#eceff5; --bg-card:#f8f9fc; --text-main:#2b3445; --text-muted:#5d6a82; --border-color:#d7dde8; --border-strong:#b8c2d4;
  --primary:#4a6fa5; --primary-hover:#3d5d8c; --on-primary:#ffffff; --primary-light:#e0e8f4; --primary-text:#34527f; --primary-bd:#adc0dc; --input-bg:#f1f4f9;
  --ring:rgba(74,111,165,.25); --danger:#a8403a; --danger-bg:#f7e6e3; --danger-bd:#e2bab5; --warning:#8f6310; --gold:#8f6310;
  --shadow-sm:0 1px 2px rgba(43,52,69,.06); --shadow-lg:0 14px 34px -16px rgba(43,52,69,.22); --shadow-glow:0 0 0 3px rgba(74,111,165,.25); }
html body.a9soft.th-senja { --bg-base:#1f2124; --bg-card:#282b30; --text-main:#d9dce1; --text-muted:#9aa1ab; --border-color:#3a3e45; --border-strong:#50555e;
  --primary:#8dbfae; --primary-hover:#a3cebf; --on-primary:#15241f; --primary-light:rgba(141,191,174,.14); --primary-text:#a9d3c4; --primary-bd:rgba(141,191,174,.4); --input-bg:#212428;
  --ring:rgba(141,191,174,.3); --danger:#e58a82; --danger-bg:rgba(229,138,130,.12); --danger-bd:rgba(229,138,130,.35); --warning:#e0b45a; --gold:#e0b45a;
  --shadow-sm:0 1px 2px rgba(0,0,0,.25); --shadow-lg:0 16px 36px -14px rgba(0,0,0,.5); --shadow-glow:0 0 0 3px rgba(141,191,174,.3); }
html body.a9soft.th-malam { --bg-base:#1b2230; --bg-card:#232c3d; --text-main:#d6dce8; --text-muted:#97a3b9; --border-color:#35405a; --border-strong:#4b5876;
  --primary:#8fb0e0; --primary-hover:#a8c3ea; --on-primary:#10203a; --primary-light:rgba(143,176,224,.14); --primary-text:#b3caec; --primary-bd:rgba(143,176,224,.4); --input-bg:#1e2636;
  --ring:rgba(143,176,224,.3); --danger:#e58a82; --danger-bg:rgba(229,138,130,.12); --danger-bd:rgba(229,138,130,.35); --warning:#e0b45a; --gold:#e0b45a;
  --shadow-sm:0 1px 2px rgba(0,0,0,.25); --shadow-lg:0 16px 36px -14px rgba(0,0,0,.5); --shadow-glow:0 0 0 3px rgba(143,176,224,.3); }

/* ================= Dasar ================= */
html body.a9soft { background: var(--bg-base) !important; background-image: none !important; color: var(--text-main); font-family: var(--font); letter-spacing: 0; line-height: 1.6; -webkit-font-smoothing: antialiased; }
html body.a9soft h1, html body.a9soft h2, html body.a9soft h3, html body.a9soft h4, html body.a9soft h5,
html body.a9soft .card-title, html body.a9soft .greeting h3 { font-family: var(--font-head); font-weight: 700; letter-spacing: 0; }
html body.a9soft ::selection { background: var(--primary-light); color: var(--text-main); }

/* ================= Kartu: tanpa bingkai ganda, bayangan tipis ================= */
html body.a9soft .card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-xl); box-shadow: var(--shadow-sm) !important; }
html body.a9soft .card-header { border-bottom: 1px solid var(--border-color); }
html body.a9soft .greeting { background: var(--primary-light); color: var(--text-main); border: 1px solid var(--border-color); border-radius: var(--radius-xl); box-shadow: none !important; }
html body.a9soft .upd-card { background: var(--primary-light); border: 1px solid var(--border-color); border-radius: var(--radius-lg); }

/* ================= Tombol: huruf biasa, sudut bulat ================= */
html body.a9soft .btn { border-radius: 12px; text-transform: none; letter-spacing: 0; font-size: 14px; font-weight: 600; box-shadow: none; }
html body.a9soft .btn-sm { font-size: 13px; }
html body.a9soft .btn-primary, html body.a9soft .chip.active, html body.a9soft .cx-btn.done, html body.a9soft .cbt-nav-btn.done,
html body.a9soft .trk span.on, html body.a9soft .sj-tabs button.on, html body.a9soft .sj-bloks button.on { background: var(--primary); border-color: var(--primary); color: var(--on-primary); }
html body.a9soft .btn-primary:hover { background: var(--primary-hover); border-color: var(--primary-hover); }
html body.a9soft .btn-outline { background: transparent; border: 1px solid var(--border-strong); color: var(--text-main); }
html body.a9soft .btn-outline:hover { background: var(--primary-light); border-color: var(--primary-bd); color: var(--text-main); }
html body.a9soft .btn-danger { background: var(--danger-bg); color: var(--danger); border-color: var(--danger-bd); }
html body.a9soft :focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; border-radius: 10px; }

/* ================= Isian ================= */
html body.a9soft .modern-input { background: var(--input-bg); color: var(--text-main); border: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color); border-radius: 12px; }
html body.a9soft .modern-input:hover { border-color: var(--border-strong); }
html body.a9soft .modern-input:focus { border-color: var(--primary); border-bottom-color: var(--primary); box-shadow: 0 0 0 3px var(--ring); }
html body.a9soft .form-group label { font-family: var(--font); font-size: 13.5px; font-weight: 600; letter-spacing: 0; }
html body.a9soft .admin-form-box { border: 1px dashed var(--border-strong); border-radius: 14px; }

/* ================= Navigasi ================= */
html body.a9soft .simple-nav { border-bottom: 1px solid var(--border-color); }
html body.a9soft .nav-pill, html body.a9soft .sn-chip, html body.a9soft .chip, html body.a9soft .jd-tag, html body.a9soft .dl-badge,
html body.a9soft .osce-chip, html body.a9soft .sm-badge { border-radius: 999px !important; letter-spacing: 0; text-transform: none; }
html body.a9soft #cbt-timer, html body.a9soft .cbt-timer, html body.a9soft .sj-tabs button, html body.a9soft .sj-hints button { border-radius: 12px !important; }
html body.a9soft .nav-pill.active { background: var(--primary-light); color: var(--primary-text); box-shadow: inset 0 0 0 1px var(--primary-bd); }
html body.a9soft #sn-sub .sn-chip.active { background: var(--primary-light); color: var(--primary-text); border: 1px solid var(--primary-bd); }
@media (max-width: 768px) {
  html body.a9soft #sn-main { border-top: 1px solid var(--border-color); box-shadow: none; }
  html body.a9soft #sn-main .nav-pill.active { background: var(--primary-light); color: var(--primary-text); box-shadow: none; }
}

/* ================= Tabel ================= */
html body.a9soft .table-responsive { border: 1px solid var(--border-color); border-radius: 14px; }
html body.a9soft .modern-table th { font-family: var(--font); font-size: 13px; text-transform: none; letter-spacing: 0; font-weight: 700; color: var(--text-muted); background: var(--primary-light); border-bottom: 1px solid var(--border-color); }
html body.a9soft .modern-table td { border-bottom: 1px solid var(--border-color); }
html body.a9soft .modern-table tbody tr:nth-child(even) td { background: transparent; }
html body.a9soft .modern-table tr:hover td { background: var(--primary-light); }

/* ================= Komponen lain ================= */
html body.a9soft .jd.today { background: var(--primary-light); border: 1px solid var(--primary-bd); }
html body.a9soft .fv-folder, html body.a9soft .fv-file, html body.a9soft .lb-card, html body.a9soft .osce-st, html body.a9soft .osce-stase,
html body.a9soft .cbtx-side, html body.a9soft .prog-stat, html body.a9soft .sj-card, html body.a9soft .sj-q, html body.a9soft .sj-img,
html body.a9soft .sj-link, html body.a9soft .sj-trial, html body.a9soft .sm-card, html body.a9soft .sj-bloks button { border-radius: 16px; }
html body.a9soft .option-label { border-radius: 14px; border-width: 1px; }
html body.a9soft .cx-btn { border-radius: 10px; }
html body.a9soft .toast { border-radius: 14px; border: 1px solid var(--border-color); box-shadow: var(--shadow-lg); }
html body.a9soft .modal-content, html body.a9soft #preview-modal > div, html body.a9soft #admin-settings-modal > div, html body.a9soft .fd-modal { border-radius: 20px; box-shadow: var(--shadow-lg); }
html body.a9soft #to-top { border-radius: 14px; box-shadow: var(--shadow-lg); }
html body.a9soft ::-webkit-scrollbar-thumb { border-radius: 8px; }
html body.a9soft .sj-bloks .sj-bl { font-family: var(--font); }
html body.a9soft .lb-tag.mk { color: var(--on-primary); }

/* ================= Halaman masuk ================= */
html body.a9soft #login-page { background: var(--bg-base) !important; background-image: none !important; }
html body.a9soft #login-page .card, html body.a9soft #login-page .login-card, html body.a9soft #login-page .login-box, html body.a9soft #login-page .login-container {
  background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 24px; box-shadow: var(--shadow-lg) !important; }
html body.a9soft #login-page h1, html body.a9soft #login-page h2, html body.a9soft #login-page h3 { color: var(--text-main) !important; text-transform: none; letter-spacing: 0; }
html body.a9soft #login-page h1::after, html body.a9soft #login-page h2::after, html body.a9soft #login-page h3::after { border-top: 3px solid var(--primary-bd); width: 56px; border-radius: 3px; }

/* ================= Pemilih tema ================= */
.a9-thm { position: fixed; z-index: 32000; width: min(320px, calc(100vw - 20px)); background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border-color);
  border-radius: 18px; box-shadow: var(--shadow-lg); padding: 10px; font-family: var(--font); }
.a9-thm h4 { margin: 4px 8px 8px; font-size: 13px; color: var(--text-muted); font-weight: 700; }
.a9-thm button { display: flex; align-items: center; gap: 12px; width: 100%; border: 0; background: transparent; color: var(--text-main); text-align: left; padding: 9px 10px; border-radius: 12px; cursor: pointer; font: inherit; }
.a9-thm button:hover { background: var(--primary-light); }
.a9-thm button.on { background: var(--primary-light); box-shadow: inset 0 0 0 1px var(--primary-bd); }
.a9-thm .sw { flex: none; width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--border-color); position: relative; overflow: hidden; }
.a9-thm .sw i { position: absolute; right: 0; bottom: 0; width: 55%; height: 55%; border-top-left-radius: 10px; }
.a9-thm b { display: block; font-weight: 700; font-size: 14px; }
.a9-thm small { display: block; color: var(--text-muted); font-size: 12px; }
.a9-thm .ck { margin-left: auto; color: var(--primary-text); font-weight: 800; }
@media (prefers-reduced-motion: reduce) { html body.a9soft *, html body.a9soft *::before, html body.a9soft *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; } }
`;
    document.head.appendChild(css);

    // ---------- 3) Menerapkan tema ----------
    const KEY = 'a9_theme2';
    const prefersDark = () => { try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return false; } };
    function stored() {
        try {
            const v = localStorage.getItem(KEY);
            if (v === 'auto' || THEMES.some(t => t.id === v)) return v;
            const old = localStorage.getItem('a9_theme');           // pilihan lama (terang / gelap) tetap dihormati
            if (old === 'dark') return 'senja';
            if (old === 'light') return 'embun';
        } catch (e) { }
        return 'auto';
    }
    const resolve = v => THEMES.find(t => t.id === (v === 'auto' ? (prefersDark() ? 'senja' : 'embun') : v)) || THEMES[0];
    function apply(v) {
        const t = resolve(v), b = document.body;
        THEMES.forEach(x => b.classList.remove('th-' + x.id));
        b.classList.add('a9soft', 'th-' + t.id);
        b.classList.toggle('theme-dark', t.dark);                    // aturan gelap lama (Bagian 7 dst.) tetap ikut bekerja
        document.documentElement.style.colorScheme = t.dark ? 'dark' : 'light';
        let m = document.querySelector('meta[name="theme-color"]');
        if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
        m.content = t.bg;
    }
    // Pemanggil lama (terang/gelap dari pengaturan admin) tidak boleh membatalkan pilihan di perangkat ini
    window.applyTheme = function () { apply(stored()); };
    apply(stored());
    try { const mq = window.matchMedia('(prefers-color-scheme: dark)'); (mq.addEventListener ? mq.addEventListener.bind(mq, 'change') : mq.addListener.bind(mq))(() => { if (stored() === 'auto') apply('auto'); }); } catch (e) { }

    // ---------- 4) Pemilih tema (menggantikan tombol terang/gelap) ----------
    let panel = null;
    function closePicker() { if (panel) { panel.remove(); panel = null; document.removeEventListener('click', outside, true); document.removeEventListener('keydown', onKey, true); window.removeEventListener('resize', closePicker); } }
    function outside(e) { if (panel && !panel.contains(e.target) && !e.target.closest('[onclick*="toggleThemeSwitch"]')) closePicker(); }
    function onKey(e) { if (e.key === 'Escape') closePicker(); }
    function openPicker(btn) {
        if (panel) { closePicker(); return; }
        const cur = stored();
        const row = (id, nama, ket, sw) => `<button type="button" data-th="${id}" class="${cur === id ? 'on' : ''}"><span class="sw" style="background:${sw[0]}"><i style="background:${sw[1]}"></i></span><span><b>${nama}</b><small>${ket}</small></span>${cur === id ? '<span class="ck">ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“</span>' : ''}</button>`;
        panel = document.createElement('div'); panel.className = 'a9-thm'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Pilih tema');
        panel.innerHTML = '<h4>Pilih tema tampilan</h4>' + THEMES.map(t => row(t.id, t.nama, t.ket, t.sw)).join('') +
            row('auto', 'Otomatis', 'Ikut mode terang / gelap perangkat', ['#f4f6f4', '#2f3a40']);
        document.body.appendChild(panel);
        // letak: di bawah tombol, tidak keluar layar
        const r = (btn && btn.getBoundingClientRect) ? btn.getBoundingClientRect() : { right: window.innerWidth - 12, bottom: 56 };
        const w = panel.offsetWidth, left = Math.max(10, Math.min(window.innerWidth - w - 10, r.right - w));
        panel.style.left = left + 'px'; panel.style.top = Math.min(window.innerHeight - panel.offsetHeight - 10, r.bottom + 8) + 'px';
        panel.addEventListener('click', e => {
            const b = e.target.closest('[data-th]'); if (!b) return;
            try { localStorage.setItem(KEY, b.dataset.th); } catch (x) { }
            apply(b.dataset.th); closePicker();
        });
        document.addEventListener('click', outside, true);
        document.addEventListener('keydown', onKey, true);
        window.addEventListener('resize', closePicker);
    }
    window.toggleThemeSwitch = function () {
        const ev = window.event, btn = (ev && ev.currentTarget && ev.currentTarget.getBoundingClientRect) ? ev.currentTarget : document.querySelector('[onclick*="toggleThemeSwitch"]');
        openPicker(btn);
    };
})();

// ==========================================================================
// BAGIAN 17 - LONCENG NOTIFIKASI (KANAN ATAS) + PESAN KHUSUS DARI ADMIN
//   Isi lonceng: (1) semua Pengumuman (termasuk perpindahan jadwal), (2) pesan dari admin
//   yang dikirim ke semua atau ke satu mahasiswa. Disimpan di tabel portal_db, key "notif".
//   Notifikasi muncul saat portal terbuka (dicek tiap 60 detik dan saat tab dibuka lagi).
// ==========================================================================
(function () {
    const esc = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const $ = id => document.getElementById(id);
    const isAdmin = () => !!currentUser && currentUser.role === 'admin';
    const myNim = () => (currentUser && currentUser.nim) || '';
    const SKEY = () => 'a9_bell_' + (myNim() || 'admin');
    const POLL_MS = 60000;
    let ITEMS = [], seen = { ids: {}, base: 0 }, booted = false, lastCount = -1, lastPull = 0, isOpen = false, expanded = {}, pulling = false;

    // ---------- status dibaca (per perangkat) ----------
    function loadSeen() {
        try { seen = JSON.parse(localStorage.getItem(SKEY())); } catch (e) { seen = null; }
        // pengguna baru: hanya info 3 hari terakhir yang dianggap belum dibaca
        if (!seen || !seen.ids) seen = { ids: {}, base: Date.now() - 3 * 86400000 };
    }
    function saveSeen() {
        const keys = Object.keys(seen.ids);
        if (keys.length > 300) keys.slice(0, keys.length - 300).forEach(k => delete seen.ids[k]);
        try { localStorage.setItem(SKEY(), JSON.stringify(seen)); } catch (e) { }
    }
    const isNew = it => !isAdmin() && !seen.ids[it.id] && it.ts > seen.base;
    const unreadCount = () => ITEMS.filter(isNew).length;

    // ---------- pengambilan data ----------
    const parseArr = v => { if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { v = []; } } return Array.isArray(v) ? v : []; };
    async function readKey(key) {
        const r = await supabaseClient.from('portal_db').select('value').eq('key', key).maybeSingle();
        if (r.error) throw r.error;
        return r.data ? parseArr(r.data.value) : [];
    }
    async function pull() {
        if (!supabaseClient || !currentUser || pulling) return;
        pulling = true; lastPull = Date.now();
        try {
            const r = await supabaseClient.from('portal_db').select('key,value').in('key', ['pengumuman', 'notif']);
            if (r.error) throw r.error;
            const m = { pengumuman: [], notif: [] };
            (r.data || []).forEach(x => { m[x.key] = parseArr(x.value); });
            const items = [];
            m.pengumuman.forEach(p => {
                if (!p || !p.judul) return;
                const ts = Date.parse(p.tgl) || p.ts || p.id || 0;
                items.push({ id: 'p' + (p.id || ts), ts, judul: p.judul, isi: p.isi || '', kind: p.kind || 'info', src: 'p' });
            });
            m.notif.forEach(n => {
                if (!n || !n.judul) return;
                if (n.to === 'all' || n.to === myNim() || isAdmin()) items.push({ id: 'n' + n.id, ts: n.ts || n.id, judul: n.judul, isi: n.isi || '', kind: 'pesan', src: 'n', to: n.to, tab: n.tab || '', rawId: n.id });
            });
            items.sort((a, b) => b.ts - a.ts);
            ITEMS = items.slice(0, 40);
            const n = unreadCount();
            if (lastCount >= 0 && n > lastCount) {
                const first = ITEMS.find(isNew);
                const b = $('a9-bell'); if (b) { b.classList.remove('ring'); void b.offsetWidth; b.classList.add('ring'); }
                if (first) alert('\ud83d\udd14 ' + first.judul);
            }
            lastCount = n;
            updateBadge();
            if (isOpen) renderPanel();
        } catch (e) { console.error('Lonceng: gagal memuat', e); }
        finally { pulling = false; }
    }

    // ---------- tampilan ----------
    function css() {
        if ($('a9-bell-css')) return;
        const st = document.createElement('style'); st.id = 'a9-bell-css';
        st.textContent = `
.a9-bell{position:relative;flex:none;width:40px;height:40px;border-radius:50%;border:1px solid var(--border-color);background:var(--bg-card);color:var(--text-main);font-size:18px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;margin:0 6px;padding:0}
.a9-bell.fixed{position:fixed;top:12px;right:12px;z-index:950;margin:0;box-shadow:0 6px 18px -8px rgba(15,23,42,.45)}
.a9-bell .bd{position:absolute;top:-5px;right:-5px;min-width:19px;height:19px;border-radius:10px;background:#ef4444;color:#fff;font-size:11px;font-weight:800;display:none;align-items:center;justify-content:center;padding:0 5px;box-sizing:border-box}
.a9-bell.has .bd{display:flex}
.a9-bell.ring{animation:a9ring .9s ease}
@keyframes a9ring{0%,100%{transform:rotate(0)}15%{transform:rotate(16deg)}30%{transform:rotate(-14deg)}45%{transform:rotate(10deg)}60%{transform:rotate(-8deg)}75%{transform:rotate(4deg)}}
.a9-bp{position:fixed;top:60px;right:12px;width:min(92vw,390px);max-height:74vh;overflow:auto;z-index:960;background:var(--bg-card);color:var(--text-main);border:1px solid var(--border-color);border-radius:16px;box-shadow:0 22px 50px -14px rgba(15,23,42,.45);display:none}
.a9-bp.open{display:block}
.bp-h{position:sticky;top:0;background:var(--bg-card);display:flex;justify-content:space-between;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid var(--border-color)}
.bp-b{border:1px solid var(--border-color);background:var(--bg-base);color:var(--text-main);border-radius:8px;padding:5px 10px;font-size:12px;font-weight:600;cursor:pointer}
.bp-b.danger{color:#dc2626}
.bp-i{padding:12px 14px;border-bottom:1px solid var(--border-color);cursor:pointer}
.bp-i.new{background:var(--primary-light)}
.bp-t{display:flex;justify-content:space-between;align-items:center;gap:8px}
.bp-t small{color:var(--text-muted)}
.bp-dot{width:9px;height:9px;border-radius:50%;background:#ef4444;flex:none}
.bp-i b{display:block;margin:3px 0;overflow-wrap:anywhere}
.bp-body{font-size:13px;color:var(--text-muted);white-space:pre-line;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.bp-body.open{display:block;overflow:visible}
.bp-acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.bp-e{padding:22px 14px;color:var(--text-muted);text-align:center;margin:0}`;
        document.head.appendChild(st);
    }

    function visible(el) { return el && el.offsetParent !== null; }
    function findAnchor() {
        const list = document.querySelectorAll('[onclick*="handleLogout"], [onclick*="openAdminSettingsModal"]');
        for (const el of list) if (visible(el)) return el;
        return null;
    }
    function mountBell() {
        if (!currentUser) return;
        css();
        let b = $('a9-bell');
        const anchor = findAnchor();
        if (!b) {
            b = document.createElement('button'); b.id = 'a9-bell'; b.type = 'button'; b.className = 'a9-bell';
            b.setAttribute('aria-label', 'Notifikasi'); b.title = 'Notifikasi';
            b.innerHTML = '\ud83d\udd14<span class="bd"></span>';
            b.addEventListener('click', e => { e.stopPropagation(); togglePanel(); });
            const p = document.createElement('div'); p.id = 'a9-bp'; p.className = 'a9-bp'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Daftar notifikasi');
            p.addEventListener('click', onPanelClick);
            document.body.appendChild(p);
            document.addEventListener('click', e => { if (isOpen && !p.contains(e.target) && !b.contains(e.target)) togglePanel(false); });
            document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen) togglePanel(false); });
            if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(b, anchor); else { b.classList.add('fixed'); document.body.appendChild(b); }
            updateBadge();
        } else if (b.classList.contains('fixed') && anchor && anchor.parentNode) {
            b.classList.remove('fixed'); anchor.parentNode.insertBefore(b, anchor);   // pindah ke sebelah tombol header kalau sudah tampil
        }
    }
    function updateBadge() {
        const b = $('a9-bell'); if (!b) return;
        const n = unreadCount();
        b.classList.toggle('has', n > 0);
        b.querySelector('.bd').textContent = n > 99 ? '99+' : String(n);
        b.title = n ? n + ' notifikasi baru' : 'Notifikasi';
    }
    function togglePanel(force) {
        isOpen = typeof force === 'boolean' ? force : !isOpen;
        const p = $('a9-bp'); if (!p) return;
        p.classList.toggle('open', isOpen);
        if (isOpen) { renderPanel(); pull(); }
    }
    const rel = ts => {
        const s = Math.max(0, (Date.now() - ts) / 1000);
        if (s < 60) return 'baru saja';
        if (s < 3600) return Math.floor(s / 60) + ' mnt lalu';
        if (s < 86400) return Math.floor(s / 3600) + ' jam lalu';
        if (s < 7 * 86400) return Math.floor(s / 86400) + ' hari lalu';
        return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    };
    function renderPanel() {
        const p = $('a9-bp'); if (!p) return;
        const head = `<div class="bp-h"><strong>\ud83d\udd14 Notifikasi</strong><span>${isAdmin() ? '<button type="button" class="bp-b" data-bx="compose">\u2709\ufe0f Kirim pesan</button>' : (unreadCount() ? '<button type="button" class="bp-b" data-bx="readall">Tandai dibaca</button>' : '')}</span></div>`;
        const tagOf = it => it.kind === 'pesan' ? '\u2709\ufe0f Pesan admin' : ((typeof ANN_TAG !== 'undefined' && ANN_TAG[it.kind]) || '\ud83d\udce2 Pengumuman');
        p.innerHTML = head + (ITEMS.length ? ITEMS.map(it => {
            const open = !!expanded[it.id], nw = isNew(it);
            const khusus = it.to && it.to !== 'all' ? ' \u00b7 khusus ' + esc(allowedUsers[it.to] || it.to) : '';
            const acts = open ? `<div class="bp-acts">${it.src === 'p' ? '<button type="button" class="bp-b" data-bx="go">Lihat di Pengumuman</button>' : (it.tab ? '<button type="button" class="bp-b" data-bx="go">Buka menu</button>' : '')}${isAdmin() && it.src === 'n' ? '<button type="button" class="bp-b danger" data-bx="del">Hapus pesan</button>' : ''}</div>` : '';
            return `<div class="bp-i${nw ? ' new' : ''}" data-id="${esc(it.id)}"><div class="bp-t"><small>${tagOf(it)} \u00b7 ${rel(it.ts)}${khusus}</small>${nw ? '<i class="bp-dot"></i>' : ''}</div><b>${esc(it.judul)}</b><div class="bp-body${open ? ' open' : ''}">${esc(it.isi)}</div>${acts}</div>`;
        }).join('') : '<p class="bp-e">Belum ada notifikasi.</p>');
    }
    function markSeen(id) { seen.ids[id] = 1; saveSeen(); updateBadge(); }
    function go(it) {
        togglePanel(false);
        const tab = it.src === 'p' ? 'home' : it.tab;
        if (tab && typeof window.switchTab === 'function') {
            window.switchTab(tab, null);
            if (it.src === 'p') setTimeout(() => { const el = $('pengumuman-list'); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 250);
        }
    }
    async function onPanelClick(e) {
        const bx = e.target.closest('[data-bx]'), row = e.target.closest('.bp-i');
        const it = row ? ITEMS.find(x => x.id === row.dataset.id) : null;
        if (bx) {
            e.stopPropagation();
            const a = bx.dataset.bx;
            if (a === 'compose') { await compose(); return; }
            if (a === 'readall') { ITEMS.forEach(x => { seen.ids[x.id] = 1; }); saveSeen(); updateBadge(); renderPanel(); return; }
            if (a === 'go' && it) { markSeen(it.id); go(it); return; }
            if (a === 'del' && it) { await removeMsg(it); return; }
            return;
        }
        if (it) { expanded[it.id] = !expanded[it.id]; markSeen(it.id); renderPanel(); }
    }

    // ---------- admin: kirim & hapus pesan ----------
    async function compose() {
        const users = Object.keys(allowedUsers).map(nim => ({ v: nim, t: allowedUsers[nim] }));
        const r = await askDialog('Kirim pesan / update ke mahasiswa', [
            { type: 'note', text: 'Pesan muncul di lonceng kanan atas. Pengumuman biasa otomatis ikut muncul di lonceng, jadi tidak perlu dikirim dua kali.' },
            { id: 'judul', label: 'Judul', placeholder: 'Contoh: Kuis dimajukan besok' },
            { id: 'isi', type: 'textarea', label: 'Isi pesan' },
            { id: 'to', type: 'select', label: 'Kirim ke', value: 'all', options: [{ v: 'all', t: 'Semua mahasiswa A9' }].concat(users) },
            { id: 'tab', type: 'select', label: 'Tombol "Buka menu" mengarah ke', value: '', options: [{ v: '', t: '(tidak ada)' }, { v: 'home', t: 'Beranda' }, { v: 'jadwal', t: 'Jadwal' }, { v: 'tugas', t: 'Tugas' }, { v: 'materi', t: 'Materi' }, { v: 'tutorial', t: 'Tutorial' }, { v: 'cbt', t: 'Simulasi CBT' }] }
        ], 'Kirim');
        if (!r) return;
        if (!r.judul.trim() || !r.isi.trim()) { alert('Judul dan isi pesan wajib diisi.'); return; }
        if (!supabaseClient) { alert('Server belum terhubung.'); return; }
        const done = busy('Mengirim pesan...');
        try {
            const cur = await readKey('notif');
            const now = Date.now();
            cur.unshift({ id: now, ts: now, judul: r.judul.trim(), isi: r.isi.trim(), to: r.to || 'all', tab: r.tab || '', by: (currentUser && currentUser.name) || 'Admin' });
            const w = await supabaseClient.from('portal_db').upsert({ key: 'notif', value: cur.slice(0, 150) }, { onConflict: 'key' });
            if (w.error) throw w.error;
            alert('Pesan terkirim' + (r.to && r.to !== 'all' ? ' ke ' + (allowedUsers[r.to] || r.to) : ' ke semua mahasiswa') + '.');
            await pull();
        } catch (err) { console.error(err); alert('Gagal mengirim pesan. Cek koneksi lalu coba lagi.'); }
        finally { done(); }
    }
    async function removeMsg(it) {
        if (!confirm('Hapus pesan "' + it.judul + '"?')) return;
        const done = busy('Menghapus...');
        try {
            const cur = await readKey('notif');
            const w = await supabaseClient.from('portal_db').upsert({ key: 'notif', value: cur.filter(x => x.id !== it.rawId) }, { onConflict: 'key' });
            if (w.error) throw w.error;
            await pull();
        } catch (err) { console.error(err); alert('Gagal menghapus pesan.'); }
        finally { done(); }
    }

    // ---------- pemicu ----------
    setInterval(() => {
        if (!currentUser) return;
        if (!booted) { booted = true; loadSeen(); mountBell(); pull(); return; }
        mountBell();
        if (!document.hidden && Date.now() - lastPull > POLL_MS) pull();
    }, 1500);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && booted) pull(); });
})();

// ==========================================================================
// BAGIAN 18 - TUTORIAL: PERTANYAAN BELUM TERJAWAB + NOTULEN (VOICE TYPING)
//   Muncul di bawah form Seven Jump pada menu Tutorial, per blok dan per skenario.
//   Data disimpan per item (bukan satu teks besar), jadi isian teman tidak saling menimpa:
//     tutorial_pq_<blok>_<no>  = daftar pertanyaan   | tutorial_nt_<blok>_<no> = daftar notulen
//   Mode Coba: semua tersimpan di perangkat ini saja. Isinya ikut masuk ke dokumen Word/Google Docs.
// ==========================================================================
(function () {
    const $ = id => document.getElementById(id);
    const esc = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const isAdmin = () => !!currentUser && currentUser.role === 'admin';
    const me = () => (currentUser && (currentUser.name || currentUser.nim)) || 'Anonim';
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const CACHE = {};
    let sig = '', view = 'pq', scope = 'scn', flt = 'open', lastFetch = 0;
    let rec = null, recWant = false, recSync = null;

    const ctx = () => (typeof window.__sjxCtx === 'function' ? window.__sjxCtx() : null);
    const kOf = (kind, b, n) => 'tutorial_' + kind + '_' + (b.legacy ? '' : b.key + '_') + n;
    const LS = k => 'a9_sjx_' + k;
    const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const stamp = x => x.upd || x.ts || 0;
    const fmt = ts => ts ? new Date(ts).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
    const linkify = s => esc(s).replace(/https?:\/\/[^\s<]+/g, u => '<a href="' + u + '" target="_blank" rel="noopener">' + u + '</a>');
    const parseArr = v => { if (typeof v === 'string') { try { v = JSON.parse(v); } catch (e) { v = null; } } return Array.isArray(v) ? v : []; };

    // ---------- penyimpanan ----------
    async function rGet(k, trial) {
        if (trial) { try { return parseArr(localStorage.getItem(LS(k))); } catch (e) { return []; } }
        if (!supabaseClient) return CACHE[k] || [];
        const r = await supabaseClient.from('portal_db').select('value').eq('key', k).maybeSingle();
        if (r.error) throw r.error;
        return r.data ? parseArr(r.data.value) : [];
    }
    async function rPut(k, list, trial) {
        if (trial) { localStorage.setItem(LS(k), JSON.stringify(list)); return; }
        if (!supabaseClient) throw new Error('Server belum terhubung');
        const w = await supabaseClient.from('portal_db').upsert({ key: k, value: list }, { onConflict: 'key' });
        if (w.error) throw w.error;
    }
    // baca versi terbaru -> ubah -> simpan (item teman tidak ikut tertimpa)
    async function change(k, trial, fn) {
        const list = await rGet(k, trial);
        fn(list);
        const cut = Date.now() - 14 * 86400000;
        const out = list.filter(x => !(x.del && stamp(x) < cut));
        await rPut(k, out, trial);
        CACHE[k] = out;
        try { if (!trial && window.__sjLiveKick) window.__sjLiveKick(); } catch (e) { }
        return out;
    }
    window.__sjxLoad = async function (b, ns) {
        const c = ctx(), trial = !!(c && c.trial);
        const jobs = [];
        ns.forEach(n => ['pq', 'nt'].forEach(kind => {
            const k = kOf(kind, b, n);
            jobs.push(rGet(k, trial).then(v => { CACHE[k] = v; }).catch(e => console.error('Tutorial: gagal memuat', k, e)));
        }));
        await Promise.all(jobs);
    };

    // ---------- untuk dokumen Word / Google Docs ----------
    window.__sjxDoc = function (b, n, L) {
        L = typeof L === 'function' ? L : (() => '');
        const hd = t => `<p style="margin:12pt 0 4pt 0">${L()} ${t}</p>`;
        const pq = (CACHE[kOf('pq', b, n)] || []).filter(x => !x.del).sort((p, q) => (p.ts || 0) - (q.ts || 0));
        const nt = (CACHE[kOf('nt', b, n)] || []).filter(x => !x.del).sort((p, q) => (p.ts || 0) - (q.ts || 0));
        let h = '';
        if (pq.length) {
            const open = pq.filter(x => x.status !== 'done'), done = pq.filter(x => x.status === 'done');
            h += hd('Pertanyaan belum terjawab') + (open.length
                ? '<ol style="margin-top:0">' + open.map(x => `<li>${x.by ? esc(x.by) + ' - ' : ''}${esc(x.q)}</li>`).join('') + '</ol>'
                : '<p style="margin:0 0 6pt 36pt"><em>(semua pertanyaan sudah terjawab)</em></p>');
            if (done.length) h += '<p style="margin:6pt 0 2pt 0">Sudah terjawab:</p><ol style="margin-top:0">' + done.map(x => `<li>${x.by ? esc(x.by) + ' - ' : ''}${esc(x.q)}<ul style="margin-top:0"><li>${x.aby ? esc(x.aby) + ' - ' : ''}${linkify(x.a)}${x.src ? ` <em>(Sumber: ${linkify(x.src)})</em>` : ''}</li></ul></li>`).join('') + '</ol>';
        }
        if (nt.length) {
            h += hd('Notulen diskusi') + nt.map(x => `<p style="margin:6pt 0 2pt 0"><b>Pertemuan ${esc(x.sesi || 1)}</b> \u2013 ${esc(fmt(x.ts))}</p><p style="margin:0">${esc(x.text).replace(/\n/g, '<br>')}</p><p style="font-size:9pt;color:#666;margin:0 0 6pt 0"><em>Dicatat oleh ${esc(x.by)}</em></p>`).join('');
        }
        return h;
    };

    // ---------- suara -> teks ----------
    const UA = navigator.userAgent || '';
    const IS_ANDROID = /Android/i.test(UA);
    const IN_APP = /FBAN|FBAV|Instagram|Line\/|MicroMessenger|WhatsApp|Telegram|; wv\)/i.test(UA);
    let recTimer = null, recFast = 0, recAt = 0;
    const say = t => { const s = $('sjx-vs'); if (s) s.textContent = t; };
    function stopVoice() {
        recWant = false; clearTimeout(recTimer); recTimer = null;
        if (rec) { try { rec.onstart = null; rec.onend = null; rec.onresult = null; rec.onerror = null; rec.stop(); } catch (e) { } rec = null; }
        if (recSync) { recSync.el.removeEventListener('input', recSync.fn); recSync = null; }
        document.querySelectorAll('.sjx-mic.rec').forEach(b => b.classList.remove('rec'));
        say('');
    }
    const addText = (a, t) => {
        t = t.replace(/\s*\b(?:baris baru|paragraf baru)\b\s*/gi, '\n');
        if (!a) return t.replace(/^\s+/, '');
        if (/^\n/.test(t) || /\n$/.test(a)) return a + t.replace(/^ +/, '');
        return a.replace(/ +$/, '') + ' ' + t.replace(/^\s+/, '');
    };
    function startVoice(el, btn) {
        if (btn.classList.contains('rec')) { stopVoice(); return; }
        if (!SR) {
            alert(IN_APP
                ? 'Voice typing tidak jalan di dalam aplikasi lain (WhatsApp/Instagram/dll). Buka portal lewat Chrome atau Safari.'
                : 'Browser ini belum mendukung voice typing (Firefox belum bisa). Pakai Chrome, Edge, atau Safari terbaru. Alternatif: tekan ikon mikrofon di keyboard HP.');
            return;
        }
        if (window.isSecureContext === false) { alert('Voice typing hanya jalan di alamat https://. Buka portal lewat alamat https.'); return; }
        stopVoice();
        let committed = el.value;
        const r = new SR(); rec = r; recWant = true; recFast = 0; recAt = Date.now();
        r.lang = 'id-ID';
        r.continuous = !IS_ANDROID;          // Chrome Android sering menggandakan teks bila continuous; kita sambung otomatis saja
        r.interimResults = true; r.maxAlternatives = 1;
        r.onstart = () => { recAt = Date.now(); };
        r.onresult = ev => {
            recFast = 0;
            let interim = '';
            for (let i = ev.resultIndex; i < ev.results.length; i++) {
                const res = ev.results[i], t = res[0].transcript;
                if (res.isFinal) committed = addText(committed, t); else interim += t;
            }
            el.value = interim ? addText(committed, interim) : committed;
            el.scrollTop = el.scrollHeight;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            say('\ud83d\udd34 Merekam... bicara saja. Ucapkan "baris baru" untuk pindah baris. Ketuk mikrofon lagi untuk berhenti.');
        };
        r.onerror = ev => {
            const e = ev && ev.error;
            if (e === 'not-allowed' || e === 'service-not-allowed') { stopVoice(); alert('Izin mikrofon ditolak. Aktifkan lewat ikon gembok di address bar (Pengaturan situs > Mikrofon > Izinkan), lalu coba lagi. Di iPhone: Pengaturan > Safari > Mikrofon, dan pastikan Dikte aktif.'); }
            else if (e === 'network') { stopVoice(); alert('Voice typing butuh internet. Cek koneksi lalu coba lagi.'); }
            else if (e === 'audio-capture') { stopVoice(); alert('Mikrofon tidak terdeteksi atau sedang dipakai aplikasi lain.'); }
            else if (e === 'language-not-supported') { if (r.lang === 'id-ID') r.lang = 'id'; else { stopVoice(); alert('Bahasa Indonesia belum didukung di perangkat ini.'); } }
            else if (e === 'no-speech') say('\ud83d\udd34 Belum ada suara terdengar. Dekatkan mikrofon dan bicara lagi.');
            else if (e && e !== 'aborted') { stopVoice(); alert('Voice typing gagal (' + e + '). Coba muat ulang halaman atau pakai ikon mikrofon di keyboard.'); }
        };
        r.onend = () => {   // browser menghentikan sendiri saat hening: sambung lagi selama masih aktif
            if (!(recWant && rec === r)) { if (rec === r) stopVoice(); return; }
            recFast = (Date.now() - recAt < 800) ? recFast + 1 : 0;
            if (recFast >= 5) { stopVoice(); alert('Mikrofon terus berhenti sendiri. Cek izin mikrofon dan koneksi internet, lalu coba lagi.'); return; }
            recTimer = setTimeout(() => { if (recWant && rec === r) { recAt = Date.now(); try { r.start(); } catch (e) { stopVoice(); } } }, 250);
        };
        try { r.start(); } catch (e) { rec = null; recWant = false; alert('Mikrofon tidak bisa dimulai. Coba lagi.'); return; }
        const fn = ev => { if (ev.isTrusted) committed = el.value; };   // hanya ketikan manual (bukan event dari voice typing)
        el.addEventListener('input', fn); recSync = { el, fn };
        btn.classList.add('rec');
        say('\ud83d\udd34 Menyiapkan mikrofon... izinkan mikrofon bila diminta, lalu bicara. Ketuk mikrofon lagi untuk berhenti.');
    }

    // ---------- tampilan ----------
    function css() {
        if ($('sjx-css')) return;
        const st = document.createElement('style'); st.id = 'sjx-css';
        st.textContent = `
.sjx{margin-top:16px}
.sjx-head{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
.sjx-head h3{margin:0}
.sjx-tabs,.sjx-chips{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
.sjx-tabs button,.sjx-chips button{border:1px solid var(--border-color);background:var(--bg-card);color:var(--text-main);border-radius:999px;padding:7px 14px;font-weight:600;cursor:pointer;font-size:13px}
.sjx-tabs button.on,.sjx-chips button.on{background:var(--primary);color:#fff;border-color:var(--primary)}
.sjx-row{display:flex;gap:8px;align-items:center}
.sjx-row input{flex:1;min-width:0}
.sjx-mic{width:44px;height:44px;flex:none;border-radius:50%;border:1px solid var(--border-color);background:var(--bg-card);font-size:20px;cursor:pointer;padding:0}
.sjx-mic.rec{background:#ef4444;border-color:#ef4444;animation:sjxp 1.2s infinite}
@keyframes sjxp{50%{box-shadow:0 0 0 8px rgba(239,68,68,.22)}}
.sjx-item{background:var(--bg-base);border:1px solid var(--border-color);border-left:4px solid #f59e0b;border-radius:12px;padding:12px 14px;margin-top:10px}
.sjx-item.done{border-left-color:#10b981}
.sjx-q{font-weight:700;overflow-wrap:anywhere;white-space:pre-line}
.sjx-a{margin-top:8px;font-size:14px;overflow-wrap:anywhere}
.sjx-acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.sjx-acts button{border:1px solid var(--border-color);background:var(--bg-card);color:var(--text-main);border-radius:8px;padding:5px 10px;font-size:12px;cursor:pointer}
.sjx-acts .danger{color:#dc2626}
.sjx textarea{width:100%;min-height:130px;resize:vertical;box-sizing:border-box}
.sjx-vs{font-size:13px;color:#dc2626;min-height:18px;margin:6px 0}
.sjx-note{white-space:pre-wrap;overflow-wrap:anywhere;margin:8px 0;font-size:14px;line-height:1.55}
.sjx-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px}
.sjx small,.sjx .hint{color:var(--text-muted)}`;
        document.head.appendChild(st);
    }
    const draftKey = c => 'a9_sjx_draft_' + kOf('nt', c.b, c.n) + (c.trial ? '_t' : '');

    function shell() {
        const box = $('sjx-box'), c = ctx(); if (!box || !c) return;
        const s = c.b.skenario[c.n - 1];
        let draft = ''; try { draft = localStorage.getItem(draftKey(c)) || ''; } catch (e) { }
        const pqPane = `
<div class="sjx-row"><input id="sjx-q" class="modern-input" maxlength="400" placeholder="Tulis pertanyaan yang belum terjawab..." autocomplete="off"><button type="button" class="sjx-mic" data-xa="mic" data-t="sjx-q" title="Isi dengan suara" aria-label="Isi dengan suara">\ud83c\udf99\ufe0f</button><button type="button" class="btn btn-primary btn-sm" data-xa="addq">Tambah</button></div>
<div class="sjx-chips" id="sjx-chips"></div><div id="sjx-list"></div>`;
        const ntPane = `
<p class="hint">Tekan mikrofon lalu bicara, teks muncul sendiri. Boleh dikoreksi sebelum disimpan. Setiap notulen tersimpan sebagai catatan terpisah, jadi tidak menimpa catatan teman.</p>
<div class="sjx-row" style="margin-bottom:8px"><select id="sjx-sesi" class="modern-input" style="max-width:190px"><option value="1">Pertemuan 1</option><option value="2">Pertemuan 2</option></select><button type="button" class="sjx-mic" data-xa="mic" data-t="sjx-nt" title="Rekam suara jadi teks" aria-label="Rekam suara jadi teks">\ud83c\udf99\ufe0f</button></div>
<textarea id="sjx-nt" class="modern-input" placeholder="Notulen diskusi tutorial...">${esc(draft)}</textarea>
<div class="sjx-vs" id="sjx-vs"></div>
<div class="sjx-bar"><button type="button" class="btn btn-primary btn-sm" data-xa="addnt">Simpan notulen</button><button type="button" class="btn btn-outline btn-sm" data-xa="clearnt">Kosongkan</button><button type="button" class="btn btn-outline btn-sm" data-xa="copyall">Salin semua notulen</button></div>
<div id="sjx-nlist"></div>`;
        box.innerHTML = `
<div class="sjx-head"><h3>\u2753 Pertanyaan &amp; \ud83c\udf99\ufe0f Notulen</h3><small>${esc(c.b.label)} \u00b7 Skenario ${s.n}${c.trial ? ' \u00b7 Mode Coba (tersimpan di perangkat ini)' : ''}</small></div>
<div class="sjx-tabs"><button type="button" data-xv="pq" class="${view === 'pq' ? 'on' : ''}" id="sjx-tab-pq">Pertanyaan belum terjawab</button><button type="button" data-xv="nt" class="${view === 'nt' ? 'on' : ''}" id="sjx-tab-nt">Notulen</button></div>
${view === 'pq' ? pqPane : ntPane}`;
        lists();
    }
    function itemsPq(c) {
        const ns = scope === 'blok' ? c.b.skenario.map(s => s.n) : [c.n], out = [];
        ns.forEach(n => (CACHE[kOf('pq', c.b, n)] || []).filter(x => !x.del).forEach(it => out.push({ it, n })));
        return out.sort((a, b) => (a.it.ts || 0) - (b.it.ts || 0));
    }
    function lists() {
        const box = $('sjx-box'), c = ctx(); if (!box || !c) return;
        const pq = itemsPq(c), openN = pq.filter(x => x.it.status !== 'done').length, doneN = pq.length - openN;
        const nt = (CACHE[kOf('nt', c.b, c.n)] || []).filter(x => !x.del).sort((a, b) => (b.ts || 0) - (a.ts || 0));
        const tp = $('sjx-tab-pq'); if (tp) tp.textContent = 'Pertanyaan belum terjawab' + (openN ? ' (' + openN + ')' : '');
        const tn = $('sjx-tab-nt'); if (tn) tn.textContent = 'Notulen' + (nt.length ? ' (' + nt.length + ')' : '');
        const ch = $('sjx-chips');
        if (ch) ch.innerHTML = `<button type="button" data-xs="scn" class="${scope === 'scn' ? 'on' : ''}">Skenario ini</button><button type="button" data-xs="blok" class="${scope === 'blok' ? 'on' : ''}">Seluruh ${esc(c.b.label)}</button>` +
            `<span style="flex-basis:100%;height:0"></span><button type="button" data-xf="open" class="${flt === 'open' ? 'on' : ''}">Belum terjawab (${openN})</button><button type="button" data-xf="done" class="${flt === 'done' ? 'on' : ''}">Terjawab (${doneN})</button><button type="button" data-xf="all" class="${flt === 'all' ? 'on' : ''}">Semua (${pq.length})</button>`;
        const pl = $('sjx-list');
        if (pl) {
            const shown = pq.filter(x => flt === 'all' || (flt === 'done') === (x.it.status === 'done'));
            pl.innerHTML = shown.length ? shown.map(x => {
                const it = x.it, done = it.status === 'done', mine = it.by === me() || isAdmin();
                return `<div class="sjx-item${done ? ' done' : ''}" data-n="${x.n}" data-id="${esc(it.id)}"><div class="sjx-q">${esc(it.q)}</div><small>${scope === 'blok' ? 'Skenario ' + x.n + ' \u00b7 ' : ''}${esc(it.by)} \u00b7 ${esc(fmt(it.ts))}</small>` +
                    (done ? `<div class="sjx-a"><b>Jawaban:</b> ${linkify(it.a)}${it.aby ? ` <small>(${esc(it.aby)})</small>` : ''}${it.src ? `<br><small>Sumber: ${linkify(it.src)}</small>` : ''}</div>` : '') +
                    `<div class="sjx-acts"><button type="button" data-xa="ans">${done ? 'Ubah jawaban' : '\u270d\ufe0f Jawab'}</button>${done ? '<button type="button" data-xa="reopen">Buka lagi</button>' : ''}${mine ? '<button type="button" class="danger" data-xa="delq">Hapus</button>' : ''}</div></div>`;
            }).join('') : `<p class="hint" style="margin-top:12px">${flt === 'open' ? (pq.length ? 'Tidak ada pertanyaan yang tersisa. Semua sudah terjawab \ud83c\udf89' : 'Belum ada pertanyaan. Catat hal yang belum terjawab saat diskusi, lalu bawa ke pertemuan berikutnya.') : 'Tidak ada data untuk filter ini.'}</p>`;
        }
        const nl = $('sjx-nlist');
        if (nl) nl.innerHTML = nt.length ? nt.map(x => {
            const mine = x.by === me() || isAdmin();
            return `<div class="sjx-item done" data-id="${esc(x.id)}"><small>Pertemuan ${esc(x.sesi || 1)} \u00b7 ${esc(x.by)} \u00b7 ${esc(fmt(x.ts))}</small><div class="sjx-note">${esc(x.text)}</div><div class="sjx-acts"><button type="button" data-xa="copynt">Salin</button>${mine ? '<button type="button" data-xa="editnt">Ubah</button><button type="button" class="danger" data-xa="delnt">Hapus</button>' : ''}</div></div>`;
        }).join('') : '<p class="hint" style="margin-top:12px">Belum ada notulen tersimpan untuk skenario ini.</p>';
    }

    async function refresh() {
        const c = ctx(); if (!c) return;
        lastFetch = Date.now();
        await window.__sjxLoad(c.b, scope === 'blok' ? c.b.skenario.map(s => s.n) : [c.n]);
        lists();
    }
    async function copyText(t) {
        try { await navigator.clipboard.writeText(t); return true; } catch (e) { }
        try { const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch (e) { return false; }
    }
    const fail = e => { console.error(e); alert('Gagal menyimpan. Cek koneksi lalu coba lagi.'); };

    function wire(box) {
        box.addEventListener('input', e => {
            if (e.target.id === 'sjx-nt') { const c = ctx(); if (c) { try { localStorage.setItem(draftKey(c), e.target.value); } catch (x) { } } }
        });
        box.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'sjx-q') { e.preventDefault(); const b = box.querySelector('[data-xa="addq"]'); if (b) b.click(); } });
        box.addEventListener('click', async e => {
            const t = e.target.closest('button'); if (!t) return;
            const c = ctx(); if (!c) return;
            const trial = !!c.trial;
            if (t.dataset.xv) { if (view !== t.dataset.xv) { stopVoice(); view = t.dataset.xv; shell(); refresh(); } return; }
            if (t.dataset.xs) { scope = t.dataset.xs; lists(); refresh(); return; }
            if (t.dataset.xf) { flt = t.dataset.xf; lists(); return; }
            const a = t.dataset.xa; if (!a) return;
            const row = t.closest('[data-id]'), id = row ? row.dataset.id : null, n = row && row.dataset.n ? +row.dataset.n : c.n;
            const pk = kOf('pq', c.b, n), nk = kOf('nt', c.b, c.n);
            try {
                if (a === 'mic') { const el = $(t.dataset.t); if (el) startVoice(el, t); return; }
                if (a === 'addq') {
                    const inp = $('sjx-q'), q = inp.value.trim(); if (!q) { alert('Tulis pertanyaannya dulu.'); return; }
                    stopVoice(); inp.value = '';
                    await change(kOf('pq', c.b, c.n), trial, l => l.push({ id: newId(), q, by: me(), ts: Date.now(), status: 'open' }));
                    flt = 'open'; lists(); return;
                }
                if (a === 'ans' && id) {
                    const cur = (CACHE[pk] || []).find(x => x.id === id); if (!cur) return;
                    const r = await askDialog('Jawab pertanyaan', [{ type: 'note', text: cur.q }, { id: 'a', type: 'textarea', label: 'Jawaban', value: cur.a || '' }, { id: 's', label: 'Sumber / referensi (opsional, boleh tempel link)', value: cur.src || '' }], 'Simpan jawaban');
                    if (!r) return;
                    if (!r.a.trim()) { alert('Jawaban masih kosong.'); return; }
                    await change(pk, trial, l => { const x = l.find(i => i.id === id); if (x) { x.status = 'done'; x.a = r.a.trim(); x.src = r.s.trim(); x.aby = me(); x.upd = Date.now(); } });
                    lists(); return;
                }
                if (a === 'reopen' && id) { await change(pk, trial, l => { const x = l.find(i => i.id === id); if (x) { x.status = 'open'; x.upd = Date.now(); } }); lists(); return; }
                if (a === 'delq' && id) {
                    if (!confirm('Hapus pertanyaan ini?')) return;
                    await change(pk, trial, l => { const x = l.find(i => i.id === id); if (x) { x.del = true; x.upd = Date.now(); } }); lists(); return;
                }
                if (a === 'addnt') {
                    const ta = $('sjx-nt'), text = ta.value.trim(); if (!text) { alert('Notulen masih kosong.'); return; }
                    stopVoice();
                    const sesi = +$('sjx-sesi').value || 1;
                    await change(nk, trial, l => l.push({ id: newId(), by: me(), ts: Date.now(), sesi, text }));
                    ta.value = ''; try { localStorage.removeItem(draftKey(c)); } catch (x) { }
                    alert('Notulen tersimpan.'); lists(); return;
                }
                if (a === 'clearnt') { stopVoice(); const ta = $('sjx-nt'); if (ta && (!ta.value.trim() || confirm('Kosongkan isian notulen?'))) { ta.value = ''; try { localStorage.removeItem(draftKey(c)); } catch (x) { } } return; }
                if (a === 'copyall') {
                    const all = (CACHE[nk] || []).filter(x => !x.del).sort((p, q) => (p.ts || 0) - (q.ts || 0));
                    if (!all.length) { alert('Belum ada notulen untuk disalin.'); return; }
                    const txt = all.map(x => 'Pertemuan ' + (x.sesi || 1) + ' - ' + fmt(x.ts) + ' (' + x.by + ')\n' + x.text).join('\n\n');
                    alert(await copyText(txt) ? 'Semua notulen disalin.' : 'Gagal menyalin. Salin manual dari daftar.'); return;
                }
                if (a === 'copynt' && id) { const x = (CACHE[nk] || []).find(i => i.id === id); if (x) alert(await copyText(x.text) ? 'Notulen disalin.' : 'Gagal menyalin.'); return; }
                if (a === 'editnt' && id) {
                    const x = (CACHE[nk] || []).find(i => i.id === id); if (!x) return;
                    const r = await askDialog('Ubah notulen', [{ id: 't', type: 'textarea', label: 'Isi notulen', value: x.text }], 'Simpan');
                    if (!r || !r.t.trim()) return;
                    await change(nk, trial, l => { const y = l.find(i => i.id === id); if (y) { y.text = r.t.trim(); y.upd = Date.now(); } }); lists(); return;
                }
                if (a === 'delnt' && id) {
                    if (!confirm('Hapus notulen ini?')) return;
                    await change(nk, trial, l => { const y = l.find(i => i.id === id); if (y) { y.del = true; y.upd = Date.now(); } }); lists(); return;
                }
            } catch (err) { fail(err); }
        });
    }

    // ---------- pemicu: pasang kotak di bawah form Seven Jump ----------
    function tick() {
        if (!currentUser) return;
        const root = $('sj-root');
        if (!root || root.offsetParent === null) { if (rec) stopVoice(); return; }
        const c = ctx(); if (!c || !c.b || !c.b.skenario[c.n - 1]) return;
        const s = c.k + '|' + (c.trial ? 't' : 'r');
        let box = $('sjx-box');
        if (!box || !box.isConnected || box.parentNode !== root.parentNode) {
            if (!box) { box = document.createElement('div'); box.id = 'sjx-box'; box.className = 'card sjx'; css(); wire(box); sig = ''; }
            root.insertAdjacentElement('afterend', box);
        }
        if (sig !== s) { sig = s; stopVoice(); shell(); refresh(); }
        else if (!document.hidden && Date.now() - lastFetch > 25000) refresh();
    }
    setInterval(tick, 1200);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopVoice(); });
    window.addEventListener('pagehide', stopVoice);
})();

// ==========================================================================
// BAGIAN 18 - TUTORIAL: LAYAR PENUH + UKURAN TULISAN (BESAR/KECIL) UNTUK DITAMPILKAN DI TV
//   Bilah kecil di atas menu Tutorial: Layar penuh, A-, A+, dan reset. Ukuran diingat di perangkat ini.
//   Papan tombol: + / = perbesar, - perkecil, 0 reset (tidak aktif saat sedang mengetik).
//   Hanya menambah tampilan, tidak menyentuh data.
// ==========================================================================
(function () {
    'use strict';
    const KEY = 'a9_tut_zoom', MIN = 0.7, MAX = 2.6, STEP = 0.1;
    let zoom = 1, full = false;
    try { const v = parseFloat(localStorage.getItem(KEY)); if (v >= MIN && v <= MAX) zoom = v; } catch (e) { }

    const host = () => { const l = document.getElementById('tutorial-list'); return l ? l.closest('.tab-content') : null; };
    const visible = h => !!h && h.offsetParent !== null || (!!h && h.classList.contains('tut-full') && getComputedStyle(h).display !== 'none');

    if (!document.getElementById('tut-view-css')) {
        const st = document.createElement('style'); st.id = 'tut-view-css';
        st.textContent = `
#tut-bar { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin:0 0 12px; padding:6px 0; }
#tut-bar .tb-z { min-width:58px; text-align:center; font-weight:700; }
#tut-bar .tb-hint { font-size:12px; color:var(--text-muted); }
#tut-bar button { white-space:nowrap; }
body.tut-full-on { overflow:hidden !important; }
.tab-content.tut-full { position:fixed !important; inset:0 !important; z-index:15000 !important; overflow:auto !important; -webkit-overflow-scrolling:touch;
  background:var(--bg-base,#fff) !important; padding:10px 22px 48px !important; margin:0 !important; width:auto !important; max-width:none !important;
  animation:none !important; transform:none !important; border-radius:0 !important; }
.tab-content.tut-full > * { max-width:1600px; margin-left:auto; margin-right:auto; }
.tab-content.tut-full #tut-bar { position:sticky; top:0; z-index:5; background:var(--bg-base,#fff); border-bottom:1px solid var(--border-color); }`;
        document.head.appendChild(st);
    }

    function apply() {
        const h = host(); if (!h) return;
        h.classList.toggle('tut-full', full);
        document.body.classList.toggle('tut-full-on', full);
        ['sj-root', 'sjx-box', 'tutorial-list'].forEach(id => {
            const el = document.getElementById(id);
            if (el && el.style.zoom !== String(zoom)) el.style.zoom = String(zoom);
        });
        const z = document.getElementById('tut-zoom-val'); if (z) z.textContent = Math.round(zoom * 100) + '%';
        const f = document.getElementById('tut-full-btn'); if (f) f.textContent = full ? '\u2715 Keluar layar penuh' : '\u26f6 Layar penuh';
    }

    function setZoom(v) {
        zoom = Math.min(MAX, Math.max(MIN, Math.round(v * 10) / 10));
        try { localStorage.setItem(KEY, String(zoom)); } catch (e) { }
        apply();
    }

    function enter() {
        full = true; apply();
        const de = document.documentElement;
        try {
            const p = de.requestFullscreen ? de.requestFullscreen({ navigationUI: 'hide' }) : (de.webkitRequestFullscreen ? de.webkitRequestFullscreen() : null);
            if (p && p.catch) p.catch(() => { });          // iPhone/iPad: tanpa layar penuh peramban, tampilan tetap memenuhi layar
        } catch (e) { }
    }
    function leave() {
        full = false; apply();
        if (document.fullscreenElement || document.webkitFullscreenElement) {
            try { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } catch (e) { }
        }
    }

    function ensureBar() {
        const h = host(); if (!h) return;
        let bar = document.getElementById('tut-bar');
        if (!bar) {
            bar = document.createElement('div'); bar.id = 'tut-bar';
            bar.innerHTML = '<button type="button" class="btn btn-primary btn-sm" id="tut-full-btn"></button>' +
                '<button type="button" class="btn btn-outline btn-sm" data-tz="-" title="Perkecil tulisan" aria-label="Perkecil tulisan">A\u2212</button>' +
                '<span class="tb-z" id="tut-zoom-val"></span>' +
                '<button type="button" class="btn btn-outline btn-sm" data-tz="+" title="Perbesar tulisan" aria-label="Perbesar tulisan">A+</button>' +
                '<button type="button" class="btn btn-outline btn-sm" data-tz="0" title="Kembali ke ukuran normal">Reset</button>' +
                '<span class="tb-hint">Papan tombol: + perbesar, \u2212 perkecil, 0 reset</span>';
            bar.addEventListener('click', e => {
                const b = e.target.closest('button'); if (!b) return;
                if (b.id === 'tut-full-btn') { full ? leave() : enter(); return; }
                if (b.dataset.tz === '+') setZoom(zoom + STEP);
                else if (b.dataset.tz === '-') setZoom(zoom - STEP);
                else if (b.dataset.tz === '0') setZoom(1);
            });
        }
        if (h.firstChild !== bar) h.insertBefore(bar, h.firstChild);
        apply();
    }

    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && full) { full = false; apply(); } });
    document.addEventListener('webkitfullscreenchange', () => { if (!document.webkitFullscreenElement && full) { full = false; apply(); } });

    document.addEventListener('keydown', e => {
        const h = host(); if (!h) return;
        if (e.key === 'Escape' && full && !document.fullscreenElement && !document.webkitFullscreenElement && !document.querySelector('.fd-ov')) { leave(); return; }
        if (e.ctrlKey || e.metaKey || e.altKey || !visible(h)) return;
        const t = e.target, tag = t && t.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
        if (document.querySelector('.fd-ov')) return;
        if (e.key === '+' || e.key === '=') { setZoom(zoom + STEP); e.preventDefault(); }
        else if (e.key === '-' || e.key === '_') { setZoom(zoom - STEP); e.preventDefault(); }
        else if (e.key === '0') { setZoom(1); e.preventDefault(); }
    });

    // Pindah ke menu lain saat layar penuh: keluar otomatis. Elemen yang dibuat ulang ikut diberi ukuran yang sama.
    setInterval(() => {
        const h = host(); if (!h) return;
        if (full && h.offsetParent === null && getComputedStyle(h).position !== 'fixed') { leave(); return; }
        if (full && getComputedStyle(h).display === 'none') { leave(); return; }
        ensureBar();
    }, 1000);
})();
