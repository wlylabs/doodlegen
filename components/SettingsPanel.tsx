'use client';

import { useState } from 'react';
import { LayoutMark, PaperMark, StyleMark, ChevronIcon } from './diagrams';
import { useRipple } from './motion';
import { ChipRow, ChoiceGrid, Field, Note, NumberField, Section, TextArea, TextField, Toggle } from './ui';
import { clampNumber, unsupportedCharacters, wordList } from '@/lib/charset';
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
  FontId,
  LanguageId,
  GridId,
  InkId,
  LayoutId,
  LetterCase,
  LoadedFont,
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

const WORD_IDEAS: { label: string; words: string }[] = [
  { label: 'Keluarga', words: 'Ayah\nBunda\nAdik\nKakak\nNenek\nKakek' },
  { label: 'Warna', words: 'Merah\nBiru\nHijau\nKuning\nUngu\nJingga' },
  { label: 'Hewan', words: 'Kucing\nAnjing\nSapi\nAyam\nIkan\nBebek' },
  { label: 'Sight words', words: 'the\nand\nsee\nlike\ncan\ngo' },
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
            <div className="flex flex-wrap gap-2">
              {WORD_IDEAS.map((idea) => (
                <button
                  key={idea.label}
                  type="button"
                  data-active={config.words.trim() === idea.words}
                  className="chip"
                  onClick={(event) => {
                    ripple(event);
                    update({ words: idea.words });
                  }}
                >
                  {idea.label}
                </button>
              ))}
            </div>
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
            mengikuti pasarnya: Etsy, Gumroad, dan Pinterest dalam bahasa Inggris, Shopee dalam
            bahasa Indonesia.
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
