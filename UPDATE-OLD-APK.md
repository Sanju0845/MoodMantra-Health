# 🚨 IMPORTANT: Update Your Client's APK

## Current Situation

You sent an APK to your client yesterday using:
```bash
eas build --platform android --profile preview
```

❌ **This APK will NOT receive OTA updates** because it was built BEFORE the channel configuration was added.

---

## ✅ What You Need To Do (One Last Time!)

### Step 1: Build NEW APK with OTA Support
Run this command:

```bash
npx eas-cli build --platform android --profile preview-apk --non-interactive
```

Or use the npm script:
```bash
npm run build:apk
```

This will take ~30 minutes (last time building an APK!)

### Step 2: Download and Send to Client
1. Wait for build to complete
2. Download the APK from EAS dashboard
3. Send to your client
4. Ask client to **uninstall old app** and install this new one

### Step 3: Verify It Works
After client installs, test OTA updates:

```bash
# Make a small change to any code
# For example, change a text in app

# Push update
npm run update:push "Testing OTA updates"
```

Ask client to:
1. Close the app completely
2. Reopen it
3. They should see "Downloading update..." for 2-3 seconds
4. ✅ App restarts with your changes!

---

## 🎯 After This One-Time Setup

**Never build APK again** (unless you add native dependencies)

Daily workflow:
```bash
# Make code changes
npm run update:push "Fixed breathing animation"

# Tell client: "Update is live, restart the app"
```

---

## ⚙️ Why The Old APK Won't Work

When I configured your project, I added `"channel": "preview"` to `eas.json`.

**APKs built BEFORE this change:**
- ❌ Not linked to any update channel
- ❌ Won't receive OTA updates

**APKs built AFTER this change:**
- ✅ Linked to "preview" channel  
- ✅ Will receive all OTA updates you push

The channel mapping is **baked into the APK at build time**, so you need ONE fresh build.

---

## 🔄 Timeline

**Yesterday:** Built APK without channel config → Won't get updates  
**Today:** Build APK with channel config → Will get updates forever  
**Tomorrow onwards:** Just push updates, no more APK builds!

---

## 💡 Pro Tip

After you've sent the new APK and verified OTA works, you can:
1. Make multiple changes during the day
2. Push ONE update at end of day
3. Client gets all changes in one 2-second download

Instead of:
1. Making changes
2. Waiting 30 minutes for build
3. Sending 80MB file
4. Repeating every day

---

## 🆘 Quick Commands Reference

```bash
# Build the final APK (do this once NOW)
npm run build:apk

# Push updates (use this DAILY)
npm run update:push "Your message"

# Check update history
npm run update:check

# Verify setup is correct
npm run update:verify
```
