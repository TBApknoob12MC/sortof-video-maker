// Low-poly mesh builders: characters, props and procedural textures.
import * as THREE from 'three';

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const BOX = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const CYL = (rt, rb, h, seg = 6) => new THREE.CylinderGeometry(rt, rb, h, seg);
const CONE = (r, h, seg = 7) => new THREE.ConeGeometry(r, h, seg);
const ICO = (r, detail = 0) => new THREE.IcosahedronGeometry(r, detail);
const SPH = (r, w = 8, h = 6) => new THREE.SphereGeometry(r, w, h);

export function makeMaterial(color, opts = {}) {
	const emissive = opts.emissiveColor ?? opts.emissive ?? 0x000000;
	const mat = new THREE.MeshStandardMaterial({
		color: new THREE.Color(color),
		flatShading: opts.flat !== false,
		roughness: opts.rough ?? 0.85,
		metalness: opts.metal ?? 0.02,
		map: opts.map ?? null,
		emissive: new THREE.Color(emissive),
		emissiveIntensity: opts.emissiveIntensity ?? 1,
		transparent: opts.transparent ?? false,
		opacity: opts.opacity ?? 1,
		side: opts.side ?? THREE.FrontSide,
	});
	return mat;
}

function addMesh(parent, geo, mat, x = 0, y = 0, z = 0, rot = null) {
	const mesh = new THREE.Mesh(geo, mat);
	mesh.position.set(x, y, z);
	if (rot) mesh.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	parent.add(mesh);
	return mesh;
}

/* ============================== TEXTURES ================================= */
const textureCache = new Map();
const loader = new THREE.TextureLoader();

function mulberry32(a) {
	return function () {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function shade(hex, amount) {
	const c = new THREE.Color(hex);
	c.offsetHSL(0, 0, amount);
	return `#${c.getHexString()}`;
}

export function drawTextureCanvas(def, size = 256) {
	const cv = document.createElement('canvas');
	cv.width = cv.height = size;
	const ctx = cv.getContext('2d');
	const a = def.a || '#ffffff';
	const b = def.b || '#222222';
	const rnd = mulberry32([...`${def.type}${def.a}${def.b}`].reduce((acc, ch) => acc + ch.charCodeAt(0), 7));
	ctx.fillStyle = a;
	ctx.fillRect(0, 0, size, size);

	switch (def.type) {
		case 'checker': {
			const n = 8;
			const s = size / n;
			for (let y = 0; y < n; y++)
				for (let x = 0; x < n; x++) {
					if ((x + y) % 2 === 0) continue;
					ctx.fillStyle = b;
					ctx.fillRect(x * s, y * s, s, s);
				}
			break;
		}
		case 'stripes': {
			const n = 8;
			for (let i = 0; i < n; i += 2) {
				ctx.fillStyle = b;
				ctx.fillRect((i * size) / n, 0, size / n, size);
			}
			break;
		}
		case 'dots': {
			ctx.fillStyle = b;
			const step = size / 6;
			for (let y = 0; y < 6; y++)
				for (let x = 0; x < 6; x++) {
					ctx.beginPath();
					ctx.arc(x * step + step / 2 + (y % 2 ? step / 2 : 0), y * step + step / 2, step * 0.22, 0, Math.PI * 2);
					ctx.fill();
				}
			break;
		}
		case 'wood': {
			ctx.fillStyle = a;
			ctx.fillRect(0, 0, size, size);
			const planks = 4;
			for (let i = 0; i < planks; i++) {
				ctx.fillStyle = i % 2 ? shade(a, 0.02) : shade(b, -0.02);
				ctx.globalAlpha = i % 2 ? 0.9 : 0.55;
				ctx.fillRect(0, (i * size) / planks, size, size / planks - 2);
			}
			ctx.globalAlpha = 1;
			ctx.strokeStyle = shade(a, -0.18);
			ctx.lineWidth = 2;
			for (let i = 0; i < 26; i++) {
				ctx.beginPath();
				const y = rnd() * size;
				ctx.moveTo(0, y);
				for (let x = 0; x < size; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.05 + i) * 3);
				ctx.stroke();
			}
			break;
		}
		case 'brick': {
			ctx.fillStyle = b;
			ctx.fillRect(0, 0, size, size);
			const rows = 8;
			const h = size / rows;
			for (let r = 0; r < rows; r++) {
				const offset = r % 2 ? h : 0;
				for (let x = -h; x < size; x += h * 2) {
					ctx.fillStyle = rnd() > 0.25 ? a : shade(a, 0.06);
					ctx.fillRect(x + offset + 2, r * h + 2, h * 2 - 4, h - 4);
				}
			}
			break;
		}
		case 'stone': {
			ctx.fillStyle = a;
			ctx.fillRect(0, 0, size, size);
			ctx.fillStyle = b;
			for (let i = 0; i < 240; i++) {
				const r = 2 + rnd() * 8;
				ctx.globalAlpha = 0.15 + rnd() * 0.5;
				ctx.beginPath();
				ctx.arc(rnd() * size, rnd() * size, r, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.globalAlpha = 1;
			break;
		}
		case 'grass': {
			ctx.fillStyle = a;
			ctx.fillRect(0, 0, size, size);
			for (let i = 0; i < 900; i++) {
				ctx.strokeStyle = rnd() > 0.5 ? b : shade(a, 0.1);
				ctx.globalAlpha = 0.6;
				const x = rnd() * size;
				const y = rnd() * size;
				ctx.beginPath();
				ctx.moveTo(x, y);
				ctx.lineTo(x + (rnd() - 0.5) * 5, y - 4 - rnd() * 8);
				ctx.stroke();
			}
			ctx.globalAlpha = 1;
			break;
		}
		case 'sand': {
			ctx.fillStyle = a;
			ctx.fillRect(0, 0, size, size);
			for (let i = 0; i < 1800; i++) {
				ctx.fillStyle = rnd() > 0.5 ? b : shade(a, 0.08);
				ctx.globalAlpha = 0.35;
				ctx.fillRect(rnd() * size, rnd() * size, 2, 2);
			}
			ctx.globalAlpha = 1;
			break;
		}
		case 'gradient': {
			const g = ctx.createLinearGradient(0, 0, size, size);
			g.addColorStop(0, a);
			g.addColorStop(1, b);
			ctx.fillStyle = g;
			ctx.fillRect(0, 0, size, size);
			break;
		}
		case 'grid': {
			ctx.fillStyle = a;
			ctx.fillRect(0, 0, size, size);
			ctx.strokeStyle = b;
			ctx.lineWidth = 3;
			const step = size / 8;
			for (let i = 0; i <= 8; i++) {
				ctx.beginPath();
				ctx.moveTo(i * step, 0);
				ctx.lineTo(i * step, size);
				ctx.moveTo(0, i * step);
				ctx.lineTo(size, i * step);
				ctx.stroke();
			}
			break;
		}
		case 'camo': {
			for (let i = 0; i < 40; i++) {
				ctx.fillStyle = i % 3 === 0 ? shade(a, 0.15) : i % 3 === 1 ? a : b;
				ctx.beginPath();
				const x = rnd() * size;
				const y = rnd() * size;
				const r = 12 + rnd() * 30;
				for (let k = 0; k < 7; k++) {
					const ang = (k / 7) * Math.PI * 2;
					const rr = r * (0.6 + rnd() * 0.6);
					ctx.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
				}
				ctx.closePath();
				ctx.fill();
			}
			break;
		}
		case 'tiles': {
			ctx.fillStyle = b;
			ctx.fillRect(0, 0, size, size);
			const n = 4;
			const s = size / n;
			for (let y = 0; y < n; y++)
				for (let x = 0; x < n; x++) {
					ctx.fillStyle = shade(a, (rnd() - 0.5) * 0.07);
					ctx.fillRect(x * s + 3, y * s + 3, s - 6, s - 6);
				}
			break;
		}
		case 'halftone': {
			ctx.fillStyle = b;
			ctx.fillRect(0, 0, size, size);
			ctx.fillStyle = a;
			const step = size / 14;
			for (let y = 0; y < 14; y++)
				for (let x = 0; x < 14; x++) {
					const r = (Math.sin(((x + y) / 14) * Math.PI) * 0.5 + 0.5) * step * 0.55;
					ctx.beginPath();
					ctx.arc(x * step + step / 2, y * step + step / 2, Math.max(1, r), 0, Math.PI * 2);
					ctx.fill();
				}
			break;
		}
		case 'water': {
			const g = ctx.createLinearGradient(0, 0, 0, size);
			g.addColorStop(0, a);
			g.addColorStop(1, b);
			ctx.fillStyle = g;
			ctx.fillRect(0, 0, size, size);
			ctx.strokeStyle = shade(a, 0.25);
			ctx.globalAlpha = 0.45;
			ctx.lineWidth = 3;
			for (let i = 0; i < 12; i++) {
				ctx.beginPath();
				const y = (i / 12) * size;
				ctx.moveTo(0, y);
				for (let x = 0; x <= size; x += 10) ctx.lineTo(x, y + Math.sin(x * 0.07 + i) * 5);
				ctx.stroke();
			}
			ctx.globalAlpha = 1;
			break;
		}
		case 'noise': {
			const img = ctx.createImageData(size, size);
			for (let i = 0; i < img.data.length; i += 4) {
				const t = rnd();
				const ca = new THREE.Color(a);
				const cb = new THREE.Color(b);
				img.data[i] = (ca.r + (cb.r - ca.r) * t) * 255;
				img.data[i + 1] = (ca.g + (cb.g - ca.g) * t) * 255;
				img.data[i + 2] = (ca.b + (cb.b - ca.b) * t) * 255;
				img.data[i + 3] = 255;
			}
			ctx.putImageData(img, 0, 0);
			break;
		}
		case 'carpet': {
			ctx.fillStyle = a;
			ctx.fillRect(0, 0, size, size);
			for (let i = 0; i < 2600; i++) {
				ctx.strokeStyle = rnd() > 0.5 ? b : shade(a, 0.08);
				ctx.globalAlpha = 0.35;
				const x = rnd() * size;
				const y = rnd() * size;
				ctx.beginPath();
				ctx.moveTo(x, y);
				ctx.lineTo(x + (rnd() - 0.5) * 3, y + 3);
				ctx.stroke();
			}
			ctx.globalAlpha = 1;
			break;
		}
		default: {
			ctx.fillStyle = a;
			ctx.fillRect(0, 0, size, size);
		}
	}
	// subtle paper grain so flat surfaces read better
	return cv;
}

export function textureThumb(def, size = 96) {
	if (def?.dataUrl) return def.dataUrl;
	return drawTextureCanvas(def, size).toDataURL('image/png');
}

function baseTextureFor(def) {
	const key = `${def.id}|${def.type}|${def.a}|${def.b}`;
	if (textureCache.has(key)) return textureCache.get(key);
	let tex;
	if (def.dataUrl) {
		tex = loader.load(def.dataUrl);
		tex.colorSpace = THREE.SRGBColorSpace;
	} else {
		tex = new THREE.CanvasTexture(drawTextureCanvas(def, 256));
		tex.colorSpace = THREE.SRGBColorSpace;
	}
	tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
	tex.anisotropy = 4;
	textureCache.set(key, tex);
	return tex;
}

export function clearTextureCache() {
	textureCache.forEach((t) => t.dispose());
	textureCache.clear();
}

export function textureForProp(def, repeat = 1) {
	if (!def) return null;
	const base = baseTextureFor(def);
	const tex = base.clone();
	tex.needsUpdate = true;
	tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
	tex.repeat.set(Math.max(0.05, repeat), Math.max(0.05, repeat));
	tex.colorSpace = THREE.SRGBColorSpace;
	return tex;
}

/* ============================= CHARACTERS ================================ */
const CHAR_HEIGHT = 1.79;

export function characterHeight(params) {
	return CHAR_HEIGHT * (params.height || 1) * (params.transform?.s || 1);
}

function buildFace(skull, params) {
	const face = new THREE.Group();
	face.name = 'face';
	const expr = params.expression || 'neutral';
	const skinMat = makeMaterial(params.skin || '#f0c39c', { rough: 0.72 });
	const darkMat = makeMaterial('#262734', { rough: 0.5 });
	const eyeMat = makeMaterial(params.eyeColor || '#2b2118', { rough: 0.42 });
	const eyeWhite = makeMaterial('#ffffff', { rough: 0.35 });
	const accent = makeMaterial(params.accentColor || '#f5a04b', { rough: 0.5 });
	const eyeY = 0.02;
	const eyeX = 0.069;
	const eyeScaleY = expr === 'angry' ? 0.55 : expr === 'happy' ? 0.8 : expr === 'surprised' ? 1.25 : 1;
	const whiteR = expr === 'surprised' ? 0.043 : 0.036;

	for (const side of [-1, 1]) {
		const eye = addMesh(face, SPH(whiteR, 6, 5), eyeWhite, side * eyeX, eyeY, 0.157);
		eye.scale.set(1, eyeScaleY, 0.55);
		const pupil = addMesh(face, SPH(whiteR * 0.52, 6, 5), eyeMat, side * eyeX, eyeY - 0.002, 0.171);
		pupil.scale.set(1, eyeScaleY, 0.4);
	}
	// brows
	const browTilt = expr === 'angry' ? 0.35 : expr === 'sad' ? -0.32 : expr === 'surprised' ? 0.08 : 0.14;
	const browY = expr === 'surprised' ? 0.108 : expr === 'happy' ? 0.095 : 0.088;
	for (const side of [-1, 1]) {
		addMesh(face, BOX(0.062, 0.012, 0.014), darkMat, side * eyeX, browY, 0.166, [0, 0, -side * browTilt]);
	}
	// mouth
	const mouthMat = makeMaterial('#7b3540', { rough: 0.6 });
	if (expr === 'happy') {
		const m = addMesh(face, new THREE.TorusGeometry(0.043, 0.011, 4, 10, Math.PI), mouthMat, 0, -0.045, 0.17);
		m.rotation.z = Math.PI;
		// blush
		for (const side of [-1, 1]) {
			const blush = addMesh(face, SPH(0.022, 6, 4), accent, side * 0.108, -0.035, 0.146);
			blush.scale.set(1, 0.6, 0.3);
		}
	} else if (expr === 'sad') {
		const m = addMesh(face, new THREE.TorusGeometry(0.04, 0.01, 4, 10, Math.PI), mouthMat, 0, -0.085, 0.17);
		m.rotation.z = 0;
	} else if (expr === 'angry') {
		addMesh(face, BOX(0.07, 0.013, 0.012), mouthMat, 0, -0.06, 0.17, [0, 0, 0.18]);
	} else if (expr === 'surprised') {
		addMesh(face, new THREE.TorusGeometry(0.024, 0.01, 4, 9), mouthMat, 0, -0.06, 0.172);
	} else {
		addMesh(face, BOX(0.055, 0.012, 0.012), mouthMat, 0, -0.058, 0.17);
	}
	// nose
	addMesh(face, CONE(0.018, 0.034, 4), skinMat, 0, -0.015, 0.185, [Math.PI / 2, 0, 0]);
	return face;
}

function buildHair(skull, params) {
	const group = new THREE.Group();
	group.name = 'hair';
	const mat = makeMaterial(params.hairColor || '#2b2118', { rough: 0.75 });
	const style = params.hairStyle || 'short';
	const cap = () => addMesh(group, BOX(0.36, 0.14, 0.35), mat, 0, 0.16, -0.01);
	const fringe = (w = 0.35, h = 0.12, d = 0.06, y = 0.075, z = 0.155) => addMesh(group, BOX(w, h, d), mat, 0, y, z);
	cap();
	fringe();
	switch (style) {
		case 'bob': {
			for (const side of [-1, 1]) addMesh(group, BOX(0.06, 0.26, 0.31), mat, side * 0.16, -0.03, -0.01);
			addMesh(group, BOX(0.29, 0.22, 0.08), mat, 0, -0.02, -0.165);
			break;
		}
		case 'long': {
			addMesh(group, BOX(0.31, 0.56, 0.1), mat, 0, -0.18, -0.155);
			for (const side of [-1, 1]) addMesh(group, BOX(0.06, 0.4, 0.24), mat, side * 0.16, -0.1, -0.04);
			fringe(0.35, 0.14, 0.06, 0.065, 0.152);
			break;
		}
		case 'spiky': {
			const spots = [
				[-0.09, 0.19, 0, 0.25, 0.4],
				[0.09, 0.19, 0, 0.25, -0.4],
				[0, 0.2, 0.07, -0.3, 0],
				[0, 0.2, -0.08, 0.35, 0],
				[-0.15, 0.16, -0.06, 0.2, 0.85],
				[0.15, 0.16, -0.06, 0.2, -0.85],
			];
			for (const [x, y, z, rx, rz] of spots) addMesh(group, CONE(0.06, 0.16, 5), mat, x, y, z, [rx, 0, rz]);
			break;
		}
		case 'bun': {
			addMesh(group, SPH(0.095, 7, 6), mat, 0, 0.2, -0.12);
			break;
		}
		case 'ponytail': {
			addMesh(group, SPH(0.07, 6, 5), mat, 0, 0.16, -0.17);
			const tail = addMesh(group, CYL(0.055, 0.02, 0.36, 5), mat, 0, -0.02, -0.2);
			tail.rotation.x = -0.25;
			break;
		}
		case 'mohawk': {
			for (let i = 0; i < 5; i++) addMesh(group, CONE(0.055, 0.16, 4), mat, 0, 0.19 - i * 0.01, 0.13 - i * 0.07);
			break;
		}
		case 'wavy': {
			for (const side of [-1, 1]) {
				addMesh(group, BOX(0.07, 0.3, 0.3), mat, side * 0.163, -0.05, -0.02);
				for (let i = 0; i < 3; i++) {
					const wave = addMesh(group, BOX(0.075, 0.09, 0.29), mat, side * (0.165 + i * 0.012), -0.16 - i * 0.07, -0.02);
					wave.rotation.z = side * 0.14;
				}
			}
			addMesh(group, BOX(0.3, 0.16, 0.09), mat, 0, 0.03, -0.17);
			fringe(0.37, 0.15, 0.07, 0.06, 0.15);
			break;
		}
		case 'afro': {
			addMesh(group, SPH(0.25, 8, 6), mat, 0, 0.11, -0.01).scale.set(1.02, 0.92, 1.02);
			for (const [x, y, z, r] of [
				[-0.19, 0.16, 0.06, 0.13],
				[0.19, 0.16, 0.06, 0.13],
				[0, 0.29, -0.02, 0.14],
				[-0.12, 0.22, -0.15, 0.12],
				[0.12, 0.22, -0.15, 0.12],
				[0, 0.16, 0.17, 0.12],
			])
				addMesh(group, SPH(r, 6, 5), mat, x, y, z);
			break;
		}
		case 'braids': {
			for (const side of [-1, 1]) {
				addMesh(group, BOX(0.06, 0.26, 0.24), mat, side * 0.165, -0.08, -0.02);
				for (let i = 0; i < 4; i++) {
					const knot = addMesh(group, SPH(0.052 - i * 0.004, 5, 4), mat, side * (0.17 + i * 0.006), -0.23 - i * 0.11, -0.05);
					knot.scale.set(1, 1.25, 1);
				}
			}
			addMesh(group, BOX(0.26, 0.18, 0.08), mat, 0, -0.02, -0.17);
			break;
		}
		case 'bald':
			break;
		default: {
			// short
			for (const side of [-1, 1]) addMesh(group, BOX(0.05, 0.16, 0.2), mat, side * 0.158, 0.02, -0.03);
		}
	}
	return group;
}

function buildAccessory(skull, params) {
	const group = new THREE.Group();
	group.name = 'accessory';
	const accent = makeMaterial(params.accentColor || '#f5a04b', { rough: 0.5, metal: 0.15 });
	const dark = makeMaterial('#23252e', { rough: 0.6 });
	const gold = makeMaterial('#ffce5c', { rough: 0.35, metal: 0.6 });
	switch (params.accessory) {
		case 'hat': {
			addMesh(group, CYL(0.29, 0.29, 0.022, 12), accent, 0, 0.155, 0);
			addMesh(group, CYL(0.14, 0.16, 0.16, 10), accent, 0, 0.235, 0);
			addMesh(group, CYL(0.165, 0.165, 0.035, 10), dark, 0, 0.175, 0);
			break;
		}
		case 'cap': {
			addMesh(group, SPH(0.205, 9, 5), accent, 0, 0.09, -0.005).scale.set(1.02, 0.85, 1.02);
			addMesh(group, BOX(0.2, 0.025, 0.17), accent, 0, 0.125, 0.16);
			break;
		}
		case 'glasses': {
			for (const side of [-1, 1]) {
				const ring = addMesh(group, new THREE.TorusGeometry(0.058, 0.009, 4, 9), dark, side * 0.069, 0.018, 0.168);
				ring.scale.set(1, 0.9, 1);
			}
			addMesh(group, BOX(0.03, 0.01, 0.012), dark, 0, 0.022, 0.172);
			break;
		}
		case 'crown': {
			addMesh(group, CYL(0.14, 0.14, 0.09, 8), gold, 0, 0.175, 0);
			for (let i = 0; i < 6; i++) {
				const a = (i / 6) * Math.PI * 2;
				addMesh(group, CONE(0.035, 0.09, 4), gold, Math.cos(a) * 0.13, 0.25, Math.sin(a) * 0.13);
			}
			break;
		}
		case 'headphones': {
			const band = addMesh(group, new THREE.TorusGeometry(0.2, 0.022, 4, 12, Math.PI), dark, 0, 0.02, 0);
			band.rotation.z = 0;
			for (const side of [-1, 1]) addMesh(group, CYL(0.07, 0.07, 0.07, 8), accent, side * 0.195, 0.01, 0, [Math.PI / 2, 0, Math.PI / 2]);
			break;
		}
		case 'beanie': {
			addMesh(group, SPH(0.21, 8, 5), accent, 0, 0.1, 0).scale.set(1, 0.9, 1);
			addMesh(group, CYL(0.215, 0.215, 0.06, 10), dark, 0, 0.12, 0);
			break;
		}
		case 'catEars': {
			for (const side of [-1, 1]) {
				const ear = addMesh(group, CONE(0.062, 0.14, 4), accent, side * 0.115, 0.24, -0.01, [0, 0, -side * 0.18]);
				ear.scale.set(1, 1, 0.55);
				addMesh(group, CONE(0.028, 0.07, 4), makeMaterial('#ffb7c8', { rough: 0.7 }), side * 0.115, 0.255, 0.02, [0, 0, -side * 0.18]).scale.set(1, 1, 0.4);
			}
			break;
		}
		case 'scarf': {
			const band = addMesh(group, new THREE.TorusGeometry(0.115, 0.038, 5, 10), accent, 0, -0.29, 0);
			band.rotation.x = Math.PI / 2;
			const tail = addMesh(group, BOX(0.12, 0.26, 0.05), accent, 0.07, -0.42, 0.09);
			tail.rotation.z = 0.12;
			break;
		}
		default:
			break;
	}
	return group;
}

export function applyPose(root, pose) {
	const rig = root.userData.rig;
	if (!rig) return;
	const { body, armL, armR, foreL, foreR, legL, legR, shinL, shinR, head } = rig;
	// reset
	body.position.y = 0;
	body.rotation.set(0, 0, 0);
	armL.rotation.set(0, 0, 0);
	armR.rotation.set(0, 0, 0);
	foreL.rotation.set(0, 0, 0);
	foreR.rotation.set(0, 0, 0);
	legL.rotation.set(0, 0, 0);
	legR.rotation.set(0, 0, 0);
	shinL.rotation.set(0, 0, 0);
	shinR.rotation.set(0, 0, 0);
	head.rotation.set(0, 0, 0);

	switch (pose) {
		case 'wave':
			armR.rotation.set(-0.2, 0, 2.15);
			foreR.rotation.set(-0.35, 0, 0.45);
			armL.rotation.set(0.12, 0, -0.14);
			head.rotation.z = 0.08;
			break;
		case 'point':
			armR.rotation.set(-1.45, 0, 0.4);
			foreR.rotation.set(-0.1, 0, 0);
			armL.rotation.set(0, 0, -0.1);
			break;
		case 'crossed':
			armL.rotation.set(-1.25, 0, -0.65);
			armR.rotation.set(-1.25, 0, 0.65);
			foreL.rotation.set(-1.25, 0, 0.5);
			foreR.rotation.set(-1.25, 0, -0.5);
			break;
		case 'hips':
			armL.rotation.set(0.1, 0, -1.0);
			armR.rotation.set(0.1, 0, 1.0);
			foreL.rotation.set(-0.25, 0, 1.4);
			foreR.rotation.set(-0.25, 0, -1.4);
			break;
		case 'sit':
			body.position.y = -0.42;
			legL.rotation.x = -1.55;
			legR.rotation.x = -1.5;
			shinL.rotation.x = 1.5;
			shinR.rotation.x = 1.45;
			armL.rotation.set(-0.4, 0, -0.18);
			armR.rotation.set(-0.4, 0, 0.18);
			foreL.rotation.x = -0.4;
			foreR.rotation.x = -0.4;
			break;
		case 'run':
			legL.rotation.x = -0.75;
			legR.rotation.x = 0.65;
			shinL.rotation.x = 0.9;
			shinR.rotation.x = 0.35;
			armL.rotation.set(0.9, 0, -0.15);
			armR.rotation.set(-0.9, 0, 0.15);
			foreL.rotation.x = -1.4;
			foreR.rotation.x = -1.4;
			body.rotation.x = 0.12;
			break;
		case 'talk':
			armR.rotation.set(-0.85, 0, 0.5);
			foreR.rotation.set(-1.1, 0, 0);
			armL.rotation.set(0.05, 0, -0.18);
			head.rotation.x = -0.06;
			break;
		default:
			armL.rotation.set(0.04, 0, -0.1);
			armR.rotation.set(-0.04, 0, 0.1);
			foreL.rotation.x = -0.12;
			foreR.rotation.x = -0.12;
	}
}

export function rebuildFace(root, params) {
	const rig = root.userData.rig;
	if (!rig) return;
	const skull = rig.skull;
	const old = skull.getObjectByName('face');
	if (old) {
		disposeObject(old);
		skull.remove(old);
	}
	const face = buildFace(skull, params);
	skull.add(face);
}

export function buildCharacter(params) {
	const root = new THREE.Group();
	root.name = params.name || 'Actor';
	const build = params.build || 1;
	const headScale = params.headScale || 1;
	const skinMat = makeMaterial(params.skin, { rough: 0.72 });
	const hairMat = makeMaterial(params.hairColor, { rough: 0.75 });
	const topMat = makeMaterial(params.topColor, { rough: 0.85 });
	const bottomMat = makeMaterial(params.bottomColor, { rough: 0.85 });
	const shoeMat = makeMaterial(params.shoeColor, { rough: 0.6 });
	const accentMat = makeMaterial(params.accentColor, { rough: 0.6 });

	const body = new THREE.Group();
	root.add(body);

	// hips + torso
	addMesh(body, BOX(0.34 * build, 0.18, 0.24 * build), bottomMat, 0, 0.9, 0);
	const torso = addMesh(body, BOX(0.42 * build, 0.5, 0.25 * build), topMat, 0, 1.16, 0);
	torso.scale.set(1, 1, 1);
	if (params.topStyle === 'dress') {
		addMesh(body, new THREE.CylinderGeometry(0.22 * build, 0.38 * build, 0.36, 7, 1, true), topMat, 0, 0.76, 0);
	}
	if (params.topStyle === 'hoodie') {
		addMesh(body, BOX(0.3 * build, 0.09, 0.1 * build), topMat, 0, 1.39, -0.12);
		addMesh(body, BOX(0.16 * build, 0.16, 0.16 * build), topMat, 0, 1.42, 0.02);
	}
	if (params.topStyle === 'jacket') {
		addMesh(body, BOX(0.44 * build, 0.34, 0.27 * build), accentMat, 0, 1.14, 0);
		addMesh(body, BOX(0.09 * build, 0.42, 0.28 * build), topMat, 0, 1.2, 0);
	}
	if (params.topStyle === 'suit') {
		addMesh(body, BOX(0.08 * build, 0.4, 0.27 * build), accentMat, 0, 1.18, 0);
		addMesh(body, BOX(0.13 * build, 0.13, 0.05 * build), accentMat, 0, 1.3, 0.14);
	}
	if (params.topStyle === 'overalls') {
		addMesh(body, BOX(0.3 * build, 0.3, 0.27 * build), topMat, 0, 1.17, 0);
		addMesh(body, BOX(0.22 * build, 0.2, 0.03), accentMat, 0, 1.2, 0.135);
		for (const side of [-1, 1]) addMesh(body, BOX(0.04, 0.22, 0.03), accentMat, side * 0.1 * build, 1.32, 0.135);
	}
	if (params.topStyle === 'coat') {
		addMesh(body, BOX(0.46 * build, 0.74, 0.29 * build), topMat, 0, 1.04, 0);
		for (const side of [-1, 1]) addMesh(body, BOX(0.11 * build, 0.72, 0.31 * build), accentMat, side * 0.17 * build, 1.05, 0);
		addMesh(body, BOX(0.2 * build, 0.1, 0.1 * build), accentMat, 0, 1.43, -0.03);
	}
	// neck
	addMesh(body, CYL(0.062, 0.072, 0.11, 6), skinMat, 0, 1.44, 0);

	// head
	const head = new THREE.Group();
	head.position.set(0, 1.47, 0);
	body.add(head);
	const skull = new THREE.Group();
	skull.position.set(0, 0.2 * headScale, 0);
	skull.scale.setScalar(headScale);
	skull.userData.skinMat = skinMat;
	head.add(skull);
	const skullMesh = addMesh(skull, ICO(0.185, 1), skinMat, 0, 0, 0);
	skullMesh.scale.set(1, 1.06, 0.94);
	addMesh(skull, SPH(0.022, 5, 4), skinMat, -0.185, 0.01, 0).scale.set(0.5, 1, 0.8);
	addMesh(skull, SPH(0.022, 5, 4), skinMat, 0.185, 0.01, 0).scale.set(0.5, 1, 0.8);
	skull.add(buildFace(skull, params));
	skull.add(buildHair(skull, params));
	skull.add(buildAccessory(skull, params));

	// arms
	const armL = new THREE.Group();
	const armR = new THREE.Group();
	const shoulder = 0.235 * build;
	armL.position.set(-shoulder, 1.35, 0);
	armR.position.set(shoulder, 1.35, 0);
	body.add(armL, armR);
	for (const [group, side] of [
		[armL, -1],
		[armR, 1],
	]) {
		addMesh(group, CYL(0.052 * build, 0.046 * build, 0.26, 6), topMat, 0, -0.13, 0);
		const fore = new THREE.Group();
		fore.position.set(0, -0.26, 0);
		group.add(fore);
		addMesh(fore, CYL(0.044 * build, 0.038 * build, 0.24, 6), skinMat, 0, -0.12, 0);
		addMesh(fore, ICO(0.052 * build, 0), skinMat, 0, -0.25, 0);
		group.userData.fore = fore;
	}

	// legs
	const legL = new THREE.Group();
	const legR = new THREE.Group();
	legL.position.set(-0.1 * build, 0.88, 0);
	legR.position.set(0.1 * build, 0.88, 0);
	body.add(legL, legR);
	for (const group of [legL, legR]) {
		addMesh(group, CYL(0.072 * build, 0.062 * build, 0.42, 6), bottomMat, 0, -0.21, 0);
		const shin = new THREE.Group();
		shin.position.set(0, -0.42, 0);
		group.add(shin);
		addMesh(shin, CYL(0.058 * build, 0.05 * build, 0.4, 6), params.topStyle === 'dress' ? skinMat : bottomMat, 0, -0.2, 0);
		addMesh(shin, BOX(0.115, 0.085, 0.22), shoeMat, 0, -0.4, 0.035);
		group.userData.shin = shin;
	}

	const rig = {
		body,
		head,
		skull,
		armL,
		armR,
		foreL: armL.userData.fore,
		foreR: armR.userData.fore,
		legL,
		legR,
		shinL: legL.userData.shin,
		shinR: legR.userData.shin,
	};
	root.userData.rig = rig;
	root.userData.kind = 'char';
	root.userData.materials = [];
	root.traverse((o) => {
		if (o.isMesh) {
			o.userData.baseColor = o.material.color.clone();
			root.userData.materials.push(o.material);
		}
	});
	applyPose(root, params.pose || 'idle');
	return root;
}

export function setCharacterDim(root, dim) {
	if (!root.userData.baseMats) root.userData.baseMats = new Map();
	root.traverse((o) => {
		if (!o.isMesh) return;
		if (!root.userData.baseMats.has(o)) root.userData.baseMats.set(o, o.material.color.clone());
		const base = root.userData.baseMats.get(o);
		o.material.color.copy(base);
		if (dim) o.material.color.multiplyScalar(0.62);
	});
}

/* ================================ PROPS ================================== */
function propMaterials(prop, texDef) {
	const repeat = (texDef?.scale || 1) * (prop.texScale || 1);
	const map = texDef ? textureForProp(texDef, repeat) : null;
	const color = new THREE.Color(prop.color);
	const emissive = prop.emissive ? color.clone().multiplyScalar(0.9) : new THREE.Color(0x000000);
	const mat = (c, extra = {}) =>
		makeMaterial(c, {
			rough: prop.rough,
			metal: prop.metal,
			emissiveColor: extra.emissive ?? new THREE.Color(0x000000),
			emissiveIntensity: extra.emissiveIntensity ?? 1,
			flat: prop.flat,
			map: extra.noMap ? null : map,
			transparent: extra.transparent,
			opacity: extra.opacity,
		});
	const main = makeMaterial(color, {
		rough: prop.rough,
		metal: prop.metal,
		flat: prop.flat,
		emissive: emissive,
		emissiveIntensity: prop.emissive ? prop.emissive * 0.9 : 0,
		map,
	});
	const dark = mat('#3a3f4d', { noMap: true });
	const wood = mat('#8a5f38');
	const white = mat('#f2f4f8', { noMap: true });
	const glow = makeMaterial('#ffe9a8', { flat: true, emissive: 0xffe0a0, emissiveIntensity: 2.2, rough: 0.4 });
	const glass = mat('#9fd8ef', { transparent: true, opacity: 0.55, emExtra: true, noMap: true });
	return { main, dark, wood, white, glow, glass };
}

export function buildProp(prop, texDef) {
	const g = new THREE.Group();
	g.name = prop.name || prop.kind;
	g.userData.kind = 'prop';
	const M = propMaterials(prop, texDef);
	const { main, dark, wood, white, glow, glass } = M;
	const color2 = new THREE.Color(prop.color).offsetHSL(0.03, 0, -0.09);

	switch (prop.kind) {
		case 'pine': {
			addMesh(g, CYL(0.1, 0.16, 0.8, 6), wood, 0, 0.4, 0);
			addMesh(g, CONE(0.9, 1.25, 7), main, 0, 1.05, 0);
			addMesh(g, CONE(0.7, 1.05, 7), main, 0, 1.7, 0);
			addMesh(g, CONE(0.5, 0.85, 7), main, 0, 2.32, 0);
			break;
		}
		case 'tree': {
			addMesh(g, CYL(0.11, 0.18, 1.05, 6), wood, 0, 0.52, 0);
			const a = addMesh(g, ICO(0.82, 0), main, 0, 1.75, 0);
			a.scale.set(1, 0.92, 1);
			addMesh(g, ICO(0.52, 0), main, 0.55, 1.45, 0.15);
			addMesh(g, ICO(0.45, 0), main, -0.45, 1.5, -0.2);
			break;
		}
		case 'bush': {
			addMesh(g, ICO(0.45, 0), main, 0, 0.36, 0).scale.set(1.15, 0.85, 1.1);
			addMesh(g, ICO(0.3, 0), main, 0.35, 0.26, 0.12);
			addMesh(g, ICO(0.26, 0), main, -0.3, 0.24, -0.12);
			break;
		}
		case 'rock': {
			const r1 = addMesh(g, ICO(0.55, 0), main, 0, 0.34, 0);
			r1.scale.set(1.15, 0.78, 1);
			r1.rotation.set(0.2, 0.5, 0.1);
			const r2 = addMesh(g, ICO(0.28, 0), main, 0.42, 0.18, 0.2);
			r2.rotation.y = 1.1;
			break;
		}
		case 'crate': {
			addMesh(g, BOX(0.62, 0.62, 0.62), main, 0, 0.31, 0);
			for (const [x, z] of [
				[-0.32, 0],
				[0.32, 0],
				[0, -0.32],
				[0, 0.32],
			])
				addMesh(g, BOX(x ? 0.04 : 0.66, 0.66, z ? 0.04 : 0.66), dark, x, 0.31, z);
			break;
		}
		case 'barrel': {
			addMesh(g, CYL(0.32, 0.28, 0.78, 10), main, 0, 0.39, 0);
			addMesh(g, new THREE.TorusGeometry(0.31, 0.025, 4, 12), dark, 0, 0.14, 0, [Math.PI / 2, 0, 0]);
			addMesh(g, new THREE.TorusGeometry(0.32, 0.025, 4, 12), dark, 0, 0.64, 0, [Math.PI / 2, 0, 0]);
			addMesh(g, CYL(0.3, 0.3, 0.03, 10), dark, 0, 0.79, 0);
			break;
		}
		case 'table': {
			addMesh(g, BOX(1.35, 0.09, 0.82), main, 0, 0.74, 0);
			for (const [x, z] of [
				[-0.55, -0.3],
				[0.55, -0.3],
				[-0.55, 0.3],
				[0.55, 0.3],
			])
				addMesh(g, BOX(0.09, 0.72, 0.09), dark, x, 0.36, z);
			break;
		}
		case 'chair': {
			addMesh(g, BOX(0.52, 0.09, 0.52), main, 0, 0.46, 0);
			addMesh(g, BOX(0.52, 0.55, 0.08), main, 0, 0.74, -0.24);
			for (const [x, z] of [
				[-0.21, -0.21],
				[0.21, -0.21],
				[-0.21, 0.21],
				[0.21, 0.21],
			])
				addMesh(g, BOX(0.07, 0.44, 0.07), dark, x, 0.22, z);
			break;
		}
		case 'bench': {
			addMesh(g, BOX(1.5, 0.09, 0.5), main, 0, 0.46, 0);
			addMesh(g, BOX(1.5, 0.36, 0.08), main, 0, 0.72, -0.22);
			for (const x of [-0.6, 0.6]) {
				addMesh(g, BOX(0.1, 0.44, 0.1), dark, x, 0.22, -0.18);
				addMesh(g, BOX(0.1, 0.44, 0.1), dark, x, 0.22, 0.18);
			}
			break;
		}
		case 'lamp': {
			addMesh(g, CYL(0.22, 0.26, 0.06, 9), dark, 0, 0.03, 0);
			addMesh(g, CYL(0.035, 0.035, 1.45, 6), dark, 0, 0.77, 0);
			addMesh(g, CYL(0.34, 0.16, 0.34, 9, 1, true), main, 0, 1.6, 0);
			addMesh(g, SPH(0.11, 7, 5), glow, 0, 1.5, 0);
			break;
		}
		case 'streetlamp': {
			addMesh(g, CYL(0.16, 0.22, 0.2, 8), dark, 0, 0.1, 0);
			addMesh(g, CYL(0.06, 0.075, 2.7, 6), dark, 0, 1.45, 0);
			addMesh(g, BOX(0.7, 0.09, 0.09), dark, 0.28, 2.75, 0);
			addMesh(g, CONE(0.26, 0.2, 8), main, 0.6, 2.6, 0);
			addMesh(g, SPH(0.13, 7, 5), glow, 0.6, 2.5, 0);
			break;
		}
		case 'building': {
			addMesh(g, BOX(1.7, 3.2, 1.3), main, 0, 1.6, 0);
			addMesh(g, BOX(1.85, 0.12, 1.45), dark, 0, 3.22, 0);
			addMesh(g, BOX(0.5, 0.8, 0.08), dark, 0, 0.4, 0.66);
			for (let row = 0; row < 4; row++)
				for (let col = -1; col <= 1; col++) {
					const lit = (row + col) % 3 !== 0;
					addMesh(g, BOX(0.34, 0.34, 0.03), lit ? glow : glass, col * 0.48, 1.1 + row * 0.52, 0.67);
					addMesh(g, BOX(0.34, 0.34, 0.03), lit ? glow : glass, col * 0.48, 1.1 + row * 0.52, -0.67);
				}
			break;
		}
		case 'cloud': {
			const m = addMesh(g, ICO(0.62, 0), white, 0, 0.6, 0);
			m.scale.set(1.5, 0.65, 1);
			addMesh(g, ICO(0.42, 0), white, 0.5, 0.66, 0.1).scale.set(1, 0.8, 0.9);
			addMesh(g, ICO(0.36, 0), white, -0.55, 0.55, -0.1).scale.set(1, 0.8, 0.9);
			break;
		}
		case 'crystal': {
			const c1 = addMesh(g, new THREE.OctahedronGeometry(0.42, 0), main, 0, 0.55, 0);
			c1.scale.set(1, 1.9, 1);
			const c2 = addMesh(g, new THREE.OctahedronGeometry(0.24, 0), main, 0.32, 0.3, 0.12);
			c2.scale.set(1, 1.5, 1);
			c2.rotation.z = -0.3;
			const c3 = addMesh(g, new THREE.OctahedronGeometry(0.18, 0), main, -0.28, 0.24, -0.12);
			c3.scale.set(1, 1.4, 1);
			c3.rotation.z = 0.4;
			break;
		}
		case 'fence': {
			for (let i = -1; i <= 1; i++) addMesh(g, BOX(0.1, 0.95, 0.1), wood, i * 0.8, 0.48, 0);
			addMesh(g, BOX(1.9, 0.09, 0.06), wood, 0, 0.72, 0);
			addMesh(g, BOX(1.9, 0.09, 0.06), wood, 0, 0.38, 0);
			break;
		}
		case 'sign': {
			addMesh(g, CYL(0.05, 0.06, 1.05, 6), wood, 0, 0.52, 0);
			addMesh(g, BOX(0.95, 0.5, 0.07), main, 0, 1.05, 0.02);
			addMesh(g, BOX(1.0, 0.06, 0.1), dark, 0, 1.33, 0.02);
			addMesh(g, BOX(1.0, 0.06, 0.1), dark, 0, 0.78, 0.02);
			break;
		}
		case 'arch': {
			addMesh(g, BOX(0.28, 1.8, 0.34), main, -0.65, 0.9, 0);
			addMesh(g, BOX(0.28, 1.8, 0.34), main, 0.65, 0.9, 0);
			addMesh(g, BOX(1.7, 0.28, 0.4), main, 0, 1.9, 0);
			addMesh(g, BOX(1.8, 0.1, 0.46), dark, 0, 2.08, 0);
			break;
		}
		case 'plant': {
			addMesh(g, CYL(0.24, 0.17, 0.32, 8), main, 0, 0.16, 0);
			addMesh(g, CYL(0.21, 0.21, 0.04, 8), dark, 0, 0.3, 0);
			for (let i = 0; i < 5; i++) {
				const a = (i / 5) * Math.PI * 2;
				const leaf = addMesh(g, CONE(0.11, 0.65, 4), new THREE.MeshStandardMaterial({ color: 0x3f8a4b, flatShading: true, roughness: 0.9 }), Math.cos(a) * 0.1, 0.6, Math.sin(a) * 0.1);
				leaf.rotation.set(Math.cos(a) * 0.5, 0, Math.sin(a) * -0.5);
			}
			break;
		}
		case 'column': {
			addMesh(g, BOX(0.5, 0.14, 0.5), main, 0, 0.07, 0);
			addMesh(g, CYL(0.19, 0.22, 1.9, 10), main, 0, 1.1, 0);
			addMesh(g, BOX(0.5, 0.16, 0.5), main, 0, 2.12, 0);
			break;
		}
		case 'balloon': {
			const b = addMesh(g, SPH(0.4, 8, 7), main, 0, 1.5, 0);
			b.scale.set(1, 1.18, 1);
			addMesh(g, CYL(0.006, 0.006, 0.7, 3), dark, 0, 0.85, 0);
			addMesh(g, BOX(0.22, 0.18, 0.22), wood, 0, 0.45, 0);
			break;
		}
		default: {
			addMesh(g, BOX(0.6, 0.6, 0.6), main, 0, 0.3, 0);
		}
	}
	// consistent second color helper not used directly but keeps palette coherent
	void color2;
	return g;
}

/* =============================== UTILITIES =============================== */
export function disposeObject(obj) {
	obj.traverse((o) => {
		if (o.isMesh || o.isPoints || o.isLine) {
			o.geometry?.dispose?.();
			const mats = Array.isArray(o.material) ? o.material : [o.material];
			for (const mat of mats) {
				if (!mat) continue;
				mat.map?.dispose?.();
				mat.dispose?.();
			}
		}
	});
	if (obj.parent) obj.parent.remove(obj);
}

export function disposeAllChildren(group) {
	for (const child of [...group.children]) {
		disposeObject(child);
		group.remove(child);
	}
}

export function makeGradientDome(top, bottom) {
	const geo = new THREE.SphereGeometry(120, 16, 12);
	const mat = new THREE.ShaderMaterial({
		uniforms: {
			topColor: { value: new THREE.Color(top) },
			bottomColor: { value: new THREE.Color(bottom) },
			offset: { value: 12 },
			exponent: { value: 0.75 },
		},
		vertexShader: `varying vec3 vWorld; void main(){ vec4 wp = modelMatrix * vec4(position,1.0); vWorld = wp.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
		fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; uniform float offset; uniform float exponent; varying vec3 vWorld; void main(){ float h = normalize(vWorld + vec3(0.0, offset, 0.0)).y; gl_FragColor = vec4(mix(bottomColor, topColor, pow(max(h,0.0), exponent)), 1.0); }`,
		side: THREE.BackSide,
		depthWrite: false,
		fog: false,
	});
	return new THREE.Mesh(geo, mat);
}
