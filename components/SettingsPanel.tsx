'use client';

import { useState } from 'react';
import { LayoutMark, PaperMark, StyleMark, ChevronIcon } from './diagrams';
import { ChipRow, ChoiceGrid, Field, NumberField, Section, TextField, Toggle } from './ui';
import { clampNumber } from '@/lib/charset';
import {
  FONTS,
  FONT_ORDER,
  GRIDS,
  GRID_ORDER,
  INKS,
  LAYOUTS,
  MARGIN_OPTIONS,
  STROKES,
  STROKE_ORDER,
  STYLES,
} from '@/lib/presets';
import type {
  Config,
  FontId,
  GridId,
  InkId,
  LayoutId,
  LetterCase,
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

export function SettingsPanel({
  config,
  update,
}: {
  config: Config;
  update: (patch: Partial<Config>) => void;
}) {
  const [tuningOpen, setTuningOpen] = useState(false);

  return (
    <div className="pb-2">
      <Section step="01" title="Jenis Konten" hint="Rangkaian karakter yang jadi isi setiap halaman.">
        <ChipRow
          label="Jenis konten"
          value={config.content}
          onChange={(content) => update({ content })}
          options={[
            { value: 'letters', label: 'Alfabet' },
            { value: 'numbers', label: 'Angka' },
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
        ) : (
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
                    onClick={() => update({ numberFrom: preset.from, numberTo: preset.to })}
                  >
                    {preset.label}
                  </button>
                );
              })}
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
            onChange={(font) => update({ font })}
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
          <p className="text-[12px] leading-snug text-ink-mute">
            Batas bawah 0.5 inci dari tepi potong, sesuai syarat cetak.
          </p>
        </Field>
      </Section>

      <section className="border-t border-line">
        <button
          type="button"
          onClick={() => setTuningOpen((open) => !open)}
          aria-expanded={tuningOpen}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <span className="text-[14px] font-semibold tracking-tight">Penyesuaian</span>
          <span
            className={`text-ink-mute transition-transform duration-200 ${tuningOpen ? 'rotate-180' : ''}`}
          >
            <ChevronIcon direction="down" />
          </span>
        </button>
        {tuningOpen ? (
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
              <p className="text-[12px] leading-snug text-ink-mute">{INKS[config.ink].note}</p>
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
              <TextField
                label="Teks judul"
                value={config.titleTemplate}
                placeholder="Trace and color — {char}"
                onChange={(titleTemplate) => update({ titleTemplate })}
              />
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
