import technicalSummary from "../odds_joint_model.html";

const responseHeaders = {
  "Cache-Control": "public, max-age=0, must-revalidate",
  "Content-Type": "text/html; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet"
};

export function onRequestGet() {
  return new Response(technicalSummary, { headers: responseHeaders });
}

export function onRequestHead() {
  return new Response(null, { headers: responseHeaders });
}
