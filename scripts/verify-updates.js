#!/usr/bin/env node

/**
 * Verify EAS Update Setup
 * Checks if your project is properly configured for OTA updates
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 Verifying EAS Update Setup...\n');

let hasErrors = false;

// Check 1: app.json has runtimeVersion
try {
    const appJson = require('../app.json');
    if (appJson.expo.runtimeVersion) {
        console.log('✅ app.json has runtimeVersion configured');
    } else {
        console.log('❌ app.json missing runtimeVersion');
        hasErrors = true;
    }

    if (appJson.expo.extra?.eas?.projectId) {
        console.log('✅ EAS Project ID found:', appJson.expo.extra.eas.projectId);
    } else {
        console.log('❌ Missing EAS Project ID in app.json');
        hasErrors = true;
    }
} catch (error) {
    console.log('❌ Could not read app.json');
    hasErrors = true;
}

// Check 2: eas.json has channels
try {
    const easJson = require('../eas.json');
    const hasChannels = Object.values(easJson.build || {}).some(profile => profile.channel);
    if (hasChannels) {
        console.log('✅ eas.json has update channels configured');
    } else {
        console.log('❌ eas.json missing update channels');
        hasErrors = true;
    }
} catch (error) {
    console.log('❌ Could not read eas.json');
    hasErrors = true;
}

// Check 3: expo-updates is installed
try {
    const packageJson = require('../package.json');
    if (packageJson.dependencies['expo-updates']) {
        console.log('✅ expo-updates package installed:', packageJson.dependencies['expo-updates']);
    } else {
        console.log('❌ expo-updates package not found');
        hasErrors = true;
    }
} catch (error) {
    console.log('❌ Could not read package.json');
    hasErrors = true;
}

// Check 4: useUpdateManager hook exists
const hookPath = path.join(__dirname, '..', 'src', 'hooks', 'useUpdateManager.ts');
if (fs.existsSync(hookPath)) {
    console.log('✅ useUpdateManager hook exists');
} else {
    console.log('⚠️  useUpdateManager hook not found (optional)');
}

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
    console.log('❌ Setup incomplete. Please fix the errors above.');
    console.log('\nRun this to fix:');
    console.log('1. Ensure app.json has runtimeVersion');
    console.log('2. Ensure eas.json has channels in build profiles');
    console.log('3. Run: npm install expo-updates');
    process.exit(1);
} else {
    console.log('✅ EAS Update is properly configured!');
    console.log('\n📚 Next steps:');
    console.log('1. Build APK: npm run build:apk');
    console.log('2. Send APK to client (one-time)');
    console.log('3. Daily updates: npm run update:push "Your message"');
    console.log('\n💡 See EAS-UPDATE-SETUP.md for full guide');
}
console.log('='.repeat(50) + '\n');
