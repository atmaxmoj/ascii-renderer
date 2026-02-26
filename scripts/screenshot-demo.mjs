#!/usr/bin/env node
/**
 * Screenshot the demo page's "Advanced Combo" example.
 * Usage: node scripts/screenshot-demo.mjs [example-id]
 *
 * Starts Vite dev server, navigates to the demo, clicks the sidebar link,
 * waits for render, screenshots the ASCII output panel, then exits.
 */
import { chromium } from 'playwright';
import { createServer } from 'vite';

const exampleId = process.argv[2] || 'advanced-combo';
const outPath = `screenshots/${exampleId}.png`;

async function main() {
  // Start Vite dev server
  const server = await createServer({ root: process.cwd(), server: { port: 54321, strictPort: true } });
  await server.listen();
  const url = `http://localhost:54321/examples/demo.html`;

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });

  try {
    await page.goto(url, { waitUntil: 'networkidle' });

    // Click sidebar link for the target example
    await page.click(`.sidebar a[data-id="${exampleId}"]`);
    // Wait for canvas to render
    await page.waitForTimeout(1500);

    // Dump text output via the renderer's toString
    const textOutput = await page.evaluate(() => {
      const r = window.__renderer;
      if (r && typeof r.toText === 'function') return r.toText();
      return null;
    });
    if (textOutput) console.log('--- TEXT OUTPUT ---\n' + textOutput + '\n--- END ---');

    // Screenshot the ASCII output panel
    const asciiPanel = await page.$('.ascii-panel');
    if (asciiPanel) {
      const { existsSync, mkdirSync } = await import('fs');
      if (!existsSync('screenshots')) mkdirSync('screenshots');
      await asciiPanel.screenshot({ path: outPath });
      console.log(`Screenshot saved: ${outPath}`);
    } else {
      console.error('Could not find .ascii-panel element');
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
