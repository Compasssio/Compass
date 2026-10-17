import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { verifyMacAppArchive } from '../scripts/macos-verify-artifact.mjs';

const MH_MAGIC_64 = 0xfeedfacf;
const TAR_BLOCK = 512;

function dylibCommand(cmd, name) {
  const value = Buffer.from(`${name}\0`, 'utf8');
  const size = Math.ceil((24 + value.length) / 8) * 8;
  const out = Buffer.alloc(size);
  out.writeUInt32LE(cmd, 0);
  out.writeUInt32LE(size, 4);
  out.writeUInt32LE(24, 8);
  out.writeUInt32LE(0x20000, 16);
  out.writeUInt32LE(0x20000, 20);
  value.copy(out, 24);
  return out;
}

function rpathCommand(value) {
  const raw = Buffer.from(`${value}\0`, 'utf8');
  const size = Math.ceil((12 + raw.length) / 8) * 8;
  const out = Buffer.alloc(size);
  out.writeUInt32LE(0x8000001c, 0);
  out.writeUInt32LE(size, 4);
  out.writeUInt32LE(12, 8);
  raw.copy(out, 12);
  return out;
}

function slice(loads, rpaths = [], tail = 0) {
  const commands = [
    ...loads.map((load) => dylibCommand(0xc, load)),
    ...rpaths.map((rpath) => rpathCommand(rpath)),
  ];
  const sizeofcmds = commands.reduce((total, command) => total + command.length, 0);
  const header = Buffer.alloc(32);
  header.writeUInt32LE(MH_MAGIC_64, 0);
  header.writeUInt32LE(16777228, 4);
  header.writeUInt32LE(2, 8);
  header.writeUInt32LE(commands.length, 16);
  header.writeUInt32LE(sizeofcmds, 20);
  return Buffer.concat([header, ...commands, Buffer.alloc(tail)]);
}

function fat(bodies) {
  const header = Buffer.alloc(4096);
  header.writeUInt32BE(0xcafebabe, 0);
  header.writeUInt32BE(bodies.length, 4);
  const tail = [];
  let offset = header.length;
  for (const [index, body] of bodies.entries()) {
    const at = 8 + index * 20;
    header.writeUInt32BE(index === 0 ? 16777223 : 16777228, at);
    header.writeUInt32BE(3, at + 4);
    header.writeUInt32BE(offset, at + 8);
    header.writeUInt32BE(body.length, at + 12);
    header.writeUInt32BE(12, at + 16);
    tail.push(body);
    const padded = Math.ceil(body.length / 4096) * 4096;
    if (padded > body.length) tail.push(Buffer.alloc(padded - body.length));
    offset += padded;
  }
  return Buffer.concat([header, ...tail]);
}

function tarEntry(name, data) {
  const header = Buffer.alloc(TAR_BLOCK);
  header.write(name, 0, 100, 'utf8');
  header.write('0000644\0', 100, 'ascii');
  header.write('0000000\0', 108, 'ascii');
  header.write('0000000\0', 116, 'ascii');
  header.write(`${data.length.toString(8).padStart(11, '0')}\0`, 124, 'ascii');
  header.write('00000000000\0', 136, 'ascii');
  header.write('        ', 148, 'ascii');
  header[156] = 0x30;
  header.write('ustar\0', 257, 'ascii');
  header.write('00', 263, 'ascii');
  let sum = 0;
  for (const byte of header) sum += byte;
  header.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148, 'ascii');
  return Buffer.concat([header, data, Buffer.alloc((TAR_BLOCK - (data.length % TAR_BLOCK)) % TAR_BLOCK)]);
}

function archive(entries) {
  return gzipSync(Buffer.concat([...entries.map(([name, data]) => tarEntry(name, data)), Buffer.alloc(TAR_BLOCK * 2)]));
}

function writeArchive(t, entries) {
  const dir = mkdtempSync(join(tmpdir(), 'macos-verify-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'Compass_0.0.0_aarch64.app.tar.gz');
  writeFileSync(file, archive(entries));
  return file;
}

function healthyEntries() {
  return [
    ['Compass.app/Contents/Frameworks/libmpv.2.dylib', slice(['@rpath/libass.9.dylib', '/usr/lib/libSystem.B.dylib'], ['@loader_path/../lib'])],
    ['Compass.app/Contents/Frameworks/libass.9.dylib', slice(['/usr/lib/libSystem.B.dylib'])],
    ['Compass.app/Contents/MacOS/compass', slice(['@rpath/libmpv.2.dylib', '/usr/lib/libSystem.B.dylib'], ['@executable_path/../Frameworks'])],
    ['Compass.app/Contents/MacOS/yt-dlp', Buffer.from('#!/usr/bin/env python3\n', 'utf8')],
  ];
}

test('accepts an app whose executable loads the bundled libmpv', async (t) => {
  const result = await verifyMacAppArchive(writeArchive(t, healthyEntries()));
  assert.equal(result.app, 'Compass.app');
  assert.equal(result.frameworks, 2);
  assert.equal(result.binaries, 3);
});

test('rejects an executable that still links the Homebrew libmpv (0.9.132)', async (t) => {
  const entries = healthyEntries();
  entries[2] = ['Compass.app/Contents/MacOS/compass', slice(['/opt/homebrew/opt/mpv/lib/libmpv.2.dylib'], ['@executable_path/../Frameworks'])];
  await assert.rejects(verifyMacAppArchive(writeArchive(t, entries)), /machine-local library/);
});

test('rejects a relative dependency the archive does not ship', async (t) => {
  const entries = healthyEntries();
  entries[2] = ['Compass.app/Contents/MacOS/compass', slice(['@rpath/libmissing.dylib'], ['@executable_path/../Frameworks'])];
  await assert.rejects(verifyMacAppArchive(writeArchive(t, entries)), /does not ship/);
});

test('rejects an app without a bundled libmpv', async (t) => {
  const entries = healthyEntries().filter(([name]) => !name.includes('Frameworks/libmpv'));
  await assert.rejects(verifyMacAppArchive(writeArchive(t, entries)), /no Contents\/Frameworks\/libmpv/);
});

test('rejects a sidecar with a machine-local dependency', async (t) => {
  const entries = healthyEntries();
  entries.push(['Compass.app/Contents/MacOS/ffmpeg', slice(['/usr/local/opt/x264/lib/libx264.dylib'])]);
  await assert.rejects(verifyMacAppArchive(writeArchive(t, entries)), /machine-local library/);
});

test('rejects an executable whose rpaths cannot reach the bundled frameworks', async (t) => {
  const entries = healthyEntries();
  entries[2] = ['Compass.app/Contents/MacOS/compass', slice(['@rpath/libmpv.2.dylib'], ['@executable_path/elsewhere'])];
  await assert.rejects(verifyMacAppArchive(writeArchive(t, entries)), /LC_RPATH/);
});

test('accepts an executable that loads Frameworks directly (0.9.131 shape)', async (t) => {
  const entries = healthyEntries();
  entries[2] = ['Compass.app/Contents/MacOS/compass', slice(['@executable_path/../Frameworks/libmpv.2.dylib', '/usr/lib/libSystem.B.dylib'])];
  await verifyMacAppArchive(writeArchive(t, entries));
});

test('reads both slices of a fat library', async (t) => {
  const entries = healthyEntries();
  const bodies = [slice(['@rpath/libass.9.dylib'], [], 1_500_000), slice(['@rpath/libass.9.dylib'])];
  entries[0] = ['Compass.app/Contents/Frameworks/libmpv.2.dylib', fat(bodies)];
  const result = await verifyMacAppArchive(writeArchive(t, entries));
  assert.equal(result.binaries, 3);
});

test('rejects a fat library whose other slice links a machine-local dylib', async (t) => {
  const entries = healthyEntries();
  const bodies = [slice(['@rpath/libass.9.dylib'], [], 1_500_000), slice(['/opt/homebrew/opt/mpv/lib/libmpv.2.dylib'])];
  entries[0] = ['Compass.app/Contents/Frameworks/libmpv.2.dylib', fat(bodies)];
  await assert.rejects(verifyMacAppArchive(writeArchive(t, entries)), /machine-local library/);
});
