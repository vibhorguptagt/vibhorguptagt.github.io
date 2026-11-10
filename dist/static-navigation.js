// Serve the exported Next.js route data from ordinary static files.
const fetchFromHost = window.fetch.bind(window);
window.fetch = async (input, options) => {
  const url = new URL(input instanceof Request ? input.url : input, location.href);
  if (url.origin !== location.origin || !url.searchParams.has('_rsc')) {
    return fetchFromHost(input, options);
  }

  const path = url.pathname.replace(/\/$/, '');
  const exported = await fetchFromHost('/_flight' + path + '/index.txt', {
    signal: options?.signal,
  });
  if (!exported.ok) return fetchFromHost(input, options);

  const response = new Response(exported.body, {
    headers: { 'Content-Type': 'text/x-component' },
  });
  Object.defineProperty(response, 'url', { value: url.href });
  return response;
};
