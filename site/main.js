import { AsciiRenderer } from 'ascii-renderer';
import { styles } from './content/styles.js';
import { gettingStarted } from './content/getting-started.js';
import { architecture } from './content/architecture.js';
import { sequences } from './content/sequences.js';
import { examples } from './content/examples.js';
import { buildSidebar, navItems } from './content/sidebar.js';

// Wait for JetBrains Mono to load before measuring character cells
await document.fonts.ready;

const theme = { fg: '#c9d1d9', bg: '#0d1117', border: '#30363d' };

// ——— Sidebar renderer (fixed, no scroll) ———
const sidebarEl = document.getElementById('sidebar');
const sidebar = new AsciiRenderer({
  target: sidebarEl,
  cols: 28,
  rows: 50,
  fontSize: 13,
  theme: { ...theme, bg: '#010409' },
  autoResize: true,
});

let activeTarget = null;

function renderSidebar() {
  sidebar.setContent(buildSidebar(activeTarget));
}
renderSidebar();

// ——— Main content renderer (scrollable) ———
const appEl = document.getElementById('app');
const main = new AsciiRenderer({
  target: appEl,
  cols: 120,
  rows: 50,
  fontSize: 13,
  theme,
  autoResize: true,
});

const content = `
${styles}
<div style="padding:8px 16px;">
  ${gettingStarted}
  ${architecture}
  ${sequences}
  ${examples}
</div>`;

main.setContent(content);
window.__main = main;

// ——— Collect all section IDs for scroll tracking ———
const allTargets = navItems.flatMap(g => g.items.map(i => i.target));

function updateActiveFromScroll() {
  const scrollY = main.getScrollY();
  let best = null;
  for (const target of allTargets) {
    const row = main.getElementRow(target);
    if (row >= 0 && row <= scrollY + 2) {
      best = target;
    }
  }
  if (best && best !== activeTarget) {
    activeTarget = best;
    renderSidebar();
  }
}

// ——— Sidebar click-to-scroll navigation ———
sidebar.on('click', (e) => {
  const target = e.element?.dataset?.target
    || e.element?.closest?.('[data-target]')?.dataset?.target;
  if (!target) return;

  const row = main.getElementRow(target);
  if (row >= 0) {
    main.scrollTo(row);
  }

  activeTarget = target;
  renderSidebar();
});

// ——— Sync sidebar highlight on main content scroll ———
main.on('wheel', () => {
  updateActiveFromScroll();
});
