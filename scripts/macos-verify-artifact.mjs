#!/usr/bin/env node
// Verify a Compass macOS updater archive before it is published.
//
// A release build must link the libmpv that ships inside Contents/Frameworks.
// A Homebrew-linked build still launches on the machine that built it (the
// package is installed there) and crashes on every Mac without it, so the
// mistake is invisible until the artifact is live. This reads the .app.tar.gz
// that publish-release.mjs uploads and rejects absolute non-system references
// or relative ones the archive does not ship, even when the bundle was built
// outside the verified CI workflow.
//
// Usage: node scripts/macos-verify-artifact.mjs Compass_<version>_aarch64.app.tar.gz

import { createReadStream } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { pathToFileURL } from 'node:url';

const SYSTEM_PREFIXES = ['/System/Library/', '/usr/lib/'];
const FAT_MAGIC = 0xcafebabe;
const FAT_MAGIC_64 = 0xcafebabf;
const THIN_MAGIC = 0xfeedface;
const THIN_MAGIC_64 = 0xfeedfacf;
const LC_LOAD_DYLIB = 0xc;
const LC_LOAD_WEAK_DYLIB = 0x18;
const LC_REEXPORT_DYLIB = 0x1f;
const LC_RPATH = 0x1c;
// The LC_REQ_DYLD variants are written out unsigned: `| 0x80000000` produces a
// negative int32 in JavaScript and would never match readUInt32LE output.
const DYLIB_COMMANDS = new Set([LC_LOAD_DYLIB, LC_LOAD_WEAK_DYLIB, LC_REEXPORT_DYLIB, 0x80000018, 0x8000001f]);
const RPATH_COMMANDS = new Set([LC_RPATH, 0x8000001c]);
const APP_ENTRY = /^([^/]+\.app)\/Contents\/(MacOS\/[^/]+|Frameworks\/[^/]+\.dylib)$/;
const TAR_BLOCK = 512;
const HEAD_BYTES = 512 * 1024;
const LOAD_COMMANDS_SLACK = 4 * 1024 * 1024;
const MAX_PREFIX_BYTES = 256 * 1024 * 1024;

class ByteSource {
  constructor(stream) {
    this.iterator = stream[Symbol.asyncIterator]();
    this.buffer = Buffer.alloc(0);
    this.done = false;
  }

  async fill() {
    if (this.done) return;
    const { value, done } = await this.iterator.next();
    if (done) {
      this.done = true;
      return;
    }
    this.buffer = this.buffer.length ? Buffer.concat([this.buffer, value]) : value;
  }

  async read(count) {
    const chunks = [];
    let total = 0;
    if (this.buffer.length) {
      const take = Math.min(count, this.buffer.length);
      chunks.push(this.buffer.subarray(0, take));
      this.buffer = this.buffer.subarray(take);
      total = take;
    }
    while (total < count && !this.done) {
      if (!this.buffer.length) await this.fill();
      if (!this.buffer.length) continue;
      const take = Math.min(count - total, this.buffer.length);
      chunks.push(this.buffer.subarray(0, take));
      this.buffer = this.buffer.subarray(take);
      total += take;
    }
    if (chunks.length === 1) return chunks[0];
    return Buffer.concat(chunks, total);
  }

  async skip(count) {
    let left = count;
    while (left > 0) {
      if (!this.buffer.length) {
        if (this.done) return;
        await this.fill();
        continue;
      }
      const take = Math.min(left, this.buffer.length);
      this.buffer = this.buffer.subarray(take);
      left -= take;
    }
  }
}

function readCString(buffer, offset, limit) {
  const end = buffer.indexOf(0, offset);
  return buffer.subarray(offset, end === -1 || end > limit ? limit : end).toString('utf8');
}

function normalizePath(value) {
  const parts = [];
  for (const part of value.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part);
  }
  return parts.join('/');
}

function machoMagic(data) {
  if (data.length < 4) return null;
  const bigEndian = data.readUInt32BE(0);
  if (bigEndian === FAT_MAGIC || bigEndian === FAT_MAGIC_64) {
    if (data.length < 8) throw new Error('truncated fat Mach-O header');
    return { fat: true, wide: bigEndian === FAT_MAGIC_64 };
  }
  const magic = data.readUInt32LE(0);
  if (magic === THIN_MAGIC || magic === THIN_MAGIC_64) {
    return { fat: false, wide: false, is64: magic === THIN_MAGIC_64 };
  }
  if (bigEndian === THIN_MAGIC || bigEndian === THIN_MAGIC_64) {
    throw new Error('big-endian Mach-O is not supported');
  }
  return null;
}

// How much of an entry has to be buffered before its load commands can be read.
function bufferingPlan(head, size, label) {
  const magic = machoMagic(head);
  if (magic === null) return null;
  if (!magic.fat) {
    const header = magic.is64 ? 32 : 28;
    const sizeofcmds = head.length >= header + 8 ? head.readUInt32LE(20) : 0;
    return { needed: Math.min(size, header + sizeofcmds) };
  }
  const count = head.readUInt32BE(4);
  const step = magic.wide ? 32 : 20;
  if (8 + count * step > head.length) throw new Error(`${label}: fat header with ${count} slices is too large to verify`);
  let needed = 8 + count * step;
  for (let index = 0; index < count; index += 1) {
    const at = 8 + index * step;
    const offset = magic.wide ? Number(head.readBigUInt64BE(at + 8)) : head.readUInt32BE(at + 8);
    needed = Math.max(needed, offset + LOAD_COMMANDS_SLACK);
  }
  return { needed: Math.min(size, needed) };
}

function parseSlice(buffer, offset, label) {
  if (offset + 28 > buffer.length) throw new Error(`${label}: slice at ${offset} lies beyond the verified prefix`);
  const is64 = buffer.readUInt32LE(offset) === THIN_MAGIC_64;
  const header = is64 ? 32 : 28;
  const ncmds = buffer.readUInt32LE(offset + 16);
  const sizeofcmds = buffer.readUInt32LE(offset + 20);
  if (offset + header + sizeofcmds > buffer.length) {
    throw new Error(`${label}: load commands extend beyond the verified prefix`);
  }
  const loads = [];
  const rpaths = [];
  let at = offset + header;
  for (let index = 0; index < ncmds; index += 1) {
    if (at + 8 > offset + header + sizeofcmds) throw new Error(`${label}: truncated load command`);
    const cmd = buffer.readUInt32LE(at);
    const cmdsize = buffer.readUInt32LE(at + 4);
    if (cmdsize < 8 || at + cmdsize > offset + header + sizeofcmds || at + cmdsize > buffer.length) {
      throw new Error(`${label}: invalid load command at ${at}`);
    }
    if (DYLIB_COMMANDS.has(cmd)) {
      loads.push(readCString(buffer, at + buffer.readUInt32LE(at + 8), at + cmdsize));
    } else if (RPATH_COMMANDS.has(cmd)) {
      rpaths.push(readCString(buffer, at + buffer.readUInt32LE(at + 8), at + cmdsize));
    }
    at += cmdsize;
  }
  return { loads, rpaths };
}

function parseMachO(buffer, label) {
  const magic = machoMagic(buffer);
  if (magic === null) throw new Error(`${label}: not a Mach-O image`);
  if (!magic.fat) return [parseSlice(buffer, 0, label)];
  const count = buffer.readUInt32BE(4);
  const step = magic.wide ? 32 : 20;
  const slices = [];
  for (let index = 0; index < count; index += 1) {
    const at = 8 + index * step;
    const offset = magic.wide ? Number(buffer.readBigUInt64BE(at + 8)) : buffer.readUInt32BE(at + 8);
    slices.push(parseSlice(buffer, offset, label));
  }
  return slices;
}

function resolvesToBundled(name, load, bundled, app) {
  const loaderDir = name.split('/').slice(0, -1).join('/');
  if (load.startsWith('@rpath/')) {
    const suffix = load.slice('@rpath/'.length);
    if (suffix.split('/').includes('..')) return false;
    return bundled.has(`${app}/Contents/Frameworks/${normalizePath(suffix)}`);
  }
  if (load.startsWith('@executable_path/') || load.startsWith('@loader_path/')) {
    const expanded = load.replaceAll('@executable_path', `${app}/Contents/MacOS`).replaceAll('@loader_path', loaderDir);
    return bundled.has(normalizePath(expanded));
  }
  return false;
}

function reachesFrameworks(rpath, name, app) {
  const loaderDir = name.split('/').slice(0, -1).join('/');
  const expanded = rpath.replaceAll('@executable_path', `${app}/Contents/MacOS`).replaceAll('@loader_path', loaderDir);
  return normalizePath(expanded) === `${app}/Contents/Frameworks`;
}

function verifyBinary(name, data, bundled, app, requireFrameworksRpath) {
  for (const slice of parseMachO(data, name)) {
    for (const load of slice.loads) {
      if (SYSTEM_PREFIXES.some((prefix) => load.startsWith(prefix))) continue;
      if (load.startsWith('/')) {
        throw new Error(`${name} links a machine-local library: ${load}`);
      }
      if (!resolvesToBundled(name, load, bundled, app)) {
        throw new Error(`${name} references ${load}, which the archive does not ship`);
      }
    }
    if (requireFrameworksRpath && slice.loads.some((load) => load.startsWith('@rpath/'))) {
      if (!slice.rpaths.some((rpath) => reachesFrameworks(rpath, name, app))) {
        throw new Error(`${name} loads @rpath libraries but carries no LC_RPATH that reaches Contents/Frameworks`);
      }
    }
  }
}

function readOctal(header, offset, length) {
  const text = header.subarray(offset, offset + length).toString('ascii').replace(/\0.*$/, '').trim();
  if (!text) return 0;
  const value = Number.parseInt(text, 8);
  if (!Number.isFinite(value)) throw new Error(`invalid tar size field: ${JSON.stringify(text)}`);
  return value;
}

async function readArchive(file, onEntry) {
  const source = new ByteSource(createReadStream(file).pipe(createGunzip()));
  let longName = null;
  let paxPath = null;
  for (;;) {
    const header = await source.read(TAR_BLOCK);
    if (header.length < TAR_BLOCK || header.every((byte) => byte === 0)) return;
    const size = readOctal(header, 124, 12);
    const type = header[156] || 0x30;
    const plain = readCString(header, 0, 100);
    const prefix = readCString(header, 345, 155);
    if (type === 0x4c) {
      longName = (await source.read(size + ((TAR_BLOCK - (size % TAR_BLOCK)) % TAR_BLOCK))).subarray(0, size).toString('utf8').replace(/\0+$/, '');
      continue;
    }
    if (type === 0x78 || type === 0x67) {
      const records = (await source.read(size + ((TAR_BLOCK - (size % TAR_BLOCK)) % TAR_BLOCK))).subarray(0, size).toString('utf8');
      const match = /(?:^|\n)\d+ path=([^\n]+)\n/.exec(records);
      paxPath = match ? match[1] : paxPath;
      continue;
    }
    const name = paxPath ?? longName ?? (prefix ? `${prefix}/${plain}` : plain);
    const padding = (TAR_BLOCK - (size % TAR_BLOCK)) % TAR_BLOCK;
    if ((type === 0x30 || type === 0x00 || type === 0x37) && !name.endsWith('/')) {
      await onEntry(name, size, source);
    } else {
      await source.skip(size);
    }
    await source.skip(padding);
    longName = null;
    paxPath = null;
  }
}

export async function verifyMacAppArchive(file) {
  const bundled = new Set();
  const binaries = new Map();
  await readArchive(file, async (name, size, source) => {
    if (!APP_ENTRY.test(name)) {
      await source.skip(size);
      return;
    }
    const head = await source.read(Math.min(size, HEAD_BYTES));
    const plan = bufferingPlan(head, size, name);
    if (plan && plan.needed > MAX_PREFIX_BYTES) {
      throw new Error(`${name}: load commands lie beyond the ${MAX_PREFIX_BYTES} byte verification limit`);
    }
    let data = head;
    if (plan && data.length < plan.needed) {
      data = Buffer.concat([data, await source.read(plan.needed - data.length)]);
    }
    await source.skip(size - data.length);
    if (name.includes('/Frameworks/')) bundled.add(name);
    if (plan) binaries.set(name, data);
  });

  const executable = [...binaries.keys()].find((name) => name.endsWith('/Contents/MacOS/compass'));
  if (!executable) throw new Error(`${file}: no Compass.app/Contents/MacOS/compass in the archive`);
  const app = executable.slice(0, executable.indexOf('/'));
  if (![...bundled].some((name) => name.startsWith(`${app}/Contents/Frameworks/libmpv`) && name.endsWith('.dylib'))) {
    throw new Error(`${file}: the archive ships no Contents/Frameworks/libmpv*.dylib`);
  }
  for (const [name, data] of binaries) {
    verifyBinary(name, data, bundled, app, name === executable || name === `${app}/Contents/MacOS/mpv`);
  }
  return { app, frameworks: bundled.size, binaries: binaries.size };
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: node scripts/macos-verify-artifact.mjs <Compass_*.app.tar.gz>');
    process.exit(2);
  }
  verifyMacAppArchive(file)
    .then((result) => {
      console.log(`[macos-verify] ${file}: ${result.app} ships ${result.frameworks} bundled libraries and ${result.binaries} Mach-O binaries, none machine-local`);
    })
    .catch((error) => {
      console.error(`[macos-verify] error: ${error.message}`);
      process.exit(1);
    });
}
