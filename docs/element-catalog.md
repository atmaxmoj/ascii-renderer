# ASCII Renderer -- Element Catalog

This document catalogs every HTML element's ASCII representation, interaction
behavior, keyboard shortcuts, and cursor type. Each element is shown with its
rendered ASCII form and documented with its behavioral details.

---

## Table of Contents

1. [Block Elements](#block-elements)
2. [Inline Elements](#inline-elements)
3. [Lists](#lists)
4. [Tables](#tables)
5. [Form Elements](#form-elements)
6. [Media Elements](#media-elements)
7. [Interactive Elements](#interactive-elements)
8. [Progress and Meter](#progress-and-meter)
9. [Horizontal Rule](#horizontal-rule)
10. [Cursor Types Summary](#cursor-types-summary)

---

## Block Elements

### `<div>` -- Generic Block Container

Rendered with box-drawing borders when `border` CSS is set. Without border, it is an
invisible container that affects layout only.

**With border:**
```
┌──────────────────────────┐
│ Content goes here        │
│                          │
└──────────────────────────┘
```

**With border-radius (rounded):**
```
╭──────────────────────────╮
│ Content goes here        │
│                          │
╰──────────────────────────╯
```

**Border style mapping:**

| CSS border-style | ASCII characters          |
|------------------|---------------------------|
| `solid`          | `┌ ─ ┐ │ └ ┘`            |
| `double`         | `╔ ═ ╗ ║ ╚ ╝`            |
| `dashed`         | `┌ ┄ ┐ ┆ └ ┘`            |
| `dotted`         | `┌ ··· ┐ : └ ┘`          |
| `none` / `hidden`| (no border drawn)         |

**Cursor:** `default`

---

### `<h1>` through `<h6>` -- Headings

Headings are rendered as text blocks with emphasis treatment that varies by level.

```
╔══════════════════════════╗
║  HEADING LEVEL 1         ║
╚══════════════════════════╝

── HEADING LEVEL 2 ─────────
   bold underlined

═══ Heading Level 3 ════════

--- Heading Level 4 --------

    Heading Level 5
    ~~~~~~~~~~~~~~~

    Heading Level 6
```

| Level | Treatment                                    |
|-------|----------------------------------------------|
| `h1`  | Double-border box, ALL CAPS, bold            |
| `h2`  | Underlined with `─`, bold, ALL CAPS          |
| `h3`  | Underlined with `═`, bold                    |
| `h4`  | Underlined with `-`, bold                    |
| `h5`  | Underlined with `~`                          |
| `h6`  | Normal text, smaller (no special decoration) |

**Cursor:** `default`

---

### `<p>` -- Paragraph

Rendered as a text block with word wrapping at the container boundary. Respects
`text-align`, `line-height` (mapped to vertical spacing), and `text-indent`.

```
  This is a paragraph of text that wraps at
  the container boundary. Words are never
  split mid-word unless the word is longer
  than the entire container width.
```

**Text alignment:**

| `text-align` | Behavior                                      |
|-------------|-----------------------------------------------|
| `left`      | Left-aligned (default)                        |
| `right`     | Right-aligned, padded with spaces on left     |
| `center`    | Centered, padded with spaces on both sides    |
| `justify`   | Extra spaces distributed between words        |

**Cursor:** `text` (I-beam)

---

### `<pre>` / `<code>` -- Preformatted / Code

Rendered inside a box with preserved whitespace. No word wrapping is performed;
content may be clipped or trigger horizontal scroll.

```
┌─────────────────────────────────────┐
│ function hello() {                  │
│   console.log("Hello, world!");     │
│ }                                   │
└─────────────────────────────────────┘
```

When used inline, `<code>` is rendered with backtick delimiters:
```
Use the `console.log()` function.
```

**Cursor:** `text`

---

### `<blockquote>` -- Block Quotation

Rendered with a vertical bar on the left margin.

```
  │ This is a blockquote. It has a
  │ vertical bar on the left side
  │ to indicate quoted content.
  │
  │ Multiple paragraphs are supported.
```

Nested blockquotes add additional bars:
```
  │ First level quote.
  │ │ Second level quote.
  │ │ │ Third level.
```

**Cursor:** `default`

---

## Inline Elements

### `<a>` -- Hyperlink

Rendered as underlined text. The href is not displayed unless the user hovers (shown
as tooltip overlay).

```
  Click ̲h̲e̲r̲e̲ to learn more.
```

In practice, underline is rendered by drawing `_` beneath the text characters or by
using the underline attribute in the CharGrid (which CanvasDisplay renders as a line
beneath each character).

**Cursor:** `pointer`
**Keyboard:** `Enter` activates the link (dispatches click event).
**Hover:** Shows tooltip overlay with href URL.

---

### `<strong>` / `<b>` -- Bold

Rendered as bold text (CanvasDisplay uses bold font weight).

```
  This is **bold** text.
```

In the ASCII grid, bold is stored as a cell attribute. CanvasDisplay renders it with
a heavier font weight.

---

### `<em>` / `<i>` -- Italic

Rendered as italic text (CanvasDisplay uses italic font style). Since true italics
are hard to convey in ASCII, the text may optionally be wrapped with `/slashes/`.

```
  This is /italic/ text.
```

---

### `<u>` -- Underline

Rendered with underline attribute.

---

### `<s>` / `<del>` -- Strikethrough

Rendered with strikethrough attribute. CanvasDisplay draws a horizontal line through
the middle of each character.

```
  This is ~~struck~~ text.
```

---

### `<span>` -- Inline Container

No visual representation. Applies styles (color, background, etc.) to enclosed text.

---

### `<br>` -- Line Break

Forces a new line in the current text flow.

---

## Lists

### `<ul>` -- Unordered List

```
  • First item
  • Second item
    • Nested item (level 2)
      ◦ Nested item (level 3)
        ▪ Nested item (level 4)
  • Third item
```

Bullet characters by nesting level:

| Level | Character |
|-------|-----------|
| 1     | `\u2022` (bullet) |
| 2     | `\u2022` (bullet) |
| 3     | `\u25E6` (white bullet) |
| 4+    | `\u25AA` (small square) |

Respects `list-style-type` CSS property:

| `list-style-type` | Character |
|-------------------|-----------|
| `disc`            | `\u2022`  |
| `circle`          | `\u25E6`  |
| `square`          | `\u25AA`  |
| `none`            | (no bullet) |

---

### `<ol>` -- Ordered List

```
  1. First item
  2. Second item
     a. Nested item (level 2)
        i. Nested item (level 3)
  3. Third item
```

Numbering style by level:

| Level | Style           | Example          |
|-------|-----------------|------------------|
| 1     | decimal         | `1. 2. 3.`      |
| 2     | lower-alpha     | `a. b. c.`      |
| 3     | lower-roman     | `i. ii. iii.`   |
| 4+    | decimal         | `1. 2. 3.`      |

Respects `list-style-type`, `start`, and `reversed` attributes.

---

### `<li>` -- List Item

A block within a list. Indentation is `2 * nestingLevel` characters from the list
margin. The bullet/number is drawn in the indent space.

**Cursor:** `default`

---

## Tables

### `<table>`, `<tr>`, `<td>`, `<th>`

Tables are rendered with box-drawing characters forming a complete grid.

**Basic table:**
```
┌──────────┬──────────┬──────────┐
│ Name     │ Age      │ City     │
├──────────┼──────────┼──────────┤
│ Alice    │ 30       │ NYC      │
│ Bob      │ 25       │ LA       │
│ Charlie  │ 35       │ Chicago  │
└──────────┴──────────┴──────────┘
```

**With `<thead>` and `<tbody>` (double line separator):**
```
┌──────────┬──────────┬──────────┐
│ Name     │ Age      │ City     │
╞══════════╪══════════╪══════════╡
│ Alice    │ 30       │ NYC      │
│ Bob      │ 25       │ LA       │
└──────────┴──────────┴──────────┘
```

**`<th>` cells** are rendered with bold text and optionally centered.

**`colspan` and `rowspan`** are supported by merging cells:
```
┌──────────────────────┬──────────┐
│ Merged Header (2col) │ Normal   │
├──────────┬───────────┼──────────┤
│ Cell 1   │ Cell 2    │ Cell 3   │
└──────────┴───────────┴──────────┘
```

**Border character reference for tables:**
```
Corners:     ┌ ┐ └ ┘
T-junctions: ┬ ┴ ├ ┤
Cross:       ┼
Horizontal:  ─
Vertical:    │
Double sep:  ╞ ╡ ╪ ═
```

**`border-collapse: collapse`** uses the above single-line grid.
**`border-collapse: separate`** adds spacing between cells (extra space columns).

**Cursor:** `default` (cells), `text` (if cell content is selectable)

---

## Form Elements

### `<input type="text">` -- Text Input

```
┌──────────────────────────┐
│ [value________________]  │
└──────────────────────────┘
```

Or without a surrounding container, standalone:
```
[value________________]
```

- The brackets `[ ]` delimit the input field.
- The value is left-aligned within the field.
- Unfilled space is shown as `_` (underscore) characters.
- Width is determined by the CSS `width` property or the `size` attribute.

**States:**
```
Default:     [________________]
With value:  [Hello world_____]
Focused:     [Hello world█____]    (block cursor at caret position)
Disabled:    [Hello world_____]    (dimmed color)
Placeholder: [Enter name......] (dimmed placeholder text with dots)
```

**Cursor:** `text`
**Keyboard:**
- Characters insert at caret position.
- `Backspace` / `Delete` remove characters.
- `Left` / `Right` arrow keys move the caret.
- `Home` / `End` move to start/end.
- `Ctrl+A` selects all (selection shown as highlighted background).
- `Ctrl+C` / `Ctrl+V` copy/paste via hidden textarea.
- `Tab` moves focus to next input.
- `Enter` submits the form (dispatches `submit` event).

---

### `<input type="password">` -- Password Input

```
[••••••••________]
```

Same as text input, but each character is displayed as `\u2022` (bullet).

**Cursor:** `text`
**Keyboard:** Same as text input.

---

### `<input type="checkbox">` -- Checkbox

```
Unchecked:    [ ] Label text
Checked:      [\u2713] Label text
Indeterminate: [-] Label text
Disabled:     [ ] Label text    (dimmed)
```

**Cursor:** `pointer`
**Keyboard:**
- `Space` toggles the checkbox.
- `Tab` moves focus.
**Interaction:** Click toggles between checked and unchecked. Dispatches `change` event.

---

### `<input type="radio">` -- Radio Button

```
Unselected:   ( ) Option A
Selected:     (\u25CF) Option B
Disabled:     ( ) Option C    (dimmed)
```

**Cursor:** `pointer`
**Keyboard:**
- `Space` selects this radio button.
- `Arrow Up/Down` cycles through radio group.
- `Tab` moves focus to next group.
**Interaction:** Click selects. Deselects other radios in the same `name` group.
Dispatches `change` event.

---

### `<input type="number">` -- Number Input

```
[42______] \u25B2\u25BC
```

The up/down arrows (`\u25B2\u25BC`) are rendered to the right of the input field. They
increment/decrement the value.

**Cursor:** `text` (on input), `pointer` (on arrows)
**Keyboard:**
- `Arrow Up` increments by `step` (default 1).
- `Arrow Down` decrements by `step`.
- Typing is restricted to digits, `-`, `.`.
- Respects `min`, `max`, `step` attributes.

---

### `<input type="range">` -- Range Slider

```
\u25C4\u2550\u2550\u2550\u2588\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u25BA
```

Components:
- `\u25C4` left endpoint
- `\u2550` track (double horizontal line)
- `\u2588` thumb (full block character at current position)
- `\u25BA` right endpoint

The thumb position is calculated as:
```
thumbCol = leftEnd + round((value - min) / (max - min) * trackWidth)
```

**Cursor:** `pointer` (on thumb: `grab` / `grabbing` while dragging)
**Keyboard:**
- `Arrow Left/Down` decreases value by `step`.
- `Arrow Right/Up` increases value by `step`.
- `Home` sets to `min`, `End` sets to `max`.
**Interaction:** Click on track sets value to that position. Drag thumb to adjust.

---

### `<input type="date">` -- Date Input

```
[2024-01-15  \U0001F4C5]
```

The calendar icon indicates this is a date picker. Clicking opens a calendar overlay.

**Calendar overlay (when open):**
```
╔══ January 2024 ═══════════╗
║ \u25C0  January 2024      \u25B6  ║
║ Su Mo Tu We Th Fr Sa      ║
║     1  2  3  4  5  6      ║
║  7  8  9 10 11 12 13      ║
║ 14 [15]16 17 18 19 20     ║
║ 21 22 23 24 25 26 27      ║
║ 28 29 30 31               ║
╚═══════════════════════════╝
```

- `[15]` indicates the selected date.
- `\u25C0` / `\u25B6` navigate months.
- The overlay is managed by OverlayManager.

**Cursor:** `pointer`
**Keyboard:**
- `Arrow` keys navigate days in the calendar.
- `Enter` selects a date.
- `Escape` closes the calendar.
- Direct typing in `YYYY-MM-DD` format is supported.

---

### `<input type="color">` -- Color Picker

```
\u2588\u2588 #ff6600
```

The two full-block characters (`\u2588\u2588`) are rendered in the selected color (as
foreground color). The hex value is displayed next to them.

Clicking opens a color palette overlay (simplified grid of common colors).

**Cursor:** `pointer`

---

### `<input type="file">` -- File Input

```
[ Choose File ] No file selected
```

After file selection:
```
[ Choose File ] document.pdf
```

**Cursor:** `pointer`
**Keyboard:** `Space` or `Enter` activates file dialog.
**Interaction:** Click dispatches a file input event. The actual browser file dialog
is triggered via a hidden `<input type="file">` element.

---

### `<textarea>` -- Multi-line Text Input

```
┌──────────────────────────────┐
│ Line 1 of text               │\u2591
│ Line 2 of text               │\u2588
│ Line 3                       │\u2591
│                              │\u2591
│                              │\u2591
└─────────────────────────────◢┘
```

Components:
- Box-drawing border around the content area.
- Vertical scrollbar on the right: `\u2591` (track) and `\u2588` (thumb).
- Resize handle `\u25E2` at the bottom-right corner.
- Content area supports multi-line text with word wrapping.

**Scrollbar rendering:**
```
Thumb on track:  \u2591\u2591\u2588\u2588\u2591\u2591\u2591  (vertical, top to bottom)
```

**Cursor:** `text` (content area), `pointer` (scrollbar), `nwse-resize` (resize handle)
**Keyboard:**
- All text input keys (same as text input).
- `Enter` inserts a newline (does NOT submit form).
- `Ctrl+A` selects all.
- Scrolling with arrow keys when cursor reaches boundary.

---

### `<select>` -- Dropdown Select

**Closed state:**
```
[Selected value     \u25BC]
```

**Open state (overlay):**
```
[Selected value     \u25B2]
 ┌────────────────────┐
 │ Option 1           │
 │ Option 2        \u2713  │   <-- currently selected, checkmark
 │ Option 3           │
 │ Option 4           │
 └────────────────────┘
```

The dropdown overlay is managed by OverlayManager. It appears below the select
element. If there is not enough space below, it flips to open above (see boundary
detection in stacking-and-overlays.md).

**With `<optgroup>`:**
```
 ┌────────────────────┐
 │ ── Group A ──      │   <-- optgroup label (non-selectable)
 │   Option 1         │
 │   Option 2         │
 │ ── Group B ──      │
 │   Option 3         │
 └────────────────────┘
```

**`<select multiple>`:**
```
┌────────────────────┐
│ [\u2713] Option 1       │
│ [ ] Option 2       │
│ [\u2713] Option 3       │
│ [ ] Option 4       │
└────────────────────┘
```

Rendered as a listbox (always visible, no dropdown).

**Cursor:** `pointer`
**Keyboard:**
- `Space` or `Enter` opens/closes the dropdown.
- `Arrow Up/Down` navigates options.
- Type-ahead: typing a letter jumps to the first matching option.
- `Escape` closes the dropdown.
- `Tab` closes and moves focus.

---

### `<button>` -- Button

```
[ Click Me ]
```

**States:**
```
Default:     [ Click Me ]
Hover:       [ Click Me ]     (inverted colors: light text on dark bg)
Active:      [-Click Me-]     (pressed visual, slight offset)
Disabled:    [ Click Me ]     (dimmed colors)
Focused:     [>Click Me<]     (focus indicators)
```

**Cursor:** `pointer`
**Keyboard:**
- `Space` or `Enter` activates the button (dispatches `click`).
- `Tab` moves focus.

---

### `<fieldset>` and `<legend>` -- Field Group

```
┌─ Personal Info ─────────────────────┐
│                                     │
│  Name: [________________]           │
│  Email: [_______________]           │
│                                     │
└─────────────────────────────────────┘
```

The `<legend>` text interrupts the top border.

---

### `<label>` -- Form Label

Rendered as plain text. Clicking the label focuses/toggles the associated form
control (via `for` attribute or wrapping).

**Cursor:** `default` (or `pointer` if associated with a clickable control)

---

## Media Elements

### `<img>` -- Image

Images cannot be rendered as ASCII art in the general case. They are represented as
placeholder boxes with alt text.

**With alt text:**
```
┌───────────────────────┐
│                       │
│    [img: Photo of     │
│     a sunset]         │
│                       │
└───────────────────────┘
```

**Without alt text:**
```
┌───────────────────────┐
│                       │
│        [image]        │
│                       │
└───────────────────────┘
```

**Small images (icon-sized):**
```
[\U0001F5BC]
```

Rendered as a single icon character when dimensions are small enough.

**Cursor:** `default`

---

### `<video>` / `<audio>` -- Media Players

```
┌─────────────────────────────────────┐
│                                     │
│            [\u25B6 Play]               │
│                                     │
│  \u25C0\u25C0  \u25B6  \u25B6\u25B6  \u2503\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501 0:00/3:45  │
└─────────────────────────────────────┘
```

Displays a placeholder with play button and transport controls.

---

## Interactive Elements

### `<dialog>` -- Dialog / Modal

```
\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591
\u2591\u2591\u2591\u2591 \u2554\u2550\u2550 Confirm Action \u2550\u2550\u2550\u2550\u2550\u2557 \u2591\u2591\u2591\u2591\u2591
\u2591\u2591\u2591\u2591 \u2551                        \u2551 \u2591\u2591\u2591\u2591\u2591
\u2591\u2591\u2591\u2591 \u2551 Are you sure you want  \u2551 \u2591\u2591\u2591\u2591\u2591
\u2591\u2591\u2591\u2591 \u2551 to delete this item?   \u2551 \u2591\u2591\u2591\u2591\u2591
\u2591\u2591\u2591\u2591 \u2551                        \u2551 \u2591\u2591\u2591\u2591\u2591
\u2591\u2591\u2591\u2591 \u2551 [ Cancel ] [ Delete ]  \u2551 \u2591\u2591\u2591\u2591\u2591
\u2591\u2591\u2591\u2591 \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D \u2591\u2591\u2591\u2591\u2591
\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591\u2591
```

- The dialog uses double-border box drawing (`\u2554 \u2550 \u2557 \u2551 \u255A \u255D`).
- Title text is embedded in the top border.
- The backdrop is filled with `\u2591` (light shade) characters.
- Modal dialogs block interaction with content behind them.
- Managed by OverlayManager.

**Cursor:** `default` (backdrop), `pointer` (buttons inside)
**Keyboard:**
- `Escape` closes the dialog (if not prevented).
- `Tab` cycles focus within the dialog (focus trap).
- `Enter` activates the focused button.

---

### `<details>` / `<summary>` -- Disclosure Toggle

**Closed:**
```
\u25B6 Click to expand
```

**Open:**
```
\u25BC Click to expand
  Expanded content is shown here.
  It can contain any elements.
```

**Cursor:** `pointer` (on summary)
**Keyboard:**
- `Space` or `Enter` toggles open/closed.

---

### `<a>` with `[draggable="true"]` -- Draggable Element

See drag interaction in sequence-diagrams.md. Draggable elements show `grab` cursor
on hover and `grabbing` cursor during drag.

---

## Progress and Meter

### `<progress>` -- Progress Bar

```
[████░░░░░░] 40%
```

Components:
- `[` `]` delimiters.
- `\u2588` (full block) for filled portion.
- `\u2591` (light shade) for unfilled portion.
- Percentage label to the right.

**Indeterminate progress (no `value` attribute):**
```
[░░██░░░░░░]
```

The filled block animates back and forth (re-rendered periodically).

**Width** is determined by CSS `width` or defaults to 20 characters.

---

### `<meter>` -- Meter / Gauge

```
Low:      [██░░░░░░░░] 20%      (red/warning color)
Optimum:  [██████░░░░] 60%      (green/good color)
High:     [█████████░] 90%      (yellow/caution color)
```

Same visual as progress bar, but color varies based on `low`, `high`, `optimum`
attributes relative to the current `value`.

---

## Horizontal Rule

### `<hr>` -- Horizontal Rule

```
────────────────────────────────────────
```

Rendered as a full-width line of `\u2500` (box-drawing horizontal) characters.
Width matches the containing element.

**With styled variants:**

| CSS style          | Character |
|--------------------|-----------|
| `border-style: solid` | `\u2500`    |
| `border-style: double` | `\u2550`    |
| `border-style: dashed` | `\u2504`    |
| `border-style: dotted` | `\u00B7\u00B7\u00B7` |

---

## Cursor Types Summary

| Element                        | Cursor       |
|--------------------------------|--------------|
| Default / div / span           | `default`    |
| Text / paragraph               | `text`       |
| Link (`<a>`)                   | `pointer`    |
| Button                         | `pointer`    |
| Checkbox / Radio               | `pointer`    |
| Select (closed)                | `pointer`    |
| Text input / Textarea (content)| `text`       |
| Number input arrows            | `pointer`    |
| Range slider thumb             | `grab` / `grabbing` |
| Textarea resize handle         | `nwse-resize`|
| Textarea scrollbar             | `pointer`    |
| Draggable element              | `grab` / `grabbing` |
| Disabled control               | `not-allowed`|
| Dialog backdrop                | `default`    |
| Details/summary                | `pointer`    |
| File input button              | `pointer`    |
| Date input calendar icon       | `pointer`    |
| Color input swatch             | `pointer`    |

---

## Keyboard Shortcuts Reference

### Global

| Key           | Action                              |
|---------------|-------------------------------------|
| `Tab`         | Move focus to next focusable element|
| `Shift+Tab`   | Move focus to previous element     |
| `Escape`      | Close overlay / cancel operation   |

### Text Input / Textarea

| Key           | Action                              |
|---------------|-------------------------------------|
| `Left/Right`  | Move caret                         |
| `Home/End`    | Move to start/end of line          |
| `Ctrl+A`      | Select all                         |
| `Ctrl+C`      | Copy selection                     |
| `Ctrl+V`      | Paste                              |
| `Ctrl+X`      | Cut selection                      |
| `Ctrl+Z`      | Undo                               |
| `Ctrl+Shift+Z`| Redo                               |
| `Backspace`   | Delete before caret                |
| `Delete`      | Delete after caret                 |
| `Enter`       | Submit (input) / Newline (textarea)|

### Select Dropdown

| Key           | Action                              |
|---------------|-------------------------------------|
| `Space/Enter` | Open/close dropdown                 |
| `Up/Down`     | Navigate options                    |
| `Letter`      | Jump to matching option             |
| `Escape`      | Close dropdown                      |

### Checkbox / Radio

| Key           | Action                              |
|---------------|-------------------------------------|
| `Space`       | Toggle checkbox / select radio      |
| `Up/Down`     | Cycle through radio group           |

### Range Slider

| Key           | Action                              |
|---------------|-------------------------------------|
| `Left/Down`   | Decrease by step                    |
| `Right/Up`    | Increase by step                    |
| `Home`        | Set to min                          |
| `End`         | Set to max                          |

### Dialog

| Key           | Action                              |
|---------------|-------------------------------------|
| `Escape`      | Close dialog                        |
| `Tab`         | Cycle focus within dialog           |
| `Enter`       | Activate focused button             |

### Details/Summary

| Key           | Action                              |
|---------------|-------------------------------------|
| `Space/Enter` | Toggle disclosure                   |
