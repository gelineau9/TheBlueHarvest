import { HeroBackground } from '@/components/hero-background';
import { ProfileButton } from '@/components/profile-button';

/**
 * Banner — persistent site-wide hero displayed at the very top of every page.
 *
 * Intentionally kept as a Server Component wrapper; only the child
 * ProfileButton carries 'use client' and is already isolated.
 *
 * Accessibility: the element uses role="banner" (implicitly provided by <header>)
 * and the background image is given a meaningful alt text inside HeroBackground.
 */
export function Banner() {
  return (
    <header
      aria-label="Brandy Hall Archives site banner"
      className="relative w-full h-[220px] overflow-hidden shrink-0"
    >
      {/* Full-bleed hero background image + gradient overlay */}
      <HeroBackground />

      {/* ProfileButton — client component, floated to top-right */}
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ProfileButton />
      </div>

      {/* Centred title / subtitle */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center">
        <div className="mb-2 inline-block rounded-sm bg-amber-900/20 px-6 py-2 backdrop-blur-sm">
          <span className="font-fantasy text-3xl font-bold tracking-wide text-amber-50 drop-shadow-md sm:text-4xl md:text-5xl">
            Brandy Hall Archives
          </span>
        </div>
        <p className="rounded-sm bg-amber-900/20 px-4 py-1 text-base text-amber-50 drop-shadow-md backdrop-blur-sm sm:text-lg">
          Your RP Portal to Middle-earth
        </p>
      </div>
    </header>
  );
}
