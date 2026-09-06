# MindMate – Personal Gemini Journal

> A production-ready, full-stack personal AI journal and reflection sanctuary powered by **React**, **Node.js (Express)**, **Firebase Authentication**, **Google Cloud Firestore**, and **Gemini 3.8 Flash**.

---

## Features

- **Google Sign-In with Firebase Authentication**: Mandatory user authentication via Google Sign-In. Unauthenticated users are prevented from accessing the journal, reflections, chat, or dashboard.
- **Complete UID Isolation in Cloud Firestore**: Every user's journal entries, conversations, and reflections are stored under `/users/{uid}/...` with strict Firestore security rules.
- **Server-Side Firebase Token Verification**: All protected Gemini API endpoints require and verify a Firebase ID token via Firebase Admin SDK with Application Default Credentials.
- **Multi-Turn Gemini AI Conversations**: Empathic, grounded reflection chat with Gemini that understands the context of your recent journal entries.
- **Mood & Reflection Summary**: Automated psychological synthesis analyzing the user's actual journal entries for:
  - Detected overall mood & emotional score (1–10)
  - Key recurring themes
  - Positive highlights & inner strengths
  - Areas of concern & mindful guidance
  - Resonant takeaway narrative & forward-looking journaling prompt
- **Full Journal Management**: Create, edit, search, filter by mood/tag, and delete entries with real-time Firestore synchronization.
- **AI Prompt Sparks**: On-demand reflective questions tailored to your current mood to overcome writer's block.
- **Server-Side Security**: The `GEMINI_API_KEY` is strictly accessed server-side and never exposed to the client.
- **Google Cloud Run Ready**: Multi-stage Dockerfile and containerized architecture configured for deployment with Google Cloud Secret Manager.

---

## Architecture Overview

```
Client (React + Vite + Tailwind CSS)
  │
  ├── Firebase Auth (Google Sign-In)
  ├── Cloud Firestore (users/{uid}/journalEntries, conversations, reflections)
  │
  └── Express Backend API (/api/...)
        │
        ├── Firebase Admin SDK (Verifies Authorization: Bearer <ID token>)
        │
        └── Google Gen AI SDK (@google/genai)
              └── Gemini 3.8 Flash (Server-Side with telemetry User-Agent)
```

---

## Data Schema (Firestore)

All documents are scoped strictly by the authenticated user's Firebase UID:

### 1. Journal Entries
- **Path**: `/users/{uid}/journalEntries/{entryId}`
- **Fields**: `title`, `content`, `mood`, `moodScore`, `tags`, `createdAt`, `updatedAt`

### 2. Conversations
- **Path**: `/users/{uid}/conversations/{convoId}`
- **Fields**: `title`, `messages` (`{ id, role, content, timestamp }`), `relatedEntryId`, `createdAt`, `updatedAt`

### 3. Reflection Summaries
- **Path**: `/users/{uid}/reflections/{reflectionId}`
- **Fields**: `detectedMood`, `moodScore`, `moodColor`, `keyThemes`, `positiveHighlights`, `areasOfConcern`, `shortReflection`, `mindfulPrompt`, `entryCountAnalyzed`, `createdAt`

---

## Firestore Security Rules

Enforced in `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      match /journalEntries/{entryId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /conversations/{convoId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /reflections/{reflectionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }

      match /{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    match /{document=**} {
      allow read, write: false;
    }
  }
}
```

---

## Environment Variables

Defined in `.env.example`:

| Variable | Description | Location |
|---|---|---|
| `GEMINI_API_KEY` | Google Gemini API key for server-side AI calls | Server-side only (via Secret Manager) |
| `PORT` | Listening port for Express (default: `3000`) | Server-side only |
| `APP_URL` | Hosted URL of the application | Client & Server |
| `VITE_FIREBASE_*` | Optional Firebase overrides (defaults to `firebase-applet-config.json`) | Client-side |

*Note: Application Default Credentials (ADC) are used by the Firebase Admin SDK on Cloud Run without requiring a service-account JSON key file.*

---

## Local Development & Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Ensure `GEMINI_API_KEY` is provided in `.env` or the AI Studio Secrets panel.
   Firebase configuration is automatically loaded from `firebase-applet-config.json`.

3. **Start the development server**:
   ```bash
   npm run dev
   ```
   The application runs on `http://localhost:3000`.

4. **Verify TypeScript & Linting**:
   ```bash
   npm run lint
   ```

5. **Build for production**:
   ```bash
   npm run build
   ```

---

## Google Cloud Run Deployment (with Secret Manager)

Deploy securely to Google Cloud Run using Google Cloud Secret Manager for sensitive keys and Application Default Credentials for Firebase Admin SDK:

### 1. Enable Required Cloud Services
```bash
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com
```

### 2. Create the Secret in Secret Manager
```bash
# Create the secret and pipe your Gemini API key securely
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create GEMINI_API_KEY --data-file=-

# Grant Cloud Run's Compute Service Account access to read the secret
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Deploy to Cloud Run Mounting Secret
```bash
gcloud run deploy mindmate \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
```
