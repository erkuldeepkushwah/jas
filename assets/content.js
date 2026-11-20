import { readContent } from './supabase-content.js';
import { contentFields, pages, previewFields, validValue } from './content-fields.js';

const filename = location.pathname.split('/').pop() || 'index.html';
const page = filename.replace(/\.html$/, '');
if (page === 'holiday') {
  showHolidayContent();
} else if (Object.hasOwn(pages, page)) {
  const fields = contentFields(document);
  if (window.parent !== window) document[previewFields] = fields;
  readContent(page).then((overrides) => {
    for (const field of fields) {
      const value = overrides[field.key];
      if (validValue(field.type, value)) field.apply(value);
    }
  }).catch((error) => console.warn('JAS content could not load:', error.message));
}

function showHolidayContent() {
  const fields = contentFields(document);
  const sections = [
    { page: 'domestic', id: 'packages' },
    { page: 'international', id: 'international' }
  ];
  for (const { page: sourcePage, id } of sections) {
    const target = document.getElementById(id);
    if (!target) continue;
    const targetFields = fields.filter(({ element }) => target.contains(element));
    applyHolidaySection(sourcePage, id, targetFields).catch((error) => {
      console.warn('JAS holiday content could not load:', error.message);
    });
  }
}

async function applyHolidaySection(sourcePage, id, targets) {
  const overrides = await readContent(sourcePage);
  if (!Object.keys(overrides).length) return;
  const response = await fetch(sourcePage + '.html');
  if (!response.ok) throw new Error('Package source page unavailable');
  const source = new DOMParser().parseFromString(await response.text(), 'text/html');
  const section = source.getElementById(id);
  const originals = contentFields(source).filter(({ element }) => section?.contains(element));
  if (originals.length !== targets.length || originals.some((field, index) => {
    const target = targets[index];
    return field.type !== target.type ||
      (field.value !== target.value && !target.element.matches('h2.jas-h2'));
  })) return;

  originals.forEach((field, index) => {
    const value = overrides[field.key];
    if (validValue(field.type, value)) targets[index].apply(value);
  });
}
