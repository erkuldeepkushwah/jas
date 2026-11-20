const domesticPackages = /<section id="packages"[^>]*>[\s\S]*?<\/section>/;
const internationalPackages = /<section id="international"[^>]*>[\s\S]*?<\/section>/;
const pageBanner = /<section id="jas-page-head">[\s\S]*?<\/section>/;
const sectionHeading = /(<h2 class="jas-h2">)[^<]*(<\/h2>)/;

export function holidayPage(domestic, international) {
  const outbound = international.match(internationalPackages)?.[0];
  if (!outbound || !domesticPackages.test(domestic) || !pageBanner.test(domestic)) {
    throw new Error('Expected both holiday package sections and the holiday banner.');
  }

  const banner = `<section id="jas-page-head">
    <img class="jas-ph-img" src="assets/img/dom-02.jpg" alt="Hawa Mahal, Jaipur" fetchpriority="high">
    <div class="jas-ph-veil"></div>
    <div class="jas-ph-inner">
      <p class="jas-ph-crumb"><a href="index.html">Home</a> <span>/</span> Holiday</p>
      <h1>Holiday Packages</h1>
      <p class="jas-ph-sub">Explore holidays across India and around the world.</p>
      <nav class="jas-holiday-jump" aria-label="Holiday packages">
        <a href="#packages">Domestic Holidays</a>
        <a href="#international">International Holidays</a>
      </nav>
    </div>
  </section>`;
  const style = `<style>
    #packages, #international { scroll-margin-top: 90px; }
    #jas-page-head .jas-holiday-jump { display: flex; flex-wrap: wrap; gap: 10px; }
    #jas-page-head .jas-holiday-jump a {
      display: inline-flex; align-items: center; min-height: 44px; padding: 0 16px;
      border: 1px solid #ffffffa1; border-radius: 10px; color: #fff;
      background: #14375f; text-decoration: none; font-weight: 700;
    }
    #jas-page-head .jas-holiday-jump a:hover, #jas-page-head .jas-holiday-jump a:focus-visible {
      color: #14375f; background: #fff;
    }
    .jas-holiday-jump a:focus-visible { outline: 2px solid #ffcc00; outline-offset: 3px; }
  </style>`;
  return domestic
    .replace(/<title>[^<]*<\/title>/i, '<title>Holiday Packages | JAS Tour &amp; Travels</title>')
    .replace(/(<link rel="(?:alternate|canonical)"[^>]*href=")index\.html"/gi, '$1holiday.html"')
    .replace('</head>', '<meta name="description" content="Browse domestic and international holiday packages from JAS Tour &amp; Travels.">' + style + '</head>')
    .replace(pageBanner, () => banner)
    .replace(domesticPackages, (section) =>
      section.replace(sectionHeading, '$1Domestic Holiday Packages$2') + '\n' +
      outbound.replace(sectionHeading, '$1International Holiday Packages$2')
    )
    .replace('href="index.html#international">See international packages', 'href="#international">See international packages');
}
