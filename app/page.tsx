import { Hero } from '@/components/landing/Hero';
import { Nav } from '@/components/landing/Nav';
import {
  Cta,
  Faq,
  Features,
  Footer,
  KitShowcase,
  Marquee,
  Presets,
  Standards,
  Stats,
  Steps,
} from '@/components/landing/Sections';

export default function Page() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Marquee />
        <Stats />
        <Features />
        <Standards />
        <Steps />
        <KitShowcase />
        <Presets />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
