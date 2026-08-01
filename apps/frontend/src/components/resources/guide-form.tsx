'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NextImage from 'next/image';
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useSidebarRefresh } from '@/contexts/SidebarRefreshContext';
import {
  GUIDE_TEMPLATES,
  GUIDE_TYPE_ID,
  resolveTemplateId,
  type Resource,
  type ResourceSection,
} from '@/types/resources';

interface EditableSection extends ResourceSection {
  /** Author-facing guidance from the template; not persisted */
  hint?: string;
}

interface GuideFormProps {
  /** Existing guide when editing; omitted when creating */
  guide?: Resource;
}

export function GuideForm({ guide }: GuideFormProps) {
  const router = useRouter();
  const { triggerSidebarRefresh } = useSidebarRefresh();
  const isEditing = Boolean(guide);

  // Creating starts on the template picker; editing goes straight to the form
  const [templateChosen, setTemplateChosen] = useState(isEditing);
  const [title, setTitle] = useState(guide?.title ?? '');
  const [summary, setSummary] = useState(guide?.summary ?? '');
  const [sections, setSections] = useState<EditableSection[]>(guide?.content?.sections ?? []);
  const [templateId, setTemplateId] = useState<string>(guide ? resolveTemplateId(guide.content) : '');

  // Fixed-structure templates keep a canonical section order: no reordering,
  // no additions. Removing a section that doesn't apply is still allowed.
  const fixedStructure = GUIDE_TEMPLATES.find((t) => t.id === templateId)?.fixedStructure ?? false;
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const { uploadedImages, isUploading, uploadError, fileInputRef, handleFileSelect, setUploadedImages } =
    useImageUpload({
      maxImages: 1,
      initialImages: guide?.content?.headerImage
        ? [
            {
              url: guide.content.headerImage.url,
              filename: guide.content.headerImage.filename,
              originalName: guide.content.headerImage.originalName ?? '',
            },
          ]
        : [],
    });

  const headerImage = uploadedImages[0] ?? null;

  function applyTemplate(templateId: string) {
    const template = GUIDE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    const seeded = template.sections.map((section, index) => ({
      key: section.key,
      heading: section.heading,
      body: '',
      hint: section.hint,
      defaultOpen: index === 0,
    }));
    setSections(seeded);
    setOpenSection(seeded[0]?.key ?? null);
    setTemplateId(template.id);
    setTemplateChosen(true);
  }

  function updateSection(key: string, patch: Partial<EditableSection>) {
    setSections((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  function removeSection(key: string) {
    setSections((prev) => prev.filter((s) => s.key !== key));
  }

  function moveSection(index: number, direction: -1 | 1) {
    setSections((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addSection() {
    // Custom keys are suffixed so anchor links stay unique even after removals
    const key = `custom-${Date.now()}`;
    setSections((prev) => [...prev, { key, heading: 'New Section', body: '' }]);
    setOpenSection(key);
  }

  async function handleSubmit(publish: boolean) {
    setError('');

    if (!title.trim()) {
      setError('A title is required.');
      return;
    }

    setIsSaving(true);

    const payload = {
      resource_type_id: GUIDE_TYPE_ID,
      title: title.trim(),
      summary: summary.trim() || null,
      is_published: publish,
      content: {
        template: templateId || undefined,
        headerImage: headerImage
          ? { url: headerImage.url, filename: headerImage.filename, originalName: headerImage.originalName }
          : null,
        // Strip the author-facing hints before persisting
        sections: sections.map(({ key, heading, body, defaultOpen }) => ({ key, heading, body, defaultOpen })),
      },
    };

    try {
      const response = await fetch(isEditing ? `/api/resources/${guide!.resource_id}` : '/api/resources', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? 'Failed to save the guide.');
        setIsSaving(false);
        return;
      }

      // Refresh the sidebar so a newly published guide appears in its list
      triggerSidebarRefresh();
      router.push('/my/guides');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
      setIsSaving(false);
    }
  }

  // ── Template picker ───────────────────────────────────────────────────────
  if (!templateChosen) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="font-fantasy text-2xl font-semibold text-amber-900">Choose a starting point</h2>
          <p className="text-sm text-amber-700">
            Sections can be renamed, reordered, added, or removed afterwards — this only decides what you begin with.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {GUIDE_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => applyTemplate(template.id)}
              className="rounded-lg border border-amber-800/20 bg-amber-50/90 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-amber-500 hover:shadow-md"
            >
              <h3 className="font-fantasy text-lg font-semibold text-amber-900">{template.label}</h3>
              <p className="mt-1 text-sm text-amber-800/80">{template.description}</p>
              <p className="mt-2 text-xs text-amber-600">
                {template.sections.length} section{template.sections.length === 1 ? '' : 's'}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Guide form ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="title" className="text-amber-900 font-semibold">
            Title *
          </Label>
          <span className={`text-xs ${title.length > 200 ? 'text-red-600 font-semibold' : 'text-amber-600'}`}>
            {title.length}/200 characters
          </span>
        </div>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. How to RP a Rohirrim"
          maxLength={200}
          disabled={isSaving}
          className="border-amber-300 focus:border-amber-600 focus:ring-amber-600 bg-white text-amber-900"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="summary" className="text-amber-900 font-semibold">
          Summary
        </Label>
        <Input
          id="summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="One or two lines shown beneath the title on the Resources page"
          maxLength={500}
          disabled={isSaving}
          className="border-amber-300 focus:border-amber-600 focus:ring-amber-600 bg-white text-amber-900"
        />
      </div>

      {/* Header image */}
      <div className="space-y-2">
        <Label className="text-amber-900 font-semibold">Header image</Label>
        {headerImage ? (
          <div className="relative w-full max-w-md">
            <div className="relative aspect-[16/6] w-full overflow-hidden rounded border border-amber-300">
              <NextImage src={headerImage.url} alt={headerImage.originalName || ''} fill className="object-cover" />
            </div>
            <button
              type="button"
              onClick={() => setUploadedImages([])}
              className="absolute right-2 top-2 rounded-full bg-amber-900/80 p-1 text-amber-50 hover:bg-amber-900"
              aria-label="Remove header image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              id="header-image-input"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isSaving}
              className="border-amber-800/30 text-amber-900 hover:bg-amber-100"
            >
              {isUploading ? 'Uploading…' : 'Upload header image'}
            </Button>
          </div>
        )}
        {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
      </div>

      {/* Sections */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-amber-900 font-semibold">Sections</Label>
          {!fixedStructure && (
            <Button
              type="button"
              variant="outline"
              onClick={addSection}
              disabled={isSaving}
              className="border-amber-800/30 text-amber-900 hover:bg-amber-100"
            >
              <Plus className="mr-1 h-4 w-4" />
              Add section
            </Button>
          )}
        </div>

        {fixedStructure && (
          <p className="text-xs text-amber-700 italic">
            This template has a set structure. You can edit or remove sections that don&apos;t apply, but the order is
            fixed so every culture guide reads the same way.
          </p>
        )}

        {sections.length === 0 && (
          <p className="rounded border border-dashed border-amber-300 px-4 py-6 text-center text-sm text-amber-700 italic">
            No sections yet — add one to begin.
          </p>
        )}

        <div className="space-y-2">
          {sections.map((section, index) => {
            const isOpen = openSection === section.key;
            return (
              <div key={section.key} className="rounded-lg border border-amber-800/20 bg-amber-50/70">
                <div className="flex items-center gap-2 px-3 py-2">
                  {!fixedStructure && <GripVertical className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />}
                  <Input
                    value={section.heading}
                    onChange={(e) => updateSection(section.key, { heading: e.target.value })}
                    disabled={isSaving}
                    aria-label={`Heading for section ${index + 1}`}
                    className="h-8 flex-1 border-amber-300 focus:border-amber-600 focus:ring-amber-600 bg-white text-amber-900"
                  />
                  {!fixedStructure && (
                    <>
                      <button
                        type="button"
                        onClick={() => moveSection(index, -1)}
                        disabled={index === 0 || isSaving}
                        className="p-1 text-amber-700 disabled:opacity-30"
                        aria-label="Move section up"
                      >
                        <ChevronUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSection(index, 1)}
                        disabled={index === sections.length - 1 || isSaving}
                        className="p-1 text-amber-700 disabled:opacity-30"
                        aria-label="Move section down"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => removeSection(section.key)}
                    disabled={isSaving}
                    className="p-1 text-red-600 hover:text-red-700"
                    aria-label="Remove section"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpenSection(isOpen ? null : section.key)}
                    className="h-8 border-amber-800/30 px-2 text-xs text-amber-900 hover:bg-amber-100"
                  >
                    {isOpen ? 'Close' : 'Edit'}
                  </Button>
                </div>

                {isOpen && (
                  <div className="border-t border-amber-800/10 px-3 py-3">
                    {section.hint && <p className="mb-2 text-xs text-amber-700 italic">{section.hint}</p>}
                    <RichTextEditor
                      value={section.body}
                      onChange={(value) => updateSection(section.key, { body: value })}
                      placeholder="Write this section…"
                      disabled={isSaving}
                      allowH1={false}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && <div className="text-sm text-red-500">{error}</div>}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => handleSubmit(true)}
          disabled={isSaving}
          className="bg-amber-800 text-amber-50 hover:bg-amber-700 disabled:opacity-50"
        >
          {isSaving ? 'Saving…' : isEditing ? 'Save and publish' : 'Publish guide'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSubmit(false)}
          disabled={isSaving}
          className="border-amber-800/30 text-amber-900 hover:bg-amber-100"
        >
          Save as draft
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/my/guides')}
          disabled={isSaving}
          className="border-amber-800/30 text-amber-900 hover:bg-amber-100"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
