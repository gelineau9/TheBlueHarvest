'use client';

import { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { ChevronDown } from 'lucide-react';
import type { ResourceSection } from '@/types/resources';

/**
 * Foldable guide sections.
 *
 * The first section starts open (unless the author says otherwise) so the guide
 * reads as a scannable list of headings — effectively a table of contents.
 * A URL hash (#language) expands and scrolls to that section, so a link can
 * point at one part of a guide.
 */
export function GuideSections({ sections }: { sections: ResourceSection[] }) {
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    sections.forEach((section, index) => {
      if (section.defaultOpen ?? index === 0) initial.add(section.key);
    });
    return initial;
  });

  // Expand and scroll to a section named in the URL hash
  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.replace('#', ''));
    if (!hash) return;
    if (!sections.some((section) => section.key === hash)) return;

    setOpenKeys((prev) => new Set(prev).add(hash));
    // Wait for the panel to expand before scrolling to it
    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [sections]);

  const toggle = (key: string) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const setAll = (open: boolean) => {
    setOpenKeys(open ? new Set(sections.map((s) => s.key)) : new Set());
  };

  if (sections.length === 0) {
    return <p className="text-sm text-amber-700 italic">This guide has no content yet.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end gap-3 text-xs">
        <button type="button" onClick={() => setAll(true)} className="text-amber-700 hover:underline">
          Expand all
        </button>
        <button type="button" onClick={() => setAll(false)} className="text-amber-700 hover:underline">
          Collapse all
        </button>
      </div>

      {sections.map((section) => {
        const isOpen = openKeys.has(section.key);
        return (
          <section
            key={section.key}
            id={section.key}
            className="scroll-mt-4 overflow-hidden rounded-lg border border-amber-800/20 bg-amber-50/70"
          >
            <h2>
              <button
                type="button"
                onClick={() => toggle(section.key)}
                aria-expanded={isOpen}
                aria-controls={`${section.key}-panel`}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-amber-100/60"
              >
                <span className="font-fantasy text-lg font-semibold text-amber-900">{section.heading}</span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-amber-700 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                />
              </button>
            </h2>

            {isOpen && (
              <div
                id={`${section.key}-panel`}
                className="prose prose-amber max-w-none border-t border-amber-800/10 px-4 py-3 text-amber-900"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(section.body || '') }}
              />
            )}
          </section>
        );
      })}
    </div>
  );
}
