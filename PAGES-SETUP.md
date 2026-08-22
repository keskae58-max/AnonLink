# Enable GitHub Pages (required once)

The site files are already deployed to the **`gh-pages`** branch.
GitHub Pages is **not turned on yet** — that is why you see the 404.

## Turn it on (30 seconds)

1. Open **Settings → Pages**  
   https://github.com/keskae58-max/AnonLink/settings/pages

2. Under **Build and deployment** → **Source**, select:  
   **Deploy from a branch**

3. Set:
   - **Branch:** `gh-pages`
   - **Folder:** `/ (root)`

4. Click **Save**

5. Wait 1–2 minutes, then open:  
   **https://keskae58-max.github.io/AnonLink/**

---

## Alternative (use main branch instead)

If `gh-pages` is not listed, use:

- **Branch:** `main`
- **Folder:** `/ (root)`

Both branches contain the full site (`index.html`, assets, config).

---

## After Pages is live

- **Connect tab** → opens your encoded channel link (Chrome only)
- **⚙ button** → admin panel (`admin` / password from `npm run create-admin`)
- In-app browsers (Instagram, etc.) → blocked with “Reopen in Chrome” overlay

The favicon CSP message on GitHub’s 404 page is normal — it disappears once your site is live.
