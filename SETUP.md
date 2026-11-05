# Phone alerts for Shuttle Split: one-time setup (about 20 minutes)

Everything works from an iPhone (Safari). Step 3 is easiest with push-setup.zip uploaded to your GitHub repo next to index.html, then fetched in Cloud Shell with curl.

## 1 · Switch Firebase to the Blaze plan
1. Open https://console.firebase.google.com and pick **gg-dvg-badminton-league**.
2. Bottom left: **Spark › Upgrade** › choose **Blaze (pay as you go)** and add a card.
3. Set a **budget alert** (e.g. ₹100/month) when asked. For a group your size, usage stays inside the free allowance, so expect ₹0.

## 2 · Create the Web Push key
1. Firebase console › ⚙️ **Project settings** › **Cloud Messaging** tab.
2. Under **Web configuration › Web Push certificates**, tap **Generate key pair**.
3. Copy the long key. In the app: **Manage › Player permissions › 🔔 Phone alerts** › paste › **Save**.

## 3 · Deploy the alert functions (from a laptop)
Easiest way, with nothing to install: **Google Cloud Shell**
1. Open https://shell.cloud.google.com (same Google account).
2. Click ⋮ › **Upload** and upload `push-setup.zip`.
3. Run these lines one by one:
   ```
   unzip -o push-setup.zip -d push-setup && cd push-setup
   cd functions && npm install && cd ..
   npx firebase-tools login --no-localhost
   npx firebase-tools deploy --only functions --project gg-dvg-badminton-league
   ```
4. If it asks to enable APIs (Cloud Functions, Cloud Build, Artifact Registry, Eventarc, Cloud Scheduler), answer **Y**. The first deploy takes 3–5 minutes.

## 4 · Turn alerts on, on each phone
- **iPhone (iOS 16.4+):** open the app in Safari › **Share › Add to Home Screen** › open it from the Home Screen icon › tap **🔔 Turn on** on Home (or your photo › Phone alerts) › **Allow**.
- **Android:** open the app › **🔔 Turn on** › **Allow**.

## What sends an alert
| Event | Who gets it |
|---|---|
| 🙋 Help request, 📣 announcement, new Club post | Everyone except the poster |
| 💬 Comment on your post | The post’s author |
| 🥑 Avokudos | The person who received them |
| 🗳️ New poll | Everyone |
| 💸 “I’ve paid” | Organizers |
| ✅ Payment confirmed | The player who paid |
| 💡 Idea / 🐞 problem | Organizers |
| ⚔️ Challenge | The challenged players |
| 🎂 Birthdays, anniversaries, 🏸 game today | Everyone, every morning at 8:00 |

Alerts cover the main group (Badminton Family). Other groups opened with `?g=` links aren’t included yet.
