import { heading, p, codeBlock } from '../utils.js';

// ——————————————————————————————————————————————
// Introduction
// ——————————————————————————————————————————————
const intro = `
  ${heading('Introduction', 'sec-intro')}
  <div style="padding:4px 0;">
    <div style="font-weight:bold; font-size:20px; margin-bottom:4px;">ascii-renderer</div>
    <div style="color:#8b949e; margin-bottom:16px;">HTML/CSS input &rarr; ASCII art output. Readable by humans and LLMs alike.</div>

    <div style="display:flex; gap:8px; margin-bottom:16px;">
      <div style="flex:1; border:1px solid #30363d; padding:8px; text-align:center;">
        <div style="font-weight:bold; color:#58a6ff;">For Humans</div>
        <div style="color:#8b949e;">Visual ASCII canvas</div>
        <div style="color:#8b949e;">Click, type, scroll, drag</div>
      </div>
      <div style="flex:1; border:1px solid #30363d; padding:8px; text-align:center;">
        <div style="font-weight:bold; color:#58a6ff;">For LLMs</div>
        <div style="color:#8b949e;">.toText() plain text</div>
        <div style="color:#8b949e;">Direct UI understanding</div>
      </div>
    </div>

    ${p('Traditional GUIs are invisible to LLMs &mdash; screenshots require vision, DOM is too verbose.')}
    ${p('Pure-text TUIs are unfriendly to humans &mdash; no styling, limited interaction.')}
    ${p('ASCII Renderer bridges the gap: standard HTML/CSS input, zero learning cost.')}
    ${p('<strong style="color:#c9d1d9;">This entire page is rendered by ascii-renderer itself.</strong>')}
  </div>
`;

// ——————————————————————————————————————————————
// Installation
// ——————————————————————————————————————————————
const install = `
  ${heading('Installation', 'sec-install')}
  ${p('Install from npm:')}
  ${codeBlock('npm install ascii-renderer')}
  ${p('Or use directly from CDN via ES module import map:')}
  ${codeBlock(`<script type="importmap">
{
  "imports": {
    "ascii-renderer": "https://unpkg.com/ascii-renderer@latest/dist/ascii-renderer.js"
  }
}
</script>

<script type="module">
  import { AsciiRenderer } from 'ascii-renderer';
</script>`)}
`;

// ——————————————————————————————————————————————
// Quick Start
// ——————————————————————————————————————————————
const quickStart = `
  ${heading('Quick Start', 'sec-quickstart')}
  ${p('Create a renderer, set HTML content, and export as plain text:')}
  ${codeBlock(`import { AsciiRenderer } from 'ascii-renderer';

const renderer = new AsciiRenderer({
  target: document.getElementById('app'),
  cols: 80,
  rows: 24,
});

renderer.setContent(\`
  <div style="border: 1px solid #666; padding: 8px;">
    <h1 style="font-weight: bold;">Hello World</h1>
    <p>Rendered as ASCII art.</p>
    <button>Click me</button>
  </div>
\`);

// Export for LLM consumption
console.log(renderer.toText());

// Listen to events
renderer.on('button', 'click', () => {
  alert('Clicked!');
});`)}
`;

// ——————————————————————————————————————————————
// API Reference
// ——————————————————————————————————————————————
const api = `
  ${heading('API Reference', 'sec-api')}

  <div style="font-weight:bold; margin:12px 0 8px; color:#e6edf3;">Constructor Options</div>
  <table style="border-collapse:collapse; width:95%;">
    <tr>
      <th style="border:1px solid #30363d; padding:4px; text-align:left;">Option</th>
      <th style="border:1px solid #30363d; padding:4px; text-align:left;">Type</th>
      <th style="border:1px solid #30363d; padding:4px; text-align:left;">Default</th>
    </tr>
    <tr>
      <td style="border:1px solid #21262d; padding:4px;">target</td>
      <td style="border:1px solid #21262d; padding:4px; color:#79c0ff;">HTMLElement</td>
      <td style="border:1px solid #21262d; padding:4px; color:#f85149;">required</td>
    </tr>
    <tr>
      <td style="border:1px solid #21262d; padding:4px;">cols</td>
      <td style="border:1px solid #21262d; padding:4px; color:#79c0ff;">number</td>
      <td style="border:1px solid #21262d; padding:4px;">120</td>
    </tr>
    <tr>
      <td style="border:1px solid #21262d; padding:4px;">rows</td>
      <td style="border:1px solid #21262d; padding:4px; color:#79c0ff;">number</td>
      <td style="border:1px solid #21262d; padding:4px;">40</td>
    </tr>
    <tr>
      <td style="border:1px solid #21262d; padding:4px;">fontSize</td>
      <td style="border:1px solid #21262d; padding:4px; color:#79c0ff;">number</td>
      <td style="border:1px solid #21262d; padding:4px;">14</td>
    </tr>
    <tr>
      <td style="border:1px solid #21262d; padding:4px;">theme</td>
      <td style="border:1px solid #21262d; padding:4px; color:#79c0ff;">Partial&lt;Theme&gt;</td>
      <td style="border:1px solid #21262d; padding:4px; color:#8b949e;">see below</td>
    </tr>
    <tr>
      <td style="border:1px solid #21262d; padding:4px;">autoResize</td>
      <td style="border:1px solid #21262d; padding:4px; color:#79c0ff;">boolean</td>
      <td style="border:1px solid #21262d; padding:4px;">true</td>
    </tr>
  </table>

  <div style="font-weight:bold; margin:16px 0 8px; color:#e6edf3;">Methods</div>
  <table style="border-collapse:collapse; width:95%;">
    <tr>
      <th style="border:1px solid #30363d; padding:4px; text-align:left;">Method</th>
      <th style="border:1px solid #30363d; padding:4px; text-align:left;">Description</th>
    </tr>
    <tr>
      <td style="border:1px solid #21262d; padding:4px; color:#d2a8ff;">setContent(html)</td>
      <td style="border:1px solid #21262d; padding:4px;">Set HTML content and re-render</td>
    </tr>
    <tr>
      <td style="border:1px solid #21262d; padding:4px; color:#d2a8ff;">render()</td>
      <td style="border:1px solid #21262d; padding:4px;">Force re-render without changing content</td>
    </tr>
    <tr>
      <td style="border:1px solid #21262d; padding:4px; color:#d2a8ff;">toText()</td>
      <td style="border:1px solid #21262d; padding:4px;">Export as plain text string</td>
    </tr>
    <tr>
      <td style="border:1px solid #21262d; padding:4px; color:#d2a8ff;">toAnsi()</td>
      <td style="border:1px solid #21262d; padding:4px;">Export as ANSI-colored string</td>
    </tr>
    <tr>
      <td style="border:1px solid #21262d; padding:4px; color:#d2a8ff;">on(selector, event, fn)</td>
      <td style="border:1px solid #21262d; padding:4px;">Register event listener</td>
    </tr>
    <tr>
      <td style="border:1px solid #21262d; padding:4px; color:#d2a8ff;">off(selector, event, fn)</td>
      <td style="border:1px solid #21262d; padding:4px;">Remove event listener</td>
    </tr>
    <tr>
      <td style="border:1px solid #21262d; padding:4px; color:#d2a8ff;">resize(cols, rows)</td>
      <td style="border:1px solid #21262d; padding:4px;">Resize the character grid</td>
    </tr>
    <tr>
      <td style="border:1px solid #21262d; padding:4px; color:#d2a8ff;">destroy()</td>
      <td style="border:1px solid #21262d; padding:4px;">Clean up all resources</td>
    </tr>
  </table>

  <div style="font-weight:bold; margin:16px 0 8px; color:#e6edf3;">Theme Properties</div>
  <table style="border-collapse:collapse; width:95%;">
    <tr>
      <th style="border:1px solid #30363d; padding:4px; text-align:left;">Property</th>
      <th style="border:1px solid #30363d; padding:4px; text-align:left;">Default</th>
      <th style="border:1px solid #30363d; padding:4px; text-align:left;">Description</th>
    </tr>
    <tr>
      <td style="border:1px solid #21262d; padding:4px;">fg</td>
      <td style="border:1px solid #21262d; padding:4px;">#c0c0c0</td>
      <td style="border:1px solid #21262d; padding:4px;">Default text color</td>
    </tr>
    <tr>
      <td style="border:1px solid #21262d; padding:4px;">bg</td>
      <td style="border:1px solid #21262d; padding:4px;">#1a1a1a</td>
      <td style="border:1px solid #21262d; padding:4px;">Background</td>
    </tr>
    <tr>
      <td style="border:1px solid #21262d; padding:4px;">border</td>
      <td style="border:1px solid #21262d; padding:4px;">#404040</td>
      <td style="border:1px solid #21262d; padding:4px;">Box-drawing characters</td>
    </tr>
    <tr>
      <td style="border:1px solid #21262d; padding:4px;">focus</td>
      <td style="border:1px solid #21262d; padding:4px;">#5a9</td>
      <td style="border:1px solid #21262d; padding:4px;">Focus ring</td>
    </tr>
    <tr>
      <td style="border:1px solid #21262d; padding:4px;">link</td>
      <td style="border:1px solid #21262d; padding:4px;">#58a6ff</td>
      <td style="border:1px solid #21262d; padding:4px;">Link text</td>
    </tr>
    <tr>
      <td style="border:1px solid #21262d; padding:4px;">selection</td>
      <td style="border:1px solid #21262d; padding:4px;">#264f78</td>
      <td style="border:1px solid #21262d; padding:4px;">Selection highlight</td>
    </tr>
  </table>
`;

export const gettingStarted = intro + install + quickStart + api;
