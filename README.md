# Shuttle Split — setup

Badminton cost sharing app: mark who played, enter hours, shuttle and drinks costs, and share each person's amount to WhatsApp as text or a poster.

## Files
- `index.html` — the app
- `manifest.webmanifest`, `sw.js`, `icon-192.png`, `icon-512.png` — make it installable on phones and open offline
- `firestore.rules` — who can read and edit the shared data

## 1. Firebase (you can reuse your league app's project)
1. Firebase console → **Authentication → Sign-in method** → enable **Google** (for you) and **Anonymous** (lets players vote by tapping the link, with no login).
2. **Authentication → Settings → Authorized domains** → add `YOUR_GITHUB_USERNAME.github.io` (skip if it's already there for the league app).
3. **Firestore → Rules** → add the `match` blocks from `firestore.rules` inside your existing rules, put your Google email in `organizers()`, and **Publish**.
4. **Project settings → Your apps → Web app → Config** → copy the values into `FIREBASE_CONFIG` near the bottom of `index.html`.

The app stores everything in collections starting with `shuttleSplit_` (config, days, polls), so it never touches the league app's data.

## 2. GitHub Pages
1. New repo, e.g. `shuttle-split`, and upload all files in this folder.
2. **Settings → Pages** → Deploy from branch → `main` / root → Save.
3. Open `https://YOUR_GITHUB_USERNAME.github.io/shuttle-split/`.

## 3. Use it
- Tap **Organizer sign in** (top right) with the Google account in your rules. Everyone else sees the split read-only.
- Add players once on the **Players** tab (or paste the list below).
- Install: Android Chrome → menu → **Add to Home screen / Install app**. iPhone Safari → Share → **Add to Home Screen**.
- **Share tab → Share poster to WhatsApp** sends the image with the message as caption (the message is also copied, so you can paste it if WhatsApp drops the caption).

Your current players: Manju, Ashwini, Pavan, Praveen, Santhosh, Karthik, Ram, Suresh, Sheela, Uma, Shwetha.

## Availability polls (Polls tab)
1. Sign in, tap **New poll**. It defaults to this weekend, Sat 5-7 PM and Sun 9-11 AM, closing the night before at 10 PM. Change dates, times or deadline as needed.
2. **Post poll in WhatsApp** sends the message with a vote link to your group. Players tap it, pick their name once, and tap Yes / Maybe / No per date (or "Not available").
3. Results show live: who's in per date and how many courts to book (based on players per court). **Send reminder** pings the people who haven't voted; **Post results** shares the final count.
4. Prefer WhatsApp's own poll? Tap **Copy as WhatsApp poll options** for the option text, run the poll in WhatsApp, then tap names under **Record votes** from its "View votes" screen.
5. On game day, the Day tab's **Fill from poll** marks everyone who voted yes as present.

## Updating later
Upload the new `index.html`, then change `VERSION` in `sw.js` (e.g. `shuttle-split-v2`) so installed phones fetch the new copy.
