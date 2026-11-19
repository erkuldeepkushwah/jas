import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Helper to inject navigation script and synced meta tags
function transformHtml(filePath, isContact = false) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Inject meta tags if not already present
  const metaTags = `
<meta name="description" content="Auto paint and car care supplies store showcasing premium primers, blockers, coatings, and prepaint cleaners." />
<meta property="og:title" content="${isContact ? 'Contact Us - BePaintStore' : 'BePaintStore - Auto Paint & Care'}" />
<meta property="og:description" content="Auto paint and car care supplies store showcasing premium primers, blockers, coatings, and prepaint cleaners." />
`;
  if (!content.includes('property="og:title"')) {
    content = content.replace('<head>', `<head>${metaTags}`);
  }

  // Inject navigation interception and interactive form handler
  const clientScript = `
<script>
(function() {
  // Navigation interceptor for seamless local browsing
  document.addEventListener('click', function(e) {
    var link = e.target.closest('a');
    if (!link) return;
    var href = link.getAttribute('href');
    if (!href) return;

    if (href.indexOf('paintstore/contact-us') !== -1 || href === '/contact' || href === '/contact.html') {
      e.preventDefault();
      window.location.href = '/contact.html';
    } else if (href === 'https://themes.muffingroup.com/be/paintstore/' || href === 'https://themes.muffingroup.com/be/paintstore' || href === '/hero.html') {
      e.preventDefault();
      window.location.href = '/';
    }
  });

  // Contact form submission handler
  document.addEventListener('submit', function(e) {
    var form = e.target.closest('form');
    if (!form) return;
    var isContactForm = form.classList.contains('wpcf7-form') || form.querySelector('input[type="submit"][value*="SEND"]');
    if (isContactForm) {
      e.preventDefault();
      var output = form.querySelector('.wpcf7-response-output');
      if (!output) {
        output = document.createElement('div');
        output.className = 'wpcf7-response-output';
        form.appendChild(output);
      }
      output.style.display = 'block';
      output.style.backgroundColor = '#eaf8ef';
      output.style.color = '#3a8b5b';
      output.style.border = '2px solid #3a8b5b';
      output.style.borderRadius = '8px';
      output.style.padding = '14px 20px';
      output.style.marginTop = '16px';
      output.style.fontWeight = '600';
      output.innerText = 'Thank you for your message! Our auto paint specialists will be in touch with you shortly.';
      form.reset();
    }
  });
})();
</script>
`;

  if (!content.includes('// Navigation interceptor for seamless local browsing')) {
    content = content.replace('</body>', `${clientScript}</body>`);
  }

  return content;
}

// Point the existing desktop and mobile account links at Firebase login.
const pagesWithLogin = [
  '/index.html', '/about.html', '/bus.html', '/contact.html', '/domestic.html',
  '/flight.html', '/international.html', '/train.html', '/Jas/hero.html', '/Jas/contact.html'
];

function linkLogin(html) {
  const hasMainMenu = /<ul id="menu-main-menu"[^>]*>\s*<li\b/.test(html);
  const desktopMenu = hasMainMenu ? 'menu-main-menu' : 'menu-categories-mega-menu';
  const menuIds = new Set([desktopMenu, 'menu-mobile-menu', 'menu-mobile-menu-1']);
  const loginItem = '<li class="menu-item mfn-menu-li"><a href="/login.html" class="mfn-menu-link">' +
    '<span class="menu-item-helper mfn-menu-item-helper"></span>' +
    '<span class="label-wrapper mfn-menu-label-wrapper"><span class="menu-label">Login</span></span></a></li>';

  const lists = [];
  return html.replace(/<ul\b[^>]*>|<\/ul\s*>/gi, (tag) => {
    if (tag.startsWith('</')) {
      return (lists.pop() ? loginItem : '') + tag;
    }
    const id = tag.match(/\bid="([^"]+)"/)?.[1];
    lists.push(menuIds.has(id));
    return tag;
  }).replace(/href="[^"]+"(\s+title="">)Sign in \/ Sign up/g, 'href="/login.html"$1Login');
}

app.get(pagesWithLogin, (req, res) => {
  const page = path.join(__dirname, req.path);
  res.send(linkLogin(fs.readFileSync(page, 'utf8')));
});

// Serve static images and assets from Jas and root
app.use('/Jas', express.static(path.join(__dirname, 'Jas')));
app.use(express.static(__dirname, { index: false }));

// Routes
app.get(['/', '/index.html', '/hero.html', '/Jas/hero.html', '/be/paintstore/'], (req, res) => {
  const heroPath = path.join(__dirname, 'Jas', 'hero.html');
  res.send(linkLogin(transformHtml(heroPath, false)));
});

app.get(['/contact', '/contact.html', '/contact-us', '/contact-us/', '/Jas/contact.html', '/be/paintstore/contact-us/'], (req, res) => {
  const contactPath = path.join(__dirname, 'Jas', 'contact.html');
  res.send(linkLogin(transformHtml(contactPath, true)));
});

// Contact form POST handler
app.post(['/contact-submit', '/be/paintstore/*', '/Jas/contact.html', '/contact.html'], (req, res) => {
  res.json({
    status: 'mail_sent',
    message: 'Thank you for your message! Our auto paint specialists will be in touch with you shortly.'
  });
});

// Catch-all route to serve hero homepage
app.use((req, res) => {
  const heroPath = path.join(__dirname, 'Jas', 'hero.html');
  if (fs.existsSync(heroPath)) {
    res.send(linkLogin(transformHtml(heroPath, false)));
  } else {
    res.status(404).send('Page not found');
  }
});

app.listen(PORT, HOST, () => {
  console.log(`BePaintStore server running at http://${HOST}:${PORT}`);
});
