const endpoint = 'https://kbwqqicmmpmjazjwsqsk.supabase.co/functions/v1/jas-content';

async function packageRequest(options, offset) {
  const url = new URL(endpoint);
  url.searchParams.set('resource', 'holiday-packages');
  if (offset !== undefined) url.searchParams.set('offset', offset);
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not load holiday packages.');
  return data;
}

export async function listPackages() {
  const all = [];
  let offset = 0;
  do {
    const result = await packageRequest(undefined, offset);
    all.push(...result.packages);
    offset = result.next;
  } while (offset !== null);
  return all;
}

export async function savePackage(details, token) {
  const result = await packageRequest({
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
    body: JSON.stringify(details)
  });
  return result.package;
}
