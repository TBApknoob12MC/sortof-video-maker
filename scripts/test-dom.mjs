// Shared jsdom environment for the headless tests (no WebGL required).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fakeCtx() {
	return {
		canvas: null,
		fillStyle: '#000',
		strokeStyle: '#000',
		lineWidth: 1,
		globalAlpha: 1,
		fillRect() {},
		strokeRect() {},
		beginPath() {},
		closePath() {},
		fill() {},
		stroke() {},
		arc() {},
		moveTo() {},
		lineTo() {},
		createLinearGradient() {
			return { addColorStop() {} };
		},
		createImageData(w, h) {
			return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
		},
		putImageData() {},
		getImageData(x, y, w, h) {
			return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
		},
	};
}

export function setupDom({ autoboot = false } = {}) {
	const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
	const dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true });
	const { window } = dom;
	globalThis.window = window;
	globalThis.document = window.document;
	globalThis.HTMLElement = window.HTMLElement;
	globalThis.Event = window.Event;
	globalThis.localStorage = window.localStorage;

	window.HTMLCanvasElement.prototype.getContext = function () {
		if (!this.__ctx) this.__ctx = fakeCtx();
		return this.__ctx;
	};
	window.HTMLCanvasElement.prototype.toDataURL = function () {
		return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';
	};
	if (!autoboot) window.__LPS_NO_AUTOBOOT = true;
	globalThis.ResizeObserver = class {
		observe() {}
		unobserve() {}
		disconnect() {}
	};
	return window;
}

export function makeReporter() {
	const state = { checks: 0, failures: 0 };
	return {
		ok(cond, label, extra = '') {
			state.checks++;
			if (!cond) {
				state.failures++;
				console.error(`✖ ${label}${extra ? ` — ${extra}` : ''}`);
			}
		},
		section(name) {
			console.log(`\n▸ ${name}`);
		},
		summary() {
			console.log(`\n${state.failures === 0 ? '✅' : '❌'} ${state.checks - state.failures}/${state.checks} checks passed`);
			return state.failures;
		},
	};
}
