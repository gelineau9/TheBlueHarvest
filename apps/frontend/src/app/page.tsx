import { SpotlightCarousel } from '@/components/spotlight-carousel';
import { WritingCarousel } from '@/components/writing-carousel';
import { ArtCarousel } from '@/components/art-carousel';
import { FollowedFeed } from '@/components/follows/FollowedFeed';

export default function Home() {
  return (
    <div>
      <SpotlightCarousel />
      <div className="py-8">
        <FollowedFeed />
        <WritingCarousel />
        <ArtCarousel />
      </div>
    </div>
  );
}
