'use client';

import { useRouter } from 'next/navigation';

/**
 * Link-like navigation for elements rendered inside another <Link>.
 * HTML forbids nesting <a> inside <a> (React reports it as a hydration
 * error), so this renders a focusable span that navigates programmatically
 * without triggering the enclosing link.
 */
export function NestedLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const router = useRouter();

  const navigate = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(href);
  };

  return (
    <span
      role="link"
      tabIndex={0}
      onClick={navigate}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(e);
      }}
      className={`cursor-pointer ${className ?? ''}`}
    >
      {children}
    </span>
  );
}
