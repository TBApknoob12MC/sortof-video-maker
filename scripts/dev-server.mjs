// Tiny zero-dependency static server for local development and preview.
// Usage: node scripts/dev-server.mjs [dir] [port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.resolve(root, process.argv[2] || '.');
const port = Number(process.env.PORT || process.argv[3] || 5173);
const host = process.env.HOST || '0.0.0.0';

const MIME = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.webp': 'image/webp',
	'.ico': 'image/x-icon',
	'.woff2': 'font/woff2',
	'.txt': 'text/plain; charset=utf-8',
	'.map': 'application/json',
};

const server = http.createServer((req, res) => {
	const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
	let filePath = path.join(dir, urlPath);
	if (!filePath.startsWith(dir)) {
		res.writeHead(403, { 'content-type': 'text/plain' });
		res.end('Forbidden');
		return;
	}
	try {
		if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, 'index.html');
		if (!fs.existsSync(filePath)) {
			// SPA fallback for extension-less paths
			if (!path.extname(urlPath)) {
				filePath = path.join(dir, 'index.html');
				if (!fs.existsSync(filePath)) throw new Error('not found');
			} else {
				res.writeHead(404, { 'content-type': 'text/plain' });
				res.end('Not found');
				return;
			}
		}
		const ext = path.extname(filePath).toLowerCase();
		const stat = fs.statSync(filePath);
		res.writeHead(200, {
			'content-type': MIME[ext] || 'application/octet-stream',
			'content-length': stat.size,
			'cache-control': 'no-store, max-age=0',
			'access-control-allow-origin': '*',
			'cross-origin-opener-policy': 'same-origin-allow-popups',
		});
		if (req.method === 'HEAD') {
			res.end();
			return;
		}
		fs.createReadStream(filePath).pipe(res);
	} catch {
		res.writeHead(404, { 'content-type': 'text/plain' });
		res.end('Not found');
	}
});

server.listen(port, host, () => {
	console.log(`\n  Low Poly Studio`);
	console.log(`  ➜  http://localhost:${port}`);
	console.log(`  serving ${dir}\n`);
});
