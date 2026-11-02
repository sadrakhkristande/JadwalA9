/* protect.js - pemasangan: <script src="protect.js"></script> PALING ATAS di <head>, sebelum script lain.
   Catatan jujur: ini hanya penghalang untuk pengguna awam. Browser tetap harus mengunduh HTML/CSS/JS
   agar web bisa jalan, jadi tidak ada cara 100% mencegah orang melihatnya. */
(function () {
    'use strict';
    var host = location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '') return;   // mode pengembangan: tidak aktif

    var noop = function () { };
    ['log', 'info', 'warn', 'error', 'debug', 'table', 'dir', 'trace'].forEach(function (k) { try { console[k] = noop; } catch (e) { } });

    function inField(t) { return t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || (t && t.isContentEditable); }

    // klik kanan, salin-seret, dan seleksi di luar kolom isian
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    document.addEventListener('dragstart', function (e) { e.preventDefault(); });
    document.addEventListener('selectstart', function (e) { if (!inField(e.target)) e.preventDefault(); });
    var st = document.createElement('style');
    st.textContent = 'body{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}input,textarea,select,[contenteditable]{-webkit-user-select:text;user-select:text}img{-webkit-user-drag:none}';
    (document.head || document.documentElement).appendChild(st);

    // pintasan: F12, Ctrl+Shift+I/J/C/K, Ctrl+U, Ctrl+S, Ctrl+P (Cmd untuk Mac)
    document.addEventListener('keydown', function (e) {
        var k = (e.key || '').toLowerCase(), c = e.ctrlKey || e.metaKey;
        var bad = e.key === 'F12' ||
            (c && e.shiftKey && 'ijckc'.indexOf(k) >= 0 && k.length === 1) ||
            (c && (k === 'u' || k === 's' || k === 'p')) ||
            (e.metaKey && e.altKey && 'iujc'.indexOf(k) >= 0 && k.length === 1);
        if (bad) { e.preventDefault(); e.stopPropagation(); return false; }
    }, true);

    // deteksi DevTools terbuka (hanya desktop; di HP ukuran layar berubah karena keyboard)
    var mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || ('ontouchstart' in window && screen.width < 1024);
    if (mobile) return;
    var ov = null;
    function show() {
        if (ov) return;
        ov = document.createElement('div');
        ov.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;font:600 18px system-ui,sans-serif';
        ov.textContent = 'Tutup Developer Tools untuk melanjutkan.';
        document.documentElement.appendChild(ov);
    }
    function hide() { if (ov) { ov.remove(); ov = null; } }
    function open() {
        var dw = window.outerWidth - window.innerWidth > 200, dh = window.outerHeight - window.innerHeight > 220;
        return dw || dh;
    }
    setInterval(function () { if (open()) show(); else hide(); }, 800);
})();
