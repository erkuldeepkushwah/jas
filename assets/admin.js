import { getAuth, onIdTokenChanged } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js';
import { readContent, publishContent, uploadPhoto } from './supabase-content.js';
import { app, isJasAdmin } from './firebase.js';
import { pages, previewFields, validValue } from './content-fields.js';

const status = document.querySelector('#status');
const editor = document.querySelector('#editor');
const enquiriesLink = document.querySelector('#enquiries-link');
const workspace = document.querySelector('#workspace');
const pageNav = document.querySelector('#pages');
const pageTitle = document.querySelector('#page-title');
const requestedPage = new URLSearchParams(location.search).get('page');
const preview = document.querySelector('#preview');
const edit = document.querySelector('#edit');
const cancel = document.querySelector('#cancel');
const photos = document.querySelector('#photos');
const publish = document.querySelector('#publish');
const fields = document.querySelector('#fields');
const auth = getAuth(app);
let current;
let selectedPage;
let publishing = false;
let keepEditing = false;
const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const maxPhotoBytes = 8 * 1024 * 1024;

function ratio(width, height) {
  let a = width;
  let b = height;
  while (b) [a, b] = [b, a % b];
  return width / a + ':' + height / a;
}

function clearUpload(entry) {
  if (entry.localUrl) URL.revokeObjectURL(entry.localUrl);
  entry.file = null;
  entry.localUrl = null;
  entry.objectPath = null;
  entry.uploadedUrl = null;
}

async function hostedPhoto(entry, page, token) {
  entry.objectPath ??= crypto.randomUUID();
  entry.uploadedUrl ??= await uploadPhoto(page, entry.objectPath, entry.file, token);
  return entry.uploadedUrl;
}

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
  const hasDraft = current?.entries.some(({ value, saved, file }) => file || value !== saved);
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
    for (const entry of current.entries) {
      const { field, value, saved, file } = entry;
      if (file || value !== saved) {
        if (saved === field.value) field.reset();
        else field.apply(saved);
      }
      clearUpload(entry);
    }
  }
  current = null;
  editor.hidden = true;
  fields.replaceChildren();
  edit.setAttribute('aria-expanded', 'false');
  edit.textContent = 'Edit';
}

function selectPage(page, alreadyLoaded = false) {
  if (page === selectedPage || !canCloseEditor()) return;
  closeEditor();
  selectedPage = page;
  pageTitle.textContent = pages[page];
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
    if (keepEditing && !edit.disabled && editor.hidden) openEditor();
  } catch {
    edit.disabled = true;
  }
});

function openEditor() {
  if (!selectedPage || !editor.hidden) return;
  editor.hidden = false;
  keepEditing = true;
  edit.setAttribute('aria-expanded', 'true');
  edit.textContent = 'Editing';
  loadPage(selectedPage);
}
edit.addEventListener('click', () => {
  openEditor();
  if (!editor.hidden) cancel.focus();
});
cancel.addEventListener('click', () => {
  if (!canCloseEditor()) return;
  keepEditing = false;
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

    if (field.type === 'Image URL') addImageControls(state, entry, row, input);
    input.addEventListener('input', () => {
      clearUpload(entry);
      entry.value = input.value;
      if (entry.value === field.value) field.reset();
      else if (validValue(field.type, entry.value)) field.apply(entry.value);
    });

  }
}

function addImageControls(state, entry, urlRow, urlInput) {
  const { field } = entry;
  const thumbnail = document.createElement('img');
  thumbnail.alt = field.element.alt || 'Selected photo';
  const dimensions = document.createElement('p');
  dimensions.className = 'image-dimensions';
  dimensions.setAttribute('role', 'status');
  thumbnail.addEventListener('load', () => {
    const { naturalWidth: width, naturalHeight: height } = thumbnail;
    dimensions.textContent = width + ' × ' + height + ' px · Aspect ratio ' + ratio(width, height);
  });
  thumbnail.addEventListener('error', () => {
    dimensions.textContent = 'Image size unavailable.';
  });
  function showImage(value) {
    if (validValue(field.type, value)) thumbnail.src = new URL(value, state.doc.baseURI).href;
  }
  if (entry.localUrl) thumbnail.src = entry.localUrl;
  else showImage(entry.value === field.value ? field.element.currentSrc || entry.value : entry.value);
  urlRow.before(thumbnail, dimensions);

  const uploadRow = document.createElement('label');
  uploadRow.append('Upload image');
  const picker = document.createElement('input');
  picker.type = 'file';
  picker.accept = imageTypes.join(',');
  uploadRow.append(picker);
  const fileStatus = document.createElement('small');
  fileStatus.setAttribute('role', 'status');
  uploadRow.append(fileStatus);
  const fileHint = 'JPEG, PNG, WebP, GIF or AVIF · up to 8 MB';
  fileStatus.textContent = entry.file?.name ?? fileHint;
  urlRow.after(uploadRow);

  let selection = 0;
  urlInput.addEventListener('input', () => {
    selection++;
    picker.value = '';
    fileStatus.textContent = fileHint;
    showImage(urlInput.value);
  });
  picker.addEventListener('change', async () => {
    const file = picker.files[0];
    if (!file || publishing) return;
    const attempt = ++selection;
    if (!imageTypes.includes(file.type) || file.size === 0 || file.size > maxPhotoBytes) {
      fileStatus.textContent = 'Choose a supported image up to 8 MB.';
      picker.value = '';
      return;
    }
    const localUrl = URL.createObjectURL(file);
    const image = new Image();
    image.src = localUrl;
    try {
      await image.decode();
      if (attempt !== selection || current !== state || publishing || !picker.isConnected) {
        URL.revokeObjectURL(localUrl);
        return;
      }
      clearUpload(entry);
      entry.file = file;
      entry.localUrl = localUrl;
      thumbnail.src = localUrl;
      field.apply(localUrl);
      fileStatus.textContent = file.name + ' · ready to publish';
    } catch {
      URL.revokeObjectURL(localUrl);
      if (attempt === selection) fileStatus.textContent = 'This image could not be opened.';
    }
  });
}

function selectImages(state, selection, marked) {
  highlight(state, marked);
  state.selection = selection;
  showDetails(state, selection);
}

photos.addEventListener('click', () => {
  if (!current || publishing) return;
  const selection = current.entries.filter(({ field }) => field.type === 'Image URL');
  selectImages(current, selection);
  status.textContent = selection.length
    ? selection.length + ' images on ' + pages[current.page] + '.'
    : 'This page has no editable images.';
});

function pickItem(event, state) {
  event.preventDefault();
  event.stopImmediatePropagation();
  if (publishing) return;
  let element = event.target;
  const hero = element.closest?.('#jas-hero, #jas-page-head');
  const heroImage = hero?.querySelector('.jas-hero-img, .jas-ph-img');
  const banner = heroImage && state.entries.find(({ field }) => field.element === heroImage);
  const direct = state.entries.some(({ field }) => field.element === element);
  if (banner && !direct && !element.closest('a, button')) {
    selectImages(state, [banner], hero);
    status.textContent = 'Editing the ' + pages[state.page] + ' banner photo.';
    return;
  }
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
      state.selection = [...selection, ...linkDetails];
      if (banner && !state.selection.includes(banner)) state.selection.unshift(banner);
      showDetails(state, state.selection);
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
  const entries = editable.map((field) => {
    const saved = field.type === 'Image URL' ? field.element.getAttribute('src') ?? field.value : field.value;
    return { field, saved, value: saved };
  });
  const state = { page, doc, listeners: new AbortController(), entries };
  current = state;
  fields.replaceChildren();
  publish.disabled = true;
  status.textContent = 'Click an item in ' + pages[page] + ' to edit it.';
  doc.addEventListener('click', (event) => pickItem(event, state), {
    capture: true, signal: state.listeners.signal
  });
  if (!doc.getElementById('jas-admin-preview-style')) {
    const style = doc.createElement('style');
    style.id = 'jas-admin-preview-style';
    style.textContent = '.jas-admin-selection { outline: 3px solid #f2ac00 !important; outline-offset: 3px; }';
    doc.head.append(style);
  }
  try {
    const overrides = await readContent(page);
    if (current !== state) return;
    for (const entry of entries) {
      if (entry.file || entry.value !== entry.saved) continue;
      const { field } = entry;
      const saved = validValue(field.type, overrides[field.key]) ? overrides[field.key] : field.value;
      entry.saved = entry.value = saved;
    }
    if (state.selection && !fields.contains(document.activeElement)) showDetails(state, state.selection);
    publish.disabled = false;
    status.textContent = 'Click an item in ' + pages[page] + ' to edit it.';
  } catch {
    if (current === state) status.textContent = 'Photo previews and sizes are available. Publishing requires a connection to Supabase.';
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
    if (!entry.file && value === entry.saved) continue;
    if (!entry.file && value !== entry.field.value && !validValue(entry.field.type, value)) {
      status.textContent = 'Enter valid ' + entry.field.type.toLowerCase() + ' before publishing.';
      highlight(state, entry.field.element);
      showDetails(state, [entry]);
      fields.querySelector('textarea').focus();
      return;
    }
    edited.push({ entry, value });
  }
  if (!edited.length) {
    status.textContent = 'No changes to publish.';
    return;
  }
  publish.disabled = true;
  publishing = true;
  cancel.disabled = true;
  fields.inert = true;
  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Sign in to publish changes.');
    if (edited.some(({ entry }) => entry.file)) status.textContent = 'Uploading photos…';
    for (const item of edited) {
      const { entry } = item;
      if (entry.file) item.value = await hostedPhoto(entry, state.page, token);
      changes[entry.field.key] = item.value === entry.field.value ? null : item.value;
    }
    await publishContent(state.page, changes, token);
    for (const { entry, value } of edited) {
      if (entry.file && current === state) entry.field.apply(value);
      entry.saved = entry.value = value;
      clearUpload(entry);
    }
    if (current === state && state.selection) showDetails(state, state.selection);
    status.textContent = 'Published changes for ' + pages[state.page] + '.';
  } catch (error) {
    status.textContent = 'Publish failed. ' + error.message;
  } finally {
    publishing = false;
    cancel.disabled = false;
    fields.inert = false;
    publish.disabled = !current;
  }
});

let accessCheck = 0;
onIdTokenChanged(auth, async (user) => {
  const check = ++accessCheck;
  try {
    const token = user && await user.getIdTokenResult();
    if (check !== accessCheck) return;
    if (isJasAdmin(token?.claims)) {
      workspace.hidden = false;
      enquiriesLink.hidden = false;
      if (!selectedPage) {
        keepEditing = Object.hasOwn(pages, requestedPage);
        selectPage(keepEditing ? requestedPage : 'index');
      }
      return;
    }
    status.textContent = user ? 'This account does not have JAS admin access.' : 'Log in with your JAS admin account.';
  } catch {
    if (check !== accessCheck) return;
    status.textContent = 'Could not verify admin access. Reload the page to try again.';
  }
  workspace.hidden = true;
  enquiriesLink.hidden = true;
  closeEditor();
  selectedPage = null;
  preview.removeAttribute('src');
});
