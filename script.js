// ==========================================================================
// KONFIGURASI PENGGUNA & KONEKSI SUPABASE
// ==========================================================================
const allowedUsers = {
    "21105032610023": "ALICA MARATU SULHA",
    "21105032610047": "AYESHA LILIAN PUTRI",
    "21105032610049": "AYSAR HAMMAM IBRAHIM",
    "21105032610087": "FATHURAHMAN NUR AZIZ DENIRA",
    "21105032610089": "FATIKHATUNNISA ALYA FAHIRA",
    "21105032610125": "KEYSHA AURELL ANINDIKAZZAHRA",
    "21105032610149": "MUHAMMAD FIKRI HIDAYATULLOH",
    "21105032610171": "NATHANIA MENGDA JAMIPUTRI",
    "21105032610201": "RAFIDA HAMIDAH PUTRI",
    "21105032610227": "SADRAKH KRISTANDE GWIHARTO",
    "21105032610239": "SHERILLA AUDREY NASYWA"
};

let currentUser = null;
const INACTIVITY_LIMIT = 30 * 60 * 1000;

// CONFIG SUPABASE
const SUPABASE_URL = "https://vqzklxbfrvmvcoeykias.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_-NTQ0VL2xQmIYJ_ieREXkg_WUcU3L0t";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State Data Terpisah Multi-JSON
let dbData = {
    pengumuman: [],
    reminder: [],
    jadwalUpdates: [],
    tugas: [],
    laboratorium: [],
    skills_lab: [],
    tutorial: [],
    materi: [],
    jadwalCustom: [],
    maintenance: false,
    globalAnnouncement: '',
    adminCode: 'A9ACOR',
    theme: 'light'
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
    
    if (nimInput) {
        nimInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); handleLogin(); }
        });
    }
    if (adminInput) {
        adminInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); handleLogin(); }
        });
    }

    const savedUser = sessionStorage.getItem('portal_current_user');
    const lastActive = sessionStorage.getItem('portal_last_active');
    const now = Date.now();

    if (savedUser && lastActive) {
        if (now - parseInt(lastActive) < INACTIVITY_LIMIT) {
            currentUser = JSON.parse(savedUser);
            initApp();
            setupInactivityTracker();
        } else {
            sessionStorage.removeItem('portal_current_user');
            sessionStorage.removeItem('portal_last_active');
        }
    }
});

// FETCH DATA MULTI-JSON SUPABASE
async function fetchDatabaseFromCloud() {
    try {
        const keys = ['pengumuman', 'reminder', 'tugas', 'laboratorium', 'skills_lab', 'tutorial', 'materi', 'jadwal', 'config'];
        
        for (const k of keys) {
            const { data, error } = await supabaseClient
                .from('portal_db')
                .select('value')
                .eq('key', k)
                .single();

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
    } catch (err) {
        console.error("Gagal memuat data dari Supabase:", err);
    }

    // Jika data jadwal dari Supabase masih kosong, muat default dari jadwal.json lokal SATU KALI SAJA
    if (!dbData.jadwalCustom || dbData.jadwalCustom.length === 0) {
        try {
            const res = await fetch('jadwal.json');
            const data = await res.json();
            dbData.jadwalCustom = data.jadwal || [];
        } catch (e) {
            dbData.jadwalCustom = [];
        }
    }

    checkMaintenanceStatus();
    checkGlobalAnnouncement();
    renderAll();
}

// SIMPAN TERSAMBUNG KE KEY SUPABASE KATEGORI SPESIFIK
async function saveCategoryData(categoryKey) {
    // Jalankan render lokal tanpa loop berat
    renderAll();
    try {
        let payload = dbData[categoryKey];
        if (categoryKey === 'config') {
            payload = { 
                maintenance: dbData.maintenance, 
                theme: dbData.theme,
                globalAnnouncement: dbData.globalAnnouncement,
                adminCode: dbData.adminCode
            };
        } else if (categoryKey === 'jadwal') {
            payload = dbData.jadwalCustom;
        }

        const { error } = await supabaseClient
            .from('portal_db')
            .update({ value: payload })
            .eq('key', categoryKey);

        if (error) throw error;
    } catch (err) {
        console.error(`Gagal menyimpan ${categoryKey} ke Supabase:`, err);
        alert("Gagal menyinkronkan perubahan ke server online.");
    }
}

// HELPER FILE BASE64 (MAX 1 MB)
function getFileAsBase64(fileInputId) {
    return new Promise((resolve) => {
        const fileInput = document.getElementById(fileInputId);
        if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
            resolve(null);
            return;
        }
        const file = fileInput.files[0];
        
        const maxSize = 1 * 1024 * 1024;
        if (file.size > maxSize) {
            alert(`⚠️ Ukuran file "${file.name}" adalah ${(file.size / (1024*1024)).toFixed(2)} MB.\nUnggah file dari PC dibatasi maksimal 1 MB agar portal tetap cepat.\n\nSaran: Unggah file besar ke Google Drive lalu salin URL link-nya.`);
            fileInput.value = '';
            resolve(null);
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            resolve({ name: file.name, url: e.target.result });
        };
        reader.onerror = function() { resolve(null); };
        reader.readAsDataURL(file);
    });
}

// AUTOMATIC ANNOUNCEMENT TEMPLATE GENERATOR
async function triggerAutoAnnouncement(judul, isi, deadlineDays = 7) {
    if (!dbData.pengumuman) dbData.pengumuman = [];
    
    const d = new Date();
    d.setDate(d.getDate() + deadlineDays);
    const deadlineStr = d.toISOString().split('T')[0];

    dbData.pengumuman.unshift({
        id: Date.now(),
        judul: judul,
        isi: isi,
        deadline: deadlineStr
    });
}

// ==========================================================================
// PENGATURAN TEMA, MAINTENANCE & ADMIN PANEL
// ==========================================================================
window.toggleThemeSwitch = async function() {
    const checkbox = document.getElementById('theme-toggle-checkbox');
    dbData.theme = checkbox && checkbox.checked ? 'dark' : 'light';
    applyTheme(dbData.theme);
    await saveCategoryData('config');
};

function applyTheme(themeName) {
    const checkbox = document.getElementById('theme-toggle-checkbox');
    if(checkbox) checkbox.checked = (themeName === 'dark');

    if(themeName === 'dark') {
        document.body.classList.add('theme-dark');
    } else {
        document.body.classList.remove('theme-dark');
    }
}

function checkMaintenanceStatus() {
    const banner = document.getElementById('maintenance-banner');
    const modalBtn = document.getElementById('modal-maintenance-btn');
    
    if(dbData.maintenance) {
        if(banner) banner.style.display = 'block';
        if(modalBtn) { modalBtn.innerText = "Nonaktifkan Maintenance"; modalBtn.className = "btn btn-success"; }
    } else {
        if(banner) banner.style.display = 'none';
        if(modalBtn) { modalBtn.innerText = "Aktifkan Maintenance"; modalBtn.className = "btn btn-warning"; }
    }
}

function checkGlobalAnnouncement() {
    const banner = document.getElementById('global-announcement-banner');
    const textEl = document.getElementById('global-announcement-text');
    if(dbData.globalAnnouncement && dbData.globalAnnouncement.trim() !== '') {
        if(textEl) textEl.innerText = `📢 INFO PORTAL: ${dbData.globalAnnouncement}`;
        if(banner) banner.style.display = 'block';
    } else {
        if(banner) banner.style.display = 'none';
    }
}

window.toggleMaintenanceMode = async function() {
    dbData.maintenance = !dbData.maintenance;
    await saveCategoryData('config');
    checkMaintenanceStatus();
    alert(dbData.maintenance ? "⚠️ Mode Maintenance DIAKTIFKAN!" : "✅ Mode Maintenance DINONAKTIFKAN!");
};

window.openAdminSettingsModal = function() {
    document.getElementById('cfg-global-msg').value = dbData.globalAnnouncement || '';
    document.getElementById('cfg-admin-code').value = dbData.adminCode || 'A9ACOR';
    checkMaintenanceStatus();
    document.getElementById('admin-settings-modal').style.display = 'flex';
};

window.saveAdminSettings = async function() {
    dbData.globalAnnouncement = document.getElementById('cfg-global-msg').value.trim();
    const newCode = document.getElementById('cfg-admin-code').value.trim();
    if(newCode) dbData.adminCode = newCode;

    await saveCategoryData('config');
    checkGlobalAnnouncement();
    closeModal('admin-settings-modal');
    alert('✅ Pengaturan web berhasil disimpan!');
};

setInterval(() => {
    const now = new Date();
    const options = { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const clockEl = document.getElementById('wib-clock');
    if(clockEl) clockEl.innerText = `Waktu WIB: ${now.toLocaleDateString('id-ID', options)}`;
}, 1000);

// ==========================================================================
// AUTENTIKASI
// ==========================================================================
window.toggleLoginFields = function() {
    const roleEl = document.getElementById('login-role');
    if(!roleEl) return;
    const role = roleEl.value;
    const guestFields = document.getElementById('guest-fields');
    const adminFields = document.getElementById('admin-fields');
    if (guestFields && adminFields) {
        guestFields.style.display = role === 'guest' ? 'block' : 'none';
        adminFields.style.display = role === 'admin' ? 'block' : 'none';
    }
};

window.handleLogin = function() {
    const roleEl = document.getElementById('login-role');
    if (!roleEl) return;
    const role = roleEl.value;
    if (role === 'admin') {
        const codeInput = document.getElementById('login-admin-code');
        const code = codeInput ? codeInput.value.trim() : '';
        const validCode = dbData.adminCode || 'A9ACOR';
        if (code === validCode) {
            currentUser = { role: 'admin', name: 'Admin Utama' };
            saveUserSession(); initApp(); setupInactivityTracker();
        } else { alert('Kode Admin Salah!'); }
    } else {
        if (dbData.maintenance) { 
            alert('⚠️ PORTAL SEDANG DALAM PEMELIHARAAN (MAINTENANCE).\nMahasiswa tidak dapat masuk saat ini.'); 
            return; 
        }
        const nimInput = document.getElementById('login-nim-input');
        const nim = nimInput ? nimInput.value.trim() : '';
        if (allowedUsers[nim]) {
            currentUser = { role: 'guest', name: allowedUsers[nim], nim: nim };
            saveUserSession(); initApp(); setupInactivityTracker();
        } else { alert('Nomor Identitas tidak terdaftar!'); }
    }
};

function saveUserSession() {
    sessionStorage.setItem('portal_current_user', JSON.stringify(currentUser));
    sessionStorage.setItem('portal_last_active', Date.now().toString());
}

function setupInactivityTracker() {
    const updateActivity = () => { if(currentUser) sessionStorage.setItem('portal_last_active', Date.now().toString()); };
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('scroll', updateActivity);
    setInterval(() => {
        const lastActive = sessionStorage.getItem('portal_last_active');
        if(currentUser && lastActive && (Date.now() - parseInt(lastActive) > INACTIVITY_LIMIT)) {
            alert('Sesi berakhir karena tidak ada aktivitas.'); handleLogout();
        }
    }, 60000);
}

function initApp() {
    const loginPage = document.getElementById('login-page');
    const mainApp = document.getElementById('main-app');
    const userInfo = document.getElementById('user-info');
    if (loginPage) loginPage.style.display = 'none';
    if (mainApp) mainApp.style.display = 'block';
    if (userInfo && currentUser) userInfo.innerText = `${currentUser.name} — (${currentUser.role.toUpperCase()})`;
    
    if (currentUser && currentUser.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'inline-block');
        document.querySelectorAll('.admin-form-box').forEach(el => el.style.display = 'block');
    } else {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.admin-form-box').forEach(el => el.style.display = 'none');
    }
    checkMaintenanceStatus(); 
    checkGlobalAnnouncement();
    renderAll();
}

window.handleLogout = function() {
    sessionStorage.removeItem('portal_current_user');
    sessionStorage.removeItem('portal_last_active');
    location.reload();
};

window.switchTab = function(tabName, btnElement) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    const targetTab = document.getElementById(`tab-${tabName}`);
    if(targetTab) targetTab.style.display = 'block';
    if(btnElement) btnElement.classList.add('active');
};

window.closeModal = function(id) { document.getElementById(id).style.display = 'none'; };

// ==========================================================================
// KELOLA JADWAL (FILTER HARI INI & BESOK + PRESERVE DARI SUPABASE CLOUD)
// ==========================================================================
function renderJadwal() {
    const tbody = document.getElementById('jadwal-table-body');
    if(!tbody) return; 
    tbody.innerHTML = '';
    
    let jadwalList = dbData.jadwalCustom || [];
    
    const nowWIB = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));
    const tomorrowWIB = new Date(nowWIB); 
    tomorrowWIB.setDate(nowWIB.getDate() + 1);
    
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    function formatDateStr(d) { 
        return `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`; 
    }
    
    const todayStr = formatDateStr(nowWIB);      
    const tomorrowStr = formatDateStr(tomorrowWIB); 

    const filteredJadwal = jadwalList.filter(j => j && j.tgl && (j.tgl.includes(todayStr) || j.tgl.includes(tomorrowStr)));

    if(filteredJadwal.length === 0) { 
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Tidak ada agenda jadwal untuk hari ini & besok.</td></tr>`; 
        return; 
    }

    const isAdmin = currentUser && currentUser.role === 'admin';

    filteredJadwal.forEach((j) => {
        const actualIdx = dbData.jadwalCustom.findIndex(item => item.tgl === j.tgl);
        
        const isToday = j.tgl.includes(todayStr);
        let badgeLabel = isToday 
            ? '<span class="badge" style="background:#d97706; color:white; margin-left:6px;">Hari Ini</span>' 
            : '<span class="badge" style="background:#047857; color:white; margin-left:6px;">Besok</span>';

        let s1 = j.sesi?.[0] ? `<small style="color:var(--text-muted);">${j.sesi[0].jam}</small><br><strong>${j.sesi[0].kegiatan}</strong>` : '-';
        let s2 = j.sesi?.[1] ? `<small style="color:var(--text-muted);">${j.sesi[1].jam}</small><br><strong>${j.sesi[1].kegiatan}</strong>` : '-';
        let s3 = j.sesi?.[2] ? `<small style="color:var(--text-muted);">${j.sesi[2].jam}</small><br><strong>${j.sesi[2].kegiatan}</strong>` : '-';
        let s4 = j.sesi?.[3] ? `<small style="color:var(--text-muted);">${j.sesi[3].jam}</small><br><strong>${j.sesi[3].kegiatan}</strong>` : '-';
        
        let actBtns = isAdmin ? `
            <button class="btn" style="padding:3px 8px; font-size:11px; background:#d97706;" onclick="openJadwalModal(${actualIdx})">Edit</button>
            <button class="btn btn-danger" style="padding:3px 8px; font-size:11px; margin-left:4px;" onclick="deleteJadwalItem(${actualIdx})">Hapus</button>
        ` : '';

        tbody.innerHTML += `
            <tr>
                <td><strong>${j.tgl || '-'}</strong><br>${badgeLabel}</td>
                <td>${s1}</td>
                <td>${s2}</td>
                <td>${s3}</td>
                <td>${s4}</td>
                ${isAdmin ? `<td>${actBtns}</td>` : ''}
            </tr>`;
    });
}

window.openJadwalModal = function(index = -1) {
    document.getElementById('edit-jadwal-index').value = index;
    if(index >= 0 && dbData.jadwalCustom[index]) {
        document.getElementById('jadwal-modal-title').innerText = "Edit Agenda Jadwal";
        let item = dbData.jadwalCustom[index];
        document.getElementById('j-tgl').value = item.tgl || '';
        document.getElementById('j-jam1').value = item.sesi?.[0]?.jam || ''; document.getElementById('j-keg1').value = item.sesi?.[0]?.kegiatan || '';
        document.getElementById('j-jam2').value = item.sesi?.[1]?.jam || ''; document.getElementById('j-keg2').value = item.sesi?.[1]?.kegiatan || '';
        document.getElementById('j-jam3').value = item.sesi?.[2]?.jam || ''; document.getElementById('j-keg3').value = item.sesi?.[2]?.kegiatan || '';
        document.getElementById('j-jam4').value = item.sesi?.[3]?.jam || ''; document.getElementById('j-keg4').value = item.sesi?.[3]?.kegiatan || '';
    } else {
        document.getElementById('jadwal-modal-title').innerText = "Tambah Agenda Jadwal Baru";
        document.getElementById('j-tgl').value = '';
        document.getElementById('j-jam1').value = '07.50-09.30'; document.getElementById('j-keg1').value = '';
        document.getElementById('j-jam2').value = '09.50-11.30'; document.getElementById('j-keg2').value = '';
        document.getElementById('j-jam3').value = '12.30-14.10'; document.getElementById('j-keg3').value = '';
        document.getElementById('j-jam4').value = '14.15-15.55'; document.getElementById('j-keg4').value = '';
    }
    document.getElementById('jadwal-modal').style.display = 'flex';
};

window.saveJadwalItem = async function() {
    const idx = parseInt(document.getElementById('edit-jadwal-index').value);
    const tgl = document.getElementById('j-tgl').value.trim();
    if(!tgl) return alert("Tanggal agenda wajib diisi!");

    if(!dbData.jadwalCustom) dbData.jadwalCustom = [];

    const newEntry = {
        tgl: tgl,
        sesi: [
            { jam: document.getElementById('j-jam1').value || '-', kegiatan: document.getElementById('j-keg1').value || '-' },
            { jam: document.getElementById('j-jam2').value || '-', kegiatan: document.getElementById('j-keg2').value || '-' },
            { jam: document.getElementById('j-jam3').value || '-', kegiatan: document.getElementById('j-keg3').value || '-' },
            { jam: document.getElementById('j-jam4').value || '-', kegiatan: document.getElementById('j-keg4').value || '-' }
        ]
    };

    if(idx >= 0) dbData.jadwalCustom[idx] = newEntry;
    else dbData.jadwalCustom.push(newEntry);

    await saveCategoryData('jadwal');
    closeModal('jadwal-modal'); 
    alert('✅ Agenda jadwal berhasil tersimpan ke cloud Supabase!');
};

window.deleteJadwalItem = async function(index) {
    if(confirm('Apakah Anda yakin ingin menghapus agenda jadwal ini?')) {
        dbData.jadwalCustom.splice(index, 1);
        await saveCategoryData('jadwal');
        alert('✅ Agenda jadwal berhasil dihapus!');
    }
};

// ==========================================================================
// RENDER & INPUT DATA KATEGORI LAIN
// ==========================================================================
function renderAll() {
    renderPengumuman(); renderReminder(); renderJadwalUpdates(); renderJadwal();
    renderTugas(); renderPraktikum('laboratorium', 'lab-list');
    renderPraktikum('skills_lab', 'skills-list'); renderPraktikum('tutorial', 'tutorial-list'); renderMateri();
}

window.addPengumuman = async function() {
    const judul = document.getElementById('p-judul').value;
    const isi = document.getElementById('p-isi').value;
    const deadline = document.getElementById('p-deadline').value;
    if(!judul || !isi || !deadline) return alert('Semua kolom wajib diisi!');
    if (!dbData.pengumuman) dbData.pengumuman = [];
    
    dbData.pengumuman.unshift({ id: Date.now(), judul, isi, deadline });
    await saveCategoryData('pengumuman');

    document.getElementById('p-judul').value = ''; 
    document.getElementById('p-isi').value = ''; 
    document.getElementById('p-deadline').value = '';
    alert('Pengumuman ditambahkan!');
};

function renderPengumuman() {
    const container = document.getElementById('pengumuman-list');
    if(!container) return; container.innerHTML = '';
    const today = new Date().toISOString().split('T')[0];
    if (!dbData.pengumuman) dbData.pengumuman = [];
    
    const validList = dbData.pengumuman.filter(p => !(p.deadline && p.deadline < today && currentUser && currentUser.role !== 'admin'));
    if(validList.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted); font-size:14px;">Belum ada pengumuman aktif saat ini.</p>`;
        return;
    }

    validList.forEach((p, idx) => {
        const isLatest = (idx === 0);
        const waText = encodeURIComponent(`*PENGUMUMAN AKADEMIK A9*\n\n*${p.judul}*\n${p.isi}\n\nBerlaku s/d: ${p.deadline}`);
        const isAdmin = currentUser && currentUser.role === 'admin';
        
        container.innerHTML += `
            <div class="pengumuman-card ${isLatest ? 'is-latest' : ''}" style="background: var(--bg-light); border-left: 4px solid var(--accent); padding: 15px; margin-bottom: 12px; border-radius: 6px; position: relative; transition: all 0.3s ease;">
                <h4 style="color:var(--text); display:flex; align-items:center;">
                    ${p.judul} 
                    ${isLatest ? `<span class="badge-new">🔥 NEW</span>` : ''}
                </h4>
                <p style="margin-top: 6px; font-size: 14px; color:var(--text); line-height: 1.6;">${p.isi}</p>
                <small style="color: var(--text-muted); display: block; margin-top: 8px;">🗓️ Aktif sampai: ${p.deadline}</small>
                <div style="margin-top: 10px;"><a href="https://wa.me/?text=${waText}" target="_blank" class="badge badge-wa">📲 Bagikan ke WA</a></div>
                ${isAdmin ? `<button class="btn btn-danger" style="width: auto; padding: 2px 8px; font-size: 11px; position: absolute; top: 10px; right: 10px;" onclick="deleteItem('pengumuman', ${idx})">Hapus</button>` : ''}
            </div>`;
    });
}

window.addTugasItem = async function() {
    const nama = document.getElementById('t-nama').value;
    const deadline = document.getElementById('t-deadline').value;
    const ket = document.getElementById('t-ket').value;
    const manualLink = document.getElementById('t-link-manual').value.trim();
    
    if(!nama || !deadline) return alert('Nama dan Deadline wajib diisi!');
    if (!dbData.tugas) dbData.tugas = [];

    let finalLink = manualLink || '#';
    const fileData = await getFileAsBase64('t-file-pc');
    if (fileData) { finalLink = fileData.url; }

    dbData.tugas.push({ id: Date.now(), nama, deadline, ket, link: finalLink });
    
    const judulPengumuman = `📋 TUGAS BARU: ${nama}`;
    const isiPengumuman = `Telah ditambahkan penugasan baru:\n📌 *Tugas:* ${nama}\n⏰ *Deadline:* ${deadline}\n📝 ${ket || 'Silakan cek menu Tugas.'}`;
    await triggerAutoAnnouncement(judulPengumuman, isiPengumuman);

    await saveCategoryData('tugas');
    await saveCategoryData('pengumuman');
    
    document.getElementById('t-nama').value = ''; 
    document.getElementById('t-deadline').value = ''; 
    document.getElementById('t-ket').value = ''; 
    document.getElementById('t-file-pc').value = '';
    document.getElementById('t-link-manual').value = '';
    alert('Tugas disimpan & dipublikasikan!');
};

window.handlePraktikumUpload = async function(category, idNama, idSkenario, idKet, idFilePc, idLink) {
    const nama = document.getElementById(idNama).value;
    const skenario = document.getElementById(idSkenario).value;
    const ket = document.getElementById(idKet).value;
    const manualLink = document.getElementById(idLink).value.trim();
    
    if(!nama) return alert('Nama wajib diisi!');
    if (!dbData[category]) dbData[category] = [];

    let finalLink = manualLink || '#';
    const fileData = await getFileAsBase64(idFilePc);
    if (fileData) { finalLink = fileData.url; }

    dbData[category].push({ id: Date.now(), nama, skenario, ket, link: finalLink });
    
    let prefixJudul = "🔬 LAB";
    if(category === "skills_lab") prefixJudul = "🩺 SKILLS LAB";
    if(category === "tutorial") prefixJudul = "💬 TUTORIAL";

    const judulPengumuman = `${prefixJudul}: ${nama}`;
    const isiPengumuman = `Modul/Materi baru telah diunggah:\n📌 *Kegiatan:* ${nama}\n📖 *Modul:* ${skenario || '-'}`;
    await triggerAutoAnnouncement(judulPengumuman, isiPengumuman);

    await saveCategoryData(category);
    await saveCategoryData('pengumuman');
    
    document.getElementById(idNama).value = ''; 
    document.getElementById(idSkenario).value = ''; 
    document.getElementById(idKet).value = ''; 
    document.getElementById(idFilePc).value = '';
    document.getElementById(idLink).value = '';
    alert('Berhasil disimpan & dipublikasikan!');
};

window.handleMateriUpload = async function() {
    const kuliah = document.getElementById('m-kuliah').value;
    const materi = document.getElementById('m-materi').value;
    const manualLink = document.getElementById('m-link-manual').value.trim();
    
    if(!kuliah || !materi) return alert('Nama kuliah dan materi wajib diisi!');
    if (!dbData.materi) dbData.materi = [];

    let finalLink = manualLink || '#';
    const fileData = await getFileAsBase64('m-file-pc');
    if (fileData) { finalLink = fileData.url; }

    dbData.materi.push({ id: Date.now(), kuliah, materi, link: finalLink });
    
    const judulPengumuman = `📚 MATERI KULIAH: ${kuliah}`;
    const isiPengumuman = `Materi baru telah diunggah:\n📖 *Kuliah:* ${kuliah}\n✍️ *Topik:* ${materi}`;
    await triggerAutoAnnouncement(judulPengumuman, isiPengumuman);

    await saveCategoryData('materi');
    await saveCategoryData('pengumuman');
    
    document.getElementById('m-kuliah').value = ''; 
    document.getElementById('m-materi').value = ''; 
    document.getElementById('m-file-pc').value = '';
    document.getElementById('m-link-manual').value = '';
    alert('Materi disimpan & dipublikasikan!');
};

window.openEditMateriModal = function(index) {
    document.getElementById('edit-materi-index').value = index;
    const item = dbData.materi[index];
    document.getElementById('edit-m-kuliah').value = item.kuliah || '';
    document.getElementById('edit-m-materi').value = item.materi || '';
    document.getElementById('edit-m-link').value = '';
    document.getElementById('materi-modal').style.display = 'flex';
};

window.saveEditedMateri = async function() {
    const idx = parseInt(document.getElementById('edit-materi-index').value);
    if(idx < 0) return;
    dbData.materi[idx].kuliah = document.getElementById('edit-m-kuliah').value;
    dbData.materi[idx].materi = document.getElementById('edit-m-materi').value;
    const newLink = document.getElementById('edit-m-link').value.trim();
    if(newLink) { dbData.materi[idx].link = newLink; }
    
    await saveCategoryData('materi');
    closeModal('materi-modal');
    alert('Materi berhasil diperbarui!');
};

function renderReminder() {
    const list = document.getElementById('reminder-list');
    if(!list) return; list.innerHTML = '';
    if (!dbData.reminder) dbData.reminder = [];
    const isAdmin = currentUser && currentUser.role === 'admin';
    dbData.reminder.forEach((r, idx) => {
        list.innerHTML += `<li style="margin-bottom: 6px; font-size: 14px; display: flex; justify-content: space-between; align-items: center; color:var(--text);"><span>${r}</span> ${isAdmin ? `<button onclick="deleteItem('reminder', ${idx})" style="color:red; border:none; background:none; cursor:pointer;">[Hapus]</button>` : ''}</li>`;
    });
}

function renderJadwalUpdates() {
    const list = document.getElementById('jadwal-update-list');
    if(!list) return; list.innerHTML = '';
    if (!dbData.jadwalUpdates) dbData.jadwalUpdates = [];
    const isAdmin = currentUser && currentUser.role === 'admin';
    dbData.jadwalUpdates.forEach((u, idx) => {
        list.innerHTML += `<li style="margin-bottom: 6px; font-size: 14px; display: flex; justify-content: space-between; align-items: center; color:var(--text);"><span>📄 ${u}</span> ${isAdmin ? `<button onclick="deleteItem('jadwalUpdates', ${idx})" style="color:red; border:none; background:none; cursor:pointer;">[Hapus]</button>` : ''}</li>`;
    });
}

function renderTugas() {
    const tbody = document.getElementById('tugas-table-body');
    if(!tbody) return; tbody.innerHTML = '';
    if (!dbData.tugas) dbData.tugas = [];
    const isAdmin = currentUser && currentUser.role === 'admin';
    dbData.tugas.forEach((t, idx) => {
        let linkBtn = t.link && t.link !== '#' ? `<a href="${t.link}" target="_blank" download class="btn" style="padding: 5px 10px; font-size: 12px; text-decoration:none;">📥 Unduh / Buka Berkas ↗</a>` : `<span style="color:var(--text-muted);">Tanpa berkas</span>`;
        let adminBtns = isAdmin ? `<button class="btn btn-danger" style="padding: 3px 6px; font-size: 11px; margin-left:5px;" onclick="deleteItem('tugas', ${idx})">Hapus</button>` : '';
        tbody.innerHTML += `<tr><td><strong>${t.nama}</strong><br><small style="color:var(--text-muted);">${t.ket || ''}</small></td><td>${t.deadline}</td><td>${linkBtn} ${adminBtns}</td></tr>`;
    });
}

function renderPraktikum(category, elementId) {
    const container = document.getElementById(elementId);
    if(!container) return; container.innerHTML = '';
    if (!dbData[category]) dbData[category] = [];
    const isAdmin = currentUser && currentUser.role === 'admin';
    dbData[category].forEach((item, idx) => {
        let actionLink = item.link && item.link !== '#' ? `<a href="${item.link}" target="_blank" download class="btn" style="padding: 6px 12px; font-size: 12px; text-decoration:none;">📥 Unduh / Buka Berkas ↗</a>` : `<span style="color:var(--text-muted);">Tanpa berkas</span>`;
        let adminBtns = isAdmin ? `<button class="btn btn-danger" style="padding: 4px 8px; font-size: 11px; margin-left:5px;" onclick="deleteItem('${category}', ${idx})">Hapus</button>` : '';
        container.innerHTML += `
            <div style="background: var(--bg-light); border: 1px solid var(--border); padding: 15px; border-radius: 6px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap:wrap; gap:10px;">
                <div><h4 style="color: var(--text);">${item.nama}</h4><p style="font-size: 13px; color: var(--text-muted);">Modul: ${item.skenario} | ${item.ket || ''}</p></div>
                <div>${actionLink} ${adminBtns}</div>
            </div>`;
    });
}

function renderMateri() {
    const tbody = document.getElementById('materi-table-body');
    if(!tbody) return; tbody.innerHTML = '';
    if (!dbData.materi) dbData.materi = [];
    const isAdmin = currentUser && currentUser.role === 'admin';
    dbData.materi.forEach((m, idx) => {
        let aksesHtml = m.link && m.link !== '#' ? `<a href="${m.link}" target="_blank" download style="color: var(--accent); font-weight: 600; text-decoration: none;">📥 Unduh / Buka Berkas ↗</a>` : `<span style="color:var(--text-muted);">Tanpa berkas</span>`;
        let adminBtns = isAdmin ? `<button class="btn" style="padding: 3px 6px; font-size: 11px; margin-left: 5px; background:#d97706;" onclick="openEditMateriModal(${idx})">Edit</button> <button class="btn btn-danger" style="padding: 3px 6px; font-size: 11px; margin-left: 5px;" onclick="deleteItem('materi', ${idx})">Hapus</button>` : '';
        tbody.innerHTML += `<tr><td><strong>${m.kuliah}</strong></td><td>${m.materi}</td><td>${aksesHtml} ${adminBtns}</td></tr>`;
    });
}

window.addReminder = async function() {
    const val = document.getElementById('rem-text').value;
    if(!val) return;
    if (!dbData.reminder) dbData.reminder = [];
    dbData.reminder.push(val);
    await saveCategoryData('reminder');
    document.getElementById('rem-text').value = '';
};

window.addJadwalUpdateWithFile = async function() {
    const title = document.getElementById('up-title').value;
    if(!title) return;
    if (!dbData.jadwalUpdates) dbData.jadwalUpdates = [];
    dbData.jadwalUpdates.push(title);
    await saveCategoryData('jadwalUpdates');
    document.getElementById('up-title').value = '';
};

window.deleteItem = async function(category, index) {
    if(confirm('Yakin ingin menghapus item ini?')) {
        dbData[category].splice(index, 1);
        await saveCategoryData(category);
        alert('Berhasil dihapus!');
    }
};
