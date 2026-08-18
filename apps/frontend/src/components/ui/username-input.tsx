'use client';

import { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';

interface UsernameInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Fired when the user picks a suggestion or presses Enter */
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  /** Usernames already added, so they can be shown as unavailable */
  exclude?: string[];
}

/**
 * Username field with suggestions, so adding an editor doesn't mean tabbing to
 * someone's profile page to check the spelling.
 *
 * Suggestions come from an authenticated lookup that returns usernames only.
 * Typing is never blocked — the list is a convenience, and a name that doesn't
 * appear can still be submitted, so a stale index can't lock anyone out.
 */
export function UsernameInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'Username',
  disabled,
  exclude = [],
}: UsernameInputProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced lookup — one request per pause, not per keystroke
  useEffect(() => {
    const query = value.trim();
    if (query.length < 2) {
      setSuggestions([]);
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        const excluded = new Set(exclude.map((name) => name.toLowerCase()));
        setSuggestions((data.users ?? []).filter((name: string) => !excluded.has(name.toLowerCase())));
        setActiveIndex(-1);
      } catch {
        // A failed lookup just means no suggestions; typing still works
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // exclude is joined rather than passed by reference: a fresh array each
    // render would otherwise re-run this on every keystroke.
  }, [value, exclude.join(',')]);

  // Close on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const choose = (name: string) => {
    onChange(name);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const showList = isOpen && suggestions.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-autocomplete="list"
        onChange={(e) => {
          onChange(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && showList) {
            e.preventDefault();
            setActiveIndex((i) => (i + 1) % suggestions.length);
          } else if (e.key === 'ArrowUp' && showList) {
            e.preventDefault();
            setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
          } else if (e.key === 'Enter') {
            if (showList && activeIndex >= 0) {
              e.preventDefault();
              choose(suggestions[activeIndex]);
            } else {
              onSubmit?.();
            }
          } else if (e.key === 'Escape') {
            setIsOpen(false);
          }
        }}
        className="border-amber-300 focus:border-amber-600 focus:ring-amber-600 bg-white"
      />

      {showList && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-md border border-amber-300 bg-white py-1 shadow-lg"
        >
          {suggestions.map((name, index) => (
            <li key={name}>
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(name)}
                className={`block w-full px-3 py-1.5 text-left text-sm ${
                  index === activeIndex ? 'bg-amber-100 text-amber-900' : 'text-amber-800 hover:bg-amber-50'
                }`}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
