import { getAuth, onIdTokenChanged } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js';
import { app, isJasAdmin } from './firebase.js';
import { listEnquiries } from './enquiry-api.js';

const auth = getAuth(app);
const status = document.querySelector('#status');
const view = document.querySelector('#admin-views');
const filters = document.querySelector('#filters');
const exportButton = document.querySelector('#export');
const more = document.querySelector('#more');
const tbody = document.querySelector('#rows');
const date = new Intl.DateTimeFormat('en-IN', { dateStyle:'medium', timeStyle:'short', timeZone:'Asia/Kolkata' });
const categories = {flight:'Flight',bus:'Bus',train:'Train',domestic:'Domestic holiday',international:'International holiday',contact:'Contact form'};
const fields = {name:'Name',phone:'Phone',email:'Email',service:'Service',destination:'Destination',from:'From',to:'To',travelDate:'Travel date',travellers:'Travellers',budget:'Budget',travelClass:'Class / coach',message:'Message'};
let filter = {};
let cursor = null;
let count = 0;
let busy = false;

function setBusy(value) {
  busy = value;
  for (const element of filters.elements) element.disabled = value;
  exportButton.disabled = value || count === 0;
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
filters.addEventListener('submit', (event) => {
  event.preventDefault();
  const from = document.querySelector('#from-date').value;
  const to = document.querySelector('#to-date').value;
  if (from && to && from > to) {
    status.textContent = 'From date must be on or before To date.';
    return;
  }
  filter = { from,to };
  load(true);
});
more.addEventListener('click', () => load());
exportButton.addEventListener('click', async () => {
  if (busy || view.hidden) return;
  setBusy(true);
  status.textContent = 'Preparing Excel file…';
  try {
    const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs');
    const values = [['Received (IST)','Type',...Object.values(fields)]];
    let next = null;
    do {
      const token = await auth.currentUser.getIdToken();
      const result = await listEnquiries(token,filter,next);
      for (const row of result.rows) {
        values.push([date.format(new Date(row.created_at)),categories[row.category],...Object.keys(fields).map((key) => row.details[key] ?? '')]);
      }
      next = result.next;
    } while (next);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook,XLSX.utils.aoa_to_sheet(values),'Enquiries');
    XLSX.writeFile(workbook,'JAS-Enquiries.xlsx');
    status.textContent = 'Excel file downloaded.';
  } catch (error) {
    status.textContent = 'Excel download failed. ' + error.message;
  } finally {
    setBusy(false);
  }
});
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
