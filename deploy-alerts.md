# Turn on phone alerts for Shuttle Split

Tap the small **terminal icon** on the right of each grey command box. It sends the command to the terminal below, so there's nothing to type or paste. Press return if it doesn't start by itself.

## Step 1 · Unpack the alert sender

```sh
cd ~/cloudshell_open/shuttle-split && unzip -o push-setup.zip -d ps && cd ps/functions && npm i && cd ..
```

Wait about a minute, until the `$` comes back.

## Step 2 · Send it to Firebase

```sh
npx firebase-tools deploy --only functions --project gg-dvg-badminton-league
```

This takes 3–5 minutes. You're done when it says **✔ Deploy complete!**

* If it says **"permission" or "service agent"**, wait 5 minutes and tap the same button again. That's normal the first time.
* If it says **"Failed to authenticate"** or **"not logged in"**, go to Step 3.

## Step 3 · Only if Step 2 asked you to sign in

```sh
npx firebase-tools login --no-localhost
```

Type **Y** and press return. Long-press the link → Open in New Tab → sign in → Allow. Type the code it shows into the terminal and press return. Then tap Step 2's button again.

## Done 🎉

Open the Shuttle Split app from your Home Screen, go to **My profile › 🔔 My alerts** and tap **Turn on alerts on this phone**.
