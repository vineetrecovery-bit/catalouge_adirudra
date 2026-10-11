# Adirudra catalogue

The public catalogue is a static page. `index.html` loads `styles.css`, `contact-config.js`, `catalogue-data.js`, and `app.js`; no build step or package install is required.

## Run locally

From this directory:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/`. Search, filters, product details, WhatsApp enquiry, and the admin dialog can be tested there. Use `Ctrl+C` to stop the server.

`file:///.../index.html` also works for a quick visual preview. Browser storage on `localhost`, a `file:` URL, and the live domain are separate, so each may show different locally saved catalogue records.

## Catalogue data

The 14 original built-in products are preserved exactly in `catalogue-data.js`. At startup, `app.js` first reads the existing `adirudra_products` browser storage key. It never writes to or resets that key during startup. If saved data is malformed, the built-in collection remains viewable and editing is disabled so the saved value is not overwritten.

The existing `products.json`, `api.php`, and `script.js` files have not been modified by this rewrite. The previous public page used browser storage, so catalogue management continues to save changes in the current browser. After signing in, use **Download backup** before editing to export the exact saved value. Product records not being edited are written back from their original objects, including custom fields.

Product enquiries open WhatsApp with the original prefilled name and SKU message. The previous implementation did not specify a recipient number, so the default flow still asks the visitor to choose a chat. Set a verified business number in `contact-config.js` to open that chat directly. `mailto:` opens an email draft; the visitor must press Send, and delivery requires a working inbox. The admin credentials and login flow remain the same as the original page.
