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
    
    const targetTab = document.getElementById(`tab-${tabName}`);
    if(targetTab) targetTab.style.display = 'block';
    
    if(event && event.currentTarget) {
        event.currentTarget.classList.add('active');
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
        const waText = encodeURIComponent(`*PENGUMUMAN AKADEMIK BLOK 1.2*\n\n*${p.judul}*\n${p.isi}\n\nBerlaku s/d:${p.deadline}`);
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
        list.innerHTML += `<li style="margin-bottom: 6px; font-size: 14px; display: flex; justify-content: space-between; align-items: center;"><span>${r}</span>${currentUser.role === 'admin' ? `<button onclick="deleteItem('reminder', ${idx})" style="color:red; border:none; background:none; cursor:pointer; font-weight:bold;">[Hapus]</button>` : ''}</li>`;
    });
}

function renderJadwalUpdates() {
    const list = document.getElementById('jadwal-update-list');
    if(!list) return;
    list.innerHTML = '';
    dbData.jadwalUpdates.forEach((u, idx) => {
        list.innerHTML += `<li style="margin-bottom: 6px; font-size: 14px; display: flex; justify-content: space-between; align-items: center;"><span>📄 ${u}</span>${currentUser.role === 'admin' ? `<button onclick="deleteItem('jadwalUpdates', ${idx})" style="color:red; border:none; background:none; cursor:pointer; font-weight:bold;">[Hapus]</button>` : ''}</li>`;
    });
}

async function renderJadwal() {
    const tbody = document.getElementById('jadwal-table-body');
    if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Memuat agenda jadwal...</td></tr>';
    
    try {
        const response = await fetch('jadwal.json');
        const data = await response.json();
        
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

        const filteredJadwal = data.jadwal.filter(j => {
            return j.tgl.includes(todayStr) || j.tgl.includes(tomorrowStr);
        });

        if(filteredJadwal.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#64748b;">Tidak ada jadwal untuk hari ini (${todayStr}) dan besok (${tomorrowStr}).</td></tr>`;
            return;
        }

        filteredJadwal.forEach(j => {
            const isToday = j.tgl.includes(todayStr);
            let badgeClass = isToday ? 'highlight-today' : 'highlight-tomorrow';
            let badgeLabel = isToday ? '<span class="badge" style="background:#eab308; color:white;">Hari Ini</span>' : '<span class="badge" style="background:#3b82f6; color:white;">Besok</span>';

            let s1 = j.sesi[0] ? `<small style="color:#64748b">${j.sesi[0].jam}</small><br><strong>${j.sesi[0].kegiatan}</strong>` : '-';
            let s2 = j.sesi[1] ? `<small style="color:#64748b">${j.sesi[1].jam}</small><br><strong>${j.sesi[1].kegiatan}</strong>` : '-';
            let s3 = j.sesi[2] ? `<small style="color:#64748b">${j.sesi[2].jam}</small><br><strong>${j.sesi[2].kegiatan}</strong>` : '-';
            let s4 = j.sesi[3] ? `<small
