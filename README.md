# JAS Tour & Travels

A fast, fully responsive travel website for **JAS Tour & Travels** — holiday packages, flight tickets, train reservations and bus bookings, all handled from one desk.

## 🔗 Live Site

**👉 [https://erkuldeepkushwah.github.io/jas/index.html](https://erkuldeepkushwah.github.io/jas/index.html)**

Click the link above to open the live website.

---

## About Me

Hi, I'm **Kuldeep Kushwah** — the developer behind this site.

I built JAS Tour & Travels as a clean, single-place web presence for a family-run travel desk based in Indore. The idea was simple: a traveller should be able to browse domestic and international holiday packages, check flights, trains and buses, and reach a real human on WhatsApp — without juggling six apps and four phone numbers.

**What I work with:** HTML5, CSS3, vanilla JavaScript, Node.js and Express, Git and GitHub, and GitHub Actions for automated deployment.

**What I care about:** pages that load fast on a phone, layouts that stay readable on any screen, honest content with no hidden charges, and code that is easy for the next person to pick up.

- GitHub: [@erkuldeepkushwah](https://github.com/erkuldeepkushwah)
- Live project: [JAS Tour & Travels](https://erkuldeepkushwah.github.io/jas/index.html)
- Email: [hello@jastravels.in](mailto:hello@jastravels.in)

---

## Pages

| Page | File | What it covers |
|---|---|---|
| Home | `index.html` | Hero, services, featured packages, reviews, newsletter |
| About Us | `about.html` | Who we are, why travellers choose JAS, contact details |
| Domestic Holidays | `domestic.html` | Holiday packages across India |
| International Holidays | `international.html` | Overseas getaways and packages |
| Flight Booking | `flight.html` | Domestic and international flight enquiries |
| Train Booking | `train.html` | IRCTC train assistance |
| Bus Booking | `bus.html` | Express bus and charter bookings |
| Contact | `contact.html` | Enquiry form, phone, email and address |

## Features

- Responsive layout built for mobile, tablet and desktop
- Package listings for 50+ Indian destinations and 8 international getaways
- Booking enquiry forms for flights, trains, buses and tailor-made packages
- WhatsApp-first support, with click-to-call and click-to-email links
- Search overlay, login/signup modal and newsletter signup
- No build step, no framework — plain HTML, CSS and JavaScript

## Tech Stack

- **Frontend:** HTML5, CSS3, vanilla JavaScript
- **Optional server:** Node.js + Express (`server.js`) for local serving
- **Hosting:** GitHub Pages, deployed automatically by GitHub Actions
- **Assets:** images and logos in `assets/img/`

## Run Locally

The site is static, so any of these will work:

```bash
# 1. Open directly
open index.html

# 2. Or serve it with the included Express server
npm install
npm run dev
# then visit http://localhost:3000
```

## Deployment

Every push to `main` triggers `.github/workflows/deploy-pages.yml`, which assembles the static pages and the `assets/` folder and publishes them to GitHub Pages. The `Jas/` folder holds raw theme copies and is not part of the published site.

To publish manually: **Settings → Pages → Source: GitHub Actions**, then push to `main`.

## Project Structure

```
jas/
├── index.html              # Home
├── about.html              # About Us
├── domestic.html           # Domestic holiday packages
├── international.html      # International holiday packages
├── flight.html             # Flight booking
├── train.html              # Train booking
├── bus.html                # Bus booking
├── contact.html            # Contact
├── assets/img/             # Photos, avatars, logos, favicon
├── Jas/                    # Raw theme copies (not published)
├── server.js               # Optional local Express server
├── package.json
├── metadata.json
├── CREDITS.md              # Photo credits and licences
└── .github/workflows/      # GitHub Pages deployment
```

## Contact

**JAS Tour & Travels**
147-C, Saifee Nagar Main Rd, Near SBI ATM, Khatiwala Tank, Transport Nagar, Indore, Madhya Pradesh 452014

- Phone: [+91 79870 56200](tel:+917987056200)
- Landline: 0731-4225870
- WhatsApp: [+91 79870 56200](https://wa.me/917987056200)
- Email: [hello@jastravels.in](mailto:hello@jastravels.in)

## Credits

Photographs are from Wikimedia Commons under CC BY and CC BY-SA licences, plus images supplied by the site owner. See [CREDITS.md](CREDITS.md) for the full attribution table. Please keep that file with the site.

---

© 2026 JAS Tour & Travels. All rights reserved.
