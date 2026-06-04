import Image from 'next/image';

export function HeroBackground() {
  return (
    <Image
      src="/BHAalpha.png"
      alt="The Brandy Hall Archives"
      width={2494}
      height={964}
      className="w-4/5 sm:w-3/5 h-auto block"
      style={{ maxWidth: '800px' }}
      priority
    />
  );
}
