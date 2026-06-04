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
      aria-label="The Brandy Hall Archives site banner"
      className="relative w-full shrink-0 mb-3 shadow-[0_4px_12px_rgba(0,0,0,0.25)] border-b border-amber-800/30 flex items-center justify-center py-6"
    >
      {/* Full-bleed hero background image + gradient overlay */}
      <HeroBackground />

      {/* ProfileButton — client component, floated to top-right */}
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6 hidden lg:block">
        <ProfileButton />
      </div>
    </header>
  );
}
