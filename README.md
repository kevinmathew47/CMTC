# Christos Mar Thoma Church, Kakkanad — Website Design Demo

A preview of the redesigned website for **Christos Mar Thoma Church, Kakkanad**, a parish of the Malankara Mar Thoma Syrian Church (est. 1997).

**Live demo:** https://kevinmathew47.github.io/CMTC/

## About the design

- **Calm, photo-led layout:** full-width parish photographs, serif headings, thin lines and numbered sections on every page.
- **Easy to find your way:** smooth drop-down menus on desktop, a full-screen menu on phones, a sub-menu for each section, and Previous / Next links between pages.
- **Parish Assistant:** a small chat assistant (the black orb at the bottom right) that answers questions about service times, events, clergy, committee members, prayer groups and more.
- **Newsletters as books:** every newsletter, download and the vicar's message opens as an interactive page-turning book. Swipe, tap or use the arrow keys; phones show one page at a time, and Zoom shows small print up close.
- **Works on any screen:** small phones (320px) up to large desktops.

## Pages

| Section | Pages |
|---|---|
| About Us | Parish History, Service Times, Our Vicar, Message from Vicar, Former Vicars, Programmes, Kaisthana Samithi, Prayer Groups |
| Organizations | Edavaka Mission, Edavaka Vikasana Sanghom, Sevika Sangham, Choir, Yuvajana Sakhyam, Young Family Fellowship, Sunday School, Senior Citizens Fellowship |
| News & Events | Announcements, Events, Calendar, Newsletters, Photos, Videos |
| Resources | Songs, Downloads, Links, Reading Resources, Online Prayer Meetings |
| Contact | Address, map and contact form |

## About this demo

This is a static copy of the website, made only to show the design. On the full website:

- church staff update everything (events, notices, photos, newsletters…) from an **admin panel**, without touching code;
- the **contact form** delivers messages to the church office (in the demo it only shows a notice);
- the assistant can also use **Claude AI** for smarter answers (the demo uses its built-in answers);
- every photo is available (the demo shows up to 8 photos per album), and books are drawn straight from the original PDFs with a Download button (the demo uses page images instead).

## Viewing it

GitHub Pages serves this repository: **Settings → Pages → Deploy from a branch → `main` / `(root)`**.

To view it on your own computer, run `python -m http.server` in this folder and open http://localhost:8000.

---

The full website project generates this repository with `npm run demo`. Rebuild it instead of editing these files by hand.
