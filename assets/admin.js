import { getAuth, onIdTokenChanged } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js';
import { get, getDatabase, ref, update } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js';
import { app, isJasAdmin } from './firebase.js';
import { contentFields, pages, validValue } from './content-fields.js';

const status = document.querySelector('#status');
const editor = document.querySelector('#editor');
const workspace = document.querySelector('#workspace');
const pageNav = document.querySelector('#pages');
const preview = document.querySelector('#preview');
const edit = document.querySelector('#edit');
const cancel = document.querySelector('#cancel');
const search = document.querySelector('#search');
const publish = document.querySelector('#publish');
const fields = document.querySelector('#fields');
const database = getDatabase(app);
let current;
let selectedPage;
let publishing = false;

for (const [id, label] of Object.entries(pages)) {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.page = id;
  button.textContent = label;
  button.addEventListener('click', () => selectPage(id));
  pageNav.append(button);
}

function canCloseEditor() {
  if (publishing) return false;
  const hasDraft = current?.entries.some(({ input, saved }) => input.value !== saved);
  return !hasDraft || window.confirm('Discard unpublished changes on this page?');
}

function closeEditor() {
  current = null;
  editor.hidden = true;
  fields.replaceChildren();
  edit.setAttribute('aria-expanded', 'false');
}

function selectPage(page, alreadyLoaded = false) {
  if (page === selectedPage || !canCloseEditor()) return;
  closeEditor();
  selectedPage = page;
  for (const button of pageNav.children) {
    if (button.dataset.page === page) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  }
  preview.title = pages[page] + ' website preview';
  if (!alreadyLoaded) preview.src = page + '.html';
  status.textContent = 'Viewing ' + pages[page] + '.';
}

preview.addEventListener('load', () => {
  if (workspace.hidden) return;
  try {
    const url = new URL(preview.contentWindow.location.href);
    const page = url.pathname.split('/').pop().replace(/\.html$/, '') || 'index';
    if (!Object.hasOwn(pages, page) || url.origin !== location.origin) {
      edit.disabled = true;
      return;
    }
    if (page !== selectedPage) {
      selectPage(page, true);
      if (page !== selectedPage) preview.src = selectedPage + '.html';
    }
    edit.disabled = false;
  } catch {
    edit.disabled = true;
  }
});

edit.addEventListener('click', () => {
  if (!selectedPage || !editor.hidden) return;
  editor.hidden = false;
  edit.setAttribute('aria-expanded', 'true');
  loadPage(selectedPage);
  search.focus();
});
cancel.addEventListener('click', () => {
  if (!canCloseEditor()) return;
  closeEditor();
  status.textContent = 'Viewing ' + pages[selectedPage] + '.';
  edit.focus();
});

function filter() {
  const query = search.value.trim().toLowerCase();
  for (const { row, input, field } of current?.entries ?? []) {
    row.hidden = ![input.value, field.value, field.type].some((value) => value.toLowerCase().includes(query));
  }
}

async function loadPage(page) {
  const state = { page, entries: [] };
  current = state;
  fields.replaceChildren();
  search.value = '';
  publish.disabled = true;
  status.textContent = 'Loading ' + pages[page] + '…';
  try {
    const [response, snapshot] = await Promise.all([
      fetch(page + '.html'), get(ref(database, 'jasWebsiteContent/' + page))
    ]);
    if (!response.ok) throw new Error('Page unavailable');
    const source = new DOMParser().parseFromString(await response.text(), 'text/html');
    if (current !== state) return;
    const overrides = snapshot.val() ?? {};
    for (const field of contentFields(source)) {
      const row = document.createElement('label');
      row.append(field.type);
      const input = document.createElement('textarea');
      input.rows = field.type === 'Text' ? 2 : 1;
      input.maxLength = 4000;
      input.value = overrides[field.key] ?? field.value;
      row.append(input);
      fields.append(row);
      state.entries.push({ row, input, field, saved: input.value });
    }
    publish.disabled = false;
    status.textContent = 'Editing ' + pages[page] + '. Changes appear on the website after publishing.';
  } catch {
    if (current === state) status.textContent = 'Could not load page content. Check the Firebase database settings and try again.';
  }
}

search.addEventListener('input', filter);

editor.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (publish.disabled || !current) return;
  const state = current;
  const changes = {};
  const edited = [];
  for (const entry of state.entries) {
    const value = entry.input.value;
    if (value === entry.saved) continue;
    if (value !== entry.field.value && !validValue(entry.field.type, value)) {
      status.textContent = 'Enter valid ' + entry.field.type.toLowerCase() + ' before publishing.';
      search.value = '';
      filter();
      entry.input.focus();
      return;
    }
    changes[entry.field.key] = value === entry.field.value ? null : value;
    edited.push({ entry, value });
  }
  if (!edited.length) {
    status.textContent = 'No changes to publish.';
    return;
  }
  publish.disabled = true;
  publishing = true;
  cancel.disabled = true;
  try {
    await update(ref(database, 'jasWebsiteContent/' + state.page), changes);
    for (const { entry, value } of edited) entry.saved = value;
    status.textContent = 'Published changes for ' + pages[state.page] + '.';
  } catch {
    status.textContent = 'Publish failed. Check your admin access and connection, then try again.';
  } finally {
    publishing = false;
    cancel.disabled = false;
    publish.disabled = !current;
  }
});

let accessCheck = 0;
onIdTokenChanged(getAuth(app), async (user) => {
  const check = ++accessCheck;
  try {
    const token = user && await user.getIdTokenResult();
    if (check !== accessCheck) return;
    if (isJasAdmin(token?.claims)) {
      workspace.hidden = false;
      if (!selectedPage) selectPage('index');
      return;
    }
    status.textContent = user ? 'This account does not have JAS admin access.' : 'Log in with your JAS admin account.';
  } catch {
    if (check !== accessCheck) return;
    status.textContent = 'Could not verify admin access. Reload the page to try again.';
  }
  workspace.hidden = true;
  closeEditor();
  selectedPage = null;
  preview.removeAttribute('src');
});
