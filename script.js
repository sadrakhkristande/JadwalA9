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
    ]
};

function saveData() {
    localStorage.setItem('portal_blok12_db', JSON.stringify(dbData));
    renderAll();
}

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
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'block');
    } else {
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }
    renderAll();
}

window.handleLogout = function() {
    location.reload();
};

window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).style.display = 'block';
    if(event && event.target) event.target.classList.add('active');
};

window.closeModal = function(id) {
    document.getElementById(id).style.display = 'none';
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
            <div style="background: #f8fafc; border-left: 4px solid var(--accent); padding: 15px; margin-bottom: 10px; border-radius: 4px; position: relative;">
                <h4>${p.judul}</h4>
                <p style="margin-top: 5px; font-size: 14px;">${p.isi}</p>
                <small style="color: #64748b; display: block; margin-top: 8px;">Aktif sampai: ${p.deadline}</small>
                <div style="margin-top: 10px;">
                    <a href="https://wa.me/?text=${waText}" target="_blank" class="badge badge-wa">📲 Kirim / Bagikan ke WhatsApp</a>
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
        list.innerHTML += `<li style="margin-bottom: 6px; font-size: 14px; display: flex; justify-content: space-between; align-items: center;"><span>${r}</span> ${currentUser.role === 'admin' ? `<button onclick="deleteItem('reminder', ${idx})" style="color:red; border:none; background:none; cursor:pointer; font-weight:bold;">[Hapus]</button>` : ''}</li>`;
    });
}

function renderJadwalUpdates() {
    const list = document.getElementById('jadwal-update-list');
    if(!list) return;
    list.innerHTML = '';
    dbData.jadwalUpdates.forEach((u, idx) => {
        list.innerHTML += `<li style="margin-bottom: 6px; font-size: 14px; display: flex; justify-content: space-between; align-items: center;"><span>📄 ${u}</span> ${currentUser.role === 'admin' ? `<button onclick="deleteItem('jadwalUpdates', ${idx})" style="color:red; border:none; background:none; cursor:pointer; font-weight:bold;">[Hapus]</button>` : ''}</li>`;
    });
}

// Filter Jadwal Hari Ini & Besok (Khusus Kelas A)
async function renderJadwal() {
    const tbody = document.getElementById('jadwal-table-body');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Memuat agenda jadwal...</td></tr>';
    
    try {
        const response = await fetch('jadwal.json');
        const data = await response.json();
        
        tbody.innerHTML = '';
        const keywordToday = "13-Oct";
        const keywordTomorrow = "14-Oct";

        const filteredJadwal = data.jadwal.filter(j => {
            return j.tgl.includes(keywordToday) || j.tgl.includes(keywordTomorrow);
        });

        if(filteredJadwal.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#64748b;">Tidak ada jadwal untuk hari ini dan besok.</td></tr>';
            return;
        }

        filteredJadwal.forEach(j => {
            const isToday = j.tgl.includes(keywordToday);
            let badgeClass = isToday ? 'highlight-today' : 'highlight-tomorrow';
            let badgeLabel = isToday ? '<span class="badge" style="background:#eab308; color:white;">Hari Ini (13 Okt)</span>' : '<span class="badge" style="background:#3b82f6; color:white;">Besok (14 Okt)</span>';

            tbody.innerHTML += `<tr class="${badgeClass}">
                <td>${j.tgl} ${badgeLabel}</td>
                <td>${j.jam}</td>
                <td>${j.kelasA}</td>
            </tr>`;
        });
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:red;">Gagal memuat jadwal.json. Pastikan file ada di GitHub.</td></tr>';
    }
}

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
            <div style="background: #f8fafc; border: 1px solid var(--border); padding: 15px; border-radius: 6px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h4 style="color: var(--primary);">${item.nama}</h4>
                    <p style="font-size: 13px; color: #64748b; margin-top: 3px;">Modul: ${item.skenario}</p>
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
        linkBox.innerHTML = '<span style="color:#64748b; font-size:13px;">Tidak ada tautan.</span>';
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
