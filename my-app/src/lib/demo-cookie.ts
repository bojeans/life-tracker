// Cookie name shared by the actor resolver and the edge proxy. Kept in its own
// module (no db import) so the proxy can import it in the edge runtime.
export const DEMO_COOKIE = "demo_user";
