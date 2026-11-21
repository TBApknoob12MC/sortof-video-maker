// Three.js studio: renderer, environment, objects, picking, camera helpers.
import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { TransformControls } from './vendor/TransformControls.js';
import {
	buildCharacter,
	buildProp,
	applyPose,
	rebuildFace,
	disposeObject,
	disposeAllChildren,
	makeGradientDome,
	characterHeight,
	setCharacterDim,
} from './lowpoly.js';

const D2R = THREE.MathUtils.degToRad;
const R2D = THREE.MathUtils.radToDeg;

export class Studio {
	constructor(canvas, options = {}) {
		this.canvas = canvas;
		this.renderer =
			options.renderer ||
			new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
		this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
		this.renderer.shadowMap.enabled = true;
		this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
		this.renderer.outputColorSpace = THREE.SRGBColorSpace;
		this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
		this.renderer.toneMappingExposure = 1.1;

		this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(45, 1, 0.05, 400);
		this.camera.rotation.order = 'YXZ';
		this.camera.position.set(4.6, 2.5, 6.4);
		this.camera.lookAt(0, 1.05, 0);

		this.controls = new OrbitControls(this.camera, canvas);
		this.controls.enableDamping = true;
		this.controls.dampingFactor = 0.08;
		this.controls.target.set(0, 1.05, 0);
		this.controls.minDistance = 0.8;
		this.controls.maxDistance = 80;
		this.controls.maxPolarAngle = Math.PI * 0.495;
		this.controls.update();

		this.envGroup = new THREE.Group();
		this.itemsGroup = new THREE.Group();
		this.scene.add(this.envGroup, this.itemsGroup);

		this.hemiLight = new THREE.HemisphereLight(0xbfd8ff, 0x40381f, 0.8);
		this.ambient = new THREE.AmbientLight(0xffffff, 0.25);
		this.sun = new THREE.DirectionalLight(0xffe7c4, 1.6);
		this.sun.castShadow = true;
		this.sun.shadow.mapSize.set(2048, 2048);
		this.sun.shadow.camera.near = 0.5;
		this.sun.shadow.camera.far = 80;
		this.sun.shadow.camera.left = -14;
		this.sun.shadow.camera.right = 14;
		this.sun.shadow.camera.top = 14;
		this.sun.shadow.camera.bottom = -14;
		this.sun.shadow.bias = -0.0006;
		this.sun.shadow.normalBias = 0.02;
		this.scene.add(this.hemiLight, this.ambient, this.sun);
		this.scene.add(this.sun.target);

		this.transform = new TransformControls(this.camera, canvas);
		this.transform.setSize(0.9);
		this.transformHelper = this.transform.getHelper();
		this.scene.add(this.transformHelper);
		this.transform.addEventListener('dragging-changed', (e) => {
			this.controls.enabled = !e.value && !this.locked;
			if (!e.value) this.onTransformEnd?.();
		});
		this.transform.addEventListener('objectChange', () => {
			this.selectionDirty = true;
			this.onTransformChange?.();
		});

		this.objects = new Map();
		this.selectedId = null;
		this.locked = false;
		this.clock = new THREE.Clock();
		this.raycaster = new THREE.Raycaster();
		this.pointer = new THREE.Vector2();
		this.particles = null;
		this.stars = null;
		this.anims = [];
		this.camTween = null;
		this.onFrame = null;
		this.selectionDirty = true;
		this.pickEnabled = true;
		this.phase = new Map();

		this.selectionBox = new THREE.BoxHelper(new THREE.Object3D(), 0xffd36e);
		this.selectionBox.material.depthTest = false;
		this.selectionBox.material.transparent = true;
		this.selectionBox.material.opacity = 0.9;
		this.selectionBox.visible = false;
		this.selectionBox.renderOrder = 999;
		this.scene.add(this.selectionBox);

		this._bindPicking();
		this.resize();
		this.resizeObserver = new ResizeObserver(() => this.resize());
		this.resizeObserver.observe(canvas.parentElement || canvas);
		window.addEventListener('resize', () => this.resize());

		this.animate = this.animate.bind(this);
		requestAnimationFrame(this.animate);
	}

	resize() {
		const parent = this.canvas.parentElement;
		const w = Math.max(1, parent?.clientWidth || window.innerWidth);
		const h = Math.max(1, parent?.clientHeight || window.innerHeight);
		this.renderer.setSize(w, h, false);
		this.camera.aspect = w / h;
		this.camera.updateProjectionMatrix();
	}

	/* ------------------------------- picking ------------------------------- */
	_bindPicking() {
		let down = null;
		this.canvas.addEventListener('pointerdown', (e) => {
			if (e.button !== 0) return;
			down = { x: e.clientX, y: e.clientY, t: performance.now() };
		});
		this.canvas.addEventListener('pointerup', (e) => {
			if (!down || !this.pickEnabled) {
				down = null;
				return;
			}
			const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
			const quick = performance.now() - down.t < 600;
			down = null;
			if (moved > 7 || !quick) return;
			if (this.transform.dragging) return;
			const rect = this.canvas.getBoundingClientRect();
			this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
			this.raycaster.setFromCamera(this.pointer, this.camera);
			const hits = this.raycaster.intersectObjects(this.itemsGroup.children, true);
			let id = null;
			for (const hit of hits) {
				let node = hit.object;
				while (node && !node.userData.itemId) node = node.parent;
				if (node?.userData.itemId) {
					id = node.userData.itemId;
					break;
				}
			}
			this.onPick?.(id);
		});
	}

	/* ----------------------------- environment ----------------------------- */
	updateLighting(env) {
		const skyTop = env.skyTop || '#8fc7ff';
		const skyBottom = env.skyBottom || '#ffe6b8';
		this.scene.background = new THREE.Color(skyBottom);
		const fogFar = THREE.MathUtils.clamp(42 - (env.fog || 0) * 700, 22, 110);
		this.scene.fog = env.fog > 0 ? new THREE.Fog(new THREE.Color(skyBottom).lerp(new THREE.Color(skyTop), 0.35), 8, fogFar) : null;

		this.sun.intensity = env.sun;
		this.sun.color.set(env.sunColor || '#ffe7c4');
		const az = D2R(env.sunAzimuth ?? 120);
		const el = D2R(Math.max(6, env.sunElevation ?? 35));
		this.sun.position.set(Math.cos(el) * Math.cos(az) * 18, Math.sin(el) * 18, Math.cos(el) * Math.sin(az) * 18);
		this.sun.target.position.set(0, 0, 0);
		this.hemiLight.intensity = env.ambient;
		this.hemiLight.color.set(skyTop);
		this.hemiLight.groundColor.set(env.groundColor || '#5a5030');
		this.ambient.intensity = Math.min(0.9, env.ambient * 0.45);
		this.renderer.toneMappingExposure = env.preset === 'space' ? 1.25 : 1.1;
	}

	setEnvironment(env, project) {
		disposeAllChildren(this.envGroup);
		this.particles = null;
		this.stars = null;
		const skyTop = env.skyTop || '#8fc7ff';
		const skyBottom = env.skyBottom || '#ffe6b8';

		const dome = makeGradientDome(skyTop, skyBottom);
		dome.name = 'skydome';
		this.envGroup.add(dome);
		this.scene.background = new THREE.Color(skyBottom);
		this.updateLighting(env);

		// ground
		if (env.showGround !== false) {
			const isRoom = env.preset === 'room' || env.preset === 'studio';
			const groundGeo = isRoom ? new THREE.PlaneGeometry(40, 40) : new THREE.CircleGeometry((env.groundSize || 60) / 2, 48);
			const groundMat = new THREE.MeshStandardMaterial({
				color: env.groundColor,
				roughness: 0.98,
				metalness: 0,
				flatShading: false,
			});
			const ground = new THREE.Mesh(groundGeo, groundMat);
			ground.rotation.x = -Math.PI / 2;
			ground.receiveShadow = true;
			ground.name = 'ground';
			this.envGroup.add(ground);
			if (env.showGrid) {
				const grid = new THREE.GridHelper(Math.max(20, env.groundSize || 60), 40, 0x2f3a52, 0x222b3d);
				grid.position.y = 0.01;
				this.envGroup.add(grid);
			}
		}

		if (env.water) {
			const waterMat = new THREE.MeshStandardMaterial({
				color: '#2f8fbf',
				roughness: 0.25,
				metalness: 0.35,
				transparent: true,
				opacity: 0.92,
			});
			const water = new THREE.Mesh(new THREE.PlaneGeometry(220, 60), waterMat);
			water.rotation.x = -Math.PI / 2;
			water.position.set(0, 0.02, -34);
			water.receiveShadow = true;
			water.name = 'water';
			this.envGroup.add(water);
			const shore = new THREE.Mesh(new THREE.PlaneGeometry(220, 4), new THREE.MeshStandardMaterial({ color: '#f2e2bd', roughness: 0.9 }));
			shore.rotation.x = -Math.PI / 2;
			shore.position.set(0, 0.03, -5.2);
			this.envGroup.add(shore);
		}

		const preset = env.preset || 'beach';
		if (preset === 'room') {
			const wallMat = new THREE.MeshStandardMaterial({ color: '#d9d2c6', roughness: 0.95, side: THREE.DoubleSide });
			const accentMat = new THREE.MeshStandardMaterial({ color: '#b9c4cd', roughness: 0.9 });
			const back = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), wallMat);
			back.position.set(0, 3.5, -6);
			back.receiveShadow = true;
			const left = new THREE.Mesh(new THREE.PlaneGeometry(12, 7), accentMat);
			left.rotation.y = Math.PI / 2;
			left.position.set(-7, 3.5, 0);
			left.receiveShadow = true;
			this.envGroup.add(back, left);
			// window
			const frame = new THREE.Mesh(new THREE.BoxGeometry(3, 2.4, 0.18), new THREE.MeshStandardMaterial({ color: '#f2efe8', roughness: 0.7 }));
			frame.position.set(-2.2, 2.6, -5.9);
			this.envGroup.add(frame);
			const pane = new THREE.Mesh(
				new THREE.PlaneGeometry(2.6, 2.0),
				new THREE.MeshStandardMaterial({ color: '#a9d8f2', emissive: new THREE.Color('#7fc3e6'), emissiveIntensity: 0.5, roughness: 0.2 })
			);
			pane.position.set(-2.2, 2.6, -5.78);
			this.envGroup.add(pane);
			const rug = new THREE.Mesh(new THREE.CircleGeometry(2.6, 24), new THREE.MeshStandardMaterial({ color: '#9c6b72', roughness: 1 }));
			rug.rotation.x = -Math.PI / 2;
			rug.position.set(0, 0.012, 0.4);
			rug.receiveShadow = true;
			this.envGroup.add(rug);
		}

		if (preset === 'studio') {
			const cyc = new THREE.Mesh(
				new THREE.CylinderGeometry(10, 10, 9, 32, 1, true, -Math.PI * 0.62, Math.PI * 1.2),
				new THREE.MeshStandardMaterial({ color: '#c9ced9', roughness: 1, side: THREE.BackSide })
			);
			cyc.position.set(0, 3.5, -1.5);
			cyc.receiveShadow = true;
			this.envGroup.add(cyc);
		}

		if (preset === 'forest') {
			for (let i = 0; i < 14; i++) {
				const a = (i / 14) * Math.PI * 2 + i * 0.3;
				const r = 16 + (i % 5) * 4;
				const tree = buildProp({ kind: 'pine', color: i % 2 ? '#2f6f4a' : '#3a7f52', rough: 0.9, metal: 0, emissive: 0, flat: true, texScale: 1 }, null);
				tree.position.set(Math.cos(a) * r, 0, Math.sin(a) * r - 4);
				tree.scale.setScalar(1.8 + (i % 3) * 0.7);
				tree.traverse((o) => (o.castShadow = false));
				this.envGroup.add(tree);
			}
		}

		if (preset === 'nightcity') {
			for (let i = 0; i < 12; i++) {
				const a = (i / 12) * Math.PI * 2;
				const r = 22 + (i % 4) * 6;
				const b = buildProp(
					{ kind: 'building', color: i % 2 ? '#3a4560' : '#2e3850', rough: 0.85, metal: 0.1, emissive: 0.05, flat: true, texScale: 1 },
					null
				);
				b.position.set(Math.cos(a) * r, 0, Math.sin(a) * r - 3);
				b.scale.setScalar(1.4 + (i % 5) * 0.5);
				b.rotation.y = a;
				b.traverse((o) => (o.castShadow = false));
				this.envGroup.add(b);
			}
		}

		if (preset === 'beach') {
			for (let i = 0; i < 4; i++) {
				const cloud = buildProp({ kind: 'cloud', color: '#ffffff', rough: 1, metal: 0, emissive: 0.15, flat: true, texScale: 1 }, null);
				cloud.position.set(-24 + i * 15, 9 + (i % 2) * 3, -22 - (i % 3) * 8);
				cloud.scale.setScalar(2 + (i % 2));
				cloud.traverse((o) => (o.castShadow = false));
				this.envGroup.add(cloud);
			}
		}

		if (preset === 'space') {
			const count = 900;
			const pos = new Float32Array(count * 3);
			for (let i = 0; i < count; i++) {
				const v = new THREE.Vector3().randomDirection().multiplyScalar(70 + Math.random() * 40);
				v.y = Math.abs(v.y) * 0.8 + 1;
				pos.set([v.x, v.y, v.z], i * 3);
			}
			const geo = new THREE.BufferGeometry();
			geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
			const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.55, sizeAttenuation: true, transparent: true, opacity: 0.9 });
			this.stars = new THREE.Points(geo, mat);
			this.envGroup.add(this.stars);
		}

		this._buildParticles(env.particles || 'none');
		void project;
	}

	_buildParticles(type) {
		if (!type || type === 'none') return;
		const count = type === 'rain' ? 700 : 260;
		const pos = new Float32Array(count * 3);
		const speeds = new Float32Array(count);
		for (let i = 0; i < count; i++) {
			pos.set([(Math.random() - 0.5) * 26, Math.random() * 10, (Math.random() - 0.5) * 26], i * 3);
			speeds[i] = 0.25 + Math.random() * 0.8;
		}
		const geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
		const colors = { dust: 0xffe0a8, snow: 0xffffff, rain: 0xa8c8ff, fireflies: 0xfff0a0 };
		const mat = new THREE.PointsMaterial({
			color: colors[type] || 0xffffff,
			size: type === 'snow' ? 0.11 : type === 'rain' ? 0.05 : 0.08,
			transparent: true,
			opacity: type === 'fireflies' ? 0.95 : 0.65,
			depthWrite: false,
			blending: type === 'fireflies' ? THREE.AdditiveBlending : THREE.NormalBlending,
		});
		const points = new THREE.Points(geo, mat);
		points.userData.type = type;
		points.userData.speeds = speeds;
		this.envGroup.add(points);
		this.particles = points;
	}

	/* ------------------------------- objects ------------------------------- */
	_applyTransform(obj, item) {
		const t = item.transform || { p: [0, 0, 0], r: [0, 0, 0], s: 1 };
		obj.position.fromArray(t.p);
		obj.rotation.set(D2R(t.r[0] || 0), D2R(t.r[1] || 0), D2R(t.r[2] || 0));
		obj.scale.setScalar(t.s ?? 1);
		obj.visible = item.visible !== false;
	}

	buildItem(project, item, kind) {
		let obj;
		if (kind === 'char') {
			obj = buildCharacter(item);
		} else {
			const texDef = project.textures.find((t) => t.id === item.textureId) || null;
			obj = buildProp(item, texDef);
		}
		obj.userData.itemId = item.id;
		obj.userData.kind = kind;
		obj.userData.item = item;
		this._applyTransform(obj, item);
		return obj;
	}

	rebuildAll(project) {
		const keep = this.selectedId;
		this.transform.detach();
		for (const id of [...this.objects.keys()]) this.removeItem(id);
		for (const c of project.characters) this.addItem(project, c, 'char');
		for (const p of project.props) this.addItem(project, p, 'prop');
		if (keep && this.objects.has(keep)) this.select(keep);
		else this.selectionBox.visible = false;
	}

	addItem(project, item, kind) {
		const obj = this.buildItem(project, item, kind);
		this.objects.set(item.id, obj);
		this.itemsGroup.add(obj);
		this.phase.set(item.id, Math.random() * Math.PI * 2);
		return obj;
	}

	rebuildItem(project, item, kind) {
		const old = this.objects.get(item.id);
		const wasSelected = this.selectedId === item.id;
		if (old) {
			this.transform.detach();
			this.objects.delete(item.id);
			disposeObject(old);
		}
		this.addItem(project, item, kind);
		if (wasSelected) this.select(item.id);
		else this.selectionDirty = true;
	}

	removeItem(id) {
		const obj = this.objects.get(id);
		if (!obj) return;
		if (this.selectedId === id) {
			this.transform.detach();
			this.selectionBox.visible = false;
			this.selectedId = null;
		}
		this.objects.delete(id);
		this.phase.delete(id);
		disposeObject(obj);
	}

	updateTransform(project, id) {
		const item = project.characters.find((c) => c.id === id) || project.props.find((p) => p.id === id);
		const obj = this.objects.get(id);
		if (!item || !obj) return;
		this._applyTransform(obj, item);
		this.selectionDirty = true;
	}

	setVisible(id, visible) {
		const obj = this.objects.get(id);
		if (obj) obj.visible = visible;
	}

	select(id) {
		this.selectedId = id;
		const obj = id ? this.objects.get(id) : null;
		this.selectionDirty = true;
		if (!obj) {
			this.transform.detach();
			this.selectionBox.visible = false;
			return;
		}
		const item = obj.userData.item;
		if (item?.locked || this.locked || !obj.visible) this.transform.detach();
		else this.transform.attach(obj);
	}

	setGizmoMode(mode) {
		this.transform.setMode(mode);
	}
	setGizmoSnap(on) {
		this.transform.setTranslationSnap(on ? 0.25 : null);
		this.transform.setRotationSnap(on ? D2R(15) : null);
		this.transform.setScaleSnap(on ? 0.1 : null);
	}
	setLocked(locked) {
		this.locked = locked;
		this.pickEnabled = !locked;
		this.controls.enabled = !locked;
		if (locked) this.transform.detach();
		else this.select(this.selectedId);
	}

	/* -------------------------------- camera -------------------------------- */
	view() {
		const e = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
		return {
			p: this.camera.position.toArray().map((v) => +v.toFixed(3)),
			r: [R2D(e.x), R2D(e.y), R2D(e.z)].map((v) => +v.toFixed(2)),
			fov: +this.camera.fov.toFixed(1),
			target: this.controls.target.toArray().map((v) => +v.toFixed(3)),
		};
	}

	setView(v, updateTarget = true) {
		if (!v) return;
		this.camera.position.fromArray(v.p);
		const hasRot = Array.isArray(v.r) && v.r.length === 3;
		if (hasRot) this.camera.rotation.set(D2R(v.r[0]), D2R(v.r[1]), D2R(v.r[2]), 'YXZ');
		else if (Array.isArray(v.target)) this.camera.lookAt(new THREE.Vector3().fromArray(v.target));
		if (v.fov) {
			this.camera.fov = v.fov;
			this.camera.updateProjectionMatrix();
		}
		if (updateTarget) {
			if (Array.isArray(v.target)) {
				this.controls.target.fromArray(v.target);
			} else {
				const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
				this.controls.target.copy(this.camera.position).addScaledVector(dir, 5);
			}
			if (!hasRot) this.camera.lookAt(this.controls.target);
			this.controls.update();
		}
	}

	applyKeyframe(kf) {
		this.camera.position.fromArray(kf.p);
		this.camera.rotation.set(D2R(kf.r[0]), D2R(kf.r[1]), D2R(kf.r[2]), 'YXZ');
		this.camera.fov = kf.fov;
		this.camera.updateProjectionMatrix();
	}

	aimAt(point, fov = this.camera.fov) {
		const target = new THREE.Vector3(...point);
		const dir = target.clone().sub(this.camera.position).normalize();
		const look = new THREE.Matrix4().lookAt(new THREE.Vector3(), dir.clone().negate(), this.camera.up);
		const q = new THREE.Quaternion().setFromRotationMatrix(look);
		this.camera.quaternion.copy(q);
		this.camera.fov = fov;
		this.camera.updateProjectionMatrix();
		this.controls.target.copy(target);
	}

	/* camera tween system */
	tweenTo(position, lookAt, duration = 0.85, fov = null) {
		this.camTween = {
			fromPos: this.camera.position.clone(),
			toPos: position.clone(),
			fromQuat: this.camera.quaternion.clone(),
			toQuat: quatLookAt(position, lookAt),
			fromFov: this.camera.fov,
			toFov: fov || this.camera.fov,
			lookAt: lookAt.clone(),
			t0: performance.now(),
			dur: Math.max(0.05, duration),
		};
	}
	stopTween() {
		this.camTween = null;
	}
	tweenActive() {
		return !!this.camTween;
	}
	finishTween() {
		if (!this.camTween) return;
		const t = this.camTween;
		this.camera.position.copy(t.toPos);
		this.camera.quaternion.copy(t.toQuat);
		this.camera.fov = t.toFov;
		this.camera.updateProjectionMatrix();
		this.camTween = null;
		this.controls.target.copy(t.lookAt);
	}

	frameObject(id, padding = 1.9) {
		const obj = id ? this.objects.get(id) : null;
		if (!obj) return;
		const box = new THREE.Box3().setFromObject(obj);
		if (box.isEmpty()) return;
		const center = box.getCenter(new THREE.Vector3());
		const size = box.getSize(new THREE.Vector3());
		const radius = Math.max(0.6, size.length() * 0.5);
		const fov = D2R(this.camera.fov);
		const dist = (radius / Math.sin(fov / 2)) * padding;
		const dir = new THREE.Vector3().subVectors(this.camera.position, center);
		if (dir.lengthSq() < 0.0001) dir.set(1, 0.5, 1);
		dir.normalize();
		dir.y = Math.max(0.22, Math.abs(dir.y) * 0.8 + 0.25);
		dir.normalize();
		this.camera.position.copy(center).addScaledVector(dir, dist);
		this.controls.target.copy(center);
		this.controls.update();
	}

	frameAll(padding = 1.35) {
		const box = new THREE.Box3().setFromObject(this.itemsGroup);
		if (box.isEmpty()) {
			this.controls.target.set(0, 1, 0);
			this.camera.position.set(5, 2.6, 6.5);
			this.controls.update();
			return;
		}
		const center = box.getCenter(new THREE.Vector3());
		const size = box.getSize(new THREE.Vector3());
		const radius = Math.max(1.4, size.length() * 0.5);
		const dist = (radius / Math.sin(D2R(this.camera.fov) / 2)) * padding;
		const dir = new THREE.Vector3(0.75, 0.42, 1).normalize();
		this.camera.position.copy(center).addScaledVector(dir, dist);
		this.controls.target.copy(center);
		this.controls.update();
	}

	resetCamera() {
		this.camera.position.set(4.6, 2.5, 6.4);
		this.camera.fov = 45;
		this.camera.rotation.set(D2R(-10), D2R(33), 0, 'YXZ');
		this.camera.updateProjectionMatrix();
		this.controls.target.set(0, 1.05, 0);
		this.controls.update();
	}

	/* character helpers */
	characterShot(id, shot = 'medium') {
		const obj = this.objects.get(id);
		if (!obj) return null;
		const item = obj.userData.item;
		const pos = new THREE.Vector3();
		obj.getWorldPosition(pos);
		const h = characterHeight(item || {});
		const rot = item?.transform?.r?.[1] || 0;
		const fwd = new THREE.Vector3(Math.sin(D2R(rot)), 0, Math.cos(D2R(rot)));
		const specs = {
			wide: { dist: 5.4, camY: h * 1.0, lookY: h * 0.52, fov: 42 },
			medium: { dist: 3.0, camY: h * 0.78, lookY: h * 0.78, fov: 38 },
			close: { dist: 1.75, camY: h * 0.9, lookY: h * 0.87, fov: 34 },
			full: { dist: 4.2, camY: h * 0.5, lookY: h * 0.52, fov: 40 },
		};
		const s = specs[shot] || specs.medium;
		const camPos = pos.clone().addScaledVector(fwd, s.dist);
		camPos.x += 0.25;
		camPos.y = pos.y + s.camY;
		const look = new THREE.Vector3(pos.x, pos.y + s.lookY, pos.z);
		return { pos: camPos, look, fov: s.fov };
	}

	twoShot(ids, padding = 1.25) {
		const box = new THREE.Box3();
		for (const id of ids) {
			const obj = this.objects.get(id);
			if (obj) box.expandByObject(obj);
		}
		if (box.isEmpty()) return null;
		const center = box.getCenter(new THREE.Vector3());
		const size = box.getSize(new THREE.Vector3());
		const dist = Math.max(3.2, size.length() * 1.6 * padding);
		const pos = center.clone().add(new THREE.Vector3(0.4, 0.9, 1).normalize().multiplyScalar(dist));
		pos.y = Math.max(1.2, center.y + size.y * 0.25);
		const look = new THREE.Vector3(center.x, Math.max(0.9, center.y), center.z);
		return { pos, look, fov: 40 };
	}

	setDimmed(exceptIds = []) {
		for (const [id, obj] of this.objects) {
			if (obj.userData.kind !== 'char') continue;
			setCharacterDim(obj, exceptIds.length > 0 && !exceptIds.includes(id));
		}
	}

	updateRig(data) {
		const obj = this.objects.get(data.id);
		if (!obj || !obj.userData.rig) return;
		if (data.pose) applyPose(obj, data.pose);
		if (data.expression) rebuildFace(obj, data);
		obj.userData.baseBodyY = obj.userData.rig.body.position.y;
		this.selectionDirty = true;
	}

	/* -------------------------------- render -------------------------------- */
	animate() {
		requestAnimationFrame(this.animate);
		const dt = Math.min(0.05, this.clock.getDelta());
		const t = this.clock.elapsedTime;

		if (this.onFrame) this.onFrame(dt, t);
		if (!this.locked && !this.camTween) this.controls.update();

		if (this.camTween) {
			const tw = this.camTween;
			const k = Math.min(1, (performance.now() - tw.t0) / (tw.dur * 1000));
			const e = k < 0.5 ? 2 * k * k : 1 - 2 * (1 - k) * (1 - k);
			this.camera.position.lerpVectors(tw.fromPos, tw.toPos, e);
			this.camera.quaternion.slerpQuaternions(tw.fromQuat, tw.toQuat, e);
			this.camera.fov = tw.fromFov + (tw.toFov - tw.fromFov) * e;
			this.camera.updateProjectionMatrix();
			if (k >= 1) {
				this.camera.position.copy(tw.toPos);
				this.camera.quaternion.copy(tw.toQuat);
				this.camera.fov = tw.toFov;
				this.camera.updateProjectionMatrix();
				this.controls.target.copy(tw.lookAt);
				this.camTween = null;
			}
		}

		// character idle animation
		for (const [id, obj] of this.objects) {
			if (!obj.visible) continue;
			const rig = obj.userData.rig;
			if (!rig) continue;
			const phase = this.phase.get(id) || 0;
			const base = obj.userData.baseBodyY ?? 0;
			if (obj.userData.baseBodyY === undefined) {
				obj.userData.baseBodyY = rig.body.position.y;
			}
			rig.body.position.y = (obj.userData.baseBodyY ?? base) + Math.sin(t * 1.7 + phase) * 0.006;
			rig.head.rotation.x = Math.sin(t * 0.8 + phase) * 0.03;
			if (obj.userData.talking) {
				rig.head.rotation.x += Math.sin(t * 9) * 0.045;
				rig.head.rotation.z = Math.sin(t * 4.5) * 0.03;
			}
			if (obj.userData.item?.pose === 'wave') {
				rig.armR.rotation.z = 2.15 + Math.sin(t * 5.2 + phase) * 0.22;
			}
			if (obj.userData.item?.pose === 'talk') {
				rig.armR.rotation.x = -0.85 + Math.sin(t * 2.4 + phase) * 0.16;
			}
		}

		// particles
		if (this.particles) {
			const arr = this.particles.geometry.attributes.position.array;
			const speeds = this.particles.userData.speeds;
			const type = this.particles.userData.type;
			for (let i = 0; i < speeds.length; i++) {
				if (type === 'snow') {
					arr[i * 3 + 1] -= dt * speeds[i] * 0.7;
					arr[i * 3] += Math.sin(t + i) * dt * 0.12;
				} else if (type === 'rain') {
					arr[i * 3 + 1] -= dt * speeds[i] * 5.5;
				} else if (type === 'fireflies') {
					arr[i * 3] += Math.sin(t * 0.7 + i) * dt * 0.14;
					arr[i * 3 + 1] += Math.sin(t * 0.9 + i * 2) * dt * 0.1;
					arr[i * 3 + 2] += Math.cos(t * 0.6 + i) * dt * 0.14;
				} else {
					arr[i * 3] += Math.sin(t * 0.3 + i) * dt * 0.1;
					arr[i * 3 + 1] += Math.cos(t * 0.24 + i * 0.7) * dt * 0.04;
				}
				if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = 9 + (i % 5);
			}
			this.particles.geometry.attributes.position.needsUpdate = true;
		}
		if (this.stars) this.stars.rotation.y += dt * 0.004;

		if (this.selectionDirty) {
			this.selectionDirty = false;
			const obj = this.selectedId ? this.objects.get(this.selectedId) : null;
			if (obj && obj.visible) {
				this.selectionBox.visible = true;
				this.selectionBox.setFromObject(obj);
			} else {
				this.selectionBox.visible = false;
			}
		}

		this.renderer.render(this.scene, this.camera);
	}
}

function quatLookAt(position, target) {
	const m = new THREE.Matrix4();
	m.lookAt(position, target, new THREE.Vector3(0, 1, 0));
	return new THREE.Quaternion().setFromRotationMatrix(m);
}
