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

// Admin settings (Manage › Player permissions › Alert types): who gets each type, quiet hours
const DEF = { announce: 'must', poll: 'all', game: 'all', ask: 'all', post: 'all', occasion: 'all', proposal: 'on', comment: 'on', avo: 'on', chal: 'on', paid: 'on', pay: 'on', idea: 'on' };
let CFG = { at: 0, a: {} };
async function settings() {
  if (Date.now() - CFG.at < 60000) return CFG.a;
  const d = await db.collection(P + 'config').doc('main').get();
  CFG = { at: Date.now(), a: (d.exists && d.data().alerts) || {} };
  return CFG.a;
}
function quietNow(q) {
  if (!q || !q.on) return false;
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })), m = now.getHours() * 60 + now.getMinutes();
  const mins = v => { const [h, mm] = String(v || '0:0').split(':').map(Number); return h * 60 + (mm || 0); };
  const a = mins(q.from || '22:00'), b = mins(q.to || '07:00');
  return a <= b ? m >= a && m < b : m >= a || m < b;
}
async function send(list, title, body, link = '', tag = '', type = 'post') {
  const cfg = await settings(), mode = (cfg.t && cfg.t[type]) || DEF[type] || 'all';
  if (mode === 'off') return;
  if (mode === 'adm') list = list.filter(t => t.org);
  if (mode !== 'must') {
    if (quietNow(cfg.quiet)) return;
    list = list.filter(t => !(t.mute || []).includes(type));
  }
  if (!list.length) return;
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
  await send(await everyoneBut(x.name), title, txt || 'Tap to see it in the Club', '#club', 'post-' + e.params.id, x.kind === 'ask' ? 'ask' : x.kind === 'announce' ? 'announce' : 'post');
});

// Comments: tell the post's author
exports.onComment = onDocumentCreated(P + 'comments/{id}', async e => {
  const c = e.data.data();
  if (!String(c.target || '').startsWith('post:')) return;
  const p = await db.collection(P + 'posts').doc(c.target.slice(5)).get();
  if (!p.exists || key(p.data().name) === key(c.name)) return;
  const t = String(c.text || '');
  await send(await only(p.data().name), `💬 ${first(c.name)} commented`, t.startsWith('[gif]') ? 'sent a GIF' : t.startsWith('[stk]') ? 'sent a sticker' : t.slice(0, 120), '#club', '', 'comment');
});

// Avokudos: tell the person who received them
exports.onAvo = onDocumentCreated(P + 'avo/{id}', async e => {
  const g = e.data.data();
  await send(await only(g.to), `🥑 ${first(g.from)} appreciated you${g.amt ? ' · ' + g.amt + ' Avokudos' : ''}`, String(g.msg || '').slice(0, 120), '#club', '', 'avo');
});

// New availability poll: everyone
exports.onPoll = onDocumentCreated(P + 'polls/{id}', async e => {
  const p = e.data.data();
  await send(await tokens(), '🗳️ New poll: ' + (p.title || 'Are you in?'), 'Tap to vote Yes or No', '#poll-' + e.params.id, '', 'poll');
});

// Payments: organizers hear about "I've paid"; the player hears when it's confirmed
exports.onPayment = onDocumentCreated(P + 'payments/{id}', async e => {
  const x = e.data.data();
  if (x.status !== 'claimed') return;
  await send(await organizers(), `💸 ${first(x.payer || x.name)} says they paid ${inr(x.amount)}`, 'Check your UPI app and confirm', '#payouts', '', 'pay');
});
exports.onPaymentConfirmed = onDocumentUpdated(P + 'payments/{id}', async e => {
  const a = e.data.before.data(), b = e.data.after.data();
  if (a.status === 'claimed' && b.status === 'confirmed')
    await send(await tokens(t => key(t.name) === key(b.name) || key(t.name) === key(b.payer)), '✅ Payment confirmed', `${inr(b.amount)} received. Thank you! 💚`, '#payouts', '', 'paid');
});

// Ideas & problems: organizers
exports.onRequest = onDocumentCreated(P + 'requests/{id}', async e => {
  const r = e.data.data();
  await send(await organizers(), `${r.kind === 'bug' ? '🐞 Problem' : r.kind === 'q' ? '❓ Question' : '💡 Idea'} from ${first(r.name)}`, String(r.text || '').slice(0, 120), '#team', '', 'idea');
});

// Challenges: the people being challenged
exports.onChallenge = onDocumentCreated(P + 'challenges/{id}', async e => {
  const c = e.data.data(), who = (c.b || []).map(key);
  await send(await tokens(t => who.includes(key(t.name))), `⚔️ ${first(c.from)} challenged you`, String(c.msg || 'Accept the challenge?').slice(0, 120), '#cup', '', 'chal');
});

// Game proposals: admins hear about new ones; the player hears the answer
const sched = x => { try { const d = new Date(x.date + 'T00:00'); return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) + (x.note ? ' · ' + x.note : ''); } catch (e) { return ''; } };
exports.onProposal = onDocumentCreated(P + 'actions/{id}', async e => {
  const a = e.data.data();
  if (a.kind !== 'poll' || a.status !== 'pending') return;
  let x = {}; try { x = JSON.parse(a.value); } catch (err) {}
  await send(await organizers(), `🗓 ${first(a.name)} proposes a game`, sched(x) + (x.msg ? ' · “' + String(x.msg).slice(0, 80) + '”' : ''), '', 'prop-' + e.params.id, 'proposal');
});
exports.onProposalAnswer = onDocumentUpdated(P + 'actions/{id}', async e => {
  const a = e.data.before.data(), b = e.data.after.data();
  if (b.kind !== 'poll' || a.status !== 'pending' || b.status === 'pending') return;
  const r = b.reply || {}, who = await tokens(t => t.id === b.uid || key(t.name) === key(b.name));
  const title = b.status === 'declined' ? '✖ Your game proposal was declined' : r.how === 'modified' ? '✏️ Your game was changed & published' : '✅ Your game proposal is live';
  await send(who, title, (r.date ? sched(r) : '') + (r.msg ? ' · “' + String(r.msg).slice(0, 80) + '”' : ''), r.poll ? '#poll-' + r.poll : '', 'prop-' + e.params.id, 'proposal');
});

// Every morning at 8:00 IST: birthdays, anniversaries and today's game
exports.morning = onSchedule({ schedule: '0 8 * * *', timeZone: 'Asia/Kolkata' }, async () => {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const ymd = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0'), md = ymd.slice(5);
  const all = await tokens();
  const profs = await db.collection(P + 'profiles').get();
  for (const d of profs.docs) {
    const p = d.data();
    if (p.bday === md) await send(all, `🎂 It’s ${first(p.name)}’s birthday today!`, 'Send a wish in the app 💌', '', 'bday-' + d.id, 'occasion');
    if (p.anniv === md) await send(all, `💍 Happy anniversary, ${first(p.name)}!`, 'Send your wishes in the app 💌', '', 'anniv-' + d.id, 'occasion');
  }
  const occ = await db.collection(P + 'occasions').where('date', '==', ymd).get();
  for (const d of occ.docs) { const o = d.data(); await send(all, `${o.emoji || '🎉'} ${first(o.who)}: ${o.title || 'a special day'}!`, 'Send your wishes in the app 💌', '', '', 'occasion'); }
  const polls = await db.collection(P + 'polls').orderBy('createdAt', 'desc').limit(10).get();
  for (const d of polls.docs) {
    const p = d.data(), dt = (p.dates || []).find(x => x.date === ymd);
    if (dt && !p.archived) await send(all, '🏸 Game day today' + (dt.note ? ' · ' + dt.note : ''), 'See who’s in and get directions', '', '', 'game');
  }
});
