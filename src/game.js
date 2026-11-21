// First / third-person game mode: take the POV of any actor, walk the scene,
// look around and pick props up. Runs on the Studio camera without touching
// OrbitControls (the studio is locked while the game is active).
import * as THREE from 'three';
import { characterHeight } from './lowpoly.js';
import { clamp } from './state.js';

const D2R = THREE.MathUtils.degToRad;
const R2D = THREE.MathUtils.radToDeg;
const TYPEABLE = new Set(['input', 'textarea', 'select']);

export class GameMode {
	constructor(studio, options = {}) {
		this.studio = studio;
		this.project = options.project;
		this.actor = options.actor;
		this.thirdPerson = !!options.thirdPerson;
		this.opts = options;
		this.active = false;
		this.canvas = studio.canvas;
		this.keys = new Set();
		this.move = new THREE.Vector2();
		this.yaw = 0;
		this.pitch = 0;
		this.pos = new THREE.Vector3();
		this.vy = 0;
		this.jumpY = 0;
		this.onGround = true;
		this.bob = 0;
		this.walkPhase = 0;
		this.run = false;
		this.eyeH = 1.62;
		this.baseY = 0;
		this.obstacles = [];
		this.holding = null;
		this.hover = null;
		this.saved = null;
		this.actorObj = null;
		this.lookPointer = null;
		this.lastLook = null;
		this.dragged = false;
		this.lastPrompt = null;
		this._bind();
	}

	/* ------------------------------- lifecycle ------------------------------ */
	start() {
		const st = this.studio;
		const obj = st.objects.get(this.actor.id);
		if (!obj) return false;
		this.actorObj = obj;
		this.saved = {
			view: st.view ? st.view() : null,
			target: st.controls.target.clone(),
			fov: st.camera.fov,
			rotationOrder: st.camera.rotation.order,
			actorVisible: obj.visible,
			actorRotation: obj.rotation.y,
			selected: st.selectedId,
		};
		this.pos.set(this.actor.transform.p[0], 0, this.actor.transform.p[2]);
		this.baseY = Number(this.actor.transform.p[1]) || 0;
		this.yaw = D2R(this.actor.transform.r[1] || 0) + Math.PI;
		this.pitch = 0;
		this.eyeH = characterHeight(this.actor) * 0.92;
		this.vy = 0;
		this.jumpY = 0;
		this.onGround = true;
		this.holding = null;
		this.hover = null;

		this._collectObstacles();
		st.setLocked(true);
		st.selectionBox.visible = false;
		st.camera.fov = this.thirdPerson ? 58 : 70;
		st.camera.updateProjectionMatrix();
		st.camera.rotation.order = 'YXZ';
		this.actorObj.visible = this.thirdPerson;

		this.active = true;
		document.addEventListener('keydown', this._onKeyDown, true);
		document.addEventListener('keyup', this._onKeyUp, true);
		window.addEventListener('blur', this._onBlur);
		document.addEventListener('mousemove', this._onMouseMove, true);
		this.canvas.addEventListener('click', this._onCanvasClick);
		this.canvas.addEventListener('pointerdown', this._onPointerDown);
		document.addEventListener('pointermove', this._onPointerMove, true);
		document.addEventListener('pointerup', this._onPointerUp, true);
		document.addEventListener('pointercancel', this._onPointerUp, true);

		this.update(0);
		this._emitState();
		return true;
	}

	stop() {
		if (!this.active) return false;
		this.active = false;
		document.removeEventListener('keydown', this._onKeyDown, true);
		document.removeEventListener('keyup', this._onKeyUp, true);
		window.removeEventListener('blur', this._onBlur);
		document.removeEventListener('mousemove', this._onMouseMove, true);
		this.canvas.removeEventListener('click', this._onCanvasClick);
		this.canvas.removeEventListener('pointerdown', this._onPointerDown);
		document.removeEventListener('pointermove', this._onPointerMove, true);
		document.removeEventListener('pointerup', this._onPointerUp, true);
		document.removeEventListener('pointercancel', this._onPointerUp, true);
		if (document.pointerLockElement === this.canvas) document.exitPointerLock?.();

		if (this.holding) this.drop({ silent: true });
		const st = this.studio;
		if (this.saved) {
			if (this.actorObj) {
				this.actorObj.visible = this.saved.actorVisible;
				this.actorObj.rotation.y = this.saved.actorRotation;
			}
			st.setLocked(false);
			st.camera.rotation.order = this.saved.rotationOrder || 'YXZ';
			if (this.saved.view) st.setView(this.saved.view);
			else {
				st.camera.position.fromArray(this.actor.transform.p).add(new THREE.Vector3(0, 2, 5));
				st.controls.target.set(this.actor.transform.p[0], 1, this.actor.transform.p[2]);
			}
			st.camera.fov = this.saved.fov;
			st.camera.updateProjectionMatrix();
			st.controls.target.copy(this.saved.target);
			st.camera.lookAt(this.saved.target);
			st.selectionDirty = true;
		}
		this.move.set(0, 0);
		this.keys.clear();
		this.actorObj = null;
		this.saved = null;
		return true;
	}

	/* -------------------------------- helpers ------------------------------- */
	_collectObstacles() {
		this.obstacles = [];
		const box = new THREE.Box3();
		const size = new THREE.Vector3();
		for (const prop of this.project.props) {
			if (prop.visible === false) continue;
			const obj = this.studio.objects.get(prop.id);
			if (!obj || !obj.visible) continue;
			obj.updateMatrixWorld(true);
			box.setFromObject(obj);
			box.getSize(size);
			const biggest = Math.max(size.x, size.y, size.z);
			this.obstacles.push({
				id: prop.id,
				prop,
				obj,
				r: Math.max(0.16, Math.max(size.x, size.z) * 0.42 + 0.16),
				grabbable: !prop.locked && biggest <= 1.7,
			});
		}
		for (const c of this.project.characters) {
			if (c.id === this.actor.id || c.visible === false) continue;
			const obj = this.studio.objects.get(c.id);
			if (!obj || !obj.visible) continue;
			this.obstacles.push({ id: c.id, char: c, obj, r: 0.38, grabbable: false });
		}
	}

	_forward(out = new THREE.Vector3()) {
		const cp = Math.cos(this.pitch);
		return out.set(-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp);
	}

	_right(out = new THREE.Vector3()) {
		return out.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
	}

	_treeAt(x, z) {
		const trees = this.project.environment?.groundSize ? this.project.environment.groundSize / 2 - 2 : 28;
		let nx = x;
		let nz = z;
		if (Math.abs(nx) > trees) nx = Math.sign(nx) * trees;
		if (Math.abs(nz) > trees) nz = Math.sign(nz) * trees;
		return { x: nx, z: nz };
	}

	_collide(x, z) {
		const rad = 0.34;
		for (const o of this.obstacles) {
			if (this.holding && this.holding.id === o.id) continue;
			const op = o.obj.position;
			const min = rad + o.r;
			if ((x - op.x) ** 2 + (z - op.z) ** 2 < min * min) return true;
		}
		return false;
	}

	/* --------------------------------- input -------------------------------- */
	_bind() {
		this._onKeyDown = (e) => {
			if (!this.active || e.repeat) return;
			if (TYPEABLE.has((e.target?.tagName || '').toLowerCase()) || e.target?.isContentEditable) return;
			const code = e.code || '';
			if (code === 'Escape') {
				e.preventDefault();
				this.opts.onExit?.();
				return;
			}
			if (code === 'KeyE') {
				e.preventDefault();
				this.grab();
				return;
			}
			if (code === 'KeyF') {
				e.preventDefault();
				this.setView(!this.thirdPerson);
				return;
			}
			if (code === 'Space') {
				e.preventDefault();
				this.jump();
				return;
			}
			if (code === 'ShiftLeft' || code === 'ShiftRight') this.run = true;
			if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(code)) {
				e.preventDefault();
				this.keys.add(code);
				this._emitState();
			}
		};
		this._onKeyUp = (e) => {
			if (!this.active) return;
			this.keys.delete(e.code);
			if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.run = false;
			this._emitState();
		};
		this._onMouseMove = (e) => {
			if (!this.active || document.pointerLockElement !== this.canvas) return;
			this.look(e.movementX || 0, e.movementY || 0, 1);
		};
		this._onCanvasClick = () => {
			if (!this.active || document.pointerLockElement === this.canvas) return;
			if (this.dragged) {
				this.dragged = false;
				return;
			}
			try {
				const p = this.canvas.requestPointerLock?.();
				if (p && typeof p.catch === 'function') p.catch(() => {});
			} catch {
				/* pointer lock can be unavailable (iOS / embedded webviews) — drag-look still works */
			}
		};
		this._onPointerDown = (e) => {
			if (!this.active) return;
			if (e.pointerType === 'mouse' && document.pointerLockElement === this.canvas) return;
			this.lookPointer = e.pointerId;
			this.lastLook = { x: e.clientX, y: e.clientY };
			this.dragged = false;
			this.canvas.setPointerCapture?.(e.pointerId);
		};
		this._onPointerMove = (e) => {
			if (!this.active || this.lookPointer !== e.pointerId || !this.lastLook) return;
			const dx = e.clientX - this.lastLook.x;
			const dy = e.clientY - this.lastLook.y;
			this.lastLook = { x: e.clientX, y: e.clientY };
			if (Math.hypot(dx, dy) > 1.5) this.dragged = true;
			this.look(dx, dy, 2.4);
		};
		this._onPointerUp = (e) => {
			if (this.lookPointer === e.pointerId) {
				this.lookPointer = null;
				this.lastLook = null;
			}
		};
		this._onBlur = () => {
			this.keys.clear();
			this.move.set(0, 0);
			this.run = false;
			this._emitState();
		};
	}

	look(dx, dy, sens = 1) {
		const k = 0.0026 * sens;
		this.yaw -= dx * k;
		this.pitch = clamp(this.pitch - dy * k, -1.35, 1.35);
	}

	setMove(x, y) {
		this.move.set(clamp(x, -1, 1), clamp(y, -1, 1));
	}

	setRun(on) {
		this.run = !!on;
		this._emitState();
	}

	jump() {
		if (!this.onGround) return;
		this.vy = 3.4;
		this.onGround = false;
	}

	setView(thirdPerson) {
		this.thirdPerson = !!thirdPerson;
		if (this.actorObj) this.actorObj.visible = this.thirdPerson;
		this.studio.camera.fov = this.thirdPerson ? 58 : 70;
		this.studio.camera.updateProjectionMatrix();
		this._emitState();
	}

	/* --------------------------------- grab --------------------------------- */
	grab() {
		if (this.holding) return this.drop();
		if (!this.hover) {
			this.opts.onToast?.('Walk closer to a prop and face it, then grab.');
			return false;
		}
		if (!this.hover.grabbable) {
			this.opts.onToast?.(`${this.hover.prop.name} is too heavy to lift — try a smaller prop.`);
			return false;
		}
		const { prop, obj } = this.hover;
		this.holding = {
			id: prop.id,
			prop,
			obj,
			rotation: obj.rotation.clone(),
			position: obj.position.clone(),
			scale: obj.scale.clone(),
		};
		this.hover = null;
		this.opts.onToast?.(`Picked up ${prop.name}`);
		this._emitPrompt();
		this._emitState();
		return true;
	}

	drop({ silent = false } = {}) {
		if (!this.holding) return false;
		const { prop, obj, rotation } = this.holding;
		const p = obj.position;
		prop.transform.p = [Math.round(p.x * 100) / 100, 0, Math.round(p.z * 100) / 100];
		prop.transform.r = [Math.round(R2D(rotation.x) * 10) / 10, Math.round(R2D(rotation.y) * 10) / 10, Math.round(R2D(rotation.z) * 10) / 10];
		this.studio.updateTransform(this.project, prop.id);
		this.opts.onDrop?.(prop);
		this.holding = null;
		if (!silent) this.opts.onToast?.(`Dropped ${prop.name}`);
		this._emitPrompt();
		this._emitState();
		return true;
	}

	/* --------------------------------- update ------------------------------- */
	update(dt) {
		if (!this.active) return;
		const st = this.studio;
		const step = Math.min(0.05, Math.max(0, dt));

		// ---- movement intent
		let fwd = 0;
		let side = 0;
		if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) fwd += 1;
		if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) fwd -= 1;
		if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) side += 1;
		if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) side -= 1;
		fwd += -this.move.y;
		side += this.move.x;
		const mag = Math.hypot(fwd, side);
		if (mag > 1) {
			fwd /= mag;
			side /= mag;
		}
		const running = this.run || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
		const speed = running ? 4.7 : 2.45;
		const forward = this._forward(new THREE.Vector3());
		const right = this._right(new THREE.Vector3());
		const dx = (forward.x * fwd + right.x * side) * speed * step;
		const dz = (forward.z * fwd + right.z * side) * speed * step;

		if (Math.abs(dx) > 1e-6 || Math.abs(dz) > 1e-6) {
			// slide against props: try full move, then each axis
			const b = this._treeAt(this.pos.x + dx, this.pos.z + dz);
			if (!this._collide(b.x, b.z)) {
				this.pos.x = b.x;
				this.pos.z = b.z;
			} else if (!this._collide(b.x, this.pos.z)) {
				this.pos.x = b.x;
			} else if (!this._collide(this.pos.x, b.z)) {
				this.pos.z = b.z;
			}
			this.walkPhase += step * (running ? 13 : 8.5);
			this.bob = Math.sin(this.walkPhase) * (running ? 0.035 : 0.022);
		} else {
			this.bob *= Math.max(0, 1 - step * 8);
		}

		// ---- jump
		if (!this.onGround) {
			this.vy -= 17 * step;
			this.jumpY += this.vy * step;
			if (this.jumpY <= 0) {
				this.jumpY = 0;
				this.vy = 0;
				this.onGround = true;
			}
		}

		// ---- place the camera
		const eyeY = this.baseY + this.eyeH + this.jumpY + this.bob;
		st.camera.position.set(this.pos.x, eyeY, this.pos.z);
		right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
		if (this.thirdPerson) {
			const head = new THREE.Vector3(this.pos.x, eyeY + 0.12, this.pos.z);
			const camPos = head.clone().addScaledVector(forward, -2.9);
			camPos.y = Math.max(0.45, camPos.y);
			st.camera.position.copy(camPos);
			st.camera.lookAt(head.x, head.y, head.z);
			if (this.actorObj) this.actorObj.rotation.y = this.yaw + Math.PI;
		} else {
			st.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
		}

		// ---- carry / hover
		if (this.holding) {
			const obj = this.holding.obj;
			const anchor = this.thirdPerson
				? new THREE.Vector3(this.pos.x, this.baseY + this.eyeH * 0.62 + this.jumpY, this.pos.z).addScaledVector(forward, 0.95)
				: st.camera.position.clone().addScaledVector(forward, 1.15).addScaledVector(right, 0.28);
			anchor.y -= 0.28;
			obj.position.copy(anchor);
			obj.rotation.set(0, this.yaw + Math.PI / 2, 0);
			this.hover = null;
		} else {
			this._findHover(forward);
		}
		this._emitPrompt();

		// ---- safety: keep player inside the world and above ground
		const lim = this.project.environment?.groundSize ? this.project.environment.groundSize / 2 - 1 : 30;
		this.pos.x = clamp(this.pos.x, -lim, lim);
		this.pos.z = clamp(this.pos.z, -lim, lim);
	}

	_findHover(forward) {
		let best = null;
		let bestScore = -1;
		const eye = new THREE.Vector3(this.pos.x, this.baseY + this.eyeH + this.jumpY, this.pos.z);
		for (const o of this.obstacles) {
			if (!o.grabbable) continue;
			const p = o.obj.position;
			const to = new THREE.Vector3(p.x - eye.x, 0, p.z - eye.z);
			const dist = to.length();
			if (dist > 2.6 || dist < 0.05) continue;
			to.divideScalar(dist);
			const facing = to.x * forward.x + to.z * forward.z;
			if (facing < 0.35) continue;
			const score = facing - dist * 0.12;
			if (score > bestScore) {
				best = o;
				bestScore = score;
			}
		}
		this.hover = best;
	}

	_emitPrompt() {
		let text = '';
		if (this.holding) text = 'E · Drop';
		else if (this.hover) text = `E · Grab ${this.hover.prop.name}`;
		if (text === this.lastPrompt) return;
		this.lastPrompt = text;
		this.opts.onPrompt?.(text);
	}

	_emitState() {
		this.opts.onState?.({
			thirdPerson: this.thirdPerson,
			running: this.run || this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'),
			holding: !!this.holding,
		});
	}

	describeHover() {
		return this.hover ? this.hover.prop.name : '';
	}
}
