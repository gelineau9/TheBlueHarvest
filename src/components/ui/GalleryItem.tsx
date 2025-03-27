import Image from "next/image";

export function GalleryItem({ imageSrc, title }: { imageSrc: string; title: string }) {
    return (
      <div className="group relative overflow-hidden rounded-lg">
        <div className="aspect-square w-full overflow-hidden rounded-lg border border-amber-800/20">
          <Image
            src={imageSrc || "/placeholder.svg"}
            alt={title}
            width={300}
            height={300}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
        <div className="absolute inset-0 flex items-end bg-gradient-to-t from-amber-900/70 to-transparent p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <h3 className="font-medium text-amber-50">{title}</h3>
        </div>
      </div>
    )
  }
