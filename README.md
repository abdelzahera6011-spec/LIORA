# LIORA

Women's accessories store (red and gold), in Arabic and English, with a shopping cart.

- `Main.dc.html` / `index.html` - bilingual home page, category views, cart and checkout
- `Artboard-v1ky.dc.html`, `Necklaces.dc.html`, `Bracelets.dc.html`, `Rings.dc.html` - category pages
- `api/order.js` - Vercel function that sends each order (text and photos) to Telegram
- `assets/` - product photos
- `_runtime/` - what runs the pages in a browser

Environment variables (set in Vercel): `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
