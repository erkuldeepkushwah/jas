import { submitEnquiry } from './enquiry-api.js';

const page = location.pathname.split('/').pop().replace(/\.html$/, '') || 'index';
for (const link of document.querySelectorAll('.jas-card a.jas-btn-primary[href="contact.html"]')) {
  const card = link.closest('.jas-card');
  const category = page === 'international' || card.closest('#international') ? 'international' : 'domestic';
  const destination = card.querySelector('h3')?.textContent.trim() ?? '';
  link.href = 'contact.html?' + new URLSearchParams({ category, destination });
}

const travelForm = document.querySelector('#tp-form');
const contactForm = document.querySelector('#ct-form');
const form = travelForm ?? contactForm;
if (form) setupForm();

function setupForm() {
  const button = form.querySelector('button[type="submit"]');
  const note = document.createElement('p');
  note.className = travelForm ? 'tp-note' : 'ct-note';
  note.setAttribute('role', 'status');
  note.setAttribute('aria-live', 'polite');
  button.after(note);
  button.textContent = 'Submit enquiry';
  form.noValidate = false;
  const fields = travelForm
    ? { name:'tp-name', phone:'tp-phone', from:'tp-from', to:'tp-to', travelDate:'tp-date', travellers:'tp-pax', travelClass:'tp-class' }
    : { name:'ct-name', phone:'ct-phone', email:'ct-email', service:'ct-service', destination:'ct-dest', travelDate:'ct-date', travellers:'ct-pax', budget:'ct-budget', message:'ct-msg' };
  const params = new URLSearchParams(location.search);
  const holiday = params.get('category');
  const holidayCategory = holiday === 'domestic' || holiday === 'international' ? holiday : null;
  if (travelForm) {
    for (const [id,label,type,autocomplete] of [['tp-name','Full name','text','name'],['tp-phone','Mobile number','tel','tel']]) {
      const wrapper = document.createElement('div');
      const name = document.createElement('label');
      name.htmlFor = id;
      name.textContent = label;
      const input = document.createElement('input');
      Object.assign(input, { id,type,autocomplete,required:true, maxLength:type === 'tel' ? 24 : 120 });
      wrapper.append(name,input);
      button.before(wrapper);
    }
    for (const id of ['tp-from','tp-to','tp-date','tp-pax']) document.getElementById(id).required = true;
    const intro = form.parentElement.querySelector('.tp-sub');
    if (intro) intro.textContent = 'Share your route, travel date and contact details to request a quote.';
  } else {
    const intro = form.parentElement.querySelector('.ct-form-head p');
    if (intro) intro.textContent = 'Send your details and the JAS team will contact you.';
  }
  if (!travelForm && holidayCategory) {
    document.getElementById('ct-service').value = holidayCategory === 'domestic' ? 'Domestic holiday package' : 'International holiday package';
    document.getElementById('ct-dest').value = (params.get('destination') ?? '').slice(0, 200);
  }
  let pending;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (button.disabled) return;
    if (!form.reportValidity()) return;
    const details = Object.fromEntries(Object.entries(fields).map(([key,id]) => [key,document.getElementById(id).value.trim()]));
    const category = travelForm ? page : holidayCategory ?? 'contact';
    const fingerprint = JSON.stringify({ category, details });
    if (pending?.fingerprint !== fingerprint) pending = { id:crypto.randomUUID(), fingerprint };
    button.disabled = true;
    note.textContent = 'Submitting enquiry…';
    try {
      await submitEnquiry({ id:pending.id,category,details });
      pending = null;
      form.reset();
      note.textContent = 'Enquiry received. The JAS team will contact you.';
    } catch (error) {
      note.textContent = error.message || 'Could not submit the enquiry. Please try again.';
    } finally {
      button.disabled = false;
    }
  }, { capture:true });
}
