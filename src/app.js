// Low Poly Studio — application shell, panels, VN player and camera timeline.
import * as THREE from 'three';
import { Studio } from './engine.js';
import {
	defaultProject,
	blankProject,
	loadProject,
	saveProject,
	clearProject,
	normalizeProject,
	deepClone,
	uid,
	getPath,
	setPath,
	newCharacter,
	newProp,
	newTexture,
	PROP_CATALOG,
	TEXTURE_TYPES,
	propLabel,
	propEmoji,
	propDefaultColor,
	EASINGS,
	findItem,
	itemKind,
	characterById,
	clamp,
	SKIN_TONES,
	HAIR_COLORS,
	CLOTH_COLORS,
} from './state.js';
import { textureThumb, characterHeight } from './lowpoly.js';
import { GameMode } from './game.js';

const D2R = THREE.MathUtils.degToRad;
const R2D = THREE.MathUtils.radToDeg;
const r2 = (v) => {
	const n = Number(v);
	if (!Number.isFinite(n)) return 0;
	return Math.round(n * 100) / 100;
};
const esc = (v) =>
	String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const EXPRESSIONS = [
	['neutral', 'Neutral', '😐'],
	['happy', 'Happy', '😄'],
	['sad', 'Sad', '😢'],
	['angry', 'Angry', '😠'],
	['surprised', 'Surprised', '😲'],
];
const POSES = [
	['idle', 'Idle', '🧍'],
	['wave', 'Wave', '👋'],
	['point', 'Point', '👉'],
	['talk', 'Talk', '💬'],
	['crossed', 'Crossed', '🙅'],
	['hips', 'Hips', '🕺'],
	['sit', 'Sit', '🪑'],
	['run', 'Run', '🏃'],
];
const HAIR_STYLES = [
	['short', 'Short', '✂️'],
	['bob', 'Bob', '💇'],
	['long', 'Long', '💇‍♀️'],
	['spiky', 'Spiky', '🦔'],
	['bun', 'Bun', '🍡'],
	['ponytail', 'Ponytail', '🎀'],
	['mohawk', 'Mohawk', '🦅'],
	['bald', 'Bald', '🥚'],
	['wavy', 'Wavy', '🌊'],
	['afro', 'Afro', '🌀'],
	['braids', 'Braids', '🪢'],
];
const TOP_STYLES = [
	['tee', 'T-shirt', '👕'],
	['hoodie', 'Hoodie', '🧥'],
	['jacket', 'Jacket', '🥼'],
	['dress', 'Dress', '👗'],
	['suit', 'Suit', '🤵'],
	['overalls', 'Overalls', '🛠'],
	['coat', 'Coat', '🧥'],
];
const ACCESSORIES = [
	['none', 'None', '🚫'],
	['hat', 'Hat', '🎩'],
	['cap', 'Cap', '🧢'],
	['glasses', 'Glasses', '🕶'],
	['crown', 'Crown', '👑'],
	['headphones', 'Headphones', '🎧'],
	['beanie', 'Beanie', '🧶'],
	['catEars', 'Cat ears', '🐱'],
	['scarf', 'Scarf', '🧣'],
];
const EYE_COLORS = ['#2b2118', '#4a3423', '#2f6f8f', '#3f8a5c', '#7a4a9a', '#1c1f28'];

const TABS = [
	['home', 'Home'],
	['characters', 'Actors'],
	['scene', 'World'],
	['props', 'Props'],
	['textures', 'Textures'],
	['objects', 'Arrange'],
	['dialogue', 'Story'],
	['camera', 'Camera'],
	['play', 'Play'],
];

const TIMES = [
	{ id: 'dawn', label: 'Dawn', emoji: '🌅', skyTop: '#6f86b8', skyBottom: '#ffc9a8', sunColor: '#ffd2a0', sunElevation: 10, sun: 0.9, ambient: 0.65, fog: 0.02 },
	{ id: 'noon', label: 'Noon', emoji: '☀️', skyTop: '#7cb7e8', skyBottom: '#dcefff', sunColor: '#ffffff', sunElevation: 64, sun: 1.7, ambient: 0.95, fog: 0.006 },
	{ id: 'golden', label: 'Golden hour', emoji: '🌇', skyTop: '#ff9d6b', skyBottom: '#ffe0b5', sunColor: '#ffd9a8', sunElevation: 24, sun: 1.55, ambient: 0.8, fog: 0.014 },
	{ id: 'dusk', label: 'Dusk', emoji: '🌆', skyTop: '#3b3a68', skyBottom: '#ff9884', sunColor: '#ff9c86', sunElevation: 8, sun: 1.05, ambient: 0.6, fog: 0.018 },
	{ id: 'night', label: 'Night', emoji: '🌙', skyTop: '#070b1c', skyBottom: '#1d2742', sunColor: '#9db8ff', sunElevation: 38, sun: 0.35, ambient: 0.42, fog: 0.012 },
];
const SHOTS = [
	['auto', 'Auto'],
	['wide', 'Wide'],
	['medium', 'Medium'],
	['close', 'Close-up'],
	['full', 'Full body'],
];
const VN_THEMES = [
	['sunset', 'Sunset'],
	['mono', 'Mono'],
	['neon', 'Neon'],
];
const PRESETS = [
	{
		id: 'studio',
		label: 'Studio',
		blurb: 'clean backdrop',
		emoji: '🎬',
		env: {
			skyTop: '#aab6c9',
			skyBottom: '#e6ebf2',
			groundColor: '#8e96a5',
			groundSize: 40,
			fog: 0,
			sun: 1.3,
			sunColor: '#ffffff',
			sunAzimuth: 120,
			sunElevation: 46,
			ambient: 1.05,
			particles: 'none',
			water: false,
			showGround: true,
			showGrid: false,
		},
	},
	{
		id: 'beach',
		label: 'Beach',
		blurb: 'sun & water',
		emoji: '🏖',
		env: {
			skyTop: '#ff9d6b',
			skyBottom: '#ffe0b5',
			groundColor: '#e8c48b',
			groundSize: 60,
			fog: 0.014,
			sun: 1.65,
			sunColor: '#ffd9a8',
			sunAzimuth: 130,
			sunElevation: 24,
			ambient: 0.8,
			particles: 'dust',
			water: true,
			showGround: true,
			showGrid: false,
		},
	},
	{
		id: 'forest',
		label: 'Forest',
		blurb: 'green & misty',
		emoji: '🌲',
		env: {
			skyTop: '#8fc7e8',
			skyBottom: '#dff0d8',
			groundColor: '#5d8a48',
			groundSize: 60,
			fog: 0.02,
			sun: 1.35,
			sunColor: '#fff3d0',
			sunAzimuth: 100,
			sunElevation: 52,
			ambient: 0.85,
			particles: 'fireflies',
			water: false,
			showGround: true,
			showGrid: false,
		},
	},
	{
		id: 'nightcity',
		label: 'Night city',
		blurb: 'neon dusk',
		emoji: '🌃',
		env: {
			skyTop: '#0d1530',
			skyBottom: '#2a3550',
			groundColor: '#2b3040',
			groundSize: 70,
			fog: 0.012,
			sun: 0.45,
			sunColor: '#8fb4ff',
			sunAzimuth: 210,
			sunElevation: 40,
			ambient: 0.55,
			particles: 'dust',
			water: false,
			showGround: true,
			showGrid: false,
		},
	},
	{
		id: 'room',
		label: 'Room',
		blurb: 'cozy interior',
		emoji: '🛋',
		env: {
			skyTop: '#c3ccd8',
			skyBottom: '#e9e3d6',
			groundColor: '#b08a5e',
			groundSize: 40,
			fog: 0,
			sun: 1.05,
			sunColor: '#fff6e0',
			sunAzimuth: 150,
			sunElevation: 55,
			ambient: 1.05,
			particles: 'none',
			water: false,
			showGround: true,
			showGrid: false,
		},
	},
	{
		id: 'space',
		label: 'Space',
		blurb: 'star field',
		emoji: '🌌',
		env: {
			skyTop: '#05070f',
			skyBottom: '#121a2e',
			groundColor: '#1a2030',
			groundSize: 70,
			fog: 0,
			sun: 0.9,
			sunColor: '#cddcff',
			sunAzimuth: 60,
			sunElevation: 60,
			ambient: 0.35,
			particles: 'none',
			water: false,
			showGround: true,
			showGrid: false,
		},
	},
	{
		id: 'void',
		label: 'Void',
		blurb: 'minimal grey',
		emoji: '⬛',
		env: {
			skyTop: '#171a22',
			skyBottom: '#2a2f3b',
			groundColor: '#3a3f4c',
			groundSize: 60,
			fog: 0.008,
			sun: 1.1,
			sunColor: '#ffffff',
			sunAzimuth: 120,
			sunElevation: 45,
			ambient: 1,
			particles: 'none',
			water: false,
			showGround: true,
			showGrid: false,
		},
	},
];

const app = {
	project: null,
	studio: null,
	selection: null,
	tab: 'home',
	gizmo: 'translate',
	game: null,
	playActorId: null,
	playThird: false,
	gamepad: true,
	snap: false,
	clean: false,
	playingVN: false,
	vn: { index: 0, typing: false, full: '', timer: null, savedView: null, previousSelection: null },
	cam: { playing: false, time: 0, savedView: null, hidUI: false },
	selectedKf: null,
	selectedTex: null,
	history: { past: [], future: [] },
	saveTimer: null,
	cleanHintTimer: null,
	envTimer: null,
	lastSnap: '',
	rebuildTimers: new Map(),
};

const project = () => app.project;
const panel = () => $('#panel');
const timeline = () => $('#timeline');

/* ---------------------------------------------------------------------------
   Boot
--------------------------------------------------------------------------- */
function boot(options = {}) {
	app.project = loadProject() || defaultProject();
	try {
		app.studio = new Studio($('#c'), options);
	} catch (err) {
		console.error(err);
		$('#errorBox').hidden = false;
		$('#errorBox').innerHTML = `<h3>WebGL unavailable</h3><p>This browser could not create a WebGL context. Try Chrome, Edge, Firefox or Safari with hardware acceleration enabled.</p><pre class="hint">${esc(
			err?.message || err
		)}</pre>`;
		$('#app').classList.add('dead');
		return;
	}
	try {
		bootStudio();
	} catch (err) {
		console.error(err);
		showFatal(err);
		return;
	}
	requestAnimationFrame(tick);
	setTimeout(() => toast(app.tab === 'home' ? 'Welcome — pick a tool on the left, or press G for POV' : 'Welcome back'), 600);
}

function bootStudio() {
	const studio = app.studio;
	studio.onPick = (id) => {
		if (app.playingVN || app.cam.playing) return;
		selectItem(id || null);
	};
	studio.onTransformChange = () => syncGizmoToState();
	studio.onTransformEnd = () => {
		syncGizmoToState();
		commit();
	};
	studio.onFrame = (dt) => {
		if (app.game) app.game.update(dt);
	};
	syncGamePrefs();
	studio.setGizmoMode(app.gizmo);
	studio.setEnvironment(app.project.environment, app.project);
	studio.rebuildAll(app.project);
	if (app.project.view) studio.setView(app.project.view);
	else studio.frameAll();

	bindGlobalUI();
	$('#projectName').value = app.project.name;
	resetHistory();
	renderAll();
	const first = app.project.characters[0] || app.project.props[0];
	if (first) selectItem(first.id);
}

function showFatal(err) {
	const box = $('#errorBox');
	if (!box) return;
	box.hidden = false;
	box.innerHTML = `<h3>Something went wrong</h3><p>${esc(err?.message || String(err))}</p>
		<p class="hint">Try reloading. If this is the Android app and the screen stays black,
		update Android System WebView to a recent version.</p>
		<pre class="hint" style="max-width:100%;overflow:auto;text-align:left">${esc(String(err?.stack || '').slice(0, 1200))}</pre>
		<button class="btn primary" onclick="location.reload()">Reload</button>
		<button class="btn sm" onclick="document.querySelector('#errorBox').hidden = true">Dismiss</button>`;
}

function syncGamePrefs() {
	app.playActorId = app.project.game?.actorId || null;
	app.playThird = !!app.project.game?.thirdPerson;
	app.gamepad = app.project.game?.pad !== false;
}

function renderAll() {
	updateTopbar();
	renderPanel();
	renderTimeline();
	renderHUD();
	updateGuides();
}

/* ---------------------------------------------------------------------------
   History & persistence
--------------------------------------------------------------------------- */
function snapshot() {
	return JSON.stringify(app.project);
}

function resetHistory() {
	app.history.past = [];
	app.history.future = [];
	app.lastSnap = snapshot();
}

function commit() {
	const now = snapshot();
	if (now === app.lastSnap) return;
	if (app.lastSnap.length < 2500000) {
		app.history.past.push(app.lastSnap);
		if (app.history.past.length > 12) app.history.past.shift();
	}
	app.history.future.length = 0;
	app.lastSnap = now;
	markDirty();
}

function markDirty() {
	const st = $('#saveState');
	if (st) {
		st.textContent = 'saving…';
		st.classList.add('busy');
	}
	clearTimeout(app.saveTimer);
	app.saveTimer = setTimeout(() => {
		if (!app.playingVN && !app.cam.playing && !app.game) app.project.view = app.studio.view();
		const ok = saveProject(app.project);
		if (st) {
			st.textContent = ok ? 'saved' : 'not saved';
			st.classList.remove('busy');
		}
	}, 550);
}

function undo() {
	if (!app.history.past.length) return toast('Nothing to undo', 'warn');
	app.history.future.push(snapshot());
	const prev = app.history.past.pop();
	app.project = normalizeProject(JSON.parse(prev));
	app.lastSnap = snapshot();
	afterRestore();
	toast('Undo');
}

function redo() {
	if (!app.history.future.length) return toast('Nothing to redo', 'warn');
	app.history.past.push(snapshot());
	const next = app.history.future.pop();
	app.project = normalizeProject(JSON.parse(next));
	app.lastSnap = snapshot();
	afterRestore();
	toast('Redo');
}

function afterRestore() {
	if (app.selection && !findItem(app.project, app.selection)) app.selection = null;
	app.studio.setEnvironment(app.project.environment, app.project);
	app.studio.rebuildAll(app.project);
	app.studio.select(app.selection);
	app.selectedKf = null;
	$('#projectName').value = app.project.name;
	renderAll();
	markDirty();
}

/* ---------------------------------------------------------------------------
   UI helpers
--------------------------------------------------------------------------- */
function toast(message, kind = '') {
	const box = $('#toasts');
	if (!box) return;
	const el = document.createElement('div');
	el.className = `toast ${kind}`.trim();
	el.textContent = message;
	box.appendChild(el);
	setTimeout(() => {
		el.classList.add('out');
		setTimeout(() => el.remove(), 320);
	}, 2600);
	while (box.children.length > 3) box.firstElementChild.remove();
}

const panelHead = (title, meta, actions = '') =>
	`<div class="panel-head"><h2>${title}${meta ? `<small>${esc(meta)}</small>` : ''}</h2>${actions}</div>`;

const optList = (options, value) =>
	options
		.map(([v, label]) => {
			const sel = String(v) === String(value) ? ' selected' : '';
			return `<option value="${esc(v)}"${sel}>${esc(label)}</option>`;
		})
		.join('');

const fieldWrap = (label, inner, cls = '') => `<label class="field ${cls}"><span class="lab">${esc(label)}</span>${inner}</label>`;
const textField = (label, path, value, attrs = '') => fieldWrap(label, `<input type="text" data-path="${path}" value="${esc(value)}" ${attrs}>`);
const numField = (label, path, value, step = 0.05, attrs = '') =>
	fieldWrap(label, `<input type="number" step="${step}" data-path="${path}" value="${r2(value)}" ${attrs}>`, 'num');
const rangeField = (label, path, value, min, max, step, unit = '', attrs = '') =>
	`<label class="field range"><span class="lab">${esc(label)}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-path="${path}" ${attrs}><output>${r2(value)}${unit}</output></label>`;
const colorField = (label, path, value, attrs = '') =>
	`<label class="field color"><span class="lab">${esc(label)}</span><span class="swatch"><input type="color" data-path="${path}" value="${esc(value || '#ffffff')}" ${attrs}></span></label>`;
const selectField = (label, path, value, options, attrs = '') =>
	fieldWrap(label, `<select data-path="${path}" ${attrs}>${optList(options, value)}</select>`);
const checkField = (label, path, checked, attrs = '') =>
	`<label class="field check"><input type="checkbox" data-path="${path}" ${checked ? 'checked' : ''} ${attrs}><span>${esc(label)}</span></label>`;
const vec3Field = (label, base, arr, step = 0.05, attrs = '') =>
	`<div class="vec"><span class="lab">${esc(label)}</span><div class="vec-inputs">${arr
		.map((v, i) => `<label><i>${'xyz'[i]}</i><input type="number" step="${step}" value="${r2(v)}" data-path="${base}.${i}" ${attrs}></label>`)
		.join('')}</div></div>`;

function emptyState(icon, title, text) {
	return `<div class="empty"><span class="big">${icon}</span><strong>${esc(title)}</strong><br>${text}</div>`;
}

const nextStep = (tab, label) => `<div class="next-step"><span class="hint"><b>Next</b></span><button class="btn sm accent" data-act="tab" data-tab="${tab}">${label} →</button></div>`;

/* ---------------------------------------------------------------------------
   Selection
--------------------------------------------------------------------------- */
function selectItem(id) {
	if (id && !findItem(app.project, id)) id = null;
	app.selection = id || null;
	app.studio.select(app.selection);
	renderHUD();
	renderPanel();
}

function selectedItem() {
	return app.selection ? findItem(app.project, app.selection) : null;
}

function syncGizmoToState() {
	const id = app.selection;
	if (!id) return;
	const obj = app.studio.objects.get(id);
	const item = findItem(app.project, id);
	if (!obj || !item) return;
	item.transform.p = [r2(obj.position.x), r2(obj.position.y), r2(obj.position.z)];
	item.transform.r = [r2(R2D(obj.rotation.x)), r2(R2D(obj.rotation.y)), r2(R2D(obj.rotation.z))];
	const s = r2((obj.scale.x + obj.scale.y + obj.scale.z) / 3);
	item.transform.s = s;
	obj.scale.setScalar(s);
	const scope = panel().querySelector(`[data-item="${id}"]`);
	if (scope) refreshTransformInputs(item, scope);
	markDirty();
}

function refreshTransformInputs(item, scope) {
	const set = (path, value) => {
		const input = scope.querySelector(`[data-path="${path}"]`);
		if (input && document.activeElement !== input) input.value = r2(value);
	};
	const t = item.transform;
	for (let i = 0; i < 3; i++) {
		set(`transform.p.${i}`, t.p[i]);
		set(`transform.r.${i}`, t.r[i]);
	}
	set('transform.s', t.s);
}

function queueItemRebuild(item, kind) {
	clearTimeout(app.rebuildTimers.get(item.id));
	const timer = setTimeout(() => {
		app.studio.rebuildItem(app.project, item, kind);
		renderHUD();
	}, 45);
	app.rebuildTimers.set(item.id, timer);
}

/* ---------------------------------------------------------------------------
   Input handling
--------------------------------------------------------------------------- */
function readValue(el) {
	if (el.type === 'checkbox') return el.checked;
	if (el.type === 'number' || el.type === 'range') {
		const n = Number(el.value);
		return Number.isFinite(n) ? n : 0;
	}
	return el.value;
}

function updateOutput(el, value) {
	if (el.type !== 'range') return;
	const out = el.parentElement?.querySelector('output');
	if (out) out.textContent = `${r2(value)}${out.textContent.replace(/[\d.]+/, '')}`;
}

function scheduleEnv() {
	clearTimeout(app.envTimer);
	app.envTimer = setTimeout(() => {
		app.studio.setEnvironment(app.project.environment, app.project);
		markDirty();
	}, 70);
}

function handleInputEvent(e, isChange) {
	const el = e.target;
	if (!el?.dataset || el.type === 'file') return;
	const path = el.dataset.path;
	if (!path) return;
	let value = readValue(el);
	const P = app.project;

	if (el.dataset.line) {
		const line = P.dialogue.lines.find((l) => l.id === el.dataset.line);
		if (!line) return;
		setPath(line, path, value);
		markDirty();
		if (isChange) commit();
		return;
	}

	if (el.dataset.kf) {
		const kf = P.camera.keyframes.find((k) => k.id === el.dataset.kf);
		if (!kf) return;
		setPath(kf, path, value);
		if (path === 't') {
			P.camera.duration = Math.max(P.camera.duration, value);
			sortKeyframes();
			if (isChange) {
				renderPanel();
				renderTimeline();
			}
		}
		markDirty();
		if (isChange) commit();
		return;
	}

	const texScope = el.closest('[data-tex]');
	if (texScope) {
		const tex = P.textures.find((t) => t.id === texScope.dataset.tex);
		if (!tex) return;
		setPath(tex, path, value);
		updateOutput(el, value);
		P.props.forEach((prop) => {
			if (prop.textureId === tex.id) queueItemRebuild(prop, 'prop');
		});
		markDirty();
		if (isChange) {
			P.props.forEach((prop) => {
				if (prop.textureId === tex.id) app.studio.rebuildItem(P, prop, 'prop');
			});
			commit();
			renderPanel();
		}
		return;
	}

	const scope = el.closest('[data-item]');
	if (scope) {
		const id = scope.dataset.item;
		const kind = scope.dataset.kind;
		const item = findItem(P, id);
		if (!item) return;
		if (path === 'textureId' && value === 'none') value = null;
		setPath(item, path, value);
		const cosmetic = path === 'name' || path === 'role' || path === 'visible' || path === 'locked';
		if (el.dataset.tf) {
			app.studio.updateTransform(P, id);
		} else if (cosmetic) {
			if (path === 'visible') app.studio.setVisible(id, !!value);
			renderHUD();
		} else {
			queueItemRebuild(item, kind);
		}
		updateOutput(el, value);
		if (isChange) {
			app.studio.rebuildItem(P, item, kind);
			commit();
		} else {
			markDirty();
		}
		return;
	}

	// global paths: environment.*, camera.*, dialogue.*
	setPath(P, path, value);
	updateOutput(el, value);
	const LIGHT_ONLY = new Set([
		'environment.sun',
		'environment.sunColor',
		'environment.ambient',
		'environment.sunAzimuth',
		'environment.sunElevation',
		'environment.fog',
	]);
	if (path.startsWith('environment')) {
		if (LIGHT_ONLY.has(path)) app.studio.updateLighting(P.environment);
		else scheduleEnv();
	}
	if (path === 'camera.guides' || path === 'camera.aspect') updateGuides();
	if (path === 'camera.loop') renderTimeline();
	if (path === 'camera.duration') updateTimelineUI();
	markDirty();
	if (isChange) {
		if (path.startsWith('environment')) {
			if (LIGHT_ONLY.has(path)) app.studio.updateLighting(P.environment);
			else app.studio.setEnvironment(P.environment, P);
		}
		commit();
	}
}

/* ---------------------------------------------------------------------------
   Panels
--------------------------------------------------------------------------- */
function renderPanel() {
	const p = panel();
	if (!p) return;
	const scroll = p.scrollTop;
	switch (app.tab) {
		case 'home':
			p.innerHTML = homePanel();
			break;
		case 'characters':
			p.innerHTML = charactersPanel();
			break;
		case 'scene':
			p.innerHTML = scenePanel();
			break;
		case 'props':
			p.innerHTML = propsPanel();
			break;
		case 'textures':
			p.innerHTML = texturesPanel();
			break;
		case 'objects':
			p.innerHTML = objectsPanel();
			break;
		case 'dialogue':
			p.innerHTML = dialoguePanel();
			break;
		case 'camera':
			p.innerHTML = cameraPanel();
			break;
		case 'play':
			p.innerHTML = playPanel();
			break;
		default:
			p.innerHTML = '';
	}
	p.scrollTop = scroll;
}

function homePanel() {
	const P = app.project;
	const stats = [
		['characters', P.characters.length, 'Actors'],
		['props', P.props.length, 'Props'],
		['dialogue', P.dialogue.lines.length, 'Lines'],
		['camera', P.camera.keyframes.length, 'Keys'],
	];
	let html = panelHead('Home', 'start here', `<button class="btn sm" data-act="guide">🚀 Quick tour</button>`);
	html += '<div class="panel-body">';

	html += `<div class="hero">
		<div class="hero-kicker">Low Poly Studio</div>
		<h3>Make a scene.<br><em>Tell a story.</em></h3>
		<p>Build low-poly actors, worlds and props, write a visual novel, animate the camera — then walk the set yourself in POV.</p>
		<div class="hero-row">
			<button class="btn primary" data-act="tab" data-tab="characters">🧑‍🎤 Start creating</button>
			<button class="btn" data-act="tab" data-tab="dialogue">💬 Write a story</button>
			<button class="btn accent" data-act="game-open">🕹 Play POV</button>
		</div>
	</div>`;

	html += `<div class="quick-grid">
		<button class="quick" data-act="tab" data-tab="characters"><span class="q-ico">🧑‍🎤</span><span><strong>Actors</strong><small>Faces, hair, outfits, poses</small></span></button>
		<button class="quick" data-act="tab" data-tab="scene"><span class="q-ico">🌤</span><span><strong>World</strong><small>Presets, time of day, scatter</small></span></button>
		<button class="quick" data-act="tab" data-tab="props"><span class="q-ico">📦</span><span><strong>Props</strong><small>20 low-poly objects</small></span></button>
		<button class="quick" data-act="tab" data-tab="textures"><span class="q-ico">🎨</span><span><strong>Textures</strong><small>Patterns &amp; image import</small></span></button>
		<button class="quick" data-act="tab" data-tab="dialogue"><span class="q-ico">💬</span><span><strong>Story</strong><small>Dialogue, speakers &amp; shots</small></span></button>
		<button class="quick accent" data-act="tab" data-tab="play"><span class="q-ico">🕹</span><span><strong>Play / POV</strong><small>Walk the scene, grab props</small></span></button>
	</div>`;

	html += `<div class="card">
		<div class="card-head"><span class="card-title">Your scene</span><span class="badge">${P.characters.length + P.props.length} objects</span></div>
		<div class="stat-grid">${stats.map(([tab, n, label]) => `<button class="stat" data-act="tab" data-tab="${tab}"><b>${n}</b><small>${label}</small></button>`).join('')}</div>
		<div class="row" style="margin-top:9px">
			<button class="btn sm" data-act="frame-all">◎ Frame scene</button>
			<button class="btn sm" data-act="snapshot">📸 Screenshot</button>
			<span class="spacer"></span>
			<span class="hint" style="font-family:var(--mono)">${r2(P.camera.duration)}s camera</span>
		</div>
	</div>`;

	html += `<div class="card">
		<div class="card-head"><span class="card-title">Five steps to a film</span><span class="badge muted">tap a step</span></div>
		<div class="steps">${[
			['characters', '1', 'Cast your actors', 'Design hair, outfit, expression and pose.'],
			['scene', '2', 'Build the set', 'Pick a world, set the light, scatter props.'],
			['dialogue', '3', 'Write the story', 'One line per beat, with speaker and camera shot.'],
			['camera', '4', 'Animate the camera', 'Use quick moves or capture keyframes on the timeline.'],
			['play', '5', 'Play &amp; record', 'Walk in POV, or hide the UI and screen-record.'],
		].map(([tab, n, t, d]) => `<button class="step" data-act="tab" data-tab="${tab}"><span class="n">${n}</span><span><strong>${t}</strong><small>${d}</small></span></button>`).join('')}</div>
	</div>`;

	html += `<div class="card"><div class="row">
		<button class="btn sm" data-act="new-demo">🌴 Load demo</button>
		<button class="btn sm" data-act="new">🗋 Blank project</button>
		<span class="spacer"></span>
		<button class="btn sm" data-act="help">❔ All shortcuts</button>
	</div></div>`;
	html += '</div>';
	return html;
}

function charactersPanel() {
	const P = app.project;
	const chars = P.characters;
	let html = panelHead('Actors', `${chars.length} in your cast`, `<button class="btn primary sm" data-act="char-add">＋ New actor</button>`);
	html += '<div class="panel-body">';

	html += `<div class="card">
		<div class="card-head"><span class="card-title">Cast</span><span class="badge char">character creator</span></div>
		<div class="cast-list">${
			chars
				.map(
					(c) =>
						`<button class="cast ${app.selection === c.id ? 'on' : ''}" data-act="select-item" data-id="${c.id}"><span class="av" style="background:${esc(
							c.role
						)}">${esc((c.name || '?').slice(0, 1).toUpperCase())}</span>${esc(c.name)}</button>`
				)
				.join('') || '<span class="hint">No actors yet — click “New actor”.</span>'
		}</div>
	</div>`;

	const c = characterById(P, app.selection);
	if (!c) {
		html += emptyState('🧑‍🎤', 'Pick or create an actor', 'Every story needs a cast. Add an actor, then design their face, hair, outfit, pose and eye colour.');
		html += `<div class="row" style="justify-content:center"><button class="btn primary" data-act="char-add">＋ New actor</button></div>`;
		html += '</div>';
		return html;
	}

	const meters = characterHeight(c).toFixed(2);
	const swatches = (path, value, colors) =>
		`<div class="sw-row">${colors
			.map(
				(col) =>
					`<button class="sw ${String(col).toLowerCase() === String(value).toLowerCase() ? 'on' : ''}" style="background:${col}" data-act="char-color" data-id="${
						c.id
					}" data-path="${path}" data-value="${col}" title="${col}"></button>`
			)
			.join('')}<label class="sw custom" title="Custom colour"><input type="color" data-path="${path}" value="${esc(value)}"></label></div>`;
	const optionGrid = (path, items, value) =>
		`<div class="opt-grid">${items
			.map(
				([v, label, icon]) =>
					`<button class="opt ${value === v ? 'on' : ''}" data-act="char-style" data-id="${c.id}" data-path="${path}" data-value="${v}"><em>${
						icon || '•'
					}</em>${esc(label)}</button>`
			)
			.join('')}</div>`;

	html += `<div class="stack" data-item="${c.id}" data-kind="char">`;

	html += `<div class="card">
		<div class="actor-hd">
			<div class="big-av">🧑‍🎤</div>
			<div class="who">
				<input type="text" data-path="name" value="${esc(c.name)}" maxlength="28" aria-label="Actor name">
				<small>${meters} m tall · ${esc(c.pose)} pose · ${esc(c.expression)}</small>
			</div>
			<button class="btn sm accent" data-act="game-start" data-id="${c.id}" title="Walk the scene as this actor">🕹 Play</button>
		</div>
		<div class="row">
			<label class="field color" style="flex:1"><span class="lab" style="flex:0 0 52px">Plate</span><span class="swatch"><input type="color" data-path="role" value="${esc(
				c.role
			)}"></span></label>
			<button class="btn sm" data-act="frame-item">◎ Frame</button>
			<button class="btn sm" data-act="face-camera">↻ Face camera</button>
		</div>
	</div>`;

	html += `<div class="card">
		<div class="card-head"><span class="card-title">Expression</span><span class="badge muted">${esc(c.expression)}</span></div>
		<div class="opt-grid">${EXPRESSIONS.map(
			([v, label, emoji]) => `<button class="opt ${c.expression === v ? 'on' : ''}" data-act="set-expression" data-id="${c.id}" data-value="${v}"><em>${emoji}</em>${label}</button>`
		).join('')}</div>
		<div class="card-head" style="margin:12px 0 4px"><span class="card-title">Eye colour</span></div>
		${swatches('eyeColor', c.eyeColor || '#2b2118', EYE_COLORS)}
		<div class="card-head" style="margin:8px 0 4px"><span class="card-title">Skin tone</span></div>
		${swatches('skin', c.skin, SKIN_TONES)}
	</div>`;

	html += `<div class="card">
		<div class="card-head"><span class="card-title">Hair</span><button class="btn xs" data-act="char-randomize" data-id="${c.id}" title="Randomise the whole look">🎲 Roll look</button></div>
		${optionGrid('hairStyle', HAIR_STYLES, c.hairStyle)}
		${swatches('hairColor', c.hairColor, HAIR_COLORS)}
	</div>`;

	html += `<div class="card">
		<div class="card-head"><span class="card-title">Outfit</span><span class="badge muted">${esc(c.topStyle)}</span></div>
		${optionGrid('topStyle', TOP_STYLES, c.topStyle)}
		<div class="card-head" style="margin:10px 0 4px"><span class="card-title">Top colour</span></div>
		${swatches('topColor', c.topColor, CLOTH_COLORS)}
		<div class="card-head" style="margin:6px 0 4px"><span class="card-title">Bottom colour</span></div>
		${swatches('bottomColor', c.bottomColor, CLOTH_COLORS)}
		<div class="grid2" style="margin-top:8px">
			${colorField('Shoes', 'shoeColor', c.shoeColor)}
			${colorField('Accent', 'accentColor', c.accentColor)}
		</div>
	</div>`;

	html += `<div class="card">
		<div class="card-head"><span class="card-title">Accessory</span></div>
		${optionGrid('accessory', ACCESSORIES, c.accessory)}
	</div>`;

	html += `<div class="card">
		<div class="card-head"><span class="card-title">Body</span><span class="badge muted">${meters} m</span></div>
		${rangeField('Height', 'height', c.height, 0.7, 1.35, 0.01, '×')}
		${rangeField('Build', 'build', c.build, 0.7, 1.4, 0.01, '×')}
		${rangeField('Head size', 'headScale', c.headScale, 0.8, 1.25, 0.01, '×')}
		<div class="metric"><span>1.79 × ${r2(c.height)} height × ${r2(c.transform.s)} scale</span><span>${meters} m</span></div>
		<div class="card-head" style="margin:12px 0 5px"><span class="card-title">Pose</span></div>
		<div class="opt-grid">${POSES.map(
			([v, label, icon]) => `<button class="opt ${c.pose === v ? 'on' : ''}" data-act="set-pose" data-id="${c.id}" data-value="${v}"><em>${icon}</em>${label}</button>`
		).join('')}</div>
	</div>`;

	html += `<div class="card">
		<div class="card-head"><span class="card-title">Placement</span><button class="btn xs" data-act="frame-item">◎ Frame</button></div>
		${vec3Field('Position', 'transform.p', c.transform.p, 0.05, 'data-tf="1"')}
		${vec3Field('Rotation', 'transform.r', c.transform.r, 1, 'data-tf="1"')}
		${rangeField('Scale', 'transform.s', c.transform.s, 0.3, 3, 0.01, '×', 'data-tf="1"')}
		<div class="row" style="margin-top:8px">${checkField('Visible', 'visible', c.visible !== false)}${checkField('Locked', 'locked', !!c.locked)}</div>
		<div class="row" style="margin-top:8px">
			<button class="btn sm" data-act="item-duplicate" data-id="${c.id}">⧉ Duplicate</button>
			<span class="spacer"></span>
			<button class="btn sm danger" data-act="char-delete" data-id="${c.id}">Delete actor</button>
		</div>
	</div>`;

	html += nextStep('scene', 'Build the world');
	html += '</div></div>';
	return html;
}

function scenePanel() {
	const P = app.project;
	const env = P.environment;
	let html = panelHead('World', 'scene creator', `<button class="btn sm" data-act="env-reset">↺ Reset</button>`);
	html += '<div class="panel-body">';

	html += `<div class="card">
		<div class="card-head"><span class="card-title">Pick a world</span><span class="badge">${esc(PRESETS.find((p) => p.id === env.preset)?.label || 'custom')}</span></div>
		<div class="preset-cards">${PRESETS.map(
			(p) =>
				`<button class="preset-card ${env.preset === p.id ? 'on' : ''}" data-act="apply-preset" data-preset="${p.id}" style="--a:${p.env.skyTop};--b:${p.env.skyBottom};--g:${p.env.groundColor}"><b>${p.emoji} ${p.label}</b><small>${esc(
					p.blurb || ''
				)}</small></button>`
		).join('')}</div>
	</div>`;

	const az = D2R(env.sunAzimuth || 0);
	const rho = 46 - (clamp(env.sunElevation || 0, 0, 90) / 90) * 40;
	const sx = 58 + Math.cos(az) * rho;
	const sy = 58 + Math.sin(az) * rho;
	html += `<div class="card">
		<div class="card-head"><span class="card-title">Time of day</span><span class="badge muted">Sun &amp; sky</span></div>
		<div class="time-row">${TIMES.map(
			(t) => `<button class="time-chip ${env.time === t.id ? 'on' : ''}" data-act="time-of-day" data-value="${t.id}"><span>${t.emoji}</span>${t.label}</button>`
		).join('')}</div>
		<div class="sun-pad" id="sunPad" title="Drag the sun: angle = azimuth, distance = height">
			<div class="sun-dot" id="sunDot" style="left:${sx}px;top:${sy}px"></div>
			<span class="pole n">N</span><span class="pole e">E</span><span class="pole s">S</span><span class="pole w">W</span>
		</div>
		<div class="grid2">
			${colorField('Sun colour', 'environment.sunColor', env.sunColor, 'data-env="1"')}
			${colorField('Ground', 'environment.groundColor', env.groundColor, 'data-env="1"')}
		</div>
		${rangeField('Sun strength', 'environment.sun', env.sun, 0, 3, 0.05, '', 'data-env="1"')}
		${rangeField('Ambient', 'environment.ambient', env.ambient, 0, 2.2, 0.05, '', 'data-env="1"')}
		${rangeField('Sun height', 'environment.sunElevation', env.sunElevation, 2, 88, 1, '°', 'data-env="1"')}
		${rangeField('Sun angle', 'environment.sunAzimuth', env.sunAzimuth, 0, 360, 1, '°', 'data-env="1"')}
	</div>`;

	html += `<div class="card">
		<div class="card-head"><span class="card-title">Sky &amp; air</span></div>
		<div class="grid2">
			${colorField('Sky top', 'environment.skyTop', env.skyTop, 'data-env="1"')}
			${colorField('Sky low', 'environment.skyBottom', env.skyBottom, 'data-env="1"')}
		</div>
		${rangeField('Fog', 'environment.fog', env.fog, 0, 0.06, 0.002, '', 'data-env="1"')}
		${selectField('Particles', 'environment.particles', env.particles, [
			['none', 'None'],
			['dust', 'Dust motes'],
			['snow', 'Snow'],
			['rain', 'Rain'],
			['fireflies', 'Fireflies'],
		], 'data-env="1"')}
	</div>`;

	html += `<div class="card">
		<div class="card-head"><span class="card-title">Ground</span></div>
		${rangeField('Ground size', 'environment.groundSize', env.groundSize, 16, 120, 2, 'm', 'data-env="1"')}
		<div class="row" style="margin-top:4px">
			${checkField('Ground', 'environment.showGround', env.showGround !== false, 'data-env="1"')}
			${checkField('Grid', 'environment.showGrid', !!env.showGrid, 'data-env="1"')}
			${checkField('Water', 'environment.water', !!env.water, 'data-env="1"')}
		</div>
	</div>`;

	html += `<div class="card">
		<div class="card-head"><span class="card-title">Quick build</span><span class="badge muted">one click</span></div>
		<div class="quick-add">
			<button class="btn sm" data-act="char-add">🧑‍🎤 Add actor</button>
			<button class="btn sm" data-act="prop-add" data-kind="rock">🪨 Add rock</button>
			<button class="btn sm" data-act="prop-add" data-kind="tree">🌳 Add tree</button>
			<button class="btn sm" data-act="prop-add" data-kind="crate">📦 Add crate</button>
		</div>
		<div class="divider" style="margin:10px 0"></div>
		<div class="row tight">
			<select id="scatterKind" title="What to scatter" style="flex:1 1 100%;min-width:0;background:#0a101a;border:1px solid var(--line);border-radius:6px;padding:6px 7px;font-size:11.5px">
				${PROP_CATALOG.map((p) => `<option value="${p.kind}">${p.emoji} ${p.label}</option>`).join('')}
			</select>
		</div>
		<div class="grid2" style="margin-top:6px">
			${fieldWrap('Count', '<input type="number" id="scatterCount" value="8" min="1" max="80" step="1">')}
			${fieldWrap('Radius', '<input type="number" id="scatterRadius" value="8" min="2" max="40" step="1">')}
		</div>
		<button class="btn primary sm" data-act="scatter" style="width:100%;margin-top:6px">✨ Scatter props</button>
		<div class="hint" style="margin-top:6px">Scatters around the point the camera is looking at — great for instant forests.</div>
	</div>`;

	html += `<div class="card">
		<div class="card-head"><span class="card-title">Scene actions</span></div>
		<div class="row">
			<button class="btn sm" data-act="select-none">Deselect</button>
			<button class="btn sm" data-act="frame-all">◎ Frame scene</button>
			<span class="spacer"></span>
			<button class="btn sm danger" data-act="clear-props">Clear all props</button>
		</div>
	</div>`;

	html += nextStep('dialogue', 'Write the story');
	html += '</div>';
	return html;
}

function propsPanel() {
	const P = app.project;
	let html = panelHead('Props', `${P.props.length} object${P.props.length === 1 ? '' : 's'}`, `<button class="btn sm" data-act="select-none">Deselect</button>`);
	html += '<div class="panel-body">';
	html += `<div class="card">
		<div class="card-head"><span class="card-title">Low poly library</span><span class="badge muted">click to add</span></div>
		<div class="cat-grid">${PROP_CATALOG.map(
			(p) => `<button class="cat" data-act="prop-add" data-kind="${p.kind}" title="Add ${esc(p.label)}"><span>${p.emoji}</span><small>${esc(p.label)}</small></button>`
		).join('')}</div>
	</div>`;

	const item = selectedItem();
	const kind = app.selection ? itemKind(P, app.selection) : null;
	if (item && kind === 'prop') {
		html += `<div class="stack" data-item="${item.id}" data-kind="prop">
		<div class="card">
			<div class="card-head"><span class="card-title">${propEmoji(item.kind)} ${esc(propLabel(item.kind))}</span><span class="badge">Prop</span></div>
			${textField('Name', 'name', item.name)}
			${colorField('Colour', 'color', item.color)}
			${selectField('Texture', 'textureId', item.textureId || 'none', [['none', '— None —'], ...P.textures.map((t) => [t.id, t.name])])}
			${rangeField('Tex repeat', 'texScale', item.texScale, 0.2, 8, 0.1, '×')}
		</div>
		<div class="card">
			<div class="card-head"><span class="card-title">Material</span></div>
			${rangeField('Roughness', 'rough', item.rough, 0, 1, 0.01)}
			${rangeField('Metalness', 'metal', item.metal, 0, 1, 0.01)}
			${rangeField('Glow', 'emissive', item.emissive || 0, 0, 1, 0.01)}
			${checkField('Flat shading', 'flat', item.flat !== false)}
		</div>
		<div class="card">
			<div class="card-head"><span class="card-title">Placement</span>
				<button class="btn xs" data-act="frame-item">◎ Frame</button>
			</div>
			${vec3Field('Position', 'transform.p', item.transform.p, 0.05, 'data-tf="1"')}
			${vec3Field('Rotation', 'transform.r', item.transform.r, 1, 'data-tf="1"')}
			${rangeField('Scale', 'transform.s', item.transform.s, 0.1, 6, 0.01, '×', 'data-tf="1"')}
			<div class="row" style="margin-top:9px">
				${checkField('Visible', 'visible', item.visible !== false)}
				${checkField('Locked', 'locked', !!item.locked)}
			</div>
			<div class="row" style="margin-top:8px">
				<button class="btn sm" data-act="item-duplicate" data-id="${item.id}">⧉ Duplicate</button>
				<button class="btn sm" data-act="prop-drop" data-id="${item.id}">⬇ Drop</button>
				<span class="spacer"></span>
				<button class="btn sm danger" data-act="item-delete" data-id="${item.id}">Delete</button>
			</div>
		</div>
		</div>`;
	} else if (item && kind === 'char') {
		html += emptyState('🧑‍🎤', `${esc(item.name)} is selected`, 'That is an actor. Open the Actors tool to edit them, or pick a prop above to style it.') +
			`<div class="row" style="justify-content:center"><button class="btn sm" data-act="tab" data-tab="characters">Edit character</button></div>`;
	} else {
		html += emptyState('📦', 'Add a prop', 'Click any item in the library to drop it into the scene. Then edit its colour, material, texture and transform here.');
	}
	html += nextStep('textures', 'Style it with textures');
	html += '</div>';
	return html;
}

function texturesPanel() {
	const P = app.project;
	const selProp = app.selection && itemKind(P, app.selection) === 'prop' ? selectedItem() : null;
	let html = panelHead('Textures', `${P.textures.length} material${P.textures.length === 1 ? '' : 's'}`, `<button class="btn primary sm" data-act="tex-import-btn">⬆ Import</button>`);
	html += '<div class="panel-body">';

	html += `<button class="dropzone" data-act="tex-import-btn" id="texDrop">
		<span class="dz-ico">🖼</span>
		<span><b>Import your own texture</b><small>Drop an image here, paste with Ctrl+V, or click to choose a PNG / JPG / WebP.</small></span>
	</button>
	<input type="file" id="texImport" accept="image/png,image/jpeg,image/webp" multiple hidden>`;

	html += `<div class="card">
		<div class="card-head"><span class="card-title">Create a pattern</span><span class="badge tex">Canvas</span></div>
		${fieldWrap('Name', '<input type="text" id="texName" placeholder="My texture" maxlength="28">')}
		${fieldWrap('Pattern', `<select id="texType">${TEXTURE_TYPES.map((t) => `<option value="${t.type}">${t.label}</option>`).join('')}</select>`)}
		<div class="color-pair" style="margin-top:6px">
			<label class="field color"><span class="lab">Colour A</span><span class="swatch"><input type="color" id="texA" value="#f4f6fb"></span></label>
			<label class="field color"><span class="lab">Colour B</span><span class="swatch"><input type="color" id="texB" value="#2a3348"></span></label>
		</div>
		<label class="field range"><span class="lab">Scale</span><input type="range" id="texScale" min="0.5" max="8" step="0.1" value="2"><output>2×</output></label>
		<button class="btn primary sm" data-act="tex-create" style="width:100%;margin-top:8px">＋ Create texture</button>
	</div>`;

	html += `<div class="card">
		<div class="card-head"><span class="card-title">Library</span><span class="badge muted">click to select</span></div>
		<div class="tex-grid big">${
			P.textures
				.map(
					(t) => `<button class="tex-card ${app.selectedTex === t.id ? 'on' : ''}" data-act="tex-select" data-id="${t.id}">
						<img src="${textureThumb(t, 128)}" alt="">
						<span class="tex-scale">${r2(t.scale)}×</span>
						${selProp && selProp.textureId === t.id ? '<span class="used">USED</span>' : ''}
						${t.type === 'image' ? '<span class="badge tex" style="position:absolute;right:4px;bottom:22px">IMG</span>' : ''}
						<span class="tex-name">${esc(t.name)}</span>
					</button>`
				)
				.join('') || '<div class="hint">No textures yet — import an image or create a pattern.</div>'
		}</div>
	</div>`;

	if (selProp) {
		html += `<div class="card">
			<div class="card-head"><span class="card-title">Apply to “${esc(selProp.name)}”</span><span class="badge">Selected prop</span></div>
			<div class="row">
				<button class="btn primary sm" data-act="tex-apply" ${app.selectedTex ? '' : 'disabled'}>Apply selected texture</button>
				<button class="btn sm" data-act="tex-clear">Remove texture</button>
			</div>
			${
				app.selectedTex
					? `<div class="hint" style="margin-top:6px">Applying <b>${esc(P.textures.find((t) => t.id === app.selectedTex)?.name || '')}</b>. Tune repeat in Props. Textures multiply with the prop colour — white keeps them untinted.</div>`
					: '<div class="hint" style="margin-top:6px">Pick a texture in the library first.</div>'
			}
		</div>`;
	} else {
		html += `<div class="card"><div class="hint">Select a prop in the scene (or in <b>Props</b>) and an imported texture applies to it automatically. Textures tint with the prop colour.</div></div>`;
	}

	if (app.selectedTex) {
		const t = P.textures.find((x) => x.id === app.selectedTex);
		if (t) {
			html += `<div class="card" data-tex="${t.id}">
				<div class="card-head"><span class="card-title">“${esc(t.name)}”</span><span class="badge tex">${esc(t.type)}</span></div>
				${t.dataUrl ? '<div class="hint">Imported image — colour controls do not apply. This image is stored in the project.</div>' : `<div class="color-pair">${colorField('Colour A', 'a', t.a)}${colorField('Colour B', 'b', t.b)}</div>`}
				${rangeField('Pattern scale', 'scale', t.scale, 0.5, 8, 0.1, '×')}
				<div class="hint" style="margin-top:6px">Changes apply to every prop using this texture.</div>
				<div class="row" style="margin-top:8px">
					${selProp ? `<button class="btn sm accent" data-act="tex-apply">Apply to ${esc(selProp.name)}</button>` : ''}
					<span class="spacer"></span>
					<button class="btn sm danger" data-act="tex-delete" data-id="${t.id}">Delete texture</button>
				</div>
			</div>`;
		}
	}

	html += nextStep('props', 'Place a prop to texture');
	html += '</div>';
	return html;
}

function playPanel() {
	const P = app.project;
	const actorId = app.playActorId || P.characters[0]?.id;
	const actor = characterById(P, actorId);
	const playing = !!app.game;
	let html = panelHead('Play', 'POV & game mode', playing ? `<button class="btn sm danger" data-act="game-exit">■ Stop</button>` : `<button class="btn primary sm" data-act="game-start" ${actor ? '' : 'disabled'}>▶ Enter POV</button>`);
	html += '<div class="panel-body">';

	html += `<div class="cam-callout"><span class="cc-ico">🕹</span><span><b>Walk the scene as any actor</b><small>First-person eyes, mouse or stick look, WASD / joystick movement, jumping and pick-up. Switch to third person with <b>F</b>.</small></span></div>`;

	if (!P.characters.length) {
		html += emptyState('🧑‍🎤', 'No actors to play', 'Create an actor first — then you can take their point of view.');
		html += `<div class="row" style="justify-content:center"><button class="btn primary" data-act="tab" data-tab="characters">＋ Create an actor</button></div>`;
		html += '</div>';
		return html;
	}

	html += `<div class="card">
		<div class="card-head"><span class="card-title">Play as</span><span class="badge char">${P.characters.length} actor${P.characters.length === 1 ? '' : 's'}</span></div>
		<div class="cast-list">${P.characters
			.map(
				(c) => `<button class="cast ${actorId === c.id ? 'on' : ''}" data-act="play-actor" data-id="${c.id}"><span class="av" style="background:${esc(c.role)}">${esc(
					(c.name || '?').slice(0, 1).toUpperCase()
				)}</span>${esc(c.name)}${c.id === actorId ? ' <b style="font-size:8px;color:var(--mint)">PICKED</b>' : ''}</button>`
			)
			.join('')}</div>
		<div class="row" style="margin-top:9px">
			<button class="btn primary" data-act="game-start" style="flex:1">🕹 Enter POV as ${esc(actor?.name || '—')}</button>
		</div>
	</div>`;

	html += `<div class="card">
		<div class="card-head"><span class="card-title">Camera &amp; controls</span></div>
		<div class="seg wide" style="margin-bottom:8px">
			<button class="${!app.playThird ? 'on' : ''}" data-act="play-view" data-value="first">👁 First person</button>
			<button class="${app.playThird ? 'on' : ''}" data-act="play-view" data-value="third">🎥 Third person</button>
		</div>
		<label class="field check"><input type="checkbox" ${app.gamepad ? 'checked' : ''} data-act="play-pad"><span>On-screen gamepad (joystick + look pad + buttons)</span></label>
		<div class="kbd-grid" style="margin-top:8px">
			<div><span>Move</span><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span></div>
			<div><span>Look</span><span>mouse / look pad</span></div>
			<div><span>Run</span><span><kbd>Shift</kbd></span></div>
			<div><span>Jump</span><span><kbd>Space</kbd></span></div>
			<div><span>Grab / drop prop</span><span><kbd>E</kbd></span></div>
			<div><span>1st / 3rd person</span><span><kbd>F</kbd></span></div>
			<div><span>Exit POV</span><span><kbd>Esc</kbd></span></div>
		</div>
		<div class="hint" style="margin-top:6px">Walk close to a small prop and face it — a prompt appears. Big props (buildings, trees) are too heavy to lift.</div>
	</div>`;

	html += `<div class="card">
		<div class="card-head"><span class="card-title">More ways to watch</span></div>
		<div class="quick-add">
			<button class="btn sm" data-act="vn-play">▶ Play story</button>
			<button class="btn sm" data-act="cam-play">🎬 Play camera</button>
			<button class="btn sm" data-act="clean-toggle">🎥 Clean UI</button>
			<button class="btn sm" data-act="tab" data-tab="camera">⏱ Camera timeline</button>
		</div>
	</div>`;

	html += '</div>';
	return html;
}

function objectsPanel() {
	const P = app.project;
	let html = panelHead('Arrange', 'scene graph', `<button class="btn sm" data-act="select-none">Deselect</button>`);
	html += '<div class="panel-body">';

	const row = (item, kind) => `<div class="obj-row ${app.selection === item.id ? 'on' : ''}" data-act="select-item" data-id="${item.id}">
		<span class="oicon">${kind === 'char' ? '🧑' : propEmoji(item.kind)}</span>
		<span class="oname">${esc(item.name)}<small>${kind === 'char' ? 'actor' : item.kind}</small></span>
		<button class="obj-act ${item.visible === false ? 'off' : ''}" data-act="toggle-visible" data-id="${item.id}" title="Show / hide">${item.visible === false ? '🚫' : '👁'}</button>
		<button class="obj-act ${item.locked ? 'on' : ''}" data-act="toggle-lock" data-id="${item.id}" title="Lock / unlock transform">${item.locked ? '🔒' : '🔓'}</button>
		<button class="obj-act danger" data-act="item-delete" data-id="${item.id}" title="Delete">✕</button>
	</div>`;

	html += `<div class="card">
		<div class="obj-group-label">Actors <span class="spacer"></span><span>${P.characters.length}</span></div>
		<div class="obj-list">${P.characters.map((c) => row(c, 'char')).join('') || '<span class="hint">No actors</span>'}</div>
		<div class="obj-group-label">Props <span class="spacer"></span><span>${P.props.length}</span></div>
		<div class="obj-list">${P.props.map((p) => row(p, 'prop')).join('') || '<span class="hint">No props</span>'}</div>
	</div>`;

	const item = selectedItem();
	if (item) {
		const kind = itemKind(P, item.id);
		html += `<div class="stack" data-item="${item.id}" data-kind="${kind}">
		<div class="card">
			<div class="card-head"><span class="card-title">Inspector</span><span class="badge ${kind === 'char' ? 'char' : ''}">${kind === 'char' ? 'Actor' : 'Prop'}</span></div>
			${textField('Name', 'name', item.name)}
			${vec3Field('Position', 'transform.p', item.transform.p, 0.05, 'data-tf="1"')}
			${vec3Field('Rotation', 'transform.r', item.transform.r, 1, 'data-tf="1"')}
			${rangeField('Scale', 'transform.s', item.transform.s, 0.1, 6, 0.01, '×', 'data-tf="1"')}
			<div class="row" style="margin-top:8px">
				${checkField('Visible', 'visible', item.visible !== false)}
				${checkField('Locked', 'locked', !!item.locked)}
			</div>
			<div class="row" style="margin-top:8px">
				<button class="btn sm" data-act="frame-item">◎ Frame</button>
				<button class="btn sm" data-act="item-duplicate" data-id="${item.id}">⧉ Duplicate</button>
				<button class="btn sm" data-act="item-ground" data-id="${item.id}">⬇ Ground</button>
				<span class="spacer"></span>
				<button class="btn sm danger" data-act="item-delete" data-id="${item.id}">Delete</button>
			</div>
		</div>
		</div>`;
	} else {
		html += `<div class="card"><div class="hint">Select an object in the list or click it in the viewport to inspect and transform it. Use <b>W</b>, <b>E</b>, <b>R</b> to switch the gizmo.</div></div>`;
	}
	html += nextStep('dialogue', 'Write the story');
	html += '</div>';
	return html;
}

function dialoguePanel() {
	const P = app.project;
	const lines = P.dialogue.lines;
	let html = panelHead('Story', `${lines.length} line${lines.length === 1 ? '' : 's'}`, `<button class="btn primary sm" data-act="vn-play">▶ Play</button>`);
	html += '<div class="panel-body">';

	html += `<div class="card">
		<div class="card-head"><span class="card-title">Visual novel</span><span class="badge">${esc(P.dialogue.theme)}</span></div>
		${selectField('Theme', 'dialogue.theme', P.dialogue.theme, VN_THEMES)}
		<div class="row" style="margin-top:8px">
			<button class="btn primary sm" data-act="vn-play">▶ From start</button>
			<button class="btn sm" data-act="line-add">＋ Add line</button>
		</div>
		<div class="hint" style="margin-top:6px">Speakers are auto-framed by the camera. Each line can use its own expression and shot.</div>
	</div>`;

	if (!P.characters.length) {
		html += `<div class="card"><div class="hint">Tip: create actors in the Actors tool so you can assign speakers.</div></div>`;
	}

	html += `<div class="line-list">${lines
		.map((line, i) => {
			const speaker = characterById(P, line.speakerId);
			const speakerName = speaker ? speaker.name : 'Narrator';
			return `<div class="line-card" data-line-card="${line.id}">
				<div class="line-top">
					<span class="line-num">${String(i + 1).padStart(2, '0')}</span>
					<select data-path="speakerId" data-line="${line.id}" title="Speaker">
						<option value="narrator"${line.speakerId === 'narrator' ? ' selected' : ''}>Narrator</option>
						${P.characters.map((c) => `<option value="${c.id}"${c.id === line.speakerId ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}
					</select>
					<div class="icon-btn-row">
						<button class="micro" data-act="line-preview" data-id="${line.id}" title="Preview this line">▶</button>
						<button class="micro" data-act="line-up" data-id="${line.id}" title="Move up">↑</button>
						<button class="micro" data-act="line-down" data-id="${line.id}" title="Move down">↓</button>
						<button class="micro" data-act="line-dup" data-id="${line.id}" title="Duplicate">⧉</button>
						<button class="micro danger" data-act="line-del" data-id="${line.id}" title="Delete">✕</button>
					</div>
				</div>
				<textarea data-path="text" data-line="${line.id}" placeholder="${esc(speakerName)}'s line…">${esc(line.text)}</textarea>
				<div class="line-meta">
					<select data-path="expression" data-line="${line.id}" title="Expression">${optList(EXPRESSIONS.map(([v, l]) => [v, `Face · ${l}`]), line.expression)}</select>
					<select data-path="shot" data-line="${line.id}" title="Camera shot">${optList(SHOTS.map(([v, l]) => [v, `Shot · ${l}`]), line.shot)}</select>
				</div>
			</div>`;
		})
		.join('') || emptyState('💬', 'No dialogue yet', 'Add a line and press ▶ to preview the scene as a visual novel.')}</div>`;

	html += `<div class="row" style="justify-content:center;margin-top:10px"><button class="btn sm" data-act="line-add">＋ Add line</button></div>`;
	html += nextStep('camera', 'Animate the camera');
	html += '</div>';
	return html;
}

function cameraPanel() {
	const P = app.project;
	const cam = P.camera;
	const kfs = [...cam.keyframes].sort((a, b) => a.t - b.t);
	let html = panelHead('Camera', 'movement & keyframes', `<button class="btn primary sm" data-act="cam-play">${app.cam.playing ? '■ Stop' : '▶ Play'}</button>`);
	html += '<div class="panel-body">';

	html += `<div class="cam-callout"><span class="cc-ico">🎬</span><span><b>Camera movement lives here</b><small>Orbit to a shot and capture it — or drop in a ready-made move and press play.</small></span></div>`;

	html += `<div class="card">
		<div class="card-head"><span class="card-title">Quick moves</span><span class="badge">auto keyframes</span></div>
		<div class="move-grid">
			<button class="move" data-act="cam-move" data-value="orbit" title="Circle around the subject"><em>↻</em>Orbit</button>
			<button class="move" data-act="cam-move" data-value="push" title="Move closer"><em>➡</em>Push in</button>
			<button class="move" data-act="cam-move" data-value="crane" title="Rise up"><em>⬆</em>Crane up</button>
			<button class="move" data-act="cam-move" data-value="pan" title="Slide sideways"><em>↔</em>Pan</button>
		</div>
		<button class="btn primary sm" data-act="kf-capture" style="width:100%;margin-top:8px">⌖ Capture this view at the playhead</button>
		<div class="hint" style="margin-top:6px">Quick moves add a keyframe 2 s after the last one. Use the timeline below, the top bar or <b>C</b> to play it.</div>
	</div>`;

	html += `<div class="card">
		<div class="card-head"><span class="card-title">Free camera</span><span class="badge muted">orbit view</span></div>
		<div class="row">
			<button class="btn sm" data-act="cam-reset">⌂ Reset</button>
			<button class="btn sm" data-act="frame-all">◎ Frame scene</button>
			<button class="btn sm" data-act="frame-item">◎ Frame selection</button>
		</div>
		<div class="row" style="margin-top:6px">
			<button class="btn primary sm" data-act="kf-capture">⌖ Capture keyframe</button>
		</div>
		<div class="hint">Drag to orbit, scroll / pinch to zoom, right-drag to pan. Capture the current view as a keyframe.</div>
	</div>`;

	html += `<div class="card">
		<div class="card-head"><span class="card-title">Sequence</span><span class="badge">${r2(cam.duration)}s</span></div>
		${numField('Duration', 'camera.duration', cam.duration, 0.5)}
		${checkField('Loop playback', 'camera.loop', !!cam.loop)}
		${checkField('Hide UI while playing', 'camera.hideUIPlay', cam.hideUIPlay !== false)}
		<div class="divider" style="margin:8px 0"></div>
		${selectField('Preview aspect', 'camera.aspect', cam.aspect, [
			['free', 'Free / fill'],
			['16:9', '16:9 • landscape'],
			['9:16', '9:16 • vertical'],
			['4:3', '4:3'],
			['1:1', '1:1 • square'],
		])}
		${checkField('Show framing guides', 'camera.guides', !!cam.guides)}
	</div>`;

	html += `<div class="card">
		<div class="card-head"><span class="card-title">Keyframes</span>
			<button class="btn xs" data-act="kf-add">＋ Add at playhead</button>
		</div>
		<div class="hint" style="margin-bottom:7px">Playhead: <b>${r2(app.cam.time)}s</b> · interpolating position, rotation and field of view.</div>
		<div class="stack-sm">${
			kfs
				.map(
					(kf, i) => `<div class="kf-card ${app.selectedKf === kf.id ? 'on' : ''}">
				<div class="kf-top">
					<span class="t">${r2(kf.t)}s</span>
					<span class="badge muted">#${i + 1}</span>
					<span class="spacer"></span>
					<button class="micro" data-act="kf-go" data-id="${kf.id}" title="Jump to keyframe">▸</button>
					<button class="micro" data-act="kf-update" data-id="${kf.id}" title="Replace with current view">⌖</button>
					<button class="micro" data-act="kf-select" data-id="${kf.id}" title="Edit">✎</button>
					<button class="micro danger" data-act="kf-del" data-id="${kf.id}" title="Delete">✕</button>
				</div>
				<div class="kf-fields">
					${numField('t', 't', kf.t, 0.1, `data-kf="${kf.id}"`)}
					${numField('fov', 'fov', kf.fov, 1, `data-kf="${kf.id}"`)}
					${numField('x', 'p.0', kf.p[0], 0.05, `data-kf="${kf.id}"`)}
					${numField('y', 'p.1', kf.p[1], 0.05, `data-kf="${kf.id}"`)}
					${numField('z', 'p.2', kf.p[2], 0.05, `data-kf="${kf.id}"`)}
					${numField('yaw', 'r.1', kf.r[1], 1, `data-kf="${kf.id}"`)}
					${numField('pitch', 'r.0', kf.r[0], 1, `data-kf="${kf.id}"`)}
					${numField('roll', 'r.2', kf.r[2], 1, `data-kf="${kf.id}"`)}
				</div>
				<select data-path="ease" data-kf="${kf.id}" style="width:100%;background:#0a101a;border:1px solid var(--line);border-radius:5px;font-size:10.5px;padding:3px 5px;color:var(--muted);margin-top:2px">
					${optList(Object.entries(EASINGS).map(([k, v]) => [k, v.label]), kf.ease)}
				</select>
			</div>`
				)
				.join('') || emptyState('🎥', 'No keyframes', 'Capture your current camera view, change the shot, then capture again. Use Play to fly between them.')
		}</div>
	</div>`;

	html += '</div>';
	return html;
}

/* ---------------------------------------------------------------------------
   HUD / tabs / timeline chrome
--------------------------------------------------------------------------- */
function renderHUD() {
	const hud = $('#hud');
	if (!hud) return;
	const item = selectedItem();
	const kind = item ? itemKind(app.project, item.id) : null;
	hud.innerHTML = `<div class="hud-card">
		<div class="hud-sel">${item ? `${kind === 'char' ? '🧑' : propEmoji(item.kind)} <b>${esc(item.name)}</b>` : 'Click an object'}</div>
		<div class="hud-tools">
			<button class="hud-btn ${app.gizmo === 'translate' ? 'on' : ''}" data-act="gizmo" data-mode="translate" title="Move gizmo (W)">✥</button>
			<button class="hud-btn ${app.gizmo === 'rotate' ? 'on' : ''}" data-act="gizmo" data-mode="rotate" title="Rotate gizmo (E)">⟳</button>
			<button class="hud-btn ${app.gizmo === 'scale' ? 'on' : ''}" data-act="gizmo" data-mode="scale" title="Scale gizmo (R)">⤢</button>
			<span class="hud-sep"></span>
			<button class="hud-btn ${app.snap ? 'on' : ''}" data-act="snap" title="Snap to grid">⌗</button>
			<button class="hud-btn" data-act="frame-item" title="Frame selection (F)">◎</button>
			<button class="hud-btn" data-act="cam-reset" title="Reset camera">⌂</button>
		</div>
	</div>
	<div class="hud-hint">drag orbit · wheel zoom · <b>G</b> POV · <b>H</b> clean UI · <b>P</b> story · <b>C</b> camera</div>`;
}

function updateTopbar() {
	$$('.tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === app.tab));
	const vnBtn = $('#btnPlayVN');
	if (vnBtn) vnBtn.innerHTML = app.playingVN ? '<span class="ico-txt">■</span><span class="btn-label">Stop story</span>' : '<span class="ico-txt">▶</span><span class="btn-label">Play story</span>';
	const cleanBtn = $('[data-act="clean-toggle"]');
	if (cleanBtn) cleanBtn.innerHTML = app.clean ? '<span class="ico-txt">👁</span><span class="btn-label">Show UI</span>' : '<span class="ico-txt">🎥</span><span class="btn-label">Clean UI</span>';
	const camBtn = $('[data-act="cam-play"]');
	if (camBtn && camBtn.closest('#topbar')) camBtn.innerHTML = app.cam.playing ? '<span class="ico-txt">■</span><span class="btn-label">Stop</span>' : '<span class="ico-txt">🎬</span><span class="btn-label">Camera</span>';
	const pov = $('#topbar [data-act="game-open"]');
	if (pov) pov.classList.toggle('on', !!app.game);
	document.body.dataset.tab = app.tab;
}

function renderTimeline() {
	const tl = timeline();
	if (!tl) return;
	if (app.tab !== 'camera' && !app.cam.playing) {
		tl.hidden = true;
		tl.innerHTML = '';
		return;
	}
	const cam = app.project.camera;
	const kfs = [...cam.keyframes].sort((a, b) => a.t - b.t);
	tl.hidden = false;
	tl.innerHTML = `<div class="tl-bar">
		<div class="tl-transport">
			<button class="btn sm" data-act="cam-play" title="Play / pause sequence">${app.cam.playing ? '⏸' : '▶'}</button>
			<button class="btn sm" data-act="cam-stop" title="Stop and restore the camera">■</button>
			<button class="btn sm ${cam.loop ? 'accent' : ''}" data-act="cam-loop" title="Loop">🔁</button>
			<span class="tl-label">CAM</span>
		</div>
		<span class="tl-time" id="tlTime">0.00 / ${r2(cam.duration)} s</span>
		<div class="tl-ticks" id="tlTicks">
			<div class="tl-ruler"></div>
			<div class="tl-fill" id="tlFill"></div>
			${kfs
				.map(
					(kf) =>
						`<div class="tl-marker ${app.selectedKf === kf.id ? 'on' : ''}" data-marker="${kf.id}" style="left:${
							cam.duration > 0 ? (kf.t / cam.duration) * 100 : 0
						}%" title="${r2(kf.t)}s"></div>`
				)
				.join('')}
			<div class="tl-head" id="tlHead"></div>
		</div>
		<div class="tl-actions">
			<button class="btn sm" data-act="kf-add">＋ Keyframe</button>
			<button class="btn sm" data-act="kf-capture">⌖ Capture view</button>
		</div>
	</div>`;
	wireTimeline();
	updateTimelineUI();
}

function updateTimelineUI() {
	const head = $('#tlHead');
	const fill = $('#tlFill');
	const time = $('#tlTime');
	const ticks = $('#tlTicks');
	if (!head || !fill || !time || !ticks) return;
	const dur = Math.max(0.5, app.project.camera.duration || 0.5);
	const pct = clamp((app.cam.time / dur) * 100, 0, 100);
	head.style.left = `${pct}%`;
	fill.style.width = `${pct}%`;
	time.innerHTML = `<b>${r2(app.cam.time).toFixed(2)}</b> / ${r2(dur).toFixed(2)} s`;
	$$('.tl-marker', ticks).forEach((m) => {
		const kf = app.project.camera.keyframes.find((k) => k.id === m.dataset.marker);
		if (kf) {
			m.style.left = `${clamp((kf.t / dur) * 100, 0, 100)}%`;
			m.title = `${r2(kf.t)}s`;
			m.classList.toggle('on', app.selectedKf === kf.id);
		}
	});
}

function wireTimeline() {
	const ticks = $('#tlTicks');
	if (!ticks) return;
	const timeFromX = (clientX) => {
		const rect = ticks.getBoundingClientRect();
		return clamp((clientX - rect.left) / Math.max(1, rect.width), 0, 1) * Math.max(0.5, app.project.camera.duration);
	};
	ticks.addEventListener('pointerdown', (e) => {
		if (app.cam.playing) return;
		const marker = e.target.closest('.tl-marker');
		let dragging = null;
		if (marker) {
			dragging = { type: 'marker', id: marker.dataset.marker };
			app.selectedKf = marker.dataset.marker;
		} else {
			dragging = { type: 'seek' };
			seekTo(timeFromX(e.clientX));
		}
		e.preventDefault();
		const move = (ev) => {
			const t = timeFromX(ev.clientX);
			if (dragging.type === 'seek') {
				seekTo(t);
			} else {
				const kf = app.project.camera.keyframes.find((k) => k.id === dragging.id);
				if (!kf) return;
				kf.t = r2(t);
				app.project.camera.duration = Math.max(app.project.camera.duration, kf.t);
				app.cam.time = kf.t;
				sortKeyframes();
				sampleCamera(kf.t);
				updateTimelineUI();
			}
		};
		const up = () => {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
			window.removeEventListener('pointercancel', up);
			if (dragging?.type === 'marker') {
				commit();
				renderPanel();
				renderTimeline();
			}
		};
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
		window.addEventListener('pointercancel', up);
	});
}

/* ---------------------------------------------------------------------------
   Camera sequence
--------------------------------------------------------------------------- */
function sortKeyframes() {
	app.project.camera.keyframes.sort((a, b) => a.t - b.t);
}

function quatFromEulerDeg(r) {
	return new THREE.Quaternion().setFromEuler(new THREE.Euler(D2R(r[0] || 0), D2R(r[1] || 0), D2R(r[2] || 0), 'YXZ'));
}

function sampleCamera(t) {
	const kfs = [...app.project.camera.keyframes].sort((a, b) => a.t - b.t);
	if (!kfs.length) return false;
	const cam = app.studio.camera;
	if (t <= kfs[0].t) {
		app.studio.applyKeyframe(kfs[0]);
		return true;
	}
	const last = kfs[kfs.length - 1];
	if (t >= last.t) {
		app.studio.applyKeyframe(last);
		return true;
	}
	let i = 0;
	while (i < kfs.length - 1 && kfs[i + 1].t <= t) i++;
	const a = kfs[i];
	const b = kfs[i + 1];
	const span = Math.max(0.001, b.t - a.t);
	let u = clamp((t - a.t) / span, 0, 1);
	u = (EASINGS[a.ease]?.fn || EASINGS.easeInOut.fn)(u);
	const pos = new THREE.Vector3(...a.p).lerp(new THREE.Vector3(...b.p), u);
	const qa = quatFromEulerDeg(a.r);
	const qb = quatFromEulerDeg(b.r);
	qa.slerp(qb, u);
	cam.position.copy(pos);
	cam.quaternion.copy(qa);
	cam.fov = a.fov + (b.fov - a.fov) * u;
	cam.updateProjectionMatrix();
	return true;
}

function seekTo(t) {
	app.cam.time = clamp(t, 0, Math.max(0.5, app.project.camera.duration));
	if (!app.cam.playing) {
		sampleCamera(app.cam.time);
		// keep orbit controls consistent after scrubbing
		const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(app.studio.camera.quaternion);
		app.studio.controls.target.copy(app.studio.camera.position).addScaledVector(dir, 4);
	}
	updateTimelineUI();
}

function playCamera() {
	if (app.playingVN) return toast('Exit the visual novel first', 'warn');
	if (app.cam.playing) {
		stopCamera(true);
		return;
	}
	if (app.project.camera.keyframes.length < 2) return toast('Add at least two camera keyframes first', 'warn');
	app.cam.savedView = app.studio.view();
	app.cam.playing = true;
	app.cam.hidUI = app.project.camera.hideUIPlay !== false && !app.clean;
	app.studio.setLocked(true);
	app.studio.stopTween();
	document.body.classList.add('cam-playing');
	if (app.cam.hidUI) setClean(true, true);
	if (app.cam.time >= app.project.camera.duration) app.cam.time = 0;
	sampleCamera(app.cam.time);
	renderTimeline();
	renderHUD();
	updateTopbar();
	if (app.tab === 'camera') renderPanel();
}

function stopCamera(restore = true) {
	if (!app.cam.playing) return;
	app.cam.playing = false;
	app.studio.setLocked(false);
	document.body.classList.remove('cam-playing');
	if (restore && app.cam.savedView) app.studio.setView(app.cam.savedView);
	if (app.cam.hidUI) setClean(false, true);
	app.cam.hidUI = false;
	renderTimeline();
	renderHUD();
	updateTopbar();
	updateGuides();
	if (app.tab === 'camera') renderPanel();
}

function tick(ts) {
	if (!app.studio) return;
	const now = ts / 1000;
	const dt = app._lastTs ? Math.min(0.08, now - app._lastTs) : 0;
	app._lastTs = now;
	if (app.cam.playing) {
		const dur = Math.max(0.5, app.project.camera.duration);
		app.cam.time += dt;
		if (app.cam.time >= dur) {
			if (app.project.camera.loop) {
				app.cam.time = 0;
			} else {
				app.cam.time = dur;
				sampleCamera(dur);
				updateTimelineUI();
				stopCamera(true);
				toast('Camera sequence finished');
				requestAnimationFrame(tick);
				return;
			}
		}
		sampleCamera(app.cam.time);
		updateTimelineUI();
	}
	requestAnimationFrame(tick);
}

function captureKeyframe() {
	const view = app.studio.view();
	const t = r2(app.cam.time);
	const kfs = app.project.camera.keyframes;
	const existing = kfs.find((k) => Math.abs(k.t - t) < 0.05);
	if (existing) {
		existing.p = view.p;
		existing.r = view.r;
		existing.fov = view.fov;
		app.selectedKf = existing.id;
		toast('Keyframe updated at this time');
	} else {
		const kf = { id: uid('kf'), t, p: view.p, r: view.r, fov: view.fov, ease: 'easeInOut' };
		kfs.push(kf);
		app.selectedKf = kf.id;
		toast(`Keyframe added at ${t.toFixed(2)}s`);
	}
	app.project.camera.duration = Math.max(app.project.camera.duration, t);
	sortKeyframes();
	commit();
	renderPanel();
	renderTimeline();
	updateGuides();
}

/* ---------------------------------------------------------------------------
   Visual novel
--------------------------------------------------------------------------- */
function startVN(index = 0) {
	const P = app.project;
	const lines = P.dialogue.lines;
	if (!lines.length) return toast('Add dialogue lines first', 'warn');
	if (app.game) exitGame();
	if (app.cam.playing) stopCamera(true);
	app.vn.savedView = app.studio.view();
	app.vn.index = Math.max(0, Math.min(index, lines.length - 1));
	app.vn.savedSelection = app.selection;
	app.playingVN = true;
	document.body.classList.add('vn');
	const overlay = $('#vnOverlay');
	overlay.hidden = false;
	overlay.dataset.theme = P.dialogue.theme || 'sunset';
	app.studio.setLocked(true);
	app.studio.stopTween();
	app.studio.transform.detach();
	app.studio.selectionBox.visible = false;
	overlay.classList.add('ui-awake');
	clearTimeout(app.vn.chromeTimer);
	app.vn.chromeTimer = setTimeout(() => overlay.classList.remove('ui-awake'), 4200);
	showLine(app.vn.index);
	updateTopbar();
	updateGuides();
}

function showLine(i) {
	const P = app.project;
	const lines = P.dialogue.lines;
	if (!lines.length) return endVN();
	if (i >= lines.length) {
		endVN();
		return;
	}
	app.vn.index = i;
	const line = lines[i];
	const speaker = characterById(P, line.speakerId);
	const activeSpeaker = speaker && speaker.visible !== false ? speaker : null;
	const nameEl = $('#vnName');
	const textEl = $('#vnText');
	const overlay = $('#vnOverlay');
	overlay.dataset.theme = P.dialogue.theme || 'sunset';
	nameEl.textContent = speaker ? speaker.name : 'Narrator';
	if (speaker) nameEl.style.background = P.dialogue.theme === 'sunset' ? speaker.role || 'var(--vn-border)' : '';
	else nameEl.style.background = '';
	textEl.textContent = '';
	$('#vnProgress').textContent = `${i + 1} / ${lines.length}`;
	$('#vnNext').classList.remove('on');

	// expression + talking state
	if (activeSpeaker && line.expression) {
		app.studio.updateRig({ ...activeSpeaker, expression: line.expression });
	}
	for (const [id, obj] of app.studio.objects) {
		if (obj.userData.kind === 'char') obj.userData.talking = !!activeSpeaker && id === activeSpeaker.id;
	}
	app.studio.setDimmed(activeSpeaker ? [activeSpeaker.id] : []);

	frameLine(line, activeSpeaker);
	startTyping(line.text || '');
}

function frameLine(line, speaker) {
	const P = app.project;
	const chars = P.characters.filter((c) => c.visible !== false);
	let shot = line.shot || 'auto';
	if (shot === 'auto') shot = speaker ? 'medium' : chars.length > 1 ? 'wide' : 'full';

	if (shot === 'wide' || !speaker) {
		if (chars.length > 1) {
			const two = app.studio.twoShot(chars.map((c) => c.id));
			if (two) return app.studio.tweenTo(two.pos, two.look, 0.85, two.fov);
		}
		if (speaker) {
			const single = app.studio.characterShot(speaker.id, 'wide');
			if (single) return app.studio.tweenTo(single.pos, single.look, 0.85, single.fov);
		}
		if (chars.length === 1) {
			const single = app.studio.characterShot(chars[0].id, 'full');
			if (single) return app.studio.tweenTo(single.pos, single.look, 0.85, single.fov);
		}
		return;
	}
	const frame = app.studio.characterShot(speaker.id, shot === 'auto' ? 'medium' : shot);
	if (frame) app.studio.tweenTo(frame.pos, frame.look, 0.85, frame.fov);
}

function startTyping(full) {
	clearInterval(app.vn.timer);
	app.vn.full = full;
	app.vn.typing = full.length > 0;
	const el = $('#vnText');
	el.textContent = '';
	let n = 0;
	if (!full.length) {
		finishTyping();
		return;
	}
	app.vn.timer = setInterval(() => {
		n += 1;
		el.textContent = full.slice(0, n);
		if (n >= full.length) finishTyping();
	}, 22);
}

function finishTyping() {
	clearInterval(app.vn.timer);
	app.vn.timer = null;
	app.vn.typing = false;
	const el = $('#vnText');
	if (el) el.textContent = app.vn.full;
	$('#vnNext')?.classList.add('on');
}

function advanceVN() {
	if (!app.playingVN) return;
	if (app.vn.typing) {
		finishTyping();
		return;
	}
	showLine(app.vn.index + 1);
}

function endVN() {
	if (!app.playingVN) return;
	app.playingVN = false;
	clearInterval(app.vn.timer);
	app.vn.timer = null;
	app.vn.typing = false;
	clearTimeout(app.vn.chromeTimer);
	const overlay = $('#vnOverlay');
	if (overlay) {
		overlay.hidden = true;
		overlay.classList.remove('ui-awake');
	}
	document.body.classList.remove('vn');
	for (const [, obj] of app.studio.objects) obj.userData.talking = false;
	app.studio.setDimmed([]);
	app.studio.stopTween();
	if (app.vn.savedView) app.studio.setView(app.vn.savedView);
	app.studio.setLocked(false);
	if (app.selection) app.studio.select(app.selection);
	updateTopbar();
	renderHUD();
	updateGuides();
}

/* ---------------------------------------------------------------------------
   Clean mode
--------------------------------------------------------------------------- */
function setClean(on, silent = false) {
	if (on === app.clean) return;
	app.clean = on;
	document.body.classList.toggle('clean', on);
	const hint = $('#cleanHint');
	clearTimeout(app.cleanHintTimer);
	if (on) {
		if (!silent) {
			hint?.classList.add('show');
			app.cleanHintTimer = setTimeout(() => hint?.classList.remove('show'), 2800);
		}
	} else {
		hint?.classList.remove('show');
		if (!silent) toast('UI restored');
	}
	updateTopbar();
	updateGuides();
}

/* ---------------------------------------------------------------------------
   Guides
--------------------------------------------------------------------------- */
function aspectRatio(name) {
	return { '16:9': 16 / 9, '9:16': 9 / 16, '4:3': 4 / 3, '1:1': 1 }[name] || null;
}

function updateGuides() {
	const guides = $('#guides');
	const frame = $('#guideFrame');
	if (!guides || !frame) return;
	const show = !!app.project?.camera?.guides && app.tab === 'camera' && !app.clean && !app.playingVN && !app.cam.playing && !app.game;
	guides.style.display = show ? 'block' : 'none';
	if (!show) return;
	const vp = $('#viewport').getBoundingClientRect();
	const ratio = aspectRatio(app.project.camera.aspect);
	let w = vp.width;
	let h = vp.height;
	if (ratio) {
		if (w / h > ratio) w = h * ratio;
		else h = w / ratio;
	}
	frame.style.width = `${Math.round(w)}px`;
	frame.style.height = `${Math.round(h)}px`;
}

/* ---------------------------------------------------------------------------
   Actions
--------------------------------------------------------------------------- */
function setTab(tab) {
	if (app.game) exitGame();
	if (!TABS.some(([id]) => id === tab)) return;
	if (app.tab === tab) return;
	if (app.cam.playing) stopCamera(true);
	app.tab = tab;
	updateTopbar();
	renderPanel();
	renderTimeline();
	renderHUD();
	updateGuides();
}

function setGizmo(mode) {
	app.gizmo = mode;
	app.studio.setGizmoMode(mode);
	renderHUD();
}

function addCharacter() {
	const n = app.project.characters.length + 1;
	const camTarget = app.studio.controls.target;
	const c = newCharacter({
		name: `Actor ${n}`,
		pose: 'idle',
		expression: 'neutral',
		role: CLOTH_COLORS[(n * 3) % CLOTH_COLORS.length],
		transform: { p: [r2(camTarget.x) + (n % 2 ? 0.8 : -0.8), 0, r2(camTarget.z)], r: [0, 180, 0], s: 1 },
	});
	app.project.characters.push(c);
	app.studio.addItem(app.project, c, 'char');
	selectItem(c.id);
	app.tab = 'characters';
	commit();
	renderAll();
	toast(`${c.name} joined the scene`);
}

function deleteCharacter(id) {
	const P = app.project;
	const idx = P.characters.findIndex((c) => c.id === id);
	if (idx < 0) return;
	const name = P.characters[idx].name;
	if (!window.confirm(`Delete ${name}? Any dialogue lines spoken by them become narrator lines.`)) return;
	P.characters.splice(idx, 1);
	P.dialogue.lines.forEach((l) => {
		if (l.speakerId === id) l.speakerId = 'narrator';
	});
	app.studio.removeItem(id);
	if (app.selection === id) app.selection = null;
	commit();
	renderAll();
	toast(`${name} removed`);
}

function duplicateItem(id) {
	const P = app.project;
	const kind = itemKind(P, id);
	const src = findItem(P, id);
	if (!src) return;
	const copy = deepClone(src);
	copy.id = uid(kind === 'char' ? 'char' : 'prop');
	copy.name = `${src.name} copy`;
	copy.transform.p = [src.transform.p[0] + 0.8, src.transform.p[1], src.transform.p[2] + 0.4];
	(kind === 'char' ? P.characters : P.props).push(copy);
	app.studio.addItem(P, copy, kind);
	selectItem(copy.id);
	commit();
	renderAll();
	toast('Duplicated');
}

function deleteItem(id) {
	const kind = itemKind(app.project, id);
	if (!kind) return;
	if (kind === 'char') deleteCharacter(id);
	else {
		const P = app.project;
		P.props = P.props.filter((p) => p.id !== id);
		app.studio.removeItem(id);
		if (app.selection === id) app.selection = null;
		commit();
		renderAll();
		toast('Prop deleted');
	}
}

function addProp(kind, position = null) {
	const P = app.project;
	const target = app.studio.controls.target;
	const pos = position || [r2(target.x) + (Math.random() - 0.5) * 1.6, 0, r2(target.z) + (Math.random() - 0.5) * 1.6];
	const prop = newProp(kind);
	prop.transform.p = pos;
	prop.transform.r = [0, r2(Math.random() * 360), 0];
	P.props.push(prop);
	app.studio.addItem(P, prop, 'prop');
	app.selection = prop.id;
	app.studio.select(prop.id);
	commit();
	renderAll();
	toast(`${prop.name} added`);
}

function scatterProps() {
	const kind = $('#scatterKind')?.value || 'pine';
	const count = clamp(parseInt($('#scatterCount')?.value, 10) || 8, 1, 80);
	const radius = clamp(parseFloat($('#scatterRadius')?.value) || 8, 2, 40);
	const target = app.studio.controls.target;
	const P = app.project;
	for (let i = 0; i < count; i++) {
		const a = Math.random() * Math.PI * 2;
		const d = 2.2 + Math.random() * radius;
		const prop = newProp(kind);
		prop.transform.p = [r2(target.x + Math.cos(a) * d), 0, r2(target.z + Math.sin(a) * d)];
		prop.transform.r = [0, r2(Math.random() * 360), 0];
		prop.transform.s = r2(0.7 + Math.random() * 0.8);
		prop.color = propDefaultColor(kind);
		P.props.push(prop);
		app.studio.addItem(P, prop, 'prop');
	}
	commit();
	renderAll();
	toast(`Scattered ${count} ${propLabel(kind).toLowerCase()}${count === 1 ? '' : 's'}`);
}

function applyPreset(id) {
	const preset = PRESETS.find((p) => p.id === id);
	if (!preset) return;
	app.project.environment = { ...app.project.environment, ...preset.env, preset: id, time: null };
	app.studio.setEnvironment(app.project.environment, app.project);
	commit();
	renderPanel();
	toast(`${preset.label} environment applied`);
}

function selectTexture(id) {
	app.selectedTex = id;
	renderPanel();
}

function createTexture() {
	const type = $('#texType')?.value || 'checker';
	const name = ($('#texName')?.value || '').trim() || TEXTURE_TYPES.find((t) => t.type === type)?.label || 'Texture';
	const a = $('#texA')?.value || '#ffffff';
	const b = $('#texB')?.value || '#222222';
	const scale = Number($('#texScale')?.value) || 2;
	const tex = newTexture(type, { name, a, b, scale });
	app.project.textures.push(tex);
	app.selectedTex = tex.id;
	commit();
	renderPanel();
	toast(`Texture “${name}” created`);
}

function applyTexture() {
	const id = app.selectedTex;
	if (!id) return toast('Select a texture first', 'warn');
	const item = selectedItem();
	if (!item || itemKind(app.project, item.id) !== 'prop') return toast('Select a prop to apply the texture to', 'warn');
	item.textureId = id;
	app.studio.rebuildItem(app.project, item, 'prop');
	commit();
	renderPanel();
	toast(`Texture applied to ${item.name}`);
}

function deleteTexture(id) {
	const P = app.project;
	P.textures = P.textures.filter((t) => t.id !== id);
	let touched = false;
	P.props.forEach((p) => {
		if (p.textureId === id) {
			p.textureId = null;
			app.studio.rebuildItem(P, p, 'prop');
			touched = true;
		}
	});
	if (app.selectedTex === id) app.selectedTex = P.textures[0]?.id || null;
	commit();
	renderPanel();
	toast(touched ? 'Texture deleted and removed from props' : 'Texture deleted');
}

function importTextureFile(file, input) {
	if (!file) return false;
	if (!String(file.type || '').startsWith('image/')) {
		toast('That file is not an image', 'err');
		if (input) input.value = '';
		return false;
	}
	if (file.size > 3.5 * 1024 * 1024) {
		toast('Image is larger than 3.5 MB', 'err');
		if (input) input.value = '';
		return false;
	}
	const reader = new FileReader();
	reader.onload = () => {
		const tex = newTexture('image', { name: file.name.replace(/\.[^.]+$/, '').slice(0, 24), type: 'image', dataUrl: reader.result, scale: 1 });
		app.project.textures.push(tex);
		app.selectedTex = tex.id;
		const prop = selectedItem();
		let applied = null;
		if (prop && itemKind(app.project, prop.id) === 'prop') {
			prop.textureId = tex.id;
			app.studio.rebuildItem(app.project, prop, 'prop');
			applied = prop;
		}
		commit();
		if (app.tab === 'textures') renderPanel();
		else setTab('textures');
		toast(applied ? `Imported “${tex.name}” and applied it to ${applied.name}` : `Imported “${tex.name}”`);
	};
	reader.readAsDataURL(file);
	if (input) input.value = '';
	return true;
}

function importTextureFiles(files, input) {
	const list = [...(files || [])].filter((f) => String(f.type || '').startsWith('image/')).slice(0, 8);
	if (!list.length) {
		if (input) input.value = '';
		return;
	}
	list.forEach((f) => importTextureFile(f));
	if (input) input.value = '';
	if (list.length > 1) setTimeout(() => toast(`${list.length} textures imported`), 80);
}

function addLine() {
	const P = app.project;
	const speaker = P.characters[0]?.id || 'narrator';
	P.dialogue.lines.push({ id: uid('line'), speakerId: speaker, text: 'New line…', expression: 'neutral', shot: 'auto' });
	commit();
	renderPanel();
	requestAnimationFrame(() => {
		const last = panel().querySelector('.line-card:last-child');
		last?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
		const ta = last?.querySelector('textarea');
		ta?.focus();
		ta?.select();
	});
}

function lineById(id) {
	return app.project.dialogue.lines.find((l) => l.id === id);
}

function moveLine(id, dir) {
	const lines = app.project.dialogue.lines;
	const i = lines.findIndex((l) => l.id === id);
	if (i < 0) return;
	const j = i + dir;
	if (j < 0 || j >= lines.length) return;
	[lines[i], lines[j]] = [lines[j], lines[i]];
	commit();
	renderPanel();
}

/* ---------------------------------------------------------------------------
   World, camera moves & POV game mode
--------------------------------------------------------------------------- */
function applyTimeOfDay(id) {
	const t = TIMES.find((x) => x.id === id);
	if (!t) return;
	const env = app.project.environment;
	Object.assign(env, {
		time: t.id,
		skyTop: t.skyTop,
		skyBottom: t.skyBottom,
		sunColor: t.sunColor,
		sunElevation: t.sunElevation,
		sun: t.sun,
		ambient: t.ambient,
		fog: t.fog,
	});
	app.studio.setEnvironment(env, app.project);
	commit();
	renderPanel();
	toast(`${t.emoji} ${t.label} light`);
}

function addCameraMove(kind) {
	const P = app.project;
	const cam = P.camera;
	const st = app.studio;
	if (app.cam.playing) stopCamera(true);
	if (!cam.keyframes.length) {
		app.cam.time = 0;
		captureKeyframe();
	}
	const lastT = Math.max(...cam.keyframes.map((k) => k.t), 0);
	if (lastT + 0.25 >= cam.duration) cam.duration = Math.min(180, Math.round((lastT + 3) * 10) / 10);
	const t = Math.min(cam.duration, lastT + 2);
	const target = st.controls.target.clone();
	const pos = st.camera.position.clone();
	if (kind === 'orbit') {
		const off = pos.clone().sub(target);
		off.applyAxisAngle(new THREE.Vector3(0, 1, 0), D2R(38));
		pos.copy(target).add(off);
	} else if (kind === 'push') {
		pos.lerp(target, 0.32);
	} else if (kind === 'crane') {
		pos.y += 1.8;
		pos.z += 0.5;
	} else if (kind === 'pan') {
		const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), pos.clone().sub(target)).normalize();
		target.addScaledVector(right, -1.3);
		pos.addScaledVector(right, -1.3);
	}
	st.camera.position.copy(pos);
	st.camera.lookAt(target);
	st.controls.target.copy(target);
	app.cam.time = t;
	captureKeyframe();
	const labels = { orbit: 'Orbit', push: 'Push in', crane: 'Crane up', pan: 'Pan' };
	toast(`${labels[kind] || 'Camera'} move added at ${r2(t)}s`);
}

function persistGame() {
	app.project.game = {
		...(app.project.game || {}),
		actorId: app.playActorId,
		thirdPerson: !!app.playThird,
		pad: !!app.gamepad,
	};
	markDirty();
}

function updateGamePrompt(text) {
	const el = $('#gamePrompt');
	if (!el) return;
	el.hidden = !text;
	el.textContent = text || '';
	const cross = $('#gameCross');
	if (cross) cross.classList.toggle('aim', !!text);
}

function updateGameHud() {
	const hud = $('#gameHud');
	const pad = $('#gamePad');
	if (!hud || !pad) return;
	const g = app.game;
	if (!g) {
		hud.hidden = true;
		pad.hidden = true;
		document.body.classList.remove('game', 'no-pad');
		return;
	}
	hud.hidden = false;
	const name = $('#ghName');
	if (name) name.textContent = g.actor.name;
	const mode = $('#ghMode');
	if (mode) mode.textContent = g.thirdPerson ? '3RD' : 'POV';
	const view = $('#ghView');
	if (view) view.textContent = g.thirdPerson ? '3rd' : '1st';
	const padLabel = $('#ghPad');
	if (padLabel) padLabel.textContent = app.gamepad ? 'Pad' : 'Off';
	pad.hidden = !app.gamepad;
	document.body.classList.toggle('no-pad', !app.gamepad);
	$('#gpRun')?.classList.toggle('on', !!g.run);
	const grab = $('#gpGrab');
	if (grab) {
		grab.classList.toggle('on', !!g.holding);
		const small = grab.querySelector('small');
		if (small) small.textContent = g.holding ? 'Drop' : 'Grab';
	}
}

function startGame(actorId) {
	if (app.game) return;
	const P = app.project;
	const actor = characterById(P, actorId || app.playActorId || P.characters[0]?.id);
	if (!actor) {
		toast('Create an actor first — you play as them', 'warn');
		setTab('characters');
		return;
	}
	if (app.playingVN) endVN();
	if (app.cam.playing) stopCamera(true);
	if (app.clean) setClean(false, true);
	app.playActorId = actor.id;
	const game = new GameMode(app.studio, {
		project: P,
		actor,
		thirdPerson: !!app.playThird,
		onPrompt: updateGamePrompt,
		onState: updateGameHud,
		onExit: () => exitGame(),
		onToast: (msg) => toast(msg, 'warn'),
		onDrop: () => commit(),
	});
	if (!game.start()) {
		toast('That actor could not be placed in the scene', 'err');
		return;
	}
	app.game = game;
	document.body.classList.add('game');
	updateGameHud();
	updateGamePrompt('');
	persistGame();
	toast(`You are ${actor.name} — WASD to move, E to grab, Esc to leave`);
}

function exitGame() {
	if (!app.game) return;
	const game = app.game;
	app.game = null;
	game.stop();
	updateGameHud();
	updateGamePrompt('');
	document.body.classList.remove('game', 'no-pad');
	persistGame();
	renderAll();
	toast('Left POV');
}

function handleAction(act, btn) {
	const P = app.project;
	const studio = app.studio;
	switch (act) {
		case 'tab':
			setTab(btn.dataset.tab);
			break;
		case 'menu-toggle': {
			const pop = $('#menuPop');
			pop.hidden = !pop.hidden;
			break;
		}
		case 'new':
		case 'new-demo': {
			const demo = act === 'new-demo';
			if (!window.confirm(`Start a ${demo ? 'demo' : 'new blank'} project? The current project is replaced (a copy is autosaved until you edit).`)) break;
			clearProject();
			app.project = demo ? defaultProject() : blankProject();
			syncGamePrefs();
			app.selection = null;
			app.selectedKf = null;
			app.selectedTex = null;
			studio.setEnvironment(app.project.environment, app.project);
			studio.rebuildAll(app.project);
			studio.setView(app.project.view);
			$('#projectName').value = app.project.name;
			resetHistory();
			markDirty();
			renderAll();
			toast(demo ? 'Demo scene loaded' : 'Blank project created');
			app.tab = demo ? 'characters' : 'scene';
			setTab(app.tab);
			break;
		}
		case 'save':
			downloadFile(`${safeName(P.name)}.lowpoly.json`, JSON.stringify(P, null, 2), 'application/json');
			toast('Project downloaded');
			break;
		case 'load':
			$('#loadFile')?.click();
			break;
		case 'snapshot': {
			studio.renderer.render(studio.scene, studio.camera);
			const url = studio.renderer.domElement.toDataURL('image/png');
			downloadFile(`${safeName(P.name)}-frame.png`, url, 'image/png', true);
			toast('Screenshot saved');
			break;
		}
		case 'export-script': {
			const txt = dialogueToText(P);
			downloadFile(`${safeName(P.name)}-dialogue.txt`, txt, 'text/plain');
			toast('Dialogue exported');
			break;
		}
		case 'help':
		case 'guide':
			openHelp();
			break;
		case 'fullscreen':
			toggleFullscreen();
			break;
		case 'clean-toggle':
			setClean(!app.clean);
			break;
		case 'vn-play':
			if (app.playingVN) endVN();
			else startVN(0);
			break;
		case 'vn-exit':
			endVN();
			break;
		case 'cam-play':
			playCamera();
			break;
		case 'cam-stop':
			stopCamera(true);
			break;
		case 'cam-move':
			addCameraMove(btn.dataset.value || 'orbit');
			break;
		case 'time-of-day':
			applyTimeOfDay(btn.dataset.value);
			break;
		case 'cam-loop':
			P.camera.loop = !P.camera.loop;
			commit();
			renderPanel();
			renderTimeline();
			break;
		case 'cam-reset':
			studio.resetCamera();
			closeMenu();
			break;
		case 'gizmo':
			setGizmo(btn.dataset.mode);
			break;
		case 'snap':
			app.snap = !app.snap;
			studio.setGizmoSnap(app.snap);
			renderHUD();
			toast(app.snap ? 'Snapping on' : 'Snapping off');
			break;
		case 'frame-item':
			if (app.selection) studio.frameObject(app.selection);
			else toast('Select an object first', 'warn');
			closeMenu();
			break;
		case 'frame-all':
			studio.frameAll();
			closeMenu();
			break;
		case 'select-none':
			selectItem(null);
			break;
		case 'select-item':
			selectItem(btn.dataset.id);
			break;
		case 'toggle-visible': {
			const item = findItem(P, btn.dataset.id);
			if (!item) break;
			item.visible = item.visible === false;
			studio.setVisible(item.id, item.visible);
			commit();
			renderAll();
			break;
		}
		case 'toggle-lock': {
			const item = findItem(P, btn.dataset.id);
			if (!item) break;
			item.locked = !item.locked;
			studio.select(app.selection);
			commit();
			renderAll();
			break;
		}
		case 'item-duplicate':
			duplicateItem(btn.dataset.id || app.selection);
			break;
		case 'item-delete':
			deleteItem(btn.dataset.id || app.selection);
			break;
		case 'item-ground': {
			const item = findItem(P, btn.dataset.id || app.selection);
			if (!item) break;
			item.transform.p[1] = 0;
			studio.updateTransform(P, item.id);
			commit();
			renderPanel();
			break;
		}
		case 'char-add':
			addCharacter();
			break;
		case 'char-delete':
			deleteCharacter(btn.dataset.id);
			break;
		case 'set-expression': {
			const c = characterById(P, btn.dataset.id);
			if (!c) break;
			c.expression = btn.dataset.value;
			studio.updateRig(c);
			commit();
			renderPanel();
			break;
		}
		case 'set-pose': {
			const c = characterById(P, btn.dataset.id);
			if (!c) break;
			c.pose = btn.dataset.value;
			studio.updateRig(c);
			commit();
			renderPanel();
			break;
		}
		case 'char-color':
		case 'char-style': {
			const c = characterById(P, btn.dataset.id || app.selection);
			if (!c) break;
			const path = btn.dataset.path;
			if (!path) break;
			setPath(c, path, btn.dataset.value);
			app.studio.rebuildItem(P, c, 'char');
			commit();
			renderPanel();
			break;
		}
		case 'char-randomize': {
			const c = characterById(P, btn.dataset.id || app.selection);
			if (!c) break;
			const pick = (list) => list[Math.floor(Math.random() * list.length)];
			c.skin = pick(SKIN_TONES);
			c.eyeColor = pick(EYE_COLORS);
			c.hairColor = pick(HAIR_COLORS);
			c.hairStyle = pick(HAIR_STYLES)[0];
			c.topStyle = pick(TOP_STYLES)[0];
			c.accessory = pick(ACCESSORIES)[0];
			c.topColor = pick(CLOTH_COLORS);
			c.bottomColor = pick(CLOTH_COLORS);
			c.shoeColor = pick(CLOTH_COLORS);
			c.accentColor = pick(CLOTH_COLORS);
			studio.rebuildItem(P, c, 'char');
			commit();
			renderPanel();
			toast(`${c.name} got a new look`);
			break;
		}
		case 'face-camera': {
			const c = characterById(P, btn.dataset.id || app.selection);
			if (!c) break;
			const camPos = studio.camera.position;
			const dx = camPos.x - c.transform.p[0];
			const dz = camPos.z - c.transform.p[2];
			c.transform.r[1] = r2(R2D(Math.atan2(dx, dz)));
			studio.updateTransform(P, c.id);
			commit();
			renderPanel();
			break;
		}
		case 'prop-add':
			addProp(btn.dataset.kind);
			break;
		case 'prop-drop': {
			const item = findItem(P, btn.dataset.id);
			if (!item) break;
			item.transform.p[1] = 0;
			studio.updateTransform(P, item.id);
			commit();
			renderPanel();
			break;
		}
		case 'apply-preset':
			applyPreset(btn.dataset.preset);
			break;
		case 'env-reset':
			applyPreset(P.environment.preset || 'beach');
			break;
		case 'scatter':
			scatterProps();
			break;
		case 'clear-props':
			if (!window.confirm('Remove every prop from the scene?')) break;
			for (const p of P.props) studio.removeItem(p.id);
			P.props = [];
			app.selection = null;
			commit();
			renderAll();
			toast('All props cleared');
			break;
		case 'tex-select':
			selectTexture(btn.dataset.id);
			break;
		case 'tex-create':
			createTexture();
			break;
		case 'tex-apply':
			applyTexture();
			break;
		case 'tex-clear': {
			const item = selectedItem();
			if (!item || itemKind(P, item.id) !== 'prop') break;
			item.textureId = null;
			studio.rebuildItem(P, item, 'prop');
			commit();
			renderPanel();
			toast('Texture removed');
			break;
		}
		case 'tex-delete':
			deleteTexture(btn.dataset.id);
			break;
		case 'tex-import-btn':
			$('#texImport')?.click();
			break;
		case 'line-add':
			addLine();
			break;
		case 'line-del': {
			P.dialogue.lines = P.dialogue.lines.filter((l) => l.id !== btn.dataset.id);
			commit();
			renderPanel();
			break;
		}
		case 'line-up':
			moveLine(btn.dataset.id, -1);
			break;
		case 'line-down':
			moveLine(btn.dataset.id, 1);
			break;
		case 'line-dup': {
			const line = lineById(btn.dataset.id);
			if (!line) break;
			const i = P.dialogue.lines.indexOf(line);
			const copy = { ...deepClone(line), id: uid('line') };
			P.dialogue.lines.splice(i + 1, 0, copy);
			commit();
			renderPanel();
			break;
		}
		case 'line-preview': {
			const i = P.dialogue.lines.findIndex((l) => l.id === btn.dataset.id);
			startVN(Math.max(0, i));
			break;
		}
		case 'kf-add':
		case 'kf-capture':
			captureKeyframe();
			break;
		case 'kf-go': {
			const kf = P.camera.keyframes.find((k) => k.id === btn.dataset.id);
			if (!kf) break;
			app.selectedKf = kf.id;
			seekTo(kf.t);
			renderPanel();
			renderTimeline();
			break;
		}
		case 'kf-update': {
			const kf = P.camera.keyframes.find((k) => k.id === btn.dataset.id);
			if (!kf) break;
			if (app.cam.playing) stopCamera(true);
			const v = studio.view();
			kf.p = v.p;
			kf.r = v.r;
			kf.fov = v.fov;
			app.selectedKf = kf.id;
			commit();
			renderAll();
			toast('Keyframe updated from current view');
			break;
		}
		case 'kf-select': {
			app.selectedKf = btn.dataset.id;
			const kf = P.camera.keyframes.find((k) => k.id === btn.dataset.id);
			if (kf) seekTo(kf.t);
			renderPanel();
			renderTimeline();
			break;
		}
		case 'kf-del': {
			P.camera.keyframes = P.camera.keyframes.filter((k) => k.id !== btn.dataset.id);
			if (app.selectedKf === btn.dataset.id) app.selectedKf = null;
			commit();
			renderAll();
			break;
		}
		case 'play-actor':
			app.playActorId = btn.dataset.id || null;
			persistGame();
			renderPanel();
			break;
		case 'play-view':
			app.playThird = (btn.dataset.value || 'first') === 'third';
			if (app.game) app.game.setView(app.playThird);
			persistGame();
			renderPanel();
			break;
		case 'play-pad':
			app.gamepad = !app.gamepad;
			persistGame();
			updateGameHud();
			renderPanel();
			break;
		case 'game-open':
			if (app.game) exitGame();
			else {
				const pick = app.selection && itemKind(P, app.selection) === 'char' ? app.selection : app.playActorId;
				startGame(pick || P.characters[0]?.id);
			}
			break;
		case 'game-start':
			startGame(btn.dataset.id || app.playActorId);
			break;
		case 'game-exit':
			exitGame();
			break;
		case 'game-grab':
			app.game?.grab();
			break;
		case 'game-jump':
			app.game?.jump();
			break;
		case 'game-run':
			if (app.game) app.game.setRun(!app.game.run);
			break;
		case 'game-view':
			if (app.game) app.game.setView(!app.game.thirdPerson);
			updateGameHud();
			break;
		case 'game-pad':
			app.gamepad = !app.gamepad;
			persistGame();
			updateGameHud();
			break;
		case 'help-close':
			$('#modalRoot').hidden = true;
			$('#modalRoot').innerHTML = '';
			break;
		default:
			break;
	}
}

/* ---------------------------------------------------------------------------
   Files, help & misc
--------------------------------------------------------------------------- */
function safeName(name) {
	return (name || 'scene').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'scene';
}

function downloadFile(name, data, type, isDataUrl = false) {
	const cap = window.Capacitor;
	if (cap?.isNativePlatform?.() && cap.Plugins?.Filesystem) {
		nativeSaveFile(name, data, isDataUrl);
		return;
	}
	const a = document.createElement('a');
	a.download = name;
	a.href = isDataUrl ? data : URL.createObjectURL(new Blob([data], { type }));
	document.body.appendChild(a);
	a.click();
	a.remove();
	if (!isDataUrl) setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// Inside the Android APK, downloads go through the native Filesystem + Share plugins
// so the user gets the familiar Android share / save sheet.
async function nativeSaveFile(name, data, isDataUrl) {
	const { Filesystem, Share } = window.Capacitor.Plugins;
	try {
		const base64 = isDataUrl ? String(data).split(',')[1] || '' : btoa(unescape(encodeURIComponent(String(data))));
		const written = await Filesystem.writeFile({ path: name, data: base64, directory: 'CACHE', recursive: true });
		if (Share) {
			await Share.share({ title: name, dialogTitle: 'Save or share your Low Poly Studio file', files: [written.uri] });
		} else {
			toast(`Saved to ${written.uri}`);
		}
	} catch (err) {
		console.error(err);
		toast('Could not save the file on this device', 'err');
	}
}

function dialogueToText(P) {
	const lines = [`${P.name.toUpperCase()}`, 'A low poly visual novel', '='.repeat(48), ''];
	P.dialogue.lines.forEach((line, i) => {
		const c = characterById(P, line.speakerId);
		lines.push(`[${String(i + 1).padStart(2, '0')}] ${c ? c.name.toUpperCase() : 'NARRATOR'}  (${line.shot}, ${line.expression})`);
		lines.push(`     ${line.text.replace(/\n/g, '\n     ')}`);
		lines.push('');
	});
	return lines.join('\n');
}

function openHelp() {
	const root = $('#modalRoot');
	root.hidden = false;
	root.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
		<h2>Low Poly Studio</h2>
		<p>Everything is on the left rail: <b>Home · Actors · World · Props · Textures · Arrange · Story · Camera · Play</b>.
		The top bar always has <b>Play story</b>, <b>Camera</b> and <b>POV</b>, so you never have to hunt for them.</p>

		<h3>Five steps to a film</h3>
		<ul>
			<li><b>1 · Actors</b> — pick an actor and design their face, eye colour, hair, outfit, accessory and pose.</li>
			<li><b>2 · World</b> — choose a preset card, tap a time of day, drag the sun, then scatter trees or rocks.</li>
			<li><b>3 · Story</b> — write a line per beat; choose speaker, expression and camera shot. Press <b>Play story</b>.</li>
			<li><b>4 · Camera</b> — use a <b>Quick move</b> (orbit / push in / crane / pan) or capture keyframes, then play the timeline.</li>
			<li><b>5 · Play</b> — take the POV of any actor, walk around, pick props up, or hide the UI and screen-record.</li>
		</ul>

		<h3>Textures</h3>
		<p>Open <b>Textures</b> and drop an image on the panel, paste one with <kbd>Ctrl</kbd>+<kbd>V</kbd>, or click <b>Import</b>.
		If a prop is selected, the imported texture is applied to it immediately. You can also generate 16 procedural patterns,
		then fine-tune colour, scale and repeat.</p>

		<h3>POV / game mode</h3>
		<p>Press <b>G</b> (or <b>POV</b> in the top bar) to become the selected actor. On a phone use the on-screen
		<b>move stick</b>, <b>look pad</b>, <b>Jump</b>, <b>Grab</b>, <b>Run</b> and <b>View</b> buttons. On desktop: mouse look,
		<kbd>WASD</kbd>, <kbd>Shift</kbd> to run, <kbd>Space</kbd> to jump, <kbd>E</kbd> to grab / drop a prop, <kbd>F</kbd> for
		first / third person and <kbd>Esc</kbd> to leave. Big props (buildings, big trees) are too heavy to lift.</p>

		<h3>Shortcuts</h3>
		<div class="kbd-grid">
			<div><span>Home / tools</span><span><kbd>1</kbd>…<kbd>9</kbd></span></div>
			<div><span>POV game mode</span><span><kbd>G</kbd></span></div>
			<div><span>Hide / show UI</span><span><kbd>H</kbd></span></div>
			<div><span>Play visual novel</span><span><kbd>P</kbd></span></div>
			<div><span>Play camera sequence</span><span><kbd>C</kbd></span></div>
			<div><span>Gizmo move / rotate / scale</span><span><kbd>W</kbd> <kbd>E</kbd> <kbd>R</kbd></span></div>
			<div><span>Frame selection</span><span><kbd>F</kbd></span></div>
			<div><span>Delete selection</span><span><kbd>Del</kbd></span></div>
			<div><span>Undo / redo</span><span><kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Shift</kbd>+<kbd>Z</kbd></span></div>
			<div><span>Next VN line</span><span><kbd>Space</kbd></span></div>
			<div><span>Cancel / exit</span><span><kbd>Esc</kbd></span></div>
		</div>

		<h3>Recording &amp; mobile</h3>
		<p>Use a screen recorder while in Clean UI or POV. On a phone, build the APK with the included workflow:
		<code>npm run apk</code> or the GitHub Actions “Build Android APK” workflow. See <code>docs/BUILD_APK.md</code>.</p>
		<p>Projects autosave to this device. Use the ⋯ menu to save a <code>.json</code> file, load one back, or grab a PNG screenshot.</p>
		<div class="modal-close"><button class="btn primary" data-act="help-close">Got it</button></div>
	</div>`;
}

function closeMenu() {
	const pop = $('#menuPop');
	if (pop) pop.hidden = true;
}

function toggleFullscreen() {
	const el = document.documentElement;
	if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => {});
	else document.exitFullscreen?.().catch(() => {});
}

/* ---------------------------------------------------------------------------
   Global bindings
--------------------------------------------------------------------------- */
function bindGlobalUI() {
	document.addEventListener('click', (e) => {
		const target = e.target.closest('[data-act]');
		if (target) {
			handleAction(target.dataset.act, target);
			if (target.dataset.act !== 'menu-toggle') closeMenu();
			return;
		}
		if (e.target.id === 'modalRoot') {
			$('#modalRoot').hidden = true;
			$('#modalRoot').innerHTML = '';
		}
		closeMenu();
	});

	document.addEventListener('input', (e) => {
		if (!e.target.closest('#panel')) return;
		if (e.target.id === 'texScale') {
			const out = e.target.parentElement?.querySelector('output');
			if (out) out.textContent = `${e.target.value}×`;
			return;
		}
		handleInputEvent(e, false);
	});
	document.addEventListener('change', (e) => {
		if (!e.target.closest('#panel')) return;
		if (e.target.id === 'texImport') {
			importTextureFiles(e.target.files, e.target);
			return;
		}
		if (e.target.id === 'texScale') {
			const out = e.target.parentElement?.querySelector('output');
			if (out) out.textContent = `${e.target.value}×`;
			return;
		}
		if (e.target.id === 'texType') {
			const meta = TEXTURE_TYPES.find((t) => t.type === e.target.value);
			if (meta) {
				const a = $('#texA');
				const b = $('#texB');
				const name = $('#texName');
				if (a) a.value = meta.a;
				if (b) b.value = meta.b;
				if (name && !name.value) name.placeholder = meta.label;
			}
			return;
		}
		handleInputEvent(e, true);
	});

	$('#projectName')?.addEventListener('input', (e) => {
		app.project.name = e.target.value || 'Untitled Scene';
		markDirty();
	});
	$('#projectName')?.addEventListener('change', () => commit());

	$('#loadFile')?.addEventListener('change', (e) => {
		const file = e.target.files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			try {
				const data = JSON.parse(reader.result);
				app.project = normalizeProject(data);
				syncGamePrefs();
				app.selection = null;
				app.selectedKf = null;
				app.selectedTex = null;
				app.studio.setEnvironment(app.project.environment, app.project);
				app.studio.rebuildAll(app.project);
				if (app.project.view) app.studio.setView(app.project.view);
				else app.studio.frameAll();
				$('#projectName').value = app.project.name;
				resetHistory();
				markDirty();
				renderAll();
				toast('Project loaded');
			} catch (err) {
				console.error(err);
				toast('That file is not a valid project', 'err');
			}
		};
		reader.readAsText(file);
		e.target.value = '';
	});

	$('#vnOverlay')?.addEventListener('click', (e) => {
		if (e.target.closest('[data-act]')) return;
		advanceVN();
	});
	document.addEventListener('pointermove', () => {
		if (!app.playingVN) return;
		const overlay = $('#vnOverlay');
		if (!overlay) return;
		overlay.classList.add('ui-awake');
		clearTimeout(app.vn.chromeTimer);
		app.vn.chromeTimer = setTimeout(() => overlay.classList.remove('ui-awake'), 3600);
	});

	document.addEventListener('keydown', (e) => {
		if (app.game) return; // GameMode owns the keyboard while walking
		const tag = (e.target?.tagName || '').toLowerCase();
		const typing = ['input', 'textarea', 'select'].includes(tag) || e.target?.isContentEditable;
		const key = e.key.toLowerCase();

		if (key === 'escape') {
			if (!$('#modalRoot').hidden) {
				$('#modalRoot').hidden = true;
				$('#modalRoot').innerHTML = '';
				return;
			}
			if (!$('#menuPop').hidden) {
				closeMenu();
				return;
			}
			if (app.playingVN) {
				endVN();
				return;
			}
			if (app.cam.playing) {
				stopCamera(true);
				return;
			}
			if (app.clean) {
				setClean(false);
				return;
			}
			return;
		}
		if (typing) return;

		if ((e.ctrlKey || e.metaKey) && key === 'z') {
			e.preventDefault();
			if (e.shiftKey) redo();
			else undo();
			return;
		}
		if ((e.ctrlKey || e.metaKey) && key === 'y') {
			e.preventDefault();
			redo();
			return;
		}
		if ((e.ctrlKey || e.metaKey) && key === 's') {
			e.preventDefault();
			downloadFile(`${safeName(app.project.name)}.lowpoly.json`, JSON.stringify(app.project, null, 2), 'application/json');
			toast('Project downloaded');
			return;
		}
		if (e.ctrlKey || e.metaKey || e.altKey) return;

		if (key === 'h') setClean(!app.clean);
		else if (key === 'g') {
			if (app.game) exitGame();
			else startGame(app.selection && itemKind(app.project, app.selection) === 'char' ? app.selection : app.playActorId);
		} else if (key === 'p') {
			if (app.playingVN) endVN();
			else startVN(0);
		} else if (key === 'c') {
			if (app.cam.playing) stopCamera(true);
			else playCamera();
		} else if (key === 'w') setGizmo('translate');
		else if (key === 'e') setGizmo('rotate');
		else if (key === 'r') setGizmo('scale');
		else if (key === 'f') {
			if (app.selection) app.studio.frameObject(app.selection);
		} else if (key === ' ' || key === 'enter') {
			if (app.playingVN) {
				e.preventDefault();
				advanceVN();
			}
		} else if (key === 'delete' || key === 'backspace') {
			if (app.selection) {
				e.preventDefault();
				deleteItem(app.selection);
			}
		} else if (/^[1-9]$/.test(key)) {
			setTab(TABS[Number(key) - 1]?.[0]);
		}
	});

	/* ---------------------------- texture drops --------------------------- */
	const imageFileFrom = (dt) => {
		if (!dt) return null;
		for (const item of dt.items || []) {
			if (item.kind === 'file' && String(item.type).startsWith('image/')) return item.getAsFile();
		}
		for (const f of dt.files || []) if (String(f.type).startsWith('image/')) return f;
		return null;
	};
	document.addEventListener('dragover', (e) => {
		if (!app.project || !e.dataTransfer) return;
		const types = [...(e.dataTransfer.types || [])];
		if (!types.includes('Files')) return;
		e.preventDefault();
		document.body.classList.add('dragging');
	});
	document.addEventListener('dragleave', (e) => {
		if (!e.relatedTarget) document.body.classList.remove('dragging');
	});
	document.addEventListener('drop', (e) => {
		const file = imageFileFrom(e.dataTransfer);
		document.body.classList.remove('dragging');
		if (!file) return;
		e.preventDefault();
		if (app.game) exitGame();
		if (importTextureFile(file)) setTab('textures');
	});
	document.addEventListener('paste', (e) => {
		if (!app.project || app.game) return;
		const items = [...(e.clipboardData?.items || [])];
		const file = items.find((i) => String(i.type).startsWith('image/'))?.getAsFile();
		if (!file) return;
		e.preventDefault();
		if (importTextureFile(file)) setTab('textures');
	});

	/* ------------------------------- sun pad ------------------------------ */
	let sunPointer = null;
	let sunRect = null;
	const paintSun = (e) => {
		if (!sunRect) return;
		const env = app.project.environment;
		const cx = sunRect.left + sunRect.width / 2;
		const cy = sunRect.top + sunRect.height / 2;
		const dx = e.clientX - cx;
		const dy = e.clientY - cy;
		const max = Math.max(10, sunRect.width / 2 - 4);
		const dist = Math.min(max, Math.hypot(dx, dy));
		const elev = Math.round(clamp(90 - (dist / max) * 88, 2, 88));
		const az = Math.round((R2D(Math.atan2(dy, dx)) % 360 + 360) % 360);
		env.sunElevation = elev;
		env.sunAzimuth = az;
		env.time = null;
		app.studio.updateLighting(env);
		const rho = 46 - (elev / 90) * 40;
		const dot = $('#sunDot');
		if (dot) {
			dot.style.left = `${58 + Math.cos(D2R(az)) * rho}px`;
			dot.style.top = `${58 + Math.sin(D2R(az)) * rho}px`;
		}
		for (const [path, value, unit] of [
			['environment.sunElevation', elev, '°'],
			['environment.sunAzimuth', az, '°'],
		]) {
			const el = panel().querySelector(`[data-path="${path}"]`);
			if (el) {
				el.value = value;
				const out = el.parentElement?.querySelector('output');
				if (out) out.textContent = `${value}${unit}`;
			}
		}
	};
	document.addEventListener(
		'pointerdown',
		(e) => {
			const pad = e.target.closest?.('#sunPad');
			if (!pad) return;
			sunPointer = e.pointerId;
			sunRect = pad.getBoundingClientRect();
			pad.setPointerCapture?.(e.pointerId);
			paintSun(e);
		},
		true
	);
	document.addEventListener(
		'pointermove',
		(e) => {
			if (sunPointer === null || e.pointerId !== sunPointer) return;
			paintSun(e);
		},
		true
	);
	const endSun = (e) => {
		if (sunPointer === null || e.pointerId !== sunPointer) return;
		sunPointer = null;
		sunRect = null;
		commit();
		renderPanel();
	};
	document.addEventListener('pointerup', endSun, true);
	document.addEventListener('pointercancel', endSun, true);

	/* ---------------------------- on-screen pad --------------------------- */
	const stick = $('#gpStick');
	const sticker = $('#gpThumb');
	let stickId = null;
	let stickRect = null;
	const stickMove = (e) => {
		if (!stickRect) return;
		const x = clamp((e.clientX - (stickRect.left + stickRect.width / 2)) / (stickRect.width / 2), -1, 1);
		const y = clamp((e.clientY - (stickRect.top + stickRect.height / 2)) / (stickRect.height / 2), -1, 1);
		app.game?.setMove(x, y);
		if (sticker) sticker.style.transform = `translate(${x * 26}px, ${y * 26}px)`;
	};
	stick?.addEventListener('pointerdown', (e) => {
		if (!app.game) return;
		e.preventDefault();
		stickId = e.pointerId;
		stickRect = stick.getBoundingClientRect();
		stick.setPointerCapture?.(e.pointerId);
		stickMove(e);
	});
	const stickEnd = (e) => {
		if (stickId === null || e.pointerId !== stickId) return;
		stickId = null;
		stickRect = null;
		app.game?.setMove(0, 0);
		if (sticker) sticker.style.transform = '';
	};
	document.addEventListener('pointermove', (e) => {
		if (stickId !== null && e.pointerId === stickId) stickMove(e);
	});
	document.addEventListener('pointerup', stickEnd);
	document.addEventListener('pointercancel', stickEnd);

	const lookPad = $('#gpLook');
	const lookThumb = $('#gpLookThumb');
	let lookId = null;
	let lookLast = null;
	lookPad?.addEventListener('pointerdown', (e) => {
		if (!app.game) return;
		e.preventDefault();
		lookId = e.pointerId;
		lookLast = { x: e.clientX, y: e.clientY };
		lookPad.setPointerCapture?.(e.pointerId);
	});
	document.addEventListener('pointermove', (e) => {
		if (lookId === null || e.pointerId !== lookId || !lookLast) return;
		const dx = e.clientX - lookLast.x;
		const dy = e.clientY - lookLast.y;
		lookLast = { x: e.clientX, y: e.clientY };
		app.game?.look(dx, dy, 2.2);
		if (lookThumb) lookThumb.style.transform = `translate(${clamp(dx * 1.4, -20, 20)}px, ${clamp(dy * 1.4, -20, 20)}px)`;
	});
	const lookEnd = (e) => {
		if (lookId === null || e.pointerId !== lookId) return;
		lookId = null;
		lookLast = null;
		if (lookThumb) lookThumb.style.transform = '';
	};
	document.addEventListener('pointerup', lookEnd);
	document.addEventListener('pointercancel', lookEnd);

	// long press anywhere to restore the UI in clean mode
	let pressTimer = null;
	let pressStart = null;
	const cancelPress = () => {
		clearTimeout(pressTimer);
		pressTimer = null;
		pressStart = null;
	};
	document.addEventListener(
		'pointerdown',
		(e) => {
			if (!app.clean) return;
			pressStart = { x: e.clientX, y: e.clientY };
			clearTimeout(pressTimer);
			pressTimer = setTimeout(() => {
				if (pressStart) {
					pressStart = null;
					setClean(false);
				}
			}, 900);
		},
		true
	);
	document.addEventListener(
		'pointermove',
		(e) => {
			if (!pressStart) return;
			if (Math.hypot(e.clientX - pressStart.x, e.clientY - pressStart.y) > 10) cancelPress();
		},
		true
	);
	document.addEventListener('pointerup', cancelPress, true);
	document.addEventListener('pointercancel', cancelPress, true);

	window.addEventListener('resize', updateGuides);
	window.addEventListener('beforeunload', () => {
		if (app.project) {
			app.project.view = app.game?.saved?.view || app.studio?.view?.() || app.project.view;
			saveProject(app.project);
		}
	});
}

/* ---------------------------------------------------------------------------
   Fatal error reporting
--------------------------------------------------------------------------- */
window.addEventListener('error', (e) => {
	if (!app.project) return; // boot errors are handled by boot()'s try/catch
	const box = $('#errorBox');
	if (box && !box.hidden) return;
	showFatal(e.error || new Error(e.message || 'Unknown error'));
});
window.addEventListener('unhandledrejection', (e) => {
	if (!app.project) return;
	showFatal(e.reason instanceof Error ? e.reason : new Error(String(e.reason)));
});

/* ---------------------------------------------------------------------------
   Start
--------------------------------------------------------------------------- */
/* Exposed for the headless self-test (harmless in the browser). */
export const __internals = {
	app,
	boot,
	renderAll,
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
	normalizeProject,
	bindGlobalUI,
	startGame,
	exitGame,
	applyTimeOfDay,
	addCameraMove,
	importTextureFile,
	GameMode,
};

if (!(typeof window !== 'undefined' && window.__LPS_NO_AUTOBOOT)) {
	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
	else boot();
}
