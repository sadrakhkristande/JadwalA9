const allowedUsers = {
    "12345": "Guest Utama",
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
const INACTIVITY_LIMIT = 30 * 60 * 1000; // 30 Menit

// KONFIGURASI JSONBIN.IO DENGAN BIN ID ANDA
const JSONBIN_CONFIG = {
    binId: "6ace42f8ffd5d16053678ea5", 
    apiKey: "MASUKKAN_API_KEY_ANDA_DISINI" // Contoh: $2a$10$...
};

let dbData = {
    pengumuman: [],
    reminder: [],
    jadwalUpdates: [],
    tugas: [],
    laboratorium: [],
    skills_lab: [],
    tutorial: [],
    materi: [],
    jadwalCustom: null,
    maintenance: false,
    theme: 'light'
};

window.addEventListener('DOMContentLoaded', async () => {
    await fetchDatabaseFromCloud();
    applyTheme(dbData.theme || 'light');
    checkMaintenanceStatus();
    
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

async function fetchDatabaseFromCloud() {
    try {
        const url = `https://api.jsonbin.io/v3/b/${JSONBIN_CONFIG.binId}/latest`;
        const res = await fetch(url, {
            headers: { 'X-Master-Key': JSONBIN_CONFIG.apiKey }
        });
        if(res.ok) {
            const json = await res.json();
            dbData = json.record;
            console.log("Database online berhasil dimuat!");
        }
    } catch (err) {
        console.error("Gagal memuat database online:", err);
    }
    renderAll();
}

async function saveData() {
    renderAll();
    try {
        const url = `https://api.jsonbin.io/v3/b/${JSONBIN_CONFIG.binId}`;
        const res = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_CONFIG.apiKey
            },
            body: JSON.stringify(dbData)
        });

        if(res.ok) {
            console.log("Perubahan berhasil disimpan secara global ke cloud!");
        } else {
            alert("Gagal menyimpan ke server online. Pastikan API Key benar.");
        }
    } catch (err) {
        console.error("Error Sync Cloud:", err);
    }
}

window.toggleThemeSwitch = function() {
    const checkbox = document.getElementById('theme-toggle-checkbox');
    const newTheme = checkbox.checked ? 'dark' : 'light';
    applyTheme(newTheme);
};

function applyTheme(themeName) {
    dbData.theme = themeName;
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
    const toggleBtn = document.getElementById('maintenance-toggle-btn');
    if(dbData.maintenance) {
        if(banner) banner.style.display = 'block';
        if(toggleBtn) {
            toggleBtn.innerText = "Nonaktifkan Maintenance Mode";
            toggleBtn.className = "btn btn-success";
        }
    } else {
        if(banner) banner.style.display = 'none';
        if(toggleBtn) {
            toggleBtn.innerText = "Aktifkan Maintenance Mode";
            toggleBtn.className = "btn btn-warning";
        }
    }
}

window.toggleMaintenanceMode = async function() {
    dbData.maintenance = !dbData.maintenance;
    await saveData();
    checkMaintenanceStatus();
    alert(dbData.maintenance ? "Maintenance Mode diaktifkan secara global." : "Maintenance Mode dinonaktifkan secara global.");
};

setInterval(() => {
    const now = new Date();
    const options = { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const clockEl = document.getElementById('wib-clock');
    if(clockEl) clockEl.innerText = `Waktu WIB: ${now.toLocaleDateString('id-ID', options)}`;
}, 1000);

window.toggleLoginFields = function() {
    const role = document.getElementById('login-role').value;
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
        if (code === 'A9ACOR') {
            currentUser = { role: 'admin', name: 'Admin Utama (A9ACOR)' };
            saveUserSession();
            initApp();
            setupInactivityTracker();
        } else {
            alert('Kode Admin Salah!');
        }
    } else {
        if (dbData.maintenance) {
            alert('Portal sedang dalam pemeliharaan (Maintenance). Guest/Mahasiswa belum dapat masuk.');
            return;
        }
        const nimInput = document.getElementById('login-nim-input');
        const nim = nimInput ? nimInput.value.trim() : '';
        
        if (nim === "12345" || allowedUsers[nim]) {
            currentUser = { role: 'guest', name: allowedUsers[nim] || "Guest " + nim, nim: nim };
            saveUserSession();
            initApp();
            setupInactivityTracker();
        } else {
            alert('NIM atau Kode Guest tidak valid!');
        }
    }
};

function saveUserSession() {
    sessionStorage.setItem('portal_current_user', JSON.stringify(currentUser));
    sessionStorage.setItem('portal_last_active', Date.now().toString());
}

function setupInactivityTracker() {
    const updateActivity = () => {
        if(currentUser) sessionStorage.setItem('portal_last_active', Date.now().toString());
    };
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('scroll', updateActivity);

    setInterval(() => {
        const lastActive = sessionStorage.getItem('portal_last_active');
        if(currentUser && lastActive) {
            if(Date.now() - parseInt(lastActive) > INACTIVITY_LIMIT) {
                alert('Sesi Anda telah berakhir karena tidak ada aktivitas selama 30 menit.');
                handleLogout();
            }
        }
    }, 60000);
}

function initApp() {
    const loginPage = document.getElementById('login-page');
    const mainApp = document.getElementById('main-app');
    const userInfo = document.getElementById('user-info');

    if (loginPage) loginPage.style.display = 'none';
    if (mainApp) mainApp.style.display = 'block';
    if (userInfo && currentUser) {
        userInfo.innerText = `${currentUser.name} — (${currentUser.role.toUpperCase()})`;
    }

    if (currentUser.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'inline-block');
        document.querySelectorAll('.admin-only.card').forEach(el => el.style.display = 'block');
    } else {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }
    checkMaintenanceStatus();
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

window.closeModal = function(id) {
    const modal = document.getElementById(id);
    if(modal) modal.style.display = 'none';
};

function renderAll() {
    renderPengumuman();
    renderReminder();
    renderJadwalUpdates();
    renderJadwal();
    renderTugas();
    renderPraktikum('laboratorium', 'lab-list');
    renderPraktikum('skills_lab', 'skills-list');
    renderPraktikum('tutorial', 'tutorial-list');
    renderMateri();
}

function renderPengumuman() {
    const container = document.getElementById('pengumuman-list');
    if(!container) return;
    container.innerHTML = '';
    const today = new Date().toISOString().split('T')[0];

    dbData.pengumuman.forEach((p, idx) => {
        if(p.deadline && p.deadline < today && currentUser.role !== 'admin') return;
        const waText = encodeURIComponent(`*PENGUMUMAN AKADEMIK BLOK 1.2*\n\n*${p.judul}*\n${p.isi}\n\nBerlaku s/d:${p.deadline}`);
        container.innerHTML += `
            <div style="background: var(--bg-light); border-left: 4px solid var(--accent); padding: 15px; margin-bottom: 10px; border-radius: 4px; position: relative;">
                <h4 style="color:var(--text);">${p.judul}</h4>
                <p style="margin-top: 5px; font-size: 14px; color:var(--text);">${p.isi}</p>
                <small style="color: var(--text-muted); display: block; margin-top: 8px;">Aktif sampai: ${p.deadline}</small>
                <div style="margin-top: 10px;">
                    <a href="https://wa.me/?text=${waText}" target="_blank" class="badge badge-wa">📲 Kirim ke WhatsApp</a>
                </div>
                ${currentUser.role === 'admin' ? `<button class="btn btn-danger" style="width: auto; padding: 2px 8px; font-size: 11px; position: absolute; top: 10px; right: 10px;" onclick="deleteItem('pengumuman', ${idx})">Hapus</button>` : ''}
            </div>
        `;
    });
}

function renderReminder() {
    const list = document.getElementById('reminder-list');
    if(!list) return;
    list.innerHTML = '';
    dbData.reminder.forEach((r, idx) => {
        list.innerHTML += `<li style="margin-bottom: 6px; font-size: 14px; display: flex; justify-content: space-between; align-items: center; color:var(--text);"><span>${r}</span>${currentUser.role === 'admin' ? `<button onclick="deleteItem('reminder', ${idx})" style="color:red; border:none; background:none; cursor:pointer; font-weight:bold;">[Hapus]</button>` : ''}</li>`;
    });
}

function renderJadwalUpdates() {
    const list = document.getElementById('jadwal-update-list');
    if(!list) return;
    list.innerHTML = '';
    dbData.jadwalUpdates.forEach((u, idx) => {
        list.innerHTML += `<li style="margin-bottom: 6px; font-size: 14px; display: flex; justify-content
