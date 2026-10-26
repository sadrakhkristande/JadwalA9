// ==========================================================================
// LOGIKA PORTAL AKADEMIK A9 (MODERN UI & SUPABASE) - VERSI REVISI
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
    await fetchDatabaseFromCloud();
    applyTheme(dbData.theme || 'light');

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

async function fetchDatabaseFromCloud() {
    try {
        if (!supabaseClient) return;
        const keys = ['pengumuman', 'reminder', 'jadwalUpdates', 'tugas', 'laboratorium', 'skills_lab', 'tutorial', 'materi', 'jadwal', 'soal', 'config', 'cbt_soal'];
        for (const k of keys) {
            const { data, error } = await supabaseClient.from('portal_db').select('value').eq('key', k).single();
            if (!error && data && data.value) {
                // Kalau JSON tersimpan sebagai teks, ubah dulu menjadi data
                let v = data.value;
                if (typeof v === 'string') {
                    try { v = JSON.parse(v); } catch (e) { console.error('JSON "' + k + '" rusak:', e); }
                }
                if (k === 'config') {
                    dbData.maintenance = v.maintenance || false;
                    dbData.theme = v.theme || 'light';
                    dbData.globalAnnouncement = v.globalAnnouncement || '';
                    dbData.adminCode = v.adminCode || 'A9ACOR';
                } else if (k === 'jadwal') {
                    dbData.jadwalCustom = v || [];
                } else {
                    dbData[k] = v || [];
                }
            }
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

    // Render Jadwal
    const jBody = document.getElementById('jadwal-table-body');
    if (jBody) jBody.innerHTML = dbData.jadwalCustom.length === 0 ? '<tr><td colspan="5" style="text-align:center;">Tidak ada jadwal hari ini/besok.</td></tr>' : dbData.jadwalCustom.map((j, idx) => `
        <tr>
            <td data-label="Tanggal"><strong>${j.tgl}</strong></td>
            <td data-label="Sesi 1">${j.sesi[0].jam}<br><small>${j.sesi[0].kegiatan}</small></td>
            <td data-label="Sesi 2">${j.sesi[1].jam}<br><small>${j.sesi[1].kegiatan}</small></td>
            <td data-label="Sesi 3">${j.sesi[2].jam}<br><small>${j.sesi[2].kegiatan}</small></td>
            <td data-label="Sesi 4">${j.sesi[3].jam}<br><small>${j.sesi[3].kegiatan}</small></td>
        </tr>
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
          <ul><li><strong>Mode Latihan:</strong> tanpa batas waktu, jawaban langsung dikoreksi.</li><li><strong>Mode CBT:</strong> 100 soal acak, 100 menit, koreksi di akhir. Timer merah di 10 menit terakhir.</li><li><strong>Bilah bawah layar:</strong> menunjukkan jumlah soal terjawab. Klik untuk daftar nomor soal.</li><li><strong>🚩 Tandai ragu:</strong> menandai soal yang ingin dicek ulang.</li><li>Setelah selesai kamu melihat nilai, pembahasan soal yang salah, dan riwayat nilai.</li></ul></details>
        <details class="guest-guide"><summary>7. Melapor masalah dan melihat perkembangannya</summary>
          <ol><li>Buka <strong>Bantuan, Lapor Masalah</strong>, isi jenis, bagian, dan penjelasan, lalu klik <strong>Kirim Laporan</strong>.</li><li>Di halaman yang sama, bagian <strong>Laporan Saya</strong> menunjukkan perkembangannya: Terkirim, Sedang diproses, lalu Selesai.</li><li>Kalau admin mengubah status atau menulis catatan, kamu mendapat notifikasi dan kartu <strong>🔔 Update laporanmu</strong> di Beranda. Klik <em>Tandai sudah dibaca</em> kalau sudah dilihat.</li></ol></details>
        <details class="admin-guide" style="display:none;"><summary>🛠️ Panduan Admin</summary>
          <ol><li><strong>Menambah konten:</strong> form berwarna putus-putus di tiap halaman (pengumuman, tugas, materi, lab, dan seterusnya) hanya terlihat oleh admin. Isi lalu klik Simpan. Tombol Hapus muncul di tiap data.</li>
          <li><strong>Menu Laporan:</strong> buka <em>Bantuan, Laporan Masuk</em>. Angka merah di menu menunjukkan laporan yang belum selesai.</li>
          <li><strong>Mengolah laporan:</strong> tulis catatan untuk pelapor (opsional), lalu klik <em>Proses</em> saat mulai dikerjakan, dan <em>Selesai</em> kalau sudah beres. Mahasiswa pelapor otomatis mendapat notifikasi di Beranda.</li>
          <li><strong>Filter:</strong> pakai tombol Belum selesai, Selesai, atau Semua. Klik Muat ulang untuk mengecek laporan baru.</li>
          <li><strong>Setelan:</strong> tombol ⚙️ Setelan di kanan atas untuk mode maintenance, pengumuman global, dan mengganti kode admin.</li></ol></details>
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
        { id: 'latihan', ico: '✍️', label: 'Latihan', tabs: [['soal', 'Soal Isian'], ['cbt', 'Simulasi CBT']] },
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
