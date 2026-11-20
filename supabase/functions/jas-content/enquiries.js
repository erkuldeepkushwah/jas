const categories = new Set(['flight','bus','train','domestic','international','contact']);
const uidPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const limits = {name:120,phone:24,email:254,service:100,destination:200,from:120,to:120,travelDate:10,travellers:2,budget:100,travelClass:100,message:2000};
function validDate(value) {
  if (!value || !datePattern.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
}

export async function handleEnquiries(request, params, json, supabase, trustedAdmin, requestBody) {
  if (request.method === 'POST') {
    const body = await requestBody(request, 8192);
    if (!body) return json({ error: 'Enquiry is too long.' }, 413);
    let input;
    try { input = JSON.parse(await body.text()); } catch { return json({ error: 'Invalid enquiry.' }, 400); }
    if (!input || !uidPattern.test(input.id) || !categories.has(input.category) || !input.details ||
        typeof input.details !== 'object' || Array.isArray(input.details)) {
      return json({ error: 'Invalid enquiry.' }, 400);
    }
    const entries = Object.entries(input.details);
    if (entries.some(([key, value]) => !Object.hasOwn(limits,key) || typeof value !== 'string' || value.trim().length > limits[key])) {
      return json({ error: 'Check the enquiry fields and try again.' }, 400);
    }
    const details = Object.fromEntries(entries.map(([key, value]) => [key,value.trim()]).filter(([, value]) => value));
    const digits = details.phone?.replace(/\D/g, '').length;
    if (!details.name || !details.phone || !/^[+\d(). -]+$/.test(details.phone) || digits < 7 || digits > 15 ||
        (details.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) ||
        (details.travelDate && !validDate(details.travelDate)) ||
        (details.travellers && (!/^\d+$/.test(details.travellers) || Number(details.travellers) < 1 || Number(details.travellers) > 30))) {
      return json({ error: 'Check your name, phone and travel details.' }, 400);
    }
    if (['flight','bus','train'].includes(input.category) && (!details.from || !details.to || !details.travelDate || !details.travellers)) {
      return json({ error: 'Enter the route, travel date and passenger count.' }, 400);
    }
    const saved = await supabase('/rest/v1/jas_enquiries?on_conflict=id', {
      method:'POST',
      headers:{'content-type':'application/json',prefer:'resolution=ignore-duplicates,return=minimal'},
      body:JSON.stringify({id:input.id,category:input.category,details})
    });
    if (!saved.ok) throw new Error('Enquiry insert failed: ' + saved.status);
    return json({ saved:true }, 201);
  }
  if (request.method !== 'GET') return json({ error:'Method not allowed' }, 405);
  if (!await trustedAdmin(request)) return json({ error:'Admin authorization required' }, 401);

  const from = params.get('from');
  const to = params.get('to');
  if ((from && !validDate(from)) || (to && !validDate(to)) || (from && to && from > to)) {
    return json({ error:'Invalid date range' }, 400);
  }
  const query = new URLSearchParams({select:'id,created_at,category,details',order:'created_at.desc,id.desc',limit:'101'});
  if (from) query.append('created_at','gte.' + new Date(from + 'T00:00:00+05:30').toISOString());
  if (to) query.append('created_at','lt.' + new Date(Date.parse(to + 'T00:00:00+05:30') + 86400000).toISOString());
  const cursorTime = params.get('cursorTime');
  const cursorId = params.get('cursorId');
  if (cursorTime || cursorId) {
    if (!cursorTime || !/^[\dTZ:+.\-]{20,40}$/.test(cursorTime) || !Number.isFinite(Date.parse(cursorTime)) || !uidPattern.test(cursorId)) {
      return json({ error:'Invalid page cursor' }, 400);
    }
    query.set('or','(created_at.lt.' + cursorTime + ',and(created_at.eq.' + cursorTime + ',id.lt.' + cursorId + '))');
  }
  const result = await supabase('/rest/v1/jas_enquiries?' + query);
  if (!result.ok) throw new Error('Enquiry read failed: ' + result.status);
  const rows = await result.json();
  const hasMore = rows.length > 100;
  if (hasMore) rows.pop();
  const last = rows.at(-1);
  return json({rows,next:hasMore ? {cursorTime:last.created_at,cursorId:last.id} : null});
}
