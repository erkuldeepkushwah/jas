import { getAuth, onIdTokenChanged } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js';
import { get, getDatabase, ref, update } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js';
import { app, isJasAdmin } from './firebase.js';
import { pages, previewFields, validValue } from './content-fields.js';

const status = document.querySelector('#status');
const editor = document.querySelector('#editor');
const workspace = document.querySelector('#workspace');
const pageNav = document.querySelector('#pages');
const preview = document.querySelector('#preview');
const edit = document.querySelector('#edit');
const cancel = document.querySelector('#cancel');
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
  const hasDraft = current?.entries.some(({ value, saved }) => value !== saved);
  return !hasDraft || window.confirm('Discard unpublished changes on this page?');
}

function highlight(state, element) {
  if (state.marked) state.marked.classList.remove('jas-admin-selection');
  state.marked = element;
  if (element) element.classList.add('jas-admin-selection');
}

function closeEditor() {
  if (current) {
    current.listeners.abort();
    highlight(current);
    for (const { field, value, saved } of current.entries) {
      if (value !== saved) {
        if (saved === field.value) field.reset();
        else field.apply(saved);
      }
    }
  }
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
  if (!alreadyLoaded) edit.disabled = true;
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
    edit.disabled = !preview.contentDocument?.[previewFields]?.length;
  } catch {
    edit.disabled = true;
  }
});

edit.addEventListener('click', () => {
  if (!selectedPage || !editor.hidden) return;
  editor.hidden = false;
  edit.setAttribute('aria-expanded', 'true');
  loadPage(selectedPage);
  cancel.focus();
});
cancel.addEventListener('click', () => {
  if (!canCloseEditor()) return;
  closeEditor();
  status.textContent = 'Viewing ' + pages[selectedPage] + '.';
  edit.focus();
});

function showDetails(state, selection) {
  fields.replaceChildren();
  for (const entry of selection) {
    const { field } = entry;
    const row = document.createElement('label');
    row.append(field.type);
    const input = document.createElement('textarea');
    input.rows = field.type === 'Text' ? 3 : 2;
    input.maxLength = 4000;
    input.value = entry.value;
    row.append(input);
    fields.append(row);

    const thumbnail = field.type === 'Image URL' ? document.createElement('img') : null;
    if (thumbnail) {
      thumbnail.alt = field.element.alt || 'Selected photo';
      row.prepend(thumbnail);
    }
    function showImage(value) {
      if (thumbnail && validValue(field.type, value)) {
        thumbnail.src = new URL(value, state.doc.baseURI).href;
      }
    }
    showImage(entry.value);
    input.addEventListener('input', () => {
      entry.value = input.value;
      if (entry.value === field.value) field.reset();
      else if (validValue(field.type, entry.value)) field.apply(entry.value);
      showImage(entry.value);
    });
  }
}

function pickItem(event, state) {
  event.preventDefault();
  event.stopImmediatePropagation();
  let element = event.target;
  while (element && element !== state.doc.body) {
    const isCard = element.matches?.('.jas-card, article');
    const selection = state.entries.filter(({ field }) =>
      field.element === element || (isCard && element.contains(field.element))
    );
    if (selection.length) {
      highlight(state, element);
      const link = element.closest('a[href]');
      const linkDetails = link && link !== element
        ? state.entries.filter(({ field }) => field.element === link)
        : [];
      showDetails(state, [...selection, ...linkDetails]);
      status.textContent = 'Editing ' + pages[state.page] + '.';
      return;
    }
    element = element.parentElement;
  }
  status.textContent = 'Choose a photo, text or link within this page.';
}

async function loadPage(page) {
  const doc = preview.contentDocument;
  if (!doc?.[previewFields]?.length) {
    closeEditor();
    status.textContent = 'Wait for the page preview to finish loading.';
    return;
  }
  const editable = doc[previewFields];
  const state = { page, doc, listeners: new AbortController(), entries: [] };
  current = state;
  fields.replaceChildren();
  publish.disabled = true;
  status.textContent = 'Loading ' + pages[page] + '…';
  doc.addEventListener('click', (event) => pickItem(event, state), {
    capture: true, signal: state.listeners.signal
  });
  if (!doc.getElementById('jas-admin-preview-style')) {
    const style = doc.createElement('style');
    style.id = 'jas-admin-preview-style';
    style.textContent = '.jas-admin-selection { outline: 3px solid #147b81 !important; outline-offset: 3px; }';
    doc.head.append(style);
  }
  try {
    const snapshot = await get(ref(database, 'jasWebsiteContent/' + page));
    if (current !== state) return;
    const overrides = snapshot.val() ?? {};
    state.entries = editable.map((field) => {
      const saved = validValue(field.type, overrides[field.key]) ? overrides[field.key] : field.value;
      return { field, saved, value: saved };
    });
    publish.disabled = false;
    status.textContent = 'Click an item in ' + pages[page] + ' to edit it.';
  } catch {
    if (current === state) status.textContent = 'Could not load editable content. Check the Firebase database settings.';
  }
}

editor.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (publish.disabled || !current) return;
  const state = current;
  const changes = {};
  const edited = [];
  for (const entry of state.entries) {
    const { value } = entry;
    if (value === entry.saved) continue;
    if (value !== entry.field.value && !validValue(entry.field.type, value)) {
      status.textContent = 'Enter valid ' + entry.field.type.toLowerCase() + ' before publishing.';
      highlight(state, entry.field.element);
      showDetails(state, [entry]);
      fields.querySelector('textarea').focus();
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
