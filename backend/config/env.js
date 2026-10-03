import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Authoritative path to backend/.env
export const backendEnvPath = path.resolve(__dirname, '../.env');
export const rootEnvPath = path.resolve(__dirname, '../../.env');

export function loadEnvironment() {
  // Load backend/.env with override: true so backend/.env is authoritative
  if (fs.existsSync(backendEnvPath)) {
    dotenv.config({ path: backendEnvPath, override: true });
  }

  // Fallback to root .env if variables are still unset
  if (fs.existsSync(rootEnvPath)) {
    dotenv.config({ path: rootEnvPath, override: false });
  }

  dotenv.config({ override: false });
}

// Immediately load environment when this module is imported
loadEnvironment();

export function getGitHubToken() {
  // Check dynamically so changes in environment or file are recognized
  loadEnvironment();
  const token = (process.env.GITHUB_TOKEN || '').trim();
  return token.length > 0 ? token : null;
}

export function getGeminiApiKey() {
  loadEnvironment();
  const key = (process.env.GEMINI_API_KEY || process.env.AI_API_KEY || '').trim();
  return key.length > 0 ? key : null;
}

export function getAiModel() {
  loadEnvironment();
  return (process.env.AI_MODEL || 'gemma-4-31b-it').trim();
}

export function getAiProvider() {
  loadEnvironment();
  return (process.env.AI_PROVIDER || 'gemini').trim().toLowerCase();
}
