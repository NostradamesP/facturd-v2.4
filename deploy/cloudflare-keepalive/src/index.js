const TARGET = 'https://facturd-api-pruebas.onrender.com/api/health';

async function ping() {
  try {
    const res = await fetch(TARGET, { cf: { cacheTtl: 0 } });
    console.log('keepalive', res.status);
    return res.status;
  } catch (e) {
    console.error('keepalive failed', e.message);
    return 0;
  }
}

export default {
  async fetch() {
    const status = await ping();
    return new Response(`keepalive:${status}`, {
      status: status === 200 ? 200 : 502,
      headers: { 'content-type': 'text/plain' },
    });
  },
  async scheduled(controller, env, ctx) {
    await ping();
  },
};
