/* Headless self-test: boots the editor without WebGL using jsdom and a fake studio.
   Run with: npm run test */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import * as THREE from 'three';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const dom = new JSDOM(html, { url: 'http://localhost/', pretendToBeVisual: true });
const { window } = dom;
globalThis.window = window;
globalThis.document = window.document;
globalThis.HTMLElement = window.HTMLElement;
globalThis.Event = window.Event;
globalThis.localStorage = window.localStorage;
globalThis.requestAnimationFrame = (fn) => setTimeout(() => fn(performance.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);

// minimal 2D canvas so procedural textures can be generated
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
window.HTMLCanvasElement.prototype.getContext = function () {
	if (!this.__ctx) this.__ctx = fakeCtx();
	return this.__ctx;
};
window.HTMLCanvasElement.prototype.toDataURL = function () {
	return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';
};
window.__LPS_NO_AUTOBOOT = true;
globalThis.ResizeObserver = class {
	observe() {}
	unobserve() {}
	disconnect() {}
};

let failures = 0;
let checks = 0;
function ok(cond, label, extra = '') {
	checks++;
	if (!cond) {
		failures++;
		console.error(`✖ ${label}${extra ? ` — ${extra}` : ''}`);
	}
}
function section(name) {
	console.log(`\n▸ ${name}`);
}

/* --------------------------- fake studio -------------------------------- */
class FakeStudio {
	constructor() {
		this.objects = new Map();
		this.camera = new THREE.PerspectiveCamera(45, 1.6, 0.1, 200);
		this.camera.rotation.order = 'YXZ';
		this.camera.position.set(4.6, 2.5, 6.4);
		this.camera.lookAt(0, 1.05, 0);
		this.controls = { target: new THREE.Vector3(0, 1.05, 0) };
		this.transform = { detach() {}, attach() {} };
		this.selectionBox = { visible: false };
		this.selectedId = null;
		this.calls = [];
		this.lastTween = null;
		this.scene = new THREE.Scene();
		this.renderer = { domElement: document.createElement('canvas'), render() {} };
	}
	_calls(name, ...args) {
		this.calls.push([name, args]);
	}
	_fakeObj(item, kind) {
		const t = item.transform || { p: [0, 0, 0], r: [0, 0, 0], s: 1 };
		return {
			position: new THREE.Vector3(...t.p),
			rotation: new THREE.Euler(THREE.MathUtils.degToRad(t.r[0]), THREE.MathUtils.degToRad(t.r[1]), THREE.MathUtils.degToRad(t.r[2])),
			scale: new THREE.Vector3().setScalar(t.s ?? 1),
			visible: item.visible !== false,
			userData: { item, itemId: item.id, kind, talking: false },
		};
	}
	setEnvironment() {
		this._calls('setEnvironment');
	}
	updateLighting() {
		this._calls('updateLighting');
	}
	rebuildAll() {
		this._calls('rebuildAll');
		this.objects.clear();
	}
	addItem(_p, item, kind) {
		this._calls('addItem', item.id);
		const o = this._fakeObj(item, kind);
		this.objects.set(item.id, o);
		return o;
	}
	removeItem(id) {
		this._calls('removeItem', id);
		this.objects.delete(id);
	}
	rebuildItem(_p, item, kind) {
		this._calls('rebuildItem', item.id);
		this.objects.set(item.id, this._fakeObj(item, kind));
	}
	updateTransform(_p, id) {
		const item = _p.characters.find((c) => c.id === id) || _p.props.find((p) => p.id === id);
		if (!item) return;
		this.objects.set(id, this._fakeObj(item, this.objects.get(id)?.userData?.kind || 'prop'));
	}
	setVisible(id, v) {
		const o = this.objects.get(id);
		if (o) o.visible = v;
	}
	select(id) {
		this.selectedId = id;
	}
	setGizmoMode() {}
	setGizmoSnap() {}
	setLocked() {}
	setDimmed() {}
	frameObject() {}
	frameAll() {}
	resetCamera() {
		this.camera.position.set(4.6, 2.5, 6.4);
	}
	view() {
		const e = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
		return {
			p: this.camera.position.toArray().map((v) => +v.toFixed(3)),
			r: [THREE.MathUtils.radToDeg(e.x), THREE.MathUtils.radToDeg(e.y), THREE.MathUtils.radToDeg(e.z)].map((v) => +v.toFixed(2)),
			fov: this.camera.fov,
		};
	}
	setView(v) {
		if (!v) return;
		this.camera.position.fromArray(v.p);
		this.camera.rotation.set(THREE.MathUtils.degToRad(v.r?.[0] || 0), THREE.MathUtils.degToRad(v.r?.[1] || 0), THREE.MathUtils.degToRad(v.r?.[2] || 0), 'YXZ');
		if (v.fov) this.camera.fov = v.fov;
		this.camera.updateProjectionMatrix();
	}
	applyKeyframe(kf) {
		this.camera.position.fromArray(kf.p);
		this.camera.rotation.set(THREE.MathUtils.degToRad(kf.r[0]), THREE.MathUtils.degToRad(kf.r[1]), THREE.MathUtils.degToRad(kf.r[2]), 'YXZ');
		this.camera.fov = kf.fov;
		this.camera.updateProjectionMatrix();
	}
	tweenTo(pos, look, dur, fov) {
		this.lastTween = { pos, look, dur, fov };
		this.camera.position.copy(pos);
		this.camera.lookAt(look);
		if (fov) this.camera.fov = fov;
	}
	stopTween() {}
	characterShot(id, shot) {
		const o = this.objects.get(id);
		if (!o) return null;
		return { pos: new THREE.Vector3(o.position.x, 1.6, o.position.z + 3), look: new THREE.Vector3(o.position.x, 1.3, o.position.z), fov: 38 };
	}
	twoShot() {
		return { pos: new THREE.Vector3(0, 1.8, 4), look: new THREE.Vector3(0, 1.2, 0), fov: 40 };
	}
	updateRig(data) {
		this._calls('updateRig', data.id);
	}
}

/* ------------------------------- boot ---------------------------------- */
const mod = await import(path.join(root, 'src/app.js'));
const {
	app,
	renderPanel,
	renderHUD,
	renderTimeline,
	selectItem,
	setTab,
	handleAction,
	handleInputEvent,
	commit,
	sampleCamera,
	captureKeyframe,
	startVN,
	advanceVN,
	endVN,
	setClean,
	createTexture,
	applyTexture,
	scatterProps,
	addCharacter,
	addProp,
	addLine,
	bindGlobalUI,
} = mod.__internals;

const state = await import(path.join(root, 'src/state.js'));
const lowpoly = await import(path.join(root, 'src/lowpoly.js'));

app.project = state.defaultProject();
app.studio = new FakeStudio();
app.studio.rebuildAll(app.project);
app.project.characters.forEach((c) => app.studio.addItem(app.project, c, 'char'));
app.project.props.forEach((p) => app.studio.addItem(app.project, p, 'prop'));
renderHUD();

const panel = () => document.querySelector('#panel');
const acts = new Set();

function collectActs(htmlStr) {
	for (const m of htmlStr.matchAll(/data-act="([^"]+)"/g)) acts.add(m[1]);
}

/* ----------------------------- 1. geometry ------------------------------ */
section('Low-poly builders');
const char = lowpoly.buildCharacter(app.project.characters[0]);
let meshCount = 0;
char.traverse((o) => {
	if (o.isMesh) meshCount++;
});
ok(meshCount > 12, `character mesh count (${meshCount})`);
const expressions = ['neutral', 'happy', 'sad', 'angry', 'surprised'];
for (const expression of expressions) {
	const c = lowpoly.buildCharacter({ ...app.project.characters[0], expression });
	ok(c.children.length > 0, `character builds (${expression})`);
}
for (const hairStyle of ['short', 'bob', 'long', 'spiky', 'bun', 'ponytail', 'mohawk', 'bald', 'wavy', 'afro', 'braids']) {
	const c = lowpoly.buildCharacter({ ...app.project.characters[0], hairStyle });
	ok(c.userData.rig?.skull, `hair style builds (${hairStyle})`);
}
for (const topStyle of ['tee', 'hoodie', 'jacket', 'dress', 'suit', 'overalls', 'coat']) {
	const c = lowpoly.buildCharacter({ ...app.project.characters[0], topStyle });
	ok(c.userData.rig?.body, `outfit builds (${topStyle})`);
}
for (const accessory of ['none', 'hat', 'cap', 'glasses', 'crown', 'headphones', 'beanie', 'catEars', 'scarf']) {
	const c = lowpoly.buildCharacter({ ...app.project.characters[0], accessory });
	ok(c.userData.rig?.skull, `accessory builds (${accessory})`);
}
{
	const c = lowpoly.buildCharacter({ ...app.project.characters[0], eyeColor: '#2f6f8f' });
	let found = false;
	c.traverse((o) => {
		if (o.isMesh && o.material?.color?.getHexString?.() === '2f6f8f') found = true;
	});
	ok(found, 'eye colour applied to the face');
}
for (const pose of ['idle', 'wave', 'point', 'talk', 'crossed', 'hips', 'sit', 'run']) {
	const c = lowpoly.buildCharacter({ ...app.project.characters[0], pose });
	ok(c.userData.rig, `pose builds (${pose})`);
}
for (const kind of state.PROP_CATALOG.map((p) => p.kind)) {
	const prop = state.newProp(kind);
	const g = lowpoly.buildProp(prop, app.project.textures[0]);
	let meshes = 0;
	g.traverse((o) => {
		if (o.isMesh) meshes++;
	});
	ok(meshes > 0, `prop builds: ${kind}`);
}
for (const t of state.TEXTURE_TYPES) {
	const def = state.newTexture(t.type);
	const thumb = lowpoly.textureThumb(def, 32);
	ok(typeof thumb === 'string' && thumb.startsWith('data:image'), `texture thumbnail: ${t.type}`);
}
// disposal must not throw
const discard = lowpoly.buildCharacter({ ...app.project.characters[0] });
lowpoly.disposeObject(discard);
ok(discard.parent === null, 'disposeObject detaches');

/* ----------------------------- 2. panels -------------------------------- */
section('Panel rendering');
for (const tab of ['home', 'characters', 'scene', 'props', 'textures', 'objects', 'dialogue', 'camera', 'play']) {
	app.tab = tab;
	app.selection = app.project.characters[0].id;
	renderPanel();
	const p = panel();
	const length = p.innerHTML.length;
	ok(length > 300, `panel renders: ${tab} (${length} chars)`);
	ok(p.querySelectorAll('[data-act]').length > 0, `panel has actions: ${tab}`);
	collectActs(p.innerHTML);
	// reparse to catch malformed output
	const reparsed = new JSDOM(`<div id="x">${p.innerHTML}</div>`);
	ok(reparsed.window.document.querySelectorAll('#x > *').length > 0, `panel parses: ${tab}`);
}
app.tab = 'characters';
setTab('camera');
const tl = document.querySelector('#timeline');
ok(tl && !tl.hidden && tl.innerHTML.includes('tl-ticks'), 'timeline renders in camera tab');
collectActs(tl.innerHTML);
app.tab = 'characters';
renderPanel();
collectActs(document.querySelector('#hud').innerHTML);
collectActs(html);

/* ---------------------------- 3. actions -------------------------------- */
section('Editor actions');
const before = app.project.characters.length;
addCharacter();
ok(app.project.characters.length === before + 1, 'add character');
ok(app.selection === app.project.characters.at(-1).id, 'new character selected');

const c2 = app.project.characters.at(-1);
handleAction('set-expression', { dataset: { id: c2.id, value: 'angry' } });
ok(c2.expression === 'angry', 'set expression action');
handleAction('set-pose', { dataset: { id: c2.id, value: 'wave' } });
ok(c2.pose === 'wave', 'set pose action');
handleAction('char-style', { dataset: { id: c2.id, path: 'hairStyle', value: 'afro' } });
ok(c2.hairStyle === 'afro', 'char-style sets hair style');
handleAction('char-style', { dataset: { id: c2.id, path: 'topStyle', value: 'coat' } });
ok(c2.topStyle === 'coat', 'char-style sets outfit');
handleAction('char-color', { dataset: { id: c2.id, path: 'eyeColor', value: '#2f6f8f' } });
ok(c2.eyeColor === '#2f6f8f', 'char-color sets eye colour');

const envBefore = app.project.environment.time;
handleAction('time-of-day', { dataset: { value: 'night' } });
ok(app.project.environment.time === 'night' && app.project.environment.time !== envBefore, 'time of day applies');
ok(app.project.environment.sun < 1, 'night light is dim');

const kfBeforeMove = app.project.camera.keyframes.length;
handleAction('cam-move', { dataset: { value: 'push' } });
ok(app.project.camera.keyframes.length > kfBeforeMove, 'quick camera move adds keyframes');

const propsBefore = app.project.props.length;
addProp('tree');
ok(app.project.props.length === propsBefore + 1, 'add prop');
ok(app.selection === app.project.props.at(-1).id, 'new prop selected');

const texBefore = app.project.textures.length;
createTexture();
ok(app.project.textures.length === texBefore + 1, 'create texture');
applyTexture();
ok(app.project.props.at(-1).textureId === app.project.textures.at(-1).id, 'apply texture to prop');

const scatterBefore = app.project.props.length;
app.tab = 'scene';
renderPanel();
document.querySelector('#scatterKind').value = 'bush';
document.querySelector('#scatterCount').value = '4';
document.querySelector('#scatterRadius').value = '6';
scatterProps();
ok(app.project.props.length === scatterBefore + 4, 'scatter adds props');

const linesBefore = app.project.dialogue.lines.length;
addLine();
ok(app.project.dialogue.lines.length === linesBefore + 1, 'add dialogue line');

app.tab = 'dialogue';
app.selection = null;
renderPanel();
const lineId = app.project.dialogue.lines[0].id;
handleAction('line-dup', { dataset: { id: lineId } });
ok(app.project.dialogue.lines.length === linesBefore + 2, 'duplicate line');
handleAction('line-up', { dataset: { id: app.project.dialogue.lines[1].id } });
ok(app.project.dialogue.lines[1].id === lineId, 'move line up');
handleAction('line-del', { dataset: { id: app.project.dialogue.lines[1].id } });
ok(app.project.dialogue.lines.length === linesBefore + 1, 'delete line');

// input events
app.tab = 'scene';
renderPanel();
const sunInput = panel().querySelector('[data-path="environment.sun"]');
ok(!!sunInput, 'environment input exists');
sunInput.value = '2.1';
handleInputEvent({ target: sunInput }, false);
handleInputEvent({ target: sunInput }, true);
ok(app.project.environment.sun === 2.1, 'environment input updates state');

app.tab = 'characters';
app.selection = app.project.characters[0].id;
renderPanel();
const nameInput = panel().querySelector('[data-path="name"]');
nameInput.value = 'Renamed';
handleInputEvent({ target: nameInput }, false);
handleInputEvent({ target: nameInput }, true);
ok(app.project.characters[0].name === 'Renamed', 'character name input updates state');

/* --------------------------- 4. camera ---------------------------------- */
section('Camera keyframes');
app.tab = 'camera';
renderPanel();
const kfBefore = app.project.camera.keyframes.length;
app.cam.time = 2;
captureKeyframe();
ok(app.project.camera.keyframes.length === kfBefore + 1, 'capture keyframe');
const sorted = [...app.project.camera.keyframes].sort((a, b) => a.t - b.t);
ok(
	sorted.every((k, i) => i === 0 || sorted[i - 1].t <= k.t),
	'keyframes sorted'
);
ok(sampleCamera(1.7) === true, 'sample camera mid-sequence');
const camPos = app.studio.camera.position.clone();
sampleCamera(app.project.camera.duration);
ok(app.studio.camera.position.distanceTo(camPos) > 0.05, 'camera moves between keyframes');
ok(app.studio.camera.fov > 5, 'camera fov sane');

/* ----------------------------- 5. VN ------------------------------------ */
section('Visual novel playback');
setClean(true, true);
ok(document.body.classList.contains('clean'), 'clean mode on');
setClean(false, true);
startVN(0);
ok(app.playingVN, 'VN starts');
ok(!document.querySelector('#vnOverlay').hidden, 'VN overlay visible');
ok(document.body.classList.contains('vn'), 'VN body class');
ok(app.studio.lastTween !== null, 'VN frames the speaker');
const total = app.project.dialogue.lines.length;
for (let i = 0; i < total + 3; i++) {
	advanceVN(); // first completes typing, second advances
	advanceVN();
}
ok(!app.playingVN, 'VN ends after the last line');
ok(document.querySelector('#vnOverlay').hidden, 'VN overlay hidden after exit');
endVN();

/* -------------------------- 6. DOM wiring -------------------------------- */
section('DOM wiring');
bindGlobalUI();
const clickEl = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
const pressKey = (key) => document.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true }));

setTab('characters');
renderPanel();
const chip = document.querySelector('.cast[data-act="select-item"]');
ok(!!chip, 'character cast cards render');
clickEl(chip);
ok(app.selection === chip.dataset.id, 'clicking a chip selects the character');

clickEl(document.querySelector('.tab[data-tab="props"]'));
ok(app.tab === 'props', 'clicking a tab switches panel');

setTab('objects');
renderPanel();
const eye = document.querySelector('[data-act="toggle-visible"]');
const eyeId = eye.dataset.id;
const beforeVis = state.findItem(app.project, eyeId).visible !== false;
clickEl(eye);
ok((state.findItem(app.project, eyeId).visible !== false) !== beforeVis, 'eye button toggles visibility');
clickEl(document.querySelector('[data-act="toggle-visible"]'));

pressKey('h');
ok(app.clean, 'H enters clean mode');
pressKey('h');
ok(!app.clean, 'H exits clean mode');

pressKey('p');
ok(app.playingVN, 'P starts the VN');
pressKey('Escape');
ok(!app.playingVN, 'Escape exits the VN');

clickEl(document.querySelector('[data-act="menu-toggle"]'));
ok(!document.querySelector('#menuPop').hidden, 'menu opens');
clickEl(document.body);
ok(document.querySelector('#menuPop').hidden, 'clicking outside closes the menu');

clickEl(document.querySelector('[data-act="clean-toggle"]'));
ok(app.clean, 'clean button hides the UI');
clickEl(document.querySelector('[data-act="clean-toggle"]'));
ok(!app.clean, 'clean button restores the UI');

/* -------------------------- 7. interactions ----------------------------- */
section('Action coverage');
const src = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const handled = new Set([...src.matchAll(/case '([a-z0-9-]+)':/g)].map((m) => m[1]));
const missing = [...acts].filter((a) => !handled.has(a));
ok(missing.length === 0, 'every data-act has a handler', missing.join(', '));

/* -------------------------- 8. persistence ------------------------------ */
section('Persistence & normalisation');
const roundTrip = state.normalizeProject(JSON.parse(JSON.stringify(app.project)));
ok(roundTrip.characters.length === app.project.characters.length, 'normalize keeps characters');
ok(roundTrip.dialogue.lines.length === app.project.dialogue.lines.length, 'normalize keeps dialogue');
const broken = state.normalizeProject({ characters: [{ id: 'x', name: 'Only name' }], camera: { keyframes: [{ t: 'bad' }] } });
ok(broken.characters[0].hairStyle === 'short', 'normalize fills missing character fields');
ok(broken.camera.keyframes[0].p.length === 3, 'normalize fixes bad keyframe');
ok(state.getPath({ a: { b: 2 } }, 'a.b') === 2, 'getPath');
state.setPath({}, 'a.b.c', 5);
ok(true, 'setPath does not throw');

/* ----------------------------- summary ---------------------------------- */
console.log(`\n${failures === 0 ? '✅' : '❌'} ${checks - failures}/${checks} checks passed`);
if (failures) process.exit(1);
