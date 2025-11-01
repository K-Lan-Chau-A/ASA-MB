#!/usr/bin/env node

/**
 * Script helper để release AppsOnAir CodePush updates
 * 
 * Usage:
 *   node scripts/release-appsonair.js production
 *   node scripts/release-appsonair.js staging
 *   node scripts/release-appsonair.js production --description "Fix notification icon"
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Đọc config từ env hoặc mặc định
const WORKSPACE_NAME = process.env.APPSONAIR_WORKSPACE || 'FPT ASA';
const APP_NAME = process.env.APPSONAIR_APP_NAME || 'ASA';
const deployment = process.argv[2] || 'Production';

// Format: workspace-app-android hoặc workspace-app-ios
const appIdentifier = `${WORKSPACE_NAME}-${APP_NAME}-android`;

// Lấy version từ package.json hoặc build.gradle
let versionName = '1.0.0';
try {
  const packageJson = require(path.join(__dirname, '..', 'package.json'));
  versionName = packageJson.version || '1.0.0';
} catch (e) {
  console.warn('⚠️  Không đọc được version từ package.json, dùng mặc định 1.0.0');
}

// Hoặc đọc từ build.gradle
try {
  const buildGradlePath = path.join(__dirname, '..', 'android', 'app', 'build.gradle');
  const buildGradle = fs.readFileSync(buildGradlePath, 'utf8');
  const versionMatch = buildGradle.match(/versionName\s+"([^"]+)"/);
  if (versionMatch) {
    versionName = versionMatch[1];
  }
} catch (e) {
  // Ignore
}

const description = process.argv.includes('--description') 
  ? process.argv[process.argv.indexOf('--description') + 1]
  : undefined;

if (!['production', 'staging', 'Production', 'Staging'].includes(deployment)) {
  console.error('❌ Deployment phải là "production" hoặc "staging"');
  process.exit(1);
}

let command = `appsonair-codepush release-react ${appIdentifier} -t ${versionName} -d ${deployment}`;

if (description) {
  command += ` --description "${description}"`;
}

console.log(`🚀 Releasing AppsOnAir CodePush update...`);
console.log(`📱 App: ${appIdentifier}`);
console.log(`📦 Version: ${versionName}`);
console.log(`🎯 Deployment: ${deployment}`);
if (description) {
  console.log(`📝 Description: ${description}`);
}
console.log('');

try {
  execSync(command, { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  console.log('');
  console.log('✅ Release thành công!');
  console.log('');
  console.log('📱 App sẽ tự động check update khi user mở lại app.');
  console.log(`📊 Kiểm tra status trên AppsOnAir portal: https://appsonair.com/`);
} catch (error) {
  console.error('');
  console.error('❌ Release thất bại!');
  console.error('');
  console.error('🔍 Kiểm tra:');
  console.error('   1. Đã login: appsonair-codepush login');
  console.error('   2. App identifier đúng: ' + appIdentifier);
  console.error('   3. Workspace và app name đúng');
  process.exit(1);
}

