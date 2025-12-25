// Quick diagnostic to check OTA configuration
const appJson = require('./app.json');
const easJson = require('./eas.json');
const packageJson = require('./package.json');

console.log('='.repeat(60));
console.log('OTA UPDATE CONFIGURATION CHECK');
console.log('='.repeat(60));

console.log('\n✅ 1. EXPO-UPDATES PACKAGE');
console.log('   Version:', packageJson.dependencies['expo-updates'] || '❌ NOT INSTALLED');

console.log('\n✅ 2. APP.JSON CONFIGURATION');
console.log('   Runtime Version:', appJson.expo.runtimeVersion || '❌ MISSING');
console.log('   Updates URL:', appJson.expo.updates?.url || '❌ MISSING');
console.log('   Updates Enabled:', appJson.expo.updates?.enabled !== false ? 'Yes' : 'No');
console.log('   Check Automatically:', appJson.expo.updates?.checkAutomatically || 'Not set');

console.log('\n✅ 3. EAS.JSON BUILD PROFILES');
const profiles = easJson.build || {};
Object.keys(profiles).forEach(profile => {
    const channel = profiles[profile].channel;
    console.log(`   ${profile}:`, channel ? `channel="${channel}" ✅` : '❌ NO CHANNEL');
});

console.log('\n✅ 4. WHAT TO DO NEXT');
if (!packageJson.dependencies['expo-updates']) {
    console.log('   ❌ Install expo-updates: npx expo install expo-updates');
}
if (!appJson.expo.runtimeVersion) {
    console.log('   ❌ Add runtimeVersion to app.json');
}
if (!appJson.expo.updates?.url) {
    console.log('   ❌ Run: eas update:configure');
}

const previewApkChannel = profiles['preview-apk']?.channel;
if (previewApkChannel) {
    console.log(`\n   ✅ Your APK builds use channel: "${previewApkChannel}"`);
    console.log(`   ✅ Push updates with: npx eas-cli update --branch ${previewApkChannel} --message "Your message"`);
} else {
    console.log('\n   ❌ preview-apk profile has no channel!');
}

console.log('\n' + '='.repeat(60));
console.log('DONE');
console.log('='.repeat(60) + '\n');
