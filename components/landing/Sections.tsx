'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CheckIcon, ChevronIcon, CoverMark, KitIcon, LayoutMark } from '../diagrams';
import { CountUp, Reveal, useRipple } from '../motion';
import { IMAGE_SPECS } from '@/lib/cover';
import { COVER_STYLES } from '@/lib/covers';
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

/**
 * Every section opens the same way: an eyebrow, one heading, and at most one
 * paragraph. Repeating the shape is what lets a long page be scanned instead
 * of read, which is the only way a landing page is ever actually used.
 */
function SectionHead({
  eyebrow,
  title,
  lede,
  align = 'left',
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  align?: 'left' | 'centre';
}) {
  return (
    <Reveal className={align === 'centre' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      <p className="field-label text-accent">{eyebrow}</p>
      <h2 className="mt-3 text-balance font-brand text-[28px] leading-[1.15] tracking-tightest sm:text-[36px]">
        {title}
      </h2>
      {lede ? <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">{lede}</p> : null}
    </Reveal>
  );
}

export function Marquee() {
  const row = [...MARKETPLACES, ...MARKETPLACES];
  return (
    <section aria-label="Marketplace yang didukung" className="border-y border-line bg-surface py-7">
      <p className="mb-4 text-center text-[11.5px] font-medium text-ink-mute">
        Formatnya mengikuti formulir unggah di
      </p>
      <div className="marquee-host relative overflow-hidden">
        <div className="marquee-track flex w-max items-center gap-12 px-6">
          {row.map((name, index) => (
            <span
              key={`${name}-${index}`}
              className="whitespace-nowrap text-[15px] font-semibold tracking-tight text-ink-mute"
            >
              {name}
            </span>
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-surface to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-surface to-transparent" />
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
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
      {/* One panel, four columns, divided by the same hairline as everything
          else — four floating numbers read as decoration, a panel reads as a
          claim. */}
      <div className="card grid overflow-hidden divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4">
        {STATS.map((stat, index) => (
          <Reveal
            key={stat.label}
            delay={index * 70}
            className={`px-6 py-7 sm:[&:nth-child(n+3)]:border-t sm:[&:nth-child(n+3)]:border-line
                        sm:[&:nth-child(even)]:border-l sm:[&:nth-child(even)]:border-line
                        lg:[&:nth-child(n+3)]:border-t-0 lg:[&:not(:first-child)]:border-l
                        lg:[&:not(:first-child)]:border-line`}
          >
            <p className="font-brand text-[38px] leading-none tracking-tightest text-ink">
              <CountUp to={stat.value} suffix={stat.suffix} />
            </p>
            <p className="mt-2 text-[13px] leading-snug text-ink-mute">{stat.label}</p>
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
    title: 'Dua belas model sampul & lisensi otomatis',
    body: 'Dua belas model sampul bermerek dengan palet warna pilihan — termasuk dua yang mengikuti susunan sampul buku terbitan: judul di panel kepala, gambar di satu jendela, penerbit di kaki. Halaman ketentuan di belakang, nomor halaman di setiap lembar.',
  },
  {
    title: 'Gambar listing siap unggah',
    body: 'Bukan satu gambar, tapi satu set: sampul, kisi berisi semua halaman, mockup lembaran di atas meja, dan kartu "cara kerja" yang menjawab pertanyaan barangnya dikirim ke mana. Semuanya digambar dari halaman aslinya, dalam ukuran dan bahasa tiap marketplace.',
  },
  {
    title: 'Teks listing dan langkah unggahnya',
    body: 'Judul, deskripsi, dan tag enam kanal terisi dari setelan yang dipakai, lalu disusun mengikuti formulir tambah produk masing-masing: foto mana yang diunggah, kategori apa, sampai kolom berat dan kurir yang tetap diminta Shopee dan Tokopedia untuk berkas yang tidak dikirim.',
  },
  {
    title: 'Kata kunci dan bahasa ikut pasarnya',
    body: 'Satu klik memindahkan sampul, lisensi, dan panduan cetak ke bahasa Inggris atau Indonesia. Kata kuncinya sendiri dihitung dari isi paket, lalu ditaruh di tempat yang memang dibaca: tag untuk Etsy, nama produk untuk Shopee yang tidak punya kolom tag, nama sekaligus deskripsi untuk Tokopedia — dan semuanya diperiksa mesin sebelum keluar.',
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
    <section id="fitur" className="scroll-mt-20 border-t border-line bg-surface py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHead
          eyebrow="Kenapa DoodleGen"
          title="Dari ide sampai listing, tanpa membuka aplikasi desain"
        />

        {/*
         * Eight cards on a grid, the shape a marketplace uses for everything
         * it wants browsed rather than read. The hairline grid this replaced
         * asked the eye to follow rules across four columns; a card asks it
         * only to stop.
         */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, index) => (
            <Reveal key={feature.title} delay={index * 45} className="h-full">
              <article className="card-lift flex h-full flex-col p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sunk text-[12px] font-bold tabular-nums text-ink-mute">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-4 text-[15px] font-semibold leading-snug tracking-tight">
                  {feature.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-mute">{feature.body}</p>
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
    <section id="standar" className="scroll-mt-20 py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
          <div>
            <SectionHead
              eyebrow="Standar cetak"
              title="Enam janji yang diperiksa mesin, bukan diklaim di halaman ini"
            />
            <Reveal delay={80}>
              <p className="mt-4 max-w-md text-[14px] leading-relaxed text-ink-soft">
                Setiap PDF hasil DoodleGen diuji ulang lewat{' '}
                <code className="rounded-md bg-sunk px-1.5 py-0.5 text-[13px] text-ink-soft">
                  npm run verify
                </code>
                : berkas dirender ke piksel, isi streamnya dibaca, dan pemeriksaan gagal bila salah
                satu janji di samping tidak terpenuhi.
              </p>
            </Reveal>
          </div>

          {/* Read as what it is: a spec sheet, ruled line by line. */}
          <div className="card overflow-hidden shadow-sheet">
            {STANDARDS.map((item, index) => (
              <Reveal
                key={item.label}
                delay={index * 45}
                className="flex gap-3 border-b border-line px-5 py-4 last:border-b-0"
              >
                <span className="mt-[3px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <CheckIcon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold leading-snug tracking-tight">{item.label}</p>
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
    body: 'PDF A4 dan US Letter, gambar listing lima ukuran, draf deskripsi dan langkah unggah enam kanal, plus lisensi font — satu ZIP.',
  },
];

export function Steps() {
  return (
    <section className="border-y border-line bg-surface py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHead eyebrow="Cara kerja" title="Tiga langkah, sekitar dua menit" />

        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <Reveal key={step.title} delay={index * 90} as="li" className="h-full">
              <div className="card flex h-full flex-col p-6">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-[13px] font-bold tabular-nums text-accent-on">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-[16px] font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-mute">{step.body}</p>
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
    <section id="kit" className="scroll-mt-20 py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <SectionHead
              eyebrow="Kit marketplace"
              title="Bagian yang biasanya makan waktu semalam, ikut keluar bersama berkasnya"
              lede="Halaman cetak hanya setengah dari produk digital. Setengah lagi adalah dua belas gambar listing, judul, deskripsi, tag, lembar ketentuan — dan urutan mengisi formulir tambah produk di lapaknya. DoodleGen menyiapkan semuanya dari setelan yang sama, jadi angka di deskripsi selalu cocok dengan isi berkasnya."
            />

            {/* One ruled panel, matching the copy panel opposite it. */}
            <ul className="card mt-8 overflow-hidden shadow-sheet">
              {IMAGE_SPECS.filter((spec) => spec.kind === 'cover').map((spec, index) => (
                <Reveal key={spec.id} delay={index * 60} as="li" className="border-b border-line last:border-b-0">
                  <div className="flex items-center gap-3.5 px-5 py-3.5">
                    <span
                      aria-hidden="true"
                      className="flex shrink-0 items-center justify-center rounded-md border border-line bg-sunk
                                 text-[9px] font-semibold tabular-nums text-ink-mute"
                      style={{ width: 38, height: (38 * spec.height) / spec.width }}
                    >
                      {ratioOf(spec.width, spec.height)}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-semibold tracking-tight">{spec.label}</span>
                      <span className="block text-[12px] text-ink-mute">{spec.note}</span>
                    </span>
                    <span className="ml-auto shrink-0 rounded-full bg-sunk px-2.5 py-1 text-[11px] font-medium text-ink-mute">
                      {spec.market}
                    </span>
                  </div>
                </Reveal>
              ))}
            </ul>
          </div>

          <Reveal delay={120}>
            <div className="card overflow-hidden shadow-sheet">
              <div className="flex items-center gap-2 border-b border-line px-5 py-3.5">
                <span className="text-accent">
                  <KitIcon />
                </span>
                <p className="text-[13.5px] font-semibold tracking-tight">Teks listing &amp; langkah unggah</p>
              </div>
              <div className="divide-y divide-line">
                {MARKETS.map((market) => (
                  <div key={market.id} className="px-5 py-4">
                    <p className="flex items-center gap-2 text-[13.5px] font-semibold tracking-tight">
                      {market.label}
                      <span className="rounded-full bg-sunk px-2 py-0.5 text-[10.5px] font-semibold text-ink-mute">
                        {market.language.toUpperCase()}
                      </span>
                    </p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-ink-mute">{market.note}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-line bg-paper px-5 py-4">
                <p className="text-[12px] leading-relaxed text-ink-mute">
                  Isi ZIP: <span className="text-ink-soft">01-PRINT-FILES</span>,{' '}
                  <span className="text-ink-soft">02-LISTING-IMAGES</span>,{' '}
                  <span className="text-ink-soft">03-LISTING-COPY</span>,{' '}
                  <span className="text-ink-soft">04-UPLOAD-STEPS</span>,{' '}
                  <span className="text-ink-soft">05-SVG-EDITABLE</span>, READ-ME-FIRST.txt, dan
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
    <section className="border-y border-line bg-surface py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHead eyebrow="Mulai cepat" title="Empat paket yang tinggal dipakai" />

        {/*
         * Product cards: a picture of what comes out, a name, a line, and the
         * channel it was cut for. The picture is the two marks the studio
         * already draws for these very settings, so the card cannot promise a
         * layout the preset does not set.
         */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STARTER_PRESETS.map((preset, index) => (
            <Reveal key={preset.id} delay={index * 70} className="h-full">
              <Link
                href={`/studio#p=${preset.id}`}
                onClick={ripple}
                className="ripple-host card-lift group flex h-full flex-col overflow-hidden"
              >
                <span className="flex items-center justify-center gap-4 border-b border-line bg-sunk py-7 text-ink-soft">
                  <LayoutMark kind={preset.patch.layout ?? 'single'} />
                  <CoverMark kind={COVER_STYLES[preset.patch.coverStyle ?? 'classic'].page} />
                </span>
                <span className="flex flex-1 flex-col p-5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-mute">
                    {preset.market}
                  </span>
                  <span className="mt-2 text-[16px] font-semibold leading-tight tracking-tight">
                    {preset.label}
                  </span>
                  <span className="mt-1.5 text-[13px] leading-relaxed text-ink-mute">{preset.note}</span>
                  <span className="mt-auto pt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-accent">
                    Buka di studio
                    <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                      <ChevronIcon direction="right" />
                    </span>
                  </span>
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
    <section id="faq" className="scroll-mt-20 py-16 lg:py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <SectionHead
          eyebrow="Pertanyaan"
          title="Hal yang biasanya ditanyakan lebih dulu"
          align="centre"
        />

        <div className="card mt-10 divide-y divide-line overflow-hidden shadow-sheet">
          {FAQ.map((item, index) => {
            const isOpen = open === index;
            return (
              <div key={item.question}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  className="ripple-host flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-paper"
                  onClick={(event) => {
                    ripple(event);
                    setOpen(isOpen ? null : index);
                  }}
                >
                  <span className="text-[14.5px] font-semibold tracking-tight">{item.question}</span>
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
                    <p className="px-5 pb-5 text-[13.5px] leading-relaxed text-ink-soft">{item.answer}</p>
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
    <section className="px-4 pb-20 sm:px-6">
      <Reveal className="mx-auto max-w-6xl">
        {/*
         * The one dark panel on the page. A closing call that shares the
         * ground with everything above it does not close anything; this one
         * stops the scroll on its own.
         */}
        <div className="relative overflow-hidden rounded-3xl border border-line bg-band px-6 py-14 text-center sm:px-12 lg:py-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.12) 1px, transparent 0)',
              backgroundSize: '22px 22px',
              maskImage: 'radial-gradient(ellipse 70% 80% at 50% 0%, black, transparent 70%)',
              WebkitMaskImage: 'radial-gradient(ellipse 70% 80% at 50% 0%, black, transparent 70%)',
            }}
          />
          <div className="relative">
            <h2 className="text-balance font-brand text-[30px] leading-tight tracking-tightest text-band-ink sm:text-[42px]">
              Paket pertama Anda tinggal satu klik
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-band-ink/70">
              Tanpa akun, tanpa langganan, tanpa watermark. Buka studio, pilih satu preset, dan
              unduh berkas yang siap diunggah hari ini juga.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/studio" className="btn-primary !px-6 !py-3 !text-[15px]">
                Buka Studio
              </Link>
              <a
                href="#fitur"
                className="press inline-flex items-center justify-center rounded-xl border border-band-ink/20 px-6 py-3
                           text-[15px] font-medium text-band-ink transition-colors hover:bg-band-ink/10"
              >
                Lihat fiturnya dulu
              </a>
            </div>
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
        <div className="flex flex-wrap items-center gap-5 sm:ml-auto">
          <Link href="/studio" className="text-[13px] font-medium text-ink-soft transition-colors hover:text-accent">
            Studio
          </Link>
          <a href="#standar" className="text-[13px] font-medium text-ink-soft transition-colors hover:text-accent">
            Standar cetak
          </a>
          <a href="#faq" className="text-[13px] font-medium text-ink-soft transition-colors hover:text-accent">
            FAQ
          </a>
          <span className="text-[13px] text-ink-mute">Font: SIL OFL 1.1</span>
        </div>
      </div>
    </footer>
  );
}
