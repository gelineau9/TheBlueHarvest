import Image from 'next/image';

export function HeroBackground() {
  return (
    <div className="w-full h-full">
      <Image
        src="/BHA_Alpha_Logo_Resized.png"
        alt="The Brandy Hall Archives"
        width={1387}
        height={304}
        className="w-full h-full object-contain block"
        priority
      />
    </div>
  );
}
