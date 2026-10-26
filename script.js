// ==========================================================================
// PORTAL AKADEMIK A9 — SATU FILE (rewrite)
// Berisi: script.js + tambahan-v2.js + tambahan-v3.js
// Urutan pemuatan WAJIB dipertahankan seperti ini.
// ==========================================================================

// ==========================================================================
// BAGIAN 1 — script.js (LOGIKA INTI)
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
    maintenance: false, globalAnnouncement: '', adminCode: 'A9ACOR', theme: 'light', laporan: []
};

function cleanText(t) {
    return String(t == null ? '' : t).replace(/\s*\[cite:[^\]]*\]/g, '');
}

window.addEventListener('DOMContentLoaded', async () => {
    const loadP = fetchDatabaseFromCloud();
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
    try {
        const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
        if (c) { Object.keys(c).forEach(k => applyKey(k, c[k])); renderAll(); }
    } catch (e) { }
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
        const roleEl = document.getElementById('login-role');
        const role = roleEl ? roleEl.value : 'guest';
        if (role === 'admin') {
            const codeEl = document.getElementById('login-admin-code');
            const code = codeEl ? codeEl.value.trim() : '';
            if (code === (dbData.adminCode || 'A9ACOR')) {
                currentUser = { role: 'admin', name: 'Admin Utama' };
                finishLogin();
            } else { alert('Kode Admin Salah!'); }
        } else {
            if (dbData.maintenance) { alert('⚠️ PORTAL SEDANG MAINTENANCE.'); return; }
            const nimEl = document.getElementById('login-nim-input');
            const nim = nimEl ? nimEl.value.trim() : '';
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

    const lp = document.getElementById('login-page'); if (lp) lp.style.display = 'none';
    const ma = document.getElementById('main-app'); if (ma) ma.style.display = 'block';
    const ui = document.getElementById('user-info');
    if (ui) ui.innerText = `${currentUser.name} (${currentUser.role === 'admin' ? 'Admin' : 'Mahasiswa'})`;

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
// LOGIKA CBT DASAR (di-override oleh BAGIAN 4 — disimpan agar kompatibel)
// ==========================================================================
let cbtTimeInSeconds = 0, cbtTimerInterval = null, cbtStarted = false;
let cbtMode = 'practice';
let currentCbtQuestions = [];
let cbtAnswers = {};
const CBT_LETTERS = ['A', 'B', 'C', 'D', 'E'];
const EXAM_DURATION = 100 * 60;

function cbtFormatTime(total) {
    if (total < 0) total = 0;
    const h = String(Math.floor(total / 3600)).padStart(2, '0');
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

// ==========================================================================
// FUNGSI UI, TAB, TEMA, HAPUS
// ==========================================================================
window.switchTab = function(tab, btn) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-pill').forEach(el => el.classList.remove('active'));
    const t = document.getElementById(`tab-${tab}`); if (t) t.style.display = 'block';
    if (btn) btn.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.toggleLoginFields = function() {
    const roleEl = document.getElementById('login-role'); if (!roleEl) return;
    const role = roleEl.value;
    const gf = document.getElementById('guest-fields'); if (gf) gf.style.display = role === 'guest' ? 'block' : 'none';
    const af = document.getElementById('admin-fields'); if (af) af.style.display = role === 'admin' ? 'block' : 'none';
};

window.closeModal = function(id) { const m = document.getElementById(id); if (m) m.style.display = 'none'; };

function applyTheme(theme) {
    if (theme === 'dark') document.body.classList.add('theme-dark');
    else document.body.classList.remove('theme-dark');
}

window.toggleThemeSwitch = async function() {
    dbData.theme = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
    applyTheme(dbData.theme);
    await saveCategoryData('config');
};

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

    const tBody = document.getElementById('tugas-table-body');
    if (tBody) tBody.innerHTML = dbData.tugas.map((t, idx) => `
        <tr>
            <td data-label="Tugas"><strong>${t.nama}</strong></td>
            <td data-label="Deadline">${t.deadline}</td>
            <td data-label="Berkas">${t.link !== '#' ? `<a href="${t.link}" target="_blank" class="btn btn-sm btn-primary">Lihat</a>` : '-'}</td>
            ${isAdmin ? `<td class="admin-only" data-label="Aksi"><button class="btn btn-danger btn-sm" onclick="deleteItem('tugas', ${idx})">Hapus</button></td>` : ''}
        </tr>
    `).join('');

    const mBody = document.getElementById('materi-table-body');
    if (mBody) mBody.innerHTML = dbData.materi.map((m, idx) => `
        <tr>
            <td data-label="Mata Kuliah"><strong>${m.kuliah}</strong></td>
            <td data-label="Topik">${m.materi}</td>
            <td data-label="Akses"><a href="${m.link}" target="_blank" class="btn btn-sm btn-outline">Buka</a></td>
            ${isAdmin ? `<td class="admin-only" data-label="Aksi"><button class="btn btn-danger btn-sm" onclick="deleteItem('materi', ${idx})">Hapus</button></td>` : ''}
        </tr>
    `).join('');

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
    const judul = (document.getElementById('p-judul') || {}).value || '';
    const isi = (document.getElementById('p-isi') || {}).value || '';
    const deadline = (document.getElementById('p-deadline') || {}).value || '';
    if (!judul || !isi || !deadline) return alert('Semua kolom wajib diisi!');
    dbData.pengumuman.unshift({ id: Date.now(), judul, isi, deadline });
    await saveCategoryData('pengumuman');
    document.getElementById('p-judul').value = ''; document.getElementById('p-isi').value = ''; document.getElementById('p-deadline').value = '';
    alert('Pengumuman ditambahkan!');
};

window.addTugasItem = async function() {
    const nama = (document.getElementById('t-nama') || {}).value || '';
    const deadline = (document.getElementById('t-deadline') || {}).value || '';
    const ket = (document.getElementById('t-ket') || {}).value || '';
    const manualLink = ((document.getElementById('t-link-manual') || {}).value || '').trim();
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
    const ketEl = document.getElementById(idKet);
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
    if (newCode) dbData.adminCode = newCode;
    await saveCategoryData('config');
    window.closeModal('admin-settings-modal');
    alert('Tersimpan');
};

window.openPreviewModal = function(url) { document.getElementById('preview-frame').src = url; document.getElementById('preview-modal').style.display = 'flex'; };
window.closePreviewModal = function() { document.getElementById('preview-modal').style.display = 'none'; document.getElementById('preview-frame').src = ''; };

// ==========================================================================
// LATIHAN SOAL ISIAN
// ==========================================================================
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
    document.getElementById('quiz-score-text').innerText = `Skor: ${benar} dari ${total} (${total ? Math.round(benar / total * 100) : 0}%)`;
    document.getElementById('quiz-result-card').style.display = 'block';
    document.getElementById('submit-quiz-btn').style.display = 'none';
    document.getElementById('reset-quiz-btn').style.display = 'inline-flex';
};

window.resetQuiz = function() { window.startQuiz(); };
window.openJadwalModal = function() { alert("Fitur edit jadwal via UI sedang dalam pengembangan. Menggunakan Supabase."); };

// ==========================================================================
// CSS TAMBAHAN (di-inject)
// ==========================================================================
(function () {
    const st = document.createElement('style');
    st.id = 'tambahan-css';
    st.textContent = `html { scroll-behavior: smooth; }
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
#toast-wrap { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 20000; display: flex; flex-direction: column; gap: 8px; align-items: center; width: min(92vw, 420px); pointer-events: none; }
.toast { background: var(--text-main); color: var(--bg-card); padding: 12px 18px; border-radius: 12px; font-size: 14px; font-weight: 600; box-shadow: var(--shadow-lg); width: 100%; text-align: center; animation: toastIn .25s ease; }
@keyframes toastIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.greeting { background: linear-gradient(135deg, var(--primary), var(--primary-hover)); color: #fff; border-radius: var(--radius-xl); padding: 22px 26px; margin-bottom: 25px; }
.greeting h3 { font-size: 22px; margin-bottom: 2px; }
.greeting p { opacity: .92; font-size: 14px; }
.dl-badge { display: inline-block; margin-left: 8px; padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
.dl-late { background: #fee2e2; color: #991b1b; }
.dl-soon { background: #fef3c7; color: #92400e; }
.dl-ok { background: var(--primary-light); color: var(--primary); }
.search-box { margin-bottom: 15px; }
.review-box, .history-box { margin-top: 20px; }
.review-box h5, .history-box h5 { font-size: 15px; margin-bottom: 10px; }
.review-item { border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 10px 14px; margin-bottom: 8px; font-size: 14px; }
.review-item summary { cursor: pointer; font-weight: 600; }
.review-item p { margin-top: 8px; color: var(--text-muted); }
#to-top { position: fixed; right: 18px; bottom: 90px; z-index: 650; width: 44px; height: 44px; border-radius: 50%; border: none; background: var(--primary); color: #fff; font-size: 18px; cursor: pointer; box-shadow: var(--shadow-lg); display: none; }`;
    document.head.appendChild(st);
})();

// ==========================================================================
// TAMBAHAN FITUR — toast, pencarian, sapaan, tombol ke atas, timer warning
// ==========================================================================
(function () {
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const $ = id => document.getElementById(id);

    const wrap = document.createElement('div');
    wrap.id = 'toast-wrap'; wrap.setAttribute('role', 'status'); wrap.setAttribute('aria-live', 'polite');
    document.body.appendChild(wrap);
    window.alert = function (msg) {
        const t = document.createElement('div');
        t.className = 'toast'; t.textContent = String(msg);
        wrap.appendChild(t);
        setTimeout(() => t.remove(), 3800);
    };

    setInterval(() => {
        const t = $('cbt-timer'); if (!t) return;
        let warn = false;
        try { warn = typeof cbtStarted !== 'undefined' && cbtStarted && cbtMode === 'exam' && cbtTimeInSeconds <= 600; } catch (e) { }
        t.classList.toggle('cbt-timer-warn', warn);
    }, 1000);

    function addSearch(bodyId, placeholder) {
        const body = $(bodyId); if (!body || $('search-' + bodyId)) return;
        const wrapEl = body.closest('.table-responsive');
        if (!wrapEl) return;
        const input = document.createElement('input');
        input.type = 'search'; input.id = 'search-' + bodyId; input.className = 'modern-input search-box'; input.placeholder = placeholder;
        input.addEventListener('input', () => applyFilter(bodyId));
        wrapEl.before(input);
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

    const up = document.createElement('button');
    up.id = 'to-top'; up.type = 'button'; up.setAttribute('aria-label', 'Kembali ke atas'); up.textContent = '▲';
    up.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
    document.body.appendChild(up);
    window.addEventListener('scroll', () => { up.style.display = window.scrollY > 400 ? 'block' : 'none'; });
})();

// ==========================================================================
// NAVIGASI SEDERHANA, PANDUAN, & LAPORAN
// ==========================================================================
(function () {
    const $ = id => document.getElementById(id);
    const esc = x => String(x == null ? '' : x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const isAdmin = () => typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'admin';
    const isGuest = () => typeof currentUser !== 'undefined' && currentUser && currentUser.role === 'guest';
    const fmt = d => new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    const KEY = 'laporan';
    const STAT = { baru: 'Terkirim', proses: 'Sedang diproses', selesai: 'Selesai' };

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

    const main = document.querySelector('.main-content');
    if (!main) { console.error('[A9] .main-content tidak ditemukan, navigasi tidak bisa dipasang.'); return; }
    main.insertAdjacentHTML('beforeend', `
    <div id="tab-panduan" class="tab-content" style="display:none;">
      <div class="card guide">
        <div class="card-header"><h3 class="card-title">📖 Panduan Penggunaan Portal</h3></div>
        <details open><summary>1. Cara menggunakan menu</summary>
          <p>Menu utama ada di bagian atas: <strong>Beranda, Kuliah, Praktikum, Latihan, Bantuan</strong>. Klik salah satunya, lalu pilih halaman di baris kedua.</p></details>
        <details><summary>2. Masuk ke portal</summary>
          <ol><li>Pilih peran <strong>Mahasiswa</strong>, lalu isi NIM.</li><li>Klik <strong>Masuk Portal</strong>.</li><li>Sesi berakhir setelah 30 menit tanpa aktivitas.</li></ol></details>
        <details><summary>5. Latihan soal isian</summary>
          <ol><li>Buka <strong>Latihan, Soal Isian</strong>, lalu klik <strong>Mulai Latihan</strong>.</li><li>Ketik jawaban. Huruf besar-kecil dan awalan "Os", "M.", "N." tidak berpengaruh.</li><li>Klik <strong>Submit Jawaban</strong> untuk melihat skor dan pembahasan.</li></ol></details>
        <details class="guest-guide"><summary>7. Melapor masalah</summary>
          <ol><li>Buka <strong>Bantuan, Lapor Masalah</strong>, isi lalu klik <strong>Kirim Laporan</strong>.</li><li>Perkembangannya bisa dipantau di bagian <strong>Laporan Saya</strong>.</li></ol></details>
        <details class="admin-guide" style="display:none;"><summary>🛠️ Panduan Admin</summary>
          <ol><li>Form berwarna putus-putus di tiap halaman hanya terlihat oleh admin.</li><li>Menu <strong>Bantuan, Laporan Masuk</strong> untuk mengolah laporan mahasiswa.</li><li>Tombol ⚙️ Setelan di kanan atas untuk maintenance, pengumuman global, kode admin.</li></ol></details>
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
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:15px;">
          <button class="btn btn-outline btn-sm lap-filter active" data-f="baru">Belum selesai</button>
          <button class="btn btn-outline btn-sm lap-filter" data-f="selesai">Selesai</button>
          <button class="btn btn-outline btn-sm lap-filter" data-f="semua">Semua</button>
        </div>
        <div id="lap-list"></div>
      </div>
    </div>`);

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

    const GROUPS = [
        { id: 'home', ico: '🏠', label: 'Beranda', tabs: [['home', 'Beranda']] },
        { id: 'kuliah', ico: '📅', label: 'Kuliah', tabs: [['jadwal', 'Jadwal'], ['tugas', 'Tugas'], ['materi', 'Materi']] },
        { id: 'praktikum', ico: '🔬', label: 'Praktikum', tabs: [['lab', 'Lab'], ['skills', 'Skills Lab'], ['tutorial', 'Tutorial']] },
        { id: 'latihan', ico: '✍️', label: 'Latihan', tabs: () => [['soal', 'Soal Isian'], ['cbt', 'Simulasi CBT'], isAdmin() ? ['progres-admin', 'Progres Mahasiswa'] : ['progres', 'Progres Saya']] },
        { id: 'bantuan', ico: '💬', label: 'Bantuan', tabs: () => [['panduan', 'Panduan'], isAdmin() ? ['laporan-admin', 'Laporan Masuk'] : ['lapor', 'Lapor Masalah']] }
    ];
    const tabsOf = g => typeof g.tabs === 'function' ? g.tabs() : g.tabs;
    const oldNav = document.querySelector('.modern-nav');
    if (oldNav) oldNav.style.display = 'none';
    const nav = document.createElement('nav');
    nav.className = 'modern-nav simple-nav';
    nav.innerHTML = '<div id="sn-main" class="sn-row"></div><div id="sn-sub" class="sn-row"></div>';
    if (oldNav) oldNav.after(nav); else main.before(nav);

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
            if ($('lap-nama') && !$('lap-nama').value) $('lap-nama').value = currentUser.name || '';
            if ($('lap-nim')) $('lap-nim').value = currentUser.nim || '';
            refreshMine(false).then(markAllSeen);
        }
        if (tab === 'laporan-admin') refreshAdmin(false);
    };

    const seenKey = () => 'a9_lap_seen_' + (currentUser && currentUser.nim);
    const loadSeen = () => { try { seen = JSON.parse(localStorage.getItem(seenKey())) || {}; } catch (e) { seen = {}; } };
    const saveSeen = () => { try { localStorage.setItem(seenKey(), JSON.stringify(seen)); } catch (e) { } };
    const sig = x => x.status + '|' + (x.tglUpdate || '') + '|' + (x.catatan || '');
    const unread = () => mine.filter(x => x.status !== 'baru' && seen[x.id] !== sig(x));
    function markAllSeen() { unread().forEach(x => { seen[x.id] = sig(x); }); saveSeen(); lastUnread = 0; renderUpdateCard(); renderNav(); }

    $('lap-kirim').addEventListener('click', async () => {
        const v = id => { const el = $(id); return el ? el.value.trim() : ''; };
        if (!v('lap-nama')) { alert('Nama wajib diisi.'); return; }
        if (v('lap-isi').length < 10) { alert('Tulis penjelasan minimal 10 karakter ya.'); return; }
        if (!supabaseClient) { alert('Koneksi ke server belum siap. Coba lagi nanti.'); return; }
        const btn = $('lap-kirim'); btn.disabled = true;
        try {
            const list = await fetchLaporan();
            list.unshift({ id: Date.now(), tgl: new Date().toISOString(), nama: v('lap-nama'), nim: (currentUser && currentUser.nim) || v('lap-nim') || '-', kategori: v('lap-kategori'), lokasi: v('lap-lokasi') || '-', isi: v('lap-isi'), perangkat: navigator.userAgent.slice(0, 90), status: 'baru', catatan: '', tglUpdate: '' });
            await writeLaporan(list.slice(0, 300));
            $('lap-isi').value = ''; $('lap-lokasi').value = '';
            alert('Laporan terkirim.');
            await refreshMine(false);
        } catch (e) { console.error(e); alert('Gagal mengirim laporan. Coba lagi.'); }
        btn.disabled = false;
    });

    function renderMine() {
        const el = $('lap-mine'); if (!el) return;
        if (!mine.length) { el.innerHTML = '<p style="color:var(--text-muted);">Belum ada laporan.</p>'; return; }
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
        if (!c) { c = document.createElement('div'); c.id = 'lap-update-card'; c.className = 'upd-card'; const home = $('tab-home'); if (home) home.prepend(c); }
        if (!c) return;
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
            if (n > 0 && (notify || n > lastUnread)) alert(`🔔 Ada ${n} update untuk laporanmu.`);
            lastUnread = n; renderMine(); renderUpdateCard(); renderNav();
        } catch (e) { console.error('Gagal memuat laporan:', e); }
    }

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
            </div></div>`).join('') : '<p style="color:var(--text-muted);">Tidak ada laporan.</p>';
        renderNav();
    }

    async function refreshAdmin(notify) {
        if (!isAdmin() || !supabaseClient) return;
        try {
            dbData.laporan = await fetchLaporan();
            const baru = dbData.laporan.filter(x => x.status !== 'selesai').length;
            if (baru > 0 && (notify || baru > lastBaru)) alert(`🔔 Ada ${baru} laporan belum selesai.`);
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
// CBT MODEL UJIAN (satu soal per halaman) + HASIL TERSIMPAN + PROGRES + DRIVE
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

    let myResults = [];
    const rKey = () => 'hasil_' + ((currentUser && currentUser.nim) || 'anon');
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
        const tm = $('cbt-timer'); if (tm) { tm.style.display = mode === 'exam' ? '' : 'none'; tm.textContent = cbtFormatTime(cbtTimeInSeconds); }
        if ($('cbt-start-card')) $('cbt-start-card').style.display = 'none';
        if ($('cbt-result-card')) $('cbt-result-card').style.display = 'none';
        if ($('cbt-active-area')) $('cbt-active-area').style.display = 'block';
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
        cbtTimeInSeconds = rem; const tm = $('cbt-timer'); if (tm) tm.textContent = cbtFormatTime(rem);
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

        const box = $('cbt-question-container');
        if (box) box.innerHTML = `
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
        const box = $('cbt-question-container'); if (box) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

    const cqc = $('cbt-question-container');
    if (cqc) {
        cqc.addEventListener('click', e => {
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
    }

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
        c.review = false; const r = c.result;
        const topics = Object.entries(r.wrong).sort((a, b) => b[1] - a[1]);
        const box = $('cbt-report-content');
        if (box) box.innerHTML = `
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
        if ($('cbt-active-area')) $('cbt-active-area').style.display = 'none';
        if ($('cbt-result-card')) $('cbt-result-card').style.display = 'block';
        window.scrollTo({ top: 0 });
    }

    const repc = $('cbt-report-content');
    if (repc) repc.addEventListener('click', e => {
        const b = e.target.closest('[data-rep]'); if (!b || !cbt) return;
        if (b.dataset.rep === 'review') { cbt.review = true; cbt.idx = 0; if ($('cbt-result-card')) $('cbt-result-card').style.display = 'none'; if ($('cbt-active-area')) $('cbt-active-area').style.display = 'block'; renderCbt(); window.scrollTo({ top: 0 }); }
        else window.switchTab('progres', null);
    });

    window.resetCBT = function () {
        if (timer) { clearInterval(timer); timer = null; }
        window.removeEventListener('beforeunload', leaveGuard);
        cbt = null; cbtStarted = false; cbtTimeInSeconds = 0;
        const tm = $('cbt-timer'); if (tm) { tm.style.display = ''; tm.textContent = '00:00:00'; tm.classList.remove('cbt-timer-warn'); }
        if ($('cbt-start-card')) $('cbt-start-card').style.display = 'block';
        if ($('cbt-active-area')) $('cbt-active-area').style.display = 'none';
        if ($('cbt-result-card')) $('cbt-result-card').style.display = 'none';
        if ($('cbt-question-container')) $('cbt-question-container').innerHTML = '';
    };

    const origSubmitQuiz = window.submitQuiz;
    window.submitQuiz = function () {
        origSubmitQuiz();
        const total = dbData.soal.length, benar = document.querySelectorAll('#soal-cards-container .feedback-success').length;
        const skor = total ? Math.round(benar / total * 100) : 0;
        const card = $('quiz-result-card');
        if (card) {
            card.querySelectorAll('.apres').forEach(x => x.remove());
            card.insertAdjacentHTML('afterbegin', apresiasi(skor, prevScore('isian')));
        }
        if (isGuest()) saveResult({ t: Date.now(), jenis: 'isian', skor, benar, total, kosong: total - document.querySelectorAll('#soal-cards-container .feedback-success, #soal-cards-container .feedback-danger').length, durasi: 0, wrong: {} });
    };

    const tl = $('tab-lapor');
    if (tl) tl.insertAdjacentHTML('afterend', `
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
        const el = $('progres-body'); if (!el) return;
        if (!isGuest()) { el.innerHTML = '<p style="color:var(--text-muted);">Halaman ini menampilkan progres belajar mahasiswa setelah mengerjakan soal.</p>'; return; }
        const fEl = $('prog-filter'); const f = fEl ? fEl.value : 'all';
        const arr = myResults.filter(r => f === 'all' || r.jenis === f).sort((a, b) => a.t - b.t);
        if (!arr.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">🌱</div><h3>Belum ada hasil</h3><p>Kerjakan CBT atau Soal Isian. Nilaimu otomatis tersimpan di sini.</p></div>'; return; }
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
    const pf = $('prog-filter'); if (pf) pf.addEventListener('change', renderProgress);

    const osw = window.switchTab;
    window.switchTab = async function (t, b) {
        osw(t, b);
        if (t === 'progres') { if (isGuest()) { const el = $('progres-body'); if (el) el.innerHTML = '<p>Memuat...</p>'; await loadResults(); } renderProgress(); }
    };
    const olog = window.finishLogin;
    window.finishLogin = function () { olog(); if (isGuest()) loadResults(); };

    // ---- Google Drive: pratinjau di portal (LENGKAP) ----
    function driveInfo(u) {
        let m;
        if ((m = u.match(/drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([\w-]+)/)))
            return { open: u, embed: `https://drive.google.com/embeddedfolderview?id=${m[1]}#list`, download: null };
        if ((m = u.match(/drive\.google\.com\/file\/d\/([\w-]+)/)) || (m = u.match(/drive\.google\.com\/(?:open|uc)\?(?:[^#]*&)?id=([\w-]+)/)))
            return {
                open: `https://drive.google.com/file/d/${m[1]}/view`,
                embed: `https://drive.google.com/file/d/${m[1]}/preview`,
                download: `https://drive.google.com/uc?export=download&id=${m[1]}`
            };
        return null;
    }

    const origPreview = window.openPreviewModal;
    window.openPreviewModal = function (url) {
        const info = driveInfo(url);
        if (!info) { if (typeof origPreview === 'function') return origPreview(url); return; }
        const modal = $('preview-modal');
        const frame = $('preview-frame');
        if (!modal || !frame) { if (typeof origPreview === 'function') return origPreview(url); return; }
        frame.src = info.embed;
        let acts = modal.querySelector('.drive-actions');
        if (!acts) {
            acts = document.createElement('div');
            acts.className = 'drive-actions';
            acts.style.cssText = 'display:flex;gap:8px;justify-content:center;margin-top:12px;flex-wrap:wrap;';
            (modal.querySelector('div') || modal).appendChild(acts);
        }
        acts.innerHTML = `<a href="${info.open}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">Buka di Drive</a>`
            + (info.download ? `<a href="${info.download}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">Unduh</a>` : '');
        modal.style.display = 'flex';
    };

    document.addEventListener('click', e => {
        const a = e.target.closest('a[href*="drive.google.com"]');
        if (!a) return;
        if (a.closest('#preview-modal')) return;
        const href = a.getAttribute('href') || '';
        if (!driveInfo(href)) return;
        e.preventDefault();
        window.openPreviewModal(href);
    }, true);
})();

// ==========================================================================
// BAGIAN 5 — tambahan-v3.js (SISTEM DESAIN + PERFORMA + BUGFIX)
// ==========================================================================
(function () {
    'use strict';
    const $ = id => document.getElementById(id);

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
            const wait = new Promise(r => setTimeout(r, 1500));
            try { await Promise.race([window.__dbReady || Promise.resolve(), wait]); } catch (e) { }
            return loginOrig.apply(this, arguments);
        };
    }

    const themeRaw = window.applyTheme;
    const themeOrig = function (t) {
        if (typeof themeRaw === 'function') themeRaw(t);
        else document.body.classList.toggle('theme-dark', t === 'dark');
    };
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
        if (typeof renderOrig === 'function') renderOrig.apply(this, arguments);
        try { fixBadges(); } catch (e) { console.error(e); }
    };

    const logoutOrig = window.handleLogout;
    window.handleLogout = function () {
        if (window.__loggingOut) return;
        window.__loggingOut = true;
        setTimeout(() => {
            if (typeof logoutOrig === 'function') logoutOrig(); else { sessionStorage.clear(); location.reload(); }
        }, 1200);
    };

    window.addEventListener('offline', () => alert('Kamu sedang offline. Perubahan belum bisa tersimpan.'));
    window.addEventListener('online', () => alert('Kembali online.'));
})();

// --------------------------------------------------------------------------
// SISTEM DESAIN
// --------------------------------------------------------------------------
(function () {
    'use strict';

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

html { -webkit-text-size-adjust: 100%; }
body { font-family: var(--font); background: var(--bg-base); color: var(--text-main); line-height: 1.55; letter-spacing: -.003em; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; overscroll-behavior-y: none; }
* { -webkit-tap-highlight-color: transparent; }
button, a, input, select, textarea, summary, label { touch-action: manipulation; }
button, input, select, textarea { font-family: inherit; }
::selection { background: var(--primary-light); color: var(--text-main); }
* { -webkit-backdrop-filter: none !important; backdrop-filter: none !important; }
.card, .btn, .nav-pill, .sn-chip, .chip, .modern-input, .option-label, .fv-folder, .cx-btn {
  transition: background-color .15s ease, border-color .15s ease, color .15s ease, box-shadow .15s ease, transform .15s ease;
}
h1, h2, h3, h4 { letter-spacing: -.02em; line-height: 1.25; }
.tabular, #cbt-timer, .osce-time, #g-timer, .score-number { font-variant-numeric: tabular-nums; }
.main-content { max-width: 1120px; margin-inline: auto; padding-inline: clamp(12px, 3vw, 28px); }
@keyframes a9-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.tab-content { animation: a9-in .22s ease-out; }

.card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-xl); box-shadow: var(--shadow-lg); padding: clamp(16px, 2.4vw, 26px); margin-bottom: 18px; }
.card-header { padding-bottom: 14px; margin-bottom: 16px; border-bottom: 1px solid var(--border-color); }
.card-title { font-size: clamp(17px, 2vw, 20px); font-weight: 700; }

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

.modern-input { width: 100%; background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 10px; padding: 11px 14px; min-height: 44px; font-size: 16px; margin-bottom: 12px; }
.modern-input::placeholder { color: var(--text-muted); opacity: .8; }
.modern-input:hover { border-color: #b8c2d1; }
.modern-input:focus { outline: none; border-color: var(--primary); box-shadow: var(--shadow-glow); }
textarea.modern-input { line-height: 1.5; }
.form-group label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: var(--text-main); }
.admin-form-box { background: transparent; border: 1.5px dashed var(--border-color); border-radius: var(--radius-lg); padding: 14px 16px; }

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

.greeting { background: var(--primary); color: #fff; border-radius: var(--radius-xl); padding: clamp(20px, 3vw, 30px); margin-bottom: 18px; }
.greeting h3 { font-size: clamp(20px, 3vw, 26px); font-weight: 800; }
.greeting p { opacity: .9; margin-top: 4px; }
.upd-card { background: var(--primary-light); border: 1px solid var(--primary); }

.table-responsive { border: 1px solid var(--border-color); border-radius: var(--radius-lg); overflow-x: auto; background: var(--bg-card); -webkit-overflow-scrolling: touch; }
.modern-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.modern-table th { text-align: left; font-size: 13px; font-weight: 700; color: var(--text-muted); background: var(--bg-base); padding: 12px 16px; border-bottom: 1px solid var(--border-color); white-space: nowrap; }
.modern-table td { padding: 13px 16px; border-bottom: 1px solid var(--border-color); vertical-align: middle; }
.modern-table tbody tr:last-child td { border-bottom: none; }
.modern-table tr:hover td { background: var(--primary-light); }
@media (max-width: 640px) { .modern-table td { padding: 10px 14px; } }

.chip, .sn-chip { border-radius: 999px; min-height: 38px; }
.chip.active { background: var(--primary); color: #fff; border-color: var(--primary); }
.jd { border-radius: var(--radius-lg); background: var(--bg-card); }
.jd.today { background: var(--primary-light); box-shadow: none; border-color: var(--primary); }
.jd-tag { border-radius: 999px; }
.fv-folder { background: var(--bg-card); border-radius: var(--radius-lg); }
.fv-folder:hover { transform: translateY(-1px); box-shadow: var(--shadow-lg); }
.fv-file { background: var(--bg-card); border-radius: var(--radius-md); }
.dl-badge { border-radius: 999px; }

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

#toast-wrap { gap: 10px; }
.toast { background: var(--text-main); color: var(--bg-card); border-radius: 14px; padding: 13px 18px; font-weight: 600; text-align: left; box-shadow: 0 12px 32px -10px rgba(15,23,42,.45); }

#login-page { background: radial-gradient(900px 500px at 15% -10%, var(--primary-light), transparent 60%), var(--bg-base); }
.modal-content, #preview-modal > div, #admin-settings-modal > div { border-radius: var(--radius-xl); border: 1px solid var(--border-color); }
#to-top { background: var(--bg-card); color: var(--primary); border: 1px solid var(--border-color); box-shadow: var(--shadow-lg); }
.hint, .report-hint { max-width: 70ch; }
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 10px; border: 2px solid var(--bg-base); }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

@media (max-width: 480px) {
  .card { border-radius: var(--radius-lg); padding: 16px; }
  .btn-lg { width: 100%; }
  .card-header.flex-between { flex-wrap: wrap; gap: 10px; }
  .prog-stats { grid-template-columns: repeat(2, 1fr); }
}
@media (prefers-reduced-motion: reduce) { .tab-content { animation: none; } }
`;
    document.head.appendChild(css);

    try { window.applyTheme(document.body.classList.contains('theme-dark') ? 'dark' : (window.dbData && dbData.theme) || 'light'); } catch (e) { }
})();
