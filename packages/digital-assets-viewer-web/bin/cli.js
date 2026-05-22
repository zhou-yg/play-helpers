#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const CONFIG_DIR = path.join(process.env.HOME || process.env.USERPROFILE, '.dam-viewer');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch (e) {
    // ignore
  }
  return { lastPath: null };
}

function saveConfig(config) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('Failed to save config:', e.message);
  }
}

function parseArgs(args) {
  const result = {
    port: 3000,
    path: null,
  };

  for (let i = 2; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-p' || arg === '--port') {
      result.port = parseInt(args[++i], 10) || 3000;
    } else if (arg === '--path') {
      result.path = args[++i];
    } else if (!arg.startsWith('-')) {
      result.path = arg;
    }
  }

  return result;
}

function main() {
  const args = parseArgs(process.argv);
  const config = loadConfig();

  // Use CLI path, config path, or default
  const projectPath = args.path || config.lastPath || process.env.target_project || process.cwd();

  console.log('╔══════════════════════════════════════════╗');
  console.log('║      DAM Resource Viewer                 ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log(`Project path: ${projectPath}`);
  console.log(`Port: ${args.port}`);
  console.log('');

  // Save the path to config
  if (projectPath) {
    saveConfig({ lastPath: projectPath });
  }

  // Set environment variable for Next.js
  const env = { ...process.env, target_project: projectPath };

  // Start Next.js dev server
  const nextPath = path.join(__dirname, '..');
  const child = spawn('npx', ['next', 'dev', '-p', String(args.port)], {
    cwd: nextPath,
    env,
    stdio: 'inherit',
    shell: true,
  });

  child.on('error', (err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });

  child.on('close', (code) => {
    process.exit(code || 0);
  });

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('\nShutting down...');
    child.kill('SIGINT');
  });
}

main();
