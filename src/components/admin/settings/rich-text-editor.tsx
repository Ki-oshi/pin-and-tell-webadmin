"use client";

import {
  useEffect,
} from "react";

import {
  EditorContent,
  useEditor,
} from "@tiptap/react";

import StarterKit from "@tiptap/starter-kit";

import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Undo2,
} from "lucide-react";

type Props = {
  value: string;

  disabled?:
    boolean;

  onChange:
    (
      value:
        string,
    ) => void;
};

export default function RichTextEditor({
  value,
  disabled = false,
  onChange,
}: Props) {
  const editor =
    useEditor({
      immediatelyRender:
        false,

      editable:
        !disabled,

      extensions: [
        StarterKit.configure({
          heading: {
            levels: [
              2,
              3,
            ],
          },
        }),
      ],

      content:
        value,

      editorProps: {
        attributes: {
          class:
            [
              "min-h-[260px]",
              "px-4",
              "py-4",
              "text-xs",
              "leading-6",
              "text-slate-800",
              "outline-none",
              "[&_p]:my-2",
              "[&_h2]:mb-2",
              "[&_h2]:mt-5",
              "[&_h2]:text-lg",
              "[&_h2]:font-semibold",
              "[&_h2]:text-slate-950",
              "[&_h3]:mb-2",
              "[&_h3]:mt-4",
              "[&_h3]:text-sm",
              "[&_h3]:font-semibold",
              "[&_h3]:text-slate-900",
              "[&_ul]:my-3",
              "[&_ul]:list-disc",
              "[&_ul]:pl-6",
              "[&_ol]:my-3",
              "[&_ol]:list-decimal",
              "[&_ol]:pl-6",
              "[&_li]:my-1",
              "[&_blockquote]:my-4",
              "[&_blockquote]:border-l-2",
              "[&_blockquote]:border-[#CC3A67]",
              "[&_blockquote]:pl-4",
              "[&_blockquote]:italic",
              "[&_blockquote]:text-slate-500",
              "[&_hr]:my-5",
              "[&_hr]:border-slate-200",
              "[&_strong]:font-semibold",
            ].join(
              " ",
            ),
        },
      },

      onUpdate({
        editor:
          currentEditor,
      }) {
        onChange(
          currentEditor
            .getHTML(),
        );
      },
    });

  /*
   * Synchronize the editor when the
   * parent resets or replaces the
   * stored policy value.
   */
  useEffect(() => {
    if (
      !editor
    ) {
      return;
    }

    const currentHtml =
      editor.getHTML();

    if (
      currentHtml ===
      value
    ) {
      return;
    }

    editor.commands.setContent(
      value,
      {
        emitUpdate:
          false,
      },
    );
  }, [
    editor,
    value,
  ]);

  useEffect(() => {
    if (
      !editor
    ) {
      return;
    }

    editor.setEditable(
      !disabled,
    );
  }, [
    editor,
    disabled,
  ]);

  if (
    !editor
  ) {
    return (
      <div
        className="
          flex
          min-h-[260px]
          items-center
          justify-center
          border
          border-slate-200
          bg-slate-50
          text-[11px]
          text-slate-400
        "
      >
        Loading editor...
      </div>
    );
  }

  return (
    <div
      className={`
        overflow-hidden
        border
        bg-white
        transition
        ${
          disabled
            ? "border-slate-200 opacity-70"
            : "border-slate-200 focus-within:border-[#CC3A67] focus-within:ring-2 focus-within:ring-[#FDC1C9]/30"
        }
      `}
    >
      {/* =========================
          TOOLBAR
      ========================== */}

      <div
        className="
          flex
          flex-wrap
          items-center
          gap-1
          border-b
          border-slate-200
          bg-slate-50
          p-2
        "
      >
        <ToolbarButton
          label="Undo"
          disabled={
            disabled ||
            !editor.can()
              .chain()
              .focus()
              .undo()
              .run()
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .undo()
              .run()
          }
        >
          <Undo2
            size={14}
          />
        </ToolbarButton>

        <ToolbarButton
          label="Redo"
          disabled={
            disabled ||
            !editor.can()
              .chain()
              .focus()
              .redo()
              .run()
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .redo()
              .run()
          }
        >
          <Redo2
            size={14}
          />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          label="Bold"
          active={
            editor.isActive(
              "bold",
            )
          }
          disabled={
            disabled
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleBold()
              .run()
          }
        >
          <Bold
            size={14}
          />
        </ToolbarButton>

        <ToolbarButton
          label="Italic"
          active={
            editor.isActive(
              "italic",
            )
          }
          disabled={
            disabled
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleItalic()
              .run()
          }
        >
          <Italic
            size={14}
          />
        </ToolbarButton>

        <ToolbarButton
          label="Strikethrough"
          active={
            editor.isActive(
              "strike",
            )
          }
          disabled={
            disabled
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleStrike()
              .run()
          }
        >
          <Strikethrough
            size={14}
          />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          label="Heading 2"
          active={
            editor.isActive(
              "heading",
              {
                level:
                  2,
              },
            )
          }
          disabled={
            disabled
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleHeading({
                level:
                  2,
              })
              .run()
          }
        >
          <Heading2
            size={14}
          />
        </ToolbarButton>

        <ToolbarButton
          label="Heading 3"
          active={
            editor.isActive(
              "heading",
              {
                level:
                  3,
              },
            )
          }
          disabled={
            disabled
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleHeading({
                level:
                  3,
              })
              .run()
          }
        >
          <Heading3
            size={14}
          />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          label="Bullet List"
          active={
            editor.isActive(
              "bulletList",
            )
          }
          disabled={
            disabled
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleBulletList()
              .run()
          }
        >
          <List
            size={14}
          />
        </ToolbarButton>

        <ToolbarButton
          label="Numbered List"
          active={
            editor.isActive(
              "orderedList",
            )
          }
          disabled={
            disabled
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleOrderedList()
              .run()
          }
        >
          <ListOrdered
            size={14}
          />
        </ToolbarButton>

        <ToolbarButton
          label="Blockquote"
          active={
            editor.isActive(
              "blockquote",
            )
          }
          disabled={
            disabled
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleBlockquote()
              .run()
          }
        >
          <Quote
            size={14}
          />
        </ToolbarButton>

        <ToolbarDivider />

        <ToolbarButton
          label="Horizontal Rule"
          disabled={
            disabled
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .setHorizontalRule()
              .run()
          }
        >
          <Minus
            size={14}
          />
        </ToolbarButton>

        <ToolbarButton
          label="Clear Formatting"
          disabled={
            disabled
          }
          onClick={() =>
            editor
              .chain()
              .focus()
              .unsetAllMarks()
              .clearNodes()
              .run()
          }
        >
          <RemoveFormatting
            size={14}
          />
        </ToolbarButton>
      </div>

      {/* =========================
          EDITOR
      ========================== */}

      <EditorContent
        editor={
          editor
        }
      />

      {/* =========================
          FOOTER
      ========================== */}

      <div
        className="
          flex
          items-center
          justify-between
          gap-4
          border-t
          border-slate-100
          bg-slate-50/70
          px-3
          py-2
        "
      >
        <p
          className="
            text-[9px]
            text-slate-400
          "
        >
          Rich text formatting is stored
          automatically with this policy.
        </p>

        <p
          className="
            shrink-0
            text-[9px]
            text-slate-400
          "
        >
          {
            editor
                .getText()
                .length
            }
          characters
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   TOOLBAR BUTTON
========================================================= */

function ToolbarButton({
  children,
  label,
  active = false,
  disabled = false,
  onClick,
}: {
  children:
    React.ReactNode;

  label:
    string;

  active?:
    boolean;

  disabled?:
    boolean;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      title={
        label
      }
      aria-label={
        label
      }
      disabled={
        disabled
      }
      onMouseDown={(
        event,
      ) => {
        /*
         * Prevent the editor from losing
         * its selection when clicking a
         * formatting button.
         */
        event.preventDefault();
      }}
      onClick={
        onClick
      }
      className={`
        inline-flex
        h-8
        w-8
        items-center
        justify-center
        border
        text-slate-600
        transition
        ${
          active
            ? "border-[#FDC1C9] bg-[#A92F56] text-white"
            : "border-transparent bg-transparent hover:border-slate-200 hover:bg-white"
        }
        disabled:cursor-not-allowed
        disabled:opacity-30
      `}
    >
      {children}
    </button>
  );
}

/* =========================================================
   TOOLBAR DIVIDER
========================================================= */

function ToolbarDivider() {
  return (
    <div
      className="
        mx-1
        h-5
        w-px
        bg-slate-200
      "
    />
  );
}