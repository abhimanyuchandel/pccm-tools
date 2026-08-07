const ODDS_BACKEND_ORIGIN = "https://pccm-odds-backend.onrender.com";

export async function onRequest(context) {
  const incomingUrl = new URL(context.request.url);
  const backendUrl = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, ODDS_BACKEND_ORIGIN);
  const requestHeaders = new Headers(context.request.headers);
  requestHeaders.delete("host");

  const requestInit = {
    method: context.request.method,
    headers: requestHeaders,
    redirect: "manual"
  };

  if (!["GET", "HEAD"].includes(context.request.method)) {
    requestInit.body = context.request.body;
  }

  const backendResponse = await fetch(new Request(backendUrl, requestInit));
  const responseHeaders = new Headers(backendResponse.headers);
  responseHeaders.set("Cache-Control", "no-store");
  responseHeaders.delete("set-cookie");

  return new Response(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: responseHeaders
  });
}
