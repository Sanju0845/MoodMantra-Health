# Google OAuth Configuration for Mobile App

## 📋 Instructions for Google Cloud Console Admin

**Client ID Being Used**: `912510032049-9k9t1m6illvcguil2je7il9oc8jc0f24.apps.googleusercontent.com`

### ✅ What Needs to Be Added:

Please add the following **Authorized Redirect URI** to the OAuth 2.0 Client ID configuration:

```
raskamon://auth
```

---

## 🔧 Step-by-Step Instructions:

### 1. Go to Google Cloud Console
**URL**: https://console.cloud.google.com/apis/credentials

### 2. Locate the OAuth Client
Find the OAuth 2.0 Client ID:
- **Client ID**: `912510032049-9k9t1m6illvcguil2je7il9oc8jc0f24`
- **Name**: Should be your existing OAuth client

### 3. Edit the Client
- Click on the **Client ID** name to open it
- Click **"Edit"** (pencil icon at the top)

### 4. Add Redirect URI
Scroll down to the **"Authorized redirect URIs"** section:
- Click **"+ ADD URI"**
- Paste: `raskamon://auth`
- Click **"SAVE"** at the bottom

### 5. Done!
The mobile app will work immediately after saving.

---

## 📱 Why This URI?

- `raskamon://auth` is the **deep link** that allows the mobile app to receive the OAuth callback
- This is a standard mobile OAuth pattern (similar to `fb://`, `twitter://`, etc.)
- It's completely safe and only works with your mobile app

---

## 🔐 Security Notes

✅ **Safe**: This redirect URI only works with the mobile app
✅ **Secure**: Uses PKCE (Proof Key for Code Exchange) for enhanced security
✅ **Standard**: Industry-standard OAuth 2.0 flow for mobile apps

---

## ⏱️ Time Required
**2 minutes** - Just add one redirect URI and click save!

---

## 🆘 Support

If you need help, the redirect URI should look like this in the console:

**Authorized redirect URIs:**
```
https://your-existing-web-uri.com/callback    ← (Keep existing)
raskamon://auth                                ← (Add this new one)
```

Both URIs work together - web and mobile!
