'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/moderation', label: 'Moderation' },
    { href: '/admin/audit-log', label: 'Audit Log' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-amber-900 mb-1">Admin Dashboard</h1>
        <p className="text-sm text-amber-700">Site administration and moderation tools</p>
      </div>
      <nav className="flex gap-1 mb-6 border-b border-amber-300 pb-0">
        {tabs.map((tab) => {
          const isActive = tab.href === '/admin' ? pathname === '/admin' : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2 text-sm font-medium rounded-t-md border border-b-0 transition-colors ${
                isActive
                  ? 'bg-amber-800 text-amber-50 border-amber-800'
                  : 'text-amber-800 border-amber-300 hover:bg-amber-100/80'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
