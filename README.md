# Cotton Street 🛍️

> Gaborone's premier streetwear & electronics e-commerce platform

![Cotton Street](https://img.shields.io/badge/Cotton%20Street-E--Commerce-c8a96e?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=for-the-badge&logo=python)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)
![Cloudinary](https://img.shields.io/badge/Cloudinary-Images-3448C5?style=for-the-badge)

---

## Overview

Cotton Street is a full-stack e-commerce platform built for a real Gaborone-based streetwear and electronics business. The platform replaces Instagram DM ordering with a professional web presence — customers browse products, add to bag, and send a structured WhatsApp order in one tap.

**Live business:** [@_cottonstreet_apparel](https://instagram.com/_cottonstreet_apparel) on Instagram

---

## Features

- 🛒 **Product catalogue** — dynamic categories, filter tabs, real-time stock status
- 📱 **WhatsApp ordering** — bag items convert to a formatted WhatsApp message instantly
- 🔒 **Admin authentication** — JWT-protected admin routes
- 🖼️ **Cloudinary image management** — upload, store and serve product photos via CDN
- 📦 **Order logging** — every order is saved to the database before WhatsApp redirect
- ⚡ **Fast API** — async FastAPI backend with full Swagger documentation at `/docs`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML / CSS / JavaScript |
| Backend | FastAPI (Python 3.12) |
| Database | PostgreSQL via Supabase |
| Images | Cloudinary CDN |
| Auth | JWT (python-jose + passlib) |
| Frontend Host | Vercel (static) |
| Backend Host | Render / Railway |

---

## Project Structure

```
cottonstreet/
├── backend/
│   ├── main.py                 # App entry point & CORS config
│   ├── database.py             # Supabase client connection
│   ├── auth.py                 # JWT auth utilities
│   ├── cloudinary_util.py      # Cloudinary upload/delete helpers
│   ├── requirements.txt        # Python dependencies
│   ├── .env                    # Environment variables (never committed)
│   └── routers/
│       ├── auth.py             # /api/auth — login, setup
│       ├── products.py         # /api/products — CRUD
│       ├── categories.py       # /api/categories — CRUD
│       ├── orders.py           # /api/orders — log & manage
│       └── uploads.py          # /api/upload — Cloudinary
├── frontend/
│   ├── index.html              # Main storefront
│   └── admin/                  # Admin panel (in progress)
├── .gitignore
└── README.md
```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/products` | Public | List products (filter by category, stock) |
| POST | `/api/products` | Admin | Create product |
| PUT | `/api/products/{id}` | Admin | Update product |
| DELETE | `/api/products/{id}` | Admin | Delete product |
| GET | `/api/categories` | Public | List all categories |
| POST | `/api/orders` | Public | Log a new order |
| GET | `/api/orders` | Admin | View all orders |
| POST | `/api/auth/login` | Public | Admin login → JWT token |
| POST | `/api/upload/image` | Admin | Upload image to Cloudinary |

Full interactive docs available at `/docs` when server is running.

---

## Database Schema

```sql
categories  — id, name, slug, created_at
products    — id, name, variant, price, old_price, badge, category_id,
              image_url, cloudinary_id, in_stock, created_at
orders      — id, customer_name, customer_phone, customer_town,
              items_json, total, status, notes, created_at
admins      — id, email, hashed_password, created_at
```

---

## Getting Started

### Prerequisites
- Python 3.12+
- Supabase account
- Cloudinary account

### Installation

```bash
# Clone the repo
git clone https://github.com/Kartellxrd/cottonstreet.git
cd cottonstreet/backend

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Fill in your Supabase and Cloudinary credentials

# Run the server
uvicorn main:app --reload --port 8000
```

### Environment Variables

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FRONTEND_URL=http://localhost:5500
```

### Serve the Frontend

```bash
cd /path/to/cottonstreet
python3 -m http.server 5500
```

Open `http://localhost:5500` in your browser.

---

## Roadmap

- [x] FastAPI backend with Supabase
- [x] Product & category management
- [x] Order logging to database
- [x] WhatsApp order flow
- [x] Cloudinary image uploads
- [x] JWT admin authentication
- [x] Wired frontend (no hardcoded data)
- [ ] Admin panel UI
- [ ] Product image upload from admin panel
- [ ] Order status management
- [ ] Deployment (Vercel + Render)

---

## Developed By

Built by **Kago** — Computer Science student at the University of Botswana, building real-world digital solutions for Botswana businesses.

> *"The first streetwear business in Botswana with a proper website."*

---

## License

This project is private and built for a real client. All rights reserved © 2026 Cotton Street.
