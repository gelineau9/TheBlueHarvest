import Image from "next/image"

export function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Overlay gradient for better text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-amber-900/40 via-amber-900/30 to-[#f5e6c8] z-[5]"></div>

      {/* Background image */}
      <Image
        src="/hero-image.jpeg"
        alt="Middle-earth landscape"
        fill
        className="object-cover object-[center_80%]"
        priority
      />

      {/* Optional: Add some decorative elements */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-[url('/placeholder.svg?height=50&width=1200')] bg-repeat-x bg-bottom opacity-60"></div>
    </div>
  )
}
