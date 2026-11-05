#!/usr/bin/env node
/**
 * Export JUPEB Master WebView localStorage through Android's local DevTools
 * socket. This is designed for the legacy 1.1.94 debug APK so its device-only
 * learning data can be imported into a newer signed build before uninstall.
 *
 * It reads only localStorage records belonging to the selected Supabase user,
 * plus an allowlist of legacy learning keys. It never exports the auth-token
 * storage entry. It does not install, uninstall, clear, or modify the app.
 *
 * Usage:
 *   node scripts/android-localstorage-rescue.mjs
 *   node scripts/android-localstorage-rescue.mjs --user-id <uuid>
 *   node scripts/android-localstorage-rescue.mjs --output ./my-backup.json
 */
import { createServer } from 'node:net';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, writeFile, chmod } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

const PACKAGE_ID = 'com.jupeb.master';
const BACKUP_FORMAT = 'jupeb-master-user-backup';
const BACKUP_VERSION = 1;
const MAX_BACKUP_BYTES = 12 * 1024 * 1024;
const LEGACY_DEVICE_DATA_KEYS = [
  'jupeb_study_bookmarks',
  'jupeb-study-progress',
  'jupeb_streak_data',
  'jupeb_achievements_unlocked',
  'jupeb_syllabus_progress',
  'jupeb-chat-hub',
];
const CREDENTIAL_KEY_PATTERN = /(token|secret|password|credential|api[-_]?key)/i;

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    windowsHide: true,
    timeout: 20_000,
    ...options,
  });
  if (result.error) throw new Error(`Could not run ${command}: ${result.error.message}`);
  return result;
}

function assertAdbAvailable() {
  const result = run('adb', ['version']);
  if (result.status !== 0) throw new Error('Android Platform Tools (adb) are not available on PATH.');
}

function selectDevice() {
  const result = run('adb', ['devices']);
  if (result.status !== 0) throw new Error(result.stderr || 'Could not list Android devices.');
  const devices = result.stdout.split(/\r?\n/)
    .slice(1)
    .map(line => line.trim().split(/\s+/))
    .filter(parts => parts.length >= 2 && parts[1] === 'device')
    .map(parts => parts[0]);
  if (devices.length !== 1) {
    throw new Error(
      devices.length === 0
        ? 'No authorized Android device found. Connect the phone, unlock it, enable USB debugging and approve the computer.'
        : 'More than one authorized Android device is connected. Disconnect the others and retry.',
    );
  }
  return devices[0];
}

function adb(serial, args, options = {}) {
  return run('adb', ['-s', serial, ...args], options);
}

function ensureLegacyPackage(serial) {
  const path = adb(serial, ['shell', 'pm', 'path', PACKAGE_ID]);
  if (path.status !== 0 || !path.stdout.includes('package:')) {
    throw new Error('JUPEB Master (com.jupeb.master) is not installed on the connected device.');
  }

  // run-as is a real device-side permission check, not an assumption based on
  // the downloaded APK alone. It works only while this installed build remains
  // debuggable. We never try to gain root or bypass Android sandboxing.
  const check = adb(serial, ['shell', 'run-as', PACKAGE_ID, 'id']);
  if (check.status !== 0 || !/uid=\d+/.test(check.stdout)) {
    throw new Error(
      'Android refused run-as for this installation. This installed copy may not be the debuggable legacy build. Stop here; do not uninstall it.',
    );
  }
}

async function reservePort() {
  return await new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(error => error ? reject(error) : resolvePort(port));
    });
  });
}

async function connectDevTools(serial) {
  const pidResult = adb(serial, ['shell', 'pidof', PACKAGE_ID]);
  const pids = pidResult.stdout.trim().split(/\s+/).filter(value => /^\d+$/.test(value));
  if (pidResult.status !== 0 || pids.length === 0) {
    throw new Error('Open JUPEB Master on the phone and keep it on a signed-in screen, then retry.');
  }

  if (typeof WebSocket === 'undefined') {
    throw new Error('Node.js 22 or newer is required because its built-in WebSocket client is used.');
  }

  for (const pid of pids) {
    const port = await reservePort();
    const forward = adb(serial, ['forward', `tcp:${port}`, `localabstract:webview_devtools_remote_${pid}`]);
    if (forward.status !== 0) continue;

    try {
      let targets = null;
      for (let attempt = 0; attempt < 8; attempt += 1) {
        try {
          const response = await fetch(`http://127.0.0.1:${port}/json/list`);
          if (response.ok) {
            targets = await response.json();
            if (Array.isArray(targets) && targets.some(target => target.webSocketDebuggerUrl)) break;
          }
        } catch {
          // The WebView socket may appear just after the ADB forward is ready.
        }
        await delay(250);
      }

      const target = Array.isArray(targets)
        ? targets.find(item => item.type === 'page' && item.webSocketDebuggerUrl)
          ?? targets.find(item => item.webSocketDebuggerUrl)
        : null;
      if (target) {
        const url = new URL(target.webSocketDebuggerUrl);
        url.hostname = '127.0.0.1';
        url.port = String(port);
        return { port, target, webSocketUrl: url.toString() };
      }
    } catch {
      // Try the next app process if this PID has no debuggable WebView.
    }

    adb(serial, ['forward', '--remove', `tcp:${port}`]);
  }

  throw new Error(
    'No debuggable WebView was exposed by this installation. Keep the old app installed. ' +
    'This can happen with an older Android System WebView or a different APK build; do not uninstall to test it.',
  );
}

class DevToolsClient {
  constructor(url) {
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
    this.socket = null;
  }

  async connect() {
    this.socket = new WebSocket(this.url);
    await new Promise((resolveSocket, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out connecting to the JUPEB WebView.')), 8_000);
      this.socket.addEventListener('open', () => {
        clearTimeout(timeout);
        resolveSocket();
      }, { once: true });
      this.socket.addEventListener('error', () => {
        clearTimeout(timeout);
        reject(new Error('Could not connect to the local WebView DevTools socket.'));
      }, { once: true });
      this.socket.addEventListener('message', event => {
        let message;
        try { message = JSON.parse(String(event.data)); } catch { return; }
        if (!message.id || !this.pending.has(message.id)) return;
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message || 'WebView DevTools command failed.'));
        else resolve(message.result);
      });
      this.socket.addEventListener('close', () => {
        for (const { reject } of this.pending.values()) reject(new Error('WebView DevTools connection closed.'));
        this.pending.clear();
      });
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolveCommand, rejectCommand) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        rejectCommand(new Error(`WebView DevTools timed out: ${method}`));
      }, 12_000);
      this.pending.set(id, {
        resolve: value => { clearTimeout(timeout); resolveCommand(value); },
        reject: error => { clearTimeout(timeout); rejectCommand(error); },
      });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async close() {
    if (!this.socket) return;
    try { this.socket.close(); } catch { /* no-op */ }
  }
}

const EXPORT_EXPRESSION = `(() => {
  const authUserIds = new Set();
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key || !/^sb-.+-auth-token$/.test(key)) continue;
    try {
      const session = JSON.parse(localStorage.getItem(key) || 'null');
      const id = session && session.user && session.user.id;
      if (typeof id === 'string' && id.length > 0) authUserIds.add(id);
    } catch {
      // Ignore malformed auth storage. Auth values are never included below.
    }
  }

  const namespaceUserIds = new Set();
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    const match = key && key.match(/^u:([^:]+):/);
    if (match) namespaceUserIds.add(match[1]);
  }

  const authIds = Array.from(authUserIds);
  const namespaceIds = Array.from(namespaceUserIds);
  const userId = __USER_ID__ || (authIds.length === 1 ? authIds[0] : (namespaceIds.length === 1 ? namespaceIds[0] : null));
  if (!userId) {
    return { error: 'Could not identify one account safely.', authUserIds: authIds, namespaceUserIds: namespaceIds };
  }
  if (authIds.length > 0 && !authUserIds.has(userId)) {
    return { error: 'The selected account does not match the signed-in Supabase account.' };
  }

  const credentialKey = /(token|secret|password|credential|api[-_]?key)/i;
  const entries = {};
  const prefix = 'u:' + userId + ':';
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key || !key.startsWith(prefix) || credentialKey.test(key)) continue;
    const value = localStorage.getItem(key);
    if (value !== null) entries[key] = value;
  }

  const legacyKeys = [
    'jupeb_study_bookmarks',
    'jupeb-study-progress',
    'jupeb_streak_data',
    'jupeb_achievements_unlocked',
    'jupeb_syllabus_progress',
    'jupeb-chat-hub'
  ];
  const legacyEntries = {};
  for (const key of legacyKeys) {
    const value = localStorage.getItem(key);
    if (value !== null) legacyEntries[key] = value;
  }

  return {
    format: 'jupeb-master-user-backup',
    version: 1,
    userId,
    exportedAt: new Date().toISOString(),
    entries,
    deviceShared: {
      legacyBookmarks: legacyEntries['jupeb_study_bookmarks'] || null,
      legacyEntries
    },
    summary: {
      accountEntries: Object.keys(entries).length,
      legacyEntries: Object.keys(legacyEntries).length
    }
  };
})()`;

async function exportBackup(client, requestedUserId, outputPath) {
  const expression = EXPORT_EXPRESSION.replace('__USER_ID__', JSON.stringify(requestedUserId || null));
  const evaluated = await client.send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
    userGesture: false,
  });
  const value = evaluated?.result?.value;
  if (!value || typeof value !== 'object') throw new Error('The WebView did not return a readable backup result.');
  if (value.error) {
    const candidates = [...(value.authUserIds || []), ...(value.namespaceUserIds || [])];
    const uniqueCandidates = [...new Set(candidates)];
    const suffix = uniqueCandidates.length ? ` Candidate account IDs: ${uniqueCandidates.join(', ')}` : '';
    throw new Error(value.error + suffix + ' Retry with --user-id <UUID> only after confirming the account in the app.');
  }

  const backup = {
    format: value.format,
    version: value.version,
    userId: value.userId,
    exportedAt: value.exportedAt,
    entries: value.entries,
    deviceShared: value.deviceShared,
  };
  const json = JSON.stringify(backup, null, 2);
  const bytes = Buffer.byteLength(json, 'utf8');
  if (bytes > MAX_BACKUP_BYTES) {
    throw new Error(`The local backup is ${(bytes / 1024 / 1024).toFixed(2)} MiB; the importer allows at most 12 MiB.`);
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, json, { flag: 'wx', mode: 0o600 });
  if (process.platform !== 'win32') await chmod(outputPath, 0o600);

  return {
    userId: backup.userId,
    accountEntries: value.summary.accountEntries,
    legacyEntries: value.summary.legacyEntries,
    bytes,
    sha256: createHash('sha256').update(json).digest('hex'),
  };
}

async function main() {
  assertAdbAvailable();
  const serial = selectDevice();
  ensureLegacyPackage(serial);
  const requestedUserId = argumentValue('--user-id');
  const defaultName = `jupeb-device-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const outputPath = resolve(argumentValue('--output') || defaultName);

  console.log(`Connected device: ${serial}`);
  console.log('Legacy package check: passed (installed app allows run-as).');
  console.log('Connecting to the app WebView through the local ADB forward…');

  const connection = await connectDevTools(serial);
  const client = new DevToolsClient(connection.webSocketUrl);
  try {
    await client.connect();
    console.log(`WebView target: ${connection.target.title || connection.target.url || 'JUPEB Master'}`);
    const result = await exportBackup(client, requestedUserId, outputPath);
    console.log('');
    console.log('Backup exported successfully.');
    console.log(`Account: ${result.userId}`);
    console.log(`Account learning records: ${result.accountEntries}`);
    console.log(`Legacy device learning records: ${result.legacyEntries}`);
    console.log(`File: ${outputPath}`);
    console.log(`Size: ${(result.bytes / 1024).toFixed(1)} KiB`);
    console.log(`SHA-256: ${result.sha256}`);
    console.log('');
    console.log('The export excludes auth-token, secret, password, credential and API-key-like storage keys.');
    console.log('Keep this file private. Do not uninstall the old app until the backup is imported and verified.');
  } finally {
    await client.close();
    adb(serial, ['forward', '--remove', `tcp:${connection.port}`]);
  }
}

main().catch(error => {
  console.error(`Backup stopped safely: ${error.message}`);
  console.error('The script does not uninstall, clear, or modify JUPEB Master.');
  process.exitCode = 1;
});
