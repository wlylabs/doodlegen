import type { MarketSpec } from './presets';

/**
 * The listing rules each marketplace enforces on the words themselves, and a
 * check that reads a draft the way their scanner does.
 *
 * This file exists because of one screen: a seller pastes a description into
 * Shopee's Tambah Produk form and the field turns yellow — "Terdeteksi
 * mengandung produk yang dilarang atau dalam pengawasan", hold 1×24 hours for
 * review. Nothing in the pack was against any rule; three words in the copy
 * were. Shopee reads a listing with an automated scanner before a human ever
 * sees it, and the three things it reliably stops on are the three things a
 * generator can simply never write:
 *
 *   1. someone else's brand name — "bisa dibuka di Canva, Cricut, Illustrator"
 *      is a compatibility note to a seller and a trademark to a scanner, on
 *      Shopee's HAKI policy and on Etsy's trademark policy alike;
 *   2. anything that moves the buyer off the platform — a link, an email, a
 *      phone number, the name of a competing marketplace;
 *   3. the vocabulary of the digital goods that are actually restricted —
 *      accounts, subscriptions, vouchers, credit, activation codes.
 *
 * A printable PDF is none of those, so the fix is not to soften what the
 * product is: it is to stop borrowing the words of things it is not. What the
 * marketplace genuinely requires to be said — that no parcel is shipped, that
 * the file arrives inside the platform's own chat — is required here too, as
 * a duty rather than a prohibition, because a description that leaves it out
 * is the one that ends in a dispute.
 *
 * Sources, read before this file was written: Shopee's prohibited-product and
 * HAKI listing policies, its product-name/spam guidance, its list of
 * restricted digital goods and services; Tokopedia's moderation rules on
 * off-platform links and on descriptions matching the item; Etsy's trademark
 * policy on brand names in titles, tags and descriptions.
 */

export type PolicyField = 'title' | 'body' | 'tags';

/**
 * `block` is what a scanner stops on: the listing is held, hidden, or taken
 * down. `warn` is what a human reviewer or a buyer complaint turns into a
 * strike later. The generator is written to produce neither.
 */
export type PolicySeverity = 'block' | 'warn';

export type MarketId = MarketSpec['id'];

const ALL_MARKETS: MarketId[] = ['etsy', 'tpt', 'gumroad', 'shopee', 'tokopedia', 'pinterest'];
const INDONESIAN: MarketId[] = ['shopee', 'tokopedia'];

export interface PolicyRule {
  id: string;
  markets: MarketId[];
  fields: PolicyField[];
  severity: PolicySeverity;
  /** The rule in one line, in the words the seller has to act on. */
  says: string;
  /** What to write instead. */
  fix: string;
  /** Every offending fragment in one field's text, on one marketplace. */
  find(value: string, market: MarketId): string[];
}

export interface PolicyDuty {
  id: string;
  markets: MarketId[];
  says: string;
  fix: string;
  /** True when the description already carries what the rule requires. */
  met(body: string, market: MarketId): boolean;
}

export interface PolicyFinding {
  rule: string;
  market: MarketId;
  field: PolicyField;
  severity: PolicySeverity;
  /** The words that tripped it, or '' for a duty that was simply left out. */
  found: string;
  says: string;
  fix: string;
}

/** A word list as one case-insensitive matcher, whole words only. */
function words(list: string[]): RegExp {
  const escaped = list.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
}

function matches(value: string, pattern: RegExp): string[] {
  const found = value.match(new RegExp(pattern.source, pattern.flags)) ?? [];
  // The same brand named twice is one problem to fix, not two to read.
  return [...new Set(found.map((hit) => hit.trim()))];
}

/**
 * Brands a worksheet pack has an honest reason to mention and still must not:
 * design tools and cutting machines the SVGs open in, and the licensed
 * characters a children's product is forever tempted to borrow.
 */
const TRADEMARKS = words([
  'canva',
  'cricut',
  'figma',
  'illustrator',
  'adobe',
  'photoshop',
  'inkscape',
  'procreate',
  'coreldraw',
  'silhouette cameo',
  'microsoft word',
  'powerpoint',
  'google slides',
  'disney',
  'pixar',
  'marvel',
  'hello kitty',
  'sanrio',
  'barbie',
  'lego',
  'pokemon',
  'cocomelon',
  'upin ipin',
]);

/** Anything that reads as "finish this somewhere else". */
const OFF_PLATFORM = [
  /https?:\/\/\S+/gi,
  /\bwww\.[a-z0-9-]+\.[a-z]{2,}\b/gi,
  /\b[\w.%+-]+@[\w.-]+\.[a-z]{2,}\b/gi,
  // An Indonesian mobile number, written the way sellers write it.
  /\b(?:\+?62|0)8\d{2}[\s.-]?\d{3,4}[\s.-]?\d{3,5}\b/g,
  words(['whatsapp', 'wa', 'wa.me', 'telegram', 'line id', 'dm', 'inbox', 'chat pribadi']),
];

/** The marketplaces a listing must not send its reader to: every other one. */
const RIVALS: Record<MarketId, string[]> = {
  shopee: ['tokopedia', 'lazada', 'bukalapak', 'tiktok shop', 'blibli', 'etsy', 'gumroad'],
  tokopedia: ['shopee', 'lazada', 'bukalapak', 'tiktok shop', 'blibli', 'etsy', 'gumroad'],
  etsy: ['ebay', 'amazon', 'shopify', 'gumroad', 'shopee', 'tokopedia'],
  tpt: ['ebay', 'amazon', 'gumroad', 'etsy'],
  // Gumroad is the seller's own storefront and Pinterest is a signpost: both
  // are allowed to point at a shop, so neither carries a rival list.
  gumroad: [],
  pinterest: [],
};

/**
 * The digital goods Shopee actually restricts: instant access, instant
 * credit, anything redeemed or activated. A print-at-home PDF is none of
 * these, and a description that borrows their vocabulary gets filed with them.
 */
const RESTRICTED_DIGITAL = words([
  'akun premium',
  'akun netflix',
  'akun spotify',
  'langganan',
  'subscription',
  'voucher',
  'kode voucher',
  'top up',
  'topup',
  'kode redeem',
  'redeem code',
  'serial number',
  'kode aktivasi',
  'lisensi software',
  'license key',
  'crack',
  'mod apk',
  'aplikasi bajakan',
  'saldo',
  'pulsa',
  'diamond',
]);

/** Promotion shouted in the product name, which both lapak rank down. */
const PROMO_WORDS = words([
  'gratis',
  'free',
  'diskon',
  'promo',
  'murah',
  'termurah',
  'terlaris',
  'best seller',
  'bestseller',
  'terbaik',
  'sale',
  'cuci gudang',
  'cod',
  'ready stock',
  'flash sale',
  'viral',
  'limited',
  'terbatas',
  'grosir',
]);

/** Claims nobody can substantiate about a stack of worksheets. */
const OVERCLAIMS = words([
  'dijamin',
  'terjamin',
  'terbukti',
  'pasti bisa',
  'nomor 1',
  'no 1',
  'paling lengkap',
  'satu-satunya',
  'jenius',
  'guaranteed',
  'proven',
  'best in the world',
]);

export const POLICY_RULES: PolicyRule[] = [
  {
    id: 'merek-pihak-lain',
    markets: ALL_MARKETS,
    fields: ['title', 'body', 'tags'],
    severity: 'block',
    says: 'Nama merek pihak lain dihitung sebagai pelanggaran HAKI di judul, deskripsi, maupun tag — termasuk ketika hanya dipakai untuk menyebut kompatibilitas.',
    fix: 'Sebut kemampuannya, bukan mereknya: "berkas SVG yang terbuka di aplikasi desain vektor dan mesin potong".',
    find: (value) => matches(value, TRADEMARKS),
  },
  {
    id: 'kontak-di-luar',
    markets: ALL_MARKETS,
    fields: ['title', 'body', 'tags'],
    severity: 'block',
    says: 'Tautan, alamat email, nomor telepon, dan ajakan mengobrol di luar lapak dilarang di semua kolom listing.',
    fix: 'Hapus kontaknya. Semua tanya-jawab dan pengiriman berkas terjadi di chat lapak itu sendiri — itu juga satu-satunya bukti kalau ada sengketa.',
    find: (value) => OFF_PLATFORM.flatMap((pattern) => matches(value, pattern)),
  },
  {
    id: 'lapak-lain',
    markets: ALL_MARKETS,
    fields: ['title', 'body', 'tags'],
    severity: 'block',
    says: 'Menyebut marketplace lain di dalam listing dibaca sebagai ajakan bertransaksi di luar platform.',
    fix: 'Tulis "chat pesanan" atau nama lapak tempat listing ini terbit, bukan nama lapak sebelah.',
    find: (value, market) => (RIVALS[market].length ? matches(value, words(RIVALS[market])) : []),
  },
  {
    id: 'produk-digital-terbatas',
    markets: INDONESIAN,
    fields: ['title', 'body', 'tags'],
    severity: 'block',
    says: 'Produk digital berakses instan — akun, langganan, voucher, kredit, kode aktivasi — hanya boleh dijual penjual resmi. Kata-katanya saja sudah cukup membuat listing ditahan.',
    fix: 'Sebut apa adanya: berkas PDF siap cetak yang dikirim penjual lewat chat setelah pesanan dibayar.',
    find: (value) => matches(value, RESTRICTED_DIGITAL),
  },
  {
    id: 'kata-ebook',
    markets: INDONESIAN,
    fields: ['title', 'body', 'tags'],
    severity: 'warn',
    says: 'Kata "ebook" menempatkan produk di kategori digital yang hanya boleh dijual penjual resmi — di kategori buku, kata itulah yang paling sering menyeret listing ke peninjauan.',
    fix: 'Pakai kata yang dicari pembeli printable: "lembar kerja PDF", "printable", "siap cetak".',
    find: (value) => matches(value, words(['ebook', 'e-book', 'buku digital'])),
  },
  {
    id: 'kata-promosi',
    markets: INDONESIAN,
    fields: ['title'],
    severity: 'block',
    says: 'Nama produk tidak boleh memuat kata promosi atau klaim seperti "gratis", "diskon", "termurah", atau "best seller".',
    fix: 'Nama produk berisi merek, jenis produk, dan spesifikasi. Promosi ditaruh di fitur promo, bukan di namanya.',
    find: (value) => matches(value, PROMO_WORDS),
  },
  {
    id: 'simbol-berlebihan',
    markets: INDONESIAN,
    fields: ['title'],
    severity: 'warn',
    says: 'Emoji dan tanda baca beruntun di nama produk dihitung spam oleh mesin pencari Shopee.',
    fix: 'Pisahkan bagian nama dengan spasi, tanda hubung, atau "|" tunggal.',
    find: (value) => [
      ...matches(value, /[\u2190-\u2BFF\u{1F000}-\u{1FAFF}]/gu),
      ...matches(value, /[!?*#~]{2,}/g),
    ],
  },
  {
    id: 'klaim-berlebihan',
    markets: ALL_MARKETS,
    fields: ['title', 'body'],
    severity: 'warn',
    says: 'Klaim yang tidak bisa dibuktikan — "dijamin", "terbukti", "nomor 1" — melanggar aturan informasi produk di semua lapak di sini.',
    fix: 'Ganti dengan yang bisa dihitung: jumlah halaman, ukuran kertas, jenis garis, dan untuk usia berapa.',
    find: (value) => matches(value, OVERCLAIMS),
  },
];

export const POLICY_DUTIES: PolicyDuty[] = [
  {
    id: 'sebut-tanpa-barang-fisik',
    markets: INDONESIAN,
    says: 'Deskripsi harus menyatakan bahwa tidak ada barang fisik yang dikirim; kolom berat dan kurir tetap wajib diisi di kategori barang.',
    fix: 'Sisakan kalimat "produk digital, tidak ada barang fisik yang dikirim" di deskripsi, walau deskripsinya dipotong.',
    met: (body) => /tidak ada barang fisik/i.test(body),
  },
  {
    id: 'sebut-cara-kirim',
    markets: INDONESIAN,
    says: 'Cara berkas sampai ke pembeli harus disebut, dan jalannya harus chat lapak itu sendiri.',
    fix: 'Tulis bahwa PDF dikirim lewat chat pesanan setelah pembayaran dikonfirmasi.',
    met: (body) => /chat/i.test(body),
  },
  {
    id: 'sebut-lisensi',
    markets: ['etsy', 'tpt', 'gumroad'],
    says: 'A digital listing has to state what the buyer may do with the file: personal, classroom, and whether resale is allowed.',
    fix: 'Keep the TERMS / Licence block in the description.',
    met: (body) => /(terms|licen[cs]e)/i.test(body),
  },
];

/**
 * A link inside the file the buyer downloads is a different question from a
 * link in the listing, and every marketplace answers it differently:
 *
 *   TPT      is the strictest — resources may not link to another store or
 *            push buyers to a different sales channel; a link is allowed for
 *            hosting a file too large to upload, and little else
 *   Etsy     forbids fee avoidance: a link that invites the buyer to purchase
 *            outside Etsy is the one that costs a shop its account
 *   Shopee   both treat pulling a buyer off-platform as the offence, so a
 *   Tokopedia link to your own shop *on that lapak* is the safe one
 *   Gumroad  is the seller's own storefront; link where you like
 *   Pinterest is a signpost, not a shop
 *
 * So the studio prints whatever address the seller typed and says, per
 * marketplace, what that address is allowed to be.
 */
export const LINK_POLICY: Record<MarketId, string> = {
  etsy: 'Tautan di dalam berkas boleh mengarah ke halaman bantuan, cara mencetak, atau tokomu di Etsy. Mengajak pembeli membeli di luar Etsy termasuk fee avoidance dan berisiko menutup toko.',
  tpt: 'TPT paling ketat: berkas tidak boleh menautkan ke toko lain atau mengarahkan pembeli ke saluran penjualan lain. Kosongkan tautannya untuk edisi TPT, atau arahkan ke halaman petunjuk pemakaian saja.',
  gumroad: 'Gumroad adalah etalase milikmu sendiri — tautan bebas: halaman produk lain, daftar surel, atau situsmu.',
  shopee: 'Arahkan ke toko Shopee-mu sendiri atau ke halaman petunjuk cetak. Mengajak pembeli bertransaksi di luar Shopee adalah pelanggaran, dan berkas yang dilaporkan pembeli sampai juga ke Shopee.',
  tokopedia: 'Arahkan ke toko Tokopedia-mu sendiri atau ke halaman petunjuk cetak. Mengajak transaksi di luar Tokopedia melanggar aturan lapak.',
  pinterest: 'Pin memang bertugas mengirim orang ke tokomu, jadi tautan di berkasnya tidak menambah masalah apa pun.',
};

/** Marketplace domains, so "my own shop" can be told from "somebody else's". */
const MARKET_HOSTS: Record<MarketId, string[]> = {
  etsy: ['etsy.com'],
  tpt: ['teacherspayteachers.com'],
  gumroad: ['gumroad.com'],
  shopee: ['shopee.co.id', 'shopee.com'],
  tokopedia: ['tokopedia.com'],
  pinterest: ['pinterest.com'],
};

/** Places that sell the same kind of file, whichever lapak is being filled. */
const OTHER_SHOPS = [
  'lazada.',
  'bukalapak.',
  'blibli.',
  'tiktok.',
  'amazon.',
  'ebay.',
  'payhip.',
  'lemonsqueezy.',
  'karyakarsa.',
  'lynk.id',
  'shopify.',
];

/**
 * The address as it will be printed, or null when there is nothing safe to
 * print. Anything that is not plain http(s) is dropped rather than repaired:
 * a config travels in a shared link, and a `javascript:` URL that reaches a
 * PDF annotation or an `href` is an injection, not a typo.
 */
export function safeLinkUrl(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  // A seller types "tokoku.com/abc"; a browser would guess the scheme, and a
  // PDF reader would not, so the guess is made here instead.
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (!url.hostname.includes('.')) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** The address without its scheme: what a buyer would read, and retype. */
export function linkDisplay(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
}

/**
 * The seller's buyer-facing link, checked against the marketplace the pack is
 * being sold on. A link is normal and useful; these are the three shapes of
 * it that cost a shop its account.
 */
export function checkBuyerLink(raw: string, market: MarketId): PolicyFinding[] {
  const text = raw.trim();
  if (!text) return [];

  const finding = (
    rule: string,
    severity: PolicySeverity,
    says: string,
    fix: string,
  ): PolicyFinding => ({ rule, market, field: 'body', severity, found: text, says, fix });

  const url = safeLinkUrl(text);
  if (!url) {
    return [
      finding(
        'tautan-tidak-sah',
        'block',
        'Tautan untuk pembeli tidak bisa dibaca sebagai alamat http/https, jadi tidak akan dicetak di halaman lisensi.',
        'Tulis alamat lengkap, misalnya https://shopee.co.id/namatoko.',
      ),
    ];
  }

  const host = new URL(url).hostname.toLowerCase();
  const own = MARKET_HOSTS[market].some((domain) => host === domain || host.endsWith(`.${domain}`));
  const rival =
    !own &&
    (Object.entries(MARKET_HOSTS).some(
      ([id, domains]) =>
        id !== market && domains.some((domain) => host === domain || host.endsWith(`.${domain}`)),
    ) ||
      OTHER_SHOPS.some((domain) => host.includes(domain)));

  const findings: PolicyFinding[] = [];
  if (rival) {
    findings.push(
      finding(
        'tautan-lapak-lain',
        'block',
        `Tautan di dalam berkas mengarah ke ${host}, yaitu lapak lain — semua lapak di sini menghitungnya sebagai mengajak pembeli bertransaksi di luar platform.`,
        'Arahkan ke tokomu di lapak tempat berkas ini dijual, atau ke halaman petunjuk cetak yang tidak menjual apa pun.',
      ),
    );
  }
  if (market === 'tpt' && !own) {
    findings.push(
      finding(
        'tautan-tpt',
        'warn',
        LINK_POLICY.tpt,
        'Untuk edisi TPT, kosongkan kolom tautan sebelum membuat berkasnya, atau pakai halaman petunjuk yang tidak menjual apa pun.',
      ),
    );
  }
  return findings;
}

/** The rules that apply to one marketplace, as lines to show the seller. */
export function marketRules(market: MarketId): string[] {
  return [
    ...POLICY_RULES.filter((rule) => rule.markets.includes(market)).map((rule) => rule.says),
    ...POLICY_DUTIES.filter((duty) => duty.markets.includes(market)).map((duty) => duty.says),
  ];
}

export interface CheckedCopy {
  title: string;
  body: string;
  tags: string[];
}

/**
 * One draft read the way the marketplace's scanner reads it. Empty is the
 * expected answer: the generator's own words are written to pass. What it
 * catches in practice is what the seller typed — a shop name carrying a
 * brand, a tagline with a phone number in it, a product title shouting a
 * discount — before the marketplace catches it instead.
 */
export function checkListing(copy: CheckedCopy, market: MarketId): PolicyFinding[] {
  const fields: Record<PolicyField, string> = {
    title: copy.title,
    body: copy.body,
    tags: copy.tags.join(', '),
  };

  const findings: PolicyFinding[] = [];

  for (const rule of POLICY_RULES) {
    if (!rule.markets.includes(market)) continue;
    for (const field of rule.fields) {
      const hits = rule.find(fields[field], market);
      if (!hits.length) continue;
      findings.push({
        rule: rule.id,
        market,
        field,
        severity: rule.severity,
        found: hits.join(', '),
        says: rule.says,
        fix: rule.fix,
      });
    }
  }

  for (const duty of POLICY_DUTIES) {
    if (!duty.markets.includes(market)) continue;
    if (duty.met(copy.body, market)) continue;
    findings.push({
      rule: duty.id,
      market,
      field: 'body',
      severity: 'block',
      found: '',
      says: duty.says,
      fix: duty.fix,
    });
  }

  // Blocking first: it is the difference between a listing that is held and
  // one that merely reads badly.
  return findings.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'block' ? -1 : 1));
}

/** One finding as a line, for the text files and the terminal check. */
export function findingToText(finding: PolicyFinding): string {
  const where = { title: 'judul', body: 'deskripsi', tags: 'tag' }[finding.field];
  const what = finding.found ? `"${finding.found}" di ${where}` : `belum ada di ${where}`;
  return `${finding.severity === 'block' ? 'TAHAN' : 'PERIKSA'} — ${what}: ${finding.says} ${finding.fix}`;
}
