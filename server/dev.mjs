import { spawn } from 'node:child_process';

const proxyUrl = process.env.VITE_LIVE_API_URL || 'http://127.0.0.1:8787';
const children = [
  spawn(process.execPath, ['server/kbo-live-proxy.mjs'], {
    stdio: 'inherit',
    env: process.env,
  }),
  spawn(process.execPath, ['node_modules/vite/bin/vite.js'], {
    stdio: 'inherit',
    env: { ...process.env, VITE_LIVE_API_URL: proxyUrl },
  }),
];

let shuttingDown = false;

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  children.forEach((child) => {
    if (!child.killed) child.kill();
  });
  process.exit(exitCode);
}

children.forEach((child) => {
  child.on('error', (error) => {
    console.error(error);
    shutdown(1);
  });
  child.on('exit', (code, signal) => {
    if (!shuttingDown && code !== 0 && signal == null) shutdown(code || 1);
  });
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
