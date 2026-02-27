/**
 * Renders parsed Mermaid definitions to HTML that ascii-renderer
 * can turn into box-drawing characters.
 */

import type { FlowchartDef, SequenceDef, TreeDef, TreeNode, MermaidDef } from './parser.js';

export function renderMermaidToHtml(def: MermaidDef): string {
  if (def.type === 'flowchart') return renderFlowchart(def);
  if (def.type === 'sequence') return renderSequence(def);
  if (def.type === 'tree') return renderTree(def);
  return '';
}

// ——— Flowchart ———

function renderFlowchart(def: FlowchartDef): string {
  const ordered = getTopologicalOrder(def.nodes, def.edges);
  if (def.direction === 'LR') return renderHorizontalFlow(ordered, def.edges, def.nodes);
  return renderVerticalFlow(ordered, def.edges, def.nodes);
}

function getTopologicalOrder(
  nodes: Map<string, { id: string; text: string }>,
  edges: FlowchartDef['edges'],
): string[] {
  const visited = new Set<string>();
  const order: string[] = [];

  for (const edge of edges) {
    if (!visited.has(edge.from)) { visited.add(edge.from); order.push(edge.from); }
    if (!visited.has(edge.to)) { visited.add(edge.to); order.push(edge.to); }
  }

  for (const id of nodes.keys()) {
    if (!visited.has(id)) order.push(id);
  }

  return order;
}

/** Strip HTML tags to measure plain text length */
function textLen(html: string): number {
  return html.replace(/<[^>]*>/g, '').length;
}

const boxBlockStyle = 'display:table; margin:0 auto; border:1px solid #30363d; padding:0 3ch; text-align:center; white-space:nowrap;';
const arrowStyleV = 'display:table; margin:0 auto; text-align:center; color:#484f58; line-height:1;';
const arrowStyleH = 'color:#484f58; display:flex; align-items:center; white-space:nowrap;';

function renderVerticalFlow(
  ordered: string[],
  edges: FlowchartDef['edges'],
  nodes: Map<string, { id: string; text: string }>,
): string {
  let html = '<div>';

  for (let i = 0; i < ordered.length; i++) {
    const node = nodes.get(ordered[i]);
    html += `<div style="${boxBlockStyle}">${node!.text}</div>`;

    if (i < ordered.length - 1) {
      const edge = edges.find(e => e.from === ordered[i] && e.to === ordered[i + 1]);
      const label = edge?.label ? `<div style="color:#8b949e;">${edge.label}</div>` : '';
      html += `<div style="${arrowStyleV}">|${label}<br>v</div>`;
    }
  }

  html += '</div>';
  return html;
}

function renderHorizontalFlow(
  ordered: string[],
  edges: FlowchartDef['edges'],
  nodes: Map<string, { id: string; text: string }>,
): string {
  const boxStyleH = 'border:1px solid #30363d; padding:0 2ch; text-align:center; white-space:nowrap;';
  let html = '<div style="display:flex; align-items:center; gap:0;">';

  for (let i = 0; i < ordered.length; i++) {
    const node = nodes.get(ordered[i]);
    html += `<div style="${boxStyleH}">${node!.text}</div>`;

    if (i < ordered.length - 1) {
      html += `<div style="${arrowStyleH}">--&gt;</div>`;
    }
  }

  html += '</div>';
  return html;
}

// ——— Sequence Diagram ———
// ALL rows (headers + messages) are pre-formatted single-text-node divs.
// This guarantees exact character alignment — no flex/border pixel mismatches.

function renderSequence(def: SequenceDef): string {
  if (def.participants.length === 0) return '';

  const N = def.participants.length;

  // Calculate column width
  let maxLabelLen = 0;
  for (const p of def.participants) maxLabelLen = Math.max(maxLabelLen, p.label.length);

  const boxW = maxLabelLen + 4; // "│ label │"
  let minColW = boxW + 2; // box + 1 gap each side

  // Allow messages to widen columns, but cap so total fits ~110 chars
  const maxColW = Math.max(minColW, Math.floor(110 / N));
  for (const msg of def.messages) {
    const fi = def.participants.findIndex(p => p.id === msg.from);
    const ti = def.participants.findIndex(p => p.id === msg.to);
    if (fi === ti) continue;
    const span = Math.abs(ti - fi);
    const needed = Math.ceil((msg.text.length + 4) / span);
    minColW = Math.max(minColW, Math.min(needed, maxColW));
  }

  let maxSelfExt = 0;
  for (const msg of def.messages) {
    const fi = def.participants.findIndex(p => p.id === msg.from);
    const ti = def.participants.findIndex(p => p.id === msg.to);
    if (fi === ti) maxSelfExt = Math.max(maxSelfExt, msg.text.length + 5);
  }

  const colW = Math.max(minColW, 16);
  const life = Array.from({ length: N }, (_, i) => i * colW + Math.floor(colW / 2));
  const lastLife = life[N - 1];
  const totalW = Math.max(N * colW, lastLife + 1 + maxSelfExt + 1);

  const buf = () => new Array(totalW).fill(' ');

  // ——— Header (3 pre-formatted lines: top border, label, bottom border) ———
  const topLine = buf();
  const labelLine = buf();
  const botLine = buf();
  for (let i = 0; i < N; i++) {
    const bx = life[i] - Math.floor(boxW / 2);
    for (let j = 0; j < boxW; j++) {
      const col = bx + j;
      if (col < 0 || col >= totalW) continue;
      if (j === 0) {
        topLine[col] = '\u250C'; // ┌
        labelLine[col] = '\u2502'; // │
        botLine[col] = '\u2514'; // └
      } else if (j === boxW - 1) {
        topLine[col] = '\u2510'; // ┐
        labelLine[col] = '\u2502'; // │
        botLine[col] = '\u2518'; // ┘
      } else {
        topLine[col] = '\u2500'; // ─
        botLine[col] = '\u2500'; // ─
      }
    }
    // Center label text
    const label = def.participants[i].label;
    const ls = life[i] - Math.floor(label.length / 2);
    for (let j = 0; j < label.length; j++) {
      if (ls + j >= 0 && ls + j < totalW) labelLine[ls + j] = label[j];
    }
  }

  let html = '<div style="display:table; margin:0 auto;">';
  html += seqPre(topLine.join(''), '#30363d');
  html += seqPre(labelLine.join(''), '#e6edf3');
  html += seqPre(botLine.join(''), '#30363d');

  // ——— Message rows ———
  for (const msg of def.messages) {
    const fi = def.participants.findIndex(p => p.id === msg.from);
    const ti = def.participants.findIndex(p => p.id === msg.to);
    html += seqPre(seqLifeline(life, totalW), '#30363d');
    html += seqPre(seqMessage(fi, ti, msg.text, msg.isDashed, life, totalW), '#c9d1d9');
  }

  html += seqPre(seqLifeline(life, totalW), '#30363d');
  html += '</div>';
  return html;
}

function seqPre(text: string, color: string): string {
  return `<div style="white-space:pre; color:${color};">${text.replace(/\s+$/, '')}</div>`;
}

function seqLifeline(life: number[], totalW: number): string {
  const c = new Array(totalW).fill(' ');
  for (const p of life) if (p < totalW) c[p] = '|';
  return c.join('');
}

function seqMessage(
  fromIdx: number, toIdx: number, text: string, isDashed: boolean,
  life: number[], totalW: number,
): string {
  const c = new Array(totalW).fill(' ');

  // Draw all lifelines
  for (const p of life) if (p < totalW) c[p] = '|';

  const fp = life[fromIdx];
  const tp = life[toIdx];

  if (fromIdx === toIdx) {
    // Self-message
    const s = `+-- ${text}`;
    for (let i = 0; i < s.length && fp + 1 + i < totalW; i++) c[fp + 1 + i] = s[i];
    return c.join('');
  }

  const lp = Math.min(fp, tp);
  const rp = Math.max(fp, tp);
  const goRight = tp > fp;

  // Draw arrow line
  for (let i = lp + 1; i < rp; i++) {
    c[i] = isDashed ? ((i - lp) % 2 === 1 ? '-' : ' ') : '-';
  }

  // Place message text (centered on the arrow)
  const pad = ` ${text} `;
  const arrowLen = rp - lp - 1;
  if (pad.length <= arrowLen) {
    const start = lp + 1 + Math.floor((arrowLen - pad.length) / 2);
    for (let i = 0; i < pad.length; i++) c[start + i] = pad[i];
  } else {
    // Text too long — left-align after sender, leave 1 dash before arrowhead
    const limit = rp - 1;
    for (let i = 0; i < text.length && lp + 1 + i < limit; i++) c[lp + 1 + i] = text[i];
  }

  // Arrow head
  if (goRight) c[rp] = '>';
  else c[lp] = '<';

  return c.join('');
}

// ——— Tree ———
// Each line is a SINGLE text node (no inline <span>) so the TextRenderer
// places characters sequentially using charDisplayWidth. This avoids
// browser pixel-width mismatches for box-drawing characters.

function renderTree(def: TreeDef): string {
  let html = '<div>';

  for (const root of def.roots) {
    html += `<div style="white-space:pre; font-weight:bold;">${root.text}</div>`;
    html += renderTreeChildren(root.children, '');
  }

  html += '</div>';
  return html;
}

function renderTreeChildren(children: TreeNode[], prefix: string): string {
  let html = '';

  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const isLast = i === children.length - 1;
    const connector = isLast ? '\u2514\u2500\u2500 ' : '\u251C\u2500\u2500 ';
    const color = child.highlight ? 'color:#79c0ff;' : 'color:#8b949e;';

    html += `<div style="white-space:pre; ${color}">${prefix}${connector}${child.text}</div>`;

    const childPrefix = prefix + (isLast ? '    ' : '\u2502   ');
    html += renderTreeChildren(child.children, childPrefix);
  }

  return html;
}
