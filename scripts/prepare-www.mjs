// Copies the static app into www/ for Capacitor (Android/iOS) packaging.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'www');

const ENTRIES = [
	['index.html', 'index.html'],
	['css', 'css'],
	['src', 'src'],
];

function rmrf(target) {
	fs.rmSync(target, { recursive: true, force: true });
}

function copy(src, dest) {
	const stat = fs.statSync(src);
	if (stat.isDirectory()) {
		fs.mkdirSync(dest, { recursive: true });
		for (const entry of fs.readdirSync(src)) {
			if (entry.startsWith('.')) continue;
			copy(path.join(src, entry), path.join(dest, entry));
		}
		return;
	}
	fs.mkdirSync(path.dirname(dest), { recursive: true });
	fs.copyFileSync(src, dest);
}

rmrf(out);
fs.mkdirSync(out, { recursive: true });
for (const [srcRel, destRel] of ENTRIES) {
	const src = path.join(root, srcRel);
	if (!fs.existsSync(src)) {
		console.warn(`! missing ${srcRel}, skipped`);
		continue;
	}
	copy(src, path.join(out, destRel));
}

// Make absolutely sure the app never phones home — it is fully offline.
const walk = (dir) => {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(full);
		else if (/\.(html|js|css)$/.test(entry.name) && !full.includes(`${path.sep}vendor${path.sep}`)) {
			const src = fs.readFileSync(full, 'utf8');
			const external = [...src.matchAll(/https?:\/\/[^\s'"`)]+/g)]
				.map((m) => m[0])
				.filter((url) => !url.includes('www.w3.org') && !url.includes('localhost') && !url.includes('127.0.0.1'));
			if (external.length) {
				console.warn(`! ${path.relative(root, full)} references external URLs: ${[...new Set(external)].slice(0, 3).join(', ')}`);
			}
		}
	}
};
walk(out);

const bytes = (function du(dir) {
	return fs.readdirSync(dir, { withFileTypes: true }).reduce((sum, e) => {
		const full = path.join(dir, e.name);
		return sum + (e.isDirectory() ? du(full) : fs.statSync(full).size);
	}, 0);
})(out);

console.log(`✓ www/ prepared (${(bytes / 1024 / 1024).toFixed(2)} MB) — ready for "npx cap sync"`);
