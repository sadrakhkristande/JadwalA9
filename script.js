// ==========================================================================
// LOGIKA PORTAL AKADEMIK A9 (MODERN UI & SUPABASE)
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
        const keys = ['pengumuman', 'reminder', 'tugas', 'laboratorium', 'skills_lab', 'tutorial', 'materi', 'jadwal', 'soal', 'config', 'cbt_soal'];
        for (const k of keys) {
            const { data, error } = await supabaseClient.from('portal_db').select('value').eq('key', k).single();
            if (!error && data && data.value) {
                if (k === 'config') {
                    dbData.maintenance = data.value.maintenance || false;
                    dbData.theme = data.value.theme || 'light';
                    dbData.globalAnnouncement = data.value.globalAnnouncement || '';
                    dbData.adminCode = data.value.adminCode || 'A9ACOR';
                } else if (k === 'jadwal') {
                    dbData.jadwalCustom = data.value || [];
                } else {
                    dbData[k] = data.value || [];
                }
            }
        }
    } catch (err) { console.error("Gagal memuat Supabase:", err); }

    if (!dbData.soal || dbData.soal.length === 0) {
        dbData.soal = [{ id: 1, category: "anatomi", question: "Sebutkan tulang selangka?", answer: "Clavicula", explanation: "Tulang penghubung sternum dan scapula." }];
    }
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
        const { error } = await supabaseClient.from('portal_db').update({ value: payload }).eq('key', categoryKey);
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
    const update = () => { if(currentUser) sessionStorage.setItem('portal_last_active', Date.now().toString()); };
    window.addEventListener('mousemove', update); window.addEventListener('keydown', update); window.addEventListener('click', update);
    setInterval(() => {
        const lastActive = sessionStorage.getItem('portal_last_active');
        if(currentUser && lastActive && (Date.now() - parseInt(lastActive) > INACTIVITY_LIMIT)) {
            alert('Sesi berakhir karena tidak ada aktivitas.'); handleLogout();
        }
    }, 60000);
}

function startClock() {
    setInterval(() => {
        const el = document.getElementById('wib-clock');
        if(el) el.innerText = `${new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', weekday: 'short', day: 'numeric', month: 'short' })}`;
    }, 1000);
}

// ==========================================================================
// LOGIKA CBT (MODE LATIHAN / EXAM, ACAK 100 DARI 300, & LAPORAN)
// ==========================================================================
let cbtTimeInSeconds = 0, cbtTimerInterval = null, cbtStarted = false;
let cbtMode = 'practice'; 
let currentCbtQuestions = [];
let cbtAnswers = {}; 
const CBT_LETTERS = ['A', 'B', 'C', 'D', 'E'];
const EXAM_DURATION = 100 * 60; // 100 Menit

function cbtFormatTime(total) {
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
    
    // Acak Soal (Shuffle) & Ambil 100
    let allQuestions = [...dbData.cbt_soal];
    allQuestions.sort(() => Math.random() - 0.5);
    currentCbtQuestions = allQuestions.slice(0, 100); // Ambil 100 soal acak

    // Set Timer Awal
    if (cbtMode === 'exam') {
        cbtTimeInSeconds = EXAM_DURATION;
    } else {
        cbtTimeInSeconds = 0;
    }
    
    document.getElementById('cbt-timer').innerText = cbtFormatTime(cbtTimeInSeconds);
    document.getElementById('cbt-start-card').style.display = 'none';
    document.getElementById('cbt-active-area').style.display = 'block';
    document.getElementById('cbt-result-card').style.display = 'none';

    // Render Soal
    let html = '';
    currentCbtQuestions.forEach((q, idx) => {
        let imgHtml = q.image ? `<div class="cbt-image-container"><img src="${q.image}" class="cbt-image" alt="Ilustrasi Soal"></div>` : '';
        
        let optionsHtml = '';
        q.options.forEach((opt, i) => {
            const safeOpt = opt.replace(/'/g, "\\'");
            optionsHtml += `
                <li>
                    <label class="option-label" id="label-cbt-${q.id}-${i}">
                        <input type="radio" name="cbt-q${q.id}" value="${safeOpt}" onchange="selectCBTAnswer(${q.id}, '${safeOpt}', this)">
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

    // Jalankan Timer
    if (cbtTimerInterval) clearInterval(cbtTimerInterval);
    cbtTimerInterval = setInterval(() => {
        if (cbtMode === 'exam') {
            cbtTimeInSeconds--;
            document.getElementById('cbt-timer').innerText = cbtFormatTime(cbtTimeInSeconds);
            if (cbtTimeInSeconds <= 0) {
                clearInterval(cbtTimerInterval);
                alert("⏰ Waktu Ujian Habis! Jawaban otomatis disimpan.");
                submitCBT();
            }
        } else {
            cbtTimeInSeconds++;
            document.getElementById('cbt-timer').innerText = cbtFormatTime(cbtTimeInSeconds);
        }
    }, 1000);
};

window.selectCBTAnswer = function(qId, selectedOpt, inputEl) {
    cbtAnswers[qId] = selectedOpt;
    const q = dbData.cbt_soal.find(item => item.id === qId);

    if (cbtMode === 'practice') {
        document.querySelectorAll(`input[name="cbt-q${qId}"]`).forEach(el => el.disabled = true);
        const feedbackEl = document.getElementById(`cbt-feedback-${qId}`);
        feedbackEl.style.display = 'block';

        if (selectedOpt === q.answer) {
            inputEl.closest('.option-label').classList.add('correct-answer');
            feedbackEl.className = 'cbt-feedback feedback-success';
            feedbackEl.innerHTML = `<strong>✅ Benar!</strong><br><br><em>Pembahasan:</em> ${q.explanation}`;
        } else {
            inputEl.closest('.option-label').classList.add('wrong-answer');
            feedbackEl.className = 'cbt-feedback feedback-danger';
            feedbackEl.innerHTML = `<strong>❌ Salah!</strong> Jawaban yang benar adalah: <strong>${q.answer}</strong><br><br><em>Pembahasan:</em> ${q.explanation}`;
            
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

window.submitCBT = function() {
    let answeredCount = Object.keys(cbtAnswers).length;
    
    if (answeredCount < currentCbtQuestions.length) {
        if (!confirm(`Anda baru menjawab ${answeredCount} dari ${currentCbtQuestions.length} soal. Yakin ingin menyelesaikan?`)) return;
    }
    
    if (cbtTimerInterval) { clearInterval(cbtTimerInterval); cbtTimerInterval = null; }
    
    let correctCount = 0;
    let wrongCount = 0;
    let wrongTopics = {}; 

    currentCbtQuestions.forEach(q => {
        const userAnswer = cbtAnswers[q.id];
        if (userAnswer === q.answer) {
            correctCount++;
        } else if (userAnswer) {
            wrongCount++;
            if (q.topic) wrongTopics[q.topic] = (wrongTopics[q.topic] || 0) + 1;
        } else {
            wrongCount++; 
        }
    });

    const total = currentCbtQuestions.length;
    const score = Math.round((correctCount / total) * 100);

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
            <span class="report-value">${cbtFormatTime(cbtMode === 'exam' ? EXAM_DURATION - cbtTimeInSeconds : cbtTimeInSeconds)}</span>
        </div>
    `;

    if (Object.keys(wrongTopics).length > 0) {
        reportHtml += `<div class="report-recommendation">
            <h5>📚 Rekomendasi Belajar (Fokus Tingkatkan):</h5>
            <ul>`;
        for (const [topic, count] of Object.entries(wrongTopics)) {
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
};

window.resetCBT = function() {
    if (cbtTimerInterval) clearInterval(cbtTimerInterval);
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
    if(btn) btn.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.toggleLoginFields = function() {
    const role = document.getElementById('login-role').value;
    document.getElementById('guest-fields').style.display = role === 'guest' ? 'block' : 'none';
    document.getElementById('admin-fields').style.display = role === 'admin' ? 'block' : 'none';
};

window.closeModal = function(id) { document.getElementById(id).style.display = 'none'; };
function applyTheme(theme) { 
    if(theme === 'dark') document.body.classList.add('theme-dark'); 
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
    
    // Hapus data berdasarkan index (atau ID jika menggunakan filter)
    if (Array.isArray(dbData[category])) {
        dbData[category].splice(index, 1);
        await saveCategoryData(category);
        alert('Data berhasil dihapus.');
    }
};

function renderAll() {
    const isAdmin = currentUser && currentUser.role === 'admin';

    // Render Pengumuman
    const pList = document.getElementById('pengumuman-list');
    if(pList) pList.innerHTML = dbData.pengumuman.length === 0 ? '<p style="color:var(--text-muted);">Belum ada pengumuman.</p>' : dbData.pengumuman.map((p, idx) => `
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
    if(tBody) tBody.innerHTML = dbData.tugas.map((t, idx) => `
        <tr>
            <td data-label="Tugas"><strong>${t.nama}</strong></td>
            <td data-label="Deadline">${t.deadline}</td>
            <td data-label="Aksi">${t.link !== '#' ? `<a href="${t.link}" target="_blank" class="btn btn-sm btn-primary">Lihat</a>` : '-'}</td>
            ${isAdmin ? `<td class="admin-only" data-label="Aksi"><button class="btn btn-danger btn-sm" onclick="deleteItem('tugas', ${idx})">Hapus</button></td>` : ''}
        </tr>
    `).join('');
    
    // Render Materi
    const mBody = document.getElementById('materi-table-body');
    if(mBody) mBody.innerHTML = dbData.materi.map((m, idx) => `
        <tr>
            <td data-label="Mata Kuliah"><strong>${m.kuliah}</strong></td>
            <td data-label="Topik">${m.materi}</td>
            <td data-label="Aksi"><a href="${m.link}" target="_blank" class="btn btn-sm btn-outline">Buka</a></td>
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
    if(remList) remList.innerHTML = dbData.reminder.map((r, idx) => `
        <li><span>${r}</span> ${isAdmin ? `<button class="btn btn-danger btn-sm" onclick="deleteItem('reminder', ${idx})">Hapus</button>` : ''}</li>
    `).join('');

    const upList = document.getElementById('jadwal-update-list');
    if(upList) upList.innerHTML = dbData.jadwalUpdates.map((u, idx) => `
        <li><span>${u}</span> ${isAdmin ? `<button class="btn btn-danger btn-sm" onclick="deleteItem('jadwalUpdates', ${idx})">Hapus</button>` : ''}</li>
    `).join('');
    
    // Render Jadwal
    const jBody = document.getElementById('jadwal-table-body');
    if(jBody) jBody.innerHTML = dbData.jadwalCustom.length === 0 ? '<tr><td colspan="5" style="text-align:center;">Tidak ada jadwal hari ini/besok.</td></tr>' : dbData.jadwalCustom.map((j, idx) => `
        <tr>
            <td data-label="Tanggal"><strong>${j.tgl}</strong></td>
            <td data-label="Sesi 1">${j.sesi[0].jam}<br><small>${j.sesi[0].kegiatan}</small></td>
            <td data-label="Sesi 2">${j.sesi[1].jam}<br><small>${j.sesi[1].kegiatan}</small></td>
            <td data-label="Sesi 3">${j.sesi[2].jam}<br><small>${j.sesi[2].kegiatan}</small></td>
            <td data-label="Sesi 4">${j.sesi[3].jam}<br><small>${j.sesi[3].kegiatan}</small></td>
        </tr>
    `).join('');
}

// Admin Form Handlers
window.addPengumuman = async function() {
    const judul = document.getElementById('p-judul').value;
    const isi = document.getElementById('p-isi').value;
    const deadline = document.getElementById('p-deadline').value;
    if(!judul || !isi || !deadline) return alert('Semua kolom wajib diisi!');
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
    if(!nama || !deadline) return alert('Nama dan Deadline wajib diisi!');
    
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
    const nama = document.getElementById(idNama).value; const skenario = document.getElementById(idSkenario).value;
    const ket = document.getElementById(idKet).value; const manualLink = document.getElementById(idLink).value.trim();
    if(!nama) return alert('Nama wajib diisi!');
    
    let finalLink = manualLink || '#';
    const uploadedUrl = await uploadFileToSupabaseStorage(idFilePc);
    if (uploadedUrl) { finalLink = uploadedUrl; }
    
    dbData[category].push({ id: Date.now(), nama, skenario, ket, link: finalLink });
    await saveCategoryData(category);
    document.getElementById(idNama).value = ''; document.getElementById(idSkenario).value = ''; document.getElementById(idKet).value = ''; 
    document.getElementById(idFilePc).value = ''; document.getElementById(idLink).value = '';
    alert('Berhasil disimpan!');
};

window.handleMateriUpload = async function() {
    const kuliah = document.getElementById('m-kuliah').value; const materi = document.getElementById('m-materi').value;
    const manualLink = document.getElementById('m-link-manual').value.trim();
    if(!kuliah || !materi) return alert('Nama kuliah dan materi wajib diisi!');
    
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
    const val = document.getElementById('rem-text').value; if(!val) return;
    dbData.reminder.push(val); await saveCategoryData('reminder'); document.getElementById('rem-text').value = '';
};

window.addJadwalUpdateWithFile = async function() {
    const title = document.getElementById('up-title').value; if(!title) return;
    dbData.jadwalUpdates.push(title); await saveCategoryData('jadwalUpdates'); document.getElementById('up-title').value = '';
};

window.toggleMaintenanceMode = async function() { dbData.maintenance = !dbData.maintenance; await saveCategoryData('config'); alert('Status diubah'); };
window.openAdminSettingsModal = function() { document.getElementById('admin-settings-modal').style.display = 'flex'; };
window.saveAdminSettings = async function() { dbData.globalAnnouncement = document.getElementById('cfg-global-msg').value; dbData.adminCode = document.getElementById('cfg-admin-code').value; await saveCategoryData('config'); window.closeModal('admin-settings-modal'); alert('Tersimpan'); };
window.openPreviewModal = function(url) { document.getElementById('preview-frame').src = url; document.getElementById('preview-modal').style.display = 'flex'; };
window.closePreviewModal = function() { document.getElementById('preview-modal').style.display = 'none'; document.getElementById('preview-frame').src = ''; };

window.startQuiz = function() {
    document.getElementById('quiz-start-card').style.display = 'none';
    document.getElementById('quiz-active-area').style.display = 'block';
    document.getElementById('soal-cards-container').innerHTML = dbData.soal.map((s, i) => `<div class="card"><p>${i+1}. ${s.question}</p><input type="text" id="ans_${s.id}" class="modern-input" placeholder="Ketik jawaban..."></div>`).join('');
};
window.submitQuiz = function() { alert("Fitur evaluasi disederhanakan."); };
window.resetQuiz = function() { window.startQuiz(); };
window.openJadwalModal = function() { alert("Fitur edit jadwal via UI sedang dalam pengembangan. Menggunakan Supabase."); };
