// ==========================================================================
// PORTAL AKADEMIK A9 — GABUNGAN script.js + tambahan-v2.js
// Dimuat sebagai satu file; tambahan-v2 dijalankan setelah script.js selesai.
// ==========================================================================

// ==========================================================================
// BAGIAN 1 — script.js (LOGIKA PORTAL AKADEMIK A9 - VERSI REVISI)
// ==========================================================================
const allowedUsers = {
    "21105032610023": "ALICA MARATU SULHA", "21105032610047": "AYESHA LILIAN PUTRI",
    "21105032610049": "AYSAR HAMMAM IBRAHIM", "21105032610087": "FATHURAHMAN NUR AZIZ DENIRA",
    "21105032610089": "FATIKHATUNNISA ALYA FAHIRA", "21105032610125": "KEYSHA AURELL ANINDIKAZZAHRA",
    "21105032610149": "MUHAMMAD FIKRI HIDAYATULLOH", "21105032610171": "NATHANIA MENGDA JAMIPUTRI",
    "21105032610201": "RAFIDA HAMIDAH PUTRI", "21105032610227": "SADRAKH KRISTANDE GWIHARTO",
    "21105032610239": "SHERILLA AUDREY NASYWA"
};

let currentUser = null;
const INACTIVITY_LIMIT = 30 * 60 * 1000;

const SUPABASE_URL = "https://vqzklxbfrvmvcoeykias.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_-NTQ0VL2xQmIYJ_ieREXkg_WUcU3L0t";

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
window.addEventListener('DOMContentLoaded', async () => {
    const loadP = fetchDatabaseFromCloud();   // data tersimpan tampil dulu, data terbaru menyusul
    applyTheme(dbData.theme || 'light');
    loadP.then(() => applyTheme(dbData.theme || 'light'));

    const nimInput = document.getElementById('login-nim-input');
    const adminInput = document.getElementById('login-admin-code');
    if (nimInput) nimInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleLogin(); });
    if (adminInput) adminInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleLogin(); });

    const savedUser = sessionStorage.getItem('portal_current_user');
    const lastActive = sessionStorage.getItem('portal_last_active');
    if (savedUser && lastActive && (Date.now() - parseInt(lastActive) < INACTIVITY_LIMIT)) {
        currentUser = JSON.parse(savedUser);
        finishLogin();
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
            const cache = {};
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

async function saveCategoryData(categoryKey) {
    renderAll();
    if (!supabaseClient) return;
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
    } catch (err) { console.error(`Gagal simpan ${categoryKey}:`, err); }
}

async function uploadFileToSupabaseStorage(fileInputId) {
    const fileInput = document.getElementById(fileInputId);
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) return null;
    const file = fileInput.files[0];
    if (file.size > 50 * 1024 * 1024) { alert("File melebihi 50MB"); return null; }
    if (!supabaseClient) { alert("Supabase offline"); return null; }
    try {
        const filePath = `uploads/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const { data, error } = await supabaseClient.storage.from('portal-files').upload(filePath, file);
        if (error) throw error;
        const { data: publicUrlData } = supabaseClient.storage.from('portal-files').getPublicUrl(filePath);
        return publicUrlData.publicUrl;
    } catch (err) { console.error(err); alert("Upload gagal"); return null; }
}

window.handleLogin = function() {
    try {
        const role = document.getElementById('login-role').value;
        if (role === 'admin') {
            const code = document.getElementById('login-admin-code').value.trim();
            if (code === (dbData.adminCode || 'A9ACOR')) {
                currentUser = { role: 'admin', name: 'Admin Utama' };
                finishLogin();
            } else { alert('Kode Admin Salah!'); }
        } else {
            if (dbData.maintenance) { alert('⚠️ PORTAL SEDANG MAINTENANCE.'); return; }
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

window.handleLogout = function() { sessionStorage.clear(); location.reload(); };

function setupInactivityTracker() {
    const update = () => { if (currentUser) sessionStorage.setItem('portal_last_active', Date.now().toString()); };
    window.addEventListener('mousemove', update); window.addEventListener('keydown', update); window.addEventListener('click', update);
    setInterval(() => {
        const lastActive = sessionStorage.getItem('portal_last_active');
        if (currentUser && lastActive && (Date.now() - parseInt(lastActive) > INACTIVITY_LIMIT)) {
            alert('Sesi berakhir karena tidak ada aktivitas.'); handleLogout();
        }
    }, 60000);
}

function startClock() {
    setInterval(() => {
        const el = document.getElementById('wib-clock');
        if (el) el.innerText = `${new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', weekday: 'short', day: 'numeric', month: 'short' })}`;
    }, 1000);
}

// ==========================================================================
// LOGIKA CBT (MODE LATIHAN / EXAM, ACAK 100 DARI BANK SOAL, & LAPORAN)
// ==========================================================================
let cbtTimeInSeconds = 0, cbtTimerInterval = null, cbtStarted = false;
let cbtMode = 'practice';
let currentCbtQuestions = [];
let cbtAnswers = {};
const CBT_LETTERS = ['A', 'B', 'C', 'D', 'E'];
const EXAM_DURATION = 100 * 60; // 100 Menit

function cbtFormatTime(total) {
    if (total < 0) total = 0;
    const h = String(Math.floor(total / 3600)).padStart(2, '0');
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

window.startCBT = function(mode) {
    if (cbtStarted) return;
    if (!dbData.cbt_soal || dbData.cbt_soal.length === 0) {
        alert("Soal CBT belum dimasukkan ke database Supabase (key: cbt_soal).");
        return;
    }

    cbtMode = mode;
    cbtStarted = true;
    cbtAnswers = {};

    // Acak soal (Fisher-Yates) & ambil maksimal 100
    const allQuestions = [...dbData.cbt_soal];
    for (let i = allQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allQuestions[i], allQuestions[j]] = [allQuestions[j], allQuestions[i]];
    }
    currentCbtQuestions = allQuestions.slice(0, 100);

    cbtTimeInSeconds = (cbtMode === 'exam') ? EXAM_DURATION : 0;

    document.getElementById('cbt-timer').innerText = cbtFormatTime(cbtTimeInSeconds);
    document.getElementById('cbt-start-card').style.display = 'none';
    document.getElementById('cbt-active-area').style.display = 'block';
    document.getElementById('cbt-result-card').style.display = 'none';

    let html = '';
    currentCbtQuestions.forEach((q, idx) => {
        const imgHtml = q.image
            ? `<div class="cbt-image-container"><img src="${q.image}" class="cbt-image" alt="Ilustrasi Soal" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none'"><small style="display:block;color:var(--text-muted);margin-top:6px;font-size:11px;">${q.image_credit || ''}</small></div>`
            : '';

        let optionsHtml = '';
        q.options.forEach((opt, i) => {
            const safeOpt = String(opt).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            optionsHtml += `
                <li>
                    <label class="option-label" id="label-cbt-${q.id}-${i}">
                        <input type="radio" name="cbt-q${q.id}" onchange="selectCBTAnswer(${q.id}, '${safeOpt}', this)">
                        <span class="option-text"><strong>${CBT_LETTERS[i]}.</strong> ${opt}</span>
                    </label>
                </li>`;
        });
        html += `
            <div class="question-card" id="card-cbt-${q.id}">
                <div class="q-header">Soal ${idx + 1}</div>
                <div class="q-text">${q.text}</div>
                ${imgHtml}
                <ul class="options">${optionsHtml}</ul>
                <div id="cbt-feedback-${q.id}" class="cbt-feedback" style="display:none;"></div>
            </div>`;
    });
    document.getElementById('cbt-question-container').innerHTML = html;

    if (cbtTimerInterval) clearInterval(cbtTimerInterval);
    cbtTimerInterval = setInterval(() => {
        if (cbtMode === 'exam') {
            cbtTimeInSeconds--;
            document.getElementById('cbt-timer').innerText = cbtFormatTime(cbtTimeInSeconds);
            if (cbtTimeInSeconds <= 0) {
                clearInterval(cbtTimerInterval);
                alert("⏰ Waktu Ujian Habis! Jawaban otomatis disimpan.");
                finalizeCBT();
            }
        } else {
            cbtTimeInSeconds++;
            document.getElementById('cbt-timer').innerText = cbtFormatTime(cbtTimeInSeconds);
        }
    }, 1000);
};

window.selectCBTAnswer = function(qId, selectedOpt, inputEl) {
    cbtAnswers[qId] = selectedOpt;
    const q = currentCbtQuestions.find(item => item.id === qId) || dbData.cbt_soal.find(item => item.id === qId);
    if (!q) return;

    if (cbtMode === 'practice') {
        document.querySelectorAll(`input[name="cbt-q${qId}"]`).forEach(el => el.disabled = true);
        const feedbackEl = document.getElementById(`cbt-feedback-${qId}`);
        feedbackEl.style.display = 'block';

        if (selectedOpt === q.answer) {
            inputEl.closest('.option-label').classList.add('correct-answer');
            feedbackEl.className = 'cbt-feedback feedback-success';
            feedbackEl.innerHTML = `<strong>✅ Benar!</strong><br><br><em>Pembahasan:</em> ${cleanText(q.explanation)}`;
        } else {
            inputEl.closest('.option-label').classList.add('wrong-answer');
            feedbackEl.className = 'cbt-feedback feedback-danger';
            feedbackEl.innerHTML = `<strong>❌ Salah!</strong> Jawaban yang benar adalah: <strong>${q.answer}</strong><br><br><em>Pembahasan:</em> ${cleanText(q.explanation)}`;

            const correctIdx = q.options.indexOf(q.answer);
            if (correctIdx !== -1) {
                document.getElementById(`label-cbt-${qId}-${correctIdx}`).classList.add('correct-answer');
            }
        }
    } else {
        document.querySelectorAll(`input[name="cbt-q${qId}"]`).forEach(inp => inp.closest('.option-label').style.borderColor = 'var(--border-color)');
        inputEl.closest('.option-label').style.borderColor = 'var(--primary)';
    }
};

// Tombol "Selesai": tanya konfirmasi dulu
window.submitCBT = function() {
    const answeredCount = Object.keys(cbtAnswers).length;
    if (answeredCount < currentCbtQuestions.length) {
        if (!confirm(`Anda baru menjawab ${answeredCount} dari ${currentCbtQuestions.length} soal. Yakin ingin menyelesaikan?`)) return;
    }
    finalizeCBT();
};

// Hitung nilai & tampilkan laporan (dipakai juga saat waktu habis)
function finalizeCBT() {
    if (cbtTimerInterval) { clearInterval(cbtTimerInterval); cbtTimerInterval = null; }

    let correctCount = 0;
    let wrongCount = 0;
    const wrongTopics = {};

    currentCbtQuestions.forEach(q => {
        const userAnswer = cbtAnswers[q.id];
        if (userAnswer === q.answer) {
            correctCount++;
        } else {
            wrongCount++;
            if (q.topic) wrongTopics[q.topic] = (wrongTopics[q.topic] || 0) + 1;
        }
    });

    const total = currentCbtQuestions.length;
    const score = total ? Math.round((correctCount / total) * 100) : 0;
    const elapsed = cbtMode === 'exam' ? EXAM_DURATION - cbtTimeInSeconds : cbtTimeInSeconds;

    let reportHtml = `
        <div class="report-score">
            <h4>Nilai Akhir</h4>
            <div class="score-number">${score}</div>
            <small style="color: var(--text-muted);">Skala 0 - 100</small>
        </div>
        <div class="report-row">
            <span>Jawaban Benar</span>
            <span class="report-value report-correct">${correctCount} Soal</span>
        </div>
        <div class="report-row">
            <span>Jawaban Salah / Kosong</span>
            <span class="report-value report-wrong">${wrongCount} Soal</span>
        </div>
        <div class="report-row">
            <span>Waktu Pengerjaan</span>
            <span class="report-value">${cbtFormatTime(elapsed)}</span>
        </div>
    `;

    if (Object.keys(wrongTopics).length > 0) {
        reportHtml += `<div class="report-recommendation">
            <h5>📚 Rekomendasi Belajar (Fokus Tingkatkan):</h5>
            <ul>`;
        for (const [topic, count] of Object.entries(wrongTopics).sort((a, b) => b[1] - a[1])) {
            reportHtml += `<li><strong>${topic}</strong> (${count} kesalahan)</li>`;
        }
        reportHtml += `</ul></div>`;
    } else {
        reportHtml += `<div class="report-recommendation" style="background:#ecfdf5; border-color:#10b981;">
            <h5 style="color:#065f46;">🌟 Luar Biasa!</h5>
            <ul style="color:#065f46;"><li>Semua jawaban Anda benar. Tidak ada rekomendasi khusus.</li></ul>
        </div>`;
    }

    document.getElementById('cbt-report-content').innerHTML = reportHtml;
    document.getElementById('cbt-active-area').style.display = 'none';
    document.getElementById('cbt-result-card').style.display = 'block';
}

window.resetCBT = function() {
    if (cbtTimerInterval) clearInterval(cbtTimerInterval);
    cbtTimerInterval = null;
    cbtStarted = false; cbtTimeInSeconds = 0;
    document.getElementById('cbt-timer').innerText = "00:00:00";
    document.getElementById('cbt-start-card').style.display = 'block';
    document.getElementById('cbt-active-area').style.display = 'none';
    document.getElementById('cbt-result-card').style.display = 'none';
    document.getElementById('cbt-question-container').innerHTML = '';
};

// ==========================================================================
// FUNGSI UI, TAB, & FITUR HAPUS (ADMIN)
// ==========================================================================
window.switchTab = function(tab, btn) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-pill').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tab}`).style.display = 'block';
    if (btn) btn.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.toggleLoginFields = function() {
    const role = document.getElementById('login-role').value;
    document.getElementById('guest-fields').style.display = role === 'guest' ? 'block' : 'none';
    document.getElementById('admin-fields').style.display = role === 'admin' ? 'block' : 'none';
};

window.closeModal = function(id) { document.getElementById(id).style.display = 'none'; };
function applyTheme(theme) {
    if (theme === 'dark') document.body.classList.add('theme-dark');
    else document.body.classList.remove('theme-dark');
}

window.toggleThemeSwitch = async function() {
    dbData.theme = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
    applyTheme(dbData.theme);
    await saveCategoryData('config');
};

// FITUR HAPUS (ADMIN)
window.deleteItem = async function(category, index) {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini secara permanen?')) return;
    if (Array.isArray(dbData[category])) {
        dbData[category].splice(index, 1);
        await saveCategoryData(category);
        alert('Data berhasil dihapus.');
    }
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

function renderAll() {
    const isAdmin = currentUser && currentUser.role === 'admin';
    applyBanners();

    // Render Pengumuman
    const pList = document.getElementById('pengumuman-list');
    if (pList) pList.innerHTML = dbData.pengumuman.length === 0 ? '<p style="color:var(--text-muted);">Belum ada pengumuman.</p>' : dbData.pengumuman.map((p, idx) => `
        <div style="background:var(--bg-base); border-radius:var(--radius-md); padding:20px; margin-bottom:15px; border-left:4px solid var(--primary); position: relative;">
            <h4 style="margin-bottom:8px; color:var(--text-main); font-size:16px; padding-right: 80px;">${p.judul}</h4>
            <p style="font-size:14px; color:var(--text-muted); margin-bottom:12px;">${p.isi}</p>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <small style="color:var(--primary); font-weight:600;">🗓️ s/d ${p.deadline}</small>
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
window.addPengumuman = async function() {
    const judul = document.getElementById('p-judul').value;
    const isi = document.getElementById('p-isi').value;
    const deadline = document.getElementById('p-deadline').value;
    if (!judul || !isi || !deadline) return alert('Semua kolom wajib diisi!');
    dbData.pengumuman.unshift({ id: Date.now(), judul, isi, deadline });
    await saveCategoryData('pengumuman');
    document.getElementById('p-judul').value = ''; document.getElementById('p-isi').value = ''; document.getElementById('p-deadline').value = '';
    alert('Pengumuman ditambahkan!');
};

window.addTugasItem = async function() {
    const nama = document.getElementById('t-nama').value;
    const deadline = document.getElementById('t-deadline').value;
    const ket = document.getElementById('t-ket').value;
    const manualLink = document.getElementById('t-link-manual').value.trim();
    if (!nama || !deadline) return alert('Nama dan Deadline wajib diisi!');

    let finalLink = manualLink || '#';
    const uploadedUrl = await uploadFileToSupabaseStorage('t-file-pc');
    if (uploadedUrl) { finalLink = uploadedUrl; }

    dbData.tugas.push({ id: Date.now(), nama, deadline, ket, link: finalLink });
    await saveCategoryData('tugas');
    document.getElementById('t-nama').value = ''; document.getElementById('t-deadline').value = ''; document.getElementById('t-ket').value = '';
    document.getElementById('t-file-pc').value = ''; document.getElementById('t-link-manual').value = '';
    alert('Tugas disimpan!');
};

window.handlePraktikumUpload = async function(category, idNama, idSkenario, idKet, idFilePc, idLink) {
    const nama = document.getElementById(idNama).value;
    const skenario = document.getElementById(idSkenario).value;
    const ketEl = document.getElementById(idKet);          // elemen "ket" tidak ada di HTML, jadi dicek dulu
    const ket = ketEl ? ketEl.value : '';
    const manualLink = document.getElementById(idLink).value.trim();
    if (!nama) return alert('Nama wajib diisi!');

    let finalLink = manualLink || '#';
    const uploadedUrl = await uploadFileToSupabaseStorage(idFilePc);
    if (uploadedUrl) { finalLink = uploadedUrl; }

    dbData[category].push({ id: Date.now(), nama, skenario, ket, link: finalLink });
    await saveCategoryData(category);
    document.getElementById(idNama).value = ''; document.getElementById(idSkenario).value = '';
    if (ketEl) ketEl.value = '';
    document.getElementById(idFilePc).value = ''; document.getElementById(idLink).value = '';
    alert('Berhasil disimpan!');
};

window.handleMateriUpload = async function() {
    const kuliah = document.getElementById('m-kuliah').value;
    const materi = document.getElementById('m-materi').value;
    const manualLink = document.getElementById('m-link-manual').value.trim();
    if (!kuliah || !materi) return alert('Nama kuliah dan materi wajib diisi!');

    let finalLink = manualLink || '#';
    const uploadedUrl = await uploadFileToSupabaseStorage('m-file-pc');
    if (uploadedUrl) { finalLink = uploadedUrl; }

    dbData.materi.push({ id: Date.now(), kuliah, materi, link: finalLink });
    await saveCategoryData('materi');
    document.getElementById('m-kuliah').value = ''; document.getElementById('m-materi').value = '';
    document.getElementById('m-file-pc').value = ''; document.getElementById('m-link-manual').value = '';
    alert('Materi disimpan!');
};

window.addReminder = async function() {
    const val = document.getElementById('rem-text').value; if (!val) return;
    dbData.reminder.push(val); await saveCategoryData('reminder'); document.getElementById('rem-text').value = '';
};

window.addJadwalUpdateWithFile = async function() {
    const title = document.getElementById('up-title').value; if (!title) return;
    dbData.jadwalUpdates.push(title); await saveCategoryData('jadwalUpdates'); document.getElementById('up-title').value = '';
};

window.toggleMaintenanceMode = async function() {
    dbData.maintenance = !dbData.maintenance;
    await saveCategoryData('config');
    alert('Status pemeliharaan: ' + (dbData.maintenance ? 'AKTIF' : 'NONAKTIF'));
};

window.openAdminSettingsModal = function() {
    document.getElementById('cfg-global-msg').value = dbData.globalAnnouncement || '';
    document.getElementById('cfg-admin-code').value = '';
    document.getElementById('admin-settings-modal').style.display = 'flex';
};

window.saveAdminSettings = async function() {
    dbData.globalAnnouncement = document.getElementById('cfg-global-msg').value;
    const newCode = document.getElementById('cfg-admin-code').value.trim();
    if (newCode) dbData.adminCode = newCode;               // kosong = kode lama tidak diubah
    await saveCategoryData('config');
    window.closeModal('admin-settings-modal');
    alert('Tersimpan');
};

window.openPreviewModal = function(url) { document.getElementById('preview-frame').src = url; document.getElementById('preview-modal').style.display = 'flex'; };
window.closePreviewModal = function() { document.getElementById('preview-modal').style.display = 'none'; document.getElementById('preview-frame').src = ''; };

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

window.startQuiz = function() {
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

window.submitQuiz = function() {
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
        fb.innerHTML = (ok ? '<strong>✅ Benar!</strong>' : `<strong>❌ Salah.</strong> Jawaban: <strong>${s.answer}</strong>`)
            + (s.explanation ? `<br><br><em>Pembahasan:</em> ${cleanText(s.explanation)}` : '');
    });

    const total = dbData.soal.length;
    document.getElementById('quiz-score-text').innerText =
        `Skor: ${benar} dari ${total} (${total ? Math.round(benar / total * 100) : 0}%)`;
    document.getElementById('quiz-result-card').style.display = 'block';
    document.getElementById('submit-quiz-btn').style.display = 'none';
    document.getElementById('reset-quiz-btn').style.display = 'inline-flex';
};

window.resetQuiz = function() { window.startQuiz(); };

window.openJadwalModal = function() { alert("Fitur edit jadwal via UI sedang dalam pengembangan. Menggunakan Supabase."); };

// ==========================================================================
// TAMPILAN TAMBAHAN (CSS disuntikkan otomatis, tidak perlu ubah style.css)
// ==========================================================================
(function () {
    const st = document.createElement('style');
    st.id = 'tambahan-css';
    st.textContent = `/* ===== TAMBAHAN: tampilan lebih ramah & fitur baru ===== */
html { scroll-behavior: smooth; }
body { font-size: 16px; }
:focus-visible { outline: 3px solid var(--primary); outline-offset: 2px; }
.btn, .nav-pill, .btn-icon { min-height: 40px; }
.card { border-radius: var(--radius-xl); box-shadow: var(--shadow-lg); }
.nav-pill { padding: 10px 20px; }
.modern-input { font-size: 16px; }
.modern-table tr:hover td { background: var(--primary-light); }
.option-label { padding: 16px 20px; }
@media (max-width: 768px) {
    .main-content { padding: 0 12px; margin: 16px auto; }
    .card { padding: 18px; }
    .q-text { font-size: 16px; }
}
@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; scroll-behavior: auto !important; } }

/* Notifikasi (menggantikan pop-up alert) */
#toast-wrap { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 20000; display: flex; flex-direction: column; gap: 8px; align-items: center; width: min(92vw, 420px); pointer-events: none; }
.toast { background: var(--text-main); color: var(--bg-card); padding: 12px 18px; border-radius: 12px; font-size: 14px; font-weight: 600; box-shadow: var(--shadow-lg); width: 100%; text-align: center; animation: toastIn .25s ease; }
@keyframes toastIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

/* Sapaan di beranda */
.greeting { background: linear-gradient(135deg, var(--primary), var(--primary-hover)); color: #fff; border-radius: var(--radius-xl); padding: 22px 26px; margin-bottom: 25px; }
.greeting h3 { font-size: 22px; margin-bottom: 2px; }
.greeting p { opacity: .92; font-size: 14px; }

/* Label deadline tugas & pencarian tabel */
.dl-badge { display: inline-block; margin-left: 8px; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
.dl-late { background: #fee2e2; color: #991b1b; }
.dl-soon { background: #fef3c7; color: #92400e; }
.dl-ok { background: var(--primary-light); color: var(--primary); }
.search-box { margin-bottom: 15px; }

/* Navigasi & progres CBT */
.cbt-nav { position: sticky; bottom: 0; z-index: 700; background: var(--bg-card); border-top: 2px solid var(--primary); padding: 10px 20px; box-shadow: 0 -6px 16px rgba(0,0,0,.08); }
.cbt-progress { height: 8px; border-radius: 8px; background: var(--border-color); overflow: hidden; margin-bottom: 8px; }
#cbt-progress-fill { height: 100%; width: 0; background: var(--primary); transition: width .3s; }
.cbt-nav summary { cursor: pointer; font-weight: 700; font-size: 14px; }
.cbt-nav-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(38px, 1fr)); gap: 6px; margin-top: 10px; max-height: 40vh; overflow-y: auto; }
.cbt-nav-btn { padding: 6px 0; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-base); color: var(--text-main); font-weight: 600; font-size: 13px; cursor: pointer; }
.cbt-nav-btn.done { background: var(--primary); color: #fff; border-color: var(--primary); }
.cbt-nav-btn.flag { background: var(--warning); color: #fff; border-color: var(--warning); }
.flag-btn { margin-left: 12px; background: transparent; border: 1px dashed var(--warning); color: var(--warning); border-radius: 20px; padding: 2px 12px; font-size: 12px; font-weight: 600; cursor: pointer; }
.question-card.flagged .flag-btn { background: var(--warning); color: #fff; }
.cbt-timer.cbt-timer-warn { background: var(--danger); animation: pulseCorrect 1s infinite; }

/* Pembahasan & riwayat nilai */
.review-box, .history-box { margin-top: 20px; }
.review-box h5, .history-box h5 { font-size: 15px; margin-bottom: 10px; }
.review-item { border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 10px 14px; margin-bottom: 8px; font-size: 14px; }
.review-item summary { cursor: pointer; font-weight: 600; }
.review-item p { margin-top: 8px; color: var(--text-muted); }

/* Tombol kembali ke atas */
#to-top { position: fixed; right: 18px; bottom: 90px; z-index: 650; width: 44px; height: 44px; border-radius: 50%; border: none; background: var(--primary); color: #fff; font-size: 18px; cursor: pointer; box-shadow: var(--shadow-lg); display: none; }
`;
    document.head.appendChild(st);
})();

// ===== TAMBAHAN FITUR (dimuat SETELAH script.js) =====
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

    // 2. Navigasi soal, progres, dan tanda ragu di CBT
    function cards() { return [...document.querySelectorAll('#cbt-question-container .question-card')]; }

    function buildNav() {
        const cs = cards(), old = $('cbt-nav');
        if (!cs.length) { if (old) old.remove(); return; }
        if (old) old.remove();
        const bar = document.createElement('div');
        bar.id = 'cbt-nav'; bar.className = 'cbt-nav';
        bar.innerHTML = `<div class="cbt-progress"><div id="cbt-progress-fill"></div></div>
            <details><summary id="cbt-progress-text"></summary>
            <div class="cbt-nav-grid">${cs.map((c, i) => `<button type="button" class="cbt-nav-btn" id="nav-${c.id}" data-card="${c.id}">${i + 1}</button>`).join('')}</div></details>`;
        $('cbt-active-area').appendChild(bar);
        cs.forEach(c => {
            const h = c.querySelector('.q-header');
            if (h && !h.querySelector('.flag-btn')) {
                const b = document.createElement('button');
                b.type = 'button'; b.className = 'flag-btn'; b.dataset.card = c.id; b.textContent = '🚩 Tandai ragu';
                h.appendChild(b);
            }
        });
        updateNav();
    }

    function updateNav() {
        const cs = cards(); if (!cs.length) return;
        let done = 0;
        cs.forEach(c => {
            const answered = !!c.querySelector('input:checked');
            if (answered) done++;
            const nb = $('nav-' + c.id);
            if (nb) { nb.classList.toggle('done', answered); nb.classList.toggle('flag', c.classList.contains('flagged')); }
        });
        $('cbt-progress-fill').style.width = (done / cs.length * 100) + '%';
        $('cbt-progress-text').textContent = `Terjawab ${done} dari ${cs.length} soal (klik untuk daftar soal)`;
    }

    new MutationObserver(buildNav).observe($('cbt-question-container'), { childList: true });

    document.addEventListener('change', e => { if (e.target.closest('#cbt-question-container')) updateNav(); });
    document.addEventListener('click', e => {
        const nb = e.target.closest('.cbt-nav-btn');
        if (nb) { const c = $(nb.dataset.card); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
        const fb = e.target.closest('.flag-btn');
        if (fb) {
            const c = $(fb.dataset.card); c.classList.toggle('flagged');
            fb.textContent = c.classList.contains('flagged') ? '🚩 Ragu-ragu' : '🚩 Tandai ragu';
            updateNav();
        }
    });

    // 3. Timer memerah pada 10 menit terakhir (mode CBT)
    setInterval(() => {
        const t = $('cbt-timer'); if (!t) return;
        let warn = false;
        try { warn = cbtStarted && cbtMode === 'exam' && cbtTimeInSeconds <= 600; } catch (e) { }
        t.classList.toggle('cbt-timer-warn', warn);
    }, 1000);

    // 4. Pembahasan soal salah + riwayat nilai setelah CBT selesai
    const HKEY = 'a9_cbt_history';
    function loadHistory() { try { return JSON.parse(localStorage.getItem(HKEY)) || []; } catch (e) { return []; } }
    function saveHistory(item) {
        try { const h = loadHistory(); h.unshift(item); localStorage.setItem(HKEY, JSON.stringify(h.slice(0, 20))); } catch (e) { }
    }

    const origFinalize = window.finalizeCBT;
    window.finalizeCBT = function () {
        const qs = currentCbtQuestions.slice(), ans = Object.assign({}, cbtAnswers), mode = cbtMode;
        origFinalize();
        try {
            const salah = qs.filter(q => ans[q.id] !== q.answer);
            const benar = qs.length - salah.length;
            const score = qs.length ? Math.round(benar / qs.length * 100) : 0;
            saveHistory({ tgl: new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }), mode, score, benar, total: qs.length });

            const box = $('cbt-report-content');
            if (salah.length) {
                box.insertAdjacentHTML('beforeend', `<div class="review-box"><h5>📖 Pembahasan soal yang salah/kosong (${salah.length})</h5>
                    ${salah.map(q => `<details class="review-item"><summary>${esc(q.text)}</summary>
                    <p>Jawabanmu: <strong>${esc(ans[q.id] || '(kosong)')}</strong></p>
                    <p>Jawaban benar: <strong>${esc(q.answer)}</strong></p>
                    <p>${esc(cleanText(q.explanation))}</p></details>`).join('')}</div>`);
            }
            const h = loadHistory().slice(0, 5);
            box.insertAdjacentHTML('beforeend', `<div class="history-box"><h5>🕒 Riwayat nilai terakhir (di perangkat ini)</h5>
                ${h.map(x => `<div class="report-row" style="font-size:14px"><span>${esc(x.tgl)} · ${x.mode === 'exam' ? 'CBT' : 'Latihan'}</span><strong>${x.score} (${x.benar}/${x.total})</strong></div>`).join('')}</div>`);
        } catch (e) { console.error(e); }
    };

    // 5. Sapaan, label deadline tugas, dan kolom pencarian (dijalankan setiap renderAll)
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
        document.querySelectorAll('#tugas-table-body td[data-label="Deadline"]').forEach(td => {
            if (td.querySelector('.dl-badge')) return;
            const m = td.textContent.trim().match(/^\d{4}-\d{2}-\d{2}$/); if (!m) return;
            const days = Math.ceil((new Date(m[0] + 'T23:59:59') - new Date()) / 86400000);
            const b = document.createElement('span');
            if (days < 0) { b.className = 'dl-badge dl-late'; b.textContent = 'Terlewat'; }
            else if (days === 0) { b.className = 'dl-badge dl-soon'; b.textContent = 'Hari ini'; }
            else { b.className = 'dl-badge ' + (days <= 3 ? 'dl-soon' : 'dl-ok'); b.textContent = days + ' hari lagi'; }
            td.appendChild(b);
        });
    }
    function greeting() {
        if (typeof currentUser === 'undefined' || !currentUser || $('greeting')) return;
        const home = $('tab-home'); if (!home) return;
        const nama = (currentUser.name || '').split(' ')[0];
        const jam = new Date().getHours();
        const sapa = jam < 11 ? 'Selamat pagi' : jam < 15 ? 'Selamat siang' : jam < 18 ? 'Selamat sore' : 'Selamat malam';
        const d = document.createElement('div');
        d.id = 'greeting'; d.className = 'greeting';
        d.innerHTML = `<h3>${sapa}, ${esc(nama.charAt(0) + nama.slice(1).toLowerCase())}! 👋</h3><p>Semangat belajarnya hari ini. Cek jadwal dan tugasmu di bawah.</p>`;
        home.prepend(d);
    }

    const origRender = window.renderAll;
    window.renderAll = function () {
        origRender();
        try {
            addSearch('tugas-table-body', '🔎 Cari tugas...');
            addSearch('materi-table-body', '🔎 Cari materi...');
            deadlineBadges(); greeting();
            applyFilter('tugas-table-body'); applyFilter('materi-table-body');
        } catch (e) { console.error(e); }
    };
    window.renderAll();

    // 6. Tombol kembali ke atas
    const up = document.createElement('button');
    up.id = 'to-top'; up.type = 'button'; up.setAttribute('aria-label', 'Kembali ke atas'); up.textContent = '▲';
    up.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.appendChild(up);
    window.addEventListener('scroll', () => { up.style.display = window.scrollY > 400 ? 'block' : 'none'; });
})();

// ==========================================================================
// NAVIGASI SEDERHANA, PANDUAN, & LAPORAN (STATUS UNTUK MAHASISWA, KELOLA UNTUK ADMIN)
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
        <div class="card-header"><h3 class="card-title">📖 Panduan Penggunaan Portal</h3></div>
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
          <ul><li><strong>Tampilan:</strong> satu soal per halaman. Pakai tombol Sebelumnya/Berikutnya, atau klik nomor di <strong>Daftar Soal</strong> untuk memilih soal mana yang mau dikerjakan.</li><li><strong>Warna nomor:</strong> abu-abu = belum dikerjakan, hijau = sudah dijawab, titik oranye = ditandai ragu-ragu.</li><li><strong>Mode Latihan:</strong> tanpa waktu. Setelah memilih jawaban, benar/salah dan pembahasan langsung muncul.</li><li><strong>Mode CBT:</strong> ada waktu 100 menit (timer merah di 10 menit terakhir). Jawaban boleh diubah sebelum dikumpulkan. Pembahasan bisa dilihat setelah dikumpulkan lewat tombol <em>Review &amp; Pembahasan</em>.</li><li><strong>Tombol cepat:</strong> A-E atau 1-5 untuk memilih jawaban, panah kiri/kanan untuk pindah soal, F untuk tandai ragu.</li><li>Di akhir sesi kamu mendapat apresiasi, laporan nilai, dan rekomendasi topik belajar. Hasilnya otomatis tersimpan.</li></ul></details>
        <details class="guest-guide"><summary>📈 Progres dan hasil belajar</summary>
          <ol><li>Setiap selesai CBT atau Soal Isian, nilaimu tersimpan otomatis di akunmu (NIM), jadi bisa dilihat dari HP atau laptop mana pun.</li><li>Buka <strong>Latihan, Progres Saya</strong> untuk melihat grafik nilai, rata-rata, nilai terbaik, dan apakah kamu meningkat dibanding pengerjaan sebelumnya.</li><li>Bagian <em>Topik yang perlu diperkuat</em> menunjukkan topik yang paling sering salah, sebagai panduan belajar.</li></ol></details>
        <details class="guest-guide"><summary>7. Melapor masalah dan melihat perkembangannya</summary>
          <ol><li>Buka <strong>Bantuan, Lapor Masalah</strong>, isi jenis, bagian, dan penjelasan, lalu klik <strong>Kirim Laporan</strong>.</li><li>Di halaman yang sama, bagian <strong>Laporan Saya</strong> menunjukkan perkembangannya: Terkirim, Sedang diproses, lalu Selesai.</li><li>Kalau admin mengubah status atau menulis catatan, kamu mendapat notifikasi dan kartu <strong>🔔 Update laporanmu</strong> di Beranda. Klik <em>Tandai sudah dibaca</em> kalau sudah dilihat.</li></ol></details>
        <details class="admin-guide" style="display:none;"><summary>🛠️ Panduan Admin</summary>
          <ol><li><strong>Menambah konten:</strong> form berwarna putus-putus di tiap halaman (pengumuman, tugas, materi, lab, dan seterusnya) hanya terlihat oleh admin. Isi lalu klik Simpan. Tombol Hapus muncul di tiap data.</li>
          <li><strong>Menu Laporan:</strong> buka <em>Bantuan, Laporan Masuk</em>. Angka merah di menu menunjukkan laporan yang belum selesai.</li>
          <li><strong>Mengolah laporan:</strong> tulis catatan untuk pelapor (opsional), lalu klik <em>Proses</em> saat mulai dikerjakan, dan <em>Selesai</em> kalau sudah beres. Mahasiswa pelapor otomatis mendapat notifikasi di Beranda.</li>
          <li><strong>Filter:</strong> pakai tombol Belum selesai, Selesai, atau Semua. Klik Muat ulang untuk mengecek laporan baru.</li>
          <li><strong>Setelan:</strong> tombol ⚙️ Setelan di kanan atas untuk mode maintenance, pengumuman global, dan mengganti kode admin.</li></ol></details>
        <details class="admin-guide" style="display:none;"><summary>📁 Upload materi dan file besar lewat Google Drive (Admin)</summary>
          <ol><li>Buka <strong>drive.google.com</strong> dan buat folder, misalnya "Portal A9", dengan subfolder per mata kuliah. Drive gratis 15 GB dan bisa menyimpan PDF, PPT, atau video besar.</li><li>Upload filenya. Klik kanan file atau folder, pilih <strong>Bagikan</strong>, ubah Akses umum menjadi <strong>Siapa saja yang memiliki link</strong> dengan peran <strong>Pelihat</strong>, lalu <strong>Salin link</strong>.</li><li>Di portal, buka halaman tujuan (Materi, Tugas, Lab, Skills Lab, atau Tutorial), isi nama, lalu tempel link tadi di kolom <strong>Link</strong> dan klik Simpan.</li><li>Mahasiswa yang klik <em>Buka</em> akan melihat pratinjau file di jendela portal, dengan tombol <em>Buka di Drive</em> dan <em>Unduh</em>. Link folder juga didukung, isinya tampil sebagai daftar.</li><li>Kalau mahasiswa melihat "Anda memerlukan akses", berarti akses umum belum diatur ke "Siapa saja yang memiliki link". Perbaiki di Drive, tidak perlu mengubah data di portal.</li><li>Kolom upload file langsung dari komputer tetap ada untuk file kecil (maksimal 50 MB). Untuk file besar, pakai Drive.</li></ol></details>
        <details><summary>🔎 Folder, pencarian, dan filter</summary>
          <ul><li><strong>Materi, Lab, Skills Lab, dan Tutorial</strong> tampil sebagai folder. Klik folder untuk melihat isinya, dan klik <em>Semua folder</em> untuk kembali.</li><li>Ketik di kolom pencarian untuk mencari berkas di semua folder sekaligus, atau pilih folder lewat menu di sebelahnya.</li><li><strong>Tugas:</strong> pakai tombol Semua, Akan datang, atau Terlewat, dan kolom pencarian.</li><li><strong>Jadwal:</strong> pilih Hari ini &amp; besok, Minggu ini, atau Semua, atau ketik kata kunci seperti "Tutor" atau nama dosen.</li></ul></details>
        <details class="admin-guide" style="display:none;"><summary>📊 Progres mahasiswa dan jadwal (Admin)</summary>
          <ol><li>Buka <strong>Latihan, Progres Mahasiswa</strong> untuk melihat jumlah pengerjaan, rata-rata, nilai terbaik, nilai terakhir, dan tren tiap mahasiswa. Gunakan pencarian dan filter jenis latihan.</li><li>Klik <strong>Detail</strong> untuk melihat semua pengerjaan satu mahasiswa. Tombol <em>Hapus</em> di tiap baris menghapus satu pengerjaan, dan <em>Hapus semua progres</em> mengosongkan progres mahasiswa itu. Pakai ini kalau terjadi kesalahan sistem. Penghapusan tidak bisa dibatalkan.</li><li><strong>Jadwal:</strong> buka Kuliah, Jadwal, lalu tempel isi JSON jadwal di kotak admin dan klik <em>Simpan jadwal ke database</em>. Format array langsung atau berbentuk {"jadwal": [...]} sama-sama diterima.</li></ol></details>
        <details><summary>8. Masalah yang sering terjadi</summary>
          <ul><li><strong>Gambar soal tidak muncul:</strong> cek internet, lalu refresh dengan Ctrl+Shift+R. Kalau masih kosong, laporkan nomor soalnya.</li><li><strong>Halaman tidak merespons:</strong> refresh. Jawaban CBT yang belum diselesaikan tidak tersimpan.</li><li><strong>Portal maintenance:</strong> mahasiswa tidak bisa masuk sampai admin selesai.</li></ul></details>
      </div>
    </div>

    <div id="tab-lapor" class="tab-content" style="display:none;">
      <div class="card">
        <div class="card-header"><h3 class="card-title">📣 Lapor Masalah</h3></div>
        <p class="report-hint">Laporan masuk ke admin, dan perkembangannya bisa kamu pantau di bagian Laporan Saya di bawah.</p>
        <div class="form-group"><label for="lap-nama">Nama</label><input type="text" id="lap-nama" class="modern-input"></div>
        <div class="form-group"><label for="lap-nim">NIM</label><input type="text" id="lap-nim" class="modern-input" readonly></div>
        <div class="form-group"><label for="lap-kategori">Jenis laporan</label>
          <select id="lap-kategori" class="modern-input"><option>Soal atau jawaban keliru</option><option>Gambar tidak muncul</option><option>Error atau bug di portal</option><option>Jadwal, tugas, atau materi tidak sesuai</option><option>Saran fitur</option><option>Lainnya</option></select></div>
        <div class="form-group"><label for="lap-lokasi">Bagian atau nomor soal (kalau ada)</label><input type="text" id="lap-lokasi" class="modern-input" placeholder="Contoh: CBT soal 17, atau halaman Tugas"></div>
        <div class="form-group"><label for="lap-isi">Penjelasan</label><textarea id="lap-isi" class="modern-input" style="height:120px;resize:vertical;" placeholder="Ceritakan apa yang terjadi, dan apa yang seharusnya tampil."></textarea></div>
        <button class="btn btn-primary btn-lg" id="lap-kirim">📨 Kirim Laporan</button>
      </div>
      <div class="card"><div class="card-header"><h3 class="card-title">📋 Laporan Saya</h3></div><div id="lap-mine"></div></div>
    </div>

    <div id="tab-laporan-admin" class="tab-content" style="display:none;">
      <div class="card">
        <div class="card-header flex-between"><h3 class="card-title">🛠️ Laporan Masuk</h3><button class="btn btn-outline btn-sm" id="lap-refresh">🔄 Muat ulang</button></div>
        <details class="guide" style="margin-bottom:15px;"><summary style="cursor:pointer;font-weight:700;">📘 Cara memakai halaman ini</summary>
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
        { id: 'home', ico: '🏠', label: 'Beranda', tabs: [['home', 'Beranda']] },
        { id: 'kuliah', ico: '📅', label: 'Kuliah', tabs: [['jadwal', 'Jadwal'], ['tugas', 'Tugas'], ['materi', 'Materi']] },
        { id: 'praktikum', ico: '🔬', label: 'Praktikum', tabs: [['lab', 'Lab'], ['skills', 'Skills Lab'], ['tutorial', 'Tutorial']] },
        { id: 'latihan', ico: '✍️', label: 'Latihan', tabs: () => [['soal', 'Soal Isian'], ['cbt', 'Simulasi CBT'], isAdmin() ? ['progres-admin', 'Progres Mahasiswa'] : ['progres', 'Progres Saya']] },
        { id: 'bantuan', ico: '💬', label: 'Bantuan', tabs: () => [['panduan', 'Panduan'], isAdmin() ? ['laporan-admin', 'Laporan Masuk'] : ['lapor', 'Lapor Masalah']] }
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
        if (!c) { c = document.createElement('div'); c.id = 'lap-update-card'; c.className = 'upd-card'; const ref = document.querySelector('#tab-home .grid-2-1'); ref.before(c); }
        c.innerHTML = `<h3>🔔 Update laporanmu (${u.length})</h3>
          ${u.map(x => `<div class="upd-row"><strong>${esc(x.kategori)}</strong> (${esc(x.lokasi)}): ${x.status === 'selesai' ? '✅ <strong>Selesai</strong>' : '🔵 <strong>Sedang diproses</strong>'}${x.catatan ? `<br><em>Catatan admin: ${esc(x.catatan)}</em>` : ''}</div>`).join('')}
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
            if (n > 0 && (notify || n > lastUnread)) alert(`🔔 Ada ${n} update untuk laporanmu. Lihat di Beranda.`);
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
            <div class="lap-top"><span><span class="lap-cat">${esc(x.kategori)}</span> &nbsp;<strong>${esc(x.nama)}</strong> (${esc(x.nim)}) · <strong>${esc(STAT[x.status] || x.status)}</strong></span><span>${esc(fmt(x.tgl))}</span></div>
            <small>Bagian: <strong>${esc(x.lokasi)}</strong></small>
            <div class="lap-body">${esc(x.isi)}</div>
            <small style="color:var(--text-muted)">${esc(x.perangkat)}</small>
            <input type="text" class="modern-input" style="margin-top:8px;" data-note="${x.id}" value="${esc(x.catatan || '')}" placeholder="Catatan untuk pelapor (opsional)">
            <div class="lap-acts">
              ${x.status !== 'proses' ? `<button class="btn btn-sm btn-outline" data-act="proses" data-id="${x.id}">🔵 Proses</button>` : ''}
              ${x.status !== 'selesai' ? `<button class="btn btn-sm btn-primary" data-act="selesai" data-id="${x.id}">✅ Selesai</button>` : ''}
              ${x.status !== 'baru' ? `<button class="btn btn-sm btn-outline" data-act="baru" data-id="${x.id}">↩️ Buka lagi</button>` : ''}
              <button class="btn btn-sm btn-danger" data-act="del" data-id="${x.id}">Hapus</button>
            </div></div>`).join('') : '<p style="color:var(--text-muted);">Tidak ada laporan di kategori ini.</p>';
        renderNav();
    }

    async function refreshAdmin(notify) {
        if (!isAdmin() || !supabaseClient) return;
        try {
            dbData.laporan = await fetchLaporan();
            const baru = dbData.laporan.filter(x => x.status !== 'selesai').length;
            if (baru > 0 && (notify || baru > lastBaru)) alert(`🔔 Ada ${baru} laporan belum selesai. Buka Bantuan, Laporan Masuk.`);
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
// CBT MODEL UJIAN (SATU SOAL PER HALAMAN) + HASIL TERSIMPAN + PROGRES + GOOGLE DRIVE
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
    .cbtx-nav { display: flex; justify-content: space-between; gap: 10px; margin-top: 22px; }
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
    .apres { background: linear-gradient(135deg, var(--primary), var(--primary-hover)); color: #fff; border-radius: var(--radius-lg); padding: 20px; text-align: center; margin-bottom: 16px; }
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
        let ico = '🌱', t = 'Terus berlatih!', m = 'Setiap latihan membuatmu lebih siap. Baca pembahasan soal yang salah, lalu coba lagi.';
        if (skor >= 85) { ico = '🏆'; t = 'Luar biasa!'; m = 'Pemahamanmu sangat baik. Pertahankan, dan bantu temanmu yang masih belajar.'; }
        else if (skor >= 70) { ico = '👏'; t = 'Bagus sekali!'; m = 'Kamu sudah menguasai sebagian besar materi. Sedikit lagi menuju sempurna.'; }
        else if (skor >= 50) { ico = '💪'; t = 'Sudah di jalur yang benar!'; m = 'Fokus pada topik yang masih sering salah di rekomendasi belajar.'; }
        let cmp = '';
        if (prev === null) cmp = '🎯 Ini pengerjaan pertamamu, jadikan patokan untuk berikutnya';
        else if (prev !== undefined) { const d = skor - prev; cmp = d > 0 ? `📈 Naik ${d} poin dari pengerjaan sebelumnya` : d < 0 ? `📉 Turun ${-d} poin dari pengerjaan sebelumnya` : '➖ Sama dengan pengerjaan sebelumnya'; }
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
        cbt = { mode, qs: qs.slice(0, 100), idx: 0, ans: {}, flag: {}, review: false, side: false, startedAt: Date.now(), endAt: mode === 'exam' ? Date.now() + EXAM_DURATION * 1000 : 0 };
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
        cbtTimeInSeconds = rem; $('cbt-timer').textContent = cbtFormatTime(rem);
        if (rem <= 0) { clearInterval(timer); timer = null; alert('⏰ Waktu habis! Jawaban dikumpulkan otomatis.'); finish(); }
    }

    function renderCbt() {
        const c = cbt, q = c.qs[c.idx], n = c.qs.length, ans = c.ans[q.id], rv = c.review, pr = c.mode === 'practice';
        const reveal = rv || (pr && ans !== undefined);
        const opts = q.options.map((o, i) => {
            let cls = 'option-label';
            if (reveal) { if (o === q.answer) cls += ' correct-answer'; else if (o === ans) cls += ' wrong-answer'; }
            else if (ans === o) cls += ' picked';
            return `<li><button type="button" class="${cls}" data-opt="${i}"${reveal ? ' disabled' : ''}><span class="option-text"><strong>${L[i]}.</strong> ${esc(o)}</span></button></li>`;
        }).join('');
        let fb = '';
        if (reveal) {
            const ok = ans === q.answer;
            const head = ans === undefined ? '⚪ <strong>Tidak dijawab.</strong>' : ok ? '✅ <strong>Benar!</strong>' : '❌ <strong>Salah.</strong>';
            fb = `<div class="cbt-feedback ${ok ? 'feedback-success' : 'feedback-danger'}" style="display:block;">${head}${ok ? '' : ` Jawaban benar: <strong>${esc(q.answer)}</strong>`}${rv && q.topic ? `<br><small>Topik: ${esc(q.topic)}</small>` : ''}<br><br><em>Pembahasan:</em> ${esc(cleanText(q.explanation || 'Belum ada pembahasan untuk soal ini.'))}</div>`;
        }
        const img = q.image ? `<div class="cbt-image-container"><img src="${esc(q.image)}" class="cbt-image" alt="Ilustrasi soal" referrerpolicy="no-referrer" onerror="this.style.display='none'"><small style="display:block;color:var(--text-muted);margin-top:6px;font-size:11px;">${esc(q.image_credit || '')}</small></div>` : '';

        const answered = Object.keys(c.ans).length, flagged = Object.keys(c.flag).length;
        const grid = c.qs.map((x, i) => {
            const a = c.ans[x.id]; let s = '';
            if (rv) s = a === undefined ? 'blank' : a === x.answer ? 'ok' : 'bad';
            else if (pr && a !== undefined) s = a === x.answer ? 'ok' : 'bad';
            else if (a !== undefined) s = 'done';
            return `<button type="button" class="cx-btn ${s}${c.flag[x.id] ? ' flag' : ''}${i === c.idx ? ' cur' : ''}" data-go="${i}" aria-label="Soal ${i + 1}">${i + 1}</button>`;
        }).join('');
        const sw = (bg, t) => `<span><i style="background:${bg}"></i>${t}</span>`;
        const legend = rv ? sw('#10b981', 'Benar') + sw('#ef4444', 'Salah') + sw('var(--border-color)', 'Kosong')
            : pr ? sw('var(--bg-card)', 'Belum') + sw('#10b981', 'Benar') + sw('#ef4444', 'Salah') + sw('var(--warning)', 'Ragu')
                : sw('var(--bg-card)', 'Belum dikerjakan') + sw('var(--primary)', 'Sudah dijawab') + sw('var(--warning)', 'Ragu-ragu');
        const stats = rv ? `Review: ${Object.keys(c.ans).filter(id => { const x = c.qs.find(y => String(y.id) === id); return x && c.ans[id] === x.answer; }).length} benar dari ${n} soal`
            : `Terjawab <strong>${answered}</strong> · Ragu <strong>${flagged}</strong> · Belum <strong>${n - answered}</strong>`;
        const acts = rv ? '<button class="btn btn-primary" data-act="back">← Kembali ke laporan</button>'
            : `<button class="btn btn-outline" data-act="blank">⏭ Ke soal belum dijawab</button><button class="btn btn-primary" data-act="submit">${c.mode === 'exam' ? '📤 Kumpulkan Jawaban' : '✅ Selesai Latihan'}</button>`;

        $('cbt-question-container').innerHTML = `
        <div class="cbtx">
          <div class="cbtx-main">
            <div class="cbtx-head">
              <span class="cbtx-title">${rv ? '📖 Review · ' : ''}Soal ${c.idx + 1} dari ${n}</span>
              <span style="display:flex;gap:8px;flex-wrap:wrap;">
                <button class="btn btn-outline btn-sm cx-toggle" data-act="side">📋 Daftar soal</button>
                ${rv ? '' : `<button class="btn btn-outline btn-sm" data-act="flag">${c.flag[q.id] ? '🚩 Ragu-ragu (klik untuk batal)' : '🏳️ Tandai ragu-ragu'}</button>`}
              </span>
            </div>
            <div class="q-text">${q.text}</div>
            ${img}
            <ul class="options">${opts}</ul>
            ${fb}
            <div class="cbtx-nav">
              <button class="btn btn-outline" data-act="prev"${c.idx === 0 ? ' disabled' : ''}>◀ Sebelumnya</button>
              <button class="btn btn-primary" data-act="next"${c.idx === n - 1 ? ' disabled' : ''}>Berikutnya ▶</button>
            </div>
          </div>
          <aside class="cbtx-side${c.side ? ' open' : ''}">
            <h4>Daftar Soal</h4>
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
        renderCbt();
        const nx = cbt.qs[cbt.idx + 1]; if (nx && nx.image) { new Image().src = nx.image; }
        $('cbt-question-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function pick(i) {
        const c = cbt, q = c.qs[c.idx]; if (!c || c.review) return;
        const o = q.options[i]; if (o === undefined) return;
        if (c.mode === 'practice' && c.ans[q.id] !== undefined) return;
        if (c.ans[q.id] === o && c.mode === 'exam') delete c.ans[q.id]; else c.ans[q.id] = o;
        renderCbt();
    }
    function toggleFlag() { const q = cbt.qs[cbt.idx]; if (cbt.flag[q.id]) delete cbt.flag[q.id]; else cbt.flag[q.id] = true; renderCbt(); }
    function jumpBlank() {
        const n = cbt.qs.length;
        for (let k = 1; k <= n; k++) { const i = (cbt.idx + k) % n; if (cbt.ans[cbt.qs[i].id] === undefined) { go(i); return; } }
        alert('Semua soal sudah dijawab 🎉');
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
        c.result = { benar, salah, kosong, skor, durasi, wrong, jenis, prev: prevScore(jenis) };
        if (isGuest()) saveResult({ t: Date.now(), jenis, skor, benar, total: n, kosong, durasi, wrong });
        showReport();
    }

    function showReport() {
        const c = cbt; if (!c || !c.result) return;
        c.review = false; const r = c.result, n = c.qs.length;
        const topics = Object.entries(r.wrong).sort((a, b) => b[1] - a[1]);
        $('cbt-report-content').innerHTML = `
          ${apresiasi(r.skor, r.prev)}
          <div class="report-score"><h4>Nilai Akhir</h4><div class="score-number">${r.skor}</div><small style="color:var(--text-muted);">Skala 0 - 100 · ${c.mode === 'exam' ? 'Mode CBT' : 'Mode Latihan'}</small></div>
          <div class="report-row"><span>Jawaban Benar</span><span class="report-value report-correct">${r.benar} Soal</span></div>
          <div class="report-row"><span>Jawaban Salah</span><span class="report-value report-wrong">${r.salah} Soal</span></div>
          <div class="report-row"><span>Tidak Dijawab</span><span class="report-value">${r.kosong} Soal</span></div>
          <div class="report-row"><span>Waktu Pengerjaan</span><span class="report-value">${cbtFormatTime(r.durasi)}</span></div>
          ${topics.length ? `<div class="report-recommendation"><h5>📚 Rekomendasi Belajar (Fokus Tingkatkan):</h5><ul>${topics.map(([t, k]) => `<li><strong>${esc(t)}</strong> (${k} soal)</li>`).join('')}</ul></div>`
                : `<div class="report-recommendation" style="background:#ecfdf5;border-color:#10b981;"><h5 style="color:#065f46;">🌟 Luar Biasa!</h5><ul style="color:#065f46;"><li>Semua jawabanmu benar.</li></ul></div>`}
          <div class="lap-acts" style="margin-top:18px;justify-content:center;">
            <button class="btn btn-primary" data-rep="review">📖 Review &amp; Pembahasan</button>
            <button class="btn btn-outline" data-rep="progres">📈 Lihat Progres</button>
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
        <div class="card-header flex-between"><h3 class="card-title">📈 Progres Belajar Saya</h3>
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
        if (!arr.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">🌱</div><h3>Belum ada hasil</h3><p>Kerjakan CBT atau Soal Isian. Nilaimu otomatis tersimpan di sini supaya kamu bisa melihat peningkatannya.</p></div>'; return; }
        const avg = a => a.length ? Math.round(a.reduce((s, r) => s + r.skor, 0) / a.length) : 0;
        const last = arr[arr.length - 1], best = Math.max(...arr.map(r => r.skor));
        let trend = 'Kerjakan satu sesi lagi untuk melihat perbandingannya.';
        if (arr.length >= 2) {
            const d = last.skor - arr[arr.length - 2].skor;
            trend = d > 0 ? `📈 Nilai terakhirmu naik ${d} poin dari sebelumnya. Pertahankan!` : d < 0 ? `📉 Nilai terakhirmu turun ${-d} poin dari sebelumnya. Cek pembahasan soal yang salah.` : '➖ Nilai terakhirmu sama dengan sebelumnya.';
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
          ${weak.length ? `<div class="report-recommendation" style="margin-bottom:16px;"><h5>🎯 Topik yang perlu diperkuat</h5><ul>${weak.map(([t, k]) => `<li><strong>${esc(t)}</strong> (${k} kali salah)</li>`).join('')}</ul></div>` : ''}
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
        bar.innerHTML = `<a href="${esc(info.open)}" target="_blank" rel="noopener">↗ Buka di Drive</a>${info.download ? `<a href="${esc(info.download)}" target="_blank" rel="noopener">⬇ Unduh</a>` : ''}`;
    }
    function wireDrive() {
        document.querySelectorAll('#main-app a[href*="google.com"]').forEach(a => {
            if (a.dataset.drive) return;
            const info = driveInfo(a.getAttribute('href') || ''); if (!info) return;
            a.dataset.drive = '1';
            a.addEventListener('click', e => { e.preventDefault(); openDrive(info); });
        });
    }
    const orr = window.renderAll;
    window.renderAll = function () { orr(); try { wireDrive(); } catch (e) { } };
    window.wireDriveAll = wireDrive;

    ['t-link-manual', 'lab-link-manual', 'skills-link-manual', 'tut-link-manual', 'm-link-manual'].forEach(id => {
        const el = $(id); if (!el) return;
        el.placeholder = 'Link Google Drive / URL lainnya';
        el.insertAdjacentHTML('afterend', '<small style="display:block;color:var(--text-muted);margin:-4px 0 10px;">💡 File besar? Upload ke Google Drive, bagikan "Siapa saja yang memiliki link" (Pelihat), lalu tempel link-nya di sini. Lihat Bantuan, Panduan, Panduan Admin.</small>');
    });
    window.renderAll();
})();

// ==========================================================================
// JADWAL BARU, FOLDER & FILTER MATERI, PROGRES MAHASISWA UNTUK ADMIN
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
    .fv-folder { background: var(--bg-base); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 18px 14px; text-align: center; cursor: pointer; font: inherit; color: var(--text-main); transition: .2s; }
    .fv-folder:hover { border-color: var(--primary); background: var(--primary-light); transform: translateY(-2px); }
    .fv-folder .ico { font-size: 40px; display: block; }
    .fv-folder strong { display: block; margin: 6px 0 2px; font-size: 14px; word-break: break-word; }
    .fv-folder small { color: var(--text-muted); }
    .fv-file { display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid var(--border-color); border-radius: var(--radius-md); margin-bottom: 8px; background: var(--bg-base); }
    .fv-file .ico { font-size: 26px; }
    .fv-meta { flex: 1; min-width: 0; } .fv-meta strong { display: block; word-break: break-word; } .fv-meta small { color: var(--text-muted); }
    .pa-trend-up { color: #10b981; font-weight: 700; } .pa-trend-down { color: #ef4444; font-weight: 700; }
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
    jCard.querySelector('.card-title').textContent = '📅 Jadwal Kuliah';
    jCard.querySelector('.card-header').insertAdjacentHTML('afterend', `
      <div class="chips" id="jd-chips"><button class="chip active" data-v="dekat">Hari ini &amp; besok</button><button class="chip" data-v="minggu">Minggu ini</button><button class="chip" data-v="semua">Semua</button></div>
      <input type="search" id="jd-search" class="modern-input" placeholder="🔎 Cari kegiatan, dosen, atau hari (contoh: Tutor, Anatomi, Selasa)">
      <div id="jd-view"></div>
      <details class="admin-form-box" style="margin-top:20px;"><summary style="cursor:pointer;font-weight:700;">⚙️ Admin: ganti seluruh jadwal (tempel JSON)</summary>
        <p style="font-size:13px;color:var(--text-muted);margin:8px 0;">Tempel isi JSON jadwal. Format array langsung atau {"jadwal": [...]} sama-sama diterima. Ini menggantikan jadwal yang ada.</p>
        <textarea id="jd-json" class="modern-input" style="height:140px;font-family:monospace;font-size:12px;" placeholder='{"jadwal":[{"tgl":"Senin, 21-Sep-26","sesi":[{"jam":"07.50-09.30","kegiatan":"-"}]}]}'></textarea>
        <button class="btn btn-primary" id="jd-save">Simpan jadwal ke database</button></details>`);

    function renderJadwal() {
        const all = (dbData.jadwalCustom || []).filter(j => j && Array.isArray(j.sesi));
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
                const rows = j.sesi.filter(s => s && s.kegiatan && s.kegiatan.trim() !== '-');
                return `<div class="jd ${isT ? 'today' : ''}"><div class="jd-head"><strong>${esc(j.tgl)}</strong>${isT ? '<span class="jd-tag">Hari ini</span>' : isTm ? '<span class="jd-tag" style="background:#3b82f6">Besok</span>' : ''}</div>
                    ${rows.length ? rows.map(s => `<div class="jd-row"><span class="jd-jam">${esc(s.jam)}</span><span>${esc(s.kegiatan)}</span></div>`).join('') : '<div class="jd-row"><span></span><span style="color:var(--text-muted)">Tidak ada kegiatan</span></div>'}</div>`;
            }).join('') : '<p style="color:var(--text-muted);">Tidak ada jadwal yang cocok.</p>');
    }
    $('jd-chips').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; jView = b.dataset.v; document.querySelectorAll('#jd-chips .chip').forEach(c => c.classList.toggle('active', c === b)); renderJadwal(); });
    $('jd-search').addEventListener('input', renderJadwal);
    $('jd-save').addEventListener('click', async () => {
        let p; try { p = JSON.parse($('jd-json').value); } catch (e) { alert('JSON tidak valid: ' + e.message); return; }
        const arr = Array.isArray(p) ? p : (p && p.jadwal);
        if (!Array.isArray(arr) || !arr.length || arr.some(j => !j || !j.tgl || !Array.isArray(j.sesi))) { alert('Format salah. Tiap hari harus punya "tgl" dan daftar "sesi".'); return; }
        if (!confirm(`Ganti seluruh jadwal dengan ${arr.length} hari dari JSON ini?`)) return;
        dbData.jadwalCustom = arr; await saveCategoryData('jadwal'); $('jd-json').value = ''; alert('Jadwal tersimpan.');
    });

    // ======================= FOLDER MATERI & PRAKTIKUM =======================
    const iconOf = u => /drive\.google\.com\/drive\/.*folders/.test(u) ? '📁' : /\.pdf($|\?)/i.test(u) ? '📕' : /\.(pptx?|key)($|\?)/i.test(u) ? '📊' : /\.(docx?|txt)($|\?)/i.test(u) ? '📝' : /\.(mp4|mov|mkv|webm)($|\?)/i.test(u) || /youtu/.test(u) ? '🎬' : /\.(xlsx?|csv)($|\?)/i.test(u) ? '📈' : /\.(png|jpe?g|gif|webp)($|\?)/i.test(u) ? '🖼️' : '📄';
    const mounts = [];
    function mount(cfg) {
        const host = cfg.el || $(cfg.hide), box = document.createElement('div');
        box.className = 'fv'; box.id = 'fv-' + cfg.id;
        box.innerHTML = `<div class="fv-bar"><input type="search" class="modern-input" placeholder="${cfg.ph}" aria-label="Cari"><select class="modern-input" aria-label="Pilih folder"></select></div><div class="fv-crumb"></div><div class="fv-body"></div>`;
        host.style.display = 'none'; host.after(box);
        const m = { cfg, box, folder: '', q: '' };
        const input = box.querySelector('input'), sel = box.querySelector('select');
        input.addEventListener('input', () => { m.q = input.value.trim().toLowerCase(); draw(m); });
        sel.addEventListener('change', () => { m.folder = sel.value; draw(m); });
        box.addEventListener('click', e => {
            const f = e.target.closest('[data-folder]'); if (f) { m.folder = f.dataset.folder; draw(m); return; }
            if (e.target.closest('[data-back]')) { m.folder = ''; input.value = ''; m.q = ''; draw(m); return; }
            const d = e.target.closest('[data-del]'); if (d) window.deleteItem(cfg.cat, +d.dataset.del);
        });
        mounts.push(m); draw(m);
    }
    function draw(m) {
        const c = m.cfg, list = (dbData[c.cat] || []).map((it, idx) => ({ it, idx, g: (c.group(it) || 'Lainnya').trim() }));
        const names = [...new Set(list.map(x => x.g))].sort((a, b) => a.localeCompare(b, 'id'));
        if (m.folder && !names.includes(m.folder)) m.folder = '';
        const sel = m.box.querySelector('select');
        sel.innerHTML = '<option value="">📂 Semua folder</option>' + names.map(n => `<option value="${esc(n)}"${n === m.folder ? ' selected' : ''}>${esc(n)}</option>`).join('');
        const crumb = m.box.querySelector('.fv-crumb'), body = m.box.querySelector('.fv-body');
        if (!list.length) { crumb.innerHTML = ''; body.innerHTML = '<p style="color:var(--text-muted);">Belum ada berkas.</p>'; return; }
        if (!m.folder && !m.q) {
            crumb.innerHTML = `📂 Semua folder (${names.length})`;
            body.innerHTML = '<div class="fv-grid">' + names.map(n => `<button type="button" class="fv-folder" data-folder="${esc(n)}"><span class="ico">📁</span><strong>${esc(n)}</strong><small>${list.filter(x => x.g === n).length} berkas</small></button>`).join('') + '</div>';
            return;
        }
        const res = list.filter(x => (!m.folder || x.g === m.folder) && (!m.q || (c.title(x.it) + ' ' + x.g + ' ' + (c.sub(x.it) || '')).toLowerCase().includes(m.q)));
        crumb.innerHTML = `<a data-back="1">📂 Semua folder</a>${m.folder ? ' › 📁 <strong>' + esc(m.folder) + '</strong>' : ''} · ${res.length} berkas`;
        body.innerHTML = res.length ? res.map(({ it, idx, g }) => `
          <div class="fv-file"><span class="ico">${iconOf(it.link || '')}</span>
            <div class="fv-meta"><strong>${esc(c.title(it))}</strong><small>${m.folder ? esc(c.sub(it) || '') : '📁 ' + esc(g)}</small></div>
            ${it.link && it.link !== '#' ? `<a class="btn btn-sm btn-primary" href="${esc(it.link)}" target="_blank" rel="noopener">Buka</a>` : ''}
            ${isAdmin() ? `<button class="btn btn-danger btn-sm" data-del="${idx}">Hapus</button>` : ''}</div>`).join('') : '<p style="color:var(--text-muted);">Tidak ada berkas yang cocok.</p>';
    }
    mount({ id: 'materi', el: document.querySelector('#tab-materi .table-responsive'), cat: 'materi', ph: '🔎 Cari materi atau mata kuliah...', group: it => it.kuliah, title: it => it.materi, sub: it => '' });
    mount({ id: 'lab', hide: 'lab-list', cat: 'laboratorium', ph: '🔎 Cari kegiatan lab...', group: it => it.skenario, title: it => it.nama, sub: it => '' });
    mount({ id: 'skills', hide: 'skills-list', cat: 'skills_lab', ph: '🔎 Cari keterampilan...', group: it => it.skenario, title: it => it.nama, sub: it => '' });
    mount({ id: 'tut', hide: 'tutorial-list', cat: 'tutorial', ph: '🔎 Cari topik tutorial...', group: it => it.skenario, title: it => it.nama, sub: it => '' });

    // ======================= FILTER TUGAS =======================
    let tF = 'semua';
    const tw = document.querySelector('#tab-tugas .table-responsive');
    tw.insertAdjacentHTML('beforebegin', '<div class="chips" id="t-chips"><button class="chip active" data-f="semua">Semua</button><button class="chip" data-f="soon">Akan datang</button><button class="chip" data-f="late">Terlewat</button></div>');
    function tugasFilter() {
        const q = ($('search-tugas-table-body') || { value: '' }).value.toLowerCase();
        document.querySelectorAll('#tugas-table-body tr').forEach(tr => {
            const late = !!tr.querySelector('.dl-late');
            const okF = tF === 'semua' || (tF === 'late' ? late : !late);
            tr.style.display = (okF && tr.textContent.toLowerCase().includes(q)) ? '' : 'none';
        });
    }
    $('t-chips').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; tF = b.dataset.f; document.querySelectorAll('#t-chips .chip').forEach(c => c.classList.toggle('active', c === b)); tugasFilter(); });
    let tHooked = false;

    // ======================= PROGRES MAHASISWA (ADMIN) =======================
    $('tab-lapor').insertAdjacentHTML('afterend', `
    <div id="tab-progres-admin" class="tab-content" style="display:none;">
      <div class="card">
        <div class="card-header flex-between"><h3 class="card-title">📊 Progres Mahasiswa</h3><button class="btn btn-outline btn-sm" id="pa-refresh">🔄 Muat ulang</button></div>
        <div class="fv-bar"><input type="search" id="pa-search" class="modern-input" placeholder="🔎 Cari nama atau NIM...">
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
            if (a.length >= 2) { const d = last.skor - a[a.length - 2].skor; tr = d > 0 ? `<span class="pa-trend-up">▲ ${d}</span>` : d < 0 ? `<span class="pa-trend-down">▼ ${-d}</span>` : '➖'; }
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
            renderJadwal(); mounts.forEach(draw);
            if (!tHooked && $('search-tugas-table-body')) { $('search-tugas-table-body').addEventListener('input', tugasFilter); tHooked = true; }
            tugasFilter();
            document.querySelectorAll('#tab-jadwal .admin-form-box').forEach(el => { el.style.display = isAdmin() ? 'block' : 'none'; });
            if (typeof wireDriveAll === 'function') wireDriveAll();
        } catch (e) { console.error(e); }
    };
    window.renderAll();
})();

// ==========================================================================
// BAGIAN 2 — tambahan-v2.js (dimuat SETELAH script.js)
//   1) UI & sub menu baru (responsif, bottom-bar di HP)
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
    .simple-nav { display: flex; position: sticky; top: 0; z-index: 900; background: var(--bg-card); border-bottom: 1px solid var(--border-color); box-shadow: 0 2px 10px rgba(0,0,0,.05); padding: 10px 20px; gap: 10px; }
    #sn-main { justify-content: center; }
    #sn-main .nav-pill { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; position: relative; }
    #sn-sub { background: var(--bg-base); border-radius: 14px; padding: 4px; gap: 4px; }
    #sn-sub .sn-chip { flex: 1 0 auto; border: none; background: transparent; border-radius: 10px; padding: 9px 16px; font-size: 14px; color: var(--text-muted); transition: .15s; }
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

    // Hilangkan chip "Terlewat" (sudah tidak relevan)
    const lateChip = document.querySelector('#t-chips .chip[data-f="late"]'); if (lateChip) lateChip.remove();

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
    jdBox.innerHTML = '<summary>✏️ Admin: edit jadwal (per hari &amp; sesi)</summary><div id="jde-body"></div>';
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
                    <button class="btn btn-outline btn-sm" data-jact="delses" data-d="${i}" data-s="${k}" aria-label="Hapus sesi">✕</button></div>`).join('')}
                  <button class="btn btn-outline btn-sm" data-jact="addses" data-d="${i}">+ Sesi</button></div>`;
            }).join('') +
            `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;">
              <button class="btn btn-outline" data-jact="addday">+ Tambah hari</button>
              <button class="btn btn-primary" data-jact="save">💾 Simpan jadwal</button>
              <button class="btn btn-outline" data-jact="reset">↩️ Batalkan perubahan</button></div>`;
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
            await saveCategoryData('jadwal'); jd = null; drawJde(); alert('Jadwal tersimpan.');
        }
    });

    // ======================================================================
    // 3) Admin: kelola folder & berkas (Materi, Lab, Skills Lab, Tutorial)
    // ======================================================================
    const CF = [
        { tab: 'tab-materi', cat: 'materi', g: 'kuliah', t: 'materi', lg: 'Mata kuliah' },
        { tab: 'tab-lab', cat: 'laboratorium', g: 'skenario', t: 'nama', lg: 'Folder (modul)' },
        { tab: 'tab-skills', cat: 'skills_lab', g: 'skenario', t: 'nama', lg: 'Folder (modul)' },
        { tab: 'tab-tutorial', cat: 'tutorial', g: 'skenario', t: 'nama', lg: 'Folder (modul)' }
    ];
    const grp = (c, it) => String(it[c.g] || 'Lainnya').trim();
    CF.forEach(c => {
        const box = document.createElement('details');
        box.className = 'admin-form-box'; box.style.cssText = 'display:none;margin-top:20px;'; c.box = box;
        box.innerHTML = '<summary>🗂️ Admin: kelola folder &amp; berkas</summary><div class="mg-body"></div>';
        $(c.tab).appendChild(box);
        box.addEventListener('toggle', () => { if (box.open) drawMgr(c); });
        box.addEventListener('click', async e => {
            const b = e.target.closest('[data-m]'); if (!b) return;
            const a = b.dataset.m, list = dbData[c.cat] || [];
            if (a === 'ren') {
                const old = b.dataset.f, nv = (b.parentElement.querySelector('input').value || '').trim();
                if (!nv || nv === old) return;
                list.forEach(it => { if (grp(c, it) === old) it[c.g] = nv; });
                await saveCategoryData(c.cat); drawMgr(c); alert('Folder diganti nama.');
            } else if (a === 'delf') {
                const old = b.dataset.f, n = list.filter(it => grp(c, it) === old).length;
                if (!confirm(`Hapus folder "${old}" beserta ${n} berkas di dalamnya? Tidak bisa dibatalkan.`)) return;
                dbData[c.cat] = list.filter(it => grp(c, it) !== old);
                await saveCategoryData(c.cat); drawMgr(c); alert('Folder dihapus.');
            } else if (a === 'save') {
                const row = b.closest('.mg-row'), it = list[+b.dataset.i]; if (!it) return;
                const ti = row.querySelector('[data-f="t"]').value.trim(), fo = row.querySelector('[data-f="g"]').value.trim(), li = row.querySelector('[data-f="l"]').value.trim();
                if (!ti) { alert('Judul tidak boleh kosong.'); return; }
                it[c.t] = ti; it[c.g] = fo || 'Lainnya'; it.link = li || '#';
                await saveCategoryData(c.cat); drawMgr(c); alert('Berkas diperbarui.');
            } else if (a === 'del') {
                if (!confirm('Hapus berkas ini?')) return;
                list.splice(+b.dataset.i, 1); await saveCategoryData(c.cat); drawMgr(c);
            }
        });
    });
    function drawMgr(c) {
        const list = dbData[c.cat] || [], body = c.box.querySelector('.mg-body');
        const names = [...new Set(list.map(it => grp(c, it)))].sort((a, b) => a.localeCompare(b, 'id'));
        body.innerHTML = `<datalist id="dl-${c.cat}">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>
          <p class="hint">Ganti nama folder akan memindahkan semua isinya. Untuk membuat folder baru, ketik nama folder baru pada kolom "${c.lg}" milik sebuah berkas (atau saat menambah berkas baru).</p>
          <h4>Folder (${names.length})</h4>
          <div class="mg-folders">${names.map(n => `<div class="mg-f"><input class="modern-input" value="${esc(n)}" aria-label="Nama folder"><button class="btn btn-outline btn-sm" data-m="ren" data-f="${esc(n)}">Ganti nama</button><button class="btn btn-danger btn-sm" data-m="delf" data-f="${esc(n)}">Hapus folder</button></div>`).join('') || '<p class="hint">Belum ada folder.</p>'}</div>
          <h4>Berkas (${list.length})</h4>
          ${list.map((it, i) => `<div class="mg-row">
            <input class="modern-input" data-f="t" value="${esc(it[c.t])}" aria-label="Judul">
            <input class="modern-input" data-f="g" list="dl-${c.cat}" value="${esc(grp(c, it))}" aria-label="${c.lg}">
            <input class="modern-input" data-f="l" value="${esc(it.link && it.link !== '#' ? it.link : '')}" placeholder="Link" aria-label="Link">
            <button class="btn btn-primary btn-sm" data-m="save" data-i="${i}">Simpan</button><button class="btn btn-danger btn-sm" data-m="del" data-i="${i}">Hapus</button></div>`).join('') || '<p class="hint">Belum ada berkas.</p>'}`;
    }

    // ======================================================================
    // 4) OSCE
    // ======================================================================
    const OSCE_KEY = 'osce';
    let S = null;            // state tersimpan (server)
    let draft = null;        // setelan yang sedang diedit admin
    let draftOpen = false;   // admin membuka form setup setelah sesi selesai
    let curTab = 'home', lastBanner = null, lastSig = null, firstLoad = true;
    const fired = {};
    const blank = () => ({ v: 1, status: 'setup', judul: 'OSCE', stase: [1, 2, 3, 4].map(i => ({ id: i, nama: 'Stase ' + i, durasi: 10, kasus: { judul: '', skenario: '', instruksi: '', tugas: '', checklist: '' } })), peserta: [], round: 0, roundStart: 0, startedAt: 0, warnSec: 60, autoGeser: false, sound: true });

    const main = document.querySelector('.main-content');
    main.insertAdjacentHTML('beforeend', '<div id="tab-osce" class="tab-content" style="display:none;"><div id="osce-root"></div></div>');

    // ---- suara ----
    let AC = null;
    function ctx() { if (!AC) { const C = window.AudioContext || window.webkitAudioContext; if (C) AC = new C(); } if (AC && AC.state === 'suspended') AC.resume(); return AC; }
    document.addEventListener('click', () => ctx());
    function beep(freq, ms, delay) {
        const a = ctx(); if (!a) return; const t = a.currentTime + (delay || 0);
        const o = a.createOscillator(), g = a.createGain(); o.type = 'square'; o.frequency.value = freq;
        g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.35, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + ms / 1000);
        o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + ms / 1000 + .05);
    }
    const vib = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { } };
    function cue(kind) {
        if (!S || S.sound === false) return;
        if (kind === 'warn') { beep(880, 170, 0); beep(880, 170, .3); vib([150, 100, 150]); }
        else if (kind === 'end') { beep(520, 700, 0); vib([500]); }
        else { [0, .55, 1.1].forEach(d => beep(1040, 380, d)); vib([300, 150, 300, 150, 300]); }
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
        b.innerHTML = '🩺 OSCE' + (S && S.status === 'running' ? '<span class="live-dot"></span>' : '');
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
        <div class="card"><div class="card-header"><h3 class="card-title">🩺 OSCE · Pengaturan Sesi</h3></div>
          <p class="report-hint">Alur: ① atur stase &amp; waktu ② isi soal kasus (manual atau AI) ③ pilih peserta ④ Simpan ⑤ Mulai. Tiap peserta mendapat soal berbeda, lalu berpindah (geser) setiap putaran sampai semua stase terlewati.</p>
          <div class="form-group"><label>Judul sesi</label><input class="modern-input" data-g="judul" value="${esc(d.judul)}"></div>
          <div class="osce-row3">
            <div class="form-group"><label>Peringatan geser (detik sebelum habis)</label><input type="number" min="5" class="modern-input" data-g="warnSec" value="${d.warnSec}"></div>
            <div class="form-group"><label>Geser otomatis</label><select class="modern-input" data-g="autoGeser"><option value="0"${d.autoGeser ? '' : ' selected'}>Tidak, admin menekan tombol</option><option value="1"${d.autoGeser ? ' selected' : ''}>Ya, 5 detik setelah semua habis</option></select></div>
            <div class="form-group"><label>Bunyi notifikasi</label><select class="modern-input" data-g="sound"><option value="1"${d.sound !== false ? ' selected' : ''}>Aktif</option><option value="0"${d.sound === false ? ' selected' : ''}>Mati</option></select></div>
          </div></div>

        <div class="card"><div class="card-header flex-between"><h3 class="card-title">🧩 Stase (${N})</h3><button class="btn btn-outline btn-sm" data-oact="addStase">+ Tambah stase</button></div>
          ${d.stase.map((st, i) => `<details class="osce-stase"${i === 0 ? ' open' : ''}><summary><span>${i + 1}. ${esc(st.nama)}</span><span>⏱ ${st.durasi} menit</span></summary>
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

        <div class="card"><details><summary style="cursor:pointer;font-weight:700;font-size:16px;">🤖 Buat soal kasus dengan AI (dari berkas Skills Lab)</summary>
          <p class="hint">AI membuat <strong>${N} kasus berbeda</strong> (satu per stase) dari materi yang kamu pilih. Hasilnya masuk ke form stase di atas dan <strong>tetap bisa kamu edit</strong> sebelum disimpan. Format berkas yang didukung: PDF atau teks. Berkas Word/PPT: ekspor ke PDF dulu. Link Google Drive tidak bisa dibaca langsung, unduh dulu lalu unggah di kolom kedua.</p>
          <div class="form-group"><label>① Pilih berkas Skills Lab (yang diunggah ke portal)</label><select id="ai-src" class="modern-input"><option value="">— tidak dipakai —</option>${opts}</select></div>
          <div class="form-group"><label>② Atau unggah PDF/TXT dari perangkat</label><input type="file" id="ai-file" class="modern-input" accept=".pdf,.txt,.md"></div>
          <div class="form-group"><label>③ Atau tempel teks materi</label><textarea id="ai-text" class="modern-input" style="height:90px;"></textarea></div>
          <div class="form-group"><label>Arahan tambahan (opsional)</label><input id="ai-extra" class="modern-input" placeholder="Contoh: fokus keterampilan anamnesis, tingkat semester 5"></div>
          <button class="btn btn-primary" data-oact="ai">✨ Buat ${N} soal kasus</button> <span id="ai-status" class="hint"></span>
        </details></div>

        <div class="card"><div class="card-header flex-between"><h3 class="card-title">👥 Peserta (${d.peserta.length}/${N} stase)</h3>
          <span style="display:flex;gap:6px;flex-wrap:wrap;"><button class="btn btn-outline btn-sm" data-oact="selAll">Pilih semua</button><button class="btn btn-outline btn-sm" data-oact="selNone">Kosongkan</button><button class="btn btn-outline btn-sm" data-oact="shuffle">🔀 Acak urutan</button></span></div>
          <p class="hint">Urutan peserta menentukan soal awal: peserta #1 mulai di stase 1, #2 di stase 2, dst.${over ? ' <strong style="color:#b91c1c;">Jumlah peserta melebihi jumlah stase, kurangi atau tambah stase.</strong>' : ''}</p>
          <div class="osce-peserta">${entries.map(([nim, nama]) => { const o = d.peserta.findIndex(p => p.nim === nim); return `<label class="${o >= 0 ? 'on' : ''}"><input type="checkbox" data-p="${nim}"${o >= 0 ? ' checked' : ''}><span style="flex:1">${esc(nama)}<br><small style="color:var(--text-muted)">${nim}</small></span>${o >= 0 ? `<span class="osce-ord">#${o + 1}</span>` : ''}</label>`; }).join('')}</div>
          ${d.peserta.length ? `<details><summary style="cursor:pointer;font-weight:600;">Lihat pembagian soal awal</summary><ol style="margin:8px 0 0 20px;font-size:14px;">${d.peserta.map((p, i) => `<li>${esc(p.nama)} → ${d.stase[i] ? esc(d.stase[i].nama) : '⚠️ tidak ada stase'}</li>`).join('')}</ol></details>` : ''}
        </div>

        <div class="card"><div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button class="btn btn-outline btn-lg" data-oact="save">💾 Simpan setelan</button>
          <button class="btn btn-primary btn-lg" data-oact="launch">▶️ Mulai OSCE</button>
          <button class="btn btn-outline btn-lg" data-oact="sound">🔊 Tes suara</button></div>
          <p class="hint" style="margin-top:10px;">Saat Mulai ditekan, semua timer stase berjalan bersamaan dan peserta langsung melihat soalnya. Biarkan tab ini tetap terbuka selama sesi supaya alarm berbunyi tepat waktu.</p></div>`;
    }

    function runHtml() {
        const N = S.stase.length, last = S.round + 1 >= N;
        return `<div class="card">
          <div class="card-header flex-between"><h3 class="card-title">🩺 ${esc(S.judul)} <span class="live-tag">LIVE</span></h3><span class="osce-round">Putaran ${S.round + 1} / ${N}</span></div>
          <div id="osce-banner" class="osce-banner" style="display:none"></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
            <button class="btn btn-primary btn-lg" data-oact="geser">${last ? '🏁 Selesaikan OSCE' : '⏭ Geser ke putaran ' + (S.round + 2)}</button>
            <button class="btn btn-outline" data-oact="sound">🔊 Tes suara</button>
            <button class="btn btn-danger" data-oact="stop">⏹ Batalkan sesi</button></div>
          <div class="osce-grid">${S.stase.map((st, i) => { const p = occupant(i), nx = nextOcc(i), k = st.kasus || {}; return `
            <div class="osce-st"><div class="osce-st-h"><strong>${esc(st.nama)}</strong><small>${st.durasi} menit</small></div>
              <div class="osce-who">${p ? esc(p.nama) : '<em style="color:var(--text-muted)">kosong</em>'}</div>
              <div class="osce-time" id="tm-${i}">--:--</div><div class="osce-bar"><i id="pb-${i}"></i></div>
              <small>${last ? 'Putaran terakhir' : 'Setelah geser: ' + (nx ? esc(nx.nama) : '—')}</small>
              <details><summary>Soal &amp; checklist penguji</summary>
                <p class="pre"><strong>${esc(k.judul || '')}</strong>\n${esc(k.skenario || '')}</p>
                ${lines(k.tugas).length ? '<strong>Tugas</strong><ol>' + lines(k.tugas).map(x => `<li>${esc(x)}</li>`).join('') + '</ol>' : ''}
                ${lines(k.checklist).length ? '<strong>Checklist</strong><ol>' + lines(k.checklist).map(x => `<li>${esc(x)}</li>`).join('') + '</ol>' : ''}</details></div>`; }).join('')}</div></div>`;
    }

    function doneHtml() {
        return `<div class="card"><div class="empty-state"><div class="empty-icon">🏁</div><h3>OSCE "${esc(S.judul)}" selesai</h3><p>${S.peserta.length} peserta telah melewati ${S.stase.length} stase.</p>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:14px;"><button class="btn btn-primary" data-oact="newSession">Buat sesi baru (pakai setelan ini)</button><button class="btn btn-outline" data-oact="resetAll">Hapus sesi</button></div></div></div>`;
    }

    function guestHtml() {
        const card = (t, m) => `<div class="card"><div class="empty-state"><div class="empty-icon">🩺</div><h3>${t}</h3><p>${m}</p></div></div>`;
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

    // ---- timer & alarm (jalan tiap 0,5 detik) ----
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
            if (maxRem > 0 && maxRem <= warn && !fired[k + 'gw']) { fired[k + 'gw'] = 1; banner('⚠️ Bersiap geser, sisa ' + fmt(maxRem) + '. Siapkan peserta berpindah.', 'warn'); cue('geser'); }
            if (maxRem <= 0) {
                if (!fired[k + 'ge']) { fired[k + 'ge'] = 1; fired[k + 'gt'] = now; banner('🔔 WAKTU HABIS di semua stase. SILAKAN GESER.', 'end'); cue('geser'); }
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
            catch (e) { return alert('Berkas tidak bisa dibaca langsung (mungkin link Google Drive). Unduh dulu lalu unggah di kolom ②, atau tempel teksnya.'); }
        }
        if (blob) {
            if (/\.pdf$/i.test(name) || blob.type === 'application/pdf') pdf = await toB64(blob);
            else if (/\.(txt|md)$/i.test(name) || (blob.type || '').startsWith('text/')) text += '\n' + await blob.text();
            else return alert('Format belum didukung. Gunakan PDF atau teks (Word/PPT: ekspor ke PDF).');
        }
        if (!pdf && !text) return alert('Pilih berkas atau tempel teks materi terlebih dulu.');
        if (pdf && pdf.length > 6000000) return alert('PDF terlalu besar (maks sekitar 4 MB). Pecah atau kompres dulu.');
        if (draft.stase.some(s => String(s.kasus.skenario).trim()) && !confirm('Soal yang sudah terisi akan ditimpa hasil AI. Lanjutkan?')) return;
        st.textContent = '⏳ AI sedang menyusun soal, tunggu sekitar 20-60 detik...';
        try {
            const { data, error } = await supabaseClient.functions.invoke('osce-ai', { body: { n, pdf, text, extra: $('ai-extra').value, judul: draft.judul, adminCode: dbData.adminCode || 'A9ACOR' } });
            if (error) throw error; if (!data || !Array.isArray(data.kasus)) throw new Error((data && data.error) || 'Respons tidak valid');
            data.kasus.slice(0, n).forEach((k, i) => {
                const j = x => Array.isArray(x) ? x.join('\n') : String(x || '');
                draft.stase[i].kasus = { judul: j(k.judul), skenario: j(k.skenario), instruksi: j(k.instruksi), tugas: j(k.tugas), checklist: j(k.checklist) };
                if (k.nama && /^stase \d+$/i.test(draft.stase[i].nama)) draft.stase[i].nama = String(k.nama);
            });
            renderOsce(); alert('Soal dari AI sudah masuk. Periksa & edit dulu, lalu Simpan setelan.');
        } catch (e) { console.error(e); st.textContent = ''; alert('AI gagal: ' + (e.message || e) + '. Pastikan fungsi osce-ai sudah di-deploy.'); }
    }

    // ---- event delegasi di tab OSCE ----
    const tabO = $('tab-osce');
    function onField(t) {
        if (!isAdmin() || !draft) return;
        if (t.dataset.g) { const g = t.dataset.g; draft[g] = (t.tagName === 'SELECT') ? t.value === '1' : t.type === 'number' ? (+t.value || 0) : t.value; return; }
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
        if (a === 'sound') { const was = S; if (!S) S = { sound: true }; cue('warn'); if (!was) S = null; return; }
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
                if (S.status === 'running' && bs[0] !== 'running') { alert('🩺 OSCE dimulai! Buka menu OSCE.'); cue('warn'); }
                else if (S.status === 'running' && String(S.round) !== bs[1]) { alert('🔄 Geser! Kamu pindah ke stase berikutnya.'); cue('geser'); }
                else if (S.status === 'finished' && bs[0] === 'running') alert('🏁 OSCE selesai.');
            }
            injectPill(); if (curTab === 'osce') renderOsce();
        }
        firstLoad = false;
    }

    // ---- hook login ----
    const prevLogin = window.finishLogin;
    window.finishLogin = function () {
        prevLogin(); curTab = 'home'; firstLoad = true;
        CF.forEach(c => { c.box.style.display = isAdmin() ? 'block' : 'none'; });
        jdBox.style.display = isAdmin() ? 'block' : 'none';
        loadOsce().then(() => { injectPill(); firstLoad = false; });
        if (isGuest()) setInterval(pollGuest, 3000);
        if (isAdmin()) purgeRemote();
    };

    // ---- hook renderAll ----
    const prevRender = window.renderAll;
    window.renderAll = function () {
        const ch = purgeLocal();
        prevRender();
        try {
            CF.forEach(c => { c.box.style.display = isAdmin() ? 'block' : 'none'; if (c.box.open && !c.box.contains(document.activeElement)) drawMgr(c); });
            jdBox.style.display = isAdmin() ? 'block' : 'none';
        } catch (e) { console.error(e); }
        if (ch.length && isAdmin()) purgeRemote();
    };
    window.renderAll();
})();
