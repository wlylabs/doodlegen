import { IMAGE_SPECS } from './cover';
import type { ImageKind, ImageSpec } from './cover';
import { buildListing } from './listing';
import type { ListingCopy, ListingInput } from './listing';
import { packSlug } from './naming';
import { checkListing, findingToText, marketRules } from './policy';
import type { PolicyFinding } from './policy';
import { MARKETS, papersFor } from './presets';
import type { MarketSpec } from './presets';
import type { Config } from './types';

/**
 * How one field gets filled, which is also how the studio draws it: the three
 * generated kinds carry the copy this very pack produced, `text` is a literal
 * to paste, `pick` is an option to choose from a dropdown, and `asset` is a
 * file out of the kit to upload.
 */
export type FieldKind = 'title' | 'body' | 'tags' | 'text' | 'pick' | 'asset';

export interface UploadField {
  kind: FieldKind;
  /** The field's name as that marketplace's own form prints it. */
  label: string;
  /** The copy for the generated kinds; the recommended answer otherwise. */
  value: string;
  /** Why this answer, or what the form does with it. */
  note?: string;
}

export interface UploadStep {
  title: string;
  /** Where the step happens, in the marketplace's own navigation. */
  detail?: string;
  fields: UploadField[];
  /** What belongs to the step rather than to any single field in it. */
  tips?: string[];
}

export interface UploadGuide {
  market: MarketSpec['id'];
  label: string;
  /** The route to the form, so step one is never "find the button". */
  entry: string;
  steps: UploadStep[];
  /** Read once before publishing, not while filling the form. */
  checklist: string[];
  /**
   * That marketplace's own rules about the words themselves — what may not
   * appear in a listing, and what has to. The draft below is written to
   * satisfy them; these lines are here so the seller editing it knows which
   * lines they are not free to rewrite.
   */
  rules: string[];
  /**
   * Anything in this pack's copy that still trips one of those rules. Normally
   * empty — the generator's own words pass — so what shows up here is what the
   * seller typed: a shop name carrying somebody's brand, a tagline with a
   * phone number in it, a product title shouting a discount.
   */
  warnings: PolicyFinding[];
  /**
   * The very copy these steps paste. Carried along so a caller holding a
   * guide never has to rebuild the listing to draw a tag chip or a counter.
   */
  copy: ListingCopy;
}

/** Everything a guide holds except what the generator fills in around it. */
type GuideBody = Omit<UploadGuide, 'market' | 'label' | 'copy' | 'rules' | 'warnings'>;

/** Which canvases each marketplace's photo slots are cut for. */
const IMAGE_MARKET: Record<MarketSpec['id'], string> = {
  etsy: 'Etsy',
  tpt: 'Teachers Pay Teachers',
  gumroad: 'Gumroad',
  // One Indonesian set serves both lapak: same buyer, same 1:1 crop.
  shopee: 'Shopee / Tokopedia',
  tokopedia: 'Shopee / Tokopedia',
  pinterest: 'Pinterest',
};

/** What each canvas is doing in the slot it occupies. */
const IMAGE_ROLE: Record<ImageKind, string> = {
  cover: 'Foto utama — ini yang muncul di hasil pencarian dan menentukan diklik atau tidak.',
  grid: 'Bukti isi: semua halaman dalam satu gambar. Pembeli produk digital tidak bisa membuka filenya sebelum bayar, dan ini yang menjawabnya.',
  mockup: 'Memperlihatkan lembarannya sebagai kertas, bukan sebagai berkas — yang dibayangkan pembeli adalah sore hari anaknya mewarnai.',
  steps: 'Menjawab "barangnya dikirim ke mana?" sebelum ditanya di chat.',
};

/** Grade bands a TPT product page asks for, from what the pack teaches. */
const TPT_GRADES: Record<Config['content'], string> = {
  letters: 'PreK, Kindergarten, 1st grade',
  numbers: 'PreK, Kindergarten, 1st grade',
  words: 'PreK, Kindergarten, 1st, 2nd grade',
};

const TPT_SUBJECTS: Record<Config['content'], string> = {
  letters: 'English Language Arts › Handwriting, Phonics',
  numbers: 'Math › Numbers, Basic Operations',
  words: 'English Language Arts › Handwriting, Vocabulary',
};

/**
 * The marketplace forms, walked field by field in the order each one asks.
 *
 * Everything a seller has to decide once — the weight Shopee will not let a
 * listing save without, the category that changes which fields appear next,
 * the quantity a digital listing should carry — is answered here with the
 * numbers from this pack, next to the copy that was written for it. The
 * screen names are the ones printed on the form, in that marketplace's own
 * interface language, so the guide can be read with the form open beside it.
 *
 * Field labels and menu wording do move: marketplaces redraw these forms
 * every few seasons. The values stay right when a label drifts, which is why
 * every step says what the field is *for* and not only where it sits.
 */
export function buildUploadGuides(input: ListingInput): UploadGuide[] {
  const { config, characters, pageCount } = input;
  const listings = new Map<MarketSpec['id'], ListingCopy>(
    buildListing(input).map((listing) => [listing.market, listing]),
  );

  const worksheets = characters.length;
  const papers = papersFor(config.paper);
  const paperLabel = papers.map((paper) => paper.label).join(' + ');
  const slug = packSlug(config, characters);
  const sku = slug.toUpperCase();
  const fileLine = `${papers.length} PDF (${paperLabel}), ${pageCount} halaman`;
  const svgLine = config.svgFiles ? ' Jadikan folder SVG satu ZIP kalau mau ikut dijual.' : '';
  // A pack cut for one paper size still sells; it just sells to one continent.
  const papersNote =
    papers.length > 1
      ? `Unggah versi ${paperLabel} sekaligus supaya pembeli dari negara mana pun bisa mencetak.`
      : `Paket ini hanya berisi ${paperLabel}. Nyalakan dua ukuran kertas di langkah 04 (Ukuran Kertas) kalau mau menjangkau pembeli yang mencetak di ukuran satunya.`;

  const imagesFor = (market: MarketSpec['id']): ImageSpec[] =>
    IMAGE_SPECS.filter((spec) => spec.market === IMAGE_MARKET[market]);

  const image = (market: MarketSpec['id']): { value: string; note: string } => {
    const specs = imagesFor(market);
    const spec = specs.find((item) => item.kind === 'cover') ?? specs[0] ?? IMAGE_SPECS[0];
    return {
      value: `${spec.label} — ${spec.note}`,
      note: 'Ada di tab Gambar, dan di folder gambar listing dalam ZIP.',
    };
  };

  /**
   * One field per photo slot, in the order they should be uploaded. A digital
   * listing lives or dies on its second and third photo as much as its first:
   * the buyer who is still deciding is the one scrolling past the cover.
   */
  const photoFields = (market: MarketSpec['id'], label: string): UploadField[] =>
    imagesFor(market).map((spec, index) => ({
      kind: 'asset' as const,
      label: index === 0 ? label : `Foto ke-${index + 1}`,
      value: `${spec.label} — ${spec.note}`,
      note: IMAGE_ROLE[spec.kind],
    }));

  /** The generated copy for one marketplace, as three ready fields. */
  const copyFields = (market: MarketSpec['id']) => {
    const listing = listings.get(market);
    return {
      title: listing?.title ?? '',
      body: listing?.body ?? '',
      /** Comma-joined: how a tag list reads on paper, and in a paste. */
      tags: (listing?.tags ?? []).join(', '),
    };
  };

  const coverNote = config.coverPage
    ? 'Halaman sampul aktif, jadi halaman pertama PDF sudah berupa sampul bermerek.'
    : 'Halaman sampul mati di langkah 05 (Merek & Paket), jadi halaman pertama PDF adalah lembar latihan. Nyalakan sampul kalau muka produk ikut diambil dari berkasnya.';

  const priceNote = (extra: string) =>
    `Kamu yang menentukan. Buka dulu 3–5 lapak sejenis dengan kata kunci judul ini, lalu pasang di kisaran yang sama. ${extra}`;

  const build: Record<MarketSpec['id'], GuideBody> = {
    shopee: shopeeGuide(),
    tokopedia: tokopediaGuide(),
    etsy: etsyGuide(),
    tpt: tptGuide(),
    gumroad: gumroadGuide(),
    pinterest: pinterestGuide(),
  };

  return MARKETS.map((market) => {
    const listing = listings.get(market.id);
    if (!listing) throw new Error(`Teks listing ${market.id} tidak tersedia.`);
    return {
      market: market.id,
      label: market.label,
      copy: listing,
      rules: marketRules(market.id),
      // Read the draft the way that marketplace's scanner reads it, every
      // time the guide is built: the seller's own words reach the listing
      // through the same fields, and they are the ones that trip it.
      warnings: checkListing(listing, market.id),
      ...build[market.id],
    };
  });

  // ---------------------------------------------------------------------
  // Indonesia: one file, two lapak, and a form built for a parcel.
  // ---------------------------------------------------------------------

  function shopeeGuide(): GuideBody {
    const copy = copyFields('shopee');
    const photo = image('shopee');
    return {
      entry: 'Aplikasi Shopee Seller → Produk → Tambah Produk (atau Seller Centre → Produk Saya → Tambah Produk Baru).',
      steps: [
        {
          title: 'Foto Produk',
          detail: 'Ketuk "+ Tambah Foto", pilih dari galeri, dan biarkan pilihan rasio pada Foto 1:1.',
          fields: [
            ...photoFields('shopee', 'Foto Produk *'),
            {
              kind: 'pick',
              label: 'Rasio foto',
              value: '1:1',
              note: 'Shopee memotong foto yang bukan 1:1 di halaman pencarian, dan potongannya tidak bisa diatur. Ketiga gambar kit ini sudah 1:1.',
            },
          ],
          tips: [
            'Unggah ketiganya berurutan: foto utama, isi lengkap, lalu cara kerja. Slot foto kedua dan ketiga itu yang dilihat pembeli yang masih ragu.',
          ],
        },
        {
          title: 'Nama Produk',
          fields: [
            {
              kind: 'title',
              label: 'Nama Produk *',
              value: copy.title,
              note: 'Ini satu-satunya kolom yang dibaca mesin pencari Shopee — tidak ada kolom tag. Draf mengisi ±165 dari 255 karakter: bagian sebelum tanda "|" untuk pembeli yang membacanya di kartu HP, sisanya kata kunci untuk mesin.',
            },
          ],
          tips: [
            'Jangan menumpuk kata kunci atau kata promosi berulang di nama produk — Shopee menurunkan peringkat produk yang begitu.',
          ],
        },
        {
          title: 'Kategori, GTIN, dan Produk Berbahaya',
          detail: 'Kategori menentukan kolom wajib yang muncul setelahnya, jadi pilih ini sebelum mengisi sisanya.',
          fields: [
            {
              kind: 'pick',
              label: 'Kategori *',
              value: 'Buku & Majalah › Buku Bacaan › Buku Anak',
              note: 'Kategori digital Shopee (Tiket, Voucher & Layanan) hanya terbuka untuk penjual yang sudah diizinkan menjual produk digital — ketik "ebook" atau "digital" di pencarian kategori dulu, dan kalau muncul untuk akunmu, pakai itu lalu lewati langkah Berat dan Pengiriman. Kalau tidak muncul, kategori buku anak yang paling dekat; jangan memilih kategori mata pelajaran yang tidak sesuai isi paket, karena kategori yang meleset yang paling sering memicu peninjauan.',
            },
            {
              kind: 'pick',
              label: 'GTIN',
              value: 'Kosongkan',
              note: 'Kode barcode dari pabrik. Produk digital tidak punya, dan kolom ini tidak wajib.',
            },
            { kind: 'pick', label: 'Produk Berbahaya *', value: 'Tidak', note: 'Tidak ada baterai, cairan, atau magnet di dalam PDF.' },
          ],
        },
        {
          title: 'Deskripsi Produk',
          fields: [
            {
              kind: 'body',
              label: 'Deskripsi Produk *',
              value: copy.body,
              note: 'Batas 3000 karakter. Yang terlihat sebelum tombol "Selengkapnya" hanya 2–3 baris pertama, dan baris pertama draf ini sudah menyebut file PDF siap cetak beserta cara kirimnya.',
            },
          ],
          tips: [
            'Kalau muncul kotak kuning "Terdeteksi mengandung produk yang dilarang atau dalam pengawasan": itu hasil pemeriksaan otomatis, bukan penolakan. Produk tetap bisa disimpan, lalu ditinjau maksimal 1×24 jam sebelum tampil.',
            'Tiga hal yang paling sering memicunya: nama merek pihak lain (nama aplikasi desain, tokoh kartun), kontak atau ajakan di luar Shopee (nomor HP, tautan, email), dan kata-kata produk digital berakses instan seperti akun, langganan, voucher, atau kode aktivasi. Draf ini sudah bersih dari ketiganya — periksa nama toko, tagline, dan judul yang kamu tulis sendiri.',
            'Kategori buku juga diawasi karena buku bajakan: kalimat "karya asli toko ini, bukan hasil pindai buku terbitan" sengaja ada di bagian KETENTUAN, jangan dihapus.',
            'Kalau produknya sampai diblokir, buka Produk Saya → Pelanggaran Saya di Seller Centre: alasannya disebut di situ, deskripsinya bisa diperbaiki, lalu diajukan ulang.',
          ],
        },
        {
          title: 'Harga, Stok, dan SKU',
          fields: [
            {
              kind: 'pick',
              label: 'Harga *',
              value: 'Tentukan sendiri',
              note: priceNote('Paket printable lokal umumnya dijual di kisaran belasan sampai puluhan ribu rupiah.'),
            },
            {
              kind: 'text',
              label: 'Stok *',
              value: '999',
              note: 'Satu file bisa dijual berkali-kali, jadi stok besar supaya lapak tidak pernah berstatus habis.',
            },
            {
              kind: 'text',
              label: 'SKU',
              value: sku,
              note: 'Kode internalmu; tidak dilihat pembeli. Kode ini sama dengan nama folder ZIP-nya, jadi pesanan mudah dilacak ke berkasnya.',
            },
          ],
        },
        {
          title: 'Berat dan Pengiriman',
          detail: 'Kolom yang paling sering menahan penjual produk digital: Shopee tetap meminta ukuran paket untuk kategori fisik.',
          fields: [
            {
              kind: 'text',
              label: 'Berat *',
              value: '100',
              note: 'Dalam gram, dan wajib walau tidak ada barang yang dikirim. Angka inilah yang dipakai Shopee menghitung ongkir yang dibayar pembeli, jadi isi seringan mungkin.',
            },
            {
              kind: 'text',
              label: 'Ukuran Paket',
              value: '10 × 10 × 1',
              note: 'Sentimeter, hanya untuk hitungan volume kurir. Kosongkan kalau tidak diminta kategorimu.',
            },
            {
              kind: 'pick',
              label: 'Jasa Kirim *',
              value: 'Aktifkan satu kurir reguler termurah',
              note: 'Kategori fisik butuh minimal satu kurir aktif sebelum produk bisa ditampilkan.',
            },
          ],
          tips: [
            'Shopee memperlakukan pesanan ini sebagai pesanan fisik: kirim PDF lewat chat begitu pembayaran masuk, dan ikuti aturan pengiriman Shopee yang berlaku di kategorimu — jangan pernah mengisi nomor resi untuk paket yang memang tidak kamu kirim.',
          ],
        },
        {
          title: 'Kondisi, Pre-Order, dan Variasi',
          fields: [
            { kind: 'pick', label: 'Kondisi *', value: 'Baru', note: 'Berkas yang baru dibuat, bukan barang bekas.' },
            {
              kind: 'pick',
              label: 'Pre-Order',
              value: 'Tidak',
              note: 'Kamu mengirim filenya sendiri dalam hitungan menit, jadi tidak perlu tambahan waktu proses.',
            },
            {
              kind: 'pick',
              label: 'Variasi',
              value: 'Kosongkan',
              note: `Satu berkas, satu harga. Pakai variasi hanya kalau kamu menjual bundel (mis. ${paperLabel} terpisah).`,
            },
          ],
        },
        {
          title: 'Kata kunci pencarian',
          fields: [
            {
              kind: 'tags',
              label: 'Tidak ada kolom tag di Shopee',
              value: copy.tags,
              note: 'Shopee tidak menyediakan kolom tag untuk penjual biasa. Pakai daftar ini sebagai kata yang kamu masukkan ke nama produk dan ke deskripsi — di situlah mesin pencarinya membaca.',
            },
          ],
        },
      ],
      checklist: [
        'Tekan Simpan dulu untuk menyimpan draf, lihat pratinjaunya, baru tekan Tampilkan.',
        'Baca ulang nama toko, tagline, dan judul yang kamu tulis sendiri: nama merek pihak lain, nomor HP, tautan, dan kata promosi seperti "gratis" atau "termurah" adalah yang ditahan Shopee, bukan isi paketnya.',
        'Buka lapakmu dari HP: judulnya tidak boleh terpotong di titik yang membuang kata kunci.',
        'Siapkan balasan chat otomatis berisi cara mengunduh dan mencetak file, supaya pengiriman tidak menunggu kamu online.',
        'Kirim berkasnya lewat chat pesanan, bukan lewat aplikasi lain: riwayat chat Shopee adalah bukti kalau ada sengketa.',
      ],
    };
  }

  function tokopediaGuide(): GuideBody {
    const copy = copyFields('tokopedia');
    const photo = image('tokopedia');
    return {
      entry: 'Tokopedia Seller (aplikasi) atau seller.tokopedia.com → Produk → Tambah Produk.',
      steps: [
        {
          title: 'Foto Produk',
          fields: photoFields('tokopedia', 'Foto Produk *'),
          tips: [
            'Set yang sama dengan Shopee: 1200 × 1200, aman di atas batas minimum Tokopedia. Unggah ketiganya berurutan.',
          ],
        },
        {
          title: 'Nama Produk',
          fields: [
            {
              kind: 'title',
              label: 'Nama Produk *',
              value: copy.title,
              note: 'Tokopedia memotong tepat di 70 karakter. Draf memuat kata kunci utama di dalamnya, karena nama produk dan deskripsi dua-duanya terbaca pencarian.',
            },
          ],
        },
        {
          title: 'Kategori dan Kondisi',
          fields: [
            {
              kind: 'pick',
              label: 'Kategori *',
              value: 'Buku › Buku Anak',
              note: 'Ketik "ebook" dulu di pencarian kategori; kalau ada kategori digital yang cocok untuk akunmu, pakai itu. Kategori yang tidak sesuai isi produk termasuk alasan moderasi di Tokopedia, jadi jangan memilih kategori mata pelajaran yang tidak dibahas paket ini.',
            },
            { kind: 'pick', label: 'Kondisi *', value: 'Baru', note: 'Kolom ini wajib walau isinya berkas.' },
            {
              kind: 'pick',
              label: 'Etalase',
              value: 'Buat etalase "Printable / Lembar Kerja"',
              note: 'Etalase adalah rak di halaman tokomu; produk tanpa etalase hanya muncul di daftar umum.',
            },
          ],
        },
        {
          title: 'Deskripsi',
          fields: [
            {
              kind: 'body',
              label: 'Deskripsi *',
              value: copy.body,
              note: 'Batas 2000 karakter. Berbeda dari Etsy, deskripsi Tokopedia ikut terbaca pencarian — kata kunci utamanya sudah ditaruh di kalimat pertama, jangan dihapus.',
            },
          ],
          tips: [
            'Jangan menulis nomor WhatsApp, alamat email, atau tautan ke luar Tokopedia di deskripsi: itu melanggar aturan lapak dan produknya bisa ditolak.',
            'Nama merek pihak lain juga tidak boleh ikut — termasuk nama aplikasi desain yang biasa dipakai membuka SVG. Draf ini menyebut kemampuannya, bukan mereknya.',
          ],
        },
        {
          title: 'Harga, Stok, dan SKU',
          fields: [
            {
              kind: 'pick',
              label: 'Harga *',
              value: 'Tentukan sendiri',
              note: priceNote('Cek juga harga produk yang sama di Shopee supaya dua lapakmu tidak saling membanting harga.'),
            },
            { kind: 'text', label: 'Stok *', value: '999', note: 'Berkas tidak habis; stok besar menjaga lapak tetap aktif.' },
            { kind: 'text', label: 'SKU', value: sku, note: 'Kode internal, sama dengan yang dipakai di Shopee supaya satu produk satu kode.' },
          ],
        },
        {
          title: 'Berat dan Pengiriman',
          fields: [
            {
              kind: 'text',
              label: 'Berat Satuan *',
              value: '100 gram',
              note: 'Wajib untuk kategori fisik. Angka ini yang menentukan ongkir pembeli, jadi pakai yang paling ringan.',
            },
            { kind: 'text', label: 'Ukuran Paket', value: '10 × 10 × 1 cm', note: 'Opsional; hanya memengaruhi estimasi volume kurir.' },
            { kind: 'pick', label: 'Asuransi', value: 'Opsional', note: 'Tidak ada barang yang bisa rusak di jalan.' },
            {
              kind: 'pick',
              label: 'Pengiriman',
              value: 'Aktifkan kurir reguler termurah',
              note: 'Ikuti pengaturan kurir tokomu; produk tanpa kurir aktif tidak bisa dibeli.',
            },
            { kind: 'pick', label: 'Preorder', value: 'Nonaktif', note: 'Kamu mengirim berkasnya sendiri, tidak perlu waktu produksi.' },
          ],
          tips: [
            'Kirim PDF lewat chat Tokopedia setelah pesanan masuk, dan ikuti aturan pengiriman yang berlaku untuk kategorimu.',
          ],
        },
        {
          title: 'Kata kunci pencarian',
          fields: [
            {
              kind: 'tags',
              label: 'Tidak ada kolom tag di Tokopedia',
              value: copy.tags,
              note: 'Sama seperti Shopee: pakai daftar ini sebagai kata kunci di dalam nama produk dan deskripsi.',
            },
          ],
        },
      ],
      checklist: [
        'Simpan sebagai draf, buka halaman produknya sebagai pembeli, baru terbitkan.',
        'Pastikan kalimat "tidak ada barang fisik yang dikirim" masih ada di deskripsi setelah dipotong 2000 karakter.',
        'Isi balasan otomatis toko dengan cara mengunduh dan mencetak berkasnya.',
      ],
    };
  }

  // ---------------------------------------------------------------------
  // Global: forms that already know what a digital download is.
  // ---------------------------------------------------------------------

  function etsyGuide(): GuideBody {
    const copy = copyFields('etsy');
    const photo = image('etsy');
    // A word pack is the one shape of this product that is worth selling as a
    // custom order, because the seller can regenerate it in a minute.
    const personalisation =
      config.content === 'words'
        ? {
            value: 'Nyalakan',
            note: 'Paket kata/nama paling laku sebagai pesanan custom: minta pembeli menuliskan nama yang mau dilatih, lalu buat ulang paketnya di studio.',
          }
        : {
            value: 'Matikan',
            note: 'Berkasnya sama untuk semua pembeli, jadi instant download terkirim sendiri tanpa kamu sentuh.',
          };
    return {
      entry: 'Etsy.com → Shop Manager → Listings → Add a listing.',
      steps: [
        {
          title: 'Photos & video',
          detail: 'Foto pertama yang dilihat pembeli di hasil pencarian; sisanya baru dibuka setelah masuk halaman produk.',
          fields: [
            ...photoFields('etsy', 'Photos'),
            { kind: 'pick', label: 'Video', value: 'Lewati', note: 'Opsional, dan tidak wajib untuk instant download.' },
          ],
          tips: [
            'Etsy menerima sampai 10 foto. Empat kanvas dari kit ini mengisi empat slot pertama; sisanya bisa kamu tambahi foto hasil cetak sendiri.',
          ],
        },
        {
          title: 'Listing details',
          fields: [
            { kind: 'title', label: 'Title', value: copy.title, note: 'Batas 140 karakter. Etsy mencocokkan pencarian ke judul dan tag sekaligus, jadi tag teratas sengaja diulang persis di judul ini.' },
            { kind: 'pick', label: 'Who made it?', value: 'I did', note: 'Kamu yang menyusun berkasnya di studio ini.' },
            { kind: 'pick', label: 'What is it?', value: 'A finished product', note: 'Bukan bahan baku dan bukan alat.' },
            {
              kind: 'pick',
              label: 'When did you make it?',
              value: 'Rentang tahun terbaru (mis. 2020–2026)',
              note: 'Bukan "Made to order": berkasnya sudah jadi sebelum pesanan masuk.',
            },
            {
              kind: 'pick',
              label: 'Category',
              value: 'Ketik "coloring page" atau "worksheet", lalu pilih saran Etsy',
              note: 'Kategori menentukan atribut tambahan yang muncul di bawahnya.',
            },
            {
              kind: 'pick',
              label: 'Type',
              value: 'Digital',
              note: 'Begitu dipilih, Etsy mengganti seluruh bagian pengiriman dengan kotak unggah berkas — tidak ada kolom berat sama sekali.',
            },
            { kind: 'pick', label: 'Renewal options', value: 'Automatic', note: 'Listing Etsy berlaku empat bulan; perpanjangan otomatis menahan lapak tetap hidup.' },
          ],
        },
        {
          title: 'Description & tags',
          fields: [
            {
              kind: 'body',
              label: 'Description',
              value: copy.body,
              note: 'Etsy tidak memeringkat dari deskripsi, tapi Google mengutip ±160 karakter pertamanya — di situlah kata kunci utama draf ini duduk.',
            },
            {
              kind: 'tags',
              label: 'Tags',
              value: copy.tags,
              note: 'Inilah yang memeringkat di Etsy, bukan deskripsi. 13 tag maksimal 20 karakter, semuanya terisi frasa dua kata ke atas — kata tunggal kalah oleh semua lapak lain yang memakainya juga. Jangan menambahkan nama merek ke tag: kebijakan merek dagang Etsy menghitungnya pelanggaran walau hanya untuk menyebut kompatibilitas atau "terinspirasi dari".',
            },
            {
              kind: 'pick',
              label: 'Materials',
              value: 'PDF, printable, digital file',
              note: 'Opsional, tapi ikut terbaca pencarian.',
            },
          ],
        },
        {
          title: 'Inventory & pricing',
          fields: [
            {
              kind: 'pick',
              label: 'Price',
              value: 'Tentukan sendiri',
              note: priceNote('Hitung juga biaya listing Etsy per produk dan komisi transaksinya sebelum menetapkan angka.'),
            },
            { kind: 'text', label: 'Quantity', value: '999', note: 'Instant download tidak mengurangi stok, tapi angka besar aman kalau nanti kamu ubah cara pengirimannya.' },
            { kind: 'text', label: 'SKU', value: sku, note: 'Tidak dilihat pembeli; menyamakan kode di semua lapak.' },
            { kind: 'pick', label: 'Personalization', value: personalisation.value, note: personalisation.note },
          ],
        },
        {
          title: 'Digital files',
          detail: 'Bagian ini menggantikan kolom pengiriman begitu Type diisi Digital.',
          fields: [
            {
              kind: 'asset',
              label: 'Upload files',
              value: fileLine,
              note: `Etsy menerima sampai 5 berkas, masing-masing maksimal 20 MB. ${papersNote}${svgLine}`,
            },
          ],
          tips: [
            'Kalau satu PDF lewat 20 MB, jadikan ZIP dulu — Etsy tetap mengirimkannya sebagai instant download.',
          ],
        },
      ],
      checklist: [
        'Preview listing-nya sebelum publish: judul, foto utama, dan harga adalah tiga hal yang dilihat sekaligus di hasil pencarian.',
        'Etsy menarik dan menyetor PPN/VAT untuk pembeli di wilayah tertentu secara otomatis; harga yang kamu tulis adalah harga dasar.',
        'Setelah terbit, buka listing-nya sekali sebagai pembeli dan unduh berkasnya sendiri untuk memastikan yang terkirim benar.',
      ],
    };
  }

  function tptGuide(): GuideBody {
    const copy = copyFields('tpt');
    const photo = image('tpt');
    return {
      entry: 'TeachersPayTeachers.com → Sell on TPT → My Products → Add a New Product.',
      steps: [
        {
          title: 'Product basics',
          fields: [
            { kind: 'pick', label: 'Product type', value: 'Digital Download (PDF)', note: 'Bukan Easel Activity dan bukan bundle.' },
            { kind: 'title', label: 'Title', value: copy.title, note: 'Batas 100 karakter.' },
            {
              kind: 'body',
              label: 'Description',
              value: copy.body,
              note: 'Draf ini ditulis untuk guru yang sedang menyusun rencana sepekan, bukan untuk orang tua yang sedang belanja.',
            },
          ],
        },
        {
          title: 'Klasifikasi kurikulum',
          detail: 'Tiga kolom inilah yang dipakai filter pencarian TPT, jauh lebih sering daripada kata kunci.',
          fields: [
            { kind: 'pick', label: 'Grade levels', value: TPT_GRADES[config.content], note: 'Sesuaikan kalau paketmu dipakai kelas yang lebih tinggi.' },
            { kind: 'pick', label: 'Subjects', value: TPT_SUBJECTS[config.content], note: 'Maksimal tiga; pilih yang paling dekat dengan isi halaman.' },
            { kind: 'pick', label: 'Resource types', value: 'Worksheets, Printables, Activities, Centers', note: 'Boleh lebih dari satu.' },
            { kind: 'pick', label: 'Standards (CCSS)', value: 'Opsional', note: 'Lewati kalau produkmu bukan untuk kurikulum Amerika.' },
          ],
        },
        {
          title: 'File, halaman, dan pratinjau',
          fields: [
            { kind: 'asset', label: 'Upload files', value: fileLine, note: `${papersNote}${svgLine}` },
            {
              kind: 'text',
              label: 'Total pages',
              value: String(pageCount),
              note: 'Angka ini dihitung dari PDF yang barusan dibuat, termasuk sampul dan halaman ketentuan bila diaktifkan.',
            },
            ...photoFields('tpt', 'Product thumbnail'),
            { kind: 'pick', label: 'Pratinjau otomatis', value: 'Periksa setelah unggah', note: coverNote },
          ],
          tips: [
            'TPT membuat pratinjau dari berkas yang diunggah, jadi halaman pertama PDF ikut menjadi muka produk.',
          ],
        },
        {
          title: 'Harga dan lisensi',
          fields: [
            {
              kind: 'pick',
              label: 'Price',
              value: 'Tentukan sendiri',
              note: priceNote('Komisi TPT berbeda antara akun Basic dan Premium — cek dulu di halaman Account/Balance sebelum menetapkan harga.'),
            },
            {
              kind: 'pick',
              label: 'Additional licenses',
              value: 'Biarkan diskon lisensi tambahan menyala',
              note: 'Sekolah membeli lisensi per guru; diskon ini yang membuat satu sekolah membeli banyak lisensi sekaligus.',
            },
            { kind: 'tags', label: 'Keywords', value: copy.tags, note: 'Kata kunci pencarian TPT, ditulis seperti yang diketik guru.' },
          ],
        },
      ],
      checklist: [
        'Halaman ketentuan di dalam PDF sudah menyebut satu lisensi untuk satu guru — itu pertanyaan pertama sekolah.',
        'Cek pratinjau otomatisnya setelah diunggah: kalau yang muncul lembar latihan polos, nyalakan halaman sampul dan unggah ulang.',
        'Simpan sebagai draf, lalu terbitkan setelah pratinjaunya benar.',
      ],
    };
  }

  function gumroadGuide(): GuideBody {
    const copy = copyFields('gumroad');
    const photo = image('gumroad');
    const square =
      IMAGE_SPECS.find((spec) => spec.id === 'gumroad-thumb') ?? IMAGE_SPECS[0];
    return {
      entry: 'Gumroad.com → Products → New product. Draf yang sama bisa dipakai di Payhip, Lemon Squeezy, dan Karyakarsa.',
      steps: [
        {
          title: 'Product',
          fields: [
            { kind: 'pick', label: 'Type', value: 'Digital product', note: 'Bukan membership dan bukan preorder.' },
            { kind: 'title', label: 'Name', value: copy.title, note: 'Batas 100 karakter.' },
            {
              kind: 'text',
              label: 'URL / permalink',
              value: slug,
              note: 'Bagian akhir tautan jualanmu. Pakai kode yang sama dengan nama folder ZIP supaya mudah dilacak.',
            },
            {
              kind: 'pick',
              label: 'Price',
              value: 'Tentukan sendiri',
              note: priceNote('Gumroad juga mendukung "pay what you want" dengan harga minimum, yang berguna untuk produk pertama.'),
            },
          ],
        },
        {
          title: 'Cover & thumbnail',
          fields: [
            { kind: 'asset', label: 'Cover', value: photo.value, note: `${photo.note} Rasio 16:9 yang dipakai halaman produk Gumroad.` },
            { kind: 'asset', label: 'Thumbnail', value: `${square.label} — ${square.note}`, note: 'Kartu produk Gumroad memakai gambar persegi; kit ini menyediakannya terpisah, jadi tidak perlu memotong sampulnya sendiri.' },
          ],
        },
        {
          title: 'Description',
          fields: [
            {
              kind: 'body',
              label: 'Description',
              value: copy.body,
              note: 'Ditulis dalam markdown. Editor Gumroad berupa rich text, jadi setelah ditempel rapikan barisan "##" dengan tombol heading.',
            },
          ],
        },
        {
          title: 'Content',
          detail: 'Tab "Content" adalah yang diterima pembeli setelah bayar.',
          fields: [
            { kind: 'asset', label: 'Upload files', value: fileLine, note: `${papersNote}${svgLine}` },
            {
              kind: 'text',
              label: 'Call to action',
              value: 'I want this!',
              note: 'Tombol beli. Biarkan bawaan kecuali kamu punya kalimat yang lebih cocok.',
            },
          ],
          tips: ['Tambahkan satu paragraf ucapan terima kasih yang mengulang cara mencetak, supaya pembeli tidak perlu membuka berkas read-me dulu.'],
        },
        {
          title: 'Discover & settings',
          fields: [
            { kind: 'tags', label: 'Tags', value: copy.tags, note: 'Dipakai mesin pencari Gumroad Discover.' },
            { kind: 'pick', label: 'Category', value: 'Education (atau kategori Discover terdekat)', note: 'Menentukan di rak mana produkmu muncul.' },
            {
              kind: 'pick',
              label: 'Refund policy',
              value: 'Pilih kebijakan yang sanggup kamu jalankan',
              note: 'Produk digital umumnya tanpa refund, tapi kebijakannya harus kamu nyatakan sendiri di sini.',
            },
          ],
        },
      ],
      checklist: [
        'Buka tautan produknya di jendela penyamaran dan beli sendiri dengan kode diskon 100% untuk memastikan berkasnya benar.',
        'Salin tautan produk: itu yang dipakai pin Pinterest di tab sebelah.',
      ],
    };
  }

  function pinterestGuide(): GuideBody {
    const copy = copyFields('pinterest');
    const photo = image('pinterest');
    return {
      entry: 'Pinterest.com → Create → Create Pin. Ini bukan lapak: pin hanya bertugas mengirim orang ke listing-mu.',
      steps: [
        {
          title: 'Papan tujuan',
          fields: [
            {
              kind: 'pick',
              label: 'Board',
              value: 'Buat papan bertema, mis. "Printable Worksheets for Kids"',
              note: 'Papan bertema membantu Pinterest memahami isi pinmu; papan campur aduk tidak.',
            },
          ],
        },
        {
          title: 'Gambar pin',
          fields: [
            { kind: 'asset', label: 'Image', value: photo.value, note: `${photo.note} Rasio 2:3 adalah bentuk yang tidak dipotong di beranda Pinterest.` },
            {
              kind: 'text',
              label: 'Alt text',
              value: `Lembar kerja ${worksheets} halaman untuk anak, siap cetak ${paperLabel}`,
              note: 'Dibaca pembaca layar dan ikut dipakai Pinterest memahami gambar.',
            },
          ],
        },
        {
          title: 'Teks pin',
          fields: [
            { kind: 'title', label: 'Title', value: copy.title, note: 'Batas 100 karakter; yang terlihat di beranda hanya sekitar 40 karakter pertama.' },
            {
              kind: 'body',
              label: 'Description',
              value: copy.body,
              note: 'Batas 500 karakter, tagar sudah termasuk di dalamnya.',
            },
          ],
        },
        {
          title: 'Tautan tujuan',
          fields: [
            {
              kind: 'pick',
              label: 'Destination link',
              value: 'URL listing Etsy, Gumroad, Shopee, atau Tokopedia-mu',
              note: 'Pin tanpa tautan tidak menjual apa pun. Tempel tautan listing yang baru saja kamu terbitkan.',
            },
          ],
        },
      ],
      checklist: [
        'Sebarkan pin ke beberapa papan dalam beberapa hari, bukan sekaligus dalam satu jam.',
        'Buat 2–3 pin dengan gambar berbeda untuk satu produk yang sama; itu cara Pinterest dipakai, bukan pengulangan.',
        'Kalau kamu punya domain sendiri, klaim di Settings → Claimed accounts supaya pin memuat nama tokomu.',
      ],
    };
  }
}

/** The same guide as a text file, for the pack the seller downloads. */
export function guideToText(guide: UploadGuide): string {
  const lines: string[] = [
    `${guide.label.toUpperCase()} — LANGKAH TAMBAH PRODUK`,
    guide.entry,
    '',
    `KATA KUNCI UTAMA: ${guide.copy.focus}`,
    guide.copy.seo,
    '',
  ];

  guide.steps.forEach((step, index) => {
    lines.push(`${String(index + 1).padStart(2, '0')}. ${step.title.toUpperCase()}`);
    if (step.detail) lines.push(`    ${step.detail}`);
    for (const field of step.fields) {
      const value = field.value;
      if (field.kind === 'body' && value) {
        lines.push(`    ${field.label}:`);
        for (const line of value.split('\n')) lines.push(`      ${line}`);
      } else {
        lines.push(`    ${field.label}: ${value || '—'}`);
      }
      if (field.note) lines.push(`      → ${field.note}`);
    }
    for (const tip of step.tips ?? []) lines.push(`    ! ${tip}`);
    lines.push('');
  });

  lines.push('SEBELUM TERBIT');
  for (const item of guide.checklist) lines.push(`- ${item}`);
  lines.push('');

  lines.push('ATURAN LAPAK YANG MENGIKAT TEKS INI');
  for (const rule of guide.rules) lines.push(`- ${rule}`);
  lines.push('');

  // Only printed when there is something to print: a clean draft should not
  // hand the seller a heading to scroll past every time.
  if (guide.warnings.length) {
    lines.push('PERIKSA SEBELUM DITEMPEL');
    for (const warning of guide.warnings) lines.push(`- ${findingToText(warning)}`);
    lines.push('');
  }

  return lines.join('\n');
}
