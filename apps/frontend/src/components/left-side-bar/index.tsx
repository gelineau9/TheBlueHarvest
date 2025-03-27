import Image from "next/image"
import { NavItem } from "@/components/nav-item"
import { Search } from "lucide-react"
import { Separator } from "@/components/ui/separator"


export function LeftSidebar() {
    return (
      <div className="flex h-full flex-col">
        <div className="mb-6 text-center">
          <Image
            src="/placeholder.svg?height=120&width=200"
            alt="Brandy Hall Archives"
            width={200}
            height={120}
            className="mx-auto mb-2"
          />
          <h1 className="font-fantasy text-xl font-bold tracking-wide text-amber-900">Brandy Hall Archives</h1>
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-700" />
            <input
              type="search"
              placeholder="Search archives..."
              className="w-full rounded-md border border-amber-800/30 bg-amber-50/50 py-2 pl-10 pr-4 text-sm placeholder:text-amber-700/50 focus:border-amber-800 focus:outline-none focus:ring-1 focus:ring-amber-800"
            />
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          <NavItem href="#" label="Home" active />
          <NavItem href="#" label="News" />
          <NavItem href="#" label="Writing" />
          <NavItem href="#" label="Art" />
          <NavItem href="#" label="Characters" />
          <NavItem href="#" label="Kinships" />
          <NavItem href="#" label="About" />
          <NavItem href="#" label="Rules" />
          <Separator className="my-4 bg-amber-800/20" />
          <NavItem href="#" label="Discord" />
        </nav>
      </div>
    )
  }
