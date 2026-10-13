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

// KONFIGURASI GOOGLE SHEETS WEB APP
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxTfVvKxubnxqVprY_Iu05pbKLCogL8B9ID-R6tmEnhew60tmDwsOAj3whnq4P7dyRz/exec";

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
        const res = await fetch(SCRIPT_URL);
        if(res.ok) {
            const json = await res.json();
            if (json && typeof json === 'object') {
                dbData = Object.assign({}, dbData, json);
                console.log("Database Google Sheets berhasil dimuat!");
            }
        }
    } catch (err) {
        console.error("Gagal memuat database:", err);
    }
    renderAll();
}

async function saveData() {
    renderAll();
    try {
        await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dbData)
        });
        console.log("Perubahan berhasil dikirim ke Google Sheets!");
    } catch (err) {
        console.error("Error Sync Cloud:", err);
        alert("Gagal menyimpan ke server online.");
    }
}

window.toggleThemeSwitch = function() {
    const checkbox = document.getElementById('theme-toggle-checkbox');
    const newTheme = checkbox && checkbox.checked ? 'dark' : 'light';
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
        const nim = nimInput
