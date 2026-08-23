const BACKEND_ORIGIN = 'https://facturd-api-pruebas.onrender.com';

export const onRequest = async ({ request }) => {
  const incoming = new URL(request.url);
  const upstreamUrl = new URL(incoming.pathname + incoming.search, BACKEND_ORIGIN);

  const headers = new Headers(request.headers);
  headers.delete('cookie');
  headers.delete('referer');
  headers.set('x-forwarded-host', incoming.hostname);

  const method = request.method.toUpperCase();
  const body = method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer();

  const upstream = await fetch(upstreamUrl, {
    method,
    headers,
    body,
    redirect: 'manual',
  });

  const responseHeaders = new Headers(upstream.headers);
  const setCookie = responseHeaders.get('set-cookie');
  if (setCookie && !/^https?:\/\//i.test(setCookie)) {
    responseHeaders.set('set-cookie', setCookie.replace(/;\s*samesite=lax/i, '; samesite=none; secure'));
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
};
