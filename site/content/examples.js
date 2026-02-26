import { heading, comparison } from '../utils.js';

const items = [
  {
    id: 'sec-ex-headings',
    title: 'Headings & Text',
    html: `<div style="padding:4px;">
  <h1 style="font-size:18px; font-weight:bold; margin:2px 0;">Welcome</h1>
  <h2 style="font-size:14px; font-weight:bold; margin:2px 0;">Subtitle here</h2>
  <p style="margin:4px 0;">A paragraph of text that demonstrates how the renderer handles content.</p>
</div>`,
  },
  {
    id: 'sec-ex-styles',
    title: 'Text Styles',
    html: `<div style="padding:4px;">
  <p><strong>Bold text</strong></p>
  <p><em>Italic text</em></p>
  <p><u>Underlined text</u></p>
  <p><a href="#">Link text</a></p>
  <p><code>code snippet</code></p>
  <p><strong><em>Bold + Italic</em></strong></p>
</div>`,
  },
  {
    id: 'sec-ex-align',
    title: 'Text Alignment',
    html: `<div style="padding:4px;">
  <div style="border:1px solid #666; padding:4px; text-align:left;">Left aligned</div>
  <div style="border:1px solid #666; padding:4px; text-align:center;">Centered text</div>
  <div style="border:1px solid #666; padding:4px; text-align:right;">Right aligned</div>
</div>`,
  },
  {
    id: 'sec-ex-colors',
    title: 'Colors',
    html: `<div style="padding:4px;">
  <div style="border:1px solid #e74c3c; padding:4px; color:#e74c3c;">Red border + text</div>
  <div style="border:1px solid #2ecc71; padding:4px; color:#2ecc71; background:#1a3a2a;">Green on dark bg</div>
  <div style="display:flex; gap:4px;">
    <div style="flex:1; border:1px solid #3498db; padding:4px; color:#3498db; text-align:center;">Blue</div>
    <div style="flex:1; border:1px solid #e67e22; padding:4px; color:#e67e22; text-align:center;">Orange</div>
    <div style="flex:1; border:1px solid #9b59b6; padding:4px; color:#9b59b6; text-align:center;">Purple</div>
  </div>
</div>`,
  },
  {
    id: 'sec-ex-borders',
    title: 'Borders & Boxes',
    html: `<div style="padding:4px;">
  <div style="border:1px solid #666; padding:4px; margin-bottom:4px;">Solid border</div>
  <div style="border:1px dashed #666; padding:4px; margin-bottom:4px;">Dashed border</div>
  <div style="border:3px double #666; padding:4px;">Double border</div>
</div>`,
  },
  {
    id: 'sec-ex-flex',
    title: 'Flex Layout',
    html: `<div style="display:flex; gap:4px; padding:4px;">
  <div style="flex:1; border:1px solid #666; padding:4px;">Column A</div>
  <div style="flex:1; border:1px solid #666; padding:4px;">Column B</div>
  <div style="flex:1; border:1px solid #666; padding:4px;">Column C</div>
</div>`,
  },
  {
    id: 'sec-ex-lists',
    title: 'Lists',
    html: `<div style="display:flex; gap:16px; padding:4px;">
  <ul>
    <li>First item</li>
    <li>Second item</li>
    <li>Third item</li>
  </ul>
  <ol>
    <li>Step one</li>
    <li>Step two</li>
    <li>Step three</li>
  </ol>
</div>`,
  },
  {
    id: 'sec-ex-tables',
    title: 'Tables',
    html: `<table style="border-collapse:collapse;">
  <tr>
    <th style="border:1px solid #555; padding:4px;">Name</th>
    <th style="border:1px solid #555; padding:4px;">Role</th>
    <th style="border:1px solid #555; padding:4px;">Status</th>
  </tr>
  <tr>
    <td style="border:1px solid #444; padding:4px;">Alice</td>
    <td style="border:1px solid #444; padding:4px;">Engineer</td>
    <td style="border:1px solid #444; padding:4px;">Active</td>
  </tr>
  <tr>
    <td style="border:1px solid #444; padding:4px;">Bob</td>
    <td style="border:1px solid #444; padding:4px;">Designer</td>
    <td style="border:1px solid #444; padding:4px;">Away</td>
  </tr>
</table>`,
  },
  {
    id: 'sec-ex-buttons',
    title: 'Buttons',
    html: `<div style="padding:4px;">
  <button>Submit</button>
  <button>Cancel</button>
  <button>Reset</button>
</div>`,
  },
  {
    id: 'sec-ex-input',
    title: 'Text Input',
    html: `<div style="padding:4px;">
  <div style="margin:4px 0;"><label>Name: </label><input type="text" value="John" style="width:160px;"></div>
  <div style="margin:4px 0;"><label>Password: </label><input type="password" value="secret" style="width:160px;"></div>
  <div style="margin:4px 0;"><label>Amount: </label><input type="number" value="42" style="width:80px;"></div>
</div>`,
  },
  {
    id: 'sec-ex-checkbox',
    title: 'Checkbox & Radio',
    html: `<div style="padding:4px;">
  <div style="margin:2px 0;"><input type="checkbox" checked> Remember me</div>
  <div style="margin:2px 0;"><input type="checkbox"> Subscribe</div>
  <hr style="border-color:#444; margin:4px 0;">
  <div style="margin:2px 0;"><input type="radio" name="opt" checked> Option A</div>
  <div style="margin:2px 0;"><input type="radio" name="opt"> Option B</div>
  <div style="margin:2px 0;"><input type="radio" name="opt"> Option C</div>
</div>`,
  },
  {
    id: 'sec-ex-range',
    title: 'Range Slider',
    html: `<div style="padding:4px;">
  <label>Volume: </label>
  <input type="range" min="0" max="100" value="60" style="width:200px;">
</div>`,
  },
  {
    id: 'sec-ex-select',
    title: 'Select',
    html: `<div style="padding:4px;">
  <label>Country: </label>
  <select style="width:140px;">
    <option>United States</option>
    <option>Canada</option>
    <option>United Kingdom</option>
  </select>
</div>`,
  },
  {
    id: 'sec-ex-textarea',
    title: 'Textarea',
    html: `<div style="padding:4px;">
  <textarea rows="3" cols="30" style="width:240px;">Type your message here...</textarea>
</div>`,
  },
  {
    id: 'sec-ex-cjk',
    title: 'CJK Text',
    html: `<div style="padding:4px;">
  <div style="border:1px solid #666; padding:4px; text-align:center;">中文标题 — CJK Title</div>
  <div style="border:1px solid #666; padding:4px; margin-top:4px;">
    <div>你好世界 Hello World</div>
    <div>こんにちは 日本語テスト</div>
    <div>안녕하세요 한국어</div>
  </div>
</div>`,
  },
  {
    id: 'sec-ex-form',
    title: 'Combined Form',
    html: `<div style="border:1px solid #666; padding:8px;">
  <h2 style="font-size:14px; font-weight:bold; margin:2px 0;">Contact Us</h2>
  <div style="margin:4px 0;"><label>Name: </label><input type="text" value="" style="width:160px;"></div>
  <div style="margin:4px 0;"><label>Email: </label><input type="text" value="" style="width:160px;"></div>
  <div style="margin:4px 0;"><textarea rows="2" cols="30" style="width:220px;">Your message...</textarea></div>
  <div style="margin:4px 0;"><input type="checkbox"> Subscribe to newsletter</div>
  <div style="margin:4px 0;"><button>Send</button> <button>Clear</button></div>
</div>`,
  },
  {
    id: 'sec-ex-escape',
    title: 'Escape Overlay',
    html: `<div style="padding:4px;">
  <p style="margin:4px 0;">Text above is ASCII.</p>
  <div data-ascii-escape style="margin:4px 0; padding:8px; background:#222; border:1px solid #555; border-radius:6px; width:260px;">
    <p style="margin:0 0 4px; color:#8cf;">This is native HTML (escaped)</p>
    <button style="padding:4px 8px; background:#2a6; color:#fff; border:none; border-radius:4px; cursor:pointer;">Native Btn</button>
  </div>
  <p style="margin:4px 0;">Text below is ASCII again.</p>
</div>`,
  },
];

export const examples = heading('Element Examples', 'sec-examples')
  + `<p style="margin:6px 0 16px; color:#8b949e;">Each example renders the same HTML as both ASCII art (left) and native browser HTML (right).</p>`
  + items.map(item => comparison(item.title, item.html, item.id)).join('\n');
