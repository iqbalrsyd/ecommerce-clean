# E-Commerce Monolith (Clean / Hardened)

## Deskripsi

Aplikasi e-commerce monolitik menggunakan Node.js + Express + SQLite. Repository ini adalah **baseline aman** untuk pengujian sistem DevSecOps adaptif — semua celah pada versi `*-vuln` telah dimitigasi.

## Ground Truth

| Atribut | Nilai |
|---------|-------|
| Arsitektur | Monolith |
| Domain | E-commerce |
| Bahasa | Node.js 20 (JavaScript) |
| Framework | Express.js 4.19 |
| Database | SQLite (better-sqlite3) |
| Deployment | Docker (distroless-style) |
| Tingkat Keamanan | Hardened (baseline PCI DSS) |

## Kontrol Keamanan yang Diterapkan

1. **No hardcoded secrets** — semua secret via env (`JWT_SECRET`, `STRIPE_*`, `DB_PASSWORD`), divalidasi saat startup. `.env` di-ignore, hanya `.env.example` yang di-commit.
2. **Parameterized queries** — semua query SQL menggunakan `?` placeholder; tidak ada string concatenation.
3. **XSS prevention** — `helmet` CSP, output JSON (bukan HTML), input `escape()` via `express-validator`.
4. **CSRF protection** — `csurf`-style double-submit token di `/checkout` dengan `safeEqual` comparison.
5. **Strong authentication** — password di-hash dengan `bcrypt` (cost 12, min 12 char), JWT HS256 dengan expiry 1 jam dan `iss` claim.
6. **Secure cookies** — `httpOnly`, `secure` (prod), `sameSite: 'strict'`, `path=/`.
7. **Rate limiting** — `express-rate-limit` per-IP untuk `/auth` (10/15m) dan API umum (300/15m).
8. **Input validation** — `express-validator` dengan whitelist + length checks di semua endpoint.
9. **CORS allowlist** — hanya origin di `CORS_ALLOWED_ORIGINS` yang boleh, credentials hanya untuk origin tersebut.
10. **Security headers** — `helmet` dengan CSP, HSTS (preload), Referrer-Policy, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`.
11. **Hardened container** — base image pinned by digest, multi-stage build, non-root user (`appuser` UID 1001), `dumb-init`, `HEALTHCHECK`, `npm ci --omit=dev`, `.dockerignore` lengkap.
12. **Authorization checks** — `/orders` memastikan `req.user.sub` cocok dengan target user (kecuali admin).
13. **Verbose error suppressed** — 5xx response generik, error asli hanya di log server.
14. **Updated dependencies** — `express@4.19.2`, `lodash` dihapus, `jsonwebtoken@9.0.2` (algoritma allowlist).

## Cara Menjalankan

```bash
cp .env.example .env   # lalu isi secret via secret manager / vault
npm ci
npm test
npm start
```

Aplikasi berjalan di port `3000`.

## Endpoint Utama

- `GET /` — home
- `GET /health` — health check (no env info)
- `POST /auth/register` — registrasi user (validasi + bcrypt)
- `POST /auth/login` — login user (rate-limited, bcrypt compare)
- `GET /products` — daftar produk
- `GET /products/:id` — detail produk + review
- `POST /products/:id/review` — tambah review (input disanitasi)
- `GET /checkout/csrf-token` — ambil CSRF token
- `POST /checkout` — proses checkout (CSRF + auth + validasi)
- `GET /orders` — daftar order (filtered by `req.user.sub`)

## Build Container

```bash
docker build -t ecommerce-monolith-clean:1.0.0 .
docker run --rm -p 3000:3000 \
  -e JWT_SECRET=$(openssl rand -hex 32) \
  -e STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY \
  -e NODE_ENV=production \
  ecommerce-monolith-clean:1.0.0
```

## Hasil yang Diharapkan dari Sistem DevSecOps

- **Domain detection:** e-commerce
- **Technology detection:** Node.js, Express, SQLite
- **Architecture detection:** monolith
- **Deployment detection:** Docker
- **Secret scan:** PASS (tidak ada secret terkomit)
- **SAST (SQLi, XSS, CSRF, auth):** PASS
- **Dependency scan:** PASS (deps up-to-date, tidak ada CVE kritis)
- **Container scan:** PASS (rootless, pinned digest, healthcheck)
- **Risk score:** rendah
- **Standards coverage:** PCI DSS baseline terpenuhi
