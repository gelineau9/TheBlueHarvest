import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"

interface FeaturedCardProps {
  title: string
  subtitle: string
  imageSrc: string
}

export function FeaturedCard({ title, subtitle, imageSrc }: FeaturedCardProps) {
  return (
    <Card className="overflow-hidden border-amber-800/20 bg-amber-50/90 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-48">
        <Image
          src={imageSrc || "/placeholder.svg"}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-amber-900/60 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
      </div>
      <CardContent className="p-4">
        <h3 className="font-fantasy text-lg font-semibold text-amber-900">{title}</h3>
        <p className="text-sm text-amber-700">{subtitle}</p>
      </CardContent>
    </Card>
  )
}
