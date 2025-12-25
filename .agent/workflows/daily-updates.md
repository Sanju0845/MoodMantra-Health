---
description: Push instant updates to client without rebuilding APK
---

# Daily Update Workflow (OTA Updates)

## 🎯 Overview
Use EAS Update to push changes instantly to your client **without rebuilding the 80MB APK**.
- ⏱️ **Time**: 10-30 seconds (vs 30 minutes)
- 📦 **Size**: ~500KB (vs 80MB)
- 💰 **EAS Credits**: Free tier sufficient for daily updates

---

## 📋 When to Use Each Method

### ✅ Use OTA Update (Daily - 99% of cases)
- JavaScript/React code changes
- UI/styling changes
- Bug fixes
- New features (that don't need native code)
- Asset updates (images, fonts)

**Command:**
```bash
npm run update:push "Your update message"
```

### 🔨 Build New APK (Rare - only when needed)
- First time setup
- Changed native dependencies (added new npm packages with native code)
- Updated `app.json` permissions or config
- Changed native Android/iOS code
- Updated Expo SDK version

**Command:**
```bash
npm run build:apk
```

---

## 🚀 Daily Workflow

### Step 1: Make Your Changes
Edit code as usual (components, screens, logic, etc.)

### Step 2: Push Update (10 seconds)
// turbo-all
```bash
# Quick push with message
npm run update:push "Fixed water tracker bug"

# Or use full command
eas update --branch preview --message "Fixed water tracker bug"
```

### Step 3: Notify Client
Tell your client: "Update is live! Just restart the app."

**Client Experience:**
1. Opens app
2. Sees "Downloading update..." for 2-3 seconds
3. App restarts automatically
4. ✅ New version running!

---

## 📊 Track Updates

### View all updates
```bash
npm run update:check
```

### Get update URL for client
After pushing, you get a shareable URL that shows what changed.

---

## 🆕 Version Tracking

### Update app version number
Edit `app.json`:
```json
{
  "expo": {
    "version": "1.0.1"  // ← Increment this
  }
}
```

**Important:** Version in `app.json` tracks the **APK version**. OTA updates don't require changing this unless you're building a new APK.

To track OTA updates, use the `--message` flag which gets logged.

---

## 🎨 Example Scenarios

### Scenario 1: Daily UI tweaks (OTA Update)
```bash
# Changed breathing animation colors
npm run update:push "Updated breathing animation to match brand colors"
# ⏱️ 15 seconds total
```

### Scenario 2: Added expo-camera package (Need new APK)
```bash
# Added new native dependency
npm run build:apk
# ⏱️ 30 minutes, send new APK to client
```

### Scenario 3: Week of bug fixes (All OTA Updates)
```bash
# Monday
npm run update:push "Fixed water tracker calendar"

# Tuesday
npm run update:push "Improved mood journal tags"

# Wednesday  
npm run update:push "Added breathing exercise stats"

# Thursday
npm run update:push "Fixed profile photo upload"

# Friday
npm run update:push "Weekly improvements summary"

# ⏱️ Total time: 1-2 minutes vs 2.5 hours of builds!
```

---

## 🔥 Pro Tips

1. **No More EAS Account Switching**: Free tier gives you 1-2 APK builds/month. Perfect! Use OTA for daily updates.

2. **Update Messages**: Be descriptive. They help you track what changed:
   ```bash
   npm run update:push "v1.1 - Added confetti to breathing goals"
   ```

3. **Test Locally First**: Always test with `npx expo start` before pushing update.

4. **Automatic Updates**: App checks for updates on:
   - App launch
   - App comes to foreground
   - Every 30 minutes (configurable)

5. **Rollback**: If update breaks something, push a rollback:
   ```bash
   npm run update:push "Rollback: Reverted breathing changes"
   ```

---

## ⚠️ Limitations

OTA Updates **CANNOT** change:
- Native code (Java/Kotlin/ObjectiveC/Swift)
- Native dependencies
- App permissions
- Package name
- Expo SDK version

For these, you **must** build a new APK.

---

## 🆘 Troubleshooting

### Update not showing on client?
1. Make sure client has the latest APK build
2. Check update was pushed to correct channel (`preview`)
3. Ask client to force-close and reopen app
4. Check update status: `npm run update:check`

### "Error: No updates published"?
First time? Build the initial APK first:
```bash
npm run build:apk
```

Then send APK to client, then start using OTA updates.

---

## 📱 Client Instructions

Send this to your client:

> **How to get daily updates:**
> 1. Install the APK I sent you (one-time setup)
> 2. For daily updates: Just close and reopen the app
> 3. You'll see "Downloading update..." for 2-3 seconds
> 4. App restarts with new features!
> 
> No need to download new APK files anymore! 🎉
