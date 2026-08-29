import { buildListing, buyerReadme, copyToText } from './listing';
import { packSlug, productTitle } from './naming';
import { FONTS } from './presets';
import type { GeneratedImage } from './cover';
import type { GeneratedFile } from './pdf';
import type { Config } from './types';

/**
 * One ZIP that is the whole product: the printable files, the listing images,
 * the copy for each marketplace, and the paperwork a buyer expects to find.
 * Folder names are numbered so the order to work through them is obvious the
 * moment the archive is opened.
 */
export const BUNDLE_FOLDERS = {
  print: '01-FILE-CETAK',
  images: '02-GAMBAR-LISTING',
  copy: '03-TEKS-LISTING',
} as const;

export interface BundleInput {
  config: Config;
  characters: string[];
  files: GeneratedFile[];
  images: GeneratedImage[];
}

export interface Bundle {
  name: string;
  blob: Blob;
  size: number;
  /** Every path inside the archive, for the receipt shown after export. */
  entries: string[];
}

async function licenceText(config: Config): Promise<string | null> {
  try {
    const response = await fetch(FONTS[config.font].licenceFile);
    if (!response.ok) return null;
    return await response.text();
  } catch {
    // Offline, or the file was pruned from the deploy: the pack is still
    // valid without it, and the read-me still names the licence.
    return null;
  }
}

export async function buildBundle({
  config,
  characters,
  files,
  images,
}: BundleInput): Promise<Bundle> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  const stem = packSlug(config, characters);
  const root = zip.folder(stem);
  if (!root) throw new Error('Gagal menyiapkan arsip.');

  const pageCount = files[0]?.pages ?? characters.length;
  const listings = buildListing({ config, characters, pageCount });
  const entries: string[] = [];

  const printFolder = root.folder(BUNDLE_FOLDERS.print);
  for (const file of files) {
    printFolder?.file(file.name, file.bytes);
    entries.push(`${BUNDLE_FOLDERS.print}/${file.name}`);
  }

  if (images.length) {
    const imageFolder = root.folder(BUNDLE_FOLDERS.images);
    for (const image of images) {
      imageFolder?.file(image.name, image.bytes);
      entries.push(`${BUNDLE_FOLDERS.images}/${image.name}`);
    }
  }

  const copyFolder = root.folder(BUNDLE_FOLDERS.copy);
  for (const listing of listings) {
    const name = `${listing.market}.txt`;
    copyFolder?.file(name, copyToText(listing));
    entries.push(`${BUNDLE_FOLDERS.copy}/${name}`);
  }

  root.file('BACA-DULU.txt', buyerReadme({ config, characters, pageCount }));
  entries.push('BACA-DULU.txt');

  const licence = await licenceText(config);
  const family = FONTS[config.font].family;
  root.file(
    'LISENSI-FONT.txt',
    [
      `Huruf pada paket ini: ${family}`,
      'Lisensi: SIL Open Font License 1.1',
      '',
      'Lisensi ini mengizinkan penyematan font di dalam PDF serta penjualan',
      'berkas PDF yang dihasilkan. Teks lisensi lengkap disertakan di bawah.',
      '',
      licence ?? 'Teks lisensi lengkap: https://openfontlicense.org',
    ].join('\n'),
  );
  entries.push('LISENSI-FONT.txt');

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const title = productTitle(config, characters).id;
  return {
    name: `${stem}-marketplace-kit.zip`,
    blob,
    size: blob.size,
    entries: [...entries, `(${title})`].slice(0, entries.length),
  };
}
