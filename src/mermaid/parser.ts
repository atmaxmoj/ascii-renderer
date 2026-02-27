/**
 * Lightweight Mermaid syntax parser.
 * Supports: graph TD/LR (flowchart), sequenceDiagram, tree.
 */

export type FlowchartDef = {
  type: 'flowchart';
  direction: 'TD' | 'LR';
  nodes: Map<string, { id: string; text: string }>;
  edges: { from: string; to: string; label: string }[];
};

export type SequenceDef = {
  type: 'sequence';
  participants: { id: string; label: string }[];
  messages: { from: string; to: string; text: string; isDashed: boolean }[];
};

export type TreeNode = {
  text: string;
  highlight: boolean;
  children: TreeNode[];
};

export type TreeDef = {
  type: 'tree';
  roots: TreeNode[];
};

export type MermaidDef = FlowchartDef | SequenceDef | TreeDef;

export function parseMermaid(src: string): MermaidDef {
  const rawLines = src.trim().split('\n');
  const firstLine = rawLines[0]?.trim() ?? '';

  // Tree: preserve indentation for depth parsing
  if (firstLine === 'tree') {
    return parseTree(rawLines.slice(1));
  }

  const lines = rawLines.map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    return { type: 'flowchart', direction: 'TD', nodes: new Map(), edges: [] };
  }

  const directive = lines[0];

  if (directive.startsWith('graph ')) {
    return parseFlowchart(directive, lines.slice(1));
  }
  if (directive === 'sequenceDiagram') {
    return parseSequenceDiagram(lines.slice(1));
  }

  // Fallback: treat as single-node flowchart
  return { type: 'flowchart', direction: 'TD', nodes: new Map(), edges: [] };
}

function parseFlowchart(directive: string, lines: string[]): FlowchartDef {
  const dirStr = directive.replace('graph', '').trim().toUpperCase();
  const direction: 'TD' | 'LR' = dirStr === 'LR' ? 'LR' : 'TD';

  const nodes = new Map<string, { id: string; text: string }>();
  const edges: FlowchartDef['edges'] = [];

  for (const line of lines) {
    // Edge patterns: A --> B, A -->|label| B, A --- B, A -.-> B, A ==> B
    const edgeMatch = line.match(
      /^(\w+)(?:\[.*?\])?\s*(-->|---|-\.->|==>)(?:\|([^|]*)\|)?\s*(\w+)(?:\[.*?\])?/
    );
    if (edgeMatch) {
      const [, fromId, , label, toId] = edgeMatch;
      edges.push({ from: fromId, to: toId, label: label || '' });

      // Extract node definitions from edge line
      const fromNodeMatch = line.match(new RegExp(`^${fromId}(\\["[^"]*"\\]|\\[[^\\]]*\\])`));
      if (fromNodeMatch) addNodeDef(fromId, fromNodeMatch[1], nodes);
      const toNodeMatch = line.match(new RegExp(`${toId}(\\["[^"]*"\\]|\\[[^\\]]*\\])`));
      if (toNodeMatch) addNodeDef(toId, toNodeMatch[1], nodes);

      // Ensure nodes exist even without bracket definitions
      if (!nodes.has(fromId)) nodes.set(fromId, { id: fromId, text: fromId });
      if (!nodes.has(toId)) nodes.set(toId, { id: toId, text: toId });
      continue;
    }

    // Standalone node: A["text"] or A[text]
    const nodeMatch = line.match(/^(\w+)(\["[^"]*"\]|\[[^\]]*\])/);
    if (nodeMatch) {
      addNodeDef(nodeMatch[1], nodeMatch[2], nodes);
    }
  }

  return { type: 'flowchart', direction, nodes, edges };
}

function addNodeDef(id: string, bracket: string, nodes: Map<string, { id: string; text: string }>): void {
  let text = bracket.slice(1, -1);
  if (text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1);
  // Replace \n with space (ASCII boxes render single-line)
  text = text.replace(/\\n/g, ' ');
  nodes.set(id, { id, text });
}

function parseSequenceDiagram(lines: string[]): SequenceDef {
  const participants: SequenceDef['participants'] = [];
  const participantSet = new Set<string>();
  const messages: SequenceDef['messages'] = [];

  for (const line of lines) {
    // participant A as "Label" or participant A as Label
    const partMatch = line.match(/^participant\s+(\w+)(?:\s+as\s+"?([^"]*)"?)?/);
    if (partMatch) {
      const id = partMatch[1];
      const label = partMatch[2] || id;
      if (!participantSet.has(id)) {
        participantSet.add(id);
        participants.push({ id, label });
      }
      continue;
    }

    // A->>B: message  or  A-->>B: message  or  A->B: message  or  A-->B: message
    const msgMatch = line.match(/^(\w+)\s*(->>|-->>|->|-->)\s*\+?(\w+)\s*:\s*(.*)/);
    if (msgMatch) {
      const [, from, arrow, to, text] = msgMatch;
      const isDashed = arrow.startsWith('--');

      // Auto-register participants
      for (const id of [from, to]) {
        if (!participantSet.has(id)) {
          participantSet.add(id);
          participants.push({ id, label: id });
        }
      }

      messages.push({ from, to, text: text.trim(), isDashed });
    }
  }

  return { type: 'sequence', participants, messages };
}

function parseTree(rawLines: string[]): TreeDef {
  const lines = rawLines.filter(l => l.trim().length > 0);
  if (lines.length === 0) return { type: 'tree', roots: [] };

  // Strip common leading indentation
  const minIndent = Math.min(...lines.map(l => l.match(/^(\s*)/)![0].length));
  const stripped = lines.map(l => l.slice(minIndent));

  // Detect indent unit from first indented line
  let indentUnit = 2;
  for (const line of stripped) {
    const spaces = line.match(/^(\s+)/)?.[0].length ?? 0;
    if (spaces > 0) { indentUnit = spaces; break; }
  }

  const roots: TreeNode[] = [];
  const stack: { node: TreeNode; depth: number }[] = [];

  for (const line of stripped) {
    const spaces = line.match(/^(\s*)/)![0].length;
    const depth = Math.round(spaces / indentUnit);
    let text = line.trim();

    // [Name] = highlighted node
    let highlight = false;
    if (text.startsWith('[') && text.endsWith(']')) {
      text = text.slice(1, -1);
      highlight = true;
    }

    const node: TreeNode = { text, highlight, children: [] };

    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }

    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }

    stack.push({ node, depth });
  }

  return { type: 'tree', roots };
}
