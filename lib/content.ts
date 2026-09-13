/**
 * The questions the landing page answers, and the answers.
 *
 * They live outside the component because two different things render them:
 * the accordion a reader opens, and the `FAQPage` structured data in the
 * document head, which a search engine reads instead of the accordion. Two
 * copies of an answer is two answers that drift apart.
 */
export interface FaqEntry {
  question: string;
  answer: string;
}

export const FAQ: FaqEntry[] = [
  {
    question: 'Hasilnya boleh dijual ulang?',
    answer:
      'Boleh. Keempat font memakai SIL Open Font License 1.1 yang mengizinkan penyematan font di PDF dan penjualan berkas hasilnya. Teks lisensi lengkap ikut dalam ZIP, dan halaman ketentuan di dalam PDF mengatur apa yang boleh dilakukan pembeli Anda.',
  },
  {
    question: 'Kenapa perlu A4 dan US Letter sekaligus?',
    answer:
      'Pembeli Indonesia dan Eropa mencetak di A4, pembeli Amerika Utara di US Letter. Mencetak A4 pada kertas Letter memaksa penskalaan dan mengecilkan margin. DoodleGen menata ulang halaman untuk setiap ukuran, bukan sekadar menskalakan, lalu mengeluarkan dua berkas.',
  },
  {
    question: 'Apakah file saya diunggah ke server?',
    answer:
      'Tidak ada yang dikirim ke mana pun. Font dimuat ke browser, layout dihitung di perangkat Anda, dan PDF dirakit di tab yang sedang terbuka. Setelah dibuka sekali, studio bahkan tetap jalan tanpa koneksi.',
  },
  {
    question: 'Berapa halaman maksimal dalam satu berkas?',
    answer:
      'Dua ratus halaman per berkas, cukup untuk rentang angka 1–200 atau daftar kata yang panjang. Satu set A–Z 26 halaman biasanya berukuran sekitar 20 KB karena tidak ada gambar raster di dalamnya.',
  },
  {
    question: 'Bisa diedit di Canva atau Cricut?',
    answer:
      'Bisa. Selain PDF, setiap lembar latihan ikut sebagai berkas SVG seukuran kertas aslinya — Canva, Figma, Illustrator, Inkscape, dan Cricut Design Space semuanya membukanya, dan isinya bentuk yang sama persis dengan yang dicetak PDF-nya. DoodleGen sendiri tidak menyambung ke akun Canva: aplikasinya jalan tanpa server dan tanpa login, dan gambar pihak ketiga hampir tidak pernah membawa hak jual ulang yang Anda butuhkan.',
  },
  {
    question: 'Kenapa lembar latihannya tidak berwarna?',
    answer:
      'Karena warnanya datang dari anak yang mewarnai. Di luar itu, warna pada lembar latihan berarti plat cetak tambahan di percetakan, hasil fotokopi yang kotor, dan tinta printer rumahan yang habis lebih cepat. Warna dipakai di tempat yang memang menjual: halaman sampul dan gambar listing — dengan empat palet, dan sampul yang menampilkan huruf sudah diwarnai di sebelah huruf yang masih kosong.',
  },
  {
    question: 'Kalau saya jual ke pembeli luar negeri?',
    answer:
      'Pilih bahasa berkas "English" di langkah 05. Halaman sampul, halaman ketentuan, kaki halaman, dan panduan cetak untuk pembeli ikut berbahasa Inggris, dan nama folder di dalam ZIP juga. Gambar listing tidak perlu diatur: kanvas Etsy, TPT, Gumroad, dan Pinterest selalu berbahasa Inggris, kanvas Shopee/Tokopedia selalu berbahasa Indonesia.',
  },
  {
    question: 'Bisa pakai nama anak atau kata pesanan pelanggan?',
    answer:
      'Bisa. Pilih jenis konten "Kata & Nama", lalu tulis satu kata per baris. Cocok untuk pesanan custom di Shopee dan Tokopedia maupun paket sight words di Etsy atau TPT.',
  },
];
