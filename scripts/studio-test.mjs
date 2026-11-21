/* Exercises the real three.js Studio (environment, scene graph, gizmo, camera math)
   with a stub renderer, so no GPU is required. */
import { setupDom, makeReporter } from './test-dom.mjs';

setupDom();
globalThis.requestAnimationFrame = () => 0;

const THREE = await import('three');
const { Studio } = await import('../src/engine.js');
const state = await import('../src/state.js');

const report = makeReporter();
const { ok, section, summary } = report;

const wrapper = document.createElement('div');
document.body.appendChild(wrapper);
const parent = document.createElement('div');
wrapper.appendChild(parent);
const canvas = document.createElement('canvas');
parent.appendChild(canvas);
Object.defineProperty(parent, 'clientWidth', { value: 1024 });
Object.defineProperty(parent, 'clientHeight', { value: 576 });
Object.defineProperty(canvas, 'getBoundingClientRect', {
	value: () => ({ left: 0, top: 0, width: 1024, height: 576, right: 1024, bottom: 576, x: 0, y: 0 }),
});

const fakeRenderer = {
	domElement: canvas,
	shadowMap: { enabled: false, type: 0 },
	outputColorSpace: '',
	toneMapping: 0,
	toneMappingExposure: 1,
	setPixelRatio() {},
	setSize() {},
	render() {},
	capabilities: { isWebGL2: true },
};

section('Studio construction');
let studio;
try {
	studio = new Studio(canvas, { renderer: fakeRenderer });
	ok(true, 'Studio constructed with stub renderer');
} catch (err) {
	ok(false, 'Studio constructed with stub renderer', err.stack);
}
ok(!!studio.camera && studio.camera.isPerspectiveCamera, 'perspective camera');
ok(!!studio.controls && studio.controls.target, 'orbit controls');
ok(!!studio.transform && !!studio.transformHelper, 'transform gizmo + helper');
ok(studio.scene.children.length > 5, 'lights/scene populated');

section('Environment presets');
const baseEnv = state.defaultProject().environment;
for (const preset of ['studio', 'beach', 'forest', 'nightcity', 'room', 'space', 'void']) {
	const env = { ...baseEnv, preset };
	try {
		studio.setEnvironment(env, state.defaultProject());
		const names = studio.envGroup.children.map((c) => c.name || c.type);
		ok(studio.envGroup.children.length > 0, `env builds: ${preset} (${names.slice(0, 4).join(',')})`);
	} catch (err) {
		ok(false, `env builds: ${preset}`, err.stack);
	}
}
try {
	const env = { ...baseEnv, preset: 'beach', particles: 'snow', showGrid: true, fog: 0.02 };
	studio.setEnvironment(env, state.defaultProject());
	ok(!!studio.particles, 'particles created');
	studio.updateLighting({ ...env, sun: 2.2 });
	ok(Math.abs(studio.sun.intensity - 2.2) < 0.001, 'updateLighting changes sun');
	studio.setEnvironment({ ...baseEnv, preset: 'space' }, state.defaultProject());
	ok(!!studio.stars, 'space stars created');
} catch (err) {
	ok(false, 'environment extras', err.stack);
}

section('Scene graph');
const project = state.defaultProject();
try {
	studio.rebuildAll(project);
	ok(studio.objects.size === project.characters.length + project.props.length, 'all items built');
	const charObj = studio.objects.get(project.characters[0].id);
	ok(!!charObj && charObj.userData.kind === 'char', 'character object exists');
	ok(!!charObj.userData.rig?.head, 'character rig exists');
	studio.select(project.characters[0].id);
	ok(studio.transform.object === charObj, 'gizmo attaches to selection');
	studio.select(project.props[0].id);
	ok(studio.transform.object === studio.objects.get(project.props[0].id), 'gizmo switches to prop');
	studio.select(null);
	ok(studio.transform.object === undefined, 'gizmo detaches');
	studio.select(project.props[0].id);
	studio.setVisible(project.props[0].id, false);
	ok(studio.objects.get(project.props[0].id).visible === false, 'setVisible works');
	studio.setVisible(project.props[0].id, true);
} catch (err) {
	ok(false, 'scene graph operations', err.stack);
}

section('Transforms & camera helpers');
try {
	const c = project.characters[0];
	c.transform.p = [2, 0, -1];
	c.transform.r = [0, 45, 0];
	c.transform.s = 1.2;
	studio.updateTransform(project, c.id);
	const obj = studio.objects.get(c.id);
	ok(Math.abs(obj.position.x - 2) < 1e-6 && Math.abs(obj.position.z + 1) < 1e-6, 'numeric transform applied');
	ok(Math.abs(obj.rotation.y - THREE.MathUtils.degToRad(45)) < 1e-6, 'rotation applied');
	ok(Math.abs(obj.scale.x - 1.2) < 1e-6, 'scale applied');

	studio.frameObject(c.id);
	ok(Math.abs(studio.controls.target.x - 2) < 0.35 && Math.abs(studio.controls.target.z + 1) < 0.35, 'frameObject retargets orbit');
	studio.frameAll();
	ok(studio.camera.position.length() > 0, 'frameAll positions camera');

	studio.camera.position.set(4, 2, 6);
	studio.camera.rotation.set(0, 0, 0);
	const v = studio.view();
	ok(v.p.length === 3 && v.r.length === 3 && v.fov > 0, 'view snapshot shape');
	studio.setView({ p: [1, 2, 3], r: [-10, 30, 0], fov: 50 });
	ok(Math.abs(studio.camera.position.x - 1) < 1e-6 && Math.abs(studio.camera.fov - 50) < 1e-6, 'setView applies');

	// regression: a view with only a look-at target (as stored in the demo project) must frame the scene
	const demo = state.defaultProject();
	const targetView = demo.view;
	ok(!Array.isArray(targetView.r) && Array.isArray(targetView.target), 'demo view uses a look-at target');
	studio.setView(targetView);
	const c0 = studio.objects.get(demo.characters[0].id);
	if (c0) {
		studio.camera.aspect = 16 / 9;
		studio.camera.updateProjectionMatrix();
		studio.camera.updateMatrixWorld();
		const ndc = new THREE.Vector3().copy(c0.position).setY(1).project(studio.camera);
		ok(Math.abs(ndc.x) < 0.9 && Math.abs(ndc.y) < 0.95, 'demo characters framed by the initial view', `ndc ${ndc.x.toFixed(2)},${ndc.y.toFixed(2)}`);
	} else {
		ok(false, 'demo characters framed by the initial view', 'character object missing');
	}

	studio.applyKeyframe({ p: [0, 3, 5], r: [-8, 12, 0], fov: 42 });
	ok(Math.abs(studio.camera.position.y - 3) < 1e-6, 'applyKeyframe applies');

	const shot = studio.characterShot(c.id, 'medium');
	ok(!!shot && shot.pos.distanceTo(shot.look) > 0.5, 'characterShot returns a camera pose');
	const two = studio.twoShot(project.characters.map((x) => x.id));
	ok(!!two && two.pos.y > 0, 'twoShot returns a camera pose');

	studio.tweenTo(new THREE.Vector3(1, 2, 3), new THREE.Vector3(0, 1, 0), 0.5, 50);
	ok(!!studio.camTween, 'camera tween created');
	studio.animate();
	studio.finishTween();
	ok(Math.abs(studio.camera.fov - 50) < 0.01, 'camera tween finishes with target fov');
	ok(Math.abs(studio.camera.position.x - 1) < 0.01, 'camera tween finishes at target position');
	studio.stopTween();

	studio.setDimmed([]);
	studio.setDimmed([c.id]);
	studio.setDimmed([]);
	ok(true, 'dimming does not throw');
	studio.updateRig({ ...c, pose: 'wave', expression: 'surprised' });
	ok(!!studio.objects.get(c.id).userData.rig, 'updateRig keeps rig');
	ok(studio.objects.get(c.id).userData.baseBodyY !== undefined, 'pose baseline tracked');

	studio.setGizmoMode('rotate');
	studio.setGizmoMode('scale');
	studio.setGizmoMode('translate');
	studio.setGizmoSnap(true);
	studio.setGizmoSnap(false);
	studio.setLocked(true);
	ok(studio.pickEnabled === false, 'lock disables picking');
	studio.setLocked(false);
	ok(studio.pickEnabled === true, 'unlock enables picking');

	studio.rebuildItem(project, c, 'char');
	ok(!!studio.objects.get(c.id), 'rebuildItem replaces object');
	studio.removeItem(c.id);
	ok(!studio.objects.has(c.id), 'removeItem deletes object');
	studio.rebuildAll(project);
	ok(studio.objects.size === project.characters.length + project.props.length, 'rebuildAll restores everything');
} catch (err) {
	ok(false, 'transform/camera helpers', err.stack);
}

section('Render loop');
try {
	studio.animate();
	studio.animate();
	ok(true, 'animate frames run without a GPU');
	studio.animate();
	ok(true, 'repeated animate is stable');
} catch (err) {
	ok(false, 'animate frame', err.stack);
}

const failures = summary();
if (failures) process.exit(1);
