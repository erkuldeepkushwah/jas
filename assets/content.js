import { readContent } from './supabase-content.js';
import { contentFields, pages, previewFields, validValue } from './content-fields.js';

const filename = location.pathname.split('/').pop() || 'index.html';
const page = filename.replace(/\.html$/, '');
if (Object.hasOwn(pages, page)) {
  const fields = contentFields(document);
  if (window.parent !== window) document[previewFields] = fields;
  readContent(page).then((overrides) => {
    for (const field of fields) {
      const value = overrides[field.key];
      if (validValue(field.type, value)) field.apply(value);
    }
  }).catch((error) => console.warn('JAS content could not load:', error.message));
}
