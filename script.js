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

// KONFIGURASI JSONBIN.IO
const JSONBIN_CONFIG = {
    binId: "6ace42f8ffd5d16053678ea5", 
    apiKey: "$2a$10$nRmCBvMNjs28ZFtJ1j2RYuI/WLRngpcN9wAcM4r3J/beS4Uvi4.6"
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
            if (json.record) {
                dbData = json.record;
                console.log("Database online berhasil dimuat!");
            }
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

    if (currentUser && currentUser.role === 'admin') {
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

    if (!dbData.pengumuman) dbData.pengumuman = [];
    dbData.pengumuman.forEach((p, idx) => {
        if(p.deadline && p.deadline < today && currentUser && currentUser.role !== 'admin') return;
        const waText = encodeURIComponent(`*PENGUMUMAN AKADEMIK BLOK 1.2*\n\n*${p.judul}*\n${p.isi}\n\nBerlaku s/d: ${p.deadline}`);
        const isAdmin = currentUser && currentUser.role === 'admin';
        container.innerHTML += `
            <div style="background: var(--bg-light); border-left: 4px solid var(--accent); padding: 15px; margin-bottom: 10px; border-radius: 4px; position: relative;">
                <h4 style="color:var(--text);">${p.judul}</h4>
                <p style="margin-top: 5px; font-size: 14px; color:var(--text);">${p.isi}</p>
                <small style="color: var(--text-muted); display: block; margin-top: 8px;">Aktif sampai: ${p.deadline}</small>
                <div style="margin-top: 10px;">
                    <a href="https://wa.me/?text=${waText}" target="_blank" class="badge badge-wa">📲 Kirim ke WhatsApp</a>
                </div>
                ${isAdmin ? `<button class="btn btn-danger" style="width: auto; padding: 2px 8px; font-size: 11px; position: absolute; top: 10px; right: 10px;" onclick="deleteItem('pengumuman', ${idx})">Hapus</button>` : ''}
            </div>
        `;
    });
}

function renderReminder() {
    const list = document.getElementById('reminder-list');
    if(!list) return;
    list.innerHTML = '';
    if (!dbData.reminder) dbData.reminder = [];
    const isAdmin = currentUser && currentUser.role === 'admin';
    dbData.reminder.forEach((r, idx) => {
        list.innerHTML += `<li style="margin-bottom: 6px; font-size: 14px; display: flex; justify-content: space-between; align-items: center; color:var(--text);"><span>${r}</span> ${isAdmin ? `<button onclick="deleteItem('reminder', ${idx})" style="color:red; border:none; background:none; cursor:pointer; font-weight:bold;">[Hapus]</button>` : ''}</li>`;
    });
}

function renderJadwalUpdates() {
    const list = document.getElementById('jadwal-update-list');
    if(!list) return;
    list.innerHTML = '';
    if (!dbData.jadwalUpdates) dbData.jadwalUpdates = [];
    const isAdmin = currentUser && currentUser.role === 'admin';
    dbData.jadwalUpdates.forEach((u, idx) => {
        list.innerHTML += `<li style="margin-bottom: 6px; font-size: 14px; display: flex; justify-content: space-between; align-items: center; color:var(--text);"><span>📄 ${u}</span> ${isAdmin ? `<button onclick="deleteItem('jadwalUpdates', ${idx})" style="color:red; border:none; background:none; cursor:pointer; font-weight:bold;">[Hapus]</button>` : ''}</li>`;
    });
}

async function renderJadwal() {
    const tbody = document.getElementById('jadwal-table-body');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Memuat agenda jadwal...</td></tr>';
    
    let jadwalList = [];
    if(dbData.jadwalCustom && dbData.jadwalCustom.length > 0) {
        jadwalList = dbData.jadwalCustom;
    } else {
        try {
            const response = await fetch('jadwal.json');
            const data = await response.json();
            jadwalList = data.jadwal || [];
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Gagal memuat jadwal.</td></tr>';
            return;
        }
    }

    tbody.innerHTML = '';
    const nowWIB = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));
    const tomorrowWIB = new Date(nowWIB);
    tomorrowWIB.setDate(nowWIB.getDate() + 1);

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    function formatDateStr(dateObj) {
        return `${String(dateObj.getDate()).padStart(2, '0')}-${months[dateObj.getMonth()]}-${String(dateObj.getFullYear()).slice(-2)}`;
    }

    const todayStr = formatDateStr(nowWIB);
    const tomorrowStr = formatDateStr(tomorrowWIB);

    const filteredJadwal = jadwalList.filter(j => j && j.tgl && (j.tgl.includes(todayStr) || j.tgl.includes(tomorrowStr)));

    if(filteredJadwal.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Tidak ada jadwal untuk hari ini dan besok.</td></tr>`;
        return;
    }

    const isAdmin = currentUser && currentUser.role === 'admin';
    filteredJadwal.forEach((j) => {
        const actualIndex = jadwalList.findIndex(item => item.tgl === j.tgl);
        const isToday = j.tgl.includes(todayStr);
        let badgeClass = isToday ? 'highlight-today' : 'highlight-tomorrow';
        let badgeLabel = isToday ? '<span class="badge" style="background:#eab308; color:white;">Hari Ini</span>' : '<span class="badge" style="background:#3b82f6; color:white;">Besok</span>';

        let s1 = j.sesi && j.sesi[0] ? `<small style="color:var(--text-muted)">${j.sesi[0].jam}</small><br><strong>${j.sesi[0].kegiatan}</strong>` : '-';
        let s2 = j.sesi && j.sesi[1] ? `<small style="color:var(--text-muted)">${j.sesi[1].jam}</small><br><strong>${j.sesi[1].kegiatan}</strong>` : '-';
        let s3 = j.sesi && j.sesi[2] ? `<small style="color:var(--text-muted)">${j.sesi[2].jam}</small><br><strong>${j.sesi[2].kegiatan}</strong>` : '-';
        let s4 = j.sesi && j.sesi[3] ? `<small style="color:var(--text-muted)">${j.sesi[3].jam}</small><br><strong>${j.sesi[3].kegiatan}</strong>` : '-';

        let actionBtn = isAdmin ? `
            <button class="btn" style="width: auto; padding: 3px 6px; font-size: 11px; margin-bottom: 4px;" onclick="editJadwalItem(${actualIndex})">Edit</button>
            <button class="btn btn-danger" style="width: auto; padding: 3px 6px; font-size: 11px;" onclick="deleteJadwalItem(${actualIndex})">Hapus</button>
        ` : '';

        tbody.innerHTML += `<tr class="${badgeClass}">
            <td style="white-space: nowrap;">${j.tgl} <br>${badgeLabel}</td>
            <td>${s1}</td><td>${s2}</td><td>${s3}</td><td>${s4}</td>
            ${isAdmin ? `<td>${actionBtn}</td>` : ''}
        </tr>`;
    });
}

window.openJadwalModal = async function(index = -1) {
    if(!dbData.jadwalCustom) {
        try {
            const res = await fetch('jadwal.json');
            const data = await res.json();
            dbData.jadwalCustom = data.jadwal;
        } catch (e) { dbData.jadwalCustom = []; }
    }
    document.getElementById('edit-jadwal-index').value = index;
    if(index >= 0) {
        document.getElementById('jadwal-modal-title').innerText = "Edit Jadwal Kuliah";
        let item = dbData.jadwalCustom[index];
        document.getElementById('j-tgl').value = item.tgl || '';
        document.getElementById('j-jam1').value = item.sesi && item.sesi[0] ? item.sesi[0].jam : '';
        document.getElementById('j-keg1').value = item.sesi && item.sesi[0] ? item.sesi[0].kegiatan : '';
        document.getElementById('j-jam2').value = item.sesi && item.sesi[1] ? item.sesi[1].jam : '';
        document.getElementById('j-keg2').value = item.sesi && item.sesi[1] ? item.sesi[1].kegiatan : '';
        document.getElementById('j-jam3').value = item.sesi && item.sesi[2] ? item.sesi[2].jam : '';
        document.getElementById('j-keg3').value = item.sesi && item.sesi[2] ? item.sesi[2].kegiatan : '';
        document.getElementById('j-jam4').value = item.sesi && item.sesi[3] ? item.sesi[3].jam : '';
        document.getElementById('j-keg4').value = item.sesi && item.sesi[3] ? item.sesi[3].kegiatan : '';
    } else {
        document.getElementById('jadwal-modal-title').innerText = "Tambah Jadwal Kuliah Baru";
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
    if(!dbData.jadwalCustom) {
        const res = await fetch('jadwal.json');
        const data = await res.json();
        dbData.jadwalCustom = data.jadwal;
    }
    const newEntry = {
        tgl: document.getElementById('j-tgl').value,
        sesi: [
            { jam: document.getElementById('j-jam1').value || '-', kegiatan: document.getElementById('j-keg1').value || '-' },
            { jam: document.getElementById('j-jam2').value || '-', kegiatan: document.getElementById('j-keg2').value || '-' },
            { jam: document.getElementById('j-jam3').value || '-', kegiatan: document.getElementById('j-keg3').value || '-' },
            { jam: document.getElementById('j-jam4').value || '-', kegiatan: document.getElementById('j-keg4').value || '-' }
        ]
    };
    if(idx >= 0) dbData.jadwalCustom[idx] = newEntry;
    else dbData.jadwalCustom.push(newEntry);
    
    await saveData();
    closeModal('jadwal-modal');
    alert('Jadwal berhasil disimpan secara global!');
};

window.editJadwalItem = function(index) { openJadwalModal(index); };
window.deleteJadwalItem = async function(index) {
    if(confirm('Yakin ingin menghapus jadwal ini?')) {
        dbData.jadwalCustom.splice(index, 1);
        await saveData();
        alert('Jadwal dihapus!');
    }
};

window.addTugasItem = async function() {
    const nama = document.getElementById('t-nama').value;
    const deadline = document.getElementById('t-deadline').value;
    const ket = document.getElementById('t-ket').value;
    const fileInput = document.getElementById('t-file');
    const linkInput = document.getElementById('t-link').value;

    if(!nama || !deadline) return alert('Nama dan Deadline wajib diisi!');
    if (!dbData.tugas) dbData.tugas = [];

    if(fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = async function(e) {
            dbData.tugas.push({ id: Date.now(), nama, deadline, ket, link: e.target.result, fileName: file.name });
            await saveData();
            document.getElementById('t-nama').value = ''; document.getElementById('t-deadline').value = ''; document.getElementById('t-ket').value = ''; document.getElementById('t-link').value = ''; fileInput.value = '';
            alert('Tugas & file tersimpan global!');
        };
        reader.readAsDataURL(file);
    } else {
        dbData.tugas.push({ id: Date.now(), nama, deadline, ket, link: linkInput || '#' });
        await saveData();
        document.getElementById('t-nama').value = ''; document.getElementById('t-deadline').value = ''; document.getElementById('t-ket').value = ''; document.getElementById('t-link').value = '';
        alert('Tugas tersimpan global!');
    }
};

window.handlePraktikumUpload = async function(category, idNama, idSkenario, idKet, idFile, idLink) {
    const nama = document.getElementById(idNama).value;
    const skenario = document.getElementById(idSkenario).value;
    const ket = document.getElementById(idKet).value;
    const fileInput = document.getElementById(idFile);
    const linkInput = document.getElementById(idLink).value;

    if(!nama) return alert('Nama kegiatan wajib diisi!');
    if (!dbData[category]) dbData[category] = [];

    if(fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = async function(e) {
            dbData[category].push({ id: Date.now(), nama, skenario, ket, link: e.target.result, fileName: file.name });
            await saveData();
            document.getElementById(idNama).value = ''; document.getElementById(idSkenario).value = ''; document.getElementById(idKet).value = ''; document.getElementById(idLink).value = ''; fileInput.value = '';
            alert('Berhasil disimpan secara global!');
        };
        reader.readAsDataURL(file);
    } else {
        dbData[category].push({ id: Date.now(), nama, skenario, ket, link: linkInput || '#' });
        await saveData();
        document.getElementById(idNama).value = ''; document.getElementById(idSkenario).value = ''; document.getElementById(idKet).value = ''; document.getElementById(idLink).value = '';
        alert('Berhasil disimpan secara global!');
    }
};

window.handleMateriUpload = async function() {
    const kuliah = document.getElementById('m-kuliah').value;
    const materi = document.getElementById('m-materi').value;
    const fileInput = document.getElementById('m-file');
    const linkInput = document.getElementById('m-link').value;

    if(!kuliah || !materi) return alert('Nama kuliah dan materi wajib diisi!');
    if (!dbData.materi) dbData.materi = [];

    if(fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = async function(e) {
            dbData.materi.push({ id: Date.now(), kuliah, materi, link: e.target.result, fileName: file.name });
            await saveData();
            document.getElementById('m-kuliah').value = ''; document.getElementById('m-materi').value = ''; document.getElementById('m-link').value = ''; fileInput.value = '';
            alert('Materi diunggah secara global!');
        };
        reader.readAsDataURL(file);
    } else {
        dbData.materi.push({ id: Date.now(), kuliah, materi, link: linkInput || '#' });
        await saveData();
        document.getElementById('m-kuliah').value = ''; document.getElementById('m-materi').value = ''; document.getElementById('m-link').value = '';
        alert('Materi ditambahkan secara global!');
    }
};

window.openGenericEditModal = function(category, index) {
    document.getElementById('edit-cat').value = category;
    document.getElementById('edit-idx').value = index;
    const item = dbData[category][index];
    document.getElementById('edit-link').value = item.link !== '#' ? item.link : '';
    document.getElementById('edit-val3').value = item.ket || '';
    if(category === 'materi') {
        document.getElementById('generic-modal-title').innerText = "Edit Materi";
        document.getElementById('label-field1').innerText = "Nama Kuliah";
        document.getElementById('label-field2').innerText = "Topik Materi";
        document.getElementById('edit-val1').value = item.kuliah;
        document.getElementById('edit-val2').value = item.materi;
    } else if(category === 'tugas') {
        document.getElementById('generic-modal-title').innerText = "Edit Tugas";
        document.getElementById('label-field1').innerText = "Nama Tugas";
        document.getElementById('label-field2').innerText = "Deadline";
        document.getElementById('edit-val1').value = item.nama;
        document.getElementById('edit-val2').value = item.deadline;
    } else {
        document.getElementById('generic-modal-title').innerText = "Edit Kegiatan";
        document.getElementById('label-field1').innerText = "Nama Kegiatan";
        document.getElementById('label-field2').innerText = "Modul";
        document.getElementById('edit-val1').value = item.nama;
        document.getElementById('edit-val2').value = item.skenario;
    }
    document.getElementById('generic-edit-modal').style.display = 'flex';
};

window.saveGenericEdit = async function() {
    const category = document.getElementById('edit-cat').value;
    const index = parseInt(document.getElementById('edit-idx').value);
    const item = dbData[category][index];
    const v1 = document.getElementById('edit-val1').value;
    const v2 = document.getElementById('edit-val2').value;
    const v3 = document.getElementById('edit-val3').value;
    const linkInput = document.getElementById('edit-link').value;
    const fileInput = document.getElementById('edit-file');

    if(category === 'materi') { item.kuliah = v1; item.materi = v2; }
    else if(category === 'tugas') { item.nama = v1; item.deadline = v2; item.ket = v3; }
    else { item.nama = v1; item.skenario = v2; item.ket = v3; }

    if(linkInput) { item.link = linkInput; delete item.fileName; }

    if(fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = async function(e) {
            item.link = e.target.result; item.fileName = file.name;
            await saveData(); closeModal('generic-edit-modal');
            alert('Perubahan tersimpan global!');
        };
        reader.readAsDataURL(file);
    } else {
        await saveData(); closeModal('generic-edit-modal');
        alert('Perubahan tersimpan global!');
    }
};

function renderTugas() {
    const tbody = document.getElementById('tugas-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    if (!dbData.tugas) dbData.tugas = [];
    const isAdmin = currentUser && currentUser.role === 'admin';
    dbData.tugas.forEach((t, idx) => {
        let linkBtn = t.fileName ? `<a href="${t.link}" download="${t.fileName}" class="btn" style="width: auto; padding: 5px 10px; font-size: 12px; text-decoration:none; display:inline-block; margin-right:5px;">📥 Unduh (${t.fileName})</a>` : `<button class="btn" style="width: auto; padding: 5px 10px; font-size: 12px; margin-right:5px;" onclick="openInfoModal('${t.nama}', '${t.ket}', '${t.link}')">Keterangan</button>`;
        let adminBtns = isAdmin ? `
            <button class="btn" style="width: auto; padding: 3px 6px; font-size: 11px;" onclick="openGenericEditModal('tugas', ${idx})">Edit</button>
            <button class="btn btn-danger" style="width: auto; padding: 3px 6px; font-size: 11px;" onclick="deleteItem('tugas', ${idx})">Hapus</button>
        ` : '';
        tbody.innerHTML += `<tr><td><strong>${t.nama}</strong></td><td>${t.deadline}</td><td>${linkBtn} ${adminBtns}</td></tr>`;
    });
}

function renderPraktikum(category, elementId) {
    const container = document.getElementById(elementId);
    if(!container) return;
    container.innerHTML = '';
    if (!dbData[category]) dbData[category] = [];
    const isAdmin = currentUser && currentUser.role === 'admin';
    dbData[category].forEach((item, idx) => {
        let actionLink = item.fileName ? `<a href="${item.link}" download="${item.fileName}" class="btn" style="width: auto; padding: 6px 12px; font-size: 12px; text-decoration:none;">📥 Unduh (${item.fileName})</a>` : `<button class="btn" style="width: auto; padding: 6px 12px; font-size: 12px;" onclick="openInfoModal('${item.nama}', '${item.ket}', '${item.link}')">Lihat</button>`;
        let adminBtns = isAdmin ? `
            <button class="btn" style="width: auto; padding: 4px 8px; font-size: 11px;" onclick="openGenericEditModal('${category}', ${idx})">Edit</button>
            <button class="btn btn-danger" style="width: auto; padding: 4px 8px; font-size: 11px;" onclick="deleteItem('${category}', ${idx})">Hapus</button>
        ` : '';
        container.innerHTML += `
            <div style="background: var(--bg-light); border: 1px solid var(--border); padding: 15px; border-radius: 6px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                <div><h4 style="color: var(--text);">${item.nama}</h4><p style="font-size: 13px; color: var(--text-muted);">Modul: ${item.skenario}</p></div>
                <div>${actionLink} ${adminBtns}</div>
            </div>`;
    });
}

function renderMateri() {
    const tbody = document.getElementById('materi-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    if (!dbData.materi) dbData.materi = [];
    const isAdmin = currentUser && currentUser.role === 'admin';
    dbData.materi.forEach((m, idx) => {
        let aksesHtml = m.fileName ? `<a href="${m.link}" download="${m.fileName}" style="color: var(--accent); font-weight: 600; text-decoration: none;">📥 Unduh (${m.fileName})</a>` : `<a href="${m.link}" target="_blank" style="color: var(--accent); font-weight: 600; text-decoration: none;">Akses ↗</a>`;
        let adminBtns = isAdmin ? `
            <button class="btn" style="width: auto; padding: 3px 6px; font-size: 11px;" onclick="openGenericEditModal('materi', ${idx})">Edit</button>
            <button class="btn btn-danger" style="width: auto; padding: 3px 6px; font-size: 11px;" onclick="deleteItem('materi', ${idx})">Hapus</button>
        ` : '';
        tbody.innerHTML += `<tr><td><strong>${m.kuliah}</strong></td><td>${m.materi}</td><td>${aksesHtml} ${adminBtns}</td></tr>`;
    });
}

window.openInfoModal = function(title, text, link) {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-body').innerText = text || "Tidak ada keterangan.";
    const linkBox = document.getElementById('modal-link-container');
    if(link && link !== '#') {
        linkBox.innerHTML = `<a href="${link}" target="_blank" class="btn" style="display:block; text-align:center; text-decoration:none;">Buka Tautan ↗</a>`;
    } else {
        linkBox.innerHTML = '<span style="color:var(--text-muted); font-size:13px;">Tidak ada tautan.</span>';
    }
    document.getElementById('info-modal').style.display = 'flex';
};

window.addPengumuman = async function() {
    const judul = document.getElementById('p-judul').value;
    const isi = document.getElementById('p-isi').value;
    const deadline = document.getElementById('p-deadline').value;
    if(!judul || !isi || !deadline) return alert('Semua kolom wajib diisi!');
    if (!dbData.pengumuman) dbData.pengumuman = [];
    dbData.pengumuman.push({ id: Date.now(), judul, isi, deadline });
    await saveData();
    document.getElementById('p-judul').value = ''; document.getElementById('p-isi').value = ''; document.getElementById('p-deadline').value = '';
    alert('Pengumuman ditambahkan global!');
};

window.addReminder = async function() {
    const val = document.getElementById('rem-text').value;
    if(!val) return;
    if (!dbData.reminder) dbData.reminder = [];
    dbData.reminder.push(val);
    await saveData();
    document.getElementById('rem-text').value = '';
};

window.addJadwalUpdateWithFile = async function() {
    const title = document.getElementById('up-title').value;
    const fileInput = document.getElementById('up-file');
    if(!title && fileInput.files.length === 0) return alert('Isi keterangan atau pilih file!');
    if (!dbData.jadwalUpdates) dbData.jadwalUpdates = [];
    if(fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = async function(e) {
            dbData.jadwalUpdates.push(`${title} (<a href="${e.target.result}" download="${file.name}">Unduh: ${file.name}</a>)`);
            await saveData();
            document.getElementById('up-title').value = ''; fileInput.value = '';
        };
        reader.readAsDataURL(file);
    } else {
        dbData.jadwalUpdates.push(title);
        await saveData();
        document.getElementById('up-title').value = '';
    }
};

window.deleteItem = async function(category, index) {
    if(confirm('Yakin ingin menghapus item ini?')) {
        dbData[category].splice(index, 1);
        await saveData();
        alert('Berhasil dihapus!');
    }
};
