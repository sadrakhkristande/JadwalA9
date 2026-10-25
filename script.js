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

// --- GUARD: Jangan sampai script mati total kalau CDN Supabase gagal load ---
let supabaseClient = null;
try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.warn('[Portal A9] Supabase CDN belum termuat. Mode offline aktif.');
    }
} catch (err) {
    console.error('[Portal A9] Gagal inisialisasi Supabase:', err);
}

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
    soal: [],
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
        if (!supabaseClient) throw new Error('Supabase client tidak tersedia');
        const keys = ['pengumuman', 'reminder', 'tugas', 'laboratorium', 'skills_lab', 'tutorial', 'materi', 'jadwal', 'soal', 'config'];
        
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

    // Default soal awal jika tabel soal masih kosong
    if (!dbData.soal || dbData.soal.length === 0) {
        dbData.soal = [
            {
                "id": 1711000000001,
                "category": "anatomi",
                "question": "Seorang mahasiswa kedokteran mengamati struktur tulang shoulder girdle (cingulum membri superioris). Tulang ini memiliki dua extremitas, yaitu extremitas sternalis dan extremitas acromialis, serta sulcus musculi subclavii di permukaan inferiornya. Apakah nama tulang yang dimaksud?",
                "answer": "Os Clavicula",
                "explanation": "Os clavicula (tulang selangka) adalah tulang berbentuk S panjang yang menghubungkan sternum dengan scapula.",
                "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Clavicle_-_inferior_surface.png/800px-Clavicle_-_inferior_surface.png"
            },
            {
                "id": 1711000000002,
                "category": "anatomi",
                "question": "Kelompok otot Rotator Cuff sangat penting untuk menjaga stabilitas articulatio humeri. Sebutkan satu otot besar yang BUKAN merupakan anggota dari kelompok musculi rotator cuff (otot yang sering keliru dianggap bagian SITS)?",
                "answer": "M. Teres Major",
                "explanation": "Otot Rotator Cuff disingkat SITS: M. Supraspinatus, M. Infraspinatus, M. Teres Minor, dan M. Subscapularis. M. Teres Major tidak termasuk di dalamnya."
            },
            {
                "id": 1711000000003,
                "category": "anatomi",
                "question": "Struktur saraf apakah yang mengalami kompresi atau penekanan di dalam Canalis Carpi hingga menyebabkan kondisi Carpal Tunnel Syndrome (CTS)?",
                "answer": "Nervus Medianus",
                "explanation": "Canalis carpi dilewati oleh 9 tendon otot flexor dan 1 saraf utama yaitu Nervus Medianus.",
                "image": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Carpal_tunnel_and_carpal_bones.png/640px-Carpal_tunnel_and_carpal_bones.png"
            },
            {
                "id": 1711000000004,
                "category": "anatomi",
                "question": "Pria yang mengalami fraktur pada pertengahan shaft/corpus os humerus (di sulcus nervi radialis) mengalami kelumpuhan otot extensor sehingga pergelangan tangannya terkulai ke bawah. Apakah nama kelainan klinis tersebut?",
                "answer": "Wrist Drop",
                "explanation": "Kerusakan pada Nervus Radialis akibat fraktur shaft humerus menyebabkan hilangnya fungsi otot extensor lengan bawah yang bergejala sebagai wrist drop."
            },
            {
                "id": 1711000000005,
                "category": "anatomi",
                "question": "Fasciculus posterior dari plexus brachialis (C5-T1) bercabang menjadi dua nervus utama penunjang ekstremitas superior. Sebutkan salah satu dari dua nervus utama tersebut!",
                "answer": "Nervus Radialis",
                "explanation": "Fasciculus posterior plexus brachialis memberikan cabang terminal utama berupa Nervus Axillaris dan Nervus Radialis."
            },
            {
                "id": 1711000000006,
                "category": "anatomi",
                "question": "Pada cranium neonatus, terdapat area membranosa berbentuk rhomboid (belah ketupat) pada persimpangan sutura coronalis dan sagittalis yang disebut fontanella major. Apakah nama titik pertemuan dewasa dari area ini?",
                "answer": "Bregma",
                "explanation": "Fontanella major (fonticulus anterior) berangsur menutup dan membentuk titik kranio-metrik dewasa yang dinamakan Bregma."
            },
            {
                "id": 1711000000007,
                "category": "anatomi",
                "question": "Dari 8 tulang penyusun neurocranium, terdapat 4 tulang tunggal (unpaired). Sebutkan salah satu dari tulang tunggal penyusun neurocranium tersebut!",
                "answer": "Os Frontale",
                "explanation": "4 tulang tunggal Neurocranium adalah Os Frontale, Os Ethmoidale, Os Sphenoidale, dan Os Occipitale."
            },
            {
                "id": 1711000000008,
                "category": "anatomi",
                "question": "Lubang (foramen) di basis cranii bagian fossa cranii media yang dilewati oleh cabang nervus mandibularis (V3) disebut foramen...",
                "answer": "Foramen Ovale",
                "explanation": "Fissura orbitalis superior dilewati N. V1, Foramen Rotundum dilewati N. V2, dan Foramen Ovale dilewati N. V3 (N. mandibularis)."
            },
            {
                "id": 1711000000009,
                "category": "anatomi",
                "question": "Viscerocranium (ossa faciei) terdiri dari 14 tulang, di mana dua di antaranya merupakan tulang tunggal (unpaired). Sebutkan salah satu dari dua tulang wajah tunggal tersebut!",
                "answer": "Os Mandibula",
                "explanation": "Viscerocranium memiliki 2 tulang tunggal yaitu Os Mandibula dan Os Vomer."
            },
            {
                "id": 1711000000010,
                "category": "anatomi",
                "question": "Titik kranio-metrik 'Pterion' merupakan area rawan cedera di dinding lateral cranium. Pecahnya pembuluh darah di balik area ini berisiko tinggi menyebabkan hematoma jenis...",
                "answer": "Epidural Hematoma",
                "explanation": "Di balik titik Pterion berjalan cabang anterior Arteri Meningea Media, sehingga ruda paksa pada area ini dapat memicu terjadinya Epidural Hematoma (EDH)."
            },
            {
                "id": 1711000000011,
                "category": "anatomi",
                "question": "Otot kompartemen anterior brachium yang diinervasi oleh Nervus Musculocutaneus dan berfungsi utama sebagai flexor kuat pada articulatio cubiti serta supinator lengan bawah adalah M...",
                "answer": "M. Biceps Brachii",
                "explanation": "M. biceps brachii memiliki dua caput (longum et breve) dan merupakan flexor serta supinator utama lengan bawah."
            },
            {
                "id": 1711000000012,
                "category": "anatomi",
                "question": "Foramen jugulare di basis cranii yang dibentuk oleh os temporale dan os occipitale dilewati oleh vena jugularis interna serta beberapa saraf kranial, di antaranya Nervus Glossopharyngeus (IX), Nervus Vagus (X), dan Nervus...",
                "answer": "Nervus Accessorius",
                "explanation": "Foramen jugulare dilewati oleh N. IX, N. X, dan N. XI (N. accessorius), serta awal Vena Jugularis Interna."
            },
            {
                "id": 1711000000013,
                "category": "anatomi",
                "question": "Otot kelompok penunjang ekspresi wajah (mimik) yang melingkari mata dan berfungsi untuk menutup kelopak mata secara rapat adalah M...",
                "answer": "M. Orbicularis Oculi",
                "explanation": "M. orbicularis oculi adalah otot sphincter di sekitar mata yang dipersarafi oleh cabang Nervus Facialis (VII)."
            },
            {
                "id": 1711000000014,
                "category": "anatomi",
                "question": "Kelompok otot thenar pada telapak tangan yang berperan penting untuk gerak opposisi ibu jari sebagian besar diinervasi oleh cabang dari Nervus...",
                "answer": "Nervus Medianus",
                "explanation": "Sebagian besar otot thenar diinervasi oleh N. medianus, kecuali bagian profunda M. flexor pollicis brevis yang dipersarafi N. ulnaris."
            },
            {
                "id": 1711000000015,
                "category": "anatomi",
                "question": "Pada basis cranii fossa cranii anterior, terdapat lempengan bertulang berpori dari os ethmoidale tempat lewatnya serabut-serabut saraf penciuman (N. I). Apakah nama lempengan tersebut?",
                "answer": "Lamina Cribrosa",
                "explanation": "Lamina cribrosa os ethmoidale dilewati oleh fila olfactoria (Nervus Olfactorius / N. I) menuju bulbus olfactorius."
            }
        ];
    }

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
    renderAll();
    if (!supabaseClient) {
        console.warn('[Portal A9] Mode offline: perubahan tidak disinkronkan ke cloud.');
        return;
    }
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

// FUNGSI UPLOAD FILE HINGGA 50MB KE SUPABASE STORAGE
async function uploadFileToSupabaseStorage(fileInputId) {
    const fileInput = document.getElementById(fileInputId);
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        return null;
    }
    const file = fileInput.files[0];
    
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
        alert(`⚠️ Ukuran file "${file.name}" adalah ${(file.size / (1024*1024)).toFixed(2)} MB.\nMaksimal ukuran berkas yang diizinkan adalah 50 MB.`);
        fileInput.value = '';
        return null;
    }

    if (!supabaseClient) {
        alert('Upload file tidak tersedia (Supabase tidak terhubung).');
        return null;
    }

    try {
        const filePath = `uploads/${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const { data, error } = await supabaseClient.storage
            .from('portal-files')
            .upload(filePath, file);

        if (error) throw error;

        const { data: publicUrlData } = supabaseClient.storage
            .from('portal-files')
            .getPublicUrl(filePath);

        return publicUrlData.publicUrl;
    } catch (err) {
        console.error("Gagal mengunggah file ke Storage:", err);
        alert("Gagal mengunggah berkas ke server penyimpanan Supabase.");
        return null;
    }
}

window.openPreviewModal = function(fileUrl, title = "Preview Dokumen") {
    const modal = document.getElementById('preview-modal');
    const frame = document.getElementById('preview-frame');
    const titleEl = document.getElementById('preview-title');
    
    if(!modal || !frame) return;
    
    titleEl.innerText = title;
    
    if (fileUrl.match(/\.(pdf|docx?|pptx?)$/i)) {
        frame.src = `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;
    } else {
        frame.src = fileUrl;
    }
    
    modal.style.display = 'flex';
};

window.closePreviewModal = function() {
    const modal = document.getElementById('preview-modal');
    const frame = document.getElementById('preview-frame');
    if(modal) modal.style.display = 'none';
    if(frame) frame.src = '';
};

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
// KELOLA JADWAL (FILTER HARI INI & BESOK)
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
    renderSoalTab();
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
    const uploadedUrl = await uploadFileToSupabaseStorage('t-file-pc');
    if (uploadedUrl) { finalLink = uploadedUrl; }

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
    const uploadedUrl = await uploadFileToSupabaseStorage(idFilePc);
    if (uploadedUrl) { finalLink = uploadedUrl; }

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
    const uploadedUrl = await uploadFileToSupabaseStorage('m-file-pc');
    if (uploadedUrl) { finalLink = uploadedUrl; }

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
        let actionBtn = t.link && t.link !== '#' ? `
            <button class="btn" style="padding: 5px 10px; font-size: 12px; background:var(--accent);" onclick="openPreviewModal('${t.link}', '${t.nama}')">👁️ Preview</button>
            <a href="${t.link}" target="_blank" download class="btn" style="padding: 5px 10px; font-size: 12px; text-decoration:none; background:#047857; margin-left:4px;">📥 Unduh</a>
        ` : `<span style="color:var(--text-muted);">Tanpa berkas</span>`;
        let adminBtns = isAdmin ? `<button class="btn btn-danger" style="padding: 3px 6px; font-size: 11px; margin-left:5px;" onclick="deleteItem('tugas', ${idx})">Hapus</button>` : '';
        tbody.innerHTML += `<tr><td><strong>${t.nama}</strong><br><small style="color:var(--text-muted);">${t.ket || ''}</small></td><td>${t.deadline}</td><td>${actionBtn} ${adminBtns}</td></tr>`;
    });
}

function renderPraktikum(category, elementId) {
    const container = document.getElementById(elementId);
    if(!container) return; container.innerHTML = '';
    if (!dbData[category]) dbData[category] = [];
    const isAdmin = currentUser && currentUser.role === 'admin';
    dbData[category].forEach((item, idx) => {
        let actionBtn = item.link && item.link !== '#' ? `
            <button class="btn" style="padding: 6px 12px; font-size: 12px; background:var(--accent);" onclick="openPreviewModal('${item.link}', '${item.nama}')">👁️ Preview</button>
            <a href="${item.link}" target="_blank" download class="btn" style="padding: 6px 12px; font-size: 12px; text-decoration:none; background:#047857; margin-left:4px;">📥 Unduh</a>
        ` : `<span style="color:var(--text-muted);">Tanpa berkas</span>`;
        let adminBtns = isAdmin ? `<button class="btn btn-danger" style="padding: 4px 8px; font-size: 11px; margin-left:5px;" onclick="deleteItem('${category}', ${idx})">Hapus</button>` : '';
        container.innerHTML += `
            <div style="background: var(--bg-light); border: 1px solid var(--border); padding: 15px; border-radius: 6px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap:wrap; gap:10px;">
                <div><h4 style="color: var(--text);">${item.nama}</h4><p style="font-size: 13px; color: var(--text-muted);">Modul: ${item.skenario} | ${item.ket || ''}</p></div>
                <div>${actionBtn} ${adminBtns}</div>
            </div>`;
    });
}

function renderMateri() {
    const tbody = document.getElementById('materi-table-body');
    if(!tbody) return; tbody.innerHTML = '';
    if (!dbData.materi) dbData.materi = [];
    const isAdmin = currentUser && currentUser.role === 'admin';
    dbData.materi.forEach((m, idx) => {
        let aksesHtml = m.link && m.link !== '#' ? `
            <button class="btn" style="padding: 4px 8px; font-size: 12px; background:var(--accent);" onclick="openPreviewModal('${m.link}', '${m.kuliah} - ${m.materi}')">👁️ Preview</button>
            <a href="${m.link}" target="_blank" download style="color: var(--accent); font-weight: 600; text-decoration: none; margin-left:6px;">📥 Unduh</a>
        ` : `<span style="color:var(--text-muted);">Tanpa berkas</span>`;
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

// ==========================================================================
// KELOLA BANK SOAL & LATIHAN KUIS ISIAN INTERAKTIF
// ==========================================================================
function renderSoalTab() {
    const startCard = document.getElementById('quiz-start-card');
    const activeArea = document.getElementById('quiz-active-area');
    
    if (startCard) startCard.style.display = 'block';
    if (activeArea) activeArea.style.display = 'none';
}

function startQuiz() {
    const startCard = document.getElementById('quiz-start-card');
    const activeArea = document.getElementById('quiz-active-area');
    const container = document.getElementById('soal-cards-container');
    const category = document.getElementById('soal-category-select').value;
    
    if (startCard) startCard.style.display = 'none';
    if (activeArea) activeArea.style.display = 'block';

    document.getElementById('submit-quiz-btn').style.display = 'inline-flex';
    document.getElementById('reset-quiz-btn').style.display = 'none';
    document.getElementById('quiz-result-card').style.display = 'none';

    container.innerHTML = '';

    if (!dbData.soal) dbData.soal = [];
    const categorySoal = dbData.soal.filter(s => s.category === category);

    if (categorySoal.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:var(--text-muted); padding:20px;">Belum ada soal isian untuk sub-bagian Anatomi ini.</p>`;
        document.getElementById('submit-quiz-btn').style.display = 'none';
        return;
    }

    const isAdmin = currentUser && currentUser.role === 'admin';

    categorySoal.forEach((s, idx) => {
        const actualIdx = dbData.soal.findIndex(item => item.id === s.id);

        let imageHtml = s.image ? `
            <div style="margin: 12px 0; text-align: center;">
                <img src="${s.image}" alt="Ilustrasi Soal Anatomi" style="max-width: 100%; max-height: 220px; border-radius: 8px; border: 1px solid var(--border); object-fit: contain; background: #fff; padding: 4px;">
            </div>
        ` : '';

        let adminBtns = isAdmin ? `
            <div style="margin-top:10px;">
                <button class="btn" style="padding:3px 8px; font-size:11px; background:#d97706;" onclick="openSoalModal(${actualIdx})">Edit Soal</button>
                <button class="btn btn-danger" style="padding:3px 8px; font-size:11px; margin-left:4px;" onclick="deleteSoalItem(${actualIdx})">Hapus Soal</button>
            </div>
        ` : '';

        container.innerHTML += `
            <div class="card" style="margin-bottom:18px; border-left:4px solid var(--accent); background:var(--bg-card);">
                <p style="font-size:15px; font-weight:bold; color:var(--text); margin-bottom:8px;">Soal ${idx + 1}: ${s.question}</p>
                ${imageHtml}
                <div style="margin-top: 10px;">
                    <input type="text" id="jawaban_${s.id}" class="input-field" placeholder="Ketik jawaban Anda di sini..." style="padding: 10px 14px; font-size: 14px;">
                </div>
                <div id="feedback-${s.id}" class="feedback-box" style="display:none; margin-top:12px; padding:12px; border-radius:8px; font-size:13px; line-height:1.5;"></div>
                ${adminBtns}
            </div>
        `;
    });
}

function submitQuiz() {
    const category = document.getElementById('soal-category-select').value;
    const categorySoal = dbData.soal.filter(s => s.category === category);

    if (categorySoal.length === 0) return;

    let score = 0;

    categorySoal.forEach((s) => {
        const inputEl = document.getElementById(`jawaban_${s.id}`);
        const feedbackEl = document.getElementById(`feedback-${s.id}`);
        if (!inputEl || !feedbackEl) return;

        feedbackEl.style.display = 'block';
        const userAns = inputEl.value.trim().toLowerCase();
        const correctAnswer = (s.answer || "").trim().toLowerCase();

        if (userAns !== "" && (userAns === correctAnswer || correctAnswer.includes(userAns) || userAns.includes(correctAnswer))) {
            score++;
            feedbackEl.style.background = '#d1fae5';
            feedbackEl.style.color = '#065f46';
            feedbackEl.style.border = '1px solid #a7f3d0';
            feedbackEl.innerHTML = `<strong>✅ Benar!</strong> Jawaban Anda sesuai.<br><em>Kunci:</em> <strong>${s.answer}</strong><br>${s.explanation || ''}`;
        } else if (userAns === "") {
            feedbackEl.style.background = '#fee2e2';
            feedbackEl.style.color = '#991b1b';
            feedbackEl.style.border = '1px solid #fca5a5';
            feedbackEl.innerHTML = `<strong>⚠️ Tidak Dijawab!</strong><br><em>Kunci Jawaban:</em> <strong>${s.answer}</strong><br>${s.explanation || ''}`;
        } else {
            feedbackEl.style.background = '#fee2e2';
            feedbackEl.style.color = '#991b1b';
            feedbackEl.style.border = '1px solid #fca5a5';
            feedbackEl.innerHTML = `<strong>❌ Kurang Tepat / Salah!</strong><br>Jawaban Anda: "${inputEl.value}"<br><em>Kunci Jawaban:</em> <strong>${s.answer}</strong><br>${s.explanation || ''}`;
        }
    });

    const resultCard = document.getElementById('quiz-result-card');
    const scoreText = document.getElementById('quiz-score-text');
    const percentage = Math.round((score / categorySoal.length) * 100);

    scoreText.innerText = `Skor Anda: ${score} / ${categorySoal.length} (${percentage}%)`;
    resultCard.style.display = 'block';

    document.getElementById('submit-quiz-btn').style.display = 'none';
    document.getElementById('reset-quiz-btn').style.display = 'inline-flex';
}

function resetQuiz() {
    startQuiz();
}

window.openSoalModal = function(index = -1) {
    document.getElementById('edit-soal-index').value = index;
    if (index >= 0 && dbData.soal[index]) {
        document.getElementById('soal-modal-title').innerText = "Edit Soal Isian";
        let item = dbData.soal[index];
        document.getElementById('s-category').value = item.category || 'anatomi';
        document.getElementById('s-question').value = item.question || '';
        document.getElementById('s-image').value = item.image || '';
        document.getElementById('s-answer').value = item.answer || '';
        document.getElementById('s-exp').value = item.explanation || '';
    } else {
        document.getElementById('soal-modal-title').innerText = "Tambah Soal Isian Baru";
        document.getElementById('s-category').value = 'anatomi';
        document.getElementById('s-question').value = '';
        document.getElementById('s-image').value = '';
        document.getElementById('s-answer').value = '';
        document.getElementById('s-exp').value = '';
    }
    document.getElementById('soal-modal').style.display = 'flex';
};

window.saveSoalItem = async function() {
    const idx = parseInt(document.getElementById('edit-soal-index').value);
    const category = document.getElementById('s-category').value;
    const question = document.getElementById('s-question').value.trim();
    const image = document.getElementById('s-image').value.trim();
    const answer = document.getElementById('s-answer').value.trim();
    const explanation = document.getElementById('s-exp').value.trim();

    if (!question || !answer) return alert("Pertanyaan dan Kunci Jawaban wajib diisi!");

    if (!dbData.soal) dbData.soal = [];

    const newEntry = {
        id: idx >= 0 && dbData.soal[idx] ? dbData.soal[idx].id : Date.now(),
        category: category,
        question: question,
        image: image,
        answer: answer,
        explanation: explanation
    };

    if (idx >= 0) dbData.soal[idx] = newEntry;
    else dbData.soal.push(newEntry);

    await saveCategoryData('soal');
    closeModal('soal-modal');
    startQuiz();
    alert('✅ Soal isian berhasil disimpan ke cloud Supabase!');
};

window.deleteSoalItem = async function(index) {
    if (confirm('Apakah Anda yakin ingin menghapus soal ini?')) {
        dbData.soal.splice(index, 1);
        await saveCategoryData('soal');
        startQuiz();
        alert('✅ Soal berhasil dihapus!');
    }
};

// ==========================================================================
// SIMULASI CBT BLOK 1.2 - 100 SOAL PILIHAN GANDA (BARU)
// Semua identifier diberi prefix cbt* agar tidak bentrok dengan fungsi lain
// ==========================================================================
const cbtQuestions = [
    { id: 1, text: "Perhatikan gambar potongan melintang tulang kompakta di bawah ini. Struktur melingkar konsentris yang di tengahnya terdapat saluran berisi pembuluh darah dan saraf disebut...", img: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#fce4d6" stroke="#d68c45" stroke-width="3"/><circle cx="50" cy="50" r="35" fill="none" stroke="#d68c45" stroke-width="2"/><circle cx="50" cy="50" r="20" fill="none" stroke="#d68c45" stroke-width="2"/><circle cx="50" cy="50" r="10" fill="#e74c3c"/><ellipse cx="50" cy="25" rx="4" ry="6" fill="#2c3e50"/><ellipse cx="75" cy="50" rx="6" ry="4" fill="#2c3e50"/></svg>`, options: ["Lamela interstisial", "Lamela sirkumferensial", "Osteon (Sistem Havers)", "Lakuna", "Kanal Volkmann"] },
    { id: 2, text: "Zona pada lempeng epifisis tulang panjang di mana kondrosit mengalami pembelahan mitosis secara cepat dan membentuk kolom-kolom (sel isogen) adalah...", options: ["Zona istirahat", "Zona proliferasi", "Zona hipertrofi", "Zona kalsifikasi", "Zona osifikasi"] },
    { id: 3, text: "Pada proses osifikasi intramembranosa, pusat osifikasi terbentuk dari...", options: ["Kondrosit yang membesar", "Sel mesenkim yang berdiferensiasi menjadi osteoblas", "Pembuluh darah yang masuk ke kartilago", "Osteoklas yang meresorpsi kartilago", "Fibroblas yang menghasilkan kolagen"] },
    { id: 4, text: "Perhatikan deskripsi preparat histologi kartilago berikut: Matriks ekstraseluler tampak keruh karena adanya serabut-serabut gelap yang bercabang-cabang. Jenis kartilago ini terdapat pada...", options: ["Permukaan sendi", "Dinding trakea", "Diskus intervertebralis", "Epiglotis dan aurikula", "Simfisis pubis"] },
    { id: 5, text: "Sel raksasa berinti banyak yang terletak di cekungan matriks tulang (Lakuna Howship) dan berperan dalam resorpsi tulang adalah...", options: ["Osteoblas", "Osteosit", "Osteoklas", "Kondroblas", "Fibroblas"] },
    { id: 6, text: "Lapisan jaringan ikat padat ireguler yang membungkus permukaan luar tulang dan berisi sel osteoprogenitor disebut...", options: ["Endosteum", "Periosteum", "Perikondrium", "Epimisium", "Perimisium"] },
    { id: 7, text: "Pada proses pembentukan tulang panjang (osifikasi endokondral), model awal tulang terbuat dari...", options: ["Jaringan ikat fibrosa", "Kartilago hialin", "Kartilago elastis", "Kartilago fibrosa", "Membran mesenkim"] },
    { id: 8, text: "Saluran transversal yang menghubungkan kanal Havers satu dengan lainnya serta berhubungan dengan periosteum dan endosteum disebut...", options: ["Kanal Volkmann", "Kanalikuli", "Lakuna", "Sistem Havers", "Lamela interstisial"] },
    { id: 9, text: "Kartilago hialin pada permukaan sendi (kartilago artikular) memiliki ciri khas yaitu...", options: ["Memiliki perikondrium yang tebal", "Tidak memiliki perikondrium", "Kaya akan serabut elastis", "Matriksnya asidofilik", "Disusun oleh serabut kolagen tipe I"] },
    { id: 10, text: "Zat yang memberikan sifat basofilik pada matriks kartilago hialin adalah...", options: ["Serabut kolagen tipe II", "Glukosaminoglikan (GAG)", "Protein struktural", "Kalsium fosfat", "Asam hialuronat"] },
    { id: 11, text: "Pertumbuhan kartilago yang terjadi dari bagian dalam (tengah) akibat mitosis kondrosit yang sudah ada disebut...", options: ["Pertumbuhan aposisi", "Pertumbuhan interstisial", "Pertumbuhan endokondral", "Pertumbuhan intramembranosa", "Pertumbuhan desmalis"] },
    { id: 12, text: "Pada kartilago fibrosa (fibrokartilago), matriks ekstraselulernya didominasi oleh...", options: ["Serabut kolagen tipe I yang kasar", "Serabut kolagen tipe II halus", "Serabut elastis bercabang", "Asam hialuronat", "Proteoglikan"] },
    { id: 13, text: "Sel yang bertanggung jawab untuk memproduksi dan mensekresi matriks kartilago disebut...", options: ["Kondrosit", "Kondroblas", "Kondrogenik", "Osteoblas", "Fibroblas"] },
    { id: 14, text: "Kartilago yang tidak memiliki perikondrium dan biasanya merupakan jaringan peralihan antara tulang rawan hialin dengan jaringan ikat padat adalah...", options: ["Kartilago hialin", "Kartilago elastis", "Kartilago fibrosa", "Kartilago artikular", "Kartilago epifisis"] },
    { id: 15, text: "Proses kalsifikasi matriks tulang rawan yang diikuti oleh kematian kondrosit dan pengendapan mineral kalsium disebut...", options: ["Transformasi asbes", "Regresi kartilago", "Aposisi", "Interstisial", "Osteogenesis"] },
    { id: 16, text: "Perhatikan gambar tulang tengkorak tampak lateral di bawah ini. Titik pertemuan empat tulang (frontal, parietal, temporal, sphenoid) yang rentan cedera arteri meningea media disebut...", img: `<svg viewBox="0 0 200 100"><path d="M 20,50 Q 50,10 100,20 L 100,60 Q 50,50 20,50 Z" fill="#f1c40f" stroke="#333"/><path d="M 100,20 Q 150,10 180,40 L 180,70 Q 150,60 100,60 Z" fill="#3498db" stroke="#333"/><path d="M 100,60 Q 150,60 180,70 L 180,90 Q 150,90 100,80 Z" fill="#e67e22" stroke="#333"/><circle cx="100" cy="60" r="15" fill="none" stroke="red" stroke-width="3" stroke-dasharray="4,4"/></svg>`, options: ["Bregma", "Lambda", "Pterion", "Asterion", "Fontanella mayor"] },
    { id: 17, text: "Sendi yang berperan utama dalam gerakan rotasi leher (gerakan menggeleng atau 'tidak') adalah...", options: ["Articulatio atlanto-occipitalis", "Articulatio atlanto-axialis", "Articulatio zygapophysealis", "Articulatio intervertebralis", "Articulatio temporomandibularis"] },
    { id: 18, text: "Lubang besar di dasar tengkorak yang menghubungkan rongga kranial dengan kanalis vertebralis adalah...", options: ["Foramen ovale", "Foramen lacerum", "Foramen magnum", "Foramen spinosum", "Foramen jugulare"] },
    { id: 19, text: "Tulang yang membentuk canalis opticus tempat lewatnya nervus optikus adalah...", options: ["Os frontale", "Os sphenoidale", "Os ethmoidale", "Os temporale", "Os occipitale"] },
    { id: 20, text: "Ciri khas yang membedakan vertebra cervicalis dengan vertebra lainnya adalah...", options: ["Corpus vertebrae yang besar", "Processus spinosus yang bercabang dua (bifida)", "Foramen transversarium pada processus transversus", "Facet costalis pada corpus", "Processus articularis yang menghadap vertikal"] },
    { id: 21, text: "Tulang yang berbentuk seperti kupu-kupu, terletak di tengah dasar tengkorak, dan memiliki sella turcica yang menampung hipofisis adalah...", options: ["Os frontale", "Os parietale", "Os temporale", "Os sphenoidale", "Os ethmoidale"] },
    { id: 22, text: "Sutura yang menghubungkan os parietale dextra dan sinistra di bagian atas tengkorak adalah...", options: ["Sutura coronalis", "Sutura sagittalis", "Sutura lambdoidea", "Sutura squamosa", "Sutura frontalis"] },
    { id: 23, text: "Sendi yang menghubungkan antara os occipitale dan atlas (C1) dan memungkinkan gerakan mengangguk adalah...", options: ["Pivot joint", "Hinge joint", "Condyloid joint", "Saddle joint", "Ball and socket joint"] },
    { id: 24, text: "Tulang yang membentuk atap rongga mulut, memiliki processus palatinus, dan menampung geligi atas adalah...", options: ["Os mandibula", "Os maxilla", "Os zygomaticum", "Os nasale", "Os vomer"] },
    { id: 25, text: "Pada mandibula, bagian yang menjadi tempat melekatnya otot mastikasi (seperti masseter) adalah...", options: ["Corpus mandibulae", "Ramus mandibulae", "Processus condylaris", "Processus coronoideus", "Angulus mandibulae"] },
    { id: 26, text: "Dislokasi posterior pada articulatio humeri yang menyebabkan paralisis nervus radialis akan menimbulkan kelainan klinis berupa...", options: ["Ape hand", "Claw hand", "Drop hand (Wrist drop)", "Winged scapula", "Mallet finger"] },
    { id: 27, text: "Saraf yang menginervasi otot-otot kompartemen posterior lengan atas (seperti M. Triceps brachii) adalah...", options: ["N. Medianus", "N. Ulnaris", "N. Radialis", "N. Axillaris", "N. Musculocutaneus"] },
    { id: 28, text: "Otot yang berfungsi sebagai Prime Mover (penggerak utama) pada gerakan fleksi articulatio cubiti (siku) adalah...", options: ["M. Triceps brachii", "M. Anconeus", "M. Brachialis", "M. Pronator teres", "M. Palmaris longus"] },
    { id: 29, text: "Otot yang bekerja secara sinergis dengan M. Triceps brachii saat ekstensi siku adalah...", options: ["M. Anconeus", "M. Biceps brachii", "M. Brachialis", "M. Pronator teres", "M. Palmaris longus"] },
    { id: 30, text: "Kerusakan pada Nervus thoracicus longus akan menyebabkan paralisis pada otot...", options: ["M. Trapezius", "M. Rhomboideus", "M. Serratus anterior", "M. Pectoralis major", "M. Deltoideus"] },
    { id: 31, text: "Otot yang berorigo di tuberositas supraglenoidalis dan berinsersi di tuberositas radii, berfungsi fleksi siku dan supinasi adalah...", options: ["M. Brachialis", "M. Biceps brachii", "M. Triceps brachii", "M. Brachioradialis", "M. Coracobrachialis"] },
    { id: 32, text: "Saraf yang tertekan pada kasus Carpal Tunnel Syndrome (CTS) adalah...", options: ["N. Ulnaris", "N. Radialis", "N. Medianus", "N. Musculocutaneus", "N. Axillaris"] },
    { id: 33, text: "Vena yang sering digunakan untuk pengambilan sampel darah di fossa cubiti adalah...", options: ["V. Cephalica", "V. Subclavia", "V. Basilica", "V. Mediana cubiti", "V. Axilaris"] },
    { id: 34, text: "Otot rotator cuff yang berorigo pada fossa supraspinata scapula adalah...", options: ["M. Infraspinatus", "M. Supraspinatus", "M. Teres minor", "M. Subscapularis", "M. Teres major"] },
    { id: 35, text: "Lesi pada nervus medianus di pergelangan tangan akan menyebabkan kelainan klinis...", options: ["Wrist drop", "Claw hand", "Ape hand (Hand of benediction)", "Winged scapula", "Mallet finger"] },
    { id: 36, text: "Saraf yang menginervasi otot deltoideus dan kulit di regio bahu adalah...", options: ["N. Axillaris", "N. Radialis", "N. Medianus", "N. Ulnaris", "N. Musculocutaneus"] },
    { id: 37, text: "Tulang yang membentuk articulatio radiocarpea (pergelangan tangan) pada bagian proksimal adalah...", options: ["Os scaphoideum", "Radius", "Ulna", "Os trapezium", "Os capitatum"] },
    { id: 38, text: "Gerakan menjauhi midline tubuh (contoh: mengangkat lengan ke samping) disebut...", options: ["Adduksi", "Abduksi", "Sirkumduksi", "Pronasi", "Fleksi"] },
    { id: 39, text: "Otot yang berfungsi sebagai fleksor pergelangan tangan dan berorigo di epicondylus medialis humeri adalah...", options: ["M. Extensor carpi radialis", "M. Flexor carpi radialis", "M. Brachioradialis", "M. Supinator", "M. Anconeus"] },
    { id: 40, text: "Tulang yang memiliki ciri khas olecranon pada bagian proksimalnya adalah...", options: ["Radius", "Ulna", "Humerus", "Scapula", "Clavicula"] },
    { id: 41, text: "Untuk menghindari cedera nervus ischiadicus saat injeksi intramuskular di gluteus, area yang paling aman adalah...", options: ["Kuadran superomedial", "Kuadran inferomedial", "Kuadran superolateral", "Kuadran inferolateral", "Bagian tengah gluteus"] },
    { id: 42, text: "Perhatikan gambar femur tampak posterior. Rigi tebal memanjang di tengah batang tulang tempat perlekatan otot paha adalah...", img: `<svg viewBox="0 0 100 200"><path d="M 40,20 L 60,20 L 70,180 L 30,180 Z" fill="#f5cba7" stroke="#333"/><line x1="50" y1="40" x2="50" y2="160" stroke="#c0392b" stroke-width="6"/></svg>`, options: ["Linea intertrochanterica", "Crista intertrochanterica", "Linea aspera", "Linea pectinea", "Tuberositas glutea"] },
    { id: 43, text: "Struktur saraf utama yang melewati fossa poplitea (area belakang lutut) adalah...", options: ["Nervus femoralis", "Nervus ischiadicus", "Nervus tibialis", "Nervus peroneus communis", "Nervus obturatorius"] },
    { id: 44, text: "Otot yang berinsersi pada tendon calcaneus (Achilles) dan berfungsi plantar fleksi adalah...", options: ["M. Tibialis anterior", "M. Gastrocnemius dan M. Soleus", "M. Peroneus longus", "M. Flexor hallucis longus", "M. Quadriceps femoris"] },
    { id: 45, text: "Kelompok otot hamstring pada paha posterior terdiri dari...", options: ["M. Rectus femoris, M. Vastus lateralis, M. Vastus medialis", "M. Biceps femoris, M. Semitendinos
