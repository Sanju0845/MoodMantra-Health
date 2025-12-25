#!/usr/bin/env node

/**
 * Quick Update Push Script
 * Usage: node scripts/push-update.js "Fixed breathing animation"
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get commit message from argument or use default
const message = process.argv[2] || `Update ${new Date().toLocaleDateString()}`;
const channel = process.argv[3] || 'preview'; // default to preview channel

console.log('\n🚀 Pushing EAS Update...\n');
console.log(`📝 Message: ${message}`);
console.log(`📡 Channel: ${channel}\n`);

try {
    // Read current version from app.json
    const appJsonPath = path.join(__dirname, '..', 'app.json');
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    const currentVersion = appJson.expo.version;

    console.log(`📦 App Version: ${currentVersion}`);
    console.log(`⏳ Publishing update...\n`);

    // Push the update
    execSync(
        `eas update --branch ${channel} --message "${message}"`,
        { stdio: 'inherit' }
    );

    console.log('\n✅ Update published successfully!');
    console.log(`\n📱 Client will receive this update next time they open the app.`);
    console.log(`⚡ Update size: ~500KB (not 80MB!)`);
    console.log(`⏱️  Download time: 2-3 seconds\n`);

} catch (error) {
    console.error('\n❌ Failed to push update:', error.message);
    process.exit(1);
}
