'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useRef, useCallback } from 'react';
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Minus,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function RichTextEditor({ value, onChange, placeholder, disabled }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isUploadingRef = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
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
    ],
    content: value,
    editable: !disabled,
    onUpdate({ editor }) {
      const html = editor.getHTML();
      // Treat empty editor as empty string
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
      editor.commands.setContent(incoming, false);
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

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!editor || isUploadingRef.current) return;
      isUploadingRef.current = true;
      try {
        const formData = new FormData();
        formData.append('images', file);
        const response = await fetch('/api/uploads/images', {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) throw new Error('Upload failed');
        const data = await response.json();
        const url: string = data?.files?.[0]?.url ?? data?.urls?.[0] ?? data?.url;
        if (url) {
          editor.chain().focus().setImage({ src: url, alt: file.name }).run();
        }
      } catch {
        // silently fail — user can try again
      } finally {
        isUploadingRef.current = false;
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [editor],
  );

  if (!editor) return null;

  const btnClass = (active: boolean) =>
    `p-1.5 rounded transition-colors ${
      active ? 'bg-amber-800 text-amber-50' : 'text-amber-800 hover:bg-amber-100'
    } disabled:opacity-40 disabled:cursor-not-allowed`;

  return (
    <div
      className={`border border-amber-300 rounded-md overflow-hidden bg-white focus-within:ring-1 focus-within:ring-amber-600 focus-within:border-amber-600 ${disabled ? 'opacity-60' : ''}`}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-amber-200 bg-amber-50">
        <button
          type="button"
          title="Bold"
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={btnClass(editor.isActive('bold'))}
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          type="button"
          title="Italic"
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={btnClass(editor.isActive('italic'))}
        >
          <Italic className="w-4 h-4" />
        </button>

        <span className="w-px h-4 bg-amber-200 mx-1" />

        <button
          type="button"
          title="Heading 2"
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={btnClass(editor.isActive('heading', { level: 2 }))}
        >
          <Heading2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          title="Heading 3"
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={btnClass(editor.isActive('heading', { level: 3 }))}
        >
          <Heading3 className="w-4 h-4" />
        </button>

        <span className="w-px h-4 bg-amber-200 mx-1" />

        <button
          type="button"
          title="Bullet list"
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={btnClass(editor.isActive('bulletList'))}
        >
          <List className="w-4 h-4" />
        </button>

        <button
          type="button"
          title="Ordered list"
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={btnClass(editor.isActive('orderedList'))}
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <button
          type="button"
          title="Blockquote"
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={btnClass(editor.isActive('blockquote'))}
        >
          <Quote className="w-4 h-4" />
        </button>

        <button
          type="button"
          title="Horizontal rule"
          disabled={disabled}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className={btnClass(false)}
        >
          <Minus className="w-4 h-4" />
        </button>

        <span className="w-px h-4 bg-amber-200 mx-1" />

        <button
          type="button"
          title={editor.isActive('link') ? 'Remove link' : 'Add link'}
          disabled={disabled}
          onClick={handleLinkToggle}
          className={btnClass(editor.isActive('link'))}
        >
          <LinkIcon className="w-4 h-4" />
        </button>

        <button
          type="button"
          title="Insert image"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className={btnClass(false)}
        >
          <ImageIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Hidden file input for image uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageUpload(file);
        }}
      />

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className="min-h-[180px] px-3 py-2 text-sm text-amber-900 [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[160px] [&_.ProseMirror_h2]:text-lg [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:text-amber-900 [&_.ProseMirror_h2]:mt-4 [&_.ProseMirror_h2]:mb-2 [&_.ProseMirror_h3]:text-base [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:text-amber-900 [&_.ProseMirror_h3]:mt-3 [&_.ProseMirror_h3]:mb-1 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_li]:my-0.5 [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-amber-300 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:text-amber-700 [&_.ProseMirror_hr]:border-amber-200 [&_.ProseMirror_hr]:my-4 [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:rounded [&_.ProseMirror_img]:my-2 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-amber-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0"
      />
    </div>
  );
}
