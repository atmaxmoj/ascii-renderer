/**
 * Built-in Mermaid support for ascii-renderer.
 *
 * Usage: write `<div data-mermaid>graph TD ...</div>` in your HTML.
 * The engine preprocesses these blocks before rendering.
 */

export { parseMermaid } from './parser.js';
export type { FlowchartDef, SequenceDef, TreeDef, TreeNode, MermaidDef } from './parser.js';
export { renderMermaidToHtml } from './renderer.js';

import { parseMermaid } from './parser.js';
import { renderMermaidToHtml } from './renderer.js';

/** Parse Mermaid source and return HTML suitable for ascii-renderer. */
export function mermaidToHtml(src: string): string {
  const def = parseMermaid(src);
  return renderMermaidToHtml(def);
}

/** Replace all `<div data-mermaid>...</div>` blocks with rendered HTML. */
export function preprocessMermaid(html: string): string {
  return html.replace(
    /<div\s+data-mermaid\s*>([\s\S]*?)<\/div>/gi,
    (_, src: string) => mermaidToHtml(src.trim()),
  );
}
