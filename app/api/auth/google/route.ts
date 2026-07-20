import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// This is a placeholder for Google OAuth integration
// To implement fully, you need to:
// 1. Set up Google Cloud Console project
// 2. Enable Google+ API
// 3. Create OAuth 2.0 credentials
// 4. Add authorized redirect URIs
// 5. Install and configure passport-google-oauth20 or similar

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get("returnTo") || "/account";

  // For now, return an error message indicating setup is required
  return NextResponse.json(
    {
      error: "Google Sign-In is not configured yet. Please use email/password authentication or contact support.",
      message: "To enable Google Sign-In, the administrator needs to configure Google OAuth credentials."
    },
    { status: 501 } // 501 Not Implemented
  );

  /*
  // Example implementation with Google OAuth would look like:

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  );

  const scopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: returnTo, // Pass returnTo as state
  });

  return NextResponse.redirect(authUrl);
  */
}
