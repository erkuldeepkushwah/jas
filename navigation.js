export function linkLogin(html, loginHref = '/login.html') {
  const hasMainMenu = /<ul id="menu-main-menu"[^>]*>\s*<li\b/.test(html);
  const desktopMenu = hasMainMenu ? 'menu-main-menu' : 'menu-categories-mega-menu';
  const menuIds = new Set([desktopMenu, 'menu-mobile-menu', 'menu-mobile-menu-1']);
  const loginItem = `<li class="menu-item mfn-menu-li"><a href="${loginHref}" class="mfn-menu-link">` +
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
  }).replace(/href="[^"]+"(\s+title="">)Sign in \/ Sign up/g, `href="${loginHref}"$1Login`);
}
