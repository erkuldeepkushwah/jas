import { listPackages } from './holiday-packages-api.js';

const sections = {
  domestic: document.getElementById('packages'),
  international: document.getElementById('international')
};
const priceFormat = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

function element(tag, className, text = '') {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

function packageCard(item) {
  const card = element('article', 'jas-card');
  card.dataset.cat = 'published';
  if (item.image_url?.startsWith('https://')) {
    const media = element('div', 'jas-card-media');
    const photo = document.createElement('img');
    photo.src = item.image_url;
    photo.alt = item.title;
    photo.loading = 'lazy';
    media.append(photo);
    if (item.duration) media.append(element('span', 'jas-dur', item.duration));
    card.append(media);
  }
  const body = element('div', 'jas-card-body');
  if (item.destination) body.append(element('p', 'jas-loc', item.destination));
  body.append(element('h3', '', item.title));
  if (item.duration && !item.image_url) body.append(element('p', 'jas-loc', item.duration));
  if (item.description) body.append(element('p', 'jas-desc', item.description));

  const footer = element('div', 'jas-card-foot');
  const price = element('div', 'jas-price');
  if (item.price_inr !== null) {
    price.append(element('span', '', 'Starting from'), element('strong', '', priceFormat.format(item.price_inr)), element('em', '', '/ person'));
  } else {
    price.append(element('span', '', 'Request a quote'));
  }
  footer.append(price);
  const actions = element('div', 'jas-actions');
  const enquiry = element('a', 'jas-btn jas-btn-primary', 'Enquire');
  enquiry.href = 'contact.html?' + new URLSearchParams({ category: item.type, destination: item.title });
  actions.append(enquiry);
  body.append(footer, actions);
  card.append(body);
  return card;
}

listPackages().then((packages) => {
  for (const item of packages) {
    const section = sections[item.type];
    const grid = section?.querySelector('.jas-grid');
    if (!grid) continue;
    const card = packageCard(item);
    const filter = section.querySelector('.jas-pill.is-active')?.dataset.filter;
    if (filter && filter !== 'all') card.style.display = 'none';
    grid.append(card);
  }
}).catch((error) => console.warn('Additional holiday packages could not load:', error.message));
