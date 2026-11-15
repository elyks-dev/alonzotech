# AlonzoTech

AlonzoTech is a React social community app for sharing short technology posts and longer articles. Users can create posts, like and reply to posts, publish and edit articles, manage their profile, and switch between light and dark themes. Articles are publicly readable; the home feed, account, and settings areas require authentication.

The app uses Firebase Authentication and Firestore for accounts and content, Cloudinary for article/profile image uploads, React Router for navigation, and Tailwind CSS for styling.

## Features

- Email/password sign up and login
- Self-healing user profiles for older or incomplete accounts
- Home feed with paginated posts, likes, replies, editing, and deletion
- Public articles feed with article creation, editing, likes, replies, and deletion
- Account profile editing and old-content profile synchronization
- Light/dark theme toggle persisted in local storage
- Responsive two-column and three-column layouts
- Cloudinary image uploads with image validation and lightbox previews

## Tech stack

- React 19
- Vite
- React Router
- Firebase Auth and Firestore
- Cloudinary unsigned image uploads
- Tailwind CSS 4
- lucide-react icons

## Prerequisites

- Node.js 18 or newer
- npm
- A Firebase project
- A Cloudinary account with an unsigned upload preset

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a local `.env` file in the project root. Do not commit it.

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id

VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset
```

These values are read by [firebase.js](./src/lib/firebase.js) and [cloudinary.js](./src/services/cloudinary.js). The `.gitignore` excludes `.env` files.

### 3. Configure Firebase

In the Firebase console:

1. Create or select a Firebase project.
2. Enable **Authentication → Sign-in method → Email/Password**.
3. Create a Firestore database.
4. Publish the rules in [firestore.rules](./firestore.rules).
5. Add the deployed app's domain to **Authentication → Settings → Authorized domains** when hosting outside localhost.

The application uses these main Firestore paths:

- `users/{uid}` — profile, role, and account metadata
- `posts/{postId}` — feed posts and counters
- `posts/{postId}/likes/{uid}`
- `posts/{postId}/replies/{replyId}`
- `articles/{articleId}` — article content, author data, and counters
- `articles/{articleId}/likes/{uid}`
- `articles/{articleId}/replies/{replyId}`

The profile synchronization service uses collection-group queries for `likes` and `replies`. If Firebase asks for a Firestore index, create the suggested index from the Firebase error link.

### 4. Configure Cloudinary

In Cloudinary:

1. Create or select a cloud.
2. Create an **unsigned** upload preset.
3. Put the cloud name and upload preset in `.env`.

The app accepts image files up to 5 MB through the upload service.

## Run locally

```bash
npm run dev
```

Then open the local URL shown by Vite, usually `http://localhost:5173`.

## Build and preview

```bash
npm run build
npm run preview
npm run lint
```

## Firebase hosting deployment

Install and authenticate with the Firebase CLI if needed:

```bash
npm install -g firebase-tools
firebase login
```

Initialize hosting if this has not been done:

```bash
firebase init hosting
```

The existing [firebase.json](./firebase.json) serves `dist` and rewrites routes to `index.html` for React Router.

Build and deploy hosting:

```bash
npm run build
firebase deploy --only hosting
```

Publish Firestore rules separately:

```bash
firebase deploy --only firestore:rules
```

Verify that the Firebase CLI is using the intended project with `firebase use` before deploying.

## Routes

### Public

- `/login`
- `/signup`
- `/articles`
- `/articles/:id`

### Authenticated

- `/` — Home feed
- `/account` — Profile and content
- `/settings` — Preferences, password, and logout

## Project structure

```text
src/
  components/   Shared UI such as avatars, lightboxes, and likes
  context/      Authentication and theme state
  layouts/      Shared application layout
  pages/        Auth and article-detail pages
  screens/      Home, articles, account, and settings screens
  services/     Cloudinary, engagement, and profile synchronization
  lib/          Firebase initialization
```

## Notes

- Never commit `.env` or private credentials.
- Firestore security rules are the authority for access control; UI checks are not a substitute for rules.
- Existing content is not automatically truncated when composer limits are changed.
