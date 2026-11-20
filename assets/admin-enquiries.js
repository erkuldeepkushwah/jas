import { getAuth, onIdTokenChanged } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js';
import { app, isJasAdmin } from './firebase.js';
import { listEnquiries } from './enquiry-api.js';

const auth = getAuth(app);
const status = document.querySelector('#status');
const view = document.querySelector('#admin-views');
const filters = document.querySelector('#filters');
const exportButtons = document.querySelectorAll('[data-export]');
const more = document.querySelector('#more');
const tbody = document.querySelector('#rows');
const date = new Intl.DateTimeFormat('en-IN', { dateStyle:'medium', timeStyle:'short', timeZone:'Asia/Kolkata' });
const categories = {flight:'Flight',bus:'Bus',train:'Train',domestic:'Domestic holiday',international:'International holiday',contact:'Contact form'};
const fields = {name:'Name',phone:'Phone',email:'Email',service:'Service',destination:'Destination',from:'From',to:'To',travelDate:'Travel date',travellers:'Travellers',budget:'Budget',travelClass:'Class / coach',message:'Message'};
const exportNames = { all: 'Enquiries', bus: 'Bus', train: 'Train', flight: 'Flight', holiday: 'Holiday' };
const contactServices = {
  'Bus booking': 'bus',
  'Train booking': 'train',
  'Flight booking': 'flight',
  'Domestic holiday package': 'holiday',
  'International holiday package': 'holiday'
};
let filter = {};
let cursor = null;
let count = 0;
let busy = false;

function setBusy(value) {
  busy = value;
  for (const element of filters.elements) element.disabled = value;
  for (const button of exportButtons) button.disabled = value || view.hidden;
  more.disabled = value;
}
function addRow(row) {
  const tr = tbody.insertRow();
  for (const value of [date.format(new Date(row.created_at)), categories[row.category], row.details.name, row.details.phone]) {
    tr.insertCell().textContent = value ?? '';
  }
  const cell = tr.insertCell();
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = 'View enquiry';
  const list = document.createElement('dl');
  for (const [key,label] of Object.entries(fields)) {
    if (!row.details[key] || ['name','phone'].includes(key)) continue;
    const term = document.createElement('dt');
    const value = document.createElement('dd');
    term.textContent = label;
    value.textContent = row.details[key];
    list.append(term,value);
  }
  details.append(summary,list);
  cell.append(details);
}
async function load(reset = false) {
  if (busy || view.hidden) return;
  if (reset) {
    cursor = null;
    count = 0;
    tbody.replaceChildren();
    more.hidden = true;
  }
  setBusy(true);
  status.textContent = 'Loading enquiries…';
  try {
    const token = await auth.currentUser.getIdToken();
    const result = await listEnquiries(token,filter,cursor);
    if (view.hidden) return;
    for (const row of result.rows) addRow(row);
    count += result.rows.length;
    cursor = result.next;
    more.hidden = !cursor;
    status.textContent = count ? count + ' enquiries loaded.' : 'No enquiries found in this date range.';
  } catch (error) {
    status.textContent = error.message;
  } finally {
    setBusy(false);
  }
}
function selectedDates() {
  const from = document.querySelector('#from-date').value;
  const to = document.querySelector('#to-date').value;
  if (from && to && from > to) {
    status.textContent = 'From date must be on or before To date.';
    return null;
  }
  return { from, to };
}

function exportCategory(row) {
  if (row.category === 'contact') return contactServices[row.details.service];
  if (row.category === 'domestic' || row.category === 'international') return 'holiday';
  return row.category;
}

filters.addEventListener('submit', (event) => {
  event.preventDefault();
  const dates = selectedDates();
  if (!dates) return;
  filter = dates;
  load(true);
});
more.addEventListener('click', () => load());

async function downloadExcel(category) {
  const user = auth.currentUser;
  if (busy || view.hidden || !user) return;
  const dates = selectedDates();
  if (!dates) return;
  const label = exportNames[category];
  const filename = category === 'all' ? 'JAS-Enquiries.xlsx' : 'JAS-' + label + '-Enquiries.xlsx';
  setBusy(true);
  status.textContent = 'Preparing Excel file…';
  try {
    const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs');
    const keys = Object.keys(fields);
    const values = [['Received (IST)', 'Type', ...Object.values(fields)]];
    let next = null;
    do {
      if (auth.currentUser !== user || view.hidden) return;
      const token = await user.getIdToken();
      const result = await listEnquiries(token, dates, next);
      for (const row of result.rows) {
        if (category !== 'all' && exportCategory(row) !== category) continue;
        values.push([date.format(new Date(row.created_at)), categories[row.category], ...keys.map((key) => row.details[key] ?? '')]);
      }
      next = result.next;
    } while (next);
    if (auth.currentUser !== user || view.hidden) return;
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(values), label);
    XLSX.writeFile(workbook, filename);
    const total = values.length - 1;
    status.textContent = filename + ' downloaded. ' + total + (total === 1 ? ' enquiry.' : ' enquiries.');
  } catch (error) {
    if (auth.currentUser === user && !view.hidden) status.textContent = 'Excel download failed. ' + error.message;
  } finally {
    setBusy(false);
  }
}

for (const button of exportButtons) {
  button.addEventListener('click', () => downloadExcel(button.dataset.export));
}

let check = 0;
onIdTokenChanged(auth, async (user) => {
  const attempt = ++check;
  try {
    const token = user && await user.getIdTokenResult();
    if (attempt !== check) return;
    if (isJasAdmin(token?.claims)) {
      if (view.hidden) {
        view.hidden = false;
        load(true);
      }
      return;
    }
    status.textContent = 'Sign in with your JAS admin account to view enquiries.';
  } catch {
    if (attempt !== check) return;
    status.textContent = 'Could not check admin access. Try signing in again.';
  }
  view.hidden = true;
  tbody.replaceChildren();
});
