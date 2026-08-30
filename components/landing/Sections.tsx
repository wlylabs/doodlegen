'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CheckIcon, ChevronIcon, KitIcon } from '../diagrams';
import { CountUp, Reveal, useRipple } from '../motion';
import { IMAGE_SPECS } from '@/lib/cover';
import { MARKETS, STARTER_PRESETS } from '@/lib/presets';

/** "2000 x 2000" reads as 1:1; the tile says which shape it is. */
function ratioOf(width: number, height: number): string {
  const divisor = (a: number, b: number): number => (b === 0 ? a : divisor(b, a % b));
  const factor = divisor(width, height);
  return `${width / factor}:${height / factor}`;
}

const MARKETPLACES = [
  'Etsy',
  'Gumroad',
  'Shopee',
  'Tokopedia',
  'Teachers Pay Teachers',
  'Creative Fabrica',
  'Lemon Squeezy',
  'Karyakarsa',
];

export function Marquee() {
  const row = [...MARKETPLACES, ...MARKETPLACES];
  return (
    <section aria-label="Marketplace yang didukung" className="border-y border-line bg-surface py-5">
      <div className="marquee-host relative overflow-hidden">
        <div className="marquee-track flex w-max items-center gap-10 px-6">
          {row.map((name, index) => (
            <span
              key={`${name}-${index}`}
              className="whitespace-nowrap text-[12.5px] font-semibold uppercase tracking-[0.14em] text-ink-mute"
            >
              {name}
            </span>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-surface to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-surface to-transparent" />
      </div>
    </section>
  );
}

const STATS = [
  { value: 26, suffix: '', label: 'halaman A–Z sekali klik' },
  { value: 4, suffix: '', label: 'preset font berlisensi komersial' },
  { value: 300, suffix: '+', label: 'DPI, karena semuanya vektor' },
  { value: 0, suffix: '', label: 'watermark, login, dan biaya' },
];

export function Stats() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat, index) => (
          <Reveal key={stat.label} delay={index * 70} className="text-center sm:text-left">
            <p className="font-brand text-[40px] leading-none tracking-tightest text-accent">
              <CountUp to={stat.value} suffix={stat.suffix} />
            </p>
            <p className="mt-2 text-[13px] leading-snug text-ink-soft">{stat.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

const FEATURES = [
  {
    title: 'Mesin layout, bukan template',
    body: 'Ukuran huruf dihitung dari metrik font yang dipakai, jadi "A" dan "a" tetap proporsional dan setiap baris latihan duduk di garis dasar yang sama di seluruh halaman.',
  },
  {
    title: 'Pratinjau = hasil cetak',
    body: 'Pratinjau dan PDF menggambar kontur glyph yang sama persis dari file font yang sama. Tidak ada perkiraan, tidak ada kejutan waktu dicetak.',
  },
  {
    title: 'Sampul berwarna & lisensi otomatis',
    body: 'Sampul bermerek dengan palet warna pilihan, halaman ketentuan di belakang, nomor halaman di setiap lembar — persis seperti paket digital berbayar.',
  },
  {
    title: 'Bahasa mengikuti pasarnya',
    body: 'Satu klik memindahkan sampul, lisensi, dan panduan cetak ke bahasa Inggris untuk Etsy, TPT, dan Gumroad, atau bahasa Indonesia untuk Shopee dan Tokopedia. Gambar listing selalu ikut pasarnya sendiri.',
  },
  {
    title: 'Gambar listing siap unggah',
    body: 'Lima kanvas untuk Etsy, TPT, Gumroad, Shopee/Tokopedia, dan Pinterest digambar dari halaman aslinya — ukuran dan bahasanya sudah sesuai aturan tiap marketplace.',
  },
  {
    title: 'Draf judul, deskripsi, dan tag',
    body: 'Teks listing enam kanal — Etsy, TPT, Gumroad, Shopee, Tokopedia, Pinterest — langsung terisi dari setelan yang dipakai, dengan batas karakter dan jumlah tag yang sudah dipatuhi.',
  },
  {
    title: 'SVG untuk Canva & Cricut',
    body: 'Setiap lembar juga keluar sebagai SVG seukuran kertas aslinya, siap dibuka di Canva, Figma, Illustrator, atau Cricut — jadi Anda bisa menambahkan gambar sendiri di atas halaman yang sudah benar.',
  },
  {
    title: 'Jalan sepenuhnya di browser',
    body: 'PDF dibuat di perangkat Anda, tanpa server, tanpa antre, tanpa unggah. Setelah dibuka sekali, studio tetap bisa dipakai walau koneksi hilang.',
  },
];

export function Features() {
  return (
    <section id="fitur" className="scroll-mt-20 border-t border-line bg-surface py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <p className="field-label text-accent">Kenapa DoodleGen</p>
          <h2 className="mt-3 max-w-2xl font-brand text-[30px] leading-tight tracking-tightest sm:text-[38px]">
            Dari ide sampai listing, tanpa membuka aplikasi desain
          </h2>
        </Reveal>

        {/*
         * A hairline grid, not eight identical boxes with the same icon in
         * them. The rules do the separating, the numbers do the ordering, and
         * nothing is repeated eight times except the rhythm.
         */}
        <div className="mt-10 grid border-t border-line sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, index) => (
            <Reveal
              key={feature.title}
              delay={index * 45}
              className="border-b border-line px-0 py-6 sm:odd:pr-7 sm:even:border-l sm:even:pl-7
                         lg:[&:nth-child(4n+1)]:pr-7 lg:[&:not(:nth-child(4n+1))]:border-l
                         lg:[&:not(:nth-child(4n+1))]:px-7 lg:[&:nth-child(4n)]:pr-0"
            >
              <article className="h-full">
                <p className="spec text-accent">{String(index + 1).padStart(2, '0')}</p>
                <h3 className="mt-2.5 text-[15px] font-semibold leading-snug">{feature.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{feature.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const STANDARDS = [
  { label: '300 DPI atau lebih', body: 'Tidak ada satu piksel pun. Huruf adalah kontur glyph, garis bantu adalah garis vektor.' },
  { label: 'Font tersemat penuh', body: 'Seluruh face ditanam sebagai CIDFontType2, yang dicari preflight percetakan.' },
  { label: 'Margin aman 0.5 inci', body: 'Batas keras, lalu diukur ulang: halaman dirender dan gagal bila ada satu piksel masuk pita tepi.' },
  { label: 'Tinta hitam K-only', body: 'Setiap lembar latihan satu plat cetak, fotokopi tetap bersih. Warna hanya boleh ada di halaman sampul.' },
  { label: 'Latar putih bersih', body: 'Kotak 0% tinta: putih di layar, tanpa tinta di kertas.' },
  { label: 'Tanpa watermark', body: 'Tidak ada, di mana pun, termasuk pada berkas gratis.' },
];

export function Standards() {
  return (
    <section id="standar" className="scroll-mt-20 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Reveal>
            <p className="field-label text-accent">Standar cetak</p>
            <h2 className="mt-3 font-brand text-[30px] leading-tight tracking-tightest sm:text-[38px]">
              Enam janji yang diperiksa mesin, bukan diklaim di halaman ini
            </h2>
            <p className="mt-4 max-w-md text-[14px] leading-relaxed text-ink-soft">
              Setiap PDF hasil DoodleGen diuji ulang lewat <code className="rounded bg-accent-soft px-1.5 py-0.5 text-[13px] text-accent-hover">npm run verify</code>:
              berkas dirender ke piksel, isi streamnya dibaca, dan pemeriksaan gagal bila salah satu
              janji di samping tidak terpenuhi.
            </p>
          </Reveal>

          {/* Read as what it is: a spec sheet, ruled line by line. */}
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            {STANDARDS.map((item, index) => (
              <Reveal
                key={item.label}
                delay={index * 45}
                className="flex gap-3 border-b border-line px-4 py-3.5 last:border-b-0"
              >
                <span className="mt-[3px] shrink-0 text-accent">
                  <CheckIcon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold leading-snug">{item.label}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-mute">{item.body}</p>
                </div>
                <span className="spec ml-auto hidden shrink-0 pt-0.5 sm:block">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    title: 'Pilih isi dan gaya',
    body: 'Alfabet, angka, atau daftar kata sendiri. Tentukan gaya garis, layout halaman, dan ukuran kertas.',
  },
  {
    title: 'Periksa di pratinjau',
    body: 'Geser antar halaman, nyalakan penanda area aman, dan ganti font tanpa menunggu render ulang.',
  },
  {
    title: 'Ambil kit marketplace',
    body: 'PDF A4 dan US Letter, gambar listing lima ukuran, draf deskripsi enam kanal, plus lisensi font — satu ZIP.',
  },
];

export function Steps() {
  return (
    <section className="border-y border-line bg-surface py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <p className="field-label text-accent">Cara kerja</p>
          <h2 className="mt-3 font-brand text-[30px] leading-tight tracking-tightest sm:text-[38px]">
            Tiga langkah, sekitar dua menit
          </h2>
        </Reveal>

        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <Reveal key={step.title} delay={index * 90} as="li">
              <div className="card-lift h-full p-5">
                <span className="font-brand text-[28px] leading-none tracking-tightest text-accent">
                  0{index + 1}
                </span>
                <h3 className="mt-3 text-[16px] font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-soft">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function KitShowcase() {
  return (
    <section id="kit" className="scroll-mt-20 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2">
          <Reveal>
            <p className="field-label text-accent">Kit marketplace</p>
            <h2 className="mt-3 font-brand text-[30px] leading-tight tracking-tightest sm:text-[38px]">
              Bagian yang biasanya makan waktu semalam, ikut keluar bersama berkasnya
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-ink-soft">
              Halaman cetak hanya setengah dari produk digital. Setengah lagi adalah gambar listing,
              judul, deskripsi, tag, dan lembar ketentuan. DoodleGen menyiapkan semuanya dari setelan
              yang sama, jadi angka di deskripsi selalu cocok dengan isi berkasnya.
            </p>

            {/* One ruled panel, matching the copy panel opposite it. */}
            <ul className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface">
              {IMAGE_SPECS.map((spec, index) => (
                <Reveal key={spec.id} delay={index * 60} as="li" className="border-b border-line last:border-b-0">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span
                      aria-hidden="true"
                      className="flex shrink-0 items-center justify-center rounded border border-line-strong bg-paper
                                 text-[9px] font-semibold tabular-nums text-ink-mute"
                      style={{ width: 38, height: (38 * spec.height) / spec.width }}
                    >
                      {ratioOf(spec.width, spec.height)}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-semibold">{spec.label}</span>
                      <span className="block text-[12px] text-ink-mute">{spec.note}</span>
                    </span>
                    <span className="ml-auto shrink-0 text-[11px] font-medium text-accent">
                      {spec.market}
                    </span>
                  </div>
                </Reveal>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={120}>
            <div className="card-lift overflow-hidden">
              <div className="flex items-center gap-2 border-b border-line px-4 py-3">
                <span className="text-accent">
                  <KitIcon />
                </span>
                <p className="text-[13px] font-semibold">Draf teks listing</p>
              </div>
              <div className="divide-y divide-line">
                {MARKETS.map((market) => (
                  <div key={market.id} className="px-4 py-3.5">
                    <p className="flex items-center gap-2 text-[13px] font-semibold">
                      {market.label}
                      <span className="pill !py-0.5 !text-[11px]">{market.language.toUpperCase()}</span>
                    </p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-mute">{market.note}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-line bg-paper px-4 py-3">
                <p className="text-[12px] leading-relaxed text-ink-mute">
                  Isi ZIP: <span className="text-ink-soft">01-PRINT-FILES</span>,{' '}
                  <span className="text-ink-soft">02-LISTING-IMAGES</span>,{' '}
                  <span className="text-ink-soft">03-LISTING-COPY</span>, READ-ME-FIRST.txt, dan
                  FONT-LICENSE.txt — dalam bahasa Indonesia bila paketnya berbahasa Indonesia.
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function Presets() {
  const ripple = useRipple<HTMLAnchorElement>();
  return (
    <section className="border-y border-line bg-surface py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <p className="field-label text-accent">Mulai cepat</p>
          <h2 className="mt-3 font-brand text-[30px] leading-tight tracking-tightest sm:text-[38px]">
            Empat paket yang tinggal dipakai
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STARTER_PRESETS.map((preset, index) => (
            <Reveal key={preset.id} delay={index * 70}>
              <Link
                href={`/studio#p=${preset.id}`}
                onClick={ripple}
                className="ripple-host card-lift flex h-full flex-col p-5"
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
                  {preset.market}
                </span>
                <span className="mt-2 text-[16px] font-semibold leading-tight tracking-tight">
                  {preset.label}
                </span>
                <span className="mt-1.5 text-[13px] leading-relaxed text-ink-mute">{preset.note}</span>
                <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-accent">
                  Buka di studio
                  <ChevronIcon direction="right" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const FAQ = [
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

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const ripple = useRipple<HTMLButtonElement>();

  return (
    <section id="faq" className="scroll-mt-20 py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal>
          <p className="field-label text-accent">Pertanyaan</p>
          <h2 className="mt-3 font-brand text-[30px] leading-tight tracking-tightest sm:text-[38px]">
            Hal yang biasanya ditanyakan lebih dulu
          </h2>
        </Reveal>

        <div className="mt-8 divide-y divide-line border-y border-line">
          {FAQ.map((item, index) => {
            const isOpen = open === index;
            return (
              <div key={item.question}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  className="ripple-host press flex w-full items-center gap-3 py-4 text-left"
                  onClick={(event) => {
                    ripple(event);
                    setOpen(isOpen ? null : index);
                  }}
                >
                  <span className="text-[15px] font-semibold tracking-tight">{item.question}</span>
                  <span
                    className={`ml-auto shrink-0 text-ink-mute transition-transform duration-300 ${
                      isOpen ? 'rotate-180 text-accent' : ''
                    }`}
                  >
                    <ChevronIcon direction="down" />
                  </span>
                </button>
                <div
                  className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="pb-5 pr-8 text-[14px] leading-relaxed text-ink-soft">{item.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function Cta() {
  return (
    <section className="px-4 pb-16 sm:px-6">
      <Reveal className="mx-auto max-w-6xl">
        <div className="relative overflow-hidden rounded-3xl border border-accent/20 bg-accent-soft px-6 py-12 text-center sm:px-12">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-6 h-40 w-40 rounded-full bg-accent/10 blur-2xl" />
          <h2 className="font-brand text-[30px] leading-tight tracking-tightest sm:text-[40px]">
            Paket pertama Anda tinggal satu klik
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-[14.5px] leading-relaxed text-ink-soft">
            Tanpa akun, tanpa langganan, tanpa watermark. Buka studio, pilih satu preset, dan unduh
            berkas yang siap diunggah hari ini juga.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link href="/studio" className="btn-primary">
              Buka Studio
            </Link>
            <a href="#fitur" className="btn-quiet !px-5 !py-3 !text-[15px]">
              Lihat fiturnya dulu
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:px-6">
        <p className="text-[13px] text-ink-mute">
          DoodleGen — generator halaman mewarnai dan tracing siap cetak.
        </p>
        <div className="flex flex-wrap gap-4 sm:ml-auto">
          <Link href="/studio" className="text-[13px] font-medium text-ink-soft hover:text-accent">
            Studio
          </Link>
          <a href="#standar" className="text-[13px] font-medium text-ink-soft hover:text-accent">
            Standar cetak
          </a>
          <a href="#faq" className="text-[13px] font-medium text-ink-soft hover:text-accent">
            FAQ
          </a>
          <span className="text-[13px] text-ink-mute">Font: SIL OFL 1.1</span>
        </div>
      </div>
    </footer>
  );
}
