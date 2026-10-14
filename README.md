# Samarpan Mani Gautam — Poetry

A small, static, poetry-only website. Poems in Nepali, no frameworks, no build step.

## Folder structure

```
samarpan-poetry/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── script.js
├── images/          (empty for now — optional, for a future portrait/favicon)
└── README.md
```

## Run it locally

Just double-click `index.html`. Or, for a local server:

```
python -m http.server 8000
```

then open http://localhost:8000

## Push to GitHub and publish (GitHub Pages)

1. Create a new empty repository on github.com (e.g. `samarpan-poetry`). Don't add a README there.
2. In a terminal, inside this folder:

```
git init
git add .
git commit -m "Initial poetry site"
git branch -M main
git remote add origin https://github.com/SamarpanManiGautam/samarpan-poetry.git
git push -u origin main
```

3. On GitHub: Settings → Pages → Source: "Deploy from a branch" → Branch: `main`, folder `/ (root)` → Save.
4. After a minute your site is live at `https://samarpanmanigautam.github.io/samarpan-poetry/`.

## Adding a new poem

Copy one `<article class="poem">…</article>` block in `index.html`, change its `id`, number, title and text, and add a matching line in the `<ol class="poem-index">` list. Use `<br>` for line breaks inside a stanza and a new `<p>` for each stanza.
