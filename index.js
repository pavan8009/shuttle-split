// Shuttle Split: phone alerts for the main group (Badminton Family).
// Sends a push notification to the phones that switched on "Phone alerts" in the app.
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');

admin.initializeApp();
setGlobalOptions({ region: 'asia-south1', maxInstances: 3 });
const db = admin.firestore();
const APP = 'https://pavan8009.github.io/shuttle-split/';
const P = 'shuttleSplit_';
const key = n => String(n || '').trim().toLowerCase().replace(/\s+/g, ' ');
const first = n => String(n || '').trim().split(/\s+/)[0];
const inr = n => '₹' + Math.round(+n || 0).toLocaleString('en-IN');

async function tokens(filter) {
  const q = await db.collection(P + 'tokens').get();
  return q.docs.map(d => ({ id: d.id, ...d.data() })).filter(t => t.token && (!filter || filter(t)));
}

async function send(list, title, body, link = '', tag = '') {
  const toks = [...new Set(list.map(t => t.token))];
  for (let i = 0; i < toks.length; i += 500) {
    const chunk = toks.slice(i, i + 500);
    const res = await admin.messaging().sendEachForMulticast({
      tokens: chunk,
      data: { title, body, link: APP + link, tag },
      webpush: { notification: { title, body, icon: APP + 'icon-192.png', tag: tag || undefined }, fcmOptions: { link: APP + link } }
    });
    // forget phones that uninstalled or turned alerts off
    const bad = [];
    res.responses.forEach((r, j) => {
      const c = r.error && r.error.code;
      if (c === 'messaging/registration-token-not-registered' || c === 'messaging/invalid-registration-token') bad.push(chunk[j]);
    });
    for (const t of bad) {
      const q = await db.collection(P + 'tokens').where('token', '==', t).get();
      await Promise.all(q.docs.map(d => d.ref.delete()));
    }
  }
}
const everyoneBut = n => tokens(t => key(t.name) !== key(n));
const only = n => tokens(t => key(t.name) === key(n));
const organizers = () => tokens(t => t.org);

// Club posts: help requests, announcements, photos, tips…
exports.onPost = onDocumentCreated(P + 'posts/{id}', async e => {
  const x = e.data.data(), n = first(x.name), txt = String(x.text || '').slice(0, 120);
  const title = x.kind === 'ask' ? `🙋 ${n} needs help` : x.kind === 'announce' ? '📣 Announcement' : x.kind === 'photo' ? `📸 ${n} shared a memory` : x.kind === 'tip' ? `💡 Tip from ${n}` : x.kind === 'idea' ? `💡 New idea from ${n}` : `💬 ${n} posted`;
  await send(await everyoneBut(x.name), title, txt || 'Tap to see it in the Club', '#club', 'post-' + e.params.id);
});

// Comments: tell the post's author
exports.onComment = onDocumentCreated(P + 'comments/{id}', async e => {
  const c = e.data.data();
  if (!String(c.target || '').startsWith('post:')) return;
  const p = await db.collection(P + 'posts').doc(c.target.slice(5)).get();
  if (!p.exists || key(p.data().name) === key(c.name)) return;
  const t = String(c.text || '');
  await send(await only(p.data().name), `💬 ${first(c.name)} commented`, t.startsWith('[gif]') ? 'sent a GIF' : t.startsWith('[stk]') ? 'sent a sticker' : t.slice(0, 120), '#club');
});

// Avokudos: tell the person who received them
exports.onAvo = onDocumentCreated(P + 'avo/{id}', async e => {
  const g = e.data.data();
  await send(await only(g.to), `🥑 ${first(g.from)} appreciated you${g.amt ? ' · ' + g.amt + ' Avokudos' : ''}`, String(g.msg || '').slice(0, 120), '#club');
});

// New availability poll: everyone
exports.onPoll = onDocumentCreated(P + 'polls/{id}', async e => {
  const p = e.data.data();
  await send(await tokens(), '🗳️ New poll: ' + (p.title || 'Are you in?'), 'Tap to vote Yes or No', '#poll-' + e.params.id);
});

// Payments: organizers hear about "I've paid"; the player hears when it's confirmed
exports.onPayment = onDocumentCreated(P + 'payments/{id}', async e => {
  const x = e.data.data();
  if (x.status !== 'claimed') return;
  await send(await organizers(), `💸 ${first(x.payer || x.name)} says they paid ${inr(x.amount)}`, 'Check your UPI app and confirm', '#payouts');
});
exports.onPaymentConfirmed = onDocumentUpdated(P + 'payments/{id}', async e => {
  const a = e.data.before.data(), b = e.data.after.data();
  if (a.status === 'claimed' && b.status === 'confirmed')
    await send(await tokens(t => key(t.name) === key(b.name) || key(t.name) === key(b.payer)), '✅ Payment confirmed', `${inr(b.amount)} received. Thank you! 💚`, '#payouts');
});

// Ideas & problems: organizers
exports.onRequest = onDocumentCreated(P + 'requests/{id}', async e => {
  const r = e.data.data();
  await send(await organizers(), `${r.kind === 'bug' ? '🐞 Problem' : r.kind === 'q' ? '❓ Question' : '💡 Idea'} from ${first(r.name)}`, String(r.text || '').slice(0, 120), '#team');
});

// Challenges: the people being challenged
exports.onChallenge = onDocumentCreated(P + 'challenges/{id}', async e => {
  const c = e.data.data(), who = (c.b || []).map(key);
  await send(await tokens(t => who.includes(key(t.name))), `⚔️ ${first(c.from)} challenged you`, String(c.msg || 'Accept the challenge?').slice(0, 120), '#cup');
});

// Every morning at 8:00 IST: birthdays, anniversaries and today's game
exports.morning = onSchedule({ schedule: '0 8 * * *', timeZone: 'Asia/Kolkata' }, async () => {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const ymd = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0'), md = ymd.slice(5);
  const all = await tokens();
  const profs = await db.collection(P + 'profiles').get();
  for (const d of profs.docs) {
    const p = d.data();
    if (p.bday === md) await send(all, `🎂 It’s ${first(p.name)}’s birthday today!`, 'Send a wish in the app 💌', '', 'bday-' + d.id);
    if (p.anniv === md) await send(all, `💍 Happy anniversary, ${first(p.name)}!`, 'Send your wishes in the app 💌', '', 'anniv-' + d.id);
  }
  const occ = await db.collection(P + 'occasions').where('date', '==', ymd).get();
  for (const d of occ.docs) { const o = d.data(); await send(all, `${o.emoji || '🎉'} ${first(o.who)}: ${o.title || 'a special day'}!`, 'Send your wishes in the app 💌', ''); }
  const polls = await db.collection(P + 'polls').orderBy('createdAt', 'desc').limit(10).get();
  for (const d of polls.docs) {
    const p = d.data(), dt = (p.dates || []).find(x => x.date === ymd);
    if (dt && !p.archived) await send(all, '🏸 Game day today' + (dt.note ? ' · ' + dt.note : ''), 'See who’s in and get directions', '');
  }
});
