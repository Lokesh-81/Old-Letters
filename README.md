# OLD-LETTERS

OLD-LETTERS is a modern digital correspondence platform where users write scheduled letters and optionally attach personal voice or video messages that remain sealed until delivery. Built around the ethos of patient communication, letters cannot be unsealed prematurely and arrive with ceremonial unsealing.

## Features

- Digital letter composition with tactile stationery selection and auto-saving drafts
- Scheduled letter delivery with a canonical 48-hour minimum intentional waiting period
- Custom stationery gallery featuring diverse paper weights, textures, and wax seals
- Recipient details and delivery tracking with distinct sender and recipient identities
- Optional voice message enclosures
- Optional video message enclosures
- UPI payment workflow with QR code remittance and UTR reference submission
- Payment verification workflow with administrative review
- Admin verification dashboard for approving or rejecting payments with postal audit logs
- Secure private media storage using MongoDB GridFS
- Recipient delivery experience featuring temporal countdowns and unsealing verification
- Automatic media retention and deletion after delivery
- Transactional email notifications across the letter and payment lifecycle
- Authentication with Google OAuth 2.0 and email/password with protected user and admin areas

## Tech Stack

### Frontend
- React 19
- TypeScript
- Vite
- Tailwind CSS
- Motion (Framer Motion)
- Lucide React

### Backend
- Node.js
- Express
- Zod

### Database & Storage
- MongoDB Atlas
- MongoDB GridFS

### Authentication
- Google OAuth 2.0 (`passport`, `passport-google-oauth20`)
- JWT session cookies (`jsonwebtoken`, `cookie-parser`, `bcryptjs`)

### Payments
- UPI / manual UTR verification

### Deployment
- Vercel

### Email
- Gmail SMTP via Nodemailer (`nodemailer`)

## Project Structure

```text
OLD-LETTERS/
├── src/
│   ├── components/
│   │   ├── admin/
│   │   ├── auth/
│   │   ├── bureau/
│   │   ├── common/
│   │   ├── composer/
│   │   ├── landing/
│   │   ├── payment/
│   │   ├── recipient/
│   │   └── ui/
│   ├── data/
│   ├── lib/
│   └── types/
├── api/
├── public/
├── scripts/
├── server.ts
├── package.json
└── README.md
```
