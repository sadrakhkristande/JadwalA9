// ==========================================================================
// SIMULASI CBT BLOK 1.2 - 100 SOAL PILIHAN GANDA
// (Diintegrasikan dengan Portal Akademik A9 - namespace cbt*)
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
    { id: 45, text: "Kelompok otot hamstring pada paha posterior terdiri dari...", options: ["M. Rectus femoris, M. Vastus lateralis, M. Vastus medialis", "M. Biceps femoris, M. Semitendinosus, M. Semimembranosus", "M. Sartorius, M. Gracilis, M. Pectineus", "M. Adductor longus, M. Adductor magnus, M. Gracilis", "M. Gastrocnemius, M. Soleus, M. Plantaris"] },
    { id: 46, text: "Cedera kontusio pada otot quadriceps femoris yang disertai perdarahan dan nyeri hebat sering disebut...", options: ["Hamstring strain", "Tennis elbow", "Charley horse", "Shin splints", "Drop hand"] },
    { id: 47, text: "Lubang besar pada os coxae yang dibatasi oleh os pubis dan os ischium adalah...", options: ["Foramen obturatorium", "Foramen ischiadicum majus", "Foramen ischiadicum minus", "Acetabulum", "Canalis obturatorius"] },
    { id: 48, text: "Otot yang berfungsi sebagai ekstensor lutut dan merupakan bagian dari quadriceps femoris adalah...", options: ["M. Biceps femoris", "M. Rectus femoris", "M. Semitendinosus", "M. Gastrocnemius", "M. Tibialis anterior"] },
    { id: 49, text: "Bagian tulang tibia yang membentuk persendian dengan talus dan menonjol di sisi medial pergelangan kaki adalah...", options: ["Condylus medialis", "Tuberositas tibiae", "Malleolus medialis", "Malleolus lateralis", "Linea aspera"] },
    { id: 50, text: "Saraf yang menginervasi regio anterior paha (kompartemen anterior) adalah...", options: ["N. Ischiadicus", "N. Obturatorius", "N. Femoralis", "N. Tibialis", "N. Peroneus communis"] },
    { id: 51, text: "Kelenjar keringat yang berperan utama dalam termoregulasi dan bermuara langsung ke pori-pori kulit adalah...", options: ["Kelenjar sebasea", "Kelenjar apokrin", "Kelenjar ekrin (merokrin)", "Kelenjar holokrin", "Kelenjar ceruminosa"] },
    { id: 52, text: "Sel di stratum spinosum yang berbentuk bintang, tidak memproduksi melanin, dan berfungsi sebagai penyaji antigen (APC) adalah...", options: ["Melanosit", "Sel Langerhans", "Sel Merkel", "Fibroblas", "Makrofag"] },
    { id: 53, text: "Seorang pemain gitar mengalami penebalan pada ujung jarinya (callus). Hal ini disebabkan oleh peningkatan produksi...", options: ["Melanin", "Sebum", "Keratin", "Kolagen", "Asam hialuronat"] },
    { id: 54, text: "Proses pembentukan vitamin D di kulit diawali oleh sinar UV yang mengubah 7-dehydrocholesterol menjadi...", options: ["Calcitriol", "Calcidiol", "Cholecalciferol (Vitamin D3)", "Previtamin D3", "25-Hydroxycholecalciferol"] },
    { id: 55, text: "Reseptor taktil yang terletak di papila dermis dan berfungsi untuk sentuhan ringan adalah...", options: ["Corpusculum Pacini", "Corpusculum Meissner", "Corpusculum Ruffini", "Sel Merkel", "Ujung saraf bebas"] },
    { id: 56, text: "Lapisan epidermis yang hanya ditemukan pada kulit tebal (telapak tangan/kaki) dan terdiri dari sel gepeng tanpa inti adalah...", options: ["Stratum korneum", "Stratum lusidum", "Stratum granulosum", "Stratum spinosum", "Stratum basale"] },
    { id: 57, text: "Pada mekanisme termoregulasi, saat suhu lingkungan dingin, pembuluh darah di dermis akan mengalami...", options: ["Vasodilatasi", "Vasokonstriksi", "Peningkatan produksi keringat", "Peningkatan aliran darah", "Relaksasi otot polos"] },
    { id: 58, text: "Kelenjar yang bermuara pada folikel rambut, memproduksi sebum, dan dipicu oleh hormon androgen adalah...", options: ["Kelenjar sebasea", "Kelenjar apokrin", "Kelenjar ekrin", "Kelenjar holokrin", "Kelenjar merokrin"] },
    { id: 59, text: "Pigmen yang berfungsi melindungi inti sel keratinosit dari kerusakan DNA akibat sinar UV adalah...", options: ["Keratin", "Melanin", "Sebum", "Karoten", "Hemoglobin"] },
    { id: 60, text: "Lapisan folikel rambut yang identik dengan stratum malpighi pada epidermis adalah...", options: ["Vagina interna", "Vagina eksterna", "Selubung akar dermal", "Membran kemaca", "Papila rambut"] },
    { id: 61, text: "Bagian kuku yang berwarna keputihan berbentuk bulan sabit di bagian proksimal badan kuku disebut...", options: ["Eponikium", "Hiponikium", "Lunula", "Matriks kuku", "Nail bed"] },
    { id: 62, text: "Garis ketegangan kulit (cleavage lines) yang terbentuk oleh susunan serabut kolagen sangat penting dalam pembedahan karena...", options: ["Sayatan sejajar garis ini akan sembuh lebih cepat dan minim skar", "Sayatan tegak lurus garis ini akan sembuh lebih cepat", "Garis ini menunjukkan letak pembuluh darah utama", "Garis ini adalah tempat pertemuan saraf sensorik", "Sayatan pada garis ini tidak menimbulkan nyeri"] },
    { id: 63, text: "Perhatikan gambar histologi otot jantung. Struktur garis melintang gelap yang menghubungkan antar sel (diskus interkalaris) tersusun atas...", img: `<svg viewBox="0 0 150 50"><path d="M 10,10 Q 50,0 75,10 Q 100,20 140,10 L 140,40 Q 100,50 75,40 Q 50,30 10,40 Z" fill="#f1948a" stroke="#333"/><line x1="75" y1="0" x2="75" y2="50" stroke="#2c3e50" stroke-width="4" stroke-dasharray="3,2"/></svg>`, options: ["Fascia adherens, desmosom, gap junction", "Garis Z, pita A, pita I", "Sarkomer, miofibril, sarkoplasma", "Tubulus T, retikulum sarkoplasma", "Aktin, miosin, troponin"] },
    { id: 64, text: "Dalam mekanisme kontraksi otot polos, ion kalsium (Ca2+) di dalam sitoplasma akan berikatan dengan...", options: ["Troponin", "Tropomiosin", "Kalmodulin", "Miosin light chain fosfatase", "Aktin"] },
    { id: 65, text: "Pada siklus cross-bridge otot skelet, pelepasan kepala miosin dari aktin dipicu oleh...", options: ["Terlepasnya ADP", "Terikatnya ATP pada kepala miosin", "Terhidrolisisnya ATP", "Masuknya ion kalsium", "Terikatnya kalsium pada troponin C"] },
    { id: 66, text: "Potensial aksi yang memicu kontraksi otot jantung secara spontan berasal dari...", options: ["Nodus atrioventricular (AV)", "Nodus sinoatrial (SA)", "Berkas His", "Serabut Purkinje", "Sistem saraf simpatis"] },
    { id: 67, text: "Elektrolit utama yang berperan dalam relaksasi otot setelah kontraksi adalah...", options: ["Natrium", "Kalium", "Kalsium", "Magnesium", "Klorida"] },
    { id: 68, text: "Gambaran miofibril yang terpotong menyerupai pulau-pulau pada penampang melintang otot skelet disebut...", options: ["Sarkomer", "Area Cohnheim", "Diskus interkalaris", "Garis Z", "Pita A"] },
    { id: 69, text: "Pada kondisi tetanus (infeksi Clostridium tetani), terjadi penumpukan zat intraseluler yang menyebabkan kontraksi terus-menerus, yaitu...", options: ["Natrium", "Kalium", "Kalsium", "Magnesium", "Klorida"] },
    { id: 70, text: "Pita pada sarkomer otot skelet yang bersifat anisotrop (gelap) dan mengandung filamen tebal miosin adalah...", options: ["Pita I", "Pita A", "Garis Z", "Zona H", "Garis M"] },
    { id: 71, text: "Serabut otot yang memiliki banyak mitokondria, mioglobin tinggi, dan tahan terhadap kelelahan (slow twitch) adalah...", options: ["Tipe I (Red Fibers)", "Tipe IIA (Pink Fibers)", "Tipe IIB (White Fibers)", "Tipe IIX", "Serabut Purkinje"] },
    { id: 72, text: "Kontraksi di mana otot memanjang saat berkontraksi (misalnya saat menurunkan beban) disebut kontraksi...", options: ["Isometrik", "Konsentrik", "Eksentrik", "Isotonik", "Fasik"] },
    { id: 73, text: "Pada proses bone remodeling, interaksi RANKL (dari osteoblas) dan RANK (prekursor osteoklas) memicu diferensiasi osteoklas. OPG yang disekresi osteoblas berfungsi sebagai...", options: ["Aktivator RANKL", "Decoy receptor yang berkompetisi dengan RANK", "Stimulator osteoblas", "Enzim penghancur RANKL", "Hormon peningkat kalsium darah"] },
    { id: 74, text: "Penggunaan kortikosteroid jangka panjang dapat menyebabkan osteoporosis melalui mekanisme...", options: ["Meningkatkan aktivitas osteoblas", "Menghambat apoptosis osteoblas", "Menginduksi apoptosis osteoblas dan meningkatkan osteoklas", "Meningkatkan penyerapan kalsium di usus", "Meningkatkan ekskresi fosfat"] },
    { id: 75, text: "Wanita pasca-menopause sangat rentan osteoporosis karena penurunan hormon...", options: ["Progesteron", "Testosteron", "Estrogen", "Kortisol", "Parathormon (PTH)"] },
    { id: 76, text: "Jika kadar kalsium darah turun, kelenjar paratiroid mensekresi PTH yang bekerja pada ginjal untuk...", options: ["Menurunkan reabsorpsi kalsium", "Meningkatkan reabsorpsi kalsium", "Meningkatkan ekskresi kalsium", "Menghambat aktivasi vitamin D", "Menurunkan ekskresi magnesium"] },
    { id: 77, text: "Pada pasien gagal ginjal kronis, penurunan kalsium darah terjadi karena ginjal tidak mampu mengubah...", options: ["Cholecalciferol menjadi calcidiol", "Calcidiol menjadi calcitriol", "Kolesterol menjadi cholecalciferol", "Calcitriol menjadi calcidiol", "Previtamin D3 menjadi cholecalciferol"] },
    { id: 78, text: "Vitamin yang berperan dalam sintesis kolagen dan stimulasi diferensiasi osteoblas pada remodeling tulang adalah...", options: ["Vitamin A", "Vitamin B12", "Vitamin C", "Vitamin D", "Vitamin K"] },
    { id: 79, text: "Penyakit tulang rapuh (osteogenesis imperfecta) sering disebabkan oleh mutasi genetik pada...", options: ["Kalsium", "Vitamin D", "Kolagen tipe I", "Hormon PTH", "Osteokalsin"] },
    { id: 80, text: "Defisiensi vitamin D pada anak-anak yang menyebabkan deformasi tulang (seperti genu varum) disebut...", options: ["Osteoporosis", "Osteomalasia", "Rakhitis", "Osteoartritis", "Paget disease"] },
    { id: 81, text: "Komponen anorganik utama penyusun matriks tulang berupa kristal kalsium fosfat disebut...", options: ["Osteoid", "Hidroksiapatit", "Kalsitonin", "Kolagen", "Proteoglikan"] },
    { id: 82, text: "Hormon yang menurunkan kadar kalsium darah dengan menghambat aktivitas osteoklas adalah...", options: ["Parathormon (PTH)", "Kalsitonin", "Estrogen", "Kortisol", "Insulin"] },
    { id: 83, text: "Sitokin yang diproduksi oleh sel T dan berfungsi menghambat pembentukan osteoklas adalah...", options: ["IL-1", "IL-6", "TNF-alpha", "Interferon-gamma", "RANKL"] },
    { id: 84, text: "Komponen utama cairan sinovial yang memberikan viskositas dan elastisitas, disintesis oleh sinoviosit tipe B adalah...", options: ["Lubricin", "Asam hialuronat", "Albumin", "Glukosa", "Elektrolit"] },
    { id: 85, text: "Pada pemeriksaan cairan sendi pasien gout arthritis, ditemukan kristal...", options: ["Kalsium pirofosfat", "Monosodium urat", "Kolesterol", "Asam hialuronat", "Fibrinogen"] },
    { id: 86, text: "Cairan sendi yang berwarna kuning keruh dengan leukosit >50.000 sel/uL mengarah pada kondisi...", options: ["Osteoartritis", "Artritis gout", "Artritis septik (infeksi)", "Trauma ringan", "Rheumatoid arthritis ringan"] },
    { id: 87, text: "Sel sinoviosit tipe A (mirip makrofag) pada membran sinovial berfungsi untuk...", options: ["Memproduksi asam hialuronat", "Fagositosis membersihkan debris", "Mensekresi lubricin", "Membentuk kolagen", "Menghasilkan cairan sinovial"] },
    { id: 88, text: "Sendi yang menghubungkan tulang rusuk dengan tulang belakang (costovertebral) memiliki tipe...", options: ["Fibrosa", "Kartilaginosa hialin", "Kartilaginosa fibrosa", "Sinovial planar", "Sinovial engsel"] },
    { id: 89, text: "Ligamen yang mencegah pergeseran tibia ke anterior secara berlebihan pada sendi lutut adalah...", options: ["Ligamentum collaterale mediale", "Ligamentum collaterale laterale", "Ligamentum cruciatum anterior (ACL)", "Ligamentum cruciatum posterior (PCL)", "Meniskus medialis"] },
    { id: 90, text: "Penyakit autoimun yang menyerang membran sinovial dan menyebabkan peradangan sendi kronis adalah...", options: ["Osteoartritis", "Rheumatoid arthritis", "Gout arthritis", "Artritis septik", "Spondilitis ankilosa"] },
    { id: 91, text: "Diskus intervertebralis tersusun dari...", options: ["Kartilago hialin", "Kartilago elastis", "Kartilago fibrosa (fibrokartilago)", "Tulang kompakta", "Jaringan ikat padat"] },
    { id: 92, text: "Gerakan pronasi dan supinasi lengan bawah terjadi pada sendi...", options: ["Articulatio radiocarpea", "Articulatio radioulnaris proximalis dan distalis", "Articulatio cubiti", "Articulatio humeri", "Articulatio sternoclavicularis"] },
    { id: 93, text: "Seorang pasien mengalami luka bakar yang menghilangkan epidermis dan sebagian dermis. Ia kehilangan kemampuan merasakan sentuhan ringan karena rusaknya reseptor di papila dermis, yaitu...", options: ["Corpusculum Pacini", "Corpusculum Meissner", "Corpusculum Ruffini", "Sel Merkel", "Ujung saraf bebas"] },
    { id: 94, text: "Nervus radialis berjalan di sepanjang sulcus spiralis pada humerus. Cedera pada area ini akan menyebabkan...", options: ["Ape hand", "Claw hand", "Drop hand", "Winged scapula", "Mallet finger"] },
    { id: 95, text: "Seorang atlet merasakan nyeri pada tendon di epicondylus lateralis humeri setelah bermain tenis. Kondisi ini disebut...", options: ["Tennis elbow", "Golfer's elbow", "Shin splints", "Charley horse", "Hamstring strain"] },
    { id: 96, text: "Suatu kondisi di mana tulang rawan artikular mengalami degenerasi progresif dan menyebabkan nyeri sendi kronis adalah...", options: ["Rheumatoid arthritis", "Osteoartritis", "Gout arthritis", "Rakhitis", "Osteomielitis"] },
    { id: 97, text: "Dokter melakukan injeksi pada regio gluteus. Untuk menghindari nervus ischiadicus, injeksi dilakukan di kuadran...", options: ["Superomedial", "Inferomedial", "Superolateral", "Inferolateral", "Tengah"] },
    { id: 98, text: "Kekurangan hormon pertumbuhan (Growth Hormone) pada masa anak-anak dapat menyebabkan...", options: ["Gigantisme", "Akromegali", "Dwarfisme", "Osteoporosis", "Rakhitis"] },
    { id: 99, text: "Proses penyerapan kembali (resorpsi) tulang oleh osteoklas distimulasi oleh hormon...", options: ["Kalsitonin", "Parathormon (PTH)", "Insulin", "Estrogen", "Tiroid (T3/T4)"] },
    { id: 100, text: "Struktur pada otot skelet yang merupakan unit fungsional terkecil dari kontraksi (antara dua garis Z) disebut...", options: ["Miofibril", "Sarkomer", "Sarkoplasma", "Sarkolema", "Miofilamen"] }
];

let cbtTimeInSeconds = 0;
let cbtTimerInterval = null;
let cbtStarted = false;
const CBT_LETTERS = ['A', 'B', 'C', 'D', 'E'];

function cbtFormatTime(total) {
    const h = String(Math.floor(total / 3600)).padStart(2, '0');
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function cbtUpdateTimerUI() {
    const el = document.getElementById('cbt-timer');
    if (el) el.innerText = `Waktu: ${cbtFormatTime(cbtTimeInSeconds)}`;
}

function cbtRenderQuestions() {
    const container = document.getElementById('cbt-question-container');
    if (!container) return;

    // Update total label (dinamis, bukan hardcoded)
    const totalLabel = document.getElementById('cbt-total-label');
    if (totalLabel) totalLabel.innerText = String(cbtQuestions.length);

    let html = '';
    cbtQuestions.forEach((q) => {
        const imgHtml = q.img ? `<div class="image-container">${q.img}</div>` : '';
        let optionsHtml = '';
        q.options.forEach((opt, i) => {
            optionsHtml += `
                <li>
                    <label class="option-label" onclick="cbtHighlightOption(this)">
                        <input type="radio" name="cbt-q${q.id}" value="${CBT_LETTERS[i]}">
                        <span class="option-text">${CBT_LETTERS[i]}. ${opt}</span>
                    </label>
                </li>`;
        });

        html += `
            <div class="question-card">
                <div class="q-header">Soal ${q.id}</div>
                <div class="q-text">${q.text}</div>
                ${imgHtml}
                <ul class="options">${optionsHtml}</ul>
            </div>`;
    });
    container.innerHTML = html;
}

window.cbtHighlightOption = function(labelElement) {
    const input = labelElement.querySelector('input');
    if (!input) return;
    const groupName = input.name;
    document.querySelectorAll(`#tab-cbt input[name="${groupName}"]`).forEach(inp => {
        const parent = inp.closest('.option-label');
        if (parent) parent.classList.remove('selected');
    });
    labelElement.classList.add('selected');
};

window.startCBT = function() {
    if (cbtStarted) return;
    cbtStarted = true;
    cbtTimeInSeconds = 0;
    cbtUpdateTimerUI();
    cbtRenderQuestions();

    const startCard = document.getElementById('cbt-start-card');
    const activeArea = document.getElementById('cbt-active-area');
    const resultCard = document.getElementById('cbt-result-card');
    if (startCard) startCard.style.display = 'none';
    if (activeArea) activeArea.style.display = 'block';
    if (resultCard) resultCard.style.display = 'none';

    if (cbtTimerInterval) clearInterval(cbtTimerInterval);
    cbtTimerInterval = setInterval(() => {
        cbtTimeInSeconds++;
        cbtUpdateTimerUI();
    }, 1000);
};

window.submitCBT = function() {
    let answered = 0;
    cbtQuestions.forEach(q => {
        const sel = document.querySelector(`#tab-cbt input[name="cbt-q${q.id}"]:checked`);
        if (sel) answered++;
    });

    if (answered < cbtQuestions.length) {
        const ok = confirm(`Anda baru menjawab ${answered} dari ${cbtQuestions.length} soal. Yakin ingin menyelesaikan ujian?`);
        if (!ok) return;
    }

    if (cbtTimerInterval) {
        clearInterval(cbtTimerInterval);
        cbtTimerInterval = null;
    }
    cbtStarted = false;

    // Disable semua input agar tidak berubah setelah submit
    document.querySelectorAll('#tab-cbt #cbt-question-container input[type="radio"]')
        .forEach(i => i.disabled = true);

    const resultText = document.getElementById('cbt-result-text');
    if (resultText) {
        resultText.innerHTML = `Anda telah menjawab <strong>${answered}</strong> dari <strong>${cbtQuestions.length}</strong> soal.<br>
            Waktu pengerjaan: <strong>${cbtFormatTime(cbtTimeInSeconds)}</strong>`;
    }
    const resultCard = document.getElementById('cbt-result-card');
    const activeArea = document.getElementById('cbt-active-area');
    if (resultCard) resultCard.style.display = 'block';
    if (activeArea) activeArea.style.display = 'none';
};

window.resetCBT = function() {
    if (cbtTimerInterval) {
        clearInterval(cbtTimerInterval);
        cbtTimerInterval = null;
    }
    cbtStarted = false;
    cbtTimeInSeconds = 0;
    cbtUpdateTimerUI();

    const startCard = document.getElementById('cbt-start-card');
    const activeArea = document.getElementById('cbt-active-area');
    const resultCard = document.getElementById('cbt-result-card');
    const container = document.getElementById('cbt-question-container');

    if (container) container.innerHTML = '';
    if (startCard) startCard.style.display = 'block';
    if (activeArea) activeArea.style.display = 'none';
    if (resultCard) resultCard.style.display = 'none';
};
