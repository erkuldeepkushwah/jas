const holidayItems = /(<li\b[^>]*>\s*<a\b[^>]*\bhref="domestic\.html"[^>]*>(?:(?!<\/li>)[\s\S])*?<\/a>\s*<\/li>)\s*(<li\b[^>]*>\s*<a\b[^>]*\bhref="international\.html"[^>]*>(?:(?!<\/li>)[\s\S])*?<\/a>\s*<\/li>)/g;

export function publicNavigation(html, page) {
  const withHoliday = html.replace(/<header\b[\s\S]*?<\/header>/i, (header) =>
    header.replace(holidayItems, (_, domestic) => domestic
      .replace('href="domestic.html"', page === 'holiday'
        ? 'href="holiday.html" aria-current="page"'
        : 'href="holiday.html"')
      .replace('>Domestic Holidays<', '>Holiday<'))
  );
  return withHoliday.replace(/<a\b[^>]*>Sign in \/ Sign up<\/a>/gi, '');
}

export function renderPublicPage(html, page) {
  const scripts = '<script type="module" src="assets/content.js"></script>' +
    '<script type="module" src="assets/enquiry-form.js"></script>';
  const packageScript = page === 'holiday' ? '<script type="module" src="assets/holiday-packages.js"></script>' : '';
  return publicNavigation(html, page).replace(/<\/body>/i, scripts + packageScript + '</body>');
}

// The optional Express entry point uses the same public navigation.
export { publicNavigation as linkLogin };
