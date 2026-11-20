import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderPublicPage } from './navigation.js';
import { holidayPage } from './holiday-page.js';
import { pages } from './assets/content-fields.js';

const output = '_site';
mkdirSync(output, { recursive: true });
cpSync('assets', join(output, 'assets'), { recursive: true });

for (const page of Object.keys(pages)) {
  const path = page + '.html';
  writeFileSync(join(output, path), renderPublicPage(readFileSync(path, 'utf8'), page));
}

const holidays = holidayPage(readFileSync('domestic.html', 'utf8'), readFileSync('international.html', 'utf8'));
writeFileSync(join(output, 'holiday.html'), renderPublicPage(holidays, 'holiday'));

for (const path of ['login.html', 'admin.html', 'admin-enquiries.html']) {
  cpSync(path, join(output, path));
}
writeFileSync(join(output, '.nojekyll'), '');
