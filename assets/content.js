import { getDatabase, onValue, ref } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js';
import { app } from './firebase.js';
import { contentFields, pages, validValue } from './content-fields.js';

const filename = location.pathname.split('/').pop() || 'index.html';
const page = filename.replace(/\.html$/, '');
if (Object.hasOwn(pages, page)) {
  const fields = contentFields(document);
  const applied = new Set();
  onValue(ref(getDatabase(app), 'jasWebsiteContent/' + page), (snapshot) => {
    const overrides = snapshot.val() ?? {};
    for (const field of fields) {
      const value = overrides[field.key];
      if (validValue(field.type, value)) {
        field.apply(value);
        applied.add(field.key);
      } else if (applied.delete(field.key)) {
        field.reset();
      }
    }
  }, (error) => console.warn('JAS content could not load:', error.code));
}
