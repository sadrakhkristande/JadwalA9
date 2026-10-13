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

            // Ambil sesi 1 sampai 4
            let s1 = j.sesi[0] ? `<small style="color:#64748b">${j.sesi[0].jam}</small><br><strong>${j.sesi[0].kegiatan}</strong>` : '-';
            let s2 = j.sesi[1] ? `<small style="color:#64748b">${j.sesi[1].jam}</small><br><strong>${j.sesi[1].kegiatan}</strong>` : '-';
            let s3 = j.sesi[2] ? `<small style="color:#64748b">${j.sesi[2].jam}</small><br><strong>${j.sesi[2].kegiatan}</strong>` : '-';
            let s4 = j.sesi[3] ? `<small style="color:#64748b">${j.sesi[3].jam}</small><br><strong>${j.sesi[3].kegiatan}</strong>` : '-';

            tbody.innerHTML += `<tr class="${badgeClass}">
                <td style="white-space: nowrap;">${j.tgl} <br>${badgeLabel}</td>
                <td>${s1}</td>
                <td>${s2}</td>
                <td>${s3}</td>
                <td>${s4}</td>
            </tr>`;
        });
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">Gagal memuat jadwal.json. Pastikan file ada di GitHub.</td></tr>';
    }
}
