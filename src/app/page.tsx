import Image from "next/image"
import { Calendar, Menu, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { LeftSidebar } from "@/components/left-side-bar"
import { RightSidebar } from "@/components/right-sidebar"
import { featuredCards } from "@/data/featured-cards"
import { ProfileButton } from "@/components/profile-button"
import { FeaturedCard } from "@/components/featured-card"
import { ArtworkCarousel } from "@/components/artwork-carousel"
import { HeroBackground } from "@/components/hero-background"

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f5e6c8] font-serif text-[#3a2921]">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-amber-800/20 bg-[#f5e6c8] p-4 lg:hidden">
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="border-amber-800/30">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] bg-[#f5e6c8] p-0">
              <LeftSidebar />
            </SheetContent>
          </Sheet>
          <Image
            src="/placeholder.svg?height=40&width=180"
            alt="Brandy Hall Archives"
            width={180}
            height={40}
            className="h-10 w-auto"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="border-amber-800/30">
            <Search className="h-5 w-5" />
            <span className="sr-only">Search</span>
          </Button>
          <ProfileButton />
        </div>
      </header>

      <div className="mx-auto flex max-w-[1600px] flex-col lg:flex-row">
        {/* Left Sidebar - Navigation */}
        <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 overflow-y-auto border-r border-amber-800/20 bg-[#f5e6c8] p-4 lg:block">
          <LeftSidebar />
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {/* Hero section takes full width */}
          <div className="relative mb-16">
            {/* Desktop Profile Button - Positioned on top of hero image */}
            <div className="absolute right-6 top-6 z-10 hidden lg:block">
              <ProfileButton />
            </div>
            <div className="relative h-[350px] overflow-hidden shadow-xl">
              <HeroBackground />
              {/* Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                <div className="mb-2 inline-block rounded-sm bg-amber-900/20 px-6 py-2 backdrop-blur-sm">
                  <h1 className="font-fantasy text-4xl font-bold tracking-wide text-amber-50 drop-shadow-md md:text-5xl">
                    Brandy Hall Archives
                  </h1>
                </div>
                <p className="rounded-sm bg-amber-900/20 px-4 py-1 text-lg text-amber-50 drop-shadow-md backdrop-blur-sm">
                  Your RP Portal to Middle-earth
                </p>
              </div>
            </div>


            {/* Featured Cards - Positioned to overlap the hero background */}
            <div className="relative mx-auto -mt-20 grid max-w-5xl gap-4 px-4 sm:grid-cols-2 lg:grid-cols-3 z-10">
              {featuredCards.map((card) => (
                <FeaturedCard key={card.id} title={card.title} subtitle={card.subtitle} imageSrc={card.imageSrc} />
              ))}
            </div>
          </div>

          {/* Gallery Section */}
          <div className="mb-8">
            <ArtworkCarousel />
          </div>

          {/* Featured Content */}
          <div className="rounded-lg border border-amber-800/20 bg-amber-50/50 p-6">
            <h2 className="mb-4 font-fantasy text-2xl font-semibold text-amber-900">
              At the Sign of the Prancing Pony
            </h2>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
                Every Friday
              </span>
              <div className="flex items-center gap-2 text-amber-700">
                <Calendar className="h-4 w-4" />
                <span>2:00 pm server-time (EU) / 7:00 pm server-time (NA)</span>
              </div>
            </div>
            <p className="mb-4 text-amber-800">
              Join us at the famous inn of Bree for tales, songs, and merriment! All are welcome to share stories of
              their adventures throughout Middle-earth.
            </p>
            <Button className="bg-amber-800 text-amber-50 hover:bg-amber-700">Learn More</Button>
          </div>
        </main>

        {/* Right Sidebar - Events & Activity */}
        <aside className="w-full border-t border-amber-800/20 bg-[#f5e6c8] p-4 lg:w-80 lg:border-l lg:border-t-0">
          <RightSidebar />
        </aside>
      </div>
    </div>
  )
}
