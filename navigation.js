export function linkLogin(html, loginHref = '/login.html') {
  const hasMainMenu = /<ul id="menu-main-menu"[^>]*>\s*<li\b/.test(html);
  const desktopMenu = hasMainMenu ? 'menu-main-menu' : 'menu-categories-mega-menu';
  const menuIds = new Set([desktopMenu, 'menu-mobile-menu', 'menu-mobile-menu-1']);
  const loginItem = `<li class="menu-item mfn-menu-li"><a href="${loginHref}" class="mfn-menu-link">` +
    '<span class="menu-item-helper mfn-menu-item-helper"></span>' +
    '<span class="label-wrapper mfn-menu-label-wrapper"><span class="menu-label">Login</span></span></a></li>';

  const holidayItems = /(<li\b[^>]*>\s*<a\b[^>]*\bhref="domestic\.html"[^>]*>(?:(?!<\/li>)[\s\S])*?<\/a>\s*<\/li>)\s*(<li\b[^>]*>\s*<a\b[^>]*\bhref="international\.html"[^>]*>(?:(?!<\/li>)[\s\S])*?<\/a>\s*<\/li>)/g;
  const holidayStyle = `<style>
    .jas-holiday-menu { position: relative; }
    .jas-holiday-menu summary { display: flex; align-items: center; gap: .35rem; cursor: pointer;
      list-style: none; padding: .75rem .65rem; font-weight: 600; white-space: nowrap; }
    .jas-holiday-menu summary::-webkit-details-marker { display: none; }
    .jas-holiday-menu summary::after { content: '▾'; }
    .jas-holiday-menu .jas-holiday-links { margin: 0; padding: .25rem 0; list-style: none; }
    #menu-categories-mega-menu .jas-holiday-links, #menu-main-menu .jas-holiday-links {
      position: absolute; inset-block-start: 100%; inset-inline-end: 0; z-index: 50; min-width: 13rem;
      background: #fff; color: #173553; border: 1px solid #d4e2ee; border-radius: .5rem;
      box-shadow: 0 8px 24px #17355326;
    }
    .jas-holiday-menu .jas-holiday-links a { display: block; padding: .6rem .85rem; white-space: nowrap; }
  </style>`;
  let hasHoliday = false;
  html = html.replace(/<header\b[\s\S]*?<\/header>/i, (header) => header.replace(holidayItems, (_, domestic, international) => {
    hasHoliday = true;
    return `<li class="menu-item mfn-menu-li jas-holiday-menu"><details>` +
      '<summary>Holiday</summary><ul class="jas-holiday-links">' + domestic + international + '</ul></details></li>';
  }));
  if (hasHoliday) html = html.replace('</head>', holidayStyle + '</head>');

  const lists = [];
  return html.replace(/<ul\b[^>]*>|<\/ul\s*>/gi, (tag) => {
    if (tag.startsWith('</')) {
      return (lists.pop() ? loginItem : '') + tag;
    }
    const id = tag.match(/\bid="([^"]+)"/)?.[1];
    lists.push(menuIds.has(id));
    return tag;
  }).replace(/href="[^"]+"(\s+title="">)Sign in \/ Sign up/g, `href="${loginHref}"$1Login`);
}
