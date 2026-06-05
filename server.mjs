import { createServer } from "node:http";
import { createReadStream, existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 3000);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    if (url.pathname.startsWith("/api/")) {
      return await handleApi(req, res, url.pathname);
    }

    return serveStatic(url.pathname, res);
  } catch (error) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: error.message }));
  }
}).listen(port, () => {
  console.log(`NOIR FRAME dev server running at http://localhost:${port}`);
});

async function handleApi(req, res, pathname) {
  const file = join(root, `${pathname}.js`);
  if (!existsSync(file)) {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: "API route not found" }));
    return;
  }

  const mod = await import(`${pathToFileURL(file).href}?t=${Date.now()}`);
  await mod.default(req, res);
}

function serveStatic(pathname, res) {
  const routeMap = new Map([
    ["/", "/index.html"],
    ["/shop", "/index.html"],
    ["/cart", "/index.html"],
    ["/checkout", "/index.html"],
    ["/success", "/index.html"],
    ["/fail", "/index.html"],
    ["/orders", "/index.html"],
    ["/admin", "/admin.html"],
  ]);

  let relativePath = routeMap.get(pathname) || pathname;
  if (relativePath.startsWith("/product/")) relativePath = "/index.html";
  if (relativePath.startsWith("/products/")) relativePath = `/public${relativePath}`;
  if (relativePath === "/favicon.ico") relativePath = "/public/favicon.svg";

  const filePath = normalize(join(root, relativePath));
  if (!filePath.startsWith(root) || !existsSync(filePath)) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Not found");
    return;
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", contentTypes[extname(filePath)] || "application/octet-stream");
  createReadStream(filePath).pipe(res);
}
