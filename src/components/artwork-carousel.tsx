"use client"

import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"

const artworks = [
  { id: 1, title: "Elven Forest", imageSrc: "/placeholder.svg?height=400&width=600" },
  { id: 2, title: "Minas Tirith", imageSrc: "/placeholder.svg?height=400&width=600" },
  { id: 3, title: "Hobbiton", imageSrc: "/placeholder.svg?height=400&width=600" },
  { id: 4, title: "Mordor", imageSrc: "/placeholder.svg?height=400&width=600" },
  { id: 5, title: "Lothlorien", imageSrc: "/placeholder.svg?height=400&width=600" },
  { id: 6, title: "Rohan", imageSrc: "/placeholder.svg?height=400&width=600" },
  { id: 7, title: "Gondor", imageSrc: "/placeholder.svg?height=400&width=600" },
  { id: 8, title: "Shire", imageSrc: "/placeholder.svg?height=400&width=600" },
]

export function ArtworkCarousel() {
  return (
    <Carousel className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-fantasy text-2xl font-semibold text-amber-900">Recent Artwork</h2>
      </div>
      <CarouselContent>
        {artworks.map((artwork) => (
          <CarouselItem key={artwork.id} className="md:basis-1/2 lg:basis-1/3">
            <div className="p-1">
              <Card className="overflow-hidden border-amber-800/20 bg-amber-50/50">
                <CardContent className="p-0">
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    <Image
                      src={artwork.imageSrc || "/placeholder.svg"}
                      alt={artwork.title}
                      fill
                      className="object-cover transition-transform duration-300 hover:scale-105"
                    />
                    <div className="absolute inset-0 flex items-end bg-gradient-to-t from-amber-900/70 to-transparent p-4">
                      <h3 className="font-medium text-amber-50">{artwork.title}</h3>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className="mt-4 flex justify-center gap-2">
        <CarouselPrevious className="relative inset-0 h-8 w-8 translate-y-0 border-amber-800/30 bg-amber-50/80 text-amber-900 hover:bg-amber-100" />
        <CarouselNext className="relative inset-0 h-8 w-8 translate-y-0 border-amber-800/30 bg-amber-50/80 text-amber-900 hover:bg-amber-100" />
      </div>
    </Carousel>
  )
}
