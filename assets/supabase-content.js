const endpoint = 'https://kbwqqicmmpmjazjwsqsk.supabase.co/functions/v1/jas-content';

async function request(page, options, image) {
  const url = new URL(endpoint);
  url.searchParams.set('page', page);
  if (image) url.searchParams.set('image', image);
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Request failed');
  return data;
}

export async function readContent(page) {
  return (await request(page)).fields;
}

export function publishContent(page, changes, token) {
  return request(page, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
    body: JSON.stringify(changes)
  });
}

export async function uploadPhoto(page, imageId, file, token) {
  const result = await request(page, {
    method: 'POST',
    headers: { 'content-type': file.type, authorization: 'Bearer ' + token },
    body: file
  }, imageId);
  return result.url;
}
