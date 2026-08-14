# OAuth Developer Portal Setup Guide

Step-by-step instructions for setting up each social platform so Relay's OAuth flow works correctly.

**Callback URL pattern**
- Local dev: `http://localhost:3001/api/v1/oauth/callback/{platform}`
- Production: `https://your-domain.com/api/v1/oauth/callback/{platform}`

---

## LinkedIn

**Portal:** https://linkedin.com/developers → Create App

1. Create an app — set App Name to "Relay", attach any LinkedIn Company Page (required even if it's a placeholder).

2. **Auth tab → OAuth 2.0 Settings → Authorized redirect URLs**, add:
   ```
   http://localhost:3001/api/v1/oauth/callback/linkedin
   ```

3. **Products tab** — add these two products:
   - Sign In with LinkedIn using OpenID Connect → grants `openid`, `profile`
   - Share on LinkedIn → grants `w_member_social`

   > **Marketing Developer Platform no longer exists** on LinkedIn's portal (retired ~2024).
   > The `r_organization_social` / `w_organization_social` scopes it used to grant are not
   > obtainable on new apps. The Community Management API that replaced it cannot coexist
   > with the products above. **Do not try to add anything else** — the two products above
   > are all that is available and all that Relay needs.

4. **Auth tab → OAuth 2.0 Scopes** — confirm these three are listed:
   ```
   openid
   profile
   w_member_social
   ```

   > **Company page posting** works without org scopes. Relay posts to company pages by
   > using the member token with `"author": "urn:li:organization:{id}"` — which the
   > `w_member_social` scope permits as long as the user is a page admin. The "+ Company Page"
   > button in the Accounts page handles the setup manually.

5. Copy **Client ID** and **Client Secret** into your server `.env`:
   ```env
   LINKEDIN_CLIENT_ID=your_client_id
   LINKEDIN_CLIENT_SECRET=your_client_secret
   ```

> **Note:** Marketing Developer Platform may take 1–3 business days for LinkedIn to approve.

---

## Facebook & Instagram

Both platforms use the same Meta app.

**Portal:** https://developers.facebook.com → Create App

1. Create app → choose type **Business** (not Consumer).

2. **Add Products** from the left sidebar:
   - Facebook Login → click Set Up
   - Instagram Graph API → click Set Up

3. **Facebook Login → Settings → Valid OAuth Redirect URIs**, add:
   ```
   http://localhost:3001/api/v1/oauth/callback/facebook
   ```

4. **App Settings → Basic** — fill in:
   - App Domains: `localhost`
   - Privacy Policy URL: any valid URL (required before going live)

5. **Permissions & Features** — enable all of the following:
   ```
   pages_show_list
   pages_read_engagement
   pages_manage_posts
   instagram_basic
   instagram_content_publish
   instagram_manage_insights
   instagram_manage_comments
   ```
   In development mode these work without Meta review for your own test accounts.
   Submit each permission for Meta review before going live.

6. Copy **App ID** and **App Secret** into your server `.env`:
   ```env
   FACEBOOK_APP_ID=your_app_id
   FACEBOOK_APP_SECRET=your_app_secret
   ```

> **Instagram requirement:** The connecting user must have an Instagram **Business** or **Creator** account linked to a Facebook Page. A personal Instagram account will not appear.

---

## X (Twitter)

**Portal:** https://developer.twitter.com → Create Project + App

1. Create a **Project**, then create an **App** inside it.

2. **App Settings → User authentication settings** → click Edit:
   - App type: **Web App, Automated App or Bot**
   - OAuth 2.0: **On**
   - Callback URI / Redirect URL:
     ```
     http://localhost:3001/api/v1/oauth/callback/x
     ```
   - Website URL: any valid URL

3. **App permissions** — select:
   - Read
   - Write

4. The following OAuth 2.0 scopes are requested at runtime by Relay:
   ```
   tweet.read
   tweet.write
   users.read
   media.write
   offline.access
   ```

5. Copy **Client ID** and **Client Secret** into your server `.env`:
   ```env
   TWITTER_CLIENT_ID=your_client_id
   TWITTER_CLIENT_SECRET=your_client_secret
   ```

> **Paid tier required:** X's free tier only allows read access. You need at least the Basic plan ($100/month) to post via the API.

---

## TikTok

**Portal:** https://developers.tiktok.com → Create App

1. Create an app → choose platform **Web**.

2. **Add Products** — enable:
   - Login Kit
   - Content Posting API

3. **Login Kit → Redirect domain**, add:
   ```
   localhost
   ```
   **Login Kit → Redirect URI for Login Kit**, add:
   ```
   http://localhost:3001/api/v1/oauth/callback/tiktok
   ```

4. **Scopes** — enable:
   ```
   user.info.basic
   video.publish
   video.upload
   ```

5. Copy **Client Key** and **Client Secret** into your server `.env`:
   ```env
   TIKTOK_CLIENT_KEY=your_client_key
   TIKTOK_CLIENT_SECRET=your_client_secret
   ```

> **Sandbox / Tester accounts:** TikTok requires app review before real users can connect. During development, only accounts added as **Testers** in the developer portal can authenticate.

---

## Complete `.env` Reference

```env
# URLs
SERVER_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000

# LinkedIn
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

# Meta (Facebook + Instagram share the same app)
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=

# X (Twitter)
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=

# TikTok
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
```

---

## Production checklist

- Replace all `localhost:3001` redirect URIs with your live server domain in every developer portal.
- Update `SERVER_URL` and `FRONTEND_URL` in the production `.env`.
- Submit Facebook/Instagram permissions for Meta app review.
- Ensure the LinkedIn Marketing Developer Platform product is approved.
- Add real users as TikTok Testers or submit the TikTok app for review.
