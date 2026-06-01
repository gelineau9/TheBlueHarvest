'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import HardBreak from '@tiptap/extension-hard-break';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Underline from '@tiptap/extension-underline';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import Image from '@tiptap/extension-image';
import { useRef, useCallback, useState } from 'react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Minus,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  ImagePlus,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

// Curated colour palette for the Brandy Hall Archives
const TEXT_COLOURS = [
  { label: 'Default', value: '' },
  { label: 'Black', value: '#1c1007' },
  { label: 'Dark Brown', value: '#4a3728' },
  { label: 'Amber', value: '#b45309' },
  { label: 'Gold', value: '#d97706' },
  { label: 'Dark Red', value: '#7f1d1d' },
  { label: 'Crimson', value: '#dc2626' },
  { label: 'Forest Green', value: '#14532d' },
  { label: 'Green', value: '#16a34a' },
  { label: 'Teal', value: '#0f766e' },
  { label: 'Navy', value: '#1e3a5f' },
  { label: 'Blue', value: '#1d4ed8' },
  { label: 'Purple', value: '#6b21a8' },
  { label: 'Violet', value: '#7c3aed' },
  { label: 'Rose', value: '#be185d' },
  { label: 'Silver', value: '#6b7280' },
];

export function RichTextEditor({ value, onChange, placeholder, disabled }: RichTextEditorProps) {
  const [showColourPicker, setShowColourPicker] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        hardBreak: false, // managed manually below
      }),
      // Enter = <br>; Enter again on a line that ends with <br> = new paragraph
      HardBreak.extend({
        addKeyboardShortcuts() {
          return {
            'Mod-Enter': () => this.editor.commands.setHardBreak(),
            'Shift-Enter': () => this.editor.commands.setHardBreak(),
            Enter: ({ editor }) => {
              const { state } = editor;
              const { selection } = state;
              const { $from, empty } = selection;
              if (!empty) return false;
              // If the node immediately before the cursor is a hardBreak,
              // delete it and split into a new paragraph instead
              const nodeBefore = $from.nodeBefore;
              if (nodeBefore && nodeBefore.type === state.schema.nodes.hardBreak) {
                return editor
                  .chain()
                  .deleteRange({ from: $from.pos - nodeBefore.nodeSize, to: $from.pos })
                  .splitBlock()
                  .run();
              }
              // Otherwise insert a line break within the current paragraph
              return editor.commands.setHardBreak();
            },
          };
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-amber-700 underline underline-offset-2 hover:text-amber-900',
        },
      }),
      Placeholder.configure({
        placeholder: placeholder ?? 'Write something...',
      }),
      Subscript,
      Superscript,
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        defaultAlignment: 'left',
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full rounded my-2',
        },
      }),
    ],
    content: value,
    editable: !disabled,
    onUpdate({ editor }) {
      const html = editor.getHTML();
      // Treat a single empty paragraph as empty string
      onChange(html === '<p></p>' ? '' : html);
    },
  });

  // Sync external value changes (e.g. when form resets or profile loads)
  const prevValueRef = useRef(value);
  if (editor && value !== prevValueRef.current) {
    prevValueRef.current = value;
    const current = editor.getHTML();
    const incoming = value || '';
    if (current !== incoming) {
      editor.commands.setContent(incoming);
    }
  }

  const handleLinkToggle = useCallback(() => {
    if (!editor) return;
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt('Enter URL:', 'https://');
    if (url && url !== 'https://') {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const handleColourSelect = useCallback((colour: string) => {
    if (!editor) return;
    if (colour === '') {
      editor.chain().focus().unsetColor().run();
    } else {
      editor.chain().focus().setColor(colour).run();
    }
    setShowColourPicker(false);
  }, [editor]);

  const handleImageFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;

      const MAX_FILE_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_FILE_SIZE) {
        alert(`Image too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 10 MB.`);
        if (imageInputRef.current) imageInputRef.current.value = '';
        return;
      }

      setIsUploadingImage(true);
      try {
        const formData = new FormData();
        formData.append('images', file);

        const response = await fetch('/api/uploads/images', {
          method: 'POST',
          body: formData,
        });

        let data: { error?: string; files?: { url: string }[] };
        try { data = await response.json(); } catch { data = {}; }

        if (!response.ok || !data.files?.[0]?.url) {
          alert(data.error || 'Image upload failed. Please try again.');
          return;
        }

        editor.chain().focus().setImage({ src: data.files[0].url }).run();
      } catch {
        alert('Image upload failed. Please try again.');
      } finally {
        setIsUploadingImage(false);
        if (imageInputRef.current) imageInputRef.current.value = '';
      }
    },
    [editor],
  );

  if (!editor) return null;

  const btnClass = (active: boolean) =>
    `p-1.5 rounded transition-colors ${
      active ? 'bg-amber-800 text-amber-50' : 'text-amber-800 hover:bg-amber-100'
    } disabled:opacity-40 disabled:cursor-not-allowed`;

  const sep = <span className="w-px h-4 bg-amber-200 mx-1 shrink-0" />;

  // Get the current active colour for the palette indicator
  const activeColour = editor.getAttributes('textStyle').color as string | undefined;

  return (
    <div
      className={`border border-amber-300 rounded-md overflow-hidden bg-white focus-within:ring-1 focus-within:ring-amber-600 focus-within:border-amber-600 ${disabled ? 'opacity-60' : ''}`}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-amber-200 bg-amber-50">

        {/* --- Formatting --- */}
        <button type="button" title="Bold" disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={btnClass(editor.isActive('bold'))}>
          <Bold className="w-4 h-4" />
        </button>

        <button type="button" title="Italic" disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={btnClass(editor.isActive('italic'))}>
          <Italic className="w-4 h-4" />
        </button>

        <button type="button" title="Underline" disabled={disabled}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={btnClass(editor.isActive('underline'))}>
          <UnderlineIcon className="w-4 h-4" />
        </button>

        <button type="button" title="Strikethrough" disabled={disabled}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={btnClass(editor.isActive('strike'))}>
          <Strikethrough className="w-4 h-4" />
        </button>

        {sep}

        {/* --- Headings --- */}
        <button type="button" title="Heading 1" disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={btnClass(editor.isActive('heading', { level: 1 }))}>
          <Heading1 className="w-4 h-4" />
        </button>

        <button type="button" title="Heading 2" disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={btnClass(editor.isActive('heading', { level: 2 }))}>
          <Heading2 className="w-4 h-4" />
        </button>

        <button type="button" title="Heading 3" disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={btnClass(editor.isActive('heading', { level: 3 }))}>
          <Heading3 className="w-4 h-4" />
        </button>

        {sep}

        {/* --- Alignment --- */}
        <button type="button" title="Align left" disabled={disabled}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={btnClass(editor.isActive({ textAlign: 'left' }))}>
          <AlignLeft className="w-4 h-4" />
        </button>

        <button type="button" title="Align center" disabled={disabled}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={btnClass(editor.isActive({ textAlign: 'center' }))}>
          <AlignCenter className="w-4 h-4" />
        </button>

        <button type="button" title="Align right" disabled={disabled}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={btnClass(editor.isActive({ textAlign: 'right' }))}>
          <AlignRight className="w-4 h-4" />
        </button>

        {sep}

        {/* --- Lists & blocks --- */}
        <button type="button" title="Bullet list" disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btnClass(editor.isActive('bulletList'))}>
          <List className="w-4 h-4" />
        </button>

        <button type="button" title="Ordered list" disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={btnClass(editor.isActive('orderedList'))}>
          <ListOrdered className="w-4 h-4" />
        </button>

        <button type="button" title="Blockquote" disabled={disabled}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={btnClass(editor.isActive('blockquote'))}>
          <Quote className="w-4 h-4" />
        </button>

        <button type="button" title="Horizontal rule" disabled={disabled}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className={btnClass(false)}>
          <Minus className="w-4 h-4" />
        </button>

        {sep}

        {/* --- Link --- */}
        <button type="button" title={editor.isActive('link') ? 'Remove link' : 'Add link'}
          disabled={disabled} onClick={handleLinkToggle}
          className={btnClass(editor.isActive('link'))}>
          <LinkIcon className="w-4 h-4" />
        </button>

        {sep}

        {/* --- Sub / Super --- */}
        <button type="button" title="Subscript" disabled={disabled}
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          className={btnClass(editor.isActive('subscript'))}>
          <SubscriptIcon className="w-4 h-4" />
        </button>

        <button type="button" title="Superscript" disabled={disabled}
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          className={btnClass(editor.isActive('superscript'))}>
          <SuperscriptIcon className="w-4 h-4" />
        </button>

        {sep}

        {/* --- Text colour --- */}
        <div className="relative">
          <button
            type="button"
            title="Text colour"
            disabled={disabled}
            onClick={() => setShowColourPicker(v => !v)}
            className={btnClass(showColourPicker || !!activeColour)}
          >
            <span className="flex flex-col items-center gap-0.5">
              <Palette className="w-4 h-4" />
              <span
                className="w-4 h-0.5 rounded-full"
                style={{ backgroundColor: activeColour || '#b45309' }}
              />
            </span>
          </button>

          {showColourPicker && (
            <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-amber-200 rounded-md shadow-lg p-2 w-48">
              <div className="grid grid-cols-4 gap-1">
                {TEXT_COLOURS.map(({ label, value }) => (
                  <button
                    key={label}
                    type="button"
                    title={label}
                    onClick={() => handleColourSelect(value)}
                    className={`w-8 h-8 rounded border-2 transition-transform hover:scale-110 ${
                      (activeColour ?? '') === value
                        ? 'border-amber-600 scale-110'
                        : 'border-transparent'
                    }`}
                    style={{
                      backgroundColor: value || '#ffffff',
                      outline: value === '' ? '1px solid #d1d5db' : undefined,
                    }}
                  />
                ))}
              </div>
              <p className="text-xs text-amber-600 mt-1.5 text-center">
                {TEXT_COLOURS.find(c => c.value === (activeColour ?? ''))?.label ?? 'Default'}
              </p>
            </div>
          )}
        </div>

        {sep}

        {/* --- Insert image --- */}
        <button
          type="button"
          title="Insert image"
          disabled={disabled || isUploadingImage}
          onClick={() => imageInputRef.current?.click()}
          className={btnClass(false)}
        >
          {isUploadingImage
            ? <span className="w-4 h-4 border-2 border-amber-800 border-t-transparent rounded-full animate-spin inline-block" />
            : <ImagePlus className="w-4 h-4" />}
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageFileSelect}
        />
      </div>

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className="min-h-[180px] px-3 py-2 text-sm text-amber-900 [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[160px] [&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:text-amber-900 [&_.ProseMirror_h1]:mt-4 [&_.ProseMirror_h1]:mb-2 [&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:text-amber-900 [&_.ProseMirror_h2]:mt-4 [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h3]:text-base [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:text-amber-900 [&_.ProseMirror_h3]:mt-3 [&_.ProseMirror_h3]:mb-1 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_li]:my-0.5 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-amber-300 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:text-amber-700 [&_.ProseMirror_hr]:border-amber-200 [&_.ProseMirror_hr]:my-4 [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded [&_.ProseMirror_img]:my-2 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-amber-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0"
      />
    </div>
  );
}
