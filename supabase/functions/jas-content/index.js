import { createRemoteJWKSet, jwtVerify } from 'npm:jose@6.1.2';

const project = 'brivora-3cf80';
const admin = 'ydJDSUYmJoWeww9rfrboUQkfnPv1';
const keys = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
const pages = new Set(['index', 'about', 'flight', 'train', 'bus', 'domestic', 'international', 'contact']);
const types = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
const origins = new Set(['https://jastourandtravels.pages.dev', 'https://erkuldeepkushwah.github.io']);
const url = Deno.env.get('SUPABASE_URL');
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const bucket = 'jas-website-images';

async function trustedAdmin(request) {
  const token = request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, keys, {
      algorithms: ['RS256'],
      audience: project,
      issuer: 'https://securetoken.google.com/' + project,
      subject: admin,
      requiredClaims: ['exp', 'iat', 'auth_time'],
      maxTokenAge: '1h',
      clockTolerance: 5
    });
    return typeof payload.auth_time === 'number' && payload.auth_time <= Date.now() / 1000 + 5;
  } catch {
    return false;
  }
}

function supabase(path, init = {}) {
  return fetch(url + path, {
    ...init,
    headers: { ...init.headers, apikey: serviceKey, authorization: 'Bearer ' + serviceKey }
  });
}

function validField(key, value) {
  return /^f[0-9]+_[a-z0-9]+$/.test(key) &&
    (value === null || (typeof value === 'string' && value.trim() && value.length <= 4000));
}

async function requestBody(request, limit) {
  const parts = [];
  let bytes = 0;
  for await (const chunk of request.body ?? []) {
    bytes += chunk.byteLength;
    if (bytes > limit) return null;
    parts.push(chunk);
  }
  return new Blob(parts);
}

async function legacyFields(page) {
  try {
    const response = await fetch('https://brivora-3cf80-default-rtdb.firebaseio.com/jasWebsiteContent/' + page + '.json', {
      signal: AbortSignal.timeout(2500)
    });
    if (response.ok) {
      const fields = await response.json();
      return Object.fromEntries(Object.entries(fields ?? {}).filter(([key, value]) => value !== null && validField(key, value)));
    }
    console.warn('Legacy Firebase content returned HTTP ' + response.status);
  } catch {
    console.warn('Legacy Firebase content could not be reached');
  }
  return {};
}

async function existingPage(page) {
  const read = await supabase('/rest/v1/jas_page_content?select=fields&page=eq.' + page);
  if (!read.ok) throw new Error('Content read failed');
  const [record] = await read.json();
  return record;
}

Deno.serve(async (request) => {
  const origin = request.headers.get('origin');
  const headers = { vary: 'Origin', 'cache-control': 'no-store' };
  if (origins.has(origin)) headers['access-control-allow-origin'] = origin;
  const json = (data, status = 200) => Response.json(data, { status, headers });
  if (origin && !origins.has(origin)) return json({ error: 'Origin not allowed' }, 403);
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: {
      ...headers, 'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS',
      'access-control-allow-headers': 'authorization, content-type'
    } });
  }
  const params = new URL(request.url).searchParams;
  const page = params.get('page');
  if (!pages.has(page)) return json({ error: 'Unknown page' }, 400);
  try {
    if (request.method === 'GET') {
      const record = await existingPage(page);
      return json({ fields: record?.fields ?? await legacyFields(page) });
    }
    if (!['POST', 'PATCH'].includes(request.method)) return json({ error: 'Method not allowed' }, 405);
    if (!await trustedAdmin(request)) return json({ error: 'Admin authorization required' }, 401);

    if (request.method === 'PATCH') {
      const body = await requestBody(request, 512 * 1024);
      if (!body) return json({ error: 'Request too large' }, 413);
      let changes;
      try { changes = JSON.parse(await body.text()); } catch { return json({ error: 'Invalid JSON' }, 400); }
      if (!changes || Array.isArray(changes) || typeof changes !== 'object' ||
          !Object.entries(changes).every(([key, value]) => validField(key, value))) {
        return json({ error: 'Invalid content fields' }, 400);
      }
      const initialFields = await existingPage(page) ? {} : await legacyFields(page);
      const write = await supabase('/rest/v1/rpc/jas_publish_page', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ page_name: page, field_patch: changes, initial_fields: initialFields })
      });
      if (!write.ok) throw new Error('Content publish failed');
      return json({ saved: true });
    }

    const imageId = params.get('image');
    const type = request.headers.get('content-type');
    if (!imageId || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(imageId) || !types.has(type)) {
      return json({ error: 'Unsupported image' }, 400);
    }
    const image = await requestBody(request, 8 * 1024 * 1024);
    if (!image?.size) return json({ error: 'Image must be between 1 byte and 8 MB' }, 413);
    const path = bucket + '/' + page + '/' + imageId;
    const upload = await supabase('/storage/v1/object/' + path, {
      method: 'POST', headers: { 'content-type': type, 'x-upsert': 'false' }, body: image
    });
    if (!upload.ok) {
      const failure = await upload.json().catch(() => ({}));
      if (upload.status !== 409 && failure.statusCode !== '409' && failure.statusCode !== 409) {
        throw new Error('Image upload failed: ' + upload.status);
      }
    }
    return json({ url: url + '/storage/v1/object/public/' + path });
  } catch (error) {
    console.error(error.message);
    return json({ error: 'Supabase request failed' }, 502);
  }
});
