/* Full boot smoke-test: runs the real boot() with the real three.js Studio and a
   stub renderer inside jsdom — no GPU needed. */
import { setupDom, makeReporter } from './test-dom.mjs';

const window = setupDom();
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};

const report = makeReporter();
const { ok, section, summary } = report;

const canvas = document.querySelector('#c');
Object.defineProperty(canvas, 'getBoundingClientRect', {
	value: () => ({ left: 0, top: 0, width: 1024, height: 576, right: 1024, bottom: 576, x: 0, y: 0 }),
});
const viewport = document.querySelector('#viewport');
Object.defineProperty(viewport, 'clientWidth', { get: () => 1024 });
Object.defineProperty(viewport, 'clientHeight', { get: () => 576 });

window.confirm = () => true;
globalThis.confirm = window.confirm;
window.URL.createObjectURL = () => 'blob:mock';
window.URL.revokeObjectURL = () => {};
window.HTMLAnchorElement.prototype.click = function () {};
globalThis.FileReader = window.FileReader;
globalThis.File = window.File;

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

const mod = await import('../src/app.js');
const { app, boot, handleAction, renderPanel, setTab, selectItem, captureKeyframe, sampleCamera, startVN, advanceVN, setClean, startGame, exitGame, importTextureFile, applyTimeOfDay, addCameraMove } = mod.__internals;

section('Full boot');
try {
	boot({ renderer: fakeRenderer });
	ok(true, 'boot() completed without throwing');
} catch (err) {
	ok(false, 'boot() completed without throwing', err.stack);
	process.exit(1);
}

ok(!!app.studio, 'studio created');
ok(app.project.characters.length >= 2, 'demo project loaded');
ok(document.querySelector('#errorBox').hidden, 'no fatal overlay');
ok(document.querySelectorAll('#panel .card').length > 0, 'panel populated on boot');
ok(document.querySelector('#hud').innerHTML.includes('hud-card'), 'HUD rendered');
ok(app.selection === app.project.characters[0].id, 'first actor preselected');
ok(app.studio.transform.object === app.studio.objects.get(app.selection), 'gizmo attached on boot');
ok(document.querySelector('#projectName').value === app.project.name, 'project name shown');

section('Editor with the real studio');
const propBefore = app.project.props.length;
handleAction('prop-add', { dataset: { kind: 'crystal' } });
ok(app.project.props.length === propBefore + 1, 'add prop updates project');
ok(app.studio.objects.size === app.project.characters.length + app.project.props.length, 'studio objects in sync');
ok(!!app.studio.objects.get(app.selection), 'new prop is selected in the studio');

handleAction('apply-preset', { dataset: { preset: 'room' } });
ok(app.project.environment.preset === 'room', 'preset applied');
ok(app.studio.envGroup.children.length > 2, 'environment rebuilt for room');

handleAction('set-expression', { dataset: { id: app.project.characters[0].id, value: 'surprised' } });
ok(app.project.characters[0].expression === 'surprised', 'expression changed through action');
handleAction('set-pose', { dataset: { id: app.project.characters[0].id, value: 'point' } });
ok(app.project.characters[0].pose === 'point', 'pose changed through action');
ok(!!app.studio.objects.get(app.project.characters[0].id).userData.rig, 'rig survives pose change');

const texBefore = app.project.textures.length;
handleAction('tex-create', { dataset: {} });
ok(app.project.textures.length === texBefore + 1, 'texture created through action');
handleAction('tex-apply', { dataset: {} });
ok(app.project.props.at(-1).textureId === app.project.textures.at(-1).id, 'texture applied through action');

section('Camera & VN with the real studio');
setTab('camera');
app.cam.time = 1.5;
captureKeyframe();
ok(app.project.camera.keyframes.length >= 1, 'keyframe captured');
ok(sampleCamera(0.4) === true, 'camera sampling works');
app.studio.animate();
ok(app.studio.camera.fov > 1, 'camera has a valid fov');
const tl = document.querySelector('#timeline');
ok(!tl.hidden && tl.querySelector('.tl-ticks'), 'timeline present in camera tab');

startVN(0);
ok(app.playingVN, 'VN starts with the real studio');
ok(app.studio.camTween !== null || app.studio.camera.position.length() > 0, 'VN camera framing started');
app.studio.animate();
const lines = app.project.dialogue.lines.length;
for (let i = 0; i < lines * 2 + 4; i++) advanceVN();
ok(!app.playingVN, 'VN reaches the end and exits');

setClean(true, true);
ok(document.body.classList.contains('clean'), 'clean mode applies');
setClean(false, true);
ok(!document.body.classList.contains('clean'), 'clean mode removed');

section('Menu & file actions');
try {
	handleAction('help', { dataset: {} });
	ok(!document.querySelector('#modalRoot').hidden, 'help modal opens');
	handleAction('help-close', { dataset: {} });
	ok(document.querySelector('#modalRoot').hidden, 'help modal closes');

	handleAction('save', { dataset: {} });
	handleAction('export-script', { dataset: {} });
	handleAction('snapshot', { dataset: {} });
	ok(document.querySelector('#errorBox').hidden, 'save / export / snapshot do not crash');
	handleAction('load', { dataset: {} });
	ok(document.querySelector('#errorBox').hidden, 'load dialog trigger is safe');

	const savedCount = app.project.props.length;
	handleAction('prop-add', { dataset: { kind: 'rock' } });
	ok(app.project.props.length === savedCount + 1, 'prop added for undo test');
	document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }));
	ok(app.project.props.length === savedCount, 'ctrl+z undoes the prop');
	document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true, bubbles: true }));
	ok(app.project.props.length === savedCount + 1, 'ctrl+shift+z redoes the prop');

	handleAction('new-demo', { dataset: {} });
	ok(app.project.name === 'Beachside Chat', 'demo project loads');
	ok(app.studio.objects.size > 0, 'demo objects rebuilt');
	handleAction('new', { dataset: {} });
	ok(app.project.characters.length === 0 && app.project.props.length === 0, 'blank project clears scene');
	ok(app.project.camera.keyframes.length === 0, 'blank project clears camera keys');
	ok(app.studio.objects.size === 0, 'blank project clears studio objects');
	handleAction('new-demo', { dataset: {} });
	ok(app.project.characters.length >= 2, 'demo restored for remaining checks');
} catch (err) {
	ok(false, 'menu/file actions', err.stack);
}

section('POV game mode');
try {
	const aria = app.project.characters[0];
	const beforeCam = app.studio.view();
	startGame(aria.id);
	ok(!!app.game, 'POV starts');
	ok(document.body.classList.contains('game'), 'game body class applied');
	ok(!document.querySelector('#gameHud').hidden, 'game HUD visible');
	ok(!document.querySelector('#gamePad').hidden, 'gamepad visible');
	ok(document.querySelector('#ghName').textContent === aria.name, 'HUD shows the actor name');
	ok(!app.studio.objects.get(aria.id).visible, 'actor is hidden in first person');

	const startPos = app.game.pos.clone();
	app.game.setMove(0, -1);
	for (let i = 0; i < 20; i++) app.game.update(0.05);
	app.game.setMove(0, 0);
	ok(app.game.pos.distanceTo(startPos) > 0.6, 'walking moves the player');

	handleAction('game-view', { dataset: {} });
	ok(app.game.thirdPerson, 'view toggles to third person');
	ok(app.studio.objects.get(aria.id).visible, 'actor visible in third person');
	handleAction('game-view', { dataset: {} });
	ok(!app.game.thirdPerson, 'view toggles back to first person');

	const beforeJump = app.game.jumpY;
	app.game.jump();
	app.game.update(0.08);
	ok(app.game.jumpY > beforeJump, 'jump raises the player');

	const rock = app.project.props.find((p) => p.name === 'Small Rock');
	app.game.pos.set(rock.transform.p[0], 0, rock.transform.p[2] + 1.3);
	const dx = rock.transform.p[0] - app.game.pos.x;
	const dz = rock.transform.p[2] - app.game.pos.z;
	app.game.yaw = Math.atan2(-dx, -dz);
	app.game.update(0.016);
	ok(app.game.hover?.prop?.id === rock.id, 'hover finds a nearby grabbable prop');
	ok(document.querySelector('#gamePrompt').textContent.includes('Grab'), 'grab prompt shown');
	handleAction('game-grab', { dataset: {} });
	ok(app.game.holding?.prop?.id === rock.id, 'prop picked up');
	app.game.update(0.016);
	handleAction('game-grab', { dataset: {} });
	ok(!app.game.holding, 'prop dropped again');
	ok(rock.transform.p[1] === 0, 'dropped prop rests on the ground');

	handleAction('game-pad', { dataset: {} });
	ok(document.querySelector('#gamePad').hidden, 'gamepad can be hidden');
	handleAction('game-pad', { dataset: {} });
	ok(!document.querySelector('#gamePad').hidden, 'gamepad can be shown again');

	handleAction('game-run', { dataset: {} });
	ok(app.game.run, 'run button toggles running');
	handleAction('game-run', { dataset: {} });

	exitGame();
	ok(!app.game, 'POV exits');
	ok(!document.body.classList.contains('game'), 'game body class removed');
	ok(app.studio.objects.get(aria.id).visible, 'actor visible after exit');
	ok(!app.studio.locked, 'studio unlocked after exit');
	ok(!document.querySelector('#gameHud').hidden === false, 'game HUD hidden after exit');
	const afterCam = app.studio.view();
	ok(Math.abs(afterCam.p[0] - beforeCam.p[0]) < 0.01 && Math.abs(afterCam.p[2] - beforeCam.p[2]) < 0.01, 'editor camera restored');
} catch (err) {
	ok(false, 'POV game mode', err.stack);
}

section('World, camera moves & imports');
try {
	applyTimeOfDay('night');
	ok(app.project.environment.time === 'night' && app.project.environment.sun < 1, 'time of day applies');
	const kfBefore = app.project.camera.keyframes.length;
	addCameraMove('orbit');
	ok(app.project.camera.keyframes.length > kfBefore, 'quick camera move adds keyframes');

	const prop = app.project.props.at(-1);
	selectItem(prop.id);
	const texCount = app.project.textures.length;
	const file = new window.File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], 'imported-swatch.png', { type: 'image/png' });
	importTextureFile(file);
	await new Promise((r) => setTimeout(r, 60));
	ok(app.project.textures.length === texCount + 1, 'texture import adds a texture');
	ok(app.project.textures.at(-1).type === 'image' && app.project.textures.at(-1).dataUrl, 'imported texture has image data');
	ok(prop.textureId === app.project.textures.at(-1).id, 'imported texture auto-applies to the selected prop');
	ok(app.tab === 'textures', 'import switches to the Textures tab');

	setTab('scene');
	renderPanel();
	const sunPad = document.querySelector('#sunPad');
	ok(!!sunPad, 'sun compass renders');
	Object.defineProperty(sunPad, 'getBoundingClientRect', { value: () => ({ left: 100, top: 100, width: 116, height: 116, right: 216, bottom: 216, x: 100, y: 100 }) });
	const pointer = (type, el, x, y) => {
		const ev = new window.Event(type, { bubbles: true, cancelable: true });
		Object.defineProperty(ev, 'clientX', { value: x });
		Object.defineProperty(ev, 'clientY', { value: y });
		Object.defineProperty(ev, 'pointerId', { value: 11 });
		el.dispatchEvent(ev);
	};
	pointer('pointerdown', sunPad, 158, 110);
	pointer('pointermove', document, 190, 130);
	pointer('pointerup', document, 190, 130);
	ok(Number.isFinite(app.project.environment.sunAzimuth) && app.project.environment.sunAzimuth > 0, 'sun drag sets a real azimuth');
	ok(Number.isFinite(app.project.environment.sunElevation) && app.project.environment.sunElevation > 0, 'sun drag sets a real elevation');
	ok(app.project.environment.time === null, 'manual sun clears the time-of-day chip');
} catch (err) {
	ok(false, 'world & imports', err.stack);
}

section('More editor paths');
try {
	const charsBefore = app.project.characters.length;
	handleAction('char-add', { dataset: {} });
	ok(app.project.characters.length === charsBefore + 1, 'character added');
	const newChar = app.project.characters.at(-1);
	handleAction('char-randomize', { dataset: { id: newChar.id } });
	ok(!!newChar.hairStyle && !!newChar.topColor, 'randomize keeps valid params');
	handleAction('toggle-lock', { dataset: { id: newChar.id } });
	ok(!!newChar.locked, 'character locked');
	handleAction('toggle-lock', { dataset: { id: newChar.id } });
	handleAction('char-delete', { dataset: { id: newChar.id } });
	ok(app.project.characters.length === charsBefore, 'character deleted');

	const propsBefore = app.project.props.length;
	handleAction('prop-add', { dataset: { kind: 'bench' } });
	const newProp = app.project.props.at(-1);
	ok(app.project.props.length === propsBefore + 1, 'prop added');
	handleAction('item-ground', { dataset: { id: newProp.id } });
	handleAction('item-duplicate', { dataset: { id: newProp.id } });
	ok(app.project.props.length === propsBefore + 2, 'prop duplicated');
	handleAction('prop-drop', { dataset: { id: app.project.props.at(-1).id } });
	handleAction('item-delete', { dataset: { id: app.project.props.at(-1).id } });
	ok(app.project.props.length === propsBefore + 1, 'prop deleted');

	const texCount = app.project.textures.length;
	handleAction('tex-create', { dataset: {} });
	ok(app.project.textures.length === texCount + 1, 'texture created');
	const texId = app.project.textures.at(-1).id;
	selectItem(newProp.id);
	handleAction('tex-select', { dataset: { id: texId } });
	handleAction('tex-apply', { dataset: {} });
	ok(newProp.textureId === texId, 'texture applied');
	handleAction('tex-delete', { dataset: { id: texId } });
	ok(!app.project.textures.some((t) => t.id === texId), 'texture deleted');
	ok(newProp.textureId === null, 'texture reference cleared from prop');

	setTab('camera');
	handleAction('kf-capture', { dataset: {} });
	const kfCount = app.project.camera.keyframes.length;
	ok(kfCount > 0, 'keyframe captured via action');
	handleAction('kf-go', { dataset: { id: app.project.camera.keyframes[0].id } });
	handleAction('kf-update', { dataset: { id: app.project.camera.keyframes[0].id } });
	handleAction('kf-del', { dataset: { id: app.project.camera.keyframes[0].id } });
	ok(app.project.camera.keyframes.length === kfCount - 1, 'keyframe deleted');

	setTab('dialogue');
	const previewBtn = { dataset: { id: app.project.dialogue.lines[1]?.id || app.project.dialogue.lines[0].id } };
	handleAction('line-preview', previewBtn);
	ok(app.playingVN, 'line preview enters the VN');
	handleAction('vn-exit', { dataset: {} });
	ok(!app.playingVN, 'exit action leaves the VN');
} catch (err) {
	ok(false, 'more editor paths', err.stack);
}

section('Navigation');
ok(document.querySelectorAll('#rail .tab').length === 9, 'nine tools in the rail');
ok(!document.querySelector('#tabbar'), 'old flat tab bar is gone');
ok(!!document.querySelector('#topbar [data-act="vn-play"]'), 'story button is in the top bar');
ok(!!document.querySelector('#topbar [data-act="cam-play"]'), 'camera button is in the top bar');
ok(!!document.querySelector('#topbar [data-act="game-open"]'), 'POV button is in the top bar');
setTab('home');
renderPanel();
ok(!!document.querySelector('#panel .hero'), 'home screen renders the hero');
const clickEl = (el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
clickEl(document.querySelector('#rail [data-tab="play"]'));
ok(app.tab === 'play', 'rail switches to Play');
clickEl(document.querySelector('#rail [data-tab="home"]'));
ok(app.tab === 'home', 'rail returns Home');
clickEl(document.querySelector('#topbar [data-act="vn-play"]'));
ok(app.playingVN, 'top-bar Play story starts the VN');
handleAction('vn-exit', { dataset: {} });
ok(!app.playingVN, 'VN exits');

section('Panels after boot');
app.selection = app.project.characters[0].id;
for (const tab of ['home', 'characters', 'scene', 'props', 'textures', 'objects', 'dialogue', 'camera', 'play']) {
	app.tab = tab;
	renderPanel();
	ok(document.querySelector('#panel').innerHTML.length > 300, `panel renders after boot: ${tab}`);
	const ids = [...document.querySelectorAll('#panel [id]')].map((el) => el.id);
	ok(new Set(ids).size === ids.length, `panel ids are unique: ${tab}`);
	ok(!document.querySelector('#panel button button'), `no nested buttons: ${tab}`);
}
const hudText = document.querySelector('#hud').innerHTML;
ok(hudText.length > 50, 'HUD survives interactions');

const failures = summary();
process.exit(failures ? 1 : 0);
