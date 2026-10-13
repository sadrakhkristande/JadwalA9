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

let dbData = JSON.parse(localStorage.getItem('portal_blok12_db')) || {
    pengumuman: [
        { id: 1, judul: "Pengumuman Blok 1.2", isi: "Perkuliahan dan praktikum berjalan sesuai jadwal.", deadline: "2026-11-01" }
    ],
    reminder: [
        "Cek jadwal harian Anatomi & Histologi",
        "Deadline tugas mandiri"
    ],
    jadwalUpdates: [
        "File Jadwal Resmi: Database jadwal.json terhubung otomatis."
    ],
    tugas: [
        { id: 1, nama: "Laporan Praktikum Anatomi", deadline: "16 Okt 2026", ket: "Kumpulkan laporan tepat waktu.", link: "https://forms.gle/contoh" }
    ],
    laboratorium: [
        { id: 1, nama: "Lab Anatomi Ekstremitas", skenario: "Modul Tulang & Sendi", ket: "Bawa penuntun praktikum masing-masing.", link: "https://drive.google.com/contoh" }
    ],
    skills_lab: [
        { id: 1, nama: "Skills Lab Palpasi", skenario: "Modul Pemeriksaan Fisik", ket: "Pakaian rapi berjas lab.", link: "https://drive.google.com/contoh" }
    ],
    tutorial: [
        { id: 1, nama: "Tutorial Kasus Skenario", skenario: "Diseminasi Kasus Klinik", ket: "Membawa referensi literatur.", link: "https://drive.google.com/contoh" }
    ],
    materi: [
        { id: 1, kuliah: "Anatomi Manusia", materi: "Slide Kuliah Pengantar", link: "#" }
    ],
    jadwalCustom: null,
    maintenance: false,
    theme: 'light'
};

// Inisialisasi Tema Saat Dimuat
window.addEventListener('DOMContentLoaded', () => {
    setTheme(dbData.theme || 'light');
    checkMaintenanceStatus();
});

function saveData() {
    localStorage.setItem('portal_blok12_db', JSON.stringify(dbData));
    renderAll();
}

// Pengaturan Tema (Light / Dark / White)
window.setTheme = function(themeName) {
    dbData.theme = themeName;
    localStorage.setItem('portal_blok12_db', JSON.stringify(dbData));
    
    document.body.classList.remove('theme-dark', 'theme-white');
    if(themeName === 'dark') {
        document.body.classList.add('theme-dark');
    } else if(themeName === 'white') {
        document.body.classList.add('theme-white');
    }
    
    const selector = document.getElementById('theme-selector');
    if(selector) selector.value = themeName;
};

// Pengaturan Maintenance Mode
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

window.toggleMaintenanceMode = function() {
    dbData.maintenance = !dbData.maintenance;
    saveData();
    checkMaintenanceStatus();
    alert(dbData.maintenance ? "Maintenance Mode diaktifkan. Guest tidak dapat masuk." : "Maintenance Mode dinonaktifkan.");
};

// Jam WIB Realtime
setInterval(() => {
    const now = new Date();
    const options = { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const clockEl = document.getElementById('wib-clock');
    if(clockEl) clockEl.innerText = `Waktu WIB: ${now.toLocaleDateString('id-ID', options)}`;
}, 1000);

window.toggleLoginFields = function() {
    const role = document.getElementById('login-role').value;
    document.getElementById('guest-fields').style.display = role === 'guest' ? 'block' : 'none';
    document.getElementById('admin-fields').style.display = role === 'admin' ? 'block' : 'none';
};

window.handleLogin = function() {
    const role = document.getElementById('login-role').value;
    if (role === 'admin') {
        const code = document.getElementById('login-admin-code').value;
        if (code === 'A9ACOR') {
            currentUser = { role: 'admin', name: 'Admin Utama (A9ACOR)' };
            initApp();
        } else {
            alert('Kode Admin Salah!');
        }
    } else {
        if (dbData.maintenance) {
            alert('Portal sedang dalam pemeliharaan (Maintenance). Guest/Mahasiswa belum dapat masuk.');
            return;
        }
        const nim = document.getElementById('login-nim-input').value.trim();
        if (nim === "12345" || allowedUsers[nim]) {
            currentUser = { role: 'guest', name: allowedUsers[nim] || "Guest " + nim, nim: nim };
            initApp();
        } else {
            alert('NIM atau Kode Guest tidak valid!');
        }
    }
};

function initApp() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    document.getElementById('user-info').innerText = `${currentUser.name} — (${currentUser.role.toUpperCase()})`;

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
    location.reload();
};

window.switchTab = function(tabName, btnElement) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    const targetTab = document.getElementById(`tab-${tabName}`);
    if(targetTab) targetTab.style.display = 'block';
    
    if(btnElement) {
        btnElement.classList.add('active');
    }
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
        const waText = encodeURIComponent(`*PENGUMUMAN AKADEMIK BLOK 1.2*\n\n*${p.judul}*\n${p.isi}\n\nBerlaku s/d: ${p.deadline}`);
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
        list.innerHTML += `<li style="margin-bottom: 6px; font-size: 14px; display: flex; justify-content: space-between; align-items: center; color:var(--text);"><span>${r}</span> ${currentUser.role === 'admin' ? `<button onclick="deleteItem('reminder', ${idx})" style="color:red; border:none; background:none; cursor:pointer; font-weight:bold;">[Hapus]</button>` : ''}</li>`;
    });
}

function renderJadwalUpdates() {
    const list = document.getElementById('jadwal-update-list');
    if(!list) return;
    list.innerHTML = '';
    dbData.jadwalUpdates.forEach((u, idx) => {
        list.innerHTML += `<li style="margin-bottom: 6px; font-size: 14px; display: flex; justify-content: space-between; align-items: center; color:var(--text);"><span>📄 ${u}</span> ${currentUser.role === 'admin' ? `<button onclick="deleteItem('jadwalUpdates', ${idx})" style="color:red; border:none; background:none; cursor:pointer; font-weight:bold;">[Hapus]</button>` : ''}</li>`;
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
            jadwalList = data.jadwal;
        } catch (error) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Gagal memuat jadwal.json. Pastikan file ada di GitHub.</td></tr>';
            return;
        }
    }

    tbody.innerHTML = '';

    const nowWIB = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));
    const tomorrowWIB = new Date(nowWIB);
    tomorrowWIB.setDate(nowWIB.getDate() + 1);

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    function formatDateStr(dateObj) {
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = months[dateObj.getMonth()];
        const year = String(dateObj.getFullYear()).slice(-2);
        return `${day}-${month}-${year}`;
    }

    const todayStr = formatDateStr(nowWIB);
    const tomorrowStr = formatDateStr(tomorrowWIB);

    const filteredJadwal = jadwalList.filter(j => {
        return j.tgl.includes(todayStr) || j.tgl.includes(tomorrowStr);
    });

    if(filteredJadwal.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">Tidak ada jadwal untuk hari ini (${todayStr}) dan besok (${tomorrowStr}).</td></tr>`;
        return;
    }

    filteredJadwal.forEach((j, index) => {
        const isToday = j.tgl.includes(todayStr);
        let badgeClass = isToday ? 'highlight-today' : 'highlight-tomorrow';
        let badgeLabel = isToday ? '<span class="badge" style="background:#eab308; color:white;">Hari Ini</span>' : '<span class="badge" style="background:#3b82f6; color:white;">Besok</span>';

        let s1 = j.sesi[0] ? `<small style="color:var(--text-muted)">${j.sesi[0].jam}</small><br><strong>${j.sesi[0].kegiatan}</strong>` : '-';
        let s2 = j.sesi[1] ? `<small style="color:var(--text-muted)">${j.sesi[1].jam}</small><br><strong>${j.sesi[1].kegiatan}</strong>` : '-';
        let s3 = j.sesi[2] ? `<small style="color:var(--text-muted)">${j.sesi[2].jam}</small><br><strong>${j.sesi[2].kegiatan}</strong>` : '-';
        let s4 = j.sesi[3] ? `<small style="color:var(--text-muted)">${j.sesi[3].jam}</small><br><strong>${j.sesi[3].kegiatan}</strong>` : '-';

        let actionBtn = currentUser.role === 'admin' ? `
            <button class="btn" style="width: auto; padding: 3px 6px; font-size: 11px; margin-bottom: 4px;" onclick="editJadwalItem(${index})">Edit</button>
            <button class="btn btn-danger" style="width: auto; padding: 3px 6px; font-size: 11px;" onclick="deleteJadwalItem(${index})">Hapus</button>
        ` : '';

        tbody.innerHTML += `<tr class="${badgeClass}">
            <td style="white-space: nowrap;">${j.tgl} <br>${badgeLabel}</td>
            <td>${s1}</td>
            <td>${s2}</td>
            <td>${s3}</td>
            <td>${s4}</td>
            ${currentUser.role === 'admin' ? `<td>${actionBtn}</td>` : ''}
        </tr>`;
    });
}

window.openJadwalModal = async function(index = -1) {
    if(!dbData.jadwalCustom) {
        try {
            const res = await fetch('jadwal.json');
            const data = await res.json();
            dbData.jadwalCustom = data.jadwal;
        } catch (e) {
            dbData.jadwalCustom = [];
        }
    }

    document.getElementById('edit-jadwal-index').value = index;
    if(index >= 0) {
        document.getElementById('jadwal-modal-title').innerText = "Edit Jadwal Kuliah";
        let item = dbData.jadwalCustom[index];
        document.getElementById('j-tgl').value = item.tgl;
        document.getElementById('j-jam1').value = item.sesi[0] ? item.sesi[0].jam : '';
        document.getElementById('j-keg1').value = item.sesi[0] ? item.sesi[0].kegiatan : '';
        document.getElementById('j-jam2').value = item.sesi[1] ? item.sesi[1].jam : '';
        document.getElementById('j-keg2').value = item.sesi[1] ? item.sesi[1].kegiatan : '';
        document.getElementById('j-jam3').value = item.sesi[2] ? item.sesi[2].jam : '';
        document.getElementById('j-keg3').value = item.sesi[2] ? item.sesi[2].kegiatan : '';
        document.getElementById('j-jam4').value = item.sesi[3] ? item.sesi[3].jam : '';
        document.getElementById('j-keg4').value = item.sesi[3] ? item.sesi[3].kegiatan : '';
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

window.saveJadwalItem = function() {
    const idx = parseInt(document.getElementById('edit-jadwal-index').value);
    const newEntry = {
        tgl: document.getElementById('j-tgl').value,
        sesi: [
            { jam: document.getElementById('j-jam1').value || '-', kegiatan: document.getElementById('j-keg1').value || '-' },
            { jam: document.getElementById('j-jam2').value || '-', kegiatan: document.getElementById('j-keg2').value || '-' },
            { jam: document.getElementById('j-jam3').value || '-', kegiatan: document.getElementById('j-keg3').value || '-' },
            { jam: document.getElementById('j-jam4').value || '-', kegiatan: document.getElementById('j-keg4').value || '-' }
        ]
    };

    if(idx >= 0) {
        dbData.jadwalCustom[idx] = newEntry;
    } else {
        dbData.jadwalCustom.push(newEntry);
    }
    saveData();
    closeModal('jadwal-modal');
};

window.editJadwalItem = function(index) {
    openJadwalModal(index);
};

window.deleteJadwalItem = async function(index) {
    if(confirm('Yakin ingin menghapus jadwal ini?')) {
        if(!dbData.jadwalCustom) {
            const res = await fetch('jadwal.json');
            const data = await res.json();
            dbData.jadwalCustom = data.jadwal;
        }
        dbData.jadwalCustom.splice(index, 1);
        saveData();
    }
};

window.addTugasItem = function() {
    const nama = document.getElementById('t-nama').value;
    const deadline = document.getElementById('t-deadline').value;
    const ket = document.getElementById('t-ket').value;
    const link = document.getElementById('t-link').value;

    if(!nama || !deadline) return alert('Nama dan Deadline wajib diisi!');
    dbData.tugas.push({ id: Date.now(), nama, deadline, ket, link });
    saveData();
    document.getElementById('t-nama').value = '';
    document.getElementById('t-deadline').value = '';
    document.getElementById('t-ket').value = '';
    document.getElementById('t-link').value = '';
    alert('Tugas berhasil ditambahkan!');
};

window.addPraktikumItem = function(category, idNama, idSkenario, idKet, idLink) {
    const nama = document.getElementById(idNama).value;
    const skenario = document.getElementById(idSkenario).value;
    const ket = document.getElementById(idKet).value;
    const link = document.getElementById(idLink).value;

    if(!nama) return alert('Nama kegiatan wajib diisi!');
    dbData[category].push({ id: Date.now(), nama, skenario, ket, link });
    saveData();
    document.getElementById(idNama).value = '';
    document.getElementById(idSkenario).value = '';
    document.getElementById(idKet).value = '';
    document.getElementById(idLink).value = '';
    alert('Data berhasil ditambahkan!');
};

window.addMateriItem = function() {
    const kuliah = document.getElementById('m-kuliah').value;
    const materi = document.getElementById('m-materi').value;
    const link = document.getElementById('m-link').value;

    if(!kuliah || !materi) return alert('Nama kuliah dan materi wajib diisi!');
    dbData.materi.push({ id: Date.now(), kuliah, materi, link: link || '#' });
    saveData();
    document.getElementById('m-kuliah').value = '';
    document.getElementById('m-materi').value = '';
    document.getElementById('m-link').value = '';
    alert('Materi berhasil ditambahkan!');
};

function renderTugas() {
    const tbody = document.getElementById('tugas-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    dbData.tugas.forEach((t, idx) => {
        tbody.innerHTML += `<tr>
            <td><strong>${t.nama}</strong></td>
            <td>${t.deadline}</td>
            <td>
                <button class="btn" style="width: auto; padding: 5px 10px; font-size: 12px;" onclick="openInfoModal('${t.nama}', '${t.ket}', '${t.link}')">Keterangan & Link</button>
                ${currentUser.role === 'admin' ? `<button class="btn btn-danger" style="width: auto; padding: 5px 10px; font-size: 12px; margin-left: 5px;" onclick="deleteItem('tugas', ${idx})">Hapus</button>` : ''}
            </td>
        </tr>`;
    });
}

function renderPraktikum(category, elementId) {
    const container = document.getElementById(elementId);
    if(!container) return;
    container.innerHTML = '';
    dbData[category].forEach((item, idx) => {
        container.innerHTML += `
            <div style="background: var(--bg-light); border: 1px solid var(--border); padding: 15px; border-radius: 6px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h4 style="color: var(--text);">${item.nama}</h4>
                    <p style="font-size: 13px; color: var(--text-muted); margin-top: 3px;">Modul: ${item.skenario}</p>
                </div>
                <div>
                    <button class="btn" style="width: auto; padding: 6px 12px; font-size: 12px;" onclick="openInfoModal('${item.nama}', '${item.ket}', '${item.link}')">Lihat Keterangan & Modul</button>
                    ${currentUser.role === 'admin' ? `<button class="btn btn-danger" style="width: auto; padding: 6px 10px; font-size: 12px; margin-left: 5px;" onclick="deleteItem('${category}',${idx})">Hapus</button>` : ''}
                </div>
            </div>
        `;
    });
}

function renderMateri() {
    const tbody = document.getElementById('materi-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    dbData.materi.forEach((m, idx) => {
        tbody.innerHTML += `<tr>
            <td><strong>${m.kuliah}</strong></td>
            <td>${m.materi}</td>
            <td>
                <a href="${m.link}" target="_blank" style="color: var(--accent); font-weight: 600; text-decoration: none;">Akses File ↗</a>
                ${currentUser.role === 'admin' ? `<button class="btn btn-danger" style="width: auto; padding: 3px 6px; font-size: 11px; margin-left: 10px;" onclick="deleteItem('materi', ${idx})">Hapus</button>` : ''}
            </td>
        </tr>`;
    });
}

window.openInfoModal = function(title, text, link) {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-body').innerText = text || "Tidak ada keterangan tambahan.";
    const linkBox = document.getElementById('modal-link-container');
    if(link) {
        linkBox.innerHTML = `<a href="${link}" target="_blank" class="btn" style="display:block; text-align:center; text-decoration:none;">Buka Tautan / File ↗</a>`;
    } else {
        linkBox.innerHTML = '<span style="color:var(--text-muted); font-size:13px;">Tidak ada tautan.</span>';
    }
    document.getElementById('info-modal').style.display = 'flex';
};

window.addPengumuman = function() {
    const judul = document.getElementById('p-judul').value;
    const isi = document.getElementById('p-isi').value;
    const deadline = document.getElementById('p-deadline').value;

    if(!judul || !isi || !deadline) return alert('Semua kolom wajib diisi!');
    dbData.pengumuman.push({ id: Date.now(), judul, isi, deadline });
    saveData();
    document.getElementById('p-judul').value = '';
    document.getElementById('p-isi').value = '';
    document.getElementById('p-deadline').value = '';
    alert('Pengumuman berhasil ditambahkan!');
};

window.addReminder = function() {
    const val = document.getElementById('rem-text').value;
    if(!val) return;
    dbData.reminder.push(val);
    saveData();
    document.getElementById('rem-text').value = '';
};

window.addJadwalUpdateWithFile = function() {
    const title = document.getElementById('up-title').value;
    const fileInput = document.getElementById('up-file');
    
    if(!title && fileInput.files.length === 0) return alert('Masukkan keterangan atau pilih file!');
    
    if(fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            dbData.jadwalUpdates.push(`${title} (<a href="${e.target.result}" download="${file.name}">Unduh File: ${file.name}</a>)`);
            saveData();
            document.getElementById('up-title').value = '';
            fileInput.value = '';
        };
        reader.readAsDataURL(file);
    } else {
        dbData.jadwalUpdates.push(title);
        saveData();
        document.getElementById('up-title').value = '';
    }
};

window.deleteItem = function(category, index) {
    if(confirm('Yakin ingin menghapus item ini dari sistem?')) {
        dbData[category].splice(index, 1);
        saveData();
    }
};
