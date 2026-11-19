import { spawnSync } from "node:child_process";
import { closeSync, existsSync, mkdtempSync, openSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoDir = resolve(appDir, "../..");
const androidDir = join(appDir, "android");
const electronDir = join(appDir, "electron");
const platformName = "@capawesome/capacitor-electron";
const isWindows = process.platform === "win32";

function run(command, args, cwd, label) {
	const logDir = mkdtempSync(join(tmpdir(), "super-chat-build-"));
	const logPath = join(logDir, "command.log");
	const fd = openSync(logPath, "w");
	console.log(`${label}…`);
	const result = spawnSync(command, args, {
		cwd,
		stdio: ["ignore", fd, fd],
		shell: isWindows,
		windowsHide: true,
	});
	closeSync(fd);

	if (result.error || result.status !== 0) {
		const log = readFileSync(logPath, "utf8").trim().split("\n");
		console.error(`${label} failed${result.error ? `: ${result.error.message}` : ` (exit ${result.status})`}. Last build output:`);
		console.error(log.slice(-35).join("\n"));
		console.error(`Full log: ${logPath}`);
		process.exit(result.status || 1);
	}

	rmSync(logDir, { recursive: true, force: true });
	console.log(`${label} complete.`);
}

function runInteractive(command, args, cwd, label) {
	console.log(`${label}…`);
	const result = spawnSync(command, args, {
		cwd,
		stdio: "inherit",
		shell: isWindows,
		windowsHide: true,
	});
	if (result.error || result.status !== 0) {
		throw new Error(`${label} failed${result.error ? `: ${result.error.message}` : ` (exit ${result.status})`}.`);
	}
}

function pnpm(args, cwd, label) {
	run(isWindows ? "pnpm.cmd" : "pnpm", args, cwd, label);
}

function pnpmInteractive(args, cwd, label) {
	runInteractive(isWindows ? "pnpm.cmd" : "pnpm", args, cwd, label);
}

function npm(args, cwd, label) {
	run(isWindows ? "npm.cmd" : "npm", args, cwd, label);
}

function buildLibrary() {
	pnpm(["--dir", repoDir, "build"], repoDir, "Building super-chat library");
}

function buildWeb(platform = "web") {
	buildLibrary();
	pnpm(["exec", "tsc", "--noEmit"], appDir, "Checking standalone TypeScript");
	pnpm(["exec", "vite", "build", "--config", "vite.config.ts", "--mode", platform], appDir, `Building ${platform} renderer`);
}

function syncAndroid() {
	buildWeb("android");
	pnpm(["exec", "cap", "sync", "android"], appDir, "Syncing Android project");
}

function ensureAndroidProject() {
	if (!exists(join(androidDir, "gradlew")) && !exists(join(androidDir, "gradlew.bat"))) {
		throw new Error("Android project is missing. Run `pnpm --filter @super-chat/standalone add:android` first.");
	}
}

function addDesktop() {
	if (!exists(join(electronDir, "package.json"))) {
		buildWeb("desktop");
		pnpm(["exec", "cap", "add", platformName], appDir, "Adding Capacitor desktop platform");
	}
	npm(["install"], electronDir, "Installing desktop build dependencies");
}

function exists(path) {
	return existsSync(path);
}

function syncDesktop() {
	if (!exists(join(electronDir, "package.json"))) {
		throw new Error("Desktop project is missing. Run `pnpm --filter @super-chat/standalone add:desktop` first.");
	}
	buildWeb("desktop");
	npm(["ci"], electronDir, "Installing locked desktop dependencies");
	pnpm(["exec", "cap", "sync", platformName], appDir, "Syncing desktop project");
}

function buildAndroid(task) {
	ensureAndroidProject();
	syncAndroid();
	const gradle = isWindows ? "gradlew.bat" : "./gradlew";
	const gradleTask = {
		"android:debug": "assembleDebug",
		"android:release-apk": "assembleRelease",
		"android:release-aab": "bundleRelease",
	}[task];
	run(gradle, [gradleTask], androidDir, `Building Android ${task.slice("android:".length)}`);
}

function buildDesktop(task) {
	const currentPlatform = { darwin: "mac", win32: "windows", linux: "linux" }[process.platform];
	const requestedPlatform = task.split(":")[1];
	if (requestedPlatform !== currentPlatform) {
		throw new Error(`Desktop ${requestedPlatform} packages must be built on ${requestedPlatform}; this host is ${currentPlatform ?? process.platform}.`);
	}
	syncDesktop();
	const [, os, target, architecture] = task.split(":");
	const electronBuilderArgs = [`--${os === "windows" ? "win" : os}`, target];
	if (architecture) electronBuilderArgs.push(`--${architecture}`);
	npm(["run", "pack", "--", ...electronBuilderArgs], electronDir, `Building desktop ${os} ${target}${architecture ? ` (${architecture})` : ""}`);
}

const command = process.argv[2];
const desktopTargets = new Set([
	"desktop:mac:dmg:arm64",
	"desktop:mac:dmg:x64",
	"desktop:mac:zip:arm64",
	"desktop:windows:nsis",
	"desktop:windows:portable",
	"desktop:linux:appimage",
	"desktop:linux:deb",
]);

try {
	if (command === "dev:web") {
		buildLibrary();
		pnpmInteractive(["exec", "vite", "--config", "vite.config.ts"], appDir, "Starting web development server");
	} else if (command === "web") {
		buildWeb();
	} else if (command === "add:desktop") {
		addDesktop();
	} else if (command === "sync:android") {
		syncAndroid();
	} else if (command === "run:android") {
		syncAndroid();
		pnpmInteractive(["exec", "cap", "run", "android"], appDir, "Launching Android app");
	} else if (command === "run:desktop") {
		syncDesktop();
		pnpmInteractive(["exec", "cap", "run", platformName], appDir, "Launching desktop app");
	} else if (command === "clean:web") {
		rmSync(join(appDir, "dist"), { recursive: true, force: true });
		console.log("Removed standalone web build.");
	} else if (command === "clean:android") {
		ensureAndroidProject();
		run(isWindows ? "gradlew.bat" : "./gradlew", ["clean"], androidDir, "Cleaning Android build");
	} else if (command?.startsWith("android:")) {
		buildAndroid(command);
	} else if (desktopTargets.has(command)) {
		buildDesktop(command);
	} else {
		throw new Error(`Unknown build target: ${command ?? "(missing)"}`);
	}
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}
