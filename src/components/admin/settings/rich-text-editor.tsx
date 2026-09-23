"use client";

import {
  useEffect,
  useRef,
} from "react";

import {
  EditorContent,
  useEditor,
} from "@tiptap/react";

import StarterKit from "@tiptap/starter-kit";

import {
  Bold,
  Heading1,
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
  disabled?: boolean;
  onChange: (
    value: string,
  ) => void;
};

/* =========================================================
   HTML SOURCE DETECTION
========================================================= */

/*
 * The admin sometimes pastes formatted policy HTML directly
 * into the rich-text field, for example:
 *
 * <h1>Privacy Policy</h1>
 * <p>...</p>
 *
 * A normal contenteditable treats that as literal text.
 *
 * We detect supported HTML source and let TipTap parse it
 * into actual rich-text nodes.
 */
const HTML_SOURCE_PATTERN =
  /<\/?(?:h1|h2|h3|p|ul|ol|li|strong|b|em|i|s|strike|blockquote|hr|br)\b[^>]*>/i;

function looksLikeHtmlSource(
  value: string,
): boolean {
  const text =
    value.trim();

  if (!text) {
    return false;
  }

  return HTML_SOURCE_PATTERN.test(
    text,
  );
}

/* =========================================================
   MAIN EDITOR
========================================================= */

export default function RichTextEditor({
  value,
  disabled = false,
  onChange,
}: Props) {
  /*
   * Tracks the latest HTML already synchronized with the
   * editor so normal typing does not cause the parent value
   * to be continuously re-imported.
   */
  const lastSyncedValue =
    useRef<string | null>(
      null,
    );

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
              1,
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
          class: [
            "min-h-[320px]",
            "px-5",
            "py-5",
            "text-xs",
            "leading-6",
            "text-slate-800",
            "outline-none",

            /*
             * Paragraphs
             */
            "[&_p]:my-2.5",

            /*
             * H1
             */
            "[&_h1]:mb-3",
            "[&_h1]:mt-6",
            "[&_h1]:text-xl",
            "[&_h1]:font-bold",
            "[&_h1]:leading-tight",
            "[&_h1]:tracking-[-0.02em]",
            "[&_h1]:text-slate-950",

            /*
             * H2
             */
            "[&_h2]:mb-2",
            "[&_h2]:mt-6",
            "[&_h2]:text-base",
            "[&_h2]:font-semibold",
            "[&_h2]:leading-tight",
            "[&_h2]:text-slate-950",

            /*
             * H3
             */
            "[&_h3]:mb-2",
            "[&_h3]:mt-5",
            "[&_h3]:text-sm",
            "[&_h3]:font-semibold",
            "[&_h3]:text-slate-900",

            /*
             * Lists
             */
            "[&_ul]:my-3",
            "[&_ul]:list-disc",
            "[&_ul]:space-y-1",
            "[&_ul]:pl-6",

            "[&_ol]:my-3",
            "[&_ol]:list-decimal",
            "[&_ol]:space-y-1",
            "[&_ol]:pl-6",

            "[&_li]:pl-1",

            /*
             * Quote
             */
            "[&_blockquote]:my-4",
            "[&_blockquote]:border-l-2",
            "[&_blockquote]:border-[#CC3A67]",
            "[&_blockquote]:bg-[#CC3A67]/[0.03]",
            "[&_blockquote]:px-4",
            "[&_blockquote]:py-2",
            "[&_blockquote]:italic",
            "[&_blockquote]:text-slate-600",

            /*
             * Horizontal rule
             */
            "[&_hr]:my-6",
            "[&_hr]:border-0",
            "[&_hr]:border-t",
            "[&_hr]:border-slate-200",

            /*
             * Inline formatting
             */
            "[&_strong]:font-semibold",
            "[&_strong]:text-slate-900",
          ].join(
            " ",
          ),
        },
      },

      /*
       * =====================================================
       * CONTENT UPDATE
       * =====================================================
       *
       * Normally, store TipTap HTML.
       *
       * If the editor contains literal HTML source because
       * the administrator pasted:
       *
       * <h2>Title</h2>
       *
       * convert that source into actual rich text first.
       */
      onUpdate({
        editor:
          currentEditor,
      }) {
        const plainText =
          currentEditor
            .getText({
              blockSeparator:
                "\n",
            })
            .trim();

        if (
          looksLikeHtmlSource(
            plainText,
          )
        ) {
          currentEditor
            .commands
            .setContent(
              plainText,
              {
                emitUpdate:
                  false,
              },
            );

          const convertedHtml =
            currentEditor
              .getHTML();

          lastSyncedValue.current =
            convertedHtml;

          onChange(
            convertedHtml,
          );

          return;
        }

        const html =
          currentEditor
            .getHTML();

        lastSyncedValue.current =
          html;

        onChange(
          html,
        );
      },
    });

  /* =========================================================
     EXTERNAL VALUE SYNCHRONIZATION
  ========================================================= */

  /*
   * Synchronize the editor whenever the parent resets or
   * replaces the stored policy value.
   *
   * This also repairs policy values that were previously
   * saved as literal HTML text.
   *
   * Example of an old bad value rendered by TipTap:
   *
   * <h1>Privacy Policy</h1>
   *
   * If editor.getText() contains those literal tags, we
   * parse that text again as HTML and return the normalized
   * TipTap HTML to the parent.
   */
  useEffect(() => {
    if (!editor) {
      return;
    }

    if (
      lastSyncedValue.current ===
      value
    ) {
      return;
    }

    lastSyncedValue.current =
      value;

    editor.commands.setContent(
      value || "",
      {
        emitUpdate:
          false,
      },
    );

    const editorText =
      editor
        .getText({
          blockSeparator:
            "\n",
        })
        .trim();

    /*
     * Existing malformed policy content may contain encoded
     * / literal HTML inside normal paragraphs.
     *
     * The text representation exposes those tags, which lets
     * us safely pass them back through TipTap's parser.
     */
    if (
      looksLikeHtmlSource(
        editorText,
      )
    ) {
      editor.commands.setContent(
        editorText,
        {
          emitUpdate:
            false,
        },
      );

      const normalizedHtml =
        editor.getHTML();

      lastSyncedValue.current =
        normalizedHtml;

      onChange(
        normalizedHtml,
      );
    }
  }, [
    editor,
    value,
    onChange,
  ]);

  /* =========================================================
     ENABLE / DISABLE
  ========================================================= */

  useEffect(() => {
    if (!editor) {
      return;
    }

    editor.setEditable(
      !disabled,
    );
  }, [
    editor,
    disabled,
  ]);

  /* =========================================================
     LOADING
  ========================================================= */

  if (!editor) {
    return (
      <div
        className="
          flex
          min-h-[320px]
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

  /* =========================================================
     RENDER
  ========================================================= */

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
        {/* UNDO */}

        <ToolbarButton
          label="Undo"
          disabled={
            disabled ||
            !editor
              .can()
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

        {/* REDO */}

        <ToolbarButton
          label="Redo"
          disabled={
            disabled ||
            !editor
              .can()
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

        {/* BOLD */}

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

        {/* ITALIC */}

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

        {/* STRIKETHROUGH */}

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

        {/* HEADING 1 */}

        <ToolbarButton
          label="Heading 1"
          active={
            editor.isActive(
              "heading",
              {
                level:
                  1,
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
                  1,
              })
              .run()
          }
        >
          <Heading1
            size={14}
          />
        </ToolbarButton>

        {/* HEADING 2 */}

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

        {/* HEADING 3 */}

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

        {/* BULLET LIST */}

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

        {/* NUMBERED LIST */}

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

        {/* BLOCKQUOTE */}

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

        {/* HORIZONTAL RULE */}

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

        {/* CLEAR FORMATTING */}

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
          }{" "}
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
         * Prevent the editor from losing its selection when
         * clicking a formatting button.
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