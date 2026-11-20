const endpoint = 'https://kbwqqicmmpmjazjwsqsk.supabase.co/functions/v1/jas-content';

async function enquiryRequest(options, parameters = {}) {
  const url = new URL(endpoint);
  url.search = new URLSearchParams({ resource: 'enquiries', ...parameters });
  const response = await fetch(url, options);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not complete the enquiry request.');
  return result;
}
export function submitEnquiry(enquiry) {
  return enquiryRequest({
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify(enquiry)
  });
}
export function listEnquiries(token, filter, cursor) {
  return enquiryRequest({ headers: { authorization: 'Bearer ' + token } },
    { ...filter, ...cursor });
}
