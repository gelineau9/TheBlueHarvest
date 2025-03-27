export function NavItem({ href, label, active = false }: { href: string; label: string; active?: boolean }) {
    return (
      <a
        href={href}
        className={`flex items-center rounded-md px-3 py-2 text-sm font-medium ${
          active ? "bg-amber-800 text-amber-50" : "text-amber-900 hover:bg-amber-100/80 hover:text-amber-900"
        }`}
      >
        {label}
      </a>
    )
  }
