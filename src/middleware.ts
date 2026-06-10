export { default } from "next-auth/middleware";

export const config = {
  // Protect all routes under the app, except the auth API and the signin page
  matcher: [
    "/",
    "/api/convert",
    "/((?!api/auth|_next/static|_next/image|favicon.ico|auth/signin).*)"
  ],
};
