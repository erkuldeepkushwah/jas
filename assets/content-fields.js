export const pages = {
  index: 'Home',
  about: 'About Us',
  flight: 'Flight Booking',
  train: 'Train Booking',
  bus: 'Bus Booking',
  domestic: 'Domestic Holidays',
  international: 'International Holidays',
  contact: 'Contact'
};

function fingerprint(value) {
  let hash = 2166136261;
  for (const letter of value) {
    hash = Math.imul(hash ^ letter.codePointAt(0), 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function contentFields(doc) {
  const fields = [];
  const blocked = 'script, style, noscript, template, svg, input, textarea, select, [hidden], [aria-hidden="true"]';
  const walker = doc.createTreeWalker(doc.body, 5);
  let node;
  while ((node = walker.nextNode())) {
    const element = node.nodeType === 1 ? node : node.parentElement;
    if (!element?.closest('main, section[id^="jas-"], section[class*="jas-"], section:has(> .jas-wrap), footer') ||
        element.closest(blocked)) continue;

    if (node.nodeType === 3 && node.data.trim()) {
      const original = node.data;
      fields.push({
        type: 'Text',
        value: original.trim(),
        reset: () => { node.data = original; },
        apply: (value) => { node.data = original.replace(/\S[\s\S]*\S|\S/, () => value); }
      });
    }
    if (node.nodeType === 1 && element.matches('img[src]')) {
      const src = element.getAttribute('src');
      const srcset = element.getAttribute('srcset');
      fields.push({
        type: 'Image URL',
        value: src,
        reset: () => {
          element.setAttribute('src', src);
          if (srcset !== null) element.setAttribute('srcset', srcset);
        },
        apply: (value) => {
          element.removeAttribute('srcset');
          element.setAttribute('src', value);
        }
      });
    }
    if (node.nodeType === 1 && element.matches('a[href]')) {
      const href = element.getAttribute('href');
      if (!href.startsWith('#') && validValue('Link URL', href)) {
        fields.push({ type: 'Link URL', value: href, reset: () => element.setAttribute('href', href), apply: (value) => element.setAttribute('href', value) });
      }
    }
  }
  return fields.map((field, index) => ({
    ...field, key: 'f' + index + '_' + fingerprint(field.type + field.value)
  }));
}

export function validValue(type, value) {
  if (typeof value !== 'string' || value.length > 4000 || !value.trim()) return false;
  if (type === 'Text') return true;
  try {
    const url = new URL(value, 'https://example.invalid/');
    if (type === 'Image URL') return url.protocol === 'https:';
    return ['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol);
  } catch {
    return false;
  }
}
