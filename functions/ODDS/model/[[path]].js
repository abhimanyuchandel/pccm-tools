export function onRequest() {
  return Response.json(
    { ok: false, error: "Not found" },
    {
      status: 404,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
