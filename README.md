# PIN & TELL — End-to-end pin test without Android

Run in Windows PowerShell 7 from `E:\PROJECTS\pin-and-tell-webadmin`.

This performs a real Supabase Auth login as a normal test user, uploads a harmless photo to `pin-photo-staging`, and calls `POST http://localhost:3000/api/pins` with the authenticated user's bearer token. It does not use the service-role key or insert directly into `public.pins`.

## Requirements
- Next.js is running locally: `npm run dev`
- npm dependencies are installed, including `@supabase/supabase-js`
- `.env.local` includes `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or publishable equivalent)
- A real Supabase Auth test account with email/password and matching active row in `profiles`
- Harmless `public/images/pin-tell-logo.png` exists
- `pin-photo-staging` must be PRIVATE and policies must allow test user uploads to their own UUID folder. The backend will reject a public staging bucket.

## Install
Extract ZIP in project root; it contains `tools/test-full-pin-flow.mjs`.

## Run (PowerShell; test login password stays out of shell history)

```powershell
cd E:\PROJECTS\pin-and-tell-webadmin
npm run dev
```

In a **second PowerShell window**:

```powershell
cd E:\PROJECTS\pin-and-tell-webadmin
$cred = Get-Credential -Message 'Supabase Auth TEST account (not admin dashboard login)'
$env:PT_TEST_EMAIL = $cred.UserName
$env:PT_TEST_PASSWORD = $cred.GetNetworkCredential().Password
try {
  node .\tools\test-full-pin-flow.mjs .\public\images\pin-tell-logo.png 0 0
} finally {
  Remove-Item Env:\PT_TEST_EMAIL,Env:\PT_TEST_PASSWORD -ErrorAction SilentlyContinue
  Remove-Variable cred -ErrorAction SilentlyContinue
}
```

Coordinates `0 0` are a test-only placeholder. Replace them with the place where you want to see the test pin after you approve it.

## Interpret results
- `HTTP 202` `status: pending_review`: correct result for a harmless photo while auto photo approval is disabled. Check the Pending tab in the admin dashboard, and verify no public pin exists before approval.
- `HTTP 422` `IMAGE_POLICY_VIOLATION`: model detected a severe violation and backend blocked the post.
- `HTTP 503` `STAGING_BUCKET_NOT_PRIVATE`: the staging bucket is still public or inaccessible. Fix that before continuing.
- `HTTP 503` image moderation error: provider privacy gate or image scanner failure; image is not published.
- `HTTP 401` or `403`: authentication or active profile/account checks failed.
- `HTTP 201` `published` for a photo: this is unexpected with the current all-photo-review safeguard. Investigate before using real user images.

This test checks the server path, not proof that Android uses it. You must still lock down `public.pins` direct INSERT permissions and check Storage RLS policies; otherwise real apps can bypass the API. It also does not prove model accuracy. Use only a non-sensitive logo with the free NVIDIA provider.

A failed submission may leave a harmless staged object for manual cleanup. After approving the test pin, remove it from the test data using your normal admin controls.
