# CU AR Department Directory — Setup Guide

## 1. Import the database

Open phpMyAdmin (http://localhost/phpmyadmin) and run:

    db/schema.sql

Or via terminal:
    mysql -u root -p < db/schema.sql

## 2. Place files in XAMPP

Copy the entire `cu-ar-directory/` folder to:

    C:\xampp\htdocs\cu-ar-directory\      (Windows)
    /Applications/XAMPP/htdocs/cu-ar-directory/   (Mac)

## 3. Add required assets

| Folder              | What to put there                          |
|---------------------|--------------------------------------------|
| assets/targets/     | cu-logo.mind  (see README inside)          |
| assets/logos/       | cea.png, ccs.png … (8 dept logos + placeholder.png) |
| assets/models/      | eagle.glb, owl.glb … (8 animal GLB models) |

## 4. Update department descriptions

Edit `db/schema.sql` (or use phpMyAdmin) to replace the placeholder
descriptions with the official text from the Capitol University website.

## 5. Run

Open in a browser on your phone or computer:

    http://localhost/cu-ar-directory/

> IMPORTANT: MindAR requires HTTPS or localhost.
> On a real phone, host via XAMPP + ngrok, or deploy to a server.
> On desktop, localhost works fine for testing.

## Project structure

    cu-ar-directory/
    ├── index.php           ← AR scanner (MindAR + Three.js)
    ├── department.php      ← Department detail + 3D mascot
    ├── config/db.php       ← DB credentials
    ├── api/departments.php ← JSON API
    ├── db/schema.sql       ← Database setup
    ├── css/style.css
    ├── js/
    │   ├── ar-main.js      ← AR logic (image tracking + raycasting)
    │   └── mascot-viewer.js← Three.js GLB model viewer
    └── assets/
        ├── targets/        ← .mind image target file
        ├── logos/          ← department PNG logos
        └── models/         ← animal GLB 3D models

## Tech stack

- PHP + MySQL (XAMPP) — backend & data
- MindAR.js 1.2.5 — image target recognition
- Three.js 0.160 — 3D rendering & mascot viewer
- Pure HTML/CSS/JS — no build step needed

## Hosting on GitHub Pages (free, HTTPS)

The site is fully static now (index.html + department.html read
data/departments.json), so it runs on GitHub Pages with no PHP.

1. Push this folder to a public GitHub repo.
2. Repo → Settings → Pages → Source: "Deploy from a branch",
   Branch: main, folder: / (root) → Save.
3. After ~1 minute it is live at https://<username>.github.io/<repo>/

To update: edit, then `git add -A && git commit -m "..." && git push`.

Notes:
- GitHub Pages is HTTPS, so the AR camera works on real phones.
- compile.html: on GitHub Pages it downloads cu-logo.mind instead of
  saving it; put the file in assets/targets/ and push.
- Old PHP pages are kept in _local/ (ignored by git); api/, config/, db/
  are local XAMPP only.
