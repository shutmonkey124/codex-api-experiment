import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { extname, resolve, sep } from "node:path";
import { ratesMiddleware } from "./rates.ts";

const root = fileURLToPath(new URL("../dist/", import.meta.url));
const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "0.0.0.0";
const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".ico": "image/x-icon",
};
try {
  await stat(resolve(root, "index.html"));
} catch {
  console.error("No production build found. Run npm run build first.");
  process.exit(1);
}

const server = createServer(async (request, response) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  );
  await ratesMiddleware(request, response, () => {
    void (async () => {
      if (request.method !== "GET" && request.method !== "HEAD") {
        response
          .writeHead(405, { Allow: "GET, HEAD" })
          .end("Method not allowed");
        return;
      }
      let pathname: string;
      try {
        pathname = decodeURIComponent(
          new URL(request.url ?? "/", "http://localhost").pathname,
        );
      } catch {
        response.writeHead(400).end("Invalid URL");
        return;
      }
      const path = resolve(root, `.${pathname}`);
      if (
        path !== root.slice(0, -1) &&
        !path.startsWith(root.endsWith(sep) ? root : root + sep)
      ) {
        response.writeHead(403).end("Forbidden");
        return;
      }
      try {
        const target = !extname(path) ? resolve(root, "index.html") : path;
        const contents = await readFile(target);
        response.setHeader(
          "Content-Type",
          types[extname(target)] ?? "application/octet-stream",
        );
        response.setHeader(
          "Cache-Control",
          pathname.startsWith("/assets/")
            ? "public, max-age=31536000, immutable"
            : "no-cache",
        );
        response
          .writeHead(200)
          .end(request.method === "HEAD" ? undefined : contents);
      } catch {
        response.writeHead(404).end("Not found");
      }
    })().catch(() => {
      if (!response.headersSent) response.writeHead(500);
      response.end("Could not serve this request");
    });
  });
});
server.listen(port, host, () =>
  console.log(`Elsewhere is running on port ${port}.`),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => server.close(() => process.exit(0)));
