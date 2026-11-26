// Vercel serverless function: receives an order from the website and sends it
// (text + product photos) to your Telegram chat.
// Needs two environment variables in Vercel: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.

const CATALOG = {
  e1: { name: 'Pearl Hoop Earrings', price: 80 },
  e2: { name: 'Pearl Leaf Studs', price: 80 },
  e3: { name: 'Pearl Wave Studs', price: 80 },
  e4: { name: 'Twin Pearl Swirls', price: 80 },
  n1: { name: 'Rose Crystal Set', price: 120 },
  n2: { name: 'Stag Pendant Necklace', price: 120 },
  n3: { name: 'Sapphire Vine Set', price: 120 },
  b1: { name: 'Crystal Vine Bracelet', price: 120 },
  b2: { name: 'Rainbow Halo Bracelet', price: 120 },
  b3: { name: 'Heart Charm Bracelet', price: 120 },
  b4: { name: 'Rose Bud Bracelet', price: 120 },
  r1: { name: 'Heart Row Rings', price: 70 }
};

const IMAGE_FILE = {
  e1: '1bc278c1c1f458147601a8c5267426bc',
  e2: '906f1ea648c9a9e7f01180689771572f',
  e3: '841ad2d97b2dce6ceecc81114ff7bc36',
  e4: 'f44a618d221e3a1eb59b0e6445ec11c2',
  n1: '958a0ebbe404d78e9226252efad288fa',
  n2: '20fa0d9741c6d28d92ec2b394c74cda6',
  n3: 'd2a77fc92f257c05ca04e317daf015a1',
  b1: '82b2278407a5898c667d8d64295c01d8',
  b2: '3ba773abf2d4a7504006eb4f87befa1d',
  b3: 'b7ae63391e48efa3862c80727b426c18',
  b4: '6c56ab836e839441b4a6b053c2f6efa2',
  r1: '934241f612dbebdc96c9c06b72de0d1c'
};

const clean = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

async function telegram(token, method, body) {
  const r = await fetch('https://api.telegram.org/bot' + token + '/' + method, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const j = await r.json().catch(() => ({}));
  return !!(r.ok && j.ok);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'method' });
    return;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    res.status(500).json({ ok: false, error: 'not configured' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  const name = clean(body.name, 100);
  const phone = clean(body.phone, 30);
  const address = clean(body.address, 400);
  const notes = clean(body.notes, 300);
  const rawItems = Array.isArray(body.items) ? body.items.slice(0, 30) : [];

  const items = [];
  for (const it of rawItems) {
    const product = it && CATALOG[it.id];
    const qty = Math.floor(Number(it && it.qty));
    if (product && qty >= 1 && qty <= 99) {
      items.push({ id: it.id, qty: qty, name: product.name, price: product.price });
    }
  }

  if (!name || !address || phone.replace(/\D/g, '').length < 8 || items.length === 0) {
    res.status(400).json({ ok: false, error: 'invalid order' });
    return;
  }

  // Prices come from this file, not from the browser, so they cannot be edited by the customer.
  const total = items.reduce((n, it) => n + it.price * it.qty, 0);
  const lines = items.map((it) => '- ' + it.qty + ' x ' + it.name + ' = ' + (it.price * it.qty) + ' L.E.');
  const text = [
    'New order from LIORA website',
    '',
    'Name: ' + name,
    'Phone: ' + phone,
    'Address: ' + address
  ]
    .concat(notes ? ['Notes: ' + notes] : [])
    .concat(['', 'Items:'], lines, ['', 'Total: ' + total + ' L.E.'])
    .join('\n');

  const sent = await telegram(token, 'sendMessage', { chat_id: chatId, text: text });
  if (!sent) {
    res.status(502).json({ ok: false, error: 'telegram' });
    return;
  }

  // Product photos. If this part fails the order text has already reached you.
  try {
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const origin = 'https://' + host;
    const media = items.slice(0, 10).map((it) => ({
      type: 'photo',
      media: origin + '/assets/' + IMAGE_FILE[it.id] + '.jpg',
      caption: it.qty + ' x ' + it.name
    }));
    if (media.length === 1) {
      await telegram(token, 'sendPhoto', { chat_id: chatId, photo: media[0].media, caption: media[0].caption });
    } else if (media.length > 1) {
      await telegram(token, 'sendMediaGroup', { chat_id: chatId, media: media });
    }
  } catch (e) {
    // ignore photo errors
  }

  res.status(200).json({ ok: true });
};
