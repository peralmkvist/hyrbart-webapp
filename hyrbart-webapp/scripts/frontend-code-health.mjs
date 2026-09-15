import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const appDir = path.join(root, 'app');
const componentDir = path.join(root, 'components');
const globalsPath = path.join(appDir, 'globals.css');
const layoutPath = path.join(appDir, 'layout.tsx');

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(fullPath)));
    else files.push(fullPath);
  }

  return files;
}

const roots = [appDir, componentDir];
const files = (await Promise.all(roots.map(walk))).flat();
const cssFiles = files.filter((file) => file.endsWith('.css'));
const cssStats = await Promise.all(
  cssFiles.map(async (file) => ({
    file,
    size: (await stat(file)).size,
    content: await readFile(file, 'utf8'),
  })),
);

const globals = await readFile(globalsPath, 'utf8');
const layout = await readFile(layoutPath, 'utf8');
const globalCssImports = [...layout.matchAll(/^import ['"](.+\.css)['"];?$/gm)].map((match) => match[1]);
const duplicateImports = globalCssImports.filter((value, index) => globalCssImports.indexOf(value) !== index);
const importantCount = cssStats.reduce(
  (total, file) => total + (file.content.match(/!important\b/g) ?? []).length,
  0,
);
const suspiciousPatchFiles = cssStats
  .map(({ file }) => path.relative(root, file))
  .filter((file) => /(?:fix(?:es)?|polish)\.css$/i.test(file));
const largeCssFiles = cssStats
  .filter(({ size }) => size > 12_000)
  .map(({ file, size }) => ({ file: path.relative(root, file), size }));

const failures = [];

if (Buffer.byteLength(globals) > 4_096) {
  failures.push(`app/globals.css is ${Buffer.byteLength(globals)} bytes; keep it at or below 4096 bytes.`);
}
if (/^\s*\.[A-Za-z_-]/m.test(globals)) {
  failures.push('app/globals.css contains class selectors; move feature/component selectors to an owning stylesheet.');
}
if (duplicateImports.length > 0) {
  failures.push(`app/layout.tsx imports duplicate global stylesheets: ${[...new Set(duplicateImports)].join(', ')}`);
}
if (globalCssImports[0] !== './globals.css') {
  failures.push('app/layout.tsx must import ./globals.css first.');
}
if (!globalCssImports.includes('./tokens.css')) {
  failures.push('app/layout.tsx must import ./tokens.css.');
}
if (!globalCssImports.includes('./legacy-ui.css')) {
  failures.push('app/layout.tsx must import ./legacy-ui.css until the legacy selectors are fully migrated.');
}

console.log('Frontend code-health audit');
console.log(`- CSS files: ${cssStats.length}`);
console.log(`- CSS bytes: ${cssStats.reduce((total, file) => total + file.size, 0)}`);
console.log(`- globals.css bytes: ${Buffer.byteLength(globals)}`);
console.log(`- global stylesheet imports: ${globalCssImports.length}`);
console.log(`- !important declarations: ${importantCount}`);
console.log(`- patch/polish stylesheets: ${suspiciousPatchFiles.length}`);

if (largeCssFiles.length > 0) {
  console.log('- CSS files over 12 KB:');
  for (const file of largeCssFiles) console.log(`  - ${file.file}: ${file.size} bytes`);
}

if (suspiciousPatchFiles.length > 0) {
  console.log('- Remaining migration debt (reported, not failed):');
  for (const file of suspiciousPatchFiles) console.log(`  - ${file}`);
}

if (failures.length > 0) {
  console.error('\nCode-health gate failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('\nCode-health gate passed.');
