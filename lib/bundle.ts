import { planDocument } from './geometry';
import { buildListing, buyerReadme, copyToText, licenceNote, packFileNames } from './listing';
import { packSlug, printedTitle } from './naming';
import { buildUploadGuides, guideToText } from './upload';
import { FONTS, papersFor } from './presets';
import { svgFilesFor } from './svgdoc';
import type { GeneratedImage } from './cover';
import type { GeneratedFile } from './pdf';
import type { Config, LoadedFont } from './types';

/**
 * One ZIP that is the whole product: the printable files, the listing images,
 * the copy for each marketplace, and the paperwork a buyer expects to find.
 * Folder names are numbered so the order to work through them is obvious the
 * moment the archive is opened.
 */
export const BUNDLE_FOLDERS: Record<
  Config['language'],
  Record<'print' | 'images' | 'copy' | 'steps' | 'svg', string>
> = {
  en: {
    print: '01-PRINT-FILES',
    images: '02-LISTING-IMAGES',
    copy: '03-LISTING-COPY',
    steps: '04-UPLOAD-STEPS',
    svg: '05-SVG-EDITABLE',
  },
  id: {
    print: '01-FILE-CETAK',
    images: '02-GAMBAR-LISTING',
    copy: '03-TEKS-LISTING',
    steps: '04-LANGKAH-UNGGAH',
    svg: '05-SVG-BISA-DIEDIT',
  },
};

export interface BundleInput {
  config: Config;
  characters: string[];
  files: GeneratedFile[];
  images: GeneratedImage[];
  /** Needed to draw the editable SVGs, which are laid out here, not in the UI. */
  font: LoadedFont;
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
  font,
}: BundleInput): Promise<Bundle> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  const stem = packSlug(config, characters);
  const root = zip.folder(stem);
  if (!root) throw new Error('Gagal menyiapkan arsip.');

  const pageCount = files[0]?.pages ?? characters.length;
  const listings = buildListing({ config, characters, pageCount });
  const folders = BUNDLE_FOLDERS[config.language];
  const names = packFileNames(config);
  const entries: string[] = [];

  const printFolder = root.folder(folders.print);
  for (const file of files) {
    printFolder?.file(file.name, file.bytes);
    entries.push(`${folders.print}/${file.name}`);
  }

  if (images.length) {
    const imageFolder = root.folder(folders.images);
    for (const image of images) {
      imageFolder?.file(image.name, image.bytes);
      entries.push(`${folders.images}/${image.name}`);
    }
  }

  // Editable vectors: the route into Canva, Figma, Illustrator and Cricut,
  // and a second thing to sell on the same listing.
  if (config.svgFiles) {
    const paper = papersFor(config.paper)[0];
    const plans = planDocument({ font, config, paper, characters });
    const svgFolder = root.folder(folders.svg);
    for (const file of svgFilesFor(font, plans, config, characters)) {
      svgFolder?.file(file.name, file.content);
      entries.push(`${folders.svg}/${file.name}`);
    }
  }

  const copyFolder = root.folder(folders.copy);
  for (const listing of listings) {
    const name = `${listing.market}.txt`;
    copyFolder?.file(name, copyToText(listing));
    entries.push(`${folders.copy}/${name}`);
  }

  // The copy is what to paste; this is where to paste it. One file per
  // channel, walking that channel's own add-product form field by field, so
  // the pack can be listed from a phone with the ZIP open beside the app.
  const stepsFolder = root.folder(folders.steps);
  for (const guide of buildUploadGuides({ config, characters, pageCount })) {
    const name = `${guide.market}.txt`;
    stepsFolder?.file(name, guideToText(guide));
    entries.push(`${folders.steps}/${name}`);
  }

  // The read-me and the licence travel with the PDFs to the buyer, so they
  // are written in the pack's language, not the seller's.
  root.file(names.readme, buyerReadme({ config, characters, pageCount }));
  entries.push(names.readme);

  const licence = await licenceText(config);
  root.file(names.licence, licenceNote(config, FONTS[config.font].family, licence));
  entries.push(names.licence);

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const title = printedTitle(config, characters);
  return {
    name: `${stem}-marketplace-kit.zip`,
    blob,
    size: blob.size,
    entries: [...entries, `(${title})`].slice(0, entries.length),
  };
}
