import { describe, it, expect } from 'vitest';
import { parseMermaid, FlowchartDef, SequenceDef, TreeDef } from '../../src/mermaid/parser.js';
import { renderMermaidToHtml } from '../../src/mermaid/renderer.js';
import { mermaidToHtml, preprocessMermaid } from '../../src/mermaid/index.js';

// ——————————————————————————————————————————————
// Parser tests
// ——————————————————————————————————————————————
describe('parseMermaid', () => {
  describe('flowchart', () => {
    it('parses graph TD with nodes and edges', () => {
      const def = parseMermaid(`graph TD
        A["Start"] --> B["End"]
      `);
      expect(def.type).toBe('flowchart');
      const fc = def as FlowchartDef;
      expect(fc.direction).toBe('TD');
      expect(fc.nodes.size).toBe(2);
      expect(fc.nodes.get('A')!.text).toBe('Start');
      expect(fc.nodes.get('B')!.text).toBe('End');
      expect(fc.edges).toHaveLength(1);
      expect(fc.edges[0]).toEqual({ from: 'A', to: 'B', label: '' });
    });

    it('parses graph LR direction', () => {
      const def = parseMermaid(`graph LR
        A --> B
      `);
      expect((def as FlowchartDef).direction).toBe('LR');
    });

    it('parses graph TB as TD', () => {
      const def = parseMermaid(`graph TB
        A --> B
      `);
      expect((def as FlowchartDef).direction).toBe('TD');
    });

    it('parses edge labels', () => {
      const def = parseMermaid(`graph TD
        A -->|yes| B
        B -->|no| C
      `);
      const fc = def as FlowchartDef;
      expect(fc.edges).toHaveLength(2);
      expect(fc.edges[0].label).toBe('yes');
      expect(fc.edges[1].label).toBe('no');
    });

    it('parses nodes without brackets (bare IDs)', () => {
      const def = parseMermaid(`graph TD
        A --> B
      `);
      const fc = def as FlowchartDef;
      expect(fc.nodes.get('A')!.text).toBe('A');
      expect(fc.nodes.get('B')!.text).toBe('B');
    });

    it('parses node text with quotes', () => {
      const def = parseMermaid(`graph TD
        A["Hello World"] --> B[Simple]
      `);
      const fc = def as FlowchartDef;
      expect(fc.nodes.get('A')!.text).toBe('Hello World');
      expect(fc.nodes.get('B')!.text).toBe('Simple');
    });

    it('converts \\n in node text to space', () => {
      const def = parseMermaid(`graph TD
        A["Line1\\nLine2"] --> B
      `);
      const fc = def as FlowchartDef;
      expect(fc.nodes.get('A')!.text).toBe('Line1 Line2');
    });

    it('handles multiple edges forming a chain', () => {
      const def = parseMermaid(`graph TD
        A --> B
        B --> C
        C --> D
      `);
      const fc = def as FlowchartDef;
      expect(fc.nodes.size).toBe(4);
      expect(fc.edges).toHaveLength(3);
    });

    it('parses --- (no arrow) edges', () => {
      const def = parseMermaid(`graph TD
        A --- B
      `);
      const fc = def as FlowchartDef;
      expect(fc.edges).toHaveLength(1);
      expect(fc.edges[0].from).toBe('A');
      expect(fc.edges[0].to).toBe('B');
    });

    it('handles standalone node definitions', () => {
      const def = parseMermaid(`graph TD
        A["Standalone"]
        A --> B
      `);
      const fc = def as FlowchartDef;
      expect(fc.nodes.get('A')!.text).toBe('Standalone');
    });
  });

  describe('sequenceDiagram', () => {
    it('parses participants', () => {
      const def = parseMermaid(`sequenceDiagram
        participant A as "Alice"
        participant B as "Bob"
      `);
      expect(def.type).toBe('sequence');
      const seq = def as SequenceDef;
      expect(seq.participants).toHaveLength(2);
      expect(seq.participants[0]).toEqual({ id: 'A', label: 'Alice' });
      expect(seq.participants[1]).toEqual({ id: 'B', label: 'Bob' });
    });

    it('parses participant without label (uses ID)', () => {
      const def = parseMermaid(`sequenceDiagram
        participant Alice
      `);
      const seq = def as SequenceDef;
      expect(seq.participants[0]).toEqual({ id: 'Alice', label: 'Alice' });
    });

    it('parses solid arrow messages', () => {
      const def = parseMermaid(`sequenceDiagram
        participant A as "Alice"
        participant B as "Bob"
        A->>B: Hello
      `);
      const seq = def as SequenceDef;
      expect(seq.messages).toHaveLength(1);
      expect(seq.messages[0]).toEqual({ from: 'A', to: 'B', text: 'Hello', isDashed: false });
    });

    it('parses dashed arrow messages', () => {
      const def = parseMermaid(`sequenceDiagram
        participant A as "Alice"
        participant B as "Bob"
        A-->>B: Response
      `);
      const seq = def as SequenceDef;
      expect(seq.messages[0].isDashed).toBe(true);
    });

    it('auto-registers participants from messages', () => {
      const def = parseMermaid(`sequenceDiagram
        X->>Y: hello
      `);
      const seq = def as SequenceDef;
      expect(seq.participants).toHaveLength(2);
      expect(seq.participants[0].id).toBe('X');
      expect(seq.participants[1].id).toBe('Y');
    });

    it('does not duplicate participants', () => {
      const def = parseMermaid(`sequenceDiagram
        participant A as "Alice"
        A->>B: msg1
        B->>A: msg2
      `);
      const seq = def as SequenceDef;
      expect(seq.participants).toHaveLength(2);
      expect(seq.messages).toHaveLength(2);
    });

    it('trims message text', () => {
      const def = parseMermaid(`sequenceDiagram
        A->>B:   hello world
      `);
      const seq = def as SequenceDef;
      expect(seq.messages[0].text).toBe('hello world');
    });
  });

  describe('tree', () => {
    it('parses indentation-based tree structure', () => {
      const def = parseMermaid(`tree
Root
  Child1
    Grandchild
  Child2
      `);
      expect(def.type).toBe('tree');
      const tree = def as TreeDef;
      expect(tree.roots).toHaveLength(1);
      expect(tree.roots[0].text).toBe('Root');
      expect(tree.roots[0].children).toHaveLength(2);
      expect(tree.roots[0].children[0].text).toBe('Child1');
      expect(tree.roots[0].children[0].children).toHaveLength(1);
      expect(tree.roots[0].children[0].children[0].text).toBe('Grandchild');
      expect(tree.roots[0].children[1].text).toBe('Child2');
    });

    it('parses [highlight] syntax', () => {
      const def = parseMermaid(`tree
Root
  [Highlighted]
  Normal
      `);
      const tree = def as TreeDef;
      expect(tree.roots[0].children[0].highlight).toBe(true);
      expect(tree.roots[0].children[0].text).toBe('Highlighted');
      expect(tree.roots[0].children[1].highlight).toBe(false);
    });

    it('strips common leading indentation', () => {
      const def = parseMermaid(`tree
        Root
          Child
      `);
      const tree = def as TreeDef;
      expect(tree.roots).toHaveLength(1);
      expect(tree.roots[0].text).toBe('Root');
      expect(tree.roots[0].children[0].text).toBe('Child');
    });

    it('returns empty tree for empty input', () => {
      const def = parseMermaid('tree');
      expect(def.type).toBe('tree');
      expect((def as TreeDef).roots).toHaveLength(0);
    });

    it('handles multiple root nodes', () => {
      const def = parseMermaid(`tree
Root1
  Child1
Root2
  Child2
      `);
      const tree = def as TreeDef;
      expect(tree.roots).toHaveLength(2);
      expect(tree.roots[0].text).toBe('Root1');
      expect(tree.roots[1].text).toBe('Root2');
    });
  });

  describe('edge cases', () => {
    it('returns empty flowchart for empty input', () => {
      const def = parseMermaid('');
      expect(def.type).toBe('flowchart');
      expect((def as FlowchartDef).nodes.size).toBe(0);
    });

    it('returns empty flowchart for unknown directive', () => {
      const def = parseMermaid('unknown diagram');
      expect(def.type).toBe('flowchart');
    });
  });
});

// ——————————————————————————————————————————————
// Renderer tests
// ——————————————————————————————————————————————
describe('renderMermaidToHtml', () => {
  describe('flowchart TD', () => {
    it('generates bordered divs with vertical arrows', () => {
      const def = parseMermaid(`graph TD
        A["Start"] --> B["End"]
      `);
      const html = renderMermaidToHtml(def);
      expect(html).toContain('display:table');
      expect(html).toContain('margin:0 auto');
      expect(html).toContain('Start');
      expect(html).toContain('End');
      expect(html).toContain('border:1px solid');
      expect(html).toContain('|');
      expect(html).toContain('v');
    });

    it('includes edge labels in arrows', () => {
      const def = parseMermaid(`graph TD
        A -->|yes| B
      `);
      const html = renderMermaidToHtml(def);
      expect(html).toContain('yes');
    });
  });

  describe('flowchart LR', () => {
    it('generates horizontal flex layout', () => {
      const def = parseMermaid(`graph LR
        A["Left"] --> B["Right"]
      `);
      const html = renderMermaidToHtml(def);
      expect(html).not.toContain('display:table');
      expect(html).toContain('display:flex');
      expect(html).toContain('Left');
      expect(html).toContain('Right');
      expect(html).toContain('--&gt;');
    });
  });

  describe('sequenceDiagram', () => {
    it('generates participant headers as pre-formatted boxes', () => {
      const def = parseMermaid(`sequenceDiagram
        participant A as "Alice"
        participant B as "Bob"
      `);
      const html = renderMermaidToHtml(def);
      expect(html).toContain('Alice');
      expect(html).toContain('Bob');
      expect(html).toContain('white-space:pre');
      // Box-drawing characters
      expect(html).toContain('┌');
      expect(html).toContain('│');
      expect(html).toContain('└');
    });

    it('generates message rows with arrows', () => {
      const def = parseMermaid(`sequenceDiagram
        participant A as "Alice"
        participant B as "Bob"
        A->>B: Hello
      `);
      const html = renderMermaidToHtml(def);
      expect(html).toContain('Hello');
      expect(html).toContain('>');
    });

    it('generates lifeline spacers', () => {
      const def = parseMermaid(`sequenceDiagram
        A->>B: msg
      `);
      const html = renderMermaidToHtml(def);
      // Lifeline pipes
      expect(html).toContain('|');
    });

  });

  describe('tree', () => {
    it('generates tree lines with box-drawing connectors', () => {
      const def = parseMermaid(`tree
Root
  Child1
  Child2
      `);
      const html = renderMermaidToHtml(def);
      expect(html).toContain('Root');
      expect(html).toContain('├── Child1');
      expect(html).toContain('└── Child2');
      expect(html).toContain('white-space:pre');
    });

    it('generates vertical connector │ for non-last children', () => {
      const def = parseMermaid(`tree
Root
  Child1
    Sub1
  Child2
      `);
      const html = renderMermaidToHtml(def);
      // Child1 is not last, so Sub1's prefix should include │
      expect(html).toContain('│   └── Sub1');
    });

    it('uses spaces (no │) for last child subtrees', () => {
      const def = parseMermaid(`tree
Root
  Child
    Sub
      `);
      const html = renderMermaidToHtml(def);
      // Child is last, so Sub's prefix should be spaces not │
      expect(html).toContain('    └── Sub');
    });

    it('highlights [bracketed] nodes with accent color', () => {
      const def = parseMermaid(`tree
Root
  [Special]
      `);
      const html = renderMermaidToHtml(def);
      expect(html).toContain('color:#79c0ff');
      expect(html).toContain('Special');
    });

    it('renders root node as bold', () => {
      const def = parseMermaid(`tree
Root
      `);
      const html = renderMermaidToHtml(def);
      expect(html).toContain('font-weight:bold');
      expect(html).toContain('Root');
    });
  });

  // (kept for backwards compat — original sequence tests continue below)
  describe('sequenceDiagram (continued)', () => {
    it('returns empty string for no participants', () => {
      const html = renderMermaidToHtml({
        type: 'sequence',
        participants: [],
        messages: [],
      });
      expect(html).toBe('');
    });

    it('handles dashed messages', () => {
      const def = parseMermaid(`sequenceDiagram
        participant A as "Alice"
        participant B as "Bob"
        A-->>B: response
      `);
      const html = renderMermaidToHtml(def);
      expect(html).toContain('response');
      // Dashed arrow uses alternating - and space
      expect(html).toMatch(/- [^ ]/);
    });

    it('handles self-messages', () => {
      const def = parseMermaid(`sequenceDiagram
        participant A as "Alice"
        A->>A: self call
      `);
      const html = renderMermaidToHtml(def);
      expect(html).toContain('self call');
      expect(html).toContain('+--');
    });
  });
});

// ——————————————————————————————————————————————
// Integration tests
// ——————————————————————————————————————————————
describe('mermaidToHtml', () => {
  it('converts flowchart source to HTML', () => {
    const html = mermaidToHtml(`graph TD
      A["Input"] --> B["Output"]
    `);
    expect(html).toContain('Input');
    expect(html).toContain('Output');
    expect(html).toContain('border:1px solid');
  });

  it('converts sequence source to HTML', () => {
    const html = mermaidToHtml(`sequenceDiagram
      participant A as "Alice"
      A->>B: Hello
    `);
    expect(html).toContain('Alice');
    expect(html).toContain('Hello');
  });
});

describe('preprocessMermaid', () => {
  it('replaces data-mermaid blocks with rendered HTML', () => {
    const input = '<div data-mermaid>graph TD\n  A --> B\n</div>';
    const result = preprocessMermaid(input);
    expect(result).not.toContain('data-mermaid');
    expect(result).toContain('border:1px solid');
    expect(result).toContain('display:table');
  });

  it('preserves non-mermaid content unchanged', () => {
    const input = '<div>Hello</div><p>World</p>';
    const result = preprocessMermaid(input);
    expect(result).toBe(input);
  });

  it('handles multiple mermaid blocks', () => {
    const input = `
      <h1>Title</h1>
      <div data-mermaid>graph TD
        A --> B
      </div>
      <p>Between</p>
      <div data-mermaid>graph LR
        C --> D
      </div>
    `;
    const result = preprocessMermaid(input);
    expect(result).not.toContain('data-mermaid');
    expect(result).toContain('Title');
    expect(result).toContain('Between');
    // Both diagrams rendered
    expect(result).toContain('display:table'); // TD
    expect(result).toContain('--&gt;'); // LR arrow
  });

  it('handles data-mermaid with extra whitespace', () => {
    const input = '<div  data-mermaid >graph TD\n  A --> B\n</div>';
    const result = preprocessMermaid(input);
    expect(result).not.toContain('data-mermaid');
    expect(result).toContain('border:1px solid');
  });
});
