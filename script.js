// ==========================================================================
// PENGATUR VERSI - PORTAL AKADEMIK A9
// File ini yang dimuat index.html (namanya tetap script.js, jadi index.html tidak perlu diubah).
// Isi portal yang sebenarnya ada di folder versi/. Satu versi = satu file, dan file lama TIDAK diubah lagi.
//
// CARA RILIS VERSI BARU
//   1) Simpan script baru sebagai versi/script-X.Y.Z.js (jangan menimpa file versi lama).
//   2) Di dalam script baru itu, ubah APP_VERSION dan APP_BUILD supaya sama dengan baris di bawah.
//   3) Tambahkan SATU baris baru di PALING ATAS daftar SEMUA di bawah ini. Selesai.
//   4) Kalau versinya sudah lebih dari MAKS_VERSI, yang paling bawah otomatis keluar dari daftar pilihan.
//      Hapus file-nya dari folder versi/ (daftar file yang boleh dihapus ada di Setelan > Tentang web, khusus admin).
//
// CARA KERJA UNTUK PENGGUNA
//   - Otomatis: pengguna menjalankan versi paling atas (terbaru).
//   - Kalau versi terbaru error saat dimuat, halaman dimuat ulang sekali dan memakai versi sebelumnya.
//     Versi yang error ditandai bermasalah selama 6 jam di perangkat itu, lalu dicoba lagi.
//   - Pengguna juga bisa memilih versi sendiri di Setelan > Tentang web (atau lewat tautan ?versi=2.2.0).
//     Pilihan manual tersimpan di perangkat. Kembali ke terbaru: pilih "Otomatis" atau buka ?versi=otomatis.
//   - Selama memakai versi lama, muncul lencana kecil "Ganti" supaya pengguna bisa kembali ke versi terbaru.
// ==========================================================================
(function () {
    'use strict';

    // ---------- DAFTAR VERSI: terbaru di paling atas ----------
    var SEMUA = [
        { v: '2.7.1', tgl: '2026-11-23', file: 'versi/script-2_7_1.js', catatan: 'Versi Penyempurnaan.' },
        { v: '2.7.0', tgl: '2026-11-23', file: 'versi/script-2.7.0.js', catatan: 'Urutan lebih mulus, split Tutorial tidak berkedip, pengumuman menuju bagiannya dan hilang otomatis kalau tujuannya sudah tidak ada.' },
        { v: '2.6.0', tgl: '2026-11-22', file: 'versi/script-2.6.0.js', catatan: 'Soal isian berupa daftar ikut diimpor; semua istilah di daftar jadi kunci jawaban.' },
        { v: '2.5.0', tgl: '2026-11-22', file: 'versi/script-2.5.0.js', catatan: 'Impor soal dari file JSON bank soal (opsi berbentuk label/teks, file campuran jadi dua paket).' },
        { v: '2.4.0', tgl: '2026-11-21', file: 'versi/script-2.4.0.js', catatan: 'Jawaban isian yang mirip (salah ketik sedikit) dibenarkan dengan peringatan.' },
        { v: '2.3.0', tgl: '2026-11-21', file: 'versi/script-2.3.0.js', catatan: 'Kategori hanya menyebut paket soal, pengumuman paket soal baru, pilihan versi.' },
        { v: '2.2.0', tgl: '2026-11-05', file: 'versi/script-2.2.0.js', catatan: 'Versi sebelum pengatur versi.' }
    ];
    // Batas jumlah versi: yang paling bawah otomatis keluar dari daftar (tidak bisa dipilih lagi).
    // File-nya di folder versi/ tidak terhapus sendiri (hosting statis); lihat A9Versi.bisaDihapus lalu hapus manual.
    var MAKS_VERSI = 5;
    var VERSI = SEMUA.slice(0, MAKS_VERSI);
    var BISA_DIHAPUS = SEMUA.slice(MAKS_VERSI).map(function (x) { return x.file; });

    var K_PIL = 'a9_versi_pilihan', K_GAGAL = 'a9_versi_gagal', K_RL = 'a9_versi_reload';
    var GAGAL_MS = 6 * 60 * 60 * 1000;

    function lget(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function lset(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { } }
    function sget(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
    function sset(k, v) { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { } }
    function cari(v) { for (var i = 0; i < VERSI.length; i++) if (VERSI[i].v === v) return VERSI[i]; return null; }
    function peta() { try { var o = JSON.parse(lget(K_GAGAL) || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; } }
    function bermasalah(v) { var t = +peta()[v]; return !!t && Date.now() - t < GAGAL_MS; }

    // tautan ?versi=2.2.0 atau ?versi=otomatis
    var q = /[?&]versi=([\w.\-]+)/.exec(location.search || '');
    if (q) { if (q[1] === 'otomatis') { lset(K_PIL, null); lset(K_GAGAL, null); } else lset(K_PIL, q[1]); }

    var terbaru = VERSI[0];
    var pin = cari(lget(K_PIL) || '');              // versi yang dipilih pengguna (null = otomatis)
    var jalan = pin;
    if (!jalan) {
        for (var i = 0; i < VERSI.length; i++) if (!bermasalah(VERSI[i].v)) { jalan = VERSI[i]; break; }
        if (!jalan) jalan = terbaru;
    }

    // ---------- yang dipakai bagian Setelan ----------
    window.A9Versi = {
        daftar: VERSI, bisaDihapus: BISA_DIHAPUS, aktif: jalan.v, terbaru: terbaru.v, pilihan: pin ? pin.v : 'otomatis',
        opsiHtml: function () {
            var h = '<option value="otomatis"' + (pin ? '' : ' selected') + '>Otomatis (terbaru; pindah ke versi lama kalau error)</option>';
            for (var i = 0; i < VERSI.length; i++) {
                var x = VERSI[i];
                h += '<option value="' + x.v + '"' + (pin && pin.v === x.v ? ' selected' : '') + '>v' + x.v + (x === terbaru ? ' (terbaru)' : '') + ' \u00b7 ' + x.tgl + '</option>';
            }
            return h;
        },
        pilih: function (v) {
            if (v === 'otomatis' || !cari(v)) lset(K_PIL, null); else lset(K_PIL, v);
            lset(K_GAGAL, null); sset(K_RL, null);
            location.reload();
        }
    };

    // ---------- deteksi error saat memuat ----------
    var fase = 'muat', ada = false;
    window.addEventListener('error', function (e) {
        if (fase !== 'muat') return;
        var t = e && e.target;
        if (t && t.tagName === 'SCRIPT') { if (String(t.src || '').indexOf(jalan.file) >= 0) ada = true; return; }   // file tidak bisa diambil
        if (String((e && e.filename) || '').indexOf(jalan.file) >= 0) ada = true;                                       // error saat script dijalankan
    }, true);

    function tandai() {
        var g = peta(); g[jalan.v] = Date.now(); lset(K_GAGAL, JSON.stringify(g));
        if (pin) return;                                           // pengguna sengaja memilih versi ini
        if (typeof navigator !== 'undefined' && navigator.onLine === false) { delete g[jalan.v]; lset(K_GAGAL, JSON.stringify(g)); return; }   // offline bukan salah versi
        if (sget(K_RL)) return;                                    // sudah pernah pindah di sesi ini: jangan berputar-putar
        for (var i = 0; i < VERSI.length; i++) {
            if (VERSI[i] !== jalan && !bermasalah(VERSI[i].v)) { sset(K_RL, '1'); location.reload(); return; }
        }
    }
    function selesai() {
        if (fase !== 'muat') return;
        fase = 'jalan';
        if (ada) tandai(); else sset(K_RL, null);
    }

    // ---------- muat versi yang dipilih ----------
    if (document.readyState === 'loading') {
        // dimuat biasa di <body>: sama persis dengan script.js lama (tertahan dan berurutan)
        document.addEventListener('DOMContentLoaded', selesai);   // terdaftar lebih dulu daripada milik script versi
        document.write('<script src="' + jalan.file + '"><\/script>');
    } else {
        // loader dimuat belakangan (defer/async): DOMContentLoaded mungkin sudah lewat, jadi pendengarnya dipanggil manual
        var tunda = [], asli = window.addEventListener, s = document.createElement('script');
        window.addEventListener = function (t, f) {
            if (t === 'DOMContentLoaded' && typeof f === 'function') { tunda.push(f); return; }
            return asli.apply(this, arguments);
        };
        var akhir = function () {
            window.addEventListener = asli;
            selesai();
            var jalankan = function () { for (var i = 0; i < tunda.length; i++) { try { tunda[i].call(window, new Event('DOMContentLoaded')); } catch (e) { console.error(e); } } };
            if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', jalankan); else jalankan();
        };
        s.src = jalan.file; s.async = false;
        s.onload = akhir; s.onerror = function () { ada = true; akhir(); };
        (document.head || document.documentElement).appendChild(s);
    }

    // ---------- lencana + jendela pilih versi ----------
    function dialog() {
        if (document.getElementById('a9-versi-dlg')) return;
        var ov = document.createElement('div'); ov.id = 'a9-versi-dlg';
        ov.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px;';
        var box = document.createElement('div');
        box.style.cssText = 'background:#fff;color:#111;border-radius:16px;padding:18px;max-width:380px;width:100%;font:14px/1.45 system-ui,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.3);';
        var cat = ''; for (var i = 0; i < VERSI.length; i++) cat += '<li><b>v' + VERSI[i].v + '</b> (' + VERSI[i].tgl + '): ' + VERSI[i].catatan + '</li>';
        box.innerHTML = '<h3 style="margin:0 0 8px;font-size:16px;">Versi yang dijalankan</h3>'
            + '<p style="margin:0 0 10px;">Sekarang: <b>v' + jalan.v + '</b>. Kalau versi terbaru bermasalah, pakai versi lama dulu.</p>'
            + '<select id="a9-versi-sel" style="width:100%;padding:9px;border-radius:10px;border:1px solid #bbb;font-size:15px;">' + window.A9Versi.opsiHtml() + '</select>'
            + '<ul style="margin:10px 0 0;padding-left:18px;font-size:12.5px;color:#555;">' + cat + '</ul>'
            + '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;">'
            + '<button type="button" id="a9-versi-x" style="padding:8px 14px;border-radius:10px;border:1px solid #bbb;background:#fff;color:#111;font-size:14px;cursor:pointer;">Tutup</button>'
            + '<button type="button" id="a9-versi-go" style="padding:8px 14px;border-radius:10px;border:0;background:#2563eb;color:#fff;font-size:14px;font-weight:600;cursor:pointer;">Jalankan</button></div>';
        ov.appendChild(box); document.body.appendChild(ov);
        ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
        document.getElementById('a9-versi-x').onclick = function () { ov.remove(); };
        document.getElementById('a9-versi-go').onclick = function () { window.A9Versi.pilih(document.getElementById('a9-versi-sel').value); };
    }
    function lencana() {
        if (jalan === terbaru || document.getElementById('a9-versi-pill')) return;
        var p = document.createElement('div'); p.id = 'a9-versi-pill';
        p.style.cssText = 'position:fixed;left:10px;bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:9999;display:flex;align-items:center;gap:8px;max-width:calc(100% - 20px);padding:6px 6px 6px 12px;border-radius:999px;background:#1f2937;color:#fff;font:12.5px/1.3 system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.3);';
        var t = document.createElement('span');
        t.textContent = pin ? 'Memakai versi lama v' + jalan.v : (bermasalah(terbaru.v) ? 'v' + terbaru.v + ' bermasalah, sementara memakai v' + jalan.v : 'Memakai v' + jalan.v);
        var b = document.createElement('button'); b.type = 'button'; b.textContent = 'Ganti';
        b.style.cssText = 'border:0;border-radius:999px;padding:5px 12px;background:#fff;color:#111;font:600 12.5px system-ui,sans-serif;cursor:pointer;';
        b.onclick = dialog; p.appendChild(t); p.appendChild(b); document.body.appendChild(p);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', lencana); else lencana();
})();
