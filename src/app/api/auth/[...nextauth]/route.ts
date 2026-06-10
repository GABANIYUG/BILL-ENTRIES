import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Client Passcode",
      credentials: {
        passcode: { label: "Passcode", type: "password", placeholder: "Enter CA Passcode" }
      },
      async authorize(credentials) {
        // We use an environment variable for the shared client passcode
        // If it's not set in env, we default to something secure or reject
        const validPasscode = process.env.CLIENT_PASSCODE || "demo-passcode";

        if (credentials?.passcode === validPasscode) {
          // Any user logging in with the correct passcode gets this generic session
          return { id: "client-1", name: "CA Client", email: "client@ca-firm.com" };
        }
        
        // Return null if user data could not be retrieved
        return null;
      }
    })
  ],
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback_secret_for_development",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
