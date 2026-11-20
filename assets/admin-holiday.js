import { getAuth, onIdTokenChanged } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js';
import { app, isJasAdmin } from './firebase.js';
import { uploadPhoto } from './supabase-content.js';
import { listPackages, savePackage } from './holiday-packages-api.js';

const auth = getAuth(app);
const accessStatus = document.querySelector('#access-status');
const management = document.querySelector('#management');
const form = document.querySelector('#package-form');
const fieldset = document.querySelector('#package-fields');
const formTitle = document.querySelector('#form-title');
const photo = document.querySelector('#package-photo');
const saveStatus = document.querySelector('#save-status');
const saveButton = document.querySelector('#save-package');
const cancelEdit = document.querySelector('#cancel-edit');
const packageRows = document.querySelector('#packages');
const listStatus = document.querySelector('#list-status');
const labels = { domestic: 'Domestic', international: 'International' };
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);

let admin;
let editId;
let draftId;
let uploadedPhoto;
let check = 0;
let listCheck = 0;
let saving = false;

function resetForm() {
  form.reset();
  editId = draftId = uploadedPhoto = undefined;
  formTitle.textContent = 'Add Package';
  saveButton.textContent = 'Publish Package';
  cancelEdit.hidden = true;
  saveStatus.textContent = '';
}

function editPackage(item) {
  if (saving || !admin) return;
  resetForm();
  editId = item.id;
  for (const key of ['type', 'title', 'destination', 'duration', 'price_inr', 'image_url', 'description']) {
    form.elements.namedItem(key).value = item[key] ?? '';
  }
  formTitle.textContent = 'Edit Package';
  saveButton.textContent = 'Save Changes';
  cancelEdit.hidden = false;
  form.elements.namedItem('title').focus();
}

async function refreshPackages() {
  const request = ++listCheck;
  listStatus.textContent = 'Loading packages…';
  try {
    const items = await listPackages();
    if (!admin || request !== listCheck) return;
    const rows = items.map((item) => {
      const row = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = item.title + ' · ' + labels[item.type];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'secondary';
      button.textContent = 'Edit';
      button.setAttribute('aria-label', 'Edit ' + item.title);
      button.addEventListener('click', () => editPackage(item));
      row.append(label, button);
      return row;
    });
    packageRows.replaceChildren(...rows);
    listStatus.textContent = rows.length ? '' : 'Packages you add will appear here.';
  } catch (error) {
    if (admin && request === listCheck) listStatus.textContent = error.message;
  }
}

cancelEdit.addEventListener('click', resetForm);
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (saving || !admin || auth.currentUser !== admin) return;
  const user = admin;
  const data = Object.fromEntries(new FormData(form));
  for (const key of Object.keys(data)) data[key] = data[key].trim();
  if (!data.title) {
    saveStatus.textContent = 'Enter a package name.';
    return;
  }
  const file = photo.files[0];
  if (file && (!imageTypes.has(file.type) || !file.size || file.size > 8 * 1024 * 1024)) {
    saveStatus.textContent = 'Choose a JPEG, PNG, WebP, GIF or AVIF image up to 8 MB.';
    return;
  }
  if (!file && data.image_url && !data.image_url.startsWith('https://')) {
    saveStatus.textContent = 'Enter an HTTPS photo URL.';
    return;
  }
  draftId ??= crypto.randomUUID();
  data.id = editId ?? draftId;
  data.price_inr = data.price_inr ? Number(data.price_inr) : null;
  saving = true;
  fieldset.disabled = true;
  saveStatus.textContent = file ? 'Uploading photo…' : 'Publishing package…';
  try {
    const token = await user.getIdToken();
    if (file) {
      if (uploadedPhoto?.file !== file || uploadedPhoto.type !== data.type) {
        uploadedPhoto = { file, type: data.type, id: crypto.randomUUID() };
      }
      uploadedPhoto.url ??= await uploadPhoto(data.type, uploadedPhoto.id, file, token);
      data.image_url = uploadedPhoto.url;
    }
    saveStatus.textContent = 'Publishing package…';
    await savePackage(data, token);
    if (admin !== user) return;
    resetForm();
    saveStatus.textContent = 'Package published under ' + labels[data.type] + ' Holidays.';
    refreshPackages();
  } catch (error) {
    if (admin === user) saveStatus.textContent = error.message || 'Could not publish the package.';
  } finally {
    saving = false;
    fieldset.disabled = false;
  }
});

onIdTokenChanged(auth, async (user) => {
  const attempt = ++check;
  try {
    const token = user && await user.getIdTokenResult();
    if (attempt !== check) return;
    if (isJasAdmin(token?.claims)) {
      admin = user;
      accessStatus.hidden = true;
      if (management.hidden) {
        management.hidden = false;
        refreshPackages();
      }
      return;
    }
    accessStatus.textContent = 'Sign in with your JAS admin account to manage packages.';
  } catch {
    if (attempt !== check) return;
    accessStatus.textContent = 'Could not verify admin access.';
  }
  admin = undefined;
  management.hidden = true;
  accessStatus.hidden = false;
  packageRows.replaceChildren();
  resetForm();
});
