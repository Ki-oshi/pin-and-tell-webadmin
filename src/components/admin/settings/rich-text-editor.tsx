"use client";

import { useEffect, useRef } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold, Heading1, Heading2, Heading3, Italic, List, ListOrdered,
  Minus, Quote, Redo2, RemoveFormatting, Strikethrough, Undo2,
} from "lucide-react";

type Props = {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
};

// Keep support for policy HTML pasted as source text, including previously saved malformed entries.
const HTML_SOURCE_PATTERN = /<\/?(?:h1|h2|h3|p|ul|ol|li|strong|b|em|i|s|strike|blockquote|hr|br)\b[^>]*>/i;
function looksLikeHtmlSource(value: string): boolean {
  const text = value.trim();
  return Boolean(text && HTML_SOURCE_PATTERN.test(text));
}

export default function RichTextEditor({ value, disabled = false, onChange }: Props) {
  const lastSyncedValue = useRef<string | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] } })],
    content: value,
    editorProps: {
      attributes: {
        "aria-label": "Rich text policy editor",
        class: [
          "min-h-[260px]", "px-5", "py-5", "text-[12px]", "leading-7", "text-slate-700", "outline-none",
          "[&_p]:my-2.5",
          "[&_h1]:mb-3", "[&_h1]:mt-6", "[&_h1]:text-2xl", "[&_h1]:font-bold", "[&_h1]:tracking-tight", "[&_h1]:text-slate-950",
          "[&_h2]:mb-2.5", "[&_h2]:mt-6", "[&_h2]:text-lg", "[&_h2]:font-bold", "[&_h2]:text-slate-950",
          "[&_h3]:mb-2", "[&_h3]:mt-5", "[&_h3]:text-base", "[&_h3]:font-semibold", "[&_h3]:text-slate-900",
          "[&_ul]:my-3", "[&_ul]:list-disc", "[&_ul]:space-y-1", "[&_ul]:pl-6",
          "[&_ol]:my-3", "[&_ol]:list-decimal", "[&_ol]:space-y-1", "[&_ol]:pl-6",
          "[&_li]:pl-1",
          "[&_blockquote]:my-4", "[&_blockquote]:rounded-r-xl", "[&_blockquote]:border-l-4", "[&_blockquote]:border-[#CC3A67]", "[&_blockquote]:bg-rose-50/50", "[&_blockquote]:px-4", "[&_blockquote]:py-2.5", "[&_blockquote]:italic", "[&_blockquote]:text-slate-600",
          "[&_hr]:my-6", "[&_hr]:border-0", "[&_hr]:border-t", "[&_hr]:border-slate-200",
          "[&_strong]:font-semibold", "[&_strong]:text-slate-900",
          "selection:bg-rose-100",
        ].join(" "),
      },
    },
    onUpdate({ editor: currentEditor }) {
      const plainText = currentEditor.getText({ blockSeparator: "\n" }).trim();
      if (looksLikeHtmlSource(plainText)) {
        currentEditor.commands.setContent(plainText, { emitUpdate: false });
        const convertedHtml = currentEditor.getHTML();
        lastSyncedValue.current = convertedHtml;
        onChange(convertedHtml);
        return;
      }
      const html = currentEditor.getHTML();
      lastSyncedValue.current = html;
      onChange(html);
    },
  });

  // Synchronize content after parent reset and normalize literal HTML saved by older editors.
  useEffect(() => {
    if (!editor || lastSyncedValue.current === value) return;
    lastSyncedValue.current = value;
    editor.commands.setContent(value || "", { emitUpdate: false });
    const editorText = editor.getText({ blockSeparator: "\n" }).trim();
    if (looksLikeHtmlSource(editorText)) {
      editor.commands.setContent(editorText, { emitUpdate: false });
      const normalizedHtml = editor.getHTML();
      lastSyncedValue.current = normalizedHtml;
      onChange(normalizedHtml);
    }
  }, [editor, value, onChange]);

  useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [editor, disabled]);

  if (!editor) {
    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-[11px] text-slate-400">
        Loading policy editor...
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-2xl border bg-white transition ${disabled ? "border-slate-200 opacity-70" : "border-slate-200 focus-within:border-[#CC3A67] focus-within:ring-4 focus-within:ring-[#FDC1C9]/20"}`}>
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-slate-50/90 p-2.5 sm:p-3" role="toolbar" aria-label="Policy formatting">
        <ToolbarButton label="Undo" disabled={disabled || !editor.can().chain().focus().undo().run()} onClick={() => editor.chain().focus().undo().run()}><Undo2 size={15} /></ToolbarButton>
        <ToolbarButton label="Redo" disabled={disabled || !editor.can().chain().focus().redo().run()} onClick={() => editor.chain().focus().redo().run()}><Redo2 size={15} /></ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton label="Bold" active={editor.isActive("bold")} disabled={disabled} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={15} /></ToolbarButton>
        <ToolbarButton label="Italic" active={editor.isActive("italic")} disabled={disabled} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={15} /></ToolbarButton>
        <ToolbarButton label="Strikethrough" active={editor.isActive("strike")} disabled={disabled} onClick={() => editor.chain().focus().toggleStrike().run()}><Strikethrough size={15} /></ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton label="Heading 1" active={editor.isActive("heading", { level: 1 })} disabled={disabled} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={16} /></ToolbarButton>
        <ToolbarButton label="Heading 2" active={editor.isActive("heading", { level: 2 })} disabled={disabled} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={16} /></ToolbarButton>
        <ToolbarButton label="Heading 3" active={editor.isActive("heading", { level: 3 })} disabled={disabled} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={16} /></ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton label="Bullet list" active={editor.isActive("bulletList")} disabled={disabled} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={15} /></ToolbarButton>
        <ToolbarButton label="Numbered list" active={editor.isActive("orderedList")} disabled={disabled} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={15} /></ToolbarButton>
        <ToolbarButton label="Blockquote" active={editor.isActive("blockquote")} disabled={disabled} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={15} /></ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton label="Horizontal rule" disabled={disabled} onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={15} /></ToolbarButton>
        <ToolbarButton label="Clear formatting" disabled={disabled} onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}><RemoveFormatting size={15} /></ToolbarButton>
      </div>
      <div className="max-h-[620px] min-h-[260px] overflow-y-auto bg-white"><EditorContent editor={editor} /></div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-3">
        <p className="text-[10px] leading-5 text-slate-500">Use the toolbar to format policy content. Changes save when you select <strong className="font-semibold">Save policies</strong>.</p>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 font-mono text-[10px] text-slate-500">{editor.getText().length} characters</span>
      </div>
    </div>
  );
}

function ToolbarButton({ children, label, active = false, disabled = false, onClick }: {
  children: React.ReactNode; label: string; active?: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <button type="button" title={label} aria-label={label} aria-pressed={active} disabled={disabled}
      onMouseDown={(event) => event.preventDefault()} onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-xl border text-slate-600 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CC3A67] disabled:cursor-not-allowed disabled:opacity-30 ${active ? "border-[#A92F56] bg-[#A92F56] text-white shadow-sm" : "border-transparent bg-transparent hover:border-slate-200 hover:bg-white hover:text-[#A92F56]"}`}>
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-slate-200" />;
}
