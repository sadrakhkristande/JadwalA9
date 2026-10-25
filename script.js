// ==========================================================================
// KONFIGURASI PENGGUNA & KONEKSI SUPABASE
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
// INISIALISASI APLIKASI
// ==========================================================================
window.addEventListener('DOMContentLoaded', async () => {
    await fetchDatabaseFromCloud();
    applyTheme(dbData.theme || 'light');
    checkMaintenanceStatus();
    checkGlobalAnnouncement();
    
    const nimInput = document.getElementById('login-nim-input');
    const adminInput = document.getElementById('login-admin-code');
    if (nimInput) nimInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleLogin(); });
    if (adminInput) adminInput.addEventListener('keypress', e => { if (e.key === 'Enter') handleLogin(); });

    const savedUser = sessionStorage.getItem('portal_current_user');
    const lastActive = sessionStorage.getItem('portal_last_active');
    if (savedUser && lastActive && (Date.now() - parseInt(lastActive) < INACTIVITY_LIMIT)) {
        currentUser = JSON.parse(savedUser);
        initApp();
        setupInactivityTracker();
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
        if (categoryKey === 'config') payload = { maintenance: dbData.maintenance, theme: dbData.theme, globalAnnouncement: dbData.globalAnnouncement, adminCode: dbData.adminCode };
        else if (categoryKey === 'jadwal') payload = dbData.jadwalCustom;
        
        const { error } = await supabaseClient.from('portal_db').update({ value: payload }).eq('key', categoryKey);
        if (error) throw error;
    } catch (err) { console.error(`Gagal simpan ${categoryKey}:`, err); }
}

window.handleLogin = function() {
    try {
        const roleEl = document.getElementById('login-role');
        const role = roleEl ? roleEl.value : 'guest';
        
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
    document.getElementById('user-info').innerText = `${currentUser.name} — (${currentUser.role.toUpperCase()})`;
    
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

window.handleLogout = function() {
    sessionStorage.clear();
    location.reload();
};

function setupInactivityTracker() {
    const update = () => { if(currentUser) sessionStorage.setItem('portal_last_active', Date.now().toString()); };
    window.addEventListener('mousemove', update); window.addEventListener('keydown', update); window.addEventListener('click', update);
    setInterval(() => {
        const lastActive = sessionStorage.getItem('portal_last_active');
        if(currentUser && lastActive && (Date.now() - parseInt(lastActive) > INACTIVITY_LIMIT)) {
            alert('Sesi berakhir.'); handleLogout();
        }
    }, 60000);
}

function startClock() {
    setInterval(() => {
        const el = document.getElementById('wib-clock');
        if(el) el.innerText = `Waktu WIB: ${new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
    }, 1000);
}

// ==========================================================================
// FUNGSI CBT (Mengambil Soal dari Supabase)
// ==========================================================================
let cbtTimeInSeconds = 0, cbtTimerInterval = null, cbtStarted = false;
const CBT_LETTERS = ['A', 'B', 'C', 'D', 'E'];

function cbtFormatTime(total) {
    const h = String(Math.floor(total / 3600)).padStart(2, '0');
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

window.startCBT = function() {
    if (cbtStarted) return;
    if (!dbData.cbt_soal || dbData.cbt_soal.length === 0) {
        alert("Soal CBT belum dimasukkan ke database Supabase (key: cbt_soal).");
        return;
    }

    cbtStarted = true;
    cbtTimeInSeconds = 0;
    document.getElementById('cbt-start-card').style.display = 'none';
    document.getElementById('cbt-active-area').style.display = 'block';
    document.getElementById('cbt-result-card').style.display = 'none';
    document.getElementById('cbt-total-label').innerText = dbData.cbt_soal.length;

    let html = '';
    dbData.cbt_soal.forEach(q => {
        let optionsHtml = '';
        q.options.forEach((opt, i) => {
            optionsHtml += `<li><label class="option-label" onclick="cbtHighlightOption(this)"><input type="radio" name="cbt-q${q.id}" value="${CBT_LETTERS[i]}"><span class="option-text">${CBT_LETTERS[i]}. ${opt}</span></label></li>`;
        });
        html += `<div class="question-card"><div class="q-header">Soal ${q.id}</div><div class="q-text">${q.text}</div><ul class="options">${optionsHtml}</ul></div>`;
    });
    document.getElementById('cbt-question-container').innerHTML = html;

    if (cbtTimerInterval) clearInterval(cbtTimerInterval);
    cbtTimerInterval = setInterval(() => {
        cbtTimeInSeconds++;
        document.getElementById('cbt-timer').innerText = `Waktu: ${cbtFormatTime(cbtTimeInSeconds)}`;
    }, 1000);
};

window.cbtHighlightOption = function(labelElement) {
    const groupName = labelElement.querySelector('input').name;
    document.querySelectorAll(`#tab-cbt input[name="${groupName}"]`).forEach(inp => inp.closest('.option-label').classList.remove('selected'));
    labelElement.classList.add('selected');
};

window.submitCBT = function() {
    let answered = 0;
    dbData.cbt_soal.forEach(q => {
        if (document.querySelector(`#tab-cbt input[name="cbt-q${q.id}"]:checked`)) answered++;
    });

    if (answered < dbData.cbt_soal.length) {
        if (!confirm(`Baru menjawab ${answered} dari ${dbData.cbt_soal.length} soal. Yakin selesai?`)) return;
    }
    if (cbtTimerInterval) { clearInterval(cbtTimerInterval); cbtTimerInterval = null; }
    
    document.querySelectorAll('#tab-cbt input[type="radio"]').forEach(i => i.disabled = true);
    document.getElementById('cbt-active-area').style.display = 'none';
    document.getElementById('cbt-result-card').style.display = 'block';
    document.getElementById('cbt-result-text').innerHTML = `Anda menjawab <strong>${answered}</strong> dari <strong>${dbData.cbt_soal.length}</strong> soal.<br>Waktu: <strong>${cbtFormatTime(cbtTimeInSeconds)}</strong>`;
};

window.resetCBT = function() {
    if (cbtTimerInterval) clearInterval(cbtTimerInterval);
    cbtStarted = false; cbtTimeInSeconds = 0;
    document.getElementById('cbt-start-card').style.display = 'block';
    document.getElementById('cbt-active-area').style.display = 'none';
    document.getElementById('cbt-result-card').style.display = 'none';
    document.getElementById('cbt-question-container').innerHTML = '';
};

// ==========================================================================
// FUNGSI LAINNYA (Disederhanakan agar tidak error & memuat cepat)
// ==========================================================================
window.switchTab = function(tab, btn) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tab}`).style.display = 'block';
    if(btn) btn.classList.add('active');
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
    dbData.theme = document.getElementById('theme-toggle-checkbox').checked ? 'dark' : 'light';
    applyTheme(dbData.theme);
    await saveCategoryData('config');
};

function renderAll() {
    // Render Pengumuman
    const pList = document.getElementById('pengumuman-list');
    if(pList) pList.innerHTML = dbData.pengumuman.length === 0 ? '<p>Belum ada pengumuman.</p>' : dbData.pengumuman.map(p => `<div class="card" style="margin-bottom:10px; padding:15px; background:var(--bg-light);"><h4>${p.judul}</h4><p>${p.isi}</p><small>${p.deadline}</small></div>`).join('');

    // Render Tugas
    const tBody = document.getElementById('tugas-table-body');
    if(tBody) tBody.innerHTML = dbData.tugas.map(t => `<tr><td>${t.nama}</td><td>${t.deadline}</td><td>${t.link !== '#' ? `<a href="${t.link}" target="_blank">Lihat</a>` : '-'}</td></tr>`).join('');
    
    // Render Materi
    const mBody = document.getElementById('materi-table-body');
    if(mBody) mBody.innerHTML = dbData.materi.map(m => `<tr><td>${m.kuliah}</td><td>${m.materi}</td><td><a href="${m.link}" target="_blank">Buka</a></td></tr>`).join('');
}

window.startQuiz = function() {
    document.getElementById('quiz-start-card').style.display = 'none';
    document.getElementById('quiz-active-area').style.display = 'block';
    document.getElementById('soal-cards-container').innerHTML = dbData.soal.map((s, i) => `<div class="card"><p>${i+1}. ${s.question}</p><input type="text" id="ans_${s.id}" class="input-field"></div>`).join('');
};
window.submitQuiz = function() { alert("Fitur evaluasi disederhanakan."); };
window.resetQuiz = function() { window.startQuiz(); };
window.toggleMaintenanceMode = async function() { dbData.maintenance = !dbData.maintenance; await saveCategoryData('config'); alert('Status diubah'); };
window.openAdminSettingsModal = function() { document.getElementById('admin-settings-modal').style.display = 'flex'; };
window.saveAdminSettings = async function() { dbData.globalAnnouncement = document.getElementById('cfg-global-msg').value; dbData.adminCode = document.getElementById('cfg-admin-code').value; await saveCategoryData('config'); window.closeModal('admin-settings-modal'); alert('Tersimpan'); };
window.openPreviewModal = function(url) { document.getElementById('preview-frame').src = url; document.getElementById('preview-modal').style.display = 'flex'; };
window.closePreviewModal = function() { document.getElementById('preview-modal').style.display = 'none'; document.getElementById('preview-frame').src = ''; };

// Placeholder functions to prevent JS Errors
window.addPengumuman = async () => alert('Fitur tambah pengumuman via UI disederhanakan.');
window.addTugasItem = async () => alert('Fitur tambah tugas via UI disederhanakan.');
window.addReminder = async () => alert('Fitur reminder disederhanakan.');
window.addJadwalUpdateWithFile = async () => alert('Fitur update jadwal disederhanakan.');
window.handlePraktikumUpload = async () => alert('Fitur upload disederhanakan.');
window.handleMateriUpload = async () => alert('Fitur materi disederhanakan.');
window.openJadwalModal = () => alert('Fitur edit jadwal disederhanakan.');
window.saveJadwalItem = () => alert('Simpan jadwal disederhanakan.');
window.openSoalModal = () => alert('Fitur edit soal disederhanakan.');
window.saveSoalItem = () => alert('Simpan soal disederhanakan.');
window.openEditMateriModal = () => alert('Fitur edit materi disederhanakan.');
