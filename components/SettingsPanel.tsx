'use client';

import { useState } from 'react';
import { CoverMark, LayoutMark, PaperMark, StyleMark, ChevronIcon } from './diagrams';
import { useRipple } from './motion';
import { ChipRow, ChoiceGrid, Field, Note, NumberField, Section, TextArea, TextField, Toggle } from './ui';
import { clampNumber, unsupportedCharacters, wordList } from '@/lib/charset';
import { COLOURFUL_STYLES, COVER_STYLES, COVER_STYLE_ORDER } from '@/lib/covers';
import { PALETTES, PALETTE_ORDER, swatches } from '@/lib/palette';
import { WORD_LISTS, listToText } from '@/lib/wordlists';
import {
  FONTS,
  FONT_ORDER,
  GRIDS,
  GRID_ORDER,
  INKS,
  LANGUAGES,
  LAYOUTS,
  MARGIN_OPTIONS,
  STARTER_PRESETS,
  STROKES,
  STROKE_ORDER,
  STYLES,
  TITLE_TEMPLATES,
} from '@/lib/presets';
import type {
  Config,
  ContentType,
  CoverStyleId,
  FontId,
  LanguageId,
  GridId,
  InkId,
  LayoutId,
  LetterCase,
  LoadedFont,
  PaletteId,
  PaperChoice,
  StrokeId,
  StyleId,
} from '@/lib/types';

const NUMBER_PRESETS: { label: string; from: number; to: number }[] = [
  { label: '1–10', from: 1, to: 10 },
  { label: '1–20', from: 1, to: 20 },
  { label: '1–50', from: 1, to: 50 },
  { label: '1–100', from: 1, to: 100 },
];



/** The starter packs, offered before any decision has to be made. */
export function PresetRail({
  activeId,
  onApply,
}: {
  activeId: string | null;
  onApply: (id: string) => void;
}) {
  const ripple = useRipple<HTMLButtonElement>();
  return (
    <div className="border-b border-line bg-accent-soft/40 px-5 py-4">
      <p className="field-label">Mulai cepat</p>
      <div className="mt-2.5 grid gap-2">
        {STARTER_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            data-active={preset.id === activeId}
            className="choice !py-2.5"
            onClick={(event) => {
              ripple(event);
              onApply(preset.id);
            }}
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-[14px] font-semibold leading-tight">{preset.label}</span>
              <span className="shrink-0 text-[11px] font-medium text-accent">{preset.market}</span>
            </span>
            <span className="text-[12px] leading-snug text-ink-mute">{preset.note}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function SettingsPanel({
  config,
  font,
  update,
}: {
  config: Config;
  font: LoadedFont | null;
  update: (patch: Partial<Config>) => void;
}) {
  const [tuningOpen, setTuningOpen] = useState(false);
  const ripple = useRipple<HTMLButtonElement>();

  const missing = font ? unsupportedCharacters(font, config.titleTemplate) : [];
  const words = wordList(config.words);

  return (
    <div className="pb-2">
      <Section step="01" title="Jenis Konten" hint="Rangkaian karakter yang jadi isi setiap halaman.">
        <ChipRow<ContentType>
          label="Jenis konten"
          value={config.content}
          onChange={(content) => update({ content })}
          options={[
            { value: 'letters', label: 'Alfabet' },
            { value: 'numbers', label: 'Angka' },
            { value: 'words', label: 'Kata & Nama' },
          ]}
        />

        {config.content === 'letters' ? (
          <Field label="Bentuk huruf">
            <ChipRow<LetterCase>
              label="Bentuk huruf"
              value={config.letterCase}
              onChange={(letterCase) => update({ letterCase })}
              options={[
                { value: 'upper', label: 'Huruf besar' },
                { value: 'lower', label: 'Huruf kecil' },
                { value: 'both', label: 'Kombinasi' },
              ]}
            />
          </Field>
        ) : config.content === 'numbers' ? (
          <div className="space-y-3">
            <div className="flex gap-3">
              <NumberField
                label="Dari"
                value={config.numberFrom}
                min={0}
                max={999}
                onChange={(numberFrom) => update({ numberFrom: clampNumber(numberFrom) })}
              />
              <NumberField
                label="Sampai"
                value={config.numberTo}
                min={0}
                max={999}
                onChange={(numberTo) => update({ numberTo: clampNumber(numberTo) })}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {NUMBER_PRESETS.map((preset) => {
                const active = config.numberFrom === preset.from && config.numberTo === preset.to;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    data-active={active}
                    className="chip"
                    onClick={(event) => {
                      ripple(event);
                      update({ numberFrom: preset.from, numberTo: preset.to });
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <TextArea
              label="Daftar kata"
              value={config.words}
              rows={6}
              placeholder={'Ayah\nBunda\nAdik'}
              hint={`Satu kata per baris atau dipisah koma. ${words.length} halaman akan dibuat.`}
              onChange={(value) => update({ words: value })}
            />
            {(['id', 'en'] as const).map((language) => (
              <Field
                key={language}
                label={language === 'id' ? 'Daftar siap pakai — Indonesia' : 'Daftar siap pakai — English'}
              >
                <div className="flex flex-wrap gap-2">
                  {WORD_LISTS.filter((list) => list.language === language).map((list) => {
                    const text = listToText(list);
                    return (
                      <button
                        key={list.id}
                        type="button"
                        title={list.note}
                        data-active={config.words.trim() === text}
                        className="chip"
                        onClick={(event) => {
                          ripple(event);
                          update({ words: text });
                        }}
                      >
                        {list.label}
                        <span className="ml-1 text-ink-mute">{list.words.length}</span>
                      </button>
                    );
                  })}
                </div>
              </Field>
            ))}
          </div>
        )}
      </Section>

      <Section step="02" title="Gaya Huruf" hint="Perlakuan garis dan bentuk huruf yang dipakai.">
        <ChoiceGrid<StyleId>
          label="Gaya garis"
          value={config.style}
          onChange={(style) => update({ style })}
          options={STYLES.map((item) => ({
            value: item.id,
            label: item.label,
            note: item.note,
            art: <StyleMark kind={item.id} />,
          }))}
        />
        <Field label="Preset font">
          <ChoiceGrid<FontId>
            label="Preset font"
            columns={2}
            value={config.font}
            onChange={(value) => update({ font: value })}
            options={FONT_ORDER.map((id) => ({
              value: id,
              label: FONTS[id].label,
              note: FONTS[id].note,
            }))}
          />
        </Field>
      </Section>

      <Section step="03" title="Layout Halaman" hint="Susunan karakter di dalam satu halaman.">
        <ChoiceGrid<LayoutId>
          label="Layout"
          value={config.layout}
          onChange={(layout) => update({ layout })}
          options={LAYOUTS.map((item) => ({
            value: item.id,
            label: item.label,
            note: item.note,
            art: <LayoutMark kind={item.id} />,
          }))}
        />
        {config.layout === 'grid' ? (
          <Field label="Kerapatan kisi">
            <ChipRow<GridId>
              label="Kerapatan kisi"
              value={config.grid}
              onChange={(grid) => update({ grid })}
              options={GRID_ORDER.map((id) => ({ value: id, label: GRIDS[id].label }))}
            />
          </Field>
        ) : null}
      </Section>

      <Section step="04" title="Ukuran Kertas" hint="Pilih keduanya untuk dapat dua berkas sekaligus.">
        <ChoiceGrid<PaperChoice>
          label="Ukuran kertas"
          columns={3}
          value={config.paper}
          onChange={(paper) => update({ paper })}
          options={[
            { value: 'a4', label: 'A4', note: '210 × 297 mm', art: <PaperMark kind="a4" /> },
            { value: 'letter', label: 'Letter', note: '8.5 × 11 in', art: <PaperMark kind="letter" /> },
            { value: 'both', label: 'Keduanya', note: 'Dua berkas', art: <PaperMark kind="both" /> },
          ]}
        />
        <Field label="Margin aman">
          <ChipRow
            label="Margin aman"
            value={String(config.marginIn)}
            onChange={(value) => update({ marginIn: Number(value) })}
            options={MARGIN_OPTIONS.map((value) => ({
              value: String(value),
              label: `${value}"`,
            }))}
          />
          <Note>Batas bawah 0.5 inci dari tepi potong, sesuai syarat cetak.</Note>
        </Field>
      </Section>

      <Section
        step="05"
        title="Merek & Paket"
        hint="Bagian yang membuat berkas terlihat seperti produk, bukan draf."
      >
        <Field label="Bahasa berkas">
          <ChipRow<LanguageId>
            label="Bahasa berkas"
            value={config.language}
            onChange={(language) => {
              // Swapping the language should carry the page title with it,
              // but never overwrite wording the seller typed themselves.
              const other = TITLE_TEMPLATES[config.language];
              const patch: Partial<Config> = { language };
              if (config.titleTemplate.trim() === other) patch.titleTemplate = TITLE_TEMPLATES[language];
              update(patch);
            }}
            options={LANGUAGES.map((item) => ({ value: item.id, label: item.label }))}
          />
          <Note>
            Sampul, halaman lisensi, kaki halaman, dan panduan cetak untuk pembeli —{' '}
            {LANGUAGES.find((item) => item.id === config.language)?.note}. Gambar listing selalu
            mengikuti pasarnya: Etsy, TPT, Gumroad, dan Pinterest dalam bahasa Inggris,
            Shopee/Tokopedia dalam bahasa Indonesia.
          </Note>
        </Field>
        <TextField
          label="Nama toko / merek"
          value={config.brand}
          maxLength={40}
          placeholder="Studio Cerdas"
          onChange={(brand) => update({ brand })}
        />
        <TextField
          label="Judul produk"
          value={config.productTitle}
          maxLength={80}
          placeholder="Kosongkan untuk judul otomatis"
          onChange={(productTitle) => update({ productTitle })}
        />
        <Toggle
          label="Halaman sampul"
          hint="Judul, merek, dan contoh halaman di depan berkas."
          checked={config.coverPage}
          onChange={(coverPage) => update({ coverPage })}
        />
        <Field label="Model sampul">
          {/* Ten compositions in one list is a wall. Split at the line a
              seller actually shops along: the loud ones and the plain ones. */}
          <p className="mb-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-ink-mute">
            Warna-warni
          </p>
          <ChoiceGrid<CoverStyleId>
            label="Model sampul warna-warni"
            columns={2}
            value={config.coverStyle}
            onChange={(coverStyle) => update({ coverStyle })}
            options={COLOURFUL_STYLES.map((id) => ({
              value: id,
              label: COVER_STYLES[id].label,
              note: COVER_STYLES[id].note,
              art: <CoverMark kind={COVER_STYLES[id].page} />,
            }))}
          />
          <p className="mb-1.5 mt-3 text-[11.5px] font-semibold uppercase tracking-wide text-ink-mute">
            Sederhana
          </p>
          <ChoiceGrid<CoverStyleId>
            label="Model sampul sederhana"
            columns={2}
            value={config.coverStyle}
            onChange={(coverStyle) => update({ coverStyle })}
            options={COVER_STYLE_ORDER.filter((id) => !COLOURFUL_STYLES.includes(id)).map((id) => ({
              value: id,
              label: COVER_STYLES[id].label,
              note: COVER_STYLES[id].note,
              art: <CoverMark kind={COVER_STYLES[id].page} />,
            }))}
          />
          <Note>
            Dipakai halaman sampul sekaligus gambar listing: susunan lembar di sampul Etsy, TPT,
            Gumroad, Shopee, dan Pinterest mengikuti pilihan yang sama. Model warna-warni memakai
            judul pelangi dan latar penuh warna dari palet di bawah — kecuali palet Hitam Putih,
            yang menggambarnya sebagai garis saja agar tetap satu plat tinta.
          </Note>
        </Field>
        <Field label="Palet warna">
          <div role="radiogroup" aria-label="Palet warna" className="grid grid-cols-2 gap-2">
            {PALETTE_ORDER.map((id) => {
              const palette = PALETTES[id];
              const active = id === config.palette;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  data-active={active}
                  className="choice !py-2.5"
                  onClick={(event) => {
                    ripple(event);
                    update({ palette: id as PaletteId });
                  }}
                >
                  <span className="flex gap-1" aria-hidden="true">
                    {swatches(id).map((color, index) => (
                      <span
                        key={index}
                        className="h-4 w-4 rounded-full border border-black/5 transition-transform duration-200"
                        style={{ background: color, transitionDelay: `${index * 40}ms` }}
                      />
                    ))}
                  </span>
                  <span className="mt-1 text-[13.5px] font-semibold leading-tight">{palette.label}</span>
                  <span className="text-[11.5px] leading-snug text-ink-mute">{palette.note}</span>
                </button>
              );
            })}
          </div>
          <Note>
            Warna hanya dipakai pada halaman sampul dan gambar listing. Semua lembar latihan tetap
            hitam K100 — satu plat cetak, bersih saat difotokopi, hemat tinta.
          </Note>
        </Field>
        <Toggle
          label="Halaman lisensi"
          hint="Ketentuan pemakaian dua bahasa di halaman terakhir."
          checked={config.termsPage}
          onChange={(termsPage) => update({ termsPage })}
        />
        <Toggle
          label="Nomor halaman"
          hint="Nomor dan nama merek di kaki setiap lembar latihan."
          checked={config.pageNumbers}
          onChange={(pageNumbers) => update({ pageNumbers })}
        />
        <Toggle
          label="Berkas SVG"
          hint="Satu SVG per halaman di dalam ZIP — bisa dibuka di Canva, Figma, Illustrator, dan Cricut."
          checked={config.svgFiles}
          onChange={(svgFiles) => update({ svgFiles })}
        />
      </Section>

      <section className="border-t border-line">
        <button
          type="button"
          onClick={(event) => {
            ripple(event);
            setTuningOpen((open) => !open);
          }}
          aria-expanded={tuningOpen}
          className="ripple-host press flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <span className="text-[14px] font-semibold tracking-tight">Penyesuaian</span>
          <span
            className={`text-ink-mute transition-transform duration-300 ${tuningOpen ? 'rotate-180' : ''}`}
          >
            <ChevronIcon direction="down" />
          </span>
        </button>
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
            tuningOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="space-y-4 px-5 pb-6">
              <Field label="Ketebalan garis">
                <ChipRow<StrokeId>
                  label="Ketebalan garis"
                  value={config.stroke}
                  onChange={(stroke) => update({ stroke })}
                  options={STROKE_ORDER.map((id) => ({ value: id, label: STROKES[id].label }))}
                />
              </Field>
              <Field label="Warna garis">
                <ChipRow<InkId>
                  label="Warna garis"
                  value={config.ink}
                  onChange={(ink) => update({ ink })}
                  options={(Object.keys(INKS) as InkId[]).map((id) => ({
                    value: id,
                    label: INKS[id].label,
                  }))}
                />
                <Note>{INKS[config.ink].note}</Note>
              </Field>
              <Toggle
                label="Garis bantu"
                hint="Garis dasar dan garis tengah pada baris latihan."
                checked={config.guides}
                onChange={(guides) => update({ guides })}
              />
              <Toggle
                label="Judul halaman"
                hint="Baris teks kecil di atas area gambar."
                checked={config.showTitle}
                onChange={(showTitle) => update({ showTitle })}
              />
              {config.showTitle ? (
                <div className="space-y-2">
                  <TextField
                    label="Teks judul"
                    value={config.titleTemplate}
                    placeholder={TITLE_TEMPLATES[config.language]}
                    onChange={(titleTemplate) => update({ titleTemplate })}
                  />
                  <Note>{'{char}'} diganti dengan karakter halaman itu.</Note>
                  {missing.length ? (
                    <Note tone="warn">
                      Font ini tidak punya karakter {missing.map((item) => `"${item}"`).join(' ')} —
                      karakter itu tidak akan ikut tercetak.
                    </Note>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
