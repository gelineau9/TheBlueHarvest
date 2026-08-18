'use client';

import { useState } from 'react';

/**
 * Native HTML5 drag-and-drop reordering for a list.
 *
 * Used by the collection view (both the flat and the grouped renderings) and by
 * the collection form's selected-posts list, so the three behave identically.
 * No library: these are short lists and this is the only sortable UI in the app.
 *
 * `onCommit` receives the reordered array. It may be async; if it throws, the
 * caller is responsible for restoring — `reorder` returns the previous array so
 * a failed save can put things back rather than leave a lie on screen.
 */
export function useSortableList<T>() {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const reorder = (items: T[], from: number, to: number): T[] => {
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next;
  };

  /** Props for the element that starts the drag — usually a grip button */
  const handleProps = (index: number) => ({
    draggable: true,
    onDragStart: () => setDragIndex(index),
    onDragEnd: () => {
      setDragIndex(null);
      setOverIndex(null);
    },
  });

  /** Props for each row, which acts as a drop target */
  const rowProps = (index: number, onDrop: (from: number, to: number) => void) => ({
    onDragOver: (e: React.DragEvent) => {
      if (dragIndex === null) return;
      e.preventDefault();
      setOverIndex(index);
    },
    onDragLeave: () => setOverIndex((prev) => (prev === index ? null : prev)),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const from = dragIndex;
      setDragIndex(null);
      setOverIndex(null);
      if (from === null || from === index) return;
      onDrop(from, index);
    },
  });

  /** Tailwind classes conveying drag state, appended to the row's own classes */
  const rowStateClass = (index: number) =>
    `${overIndex === index && dragIndex !== index ? 'border-amber-600 ring-2 ring-amber-400/50' : ''} ${
      dragIndex === index ? 'opacity-50' : ''
    }`;

  return { dragIndex, overIndex, reorder, handleProps, rowProps, rowStateClass };
}
