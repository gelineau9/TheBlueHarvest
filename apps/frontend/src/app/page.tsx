import { WritingCarousel } from '@/components/writing-carousel';
import { ArtCarousel } from '@/components/art-carousel';

export default function Home() {
  return (
    <div className="py-8">
      <WritingCarousel />
      <ArtCarousel />
    </div>
  );
}
