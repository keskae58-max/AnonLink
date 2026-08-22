#!/usr/bin/env node
/**
 * AnonLink Admin Creator
 * Usage: npm run create-admin
 *        node scripts/create-admin.js [--username admin] [--password secret]
 */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(ROOT, 'config', 'site.json');
const LOCK_PATH = path.join(ROOT, 'config', 'admin.lock.json');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--username' && args[i + 1]) out.username = args[++i];
    if (args[i] === '--password' && args[i + 1]) out.password = args[++i];
    if (args[i] === '--channel' && args[i + 1]) out.channel = args[++i];
  }
  return out;
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 120000, 32, 'sha256').toString('hex');
}

function b64Encode(str) {
  return Buffer.from(str, 'utf8').toString('base64');
}

function deriveOrder(len, seed) {
  const arr = Array.from({ length: len }, (_, i) => i);
  let s = seed;
  for (let i = len - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function encodeChannelUrl(url) {
  const chunkSize = Math.max(2, Math.ceil(url.length / 4));
  const parts = [];
  for (let i = 0; i < url.length; i += chunkSize) {
    parts.push(b64Encode(url.slice(i, i + chunkSize)));
  }
  const order = deriveOrder(parts.length, url.length * 7919);
  const shuffled = order.map((idx) => parts[idx]);
  const inverse = new Array(order.length);
  order.forEach((origIdx, pos) => {
    inverse[origIdx] = pos;
  });
  return { segments: shuffled, order: inverse };
}

async function main() {
  const args = parseArgs();
  console.log('\n  AnonLink Admin Creator\n  ─────────────────────\n');

  let username = args.username;
  let password = args.password;
  let channelUrl = args.channel;

  if (!username) username = (await prompt('Admin username [admin]: ')) || 'admin';
  if (!password) {
    password = (await prompt('Admin password (leave blank to generate): ')) || crypto.randomBytes(12).toString('base64url');
  }
  if (!channelUrl) {
    channelUrl = await prompt('Channel URL: ');
    if (!channelUrl) {
      console.error('Channel URL is required.');
      process.exit(1);
    }
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPassword(password, salt);

  const lockData = {
    username,
    salt,
    hash,
    created: new Date().toISOString()
  };

  fs.writeFileSync(LOCK_PATH, JSON.stringify(lockData, null, 2));

  let siteConfig = {};
  if (fs.existsSync(CONFIG_PATH)) {
    siteConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  }

  siteConfig.channel = encodeChannelUrl(channelUrl);
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(siteConfig, null, 2));

  console.log('\n  ✓ Admin account created\n');
  console.log(`  Username:  ${username}`);
  console.log(`  Password:  ${password}`);
  console.log(`  Lock file: config/admin.lock.json`);
  console.log(`  Channel:   encoded in config/site.json`);
  console.log('\n  Open the site and click ⚙ or visit ?config=1 to access the config panel.\n');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
