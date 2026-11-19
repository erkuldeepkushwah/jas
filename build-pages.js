import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { linkLogin } from './navigation.js';
import { pages } from './assets/content-fields.js';

const output = '_site';
mkdirSync(output, { recursive: true });
cpSync('assets', join(output, 'assets'), { recursive: true });

for (const page of Object.keys(pages)) {
  const path = page + '.html';
  const html = linkLogin(readFileSync(path, 'utf8'), 'login.html');
  const content = html.replace(/<\/body>/i, '<script type="module" src="assets/content.js"></script></body>');
  writeFileSync(join(output, path), content);
}

for (const path of ['login.html', 'admin.html']) {
  cpSync(path, join(output, path));
}
writeFileSync(join(output, '.nojekyll'), '');
