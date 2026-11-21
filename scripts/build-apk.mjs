// One-command Android build: prepare www/, ensure the android project exists,
// sync Capacitor, then run Gradle and copy the APK into dist/.
//
//   npm run apk            -> debug APK
//   npm run apk -- --release  -> release APK (needs android/keystore.properties)
//
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const release = process.argv.includes('--release');
const isWin = process.platform === 'win32';
const gradle = isWin ? 'gradlew.bat' : './gradlew';

function run(cmd, args, cwd = root) {
	console.log(`\n$ ${cmd} ${args.join(' ')}`);
	const res = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: isWin });
	if (res.error) throw res.error;
	if (res.status !== 0) process.exit(res.status ?? 1);
}

if (!fs.existsSync(path.join(root, 'android'))) {
	console.log('No android/ project yet — adding it with Capacitor…');
	run('npx', ['cap', 'add', 'android']);
}

run('node', ['scripts/prepare-www.mjs']);
run('npx', ['cap', 'sync', 'android']);

const androidDir = path.join(root, 'android');
if (!isWin) {
	try {
		fs.chmodSync(path.join(androidDir, 'gradlew'), 0o755);
	} catch {
		/* ignore */
	}
}

run(gradle, [release ? 'assembleRelease' : 'assembleDebug', '--no-daemon'], androidDir);

const variant = release ? 'release' : 'debug';
const candidates = [
	path.join(androidDir, 'app', 'build', 'outputs', 'apk', variant, `app-${variant}.apk`),
	path.join(androidDir, 'app', 'build', 'outputs', 'apk', variant, 'app-release-unsigned.apk'),
];
const apk = candidates.find((p) => fs.existsSync(p));

if (!apk) {
	console.error('\n✖ Build finished but no APK was found. Check the Gradle output above.');
	process.exit(1);
}

const dist = path.join(root, 'dist');
fs.mkdirSync(dist, { recursive: true });
const target = path.join(dist, `lowpoly-studio-${variant}.apk`);
fs.copyFileSync(apk, target);
const size = (fs.statSync(target).size / 1024 / 1024).toFixed(1);
console.log(`\n✓ APK ready: dist/lowpoly-studio-${variant}.apk (${size} MB)`);
if (release) console.log('  Reminder: release builds must be signed before installing on a device.');
