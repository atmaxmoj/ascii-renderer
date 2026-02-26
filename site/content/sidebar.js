/**
 * Sidebar navigation content rendered by its own AsciiRenderer instance.
 */

const navItems = [
  { group: 'GETTING STARTED', items: [
    { target: 'sec-intro', label: 'Introduction' },
    { target: 'sec-install', label: 'Installation' },
    { target: 'sec-quickstart', label: 'Quick Start' },
    { target: 'sec-api', label: 'API Reference' },
  ]},
  { group: 'ARCHITECTURE', items: [
    { target: 'sec-pipeline', label: 'Render Pipeline' },
    { target: 'sec-modules', label: 'Module Architecture' },
  ]},
  { group: 'SEQUENCES', items: [
    { target: 'sec-seq-init', label: 'Initialization' },
    { target: 'sec-seq-render', label: 'Render' },
    { target: 'sec-seq-click', label: 'Click Interaction' },
    { target: 'sec-seq-input', label: 'Text Input & IME' },
    { target: 'sec-seq-scroll', label: 'Scroll' },
    { target: 'sec-seq-drag', label: 'Drag' },
  ]},
  { group: 'EXAMPLES', items: [
    { target: 'sec-ex-headings', label: 'Headings & Text' },
    { target: 'sec-ex-styles', label: 'Text Styles' },
    { target: 'sec-ex-align', label: 'Text Alignment' },
    { target: 'sec-ex-colors', label: 'Colors' },
    { target: 'sec-ex-borders', label: 'Borders & Boxes' },
    { target: 'sec-ex-flex', label: 'Flex Layout' },
    { target: 'sec-ex-lists', label: 'Lists' },
    { target: 'sec-ex-tables', label: 'Tables' },
    { target: 'sec-ex-buttons', label: 'Buttons' },
    { target: 'sec-ex-input', label: 'Text Input' },
    { target: 'sec-ex-checkbox', label: 'Checkbox & Radio' },
    { target: 'sec-ex-range', label: 'Range Slider' },
    { target: 'sec-ex-select', label: 'Select' },
    { target: 'sec-ex-textarea', label: 'Textarea' },
    { target: 'sec-ex-cjk', label: 'CJK Text' },
    { target: 'sec-ex-form', label: 'Combined Form' },
    { target: 'sec-ex-escape', label: 'Escape Overlay' },
  ]},
];

export function buildSidebar(activeTarget) {
  let html = `
    <div style="padding:8px;">
      <div style="font-weight:bold; color:#f0f6fc;">>&lowbar; ascii-renderer</div>
      <div style="color:#484f58; margin-bottom:8px;">v0.1.2</div>`;

  for (const group of navItems) {
    html += `
      <div style="color:#484f58; font-weight:bold; margin:12px 0 4px;">${group.group}</div>`;
    for (const item of group.items) {
      const isActive = item.target === activeTarget;
      const color = isActive ? '#f0f6fc' : '#8b949e';
      const prefix = isActive ? '>' : ' ';
      html += `
      <div data-target="${item.target}" style="padding:3px 0 3px 4px; color:${color}; cursor:pointer;">${prefix} ${item.label}</div>`;
    }
  }

  html += '</div>';
  return html;
}

export { navItems };
