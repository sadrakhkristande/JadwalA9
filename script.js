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
const INACTIVITY_LIMIT = 30 * 60 * 1000;

const SUPABASE_URL = "https://vqzklxbfrvmvcoeykias.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_-NTQ0VL2xQmIYJ_ieREXkg_WUcU3L0t";

// URL WEB APP TERBARU (VERSI /2)
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxQVzmE_L4NXfsN0ZsSyOej2uWPUUKy_U5VShI9s-QEJJdYFvy2IJnDVa5tatKJk-ss/exec";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

async function fetchDatabaseFromCloud() {
    try {
        const { data, error } = await supabaseClient
            .from('portal_db')
            .select('value')
            .eq('key', 'data')
            .single();

        if (error) throw error;
        if (data && data.value) {
            dbData = Object.assign({}, dbData, data.value);
        }
    } catch (err) {
        console.error("Gagal memuat database dari Supabase:", err);
    }
    renderAll();
}

async function saveData() {
    renderAll();
    try {
        const { error } = await supabaseClient
            .from('portal_db')
            .update({ value: dbData })
            .eq('key', 'data');

        if (error) throw error;
    } catch (err) {
        console.error("Error Sync Cloud Supabase:", err);
        alert("Gagal menyimpan ke server online.");
    }
}

async function uploadToGoogleDrive(fileInput) {
    if (!fileInput || fileInput.files.length === 0) return '#';
    const file = fileInput.files[0];
    alert("Sedang mengunggah file ke Google Drive Anda...");
    
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = async function(e) {
            const base64Data = e.target.result.split(',')[1];
            const payload = { fileName: file.name, mimeType: file.type, fileData: base64Data };
            try {
                const response = await fetch(GOOGLE_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
                const result = await response.json();
                if(result.status === 'success') {
                    alert("File Berhasil Masuk ke Google Drive!");
                    resolve(result.url);
                } else {
                    alert("Gagal upload ke Drive: " + result.message);
                    resolve('#');
                }
            } catch(err) {
                console.error(err);
                alert("Kesalahan saat mengunggah file.");
                resolve('#');
            }
        };
        reader.readAsDataURL(file);
    });
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
        if(toggleBtn) { toggleBtn.innerText = "Nonaktifkan Maintenance"; toggleBtn.className = "btn btn-success"; }
    } else {
        if(banner) banner.style.display = 'none';
        if(toggleBtn) { toggleBtn.innerText = "Aktifkan Maintenance"; toggleBtn.className = "btn btn-warning"; }
    }
}

window.toggleMaintenanceMode = async function() {
    dbData.maintenance = !dbData.maintenance;
    await saveData();
    checkMaintenanceStatus();
    alert(dbData.maintenance ? "Maintenance diaktifkan." : "Maintenance dinonaktifkan.");
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
            saveUserSession(); initApp(); setupInactivityTracker();
        } else { alert('Kode Admin Salah!'); }
    } else {
        if (dbData.maintenance) { alert('Portal sedang Maintenance.'); return; }
        const nimInput = document.getElementById('login-nim-input');
        const nim = nimInput ? nimInput.value.trim() : '';
        if (nim === "12345" || allowedUsers[nim]) {
            currentUser = { role: 'guest', name: allowedUsers[nim] || "Guest " + nim, nim: nim };
            saveUserSession(); initApp(); setupInactivityTracker();
        } else { alert('NIM tidak valid!'); }
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
        document.querySelectorAll('.admin-only.card').forEach(el => el.style.display = 'block');
    } else {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }
    checkMaintenanceStatus(); renderAll();
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

function renderAll() {
    renderPengumuman(); renderReminder(); renderJadwalUpdates(); renderJadwal();
    renderTugas(); renderPraktikum('laboratorium', 'lab-list');
    renderPraktikum('skills_lab', 'skills-list'); renderPraktikum('tutorial', 'tutorial-list'); renderMateri();
}

function renderPengumuman() {
    const container = document.getElementById('pengumuman-list');
    if(!container) return; container.innerHTML = '';
    const today = new Date().toISOString().split('T')[0];
    if (!dbData.pengumuman) dbData.pengumuman = [];
    dbData.pengumuman.forEach((p, idx) => {
        if(p.deadline && p.deadline < today && currentUser && currentUser.role !== 'admin') return;
        const waText = encodeURIComponent(`*PENGUMUMAN*\n\n*${p.judul}*\n${p.isi}\n\nBerlaku s/d: ${p.deadline}`);
        const isAdmin = currentUser && currentUser.role === 'admin';
        container.innerHTML += `
            <div style="background: var(--bg-light); border-left: 4px solid var(--accent); padding: 15px; margin-bottom: 10px; border-radius: 4px; position: relative;">
                <h4 style="color:var(--text);">${p.judul}</h4>
                <p style="margin-top: 5px; font-size: 14px; color:var(--text);">${p.isi}</p>
                <small style="color: var(--text-muted); display: block; margin-top: 8px;">Aktif sampai: ${p.deadline}</small>
                <div style="margin-top: 10px;"><a href="https://wa.me/?text=${waText}" target="_blank" class="badge badge-wa">📲 Kirim ke WhatsApp</a></div>
                ${isAdmin ? `<button class="btn btn-danger" style="width: auto; padding: 2px 8px; font-size: 11px; position: absolute; top: 10px; right: 10px;" onclick="deleteItem('pengumuman', ${idx})">Hapus</button>` : ''}
            </div>`;
    });
}

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

async function renderJadwal() {
    const tbody = document.getElementById('jadwal-table-body');
    if(!tbody) return; tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Memuat jadwal...</td></tr>';
    let jadwalList = dbData.jadwalCustom && dbData.jadwalCustom.length > 0 ? dbData.jadwalCustom : [];
    if(jadwalList.length === 0) {
        try { const res = await fetch('jadwal.json'); const data = await res.json(); jadwalList = data.jadwal || []; } catch (e) { jadwalList = []; }
    }
    tbody.innerHTML = '';
    const nowWIB = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));
    const tomorrowWIB = new Date(nowWIB); tomorrowWIB.setDate(nowWIB.getDate() + 1);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    function formatDateStr(d) { return `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`; }
    const todayStr = formatDateStr(nowWIB), tomorrowStr = formatDateStr(tomorrowWIB);
    const filtered = jadwalList.filter(j => j && j.tgl && (j.tgl.includes(todayStr) || j.tgl.includes(tomorrowStr)));
    if(filtered.length === 0) { tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Tidak ada jadwal hari ini & besok.</td></tr>`; return; }
    const isAdmin = currentUser && currentUser.role === 'admin';
    filtered.forEach((j) => {
        const actualIdx = jadwalList.findIndex(item => item.tgl === j.tgl);
        const isToday = j.tgl.includes(todayStr);
        let badgeLabel = isToday ? '<span class="badge" style="background:#eab308; color:white;">Hari Ini</span>' : '<span class="badge" style="background:#3b82f6; color:white;">Besok</span>';
        let s1 = j.sesi?.[0] ? `<small>${j.sesi[0].jam}</small><br><strong>${j.sesi[0].kegiatan}</strong>` : '-';
        let s2 = j.sesi?.[1] ? `<small>${j.sesi[1].jam}</small><br><strong>${j.sesi[1].kegiatan}</strong>` : '-';
        let s3 = j.sesi?.[2] ? `<small>${j.sesi[2].jam}</small><br><strong>${j.sesi[2].kegiatan}</strong>` : '-';
        let s4 = j.sesi?.[3] ? `<small>${j.sesi[3].jam}</small><br><strong>${j.sesi[3].kegiatan}</strong>` : '-';
        let actBtn = isAdmin ? `<button class="btn" style="padding:2px 6px; font-size:11px;" onclick="deleteJadwalItem(${actualIdx})">Hapus</button>` : '';
        tbody.innerHTML += `<tr><td>${j.tgl}<br>${badgeLabel}</td><td>${s1}</td><td>${s2}</td><td>${s3}</td><td>${s4}</td>${isAdmin ? `<td>${actBtn}</td>` : ''}</tr>`;
    });
}

window.openJadwalModal = async function(index = -1) {
    if(!dbData.jadwalCustom) {
        try { const res = await fetch('jadwal.json'); const data = await res.json(); dbData.jadwalCustom = data.jadwal; } catch (e) { dbData.jadwalCustom = []; }
    }
    document.getElementById('edit-jadwal-index').value = index;
    if(index >= 0) {
        document.getElementById('jadwal-modal-title').innerText = "Edit Jadwal";
        let item = dbData.jadwalCustom[index];
        document.getElementById('j-tgl').value = item.tgl || '';
        document.getElementById('j-jam1').value = item.sesi?.[0]?.jam || ''; document.getElementById('j-keg1').value = item.sesi?.[0]?.kegiatan || '';
        document.getElementById('j-jam2').value = item.sesi?.[1]?.jam || ''; document.getElementById('j-keg2').value = item.sesi?.[1]?.kegiatan || '';
        document.getElementById('j-jam3').value = item.sesi?.[2]?.jam || ''; document.getElementById('j-keg3').value = item.sesi?.[2]?.kegiatan || '';
        document.getElementById('j-jam4').value = item.sesi?.[3]?.jam || ''; document.getElementById('j-keg4').value = item.sesi?.[3]?.kegiatan || '';
    } else {
        document.getElementById('jadwal-modal-title').innerText = "Tambah Jadwal Baru";
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
        const res = await fetch('jadwal.json'); const data = await res.json(); dbData.jadwalCustom = data.jadwal;
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
    await saveData(); closeModal('jadwal-modal'); alert('Jadwal tersimpan!');
};

window.deleteJadwalItem = async function(index) {
    if(confirm('Hapus jadwal ini?')) {
        dbData.jadwalCustom.splice(index, 1);
        await saveData(); alert('Jadwal dihapus!');
    }
};

window.addTugasItem = async function() {
    const nama = document.getElementById('t-nama').value;
    const deadline = document.getElementById('t-deadline').value;
    const ket = document.getElementById('t-ket').value;
    const fileInput = document.getElementById('t-file');
    if(!nama || !deadline) return alert('Nama dan Deadline wajib diisi!');
    if (!dbData.tugas) dbData.tugas = [];
    
    let fileUrl = '#';
    if(fileInput.files.length > 0) {
        fileUrl = await uploadToGoogleDrive(fileInput);
    }
    dbData.tugas.push({ id: Date.now(), nama, deadline, ket, link: fileUrl });
    await saveData();
    document.getElementById('t-nama').value = ''; document.getElementById('t-deadline').value = ''; document.getElementById('t-ket').value = ''; fileInput.value = '';
    alert('Tugas berhasil disimpan!');
};

window.handlePraktikumUpload = async function(category, idNama, idSkenario, idKet, idFile) {
    const nama = document.getElementById(idNama).value;
    const skenario = document.getElementById(idSkenario).value;
    const ket = document.getElementById(idKet).value;
    const fileInput = document.getElementById(idFile);
    if(!nama) return alert('Nama wajib diisi!');
    if (!dbData[category]) dbData[category] = [];
    
    let fileUrl = '#';
    if(fileInput.files.length > 0) {
        fileUrl = await uploadToGoogleDrive(fileInput);
    }
    dbData[category].push({ id: Date.now(), nama, skenario, ket, link: fileUrl });
    await saveData();
    document.getElementById(idNama).value = ''; document.getElementById(idSkenario).value = ''; document.getElementById(idKet).value = ''; fileInput.value = '';
    alert('Berhasil disimpan!');
};

window.handleMateriUpload = async function() {
    const kuliah = document.getElementById('m-kuliah').value;
    const materi = document.getElementById('m-materi').value;
    const fileInput = document.getElementById('m-file');
    if(!kuliah || !materi) return alert('Nama kuliah dan materi wajib diisi!');
    if (!dbData.materi) dbData.materi = [];
    
    let fileUrl = '#';
    if(fileInput.files.length > 0) {
        fileUrl = await uploadToGoogleDrive(fileInput);
    }
    dbData.materi.push({ id: Date.now(), kuliah, materi, link: fileUrl });
    await saveData();
    document.getElementById('m-kuliah').value = ''; document.getElementById('m-materi').value = ''; fileInput.value = '';
    alert('Materi berhasil diunggah!');
};

function renderTugas() {
    const tbody = document.getElementById('tugas-table-body');
    if(!tbody) return; tbody.innerHTML = '';
    if (!dbData.tugas) dbData.tugas = [];
    const isAdmin = currentUser && currentUser.role === 'admin';
    dbData.tugas.forEach((t, idx) => {
        let linkBtn = t.link && t.link !== '#' ? `<a href="${t.link}" target="_blank" class="btn" style="padding: 5px 10px; font-size: 12px; text-decoration:none;">🔗 Buka File Drive ↗</a>` : `<span style="color:var(--text-muted);">Tanpa file</span>`;
        let adminBtns = isAdmin ? `<button class="btn btn-danger" style="padding: 3px 6px; font-size: 11px; margin-left:5px;" onclick="deleteItem('tugas', ${idx})">Hapus</button>` : '';
        tbody.innerHTML += `<tr><td><strong>${t.nama}</strong></td><td>${t.deadline}</td><td>${linkBtn} ${adminBtns}</td></tr>`;
    });
}

function renderPraktikum(category, elementId) {
    const container = document.getElementById(elementId);
    if(!container) return; container.innerHTML = '';
    if (!dbData[category]) dbData[category] = [];
    const isAdmin = currentUser && currentUser.role === 'admin';
    dbData[category].forEach((item, idx) => {
        let actionLink = item.link && item.link !== '#' ? `<a href="${item.link}" target="_blank" class="btn" style="padding: 6px 12px; font-size: 12px; text-decoration:none;">🔗 Akses File ↗</a>` : `<span style="color:var(--text-muted);">Tanpa file</span>`;
        let adminBtns = isAdmin ? `<button class="btn btn-danger" style="padding: 4px 8px; font-size: 11px; margin-left:5px;" onclick="deleteItem('${category}', ${idx})">Hapus</button>` : '';
        container.innerHTML += `
            <div style="background: var(--bg-light); border: 1px solid var(--border); padding: 15px; border-radius: 6px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                <div><h4 style="color: var(--text);">${item.nama}</h4><p style="font-size: 13px; color: var(--text-muted);">Modul: ${item.skenario}</p></div>
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
        let aksesHtml = m.link && m.link !== '#' ? `<a href="${m.link}" target="_blank" style="color: var(--accent); font-weight: 600; text-decoration: none;">🔗 Buka File Drive ↗</a>` : `<span style="color:var(--text-muted);">Tanpa file</span>`;
        let adminBtns = isAdmin ? `<button class="btn btn-danger" style="padding: 3px 6px; font-size: 11px; margin-left: 5px;" onclick="deleteItem('materi', ${idx})">Hapus</button>` : '';
        tbody.innerHTML += `<tr><td><strong>${m.kuliah}</strong></td><td>${m.materi}</td><td>${aksesHtml} ${adminBtns}</td></tr>`;
    });
}

window.addPengumuman = async function() {
    const judul = document.getElementById('p-judul').value;
    const isi = document.getElementById('p-isi').value;
    const deadline = document.getElementById('p-deadline').value;
    if(!judul || !isi || !deadline) return alert('Semua kolom wajib diisi!');
    if (!dbData.pengumuman) dbData.pengumuman = [];
    dbData.pengumuman.push({ id: Date.now(), judul, isi, deadline });
    await saveData();
    document.getElementById('p-judul').value = ''; document.getElementById('p-isi').value = ''; document.getElementById('p-deadline').value = '';
    alert('Pengumuman ditambahkan!');
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
    if(!title) return;
    if (!dbData.jadwalUpdates) dbData.jadwalUpdates = [];
    dbData.jadwalUpdates.push(title);
    await saveData();
    document.getElementById('up-title').value = '';
};

window.deleteItem = async function(category, index) {
    if(confirm('Yakin ingin menghapus item ini?')) {
        dbData[category].splice(index, 1);
        await saveData();
        alert('Berhasil dihapus!');
    }
};
