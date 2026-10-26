// ==========================================================================
// PORTAL AKADEMIK A9 — tambahan-v3.js
// Taruh di PALING AKHIR (setelah file gabungan script.js + tambahan-v2.js),
// bisa ditempel di bawah file yang sama atau dimuat sebagai <script> terpisah.
//
// Isi:
//   1) Sistem desain baru (warna, huruf, kartu, tombol, tabel, CBT, OSCE, mode gelap)
//   2) Perbaikan performa: tidak ngelag saat mengetik / mengklik
//   3) Perbaikan bug yang bisa ditimpa tanpa mengubah file inti
// ==========================================================================

// --------------------------------------------------------------------------
// 0) Perlu dipasang SEBELUM DOMContentLoaded (membungkus fungsi inti)
// --------------------------------------------------------------------------
(function () {
    'use strict';
    const $ = id => document.getElementById(id);

    // ---- Performa: sessionStorage.setItem dipanggil di SETIAP gerakan mouse & ketukan tombol
    // (setupInactivityTracker). Operasi ini sinkron dan jadi penyebab utama ngelag saat mengetik.
    // Cukup tulis maksimal 1x per 15 detik; batas sesi 30 menit tetap akurat.
    (function throttleActivityWrite() {
        const raw = Storage.prototype.setItem;
        let last = 0;
        Storage.prototype.setItem = function (k, v) {
            if (k === 'portal_last_active' && this === window.sessionStorage) {
                const n = Date.now();
                if (n - last < 15000) return;
                last = n;
            }
            return raw.call(this, k, v);
        };
    })();

    // ---- Performa: tunda (debounce) semua kolom pencarian agar daftar tidak digambar ulang tiap huruf
    (function debounceSearch() {
        const SEL = '#jd-search, #pa-search, .fv-bar input, .search-box, #prog-filter';
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
    })();

    // ---- Bug: login bisa lolos sebelum data cloud (maintenance, kode admin) selesai dimuat
    const fetchOrig = window.fetchDatabaseFromCloud;
    if (typeof fetchOrig === 'function') {
        window.fetchDatabaseFromCloud = function () {
            const p = fetchOrig.apply(this, arguments);
            window.__dbReady = p;
            return p;
        };
    }
    const loginOrig = window.handleLogin;
    if (typeof loginOrig === 'function') {
        window.handleLogin = async function () {
            const wait = new Promise(r => setTimeout(r, 4000));
            try { await Promise.race([window.__dbReady || Promise.resolve(), wait]); } catch (e) { }
            return loginOrig.apply(this, arguments);
        };
    }

    // ---- Bug: mahasiswa menekan tema = menimpa pengaturan global (maintenance, kode admin).
    // Tema sekarang disimpan per perangkat saja.
    const themeOrig = window.applyTheme;
    function setMeta(dark) {
        let m = document.querySelector('meta[name="theme-color"]');
        if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); }
        m.content = dark ? '#0b1220' : '#f4f6f9';
    }
    window.applyTheme = function (t) {
        let mine = null;
        try { mine = localStorage.getItem('a9_theme'); } catch (e) { }
        const use = mine || t || 'light';
        themeOrig(use); setMeta(use === 'dark');
    };
    window.toggleThemeSwitch = function () {
        const next = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
        try { localStorage.setItem('a9_theme', next); } catch (e) { }
        themeOrig(next); setMeta(next === 'dark');
    };

    // ---- Bug: gagal simpan ke server tidak diberi tahu
    window.saveCategoryData = async function (categoryKey) {
        window.renderAll();
        if (!supabaseClient) { alert('Server belum terhubung. Perubahan belum tersimpan.'); return false; }
        try {
            let payload = dbData[categoryKey];
            if (categoryKey === 'config') payload = { maintenance: dbData.maintenance, theme: dbData.theme, globalAnnouncement: dbData.globalAnnouncement, adminCode: dbData.adminCode };
            else if (categoryKey === 'jadwal') payload = dbData.jadwalCustom;
            const { error } = await supabaseClient.from('portal_db').upsert({ key: categoryKey, value: payload }, { onConflict: 'key' });
            if (error) throw error;
            return true;
        } catch (err) {
            console.error('Gagal simpan ' + categoryKey + ':', err);
            alert('Gagal menyimpan ke server. Cek koneksi lalu coba lagi.');
            return false;
        }
    };
    window.deleteItem = async function (category, index) {
        if (!confirm('Hapus data ini secara permanen?')) return;
        if (!Array.isArray(dbData[category])) return;
        dbData[category].splice(index, 1);
        if (await window.saveCategoryData(category)) alert('Data dihapus.');
    };

    // ---- Bug: upload gagal bila nama file memuat karakter khusus
    window.uploadFileToSupabaseStorage = async function (fileInputId) {
        const input = $(fileInputId);
        if (!input || !input.files || !input.files.length) return null;
        const file = input.files[0];
        if (file.size > 50 * 1024 * 1024) { alert('File melebihi 50 MB. Gunakan link Google Drive.'); return null; }
        if (!supabaseClient) { alert('Server belum terhubung.'); return null; }
        try {
            const path = 'uploads/' + Date.now() + '_' + file.name.replace(/[^\w.\-]+/g, '_');
            const { error } = await supabaseClient.storage.from('portal-files').upload(path, file);
            if (error) throw error;
            return supabaseClient.storage.from('portal-files').getPublicUrl(path).data.publicUrl;
        } catch (err) { console.error(err); alert('Upload gagal. Coba lagi atau pakai link Google Drive.'); return null; }
    };

    // ---- Bug: label deadline "Hari ini" / "1 hari lagi" salah hitung
    function fixBadges() {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        document.querySelectorAll('#tugas-table-body td[data-label="Deadline"]').forEach(td => {
            td.querySelectorAll('.dl-badge').forEach(b => b.remove());
            const m = td.textContent.trim().match(/^\d{4}-\d{2}-\d{2}$/); if (!m) return;
            const days = Math.round((new Date(m[0] + 'T00:00:00') - today) / 86400000);
            const b = document.createElement('span');
            if (days < 0) { b.className = 'dl-badge dl-late'; b.textContent = 'Terlewat'; }
            else if (days === 0) { b.className = 'dl-badge dl-soon'; b.textContent = 'Hari ini'; }
            else { b.className = 'dl-badge ' + (days <= 3 ? 'dl-soon' : 'dl-ok'); b.textContent = days + ' hari lagi'; }
            td.appendChild(b);
        });
    }
    const renderOrig = window.renderAll;
    window.renderAll = function () {
        renderOrig.apply(this, arguments);
        try { fixBadges(); } catch (e) { console.error(e); }
    };

    // ---- Bug: sesi berakhir, pesan hilang sebelum terbaca
    const logoutOrig = window.handleLogout;
    window.handleLogout = function () {
        if (window.__loggingOut) return;
        window.__loggingOut = true;
        setTimeout(() => logoutOrig.apply(this, arguments), 1200);
    };

    // ---- Info koneksi
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
