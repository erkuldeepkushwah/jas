const idPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const limit = 100;
const columns = 'id,type,title,destination,duration,price_inr,description,image_url';
const path = '/rest/v1/jas_holiday_packages';
const textLimits = { title: 120, destination: 120, duration: 60, description: 2000, image_url: 2000 };

function validImageUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return value.startsWith('https://') && !url.username && !url.password;
  } catch {
    return false;
  }
}

export async function handleHolidayPackages(request, params, json, supabase, trustedAdmin, requestBody) {
  if (request.method === 'GET') {
    const offset = Number(params.get('offset') ?? 0);
    if (!Number.isSafeInteger(offset) || offset < 0) return json({ error: 'Invalid package list offset.' }, 400);
    const query = new URLSearchParams({
      select: columns, order: 'created_at.asc,id.asc', offset: String(offset), limit: String(limit + 1)
    });
    const read = await supabase(path + '?' + query);
    if (!read.ok) throw new Error('Holiday packages read failed: ' + read.status);
    const records = await read.json();
    const hasMore = records.length > limit;
    if (hasMore) records.pop();
    return json({ packages: records, next: hasMore ? offset + limit : null });
  }

  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  if (!await trustedAdmin(request)) return json({ error: 'Admin authorization required.' }, 401);
  const body = await requestBody(request, 16 * 1024);
  if (!body) return json({ error: 'Package details are too long.' }, 413);

  let input;
  try {
    input = JSON.parse(await body.text());
  } catch {
    return json({ error: 'Invalid package details.' }, 400);
  }
  if (!input || typeof input.id !== 'string' || !idPattern.test(input.id) ||
      !['domestic', 'international'].includes(input.type)) {
    return json({ error: 'Choose Domestic or International.' }, 400);
  }
  const record = { id: input.id, type: input.type, price_inr: input.price_inr ?? null };
  for (const [key, maxLength] of Object.entries(textLimits)) {
    const value = input[key] ?? '';
    if (typeof value !== 'string' || value.trim().length > maxLength) {
      return json({ error: 'Check the package details and try again.' }, 400);
    }
    record[key] = value.trim();
  }
  if (!record.title) return json({ error: 'Enter a package name.' }, 400);
  if (record.price_inr !== null && (!Number.isInteger(record.price_inr) || record.price_inr < 1 || record.price_inr > 99999999)) {
    return json({ error: 'Enter a valid whole-rupee price.' }, 400);
  }
  if (!validImageUrl(record.image_url)) return json({ error: 'Enter a valid HTTPS photo URL.' }, 400);

  const saved = await supabase(path + '?on_conflict=id&select=' + columns, {
    method: 'POST',
    headers: { 'content-type': 'application/json', prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(record)
  });
  if (!saved.ok) throw new Error('Holiday package save failed: ' + saved.status);
  const [published] = await saved.json();
  if (!published) throw new Error('Holiday package save returned no record.');
  return json({ package: published }, 201);
}
