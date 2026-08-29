import type { Metadata } from 'next';
import { App } from '@/components/App';

export const metadata: Metadata = {
  title: 'Studio — susun halaman mewarnai & tracing',
  description:
    'Studio DoodleGen: pilih karakter, gaya garis, layout, dan ukuran kertas, lalu unduh PDF siap cetak beserta kit listing marketplace.',
};

export default function StudioPage() {
  return <App />;
}
