/**
 * CSS styles injected into the renderer's shadow DOM.
 * Primarily styles the data-ascii-escape (native HTML) blocks.
 */
export const styles = `
<style>
  [data-ascii-escape] {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    color: #c9d1d9;
  }
  [data-ascii-escape] button {
    padding: 4px 12px;
    background: #21262d;
    color: #c9d1d9;
    border: 1px solid #30363d;
    border-radius: 4px;
    cursor: pointer;
    margin-right: 4px;
    font-size: 13px;
  }
  [data-ascii-escape] button:hover {
    background: #30363d;
  }
  [data-ascii-escape] input[type="text"],
  [data-ascii-escape] input[type="password"],
  [data-ascii-escape] input[type="number"] {
    background: #0d1117;
    color: #c9d1d9;
    border: 1px solid #30363d;
    padding: 3px 6px;
    border-radius: 4px;
    font-size: 13px;
  }
  [data-ascii-escape] input[type="range"] {
    accent-color: #58a6ff;
  }
  [data-ascii-escape] input[type="checkbox"],
  [data-ascii-escape] input[type="radio"] {
    accent-color: #58a6ff;
  }
  [data-ascii-escape] select {
    background: #0d1117;
    color: #c9d1d9;
    border: 1px solid #30363d;
    padding: 3px 6px;
    border-radius: 4px;
    font-size: 13px;
  }
  [data-ascii-escape] textarea {
    background: #0d1117;
    color: #c9d1d9;
    border: 1px solid #30363d;
    padding: 3px 6px;
    border-radius: 4px;
    font-size: 13px;
    font-family: inherit;
  }
  [data-ascii-escape] table { border-collapse: collapse; }
  [data-ascii-escape] th {
    background: #161b22;
    border: 1px solid #30363d;
    padding: 4px 8px;
    text-align: left;
  }
  [data-ascii-escape] td {
    border: 1px solid #30363d;
    padding: 4px 8px;
  }
  [data-ascii-escape] a { color: #58a6ff; }
  [data-ascii-escape] label { margin-right: 4px; }
  [data-ascii-escape] ul, [data-ascii-escape] ol { padding-left: 20px; }
  [data-ascii-escape] hr { border-color: #30363d; }
  [data-ascii-escape] h1 { font-size: 20px; margin: 4px 0; }
  [data-ascii-escape] h2 { font-size: 16px; margin: 4px 0; }
  [data-ascii-escape] h3 { font-size: 14px; margin: 4px 0; }
  [data-ascii-escape] p { margin: 4px 0; }
  [data-ascii-escape] code {
    background: #161b22;
    padding: 2px 4px;
    border-radius: 3px;
    font-size: 12px;
  }
</style>`;
