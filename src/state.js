// Project state, defaults and persistence helpers.
export const STORAGE_KEY = 'lowpoly-studio/project-v1';
export const PROJECT_VERSION = 1;

export const SKIN_TONES = ['#f5d0b0', '#eab08a', '#d08a5e', '#a9683f', '#7a4a2b', '#5b3520', '#c9a97a', '#ffe0c2'];
export const HAIR_COLORS = ['#2b2118', '#4a3423', '#7a4a2b', '#b56a3a', '#d9b06a', '#e8e2d0', '#d94f70', '#4f7ad9', '#1c1f28'];
export const CLOTH_COLORS = ['#ef5b5b', '#f5a04b', '#f5d547', '#7ecb63', '#3fbfa9', '#4a90e2', '#7a6ff0', '#e06fc4', '#ffffff', '#1d2230'];

export const uid = (prefix = 'id') =>
	`${prefix}-${Math.random().toString(36).slice(2, 7)}${Date.now().toString(36).slice(-4)}`;

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;

export function deepClone(value) {
	return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

export function getPath(obj, path) {
	return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

export function setPath(obj, path, value) {
	const keys = path.split('.');
	let cur = obj;
	for (let i = 0; i < keys.length - 1; i++) {
		const key = keys[i];
		if (cur[key] == null || typeof cur[key] !== 'object') cur[key] = /^\d+$/.test(keys[i + 1]) ? [] : {};
		cur = cur[key];
	}
	cur[keys[keys.length - 1]] = value;
}

/* ------------------------------- characters ------------------------------- */
export function newCharacter(partial = {}) {
	return {
		id: uid('char'),
		name: 'New Actor',
		skin: SKIN_TONES[0],
		eyeColor: '#2b2118',
		hairColor: HAIR_COLORS[0],
		hairStyle: 'short',
		topColor: CLOTH_COLORS[5],
		bottomColor: '#2d3446',
		shoeColor: '#20242e',
		accentColor: '#f5a04b',
		topStyle: 'tee',
		accessory: 'none',
		height: 1,
		build: 1,
		headScale: 1,
		expression: 'happy',
		pose: 'idle',
		role: '#ffd36e',
		transform: { p: [0, 0, 0], r: [0, 0, 0], s: 1 },
		visible: true,
		locked: false,
		...partial,
	};
}

export function newProp(kind, partial = {}) {
	return {
		id: uid('prop'),
		kind,
		name: propLabel(kind),
		color: propDefaultColor(kind),
		rough: 0.85,
		metal: 0.02,
		emissive: kind === 'crystal' || kind === 'lamp' || kind === 'streetlamp' ? 0.35 : 0,
		flat: true,
		textureId: null,
		texScale: 1,
		transform: { p: [0, 0, 0], r: [0, 0, 0], s: 1 },
		visible: true,
		locked: false,
		...partial,
	};
}

const PROP_META = {
	pine: ['Pine Tree', '#2f7a52', '🌲'],
	tree: ['Round Tree', '#4f9e56', '🌳'],
	bush: ['Bush', '#4f9150', '🌿'],
	rock: ['Rock', '#8d9099', '🪨'],
	crate: ['Crate', '#b8813f', '📦'],
	barrel: ['Barrel', '#9a6438', '🛢️'],
	table: ['Table', '#a9773f', '🪑'],
	chair: ['Chair', '#c08b4e', '💺'],
	bench: ['Bench', '#b07a44', '🛋️'],
	lamp: ['Floor Lamp', '#ffd36e', '💡'],
	streetlamp: ['Street Lamp', '#ffce6b', '🏮'],
	building: ['Building', '#6d7fa8', '🏢'],
	cloud: ['Cloud', '#ffffff', '☁️'],
	crystal: ['Crystal', '#7ad8ff', '💎'],
	fence: ['Fence', '#c8a373', '🚧'],
	sign: ['Sign', '#e8e2d0', '🪧'],
	arch: ['Arch', '#d8c39b', '⛩️'],
	plant: ['Potted Plant', '#59a567', '🪴'],
	column: ['Column', '#ded6c4', '🏛️'],
	balloon: ['Balloon', '#ff6ea9', '🎈'],
};
export const PROP_CATALOG = Object.entries(PROP_META).map(([kind, [label, color, emoji]]) => ({ kind, label, color, emoji }));
export function propLabel(kind) {
	return PROP_META[kind]?.[0] || 'Prop';
}
export function propDefaultColor(kind) {
	return PROP_META[kind]?.[1] || '#b0b6c4';
}
export function propEmoji(kind) {
	return PROP_META[kind]?.[2] || '📦';
}

/* -------------------------------- textures -------------------------------- */
export const TEXTURE_TYPES = [
	{ type: 'checker', label: 'Checker', a: '#f4f6fb', b: '#2a3348' },
	{ type: 'stripes', label: 'Stripes', a: '#ffce6b', b: '#e2683c' },
	{ type: 'dots', label: 'Polka Dots', a: '#ff6ea9', b: '#ffe8f2' },
	{ type: 'wood', label: 'Wood Planks', a: '#a9773f', b: '#7d5527' },
	{ type: 'brick', label: 'Brick', a: '#b5583f', b: '#e0c7a8' },
	{ type: 'stone', label: 'Stone', a: '#8d9099', b: '#5f6470' },
	{ type: 'grass', label: 'Grass', a: '#4f9150', b: '#38703c' },
	{ type: 'sand', label: 'Sand', a: '#e8c48b', b: '#d9ae70' },
	{ type: 'gradient', label: 'Gradient', a: '#4a90e2', b: '#e06fc4' },
	{ type: 'grid', label: 'Grid', a: '#1d2230', b: '#4de0c0' },
	{ type: 'camo', label: 'Camo', a: '#5c6b3f', b: '#2f3a24' },
	{ type: 'tiles', label: 'Tiles', a: '#e6e9f0', b: '#b9c2d4' },
	{ type: 'halftone', label: 'Halftone', a: '#ffce6b', b: '#171b26' },
	{ type: 'water', label: 'Water', a: '#2f8fbf', b: '#1c6b98' },
	{ type: 'noise', label: 'Noise', a: '#c7a3ff', b: '#5a3f8f' },
	{ type: 'carpet', label: 'Carpet', a: '#8f5a6b', b: '#6b3f4d' },
];

export function newTexture(type = 'checker', partial = {}) {
	const meta = TEXTURE_TYPES.find((t) => t.type === type) || TEXTURE_TYPES[0];
	return {
		id: uid('tex'),
		name: meta.label,
		type: meta.type,
		a: meta.a,
		b: meta.b,
		scale: 2,
		dataUrl: null,
		...partial,
	};
}

/* --------------------------------- project -------------------------------- */
export function defaultProject() {
	const aria = newCharacter({
		id: 'char-aria',
		name: 'Aria',
		skin: '#f0c39c',
		hairStyle: 'long',
		hairColor: '#7a4a2b',
		topColor: '#ef5b5b',
		bottomColor: '#2d3446',
		shoeColor: '#2b2f3c',
		accessory: 'glasses',
		pose: 'wave',
		expression: 'happy',
		height: 1,
		role: '#ff9a9a',
		transform: { p: [-0.95, 0, 0.35], r: [0, 0.3, 0], s: 1 },
	});
	const kai = newCharacter({
		id: 'char-kai',
		name: 'Kai',
		skin: '#c98a5e',
		hairStyle: 'spiky',
		hairColor: '#1c1f28',
		topColor: '#4a90e2',
		bottomColor: '#3b4050',
		accessory: 'headphones',
		pose: 'idle',
		expression: 'neutral',
		height: 1.04,
		build: 1.08,
		role: '#7fc2ff',
		transform: { p: [1.05, 0, 0.1], r: [0, -0.35, 0], s: 1 },
	});

	return {
		version: PROJECT_VERSION,
		name: 'Beachside Chat',
		environment: {
			preset: 'beach',
			skyTop: '#ff9d6b',
			skyBottom: '#ffe0b5',
			groundColor: '#e8c48b',
			groundSize: 60,
			fog: 0.014,
			time: 'golden',
			sun: 1.65,
			sunColor: '#ffd9a8',
			sunAzimuth: 130,
			sunElevation: 24,
			ambient: 0.8,
			showGround: true,
			showGrid: false,
			particles: 'dust',
			water: true,
		},
		characters: [aria, kai],
		props: [
			{ ...newProp('tree', { name: 'Palm-ish Tree', color: '#4f9e56', transform: { p: [-4.2, 0, -2.6], r: [0, 0.6, 0], s: 1.5 } }) },
			{ ...newProp('rock', { name: 'Big Rock', color: '#9aa0a8', transform: { p: [3.4, 0, -1.2], r: [0, 0.8, 0], s: 1.2 } }) },
			{ ...newProp('rock', { name: 'Small Rock', color: '#8d9099', transform: { p: [-2.6, 0, 1.9], r: [0, 2.2, 0], s: 0.55 } }) },
			{ ...newProp('bush', { name: 'Bush', color: '#4f9150', transform: { p: [3.9, 0, 2.1], r: [0, 1.1, 0], s: 0.9 } }) },
			{ ...newProp('crystal', { name: 'Crystal', color: '#7ad8ff', transform: { p: [2.1, 0, 2.9], r: [0, 0.4, 0], s: 0.6 } }) },
		],
		textures: [newTexture('wood'), newTexture('stripes'), newTexture('dots'), newTexture('checker')],
		dialogue: {
			theme: 'sunset',
			lines: [
				{ id: uid('line'), speakerId: 'char-aria', text: 'The tide is finally calm today. Perfect for filming.', expression: 'happy', shot: 'medium' },
				{ id: uid('line'), speakerId: 'char-kai', text: 'You brought the camera? I thought we agreed on a day off.', expression: 'surprised', shot: 'medium' },
				{ id: uid('line'), speakerId: 'char-aria', text: 'A day off *and* a little low-poly short film. Best of both.', expression: 'happy', shot: 'close' },
				{ id: uid('line'), speakerId: 'narrator', text: 'The sun dipped lower, painting the whole coast in amber.', expression: 'neutral', shot: 'wide' },
				{ id: uid('line'), speakerId: 'char-kai', text: '...Fine. But I get final cut this time.', expression: 'angry', shot: 'medium' },
				{ id: uid('line'), speakerId: 'char-aria', text: 'Deal. Now hit your mark, superstar.', expression: 'happy', shot: 'auto' },
			],
		},
		camera: {
			duration: 12,
			loop: true,
			hideUIPlay: true,
			aspect: 'free',
			guides: false,
			keyframes: [
				{ id: uid('kf'), t: 0, p: [4.6, 2.5, 6.4], r: [-10, 33, 0], fov: 45, ease: 'easeInOut' },
				{ id: uid('kf'), t: 4, p: [1.9, 1.75, 3.4], r: [-4, 26, 0], fov: 38, ease: 'easeInOut' },
				{ id: uid('kf'), t: 8, p: [-1.1, 1.62, 2.3], r: [-2, -22, 0], fov: 34, ease: 'easeInOut' },
				{ id: uid('kf'), t: 12, p: [3.2, 2.2, 5.2], r: [-8, 30, 0], fov: 40, ease: 'easeInOut' },
			],
		},
		view: { p: [3.6, 2.0, 5.2], target: [0, 1.05, 0], fov: 45 },
		game: { actorId: null, thirdPerson: false, pad: true },
	};
}

export function blankProject() {
	const p = defaultProject();
	p.name = 'Untitled Scene';
	p.characters = [];
	p.props = [];
	p.dialogue.lines = [];
	p.textures = [newTexture('checker'), newTexture('wood'), newTexture('stripes')];
	p.camera = { ...p.camera, duration: 10, keyframes: [] };
	p.environment = {
		...p.environment,
		preset: 'studio',
		skyTop: '#aab6c9',
		skyBottom: '#e6ebf2',
		groundColor: '#8e96a5',
		fog: 0,
		time: 'noon',
		sun: 1.35,
		sunColor: '#ffffff',
		sunAzimuth: 120,
		sunElevation: 46,
		ambient: 1.05,
		particles: 'none',
		water: false,
		showGround: true,
		showGrid: true,
	};
	p.view = { p: [3.4, 2.0, 5.2], target: [0, 1.05, 0], fov: 45 };
	return p;
}

/* ------------------------------- validation ------------------------------- */
function mergeMissing(target, defaults) {
	if (Array.isArray(defaults)) return target;
	if (typeof defaults !== 'object' || defaults === null) return target;
	if (typeof target !== 'object' || target === null) return deepClone(defaults);
	for (const [key, value] of Object.entries(defaults)) {
		if (!(key in target)) target[key] = deepClone(value);
		else if (typeof value === 'object' && value !== null && !Array.isArray(value)) mergeMissing(target[key], value);
	}
	return target;
}

export function normalizeProject(raw) {
	const base = defaultProject();
	if (!raw || typeof raw !== 'object') return base;
	const p = mergeMissing(deepClone(raw), base);
	p.version = PROJECT_VERSION;
	p.characters = (p.characters || []).map((c) => mergeMissing(c, newCharacter()));
	p.props = (p.props || []).map((o) => mergeMissing(o, newProp(o.kind || 'crate')));
	p.textures = (p.textures || []).map((t) => mergeMissing(t, newTexture(t.type || 'checker')));
	p.dialogue = mergeMissing(p.dialogue || {}, base.dialogue);
	p.dialogue.lines = (p.dialogue.lines || []).map((l) => ({
		id: l.id || uid('line'),
		speakerId: l.speakerId || 'narrator',
		text: l.text ?? '',
		expression: l.expression || 'neutral',
		shot: l.shot || 'auto',
	}));
	p.camera = mergeMissing(p.camera || {}, base.camera);
	p.camera.keyframes = (p.camera.keyframes || [])
		.map((k) => ({
			id: k.id || uid('kf'),
			t: Number(k.t) || 0,
			p: Array.isArray(k.p) ? k.p.map(Number) : [0, 1.5, 4],
			r: Array.isArray(k.r) ? k.r.map(Number) : [0, 0, 0],
			fov: Number(k.fov) || 45,
			ease: k.ease || 'easeInOut',
		}))
		.sort((a, b) => a.t - b.t);
	return p;
}

/* ------------------------------- persistence ------------------------------ */
export function loadProject() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		return normalizeProject(JSON.parse(raw));
	} catch (err) {
		console.warn('Could not load saved project', err);
		return null;
	}
}

export function saveProject(project) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
		return true;
	} catch (err) {
		console.warn('Could not autosave project', err);
		return false;
	}
}

export function clearProject() {
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch (err) {
		/* ignore */
	}
}

export const EASINGS = {
	linear: { label: 'Linear', fn: (t) => t },
	easeIn: { label: 'Ease in', fn: (t) => t * t },
	easeOut: { label: 'Ease out', fn: (t) => 1 - (1 - t) * (1 - t) },
	easeInOut: { label: 'Ease in-out', fn: (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)) },
	step: { label: 'Hold', fn: () => 0 },
};

export function findItem(project, id) {
	return project.characters.find((c) => c.id === id) || project.props.find((p) => p.id === id) || null;
}

export function itemKind(project, id) {
	if (project.characters.some((c) => c.id === id)) return 'char';
	if (project.props.some((p) => p.id === id)) return 'prop';
	return null;
}

export function characterById(project, id) {
	return project.characters.find((c) => c.id === id) || null;
}
