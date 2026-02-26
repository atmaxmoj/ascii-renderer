# ascii-renderer

Pure-ASCII UI rendering engine: HTML/CSS input → ASCII art output on Canvas.

Readable by humans **and** LLMs alike.

```
┌──────────────────────────────────────┐
│ Hello World                          │
│                                      │
│ Rendered as ASCII art.               │
│                                      │
│ [Click me]                           │
└──────────────────────────────────────┘
```

## Why

- Traditional GUIs are invisible to LLMs — screenshots need vision, DOM is too verbose
- Pure-text TUIs are unfriendly to humans — no styling, limited interaction
- **ascii-renderer** bridges the gap: standard HTML/CSS input, full visual + interactive output, and `.toText()` exports plain text that LLMs can read directly

## Install

```bash
npm install ascii-renderer
```

Or via CDN:

```html
<script type="importmap">
{
  "imports": {
    "ascii-renderer": "https://unpkg.com/ascii-renderer@0.1.2/dist/ascii-renderer.js"
  }
}
</script>
```

## Quick Start

```js
import { AsciiRenderer } from 'ascii-renderer';

const renderer = new AsciiRenderer({
  target: document.getElementById('app'),
  cols: 80,
  rows: 24,
});

renderer.setContent(`
  <div style="border: 1px solid #666; padding: 8px;">
    <h1 style="font-weight: bold;">Hello World</h1>
    <p>Rendered as ASCII art.</p>
    <button>Click me</button>
  </div>
`);

// Export for LLM consumption
console.log(renderer.toText());
```

## Features

- **Standard HTML/CSS** — no custom DSL, use what you already know
- **Full interaction** — click, type, scroll, drag, focus, selection
- **Form controls** — input, checkbox, radio, range, select, textarea
- **Layout** — flexbox, tables, lists, borders, padding, margin
- **LLM-friendly** — `.toText()` / `.toAnsi()` export
- **Themeable** — dark/light, custom colors
- **Auto-resize** — adapts to container size
- **CJK support** — full-width character handling
- **Zero dependencies**

## API

### Constructor

```js
new AsciiRenderer({ target, cols, rows, fontSize, theme, autoResize })
```

### Methods

| Method | Description |
|---|---|
| `setContent(html)` | Set HTML content and render |
| `render()` | Force re-render |
| `toText()` | Export as plain text |
| `toAnsi()` | Export as ANSI-colored text |
| `on(event, fn)` | Register event listener |
| `scrollTo(row)` | Scroll viewport to row |
| `getElementRow(id)` | Get row position of element by id |
| `getScrollY()` | Get current scroll position |
| `resize(cols, rows)` | Resize the grid |
| `destroy()` | Clean up resources |

## Documentation

[Live documentation site](https://atmaxmoj.github.io/ascii-renderer/) — rendered entirely by ascii-renderer itself.

## License

MIT
