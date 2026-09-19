This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Realistic-prospect testing

The AI prospect is prompt-driven, so it is regression-tested by replaying scripted callers into the real realtime
model (`scripts/prospect-harness/`):

```bash
npm run test:prospect -- --offline   # deterministic checks, no API calls
npm run test:prospect                # + live replays (needs OPENAI_API_KEY in .env.local)
npm run test:prospect -- --only=G1,H --runs=5 --verbose
```

Live replays use the app's real prompt, tools and model, but as scripted text turns, so they do **not** cover audio,
voice-activity detection, transcription, playback timing or interruption. The account's realtime tokens-per-minute
limit applies; the harness runs sequentially and backs off on rate limits.

Microphone / call-centre validation: sign in and open `/audio-check` (linked from the Ready screen). The VAD and
noise-gate constants live in `src/lib/realtime/audioConfig.ts` and have not been validated for call-centre floors.

## Database

`supabase/migrations/0018_realtime_provider_call.sql` adds `call_sessions.provider_call_id` /
`provider_hung_up_at`, `attach_provider_call()`, and `calls.extra`. Apply it **before** deploying this version: the
server now brokers the realtime handshake and stores the provider's call id so it can enforce the call-length cap.
