/** HTML-encode a string for safe use inside <pre> innerHTML */
export function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Section heading (with optional anchor id) */
export function heading(title, id) {
  const idAttr = id ? ` id="${id}"` : '';
  return `<div${idAttr} style="font-weight:bold; font-size:18px; color:#f0f6fc; border-bottom:1px solid #21262d; padding-bottom:4px; margin:32px 0 12px;">${title}</div>`;
}

/** Paragraph text */
export function p(text) {
  return `<p style="margin:6px 0; color:#8b949e; line-height:1.6;">${text}</p>`;
}

/** Code block (source display, not rendered) */
export function codeBlock(code) {
  return `<pre style="white-space:pre; border:1px solid #21262d; padding:8px; margin:8px 0; color:#a5d6ff;">${esc(code)}</pre>`;
}

/** Diagram block (pre-formatted ASCII art, already escaped) */
export function diagram(escapedContent) {
  return `<div style="display:flex; justify-content:center; margin:8px 0;"><pre style="white-space:pre; line-height:1;">${escapedContent}</pre></div>`;
}

/** Side-by-side ASCII vs Native HTML comparison */
export function comparison(title, html, id) {
  const idAttr = id ? ` id="${id}"` : '';
  return `
    <div style="margin-bottom:24px;">
      <div${idAttr} style="font-weight:bold; font-size:15px; margin-bottom:8px; color:#e6edf3;">${title}</div>
      <div style="display:flex; gap:8px;">
        <div style="flex:1; border:1px solid #30363d; padding:8px;">
          <div style="color:#484f58; margin-bottom:4px;">[ ASCII ]</div>
          ${html}
        </div>
        <div style="flex:1; border:1px solid #30363d; padding:8px;" data-ascii-escape>
          <div style="color:#484f58; margin-bottom:4px; font-size:12px;">[ Native HTML ]</div>
          ${html}
        </div>
      </div>
    </div>`;
}
