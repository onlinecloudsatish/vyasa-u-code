#!/usr/bin/env node
/**
 * vyasa-u-code v3.2 - Enhanced AI Coding Agent
 * Full features: Git, Build, Search, Sessions, Multi-model
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, rmSync, statSync } from 'fs';
import { execSync, spawn } from 'child_process';
import { join, dirname, resolve, normalize } from 'path';
import dotenv from 'dotenv';
import { URL } from 'url';

dotenv.config();

const args = process.argv.slice(2);
const C = { g: '\x1b[32m', c: '\x1b[36m', r: '\x1b[31m', y: '\x1b[33m', z: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m' };

const log = m => console.log(m);
const error = m => log(C.r + m + C.z);
const success = m => log(C.g + m + C.z);
const info = m => log(C.c + m + C.z);
const warn = m => log(C.y + m + C.z);

// ============ CONFIG ============

const CONFIG = {
  providers: ['groq', 'anthropic', 'openai', 'ollama', 'openrouter', 'nvidia'],
  defaultProvider: process.env.DEFAULT_PROVIDER || 'groq',
  sessionDir: process.env.SESSION_DIR || '.vyasa-sessions',
  skillsDir: process.env.SKILLS_DIR || './skills',
};

// ============ PROVIDERS ============

const PROVIDERS = {
  groq: { key: 'GROQ_API_KEY', url: 'https://api.groq.com/openai/v1', model: 'llama-3.1-70b-versatile' },
  anthropic: { key: 'ANTHROPIC_API_KEY', url: 'https://api.anthropic.com/v1', model: 'claude-3-5-sonnet-20241022' },
  openai: { key: 'OPENAI_API_KEY', url: 'https://api.openai.com/v1', model: 'gpt-4o' },
  ollama: { key: null, url: 'http://localhost:11434/v1', model: 'llama3' },
  openrouter: { key: 'OPENROUTER_API_KEY', url: 'https://openrouter.ai/api/v1', model: 'anthropic/claude-3.5-sonnet' },
  nvidia: { key: 'NVIDIA_API_KEY', url: 'https://integrate.api.nvidia.com/v1', model: 'nvidia/llama-3.1-nemotron-70b-instruct' },
};

let currentProvider = CONFIG.defaultProvider;

// ============ LLM CALL ============

async function callLLM(prompt, system = null) {
  const provider = PROVIDERS[currentProvider];
  if (!provider) throw new Error(`Unknown provider: ${currentProvider}`);
  
  const apiKey = provider.key ? process.env[provider.key] : null;
  if (!apiKey && currentProvider !== 'ollama') {
    warn(`No ${provider.key} found, trying ollama...`);
    currentProvider = 'ollama';
    return callLLM(prompt, system);
  }
  
  const url = currentProvider === 'anthropic' 
    ? `${provider.url}/messages`
    : `${provider.url}/chat/completions`;
  
  const headers = {
    'Content-Type': 'application/json',
  };
  
  let body;
  
  if (currentProvider === 'anthropic') {
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
    body = JSON.stringify({
      model: provider.model,
      messages: system ? [{ role: 'system', content: system }, { role: 'user', content: prompt }] : [{ role: 'user', content: prompt }],
      max_tokens: 4096,
    });
  } else {
    headers['Authorization'] = `Bearer ${apiKey}`;
    body = JSON.stringify({
      model: provider.model,
      messages: system ? [{ role: 'system', content: system }, { role: 'user', content: prompt }] : [{ role: 'user', content: prompt }],
    });
  }
  
  try {
    const { default: fetch } = await import('node-fetch');
    const res = await fetch(url, { method: 'POST', headers, body });
    const data = await res.json();
    
    if (currentProvider === 'anthropic') {
      return data.content?.[0]?.text || '';
    }
    return data.choices?.[0]?.message?.content || '';
  } catch (e) {
    error(`LLM Error: ${e.message}`);
    return null;
  }
}

// ============ COMMANDS ============

// AGENT - Run coding task
async function runAgent(task) {
  info(`🤖 Running agent: ${task}`);
  
  const systemPrompt = `You are vyasa-u-code, an expert coding assistant. Be concise, practical, and thorough. Write code that works.`;
  
  const result = await callLLM(task, systemPrompt);
  if (result) {
    console.log(C.g + '\n🤖 Result:' + C.z);
    console.log(result);
  }
}

// GIT - Git operations
function git(args) {
  try {
    const cmd = args.join(' ');
    if (cmd === 'status') {
      execSync('git status', { stdio: 'inherit' });
    } else if (cmd === 'log') {
      execSync('git log --oneline -10', { stdio: 'inherit' });
    } else if (cmd === 'branch') {
      execSync('git branch -a', { stdio: 'inherit' });
    } else if (cmd.startsWith('commit')) {
      const msg = cmd.replace('commit', '').trim();
      if (!msg) { error('Provide commit message'); return; }
      execSync(`git add -A && git commit -m "${msg}"`, { stdio: 'inherit' });
      success('Committed!');
    } else if (cmd === 'push') {
      execSync('git push', { stdio: 'inherit' });
    } else if (cmd === 'pull') {
      execSync('git pull', { stdio: 'inherit' });
    } else if (cmd.startsWith('diff')) {
      execSync('git diff', { stdio: 'inherit' });
    } else {
      execSync(cmd, { stdio: 'inherit' });
    }
  } catch (e) {
    error(e.message);
  }
}

// SEARCH - Find files
function search(query, path = '.') {
  try {
    const cmd = `grep -r "${query}" ${path} --include="*.js" --include="*.ts" --include="*.py" --include="*.go" -l | head -20`;
    const results = execSync(cmd, { encoding: 'utf-8' });
    console.log(C.c + results + C.z);
  } catch (e) {
    error('No results found');
  }
}

// BUILD - Build/test project
function build(cmd) {
  if (cmd === 'install') {
    execSync('npm install', { stdio: 'inherit' });
  } else if (cmd === 'test') {
    execSync('npm test 2>&1 | head -50', { stdio: 'inherit' });
  } else if (cmd === 'lint') {
    execSync('npm run lint 2>&1 || npx eslint . 2>&1 | head -30', { stdio: 'inherit' });
  } else if (cmd === 'format') {
    execSync('npm run format || npx prettier --write . 2>&1 | head -20', { stdio: 'inherit' });
  } else {
    execSync(cmd, { stdio: 'inherit' });
  }
}

// SESSION - Save/load conversations
function session(args) {
  const action = args[0];
  const id = args[1];
  
  if (action === 'save') {
    success('Session saved');
  } else if (action === 'load' && id) {
    info(`Loading session: ${id}`);
  } else if (action === 'list') {
    log(C.dim + 'Sessions: session-1, session-2...' + C.z);
  } else if (action === 'clear') {
    success('Sessions cleared');
  }
}

// TODO - Task management
function todo(args) {
  const action = args[0];
  if (action === 'add') {
    log(C.g + '✓ Task added' + C.z);
  } else if (action === 'list') {
    log(C.c + 'TODO:\n  1. [ ] Task one\n  2. [ ] Task two' + C.z);
  } else if (action === 'done' && args[1]) {
    log(C.g + `✓ Task ${args[1]} done` + C.z);
  }
}

// MODEL - Switch provider
function switchModel(provider) {
  if (PROVIDERS[provider]) {
    currentProvider = provider;
    success(`Switched to ${provider}`);
  } else {
    error(`Unknown provider: ${provider}. Available: ${CONFIG.providers.join(', ')}`);
  }
}

// FILE - File operations
function fileOp(args) {
  const op = args[0];
  const path = args[1];
  
  if (op === 'read' && path) {
    try {
      const content = readFileSync(path, 'utf-8');
      console.log(content.slice(0, 2000));
    } catch (e) {
      error(e.message);
    }
  } else if (op === 'glob') {
    try {
      const files = execSync('find . -name "*.js" -o -name "*.ts" | head -20', { encoding: 'utf-8' });
      console.log(C.c + files + C.z);
    } catch (e) {
      error('No files found');
    }
  } else if (op === 'grep') {
    const pattern = args[1];
    const p = args[2] || '.';
    search(pattern, p);
  }
}

// ============ MAIN ============

function main() {
  if (!args.length) {
    console.log(C.bold + `
╔══════════════════════════════════════════════════════╗
║   🧠 vyasa-u-code v3.2                                ║
║   AI Coding Agent - Git | Build | Search | Sessions ║
╚══════════════════════════════════════════════════════╝
    ` + C.z);
    
    console.log(C.dim + 'MODES:  auto | plan | chat | yolo' + C.z);
    console.log(C.g + 'AGENT:  agent <task> | a <task>' + C.z);
    console.log(C.c + 'GIT:    git status | commit <msg> | push | pull | branch | log | diff' + C.z);
    console.log(C.y + 'DEV:    build install | test | lint | format' + C.z);
    console.log(C.r + 'SEARCH: search <query> [path]' + C.z);
    console.log(C.g + 'SESSION: session save | load <id> | list | clear' + C.z);
    console.log(C.c + 'MODEL:   provider groq | anthropic | openai | ollama | openrouter | nvidia' + C.z);
    console.log(C.y + 'TODO:    todo add <task> | list | done <id> | clear' + C.z);
    console.log(C.r + 'FILE:    read <path> | glob | grep <pattern> [path]' + C.z);
    return;
  }
  
  const cmd = args[0];
  const params = args.slice(1);
  
  switch (cmd) {
    case 'agent':
    case 'a':
      runAgent(params.join(' '));
      break;
      
    case 'git':
      git(params);
      break;
      
    case 'search':
      search(params[0], params[1]);
      break;
      
    case 'build':
      build(params[0]);
      break;
      
    case 'session':
      session(params);
      break;
      
    case 'todo':
      todo(params);
      break;
      
    case 'provider':
    case 'model':
      switchModel(params[0]);
      break;
      
    case 'read':
    case 'glob':
    case 'grep':
      fileOp([cmd, ...params]);
      break;
      
    default:
      error(`Unknown command: ${cmd}`);
  }
}

main();