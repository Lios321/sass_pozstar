import NextAuth from 'next-auth';
import { authOptions as baseAuthOptions } from '../../../lib/auth-options';
import CredentialsProvider from 'next-auth/providers/credentials';
import { authorizeUser } from '../../../lib/auth-logic';
import { getDbFromEnv } from '../../../lib/db/drizzle-functions';

export const onRequest: PagesFunction = async (context) => {
  const authOptions = {
    ...baseAuthOptions,
    providers: [
      CredentialsProvider({
        name: 'credentials',
        credentials: {
          email: { label: 'Email', type: 'email' },
          password: { label: 'Senha', type: 'password' }
        },
        async authorize(credentials) {
           const db = getDbFromEnv(context.env);
           return authorizeUser(credentials, db);
        }
      })
    ],
    secret: ((context.env as any).NEXTAUTH_SECRET as string) || process.env.NEXTAUTH_SECRET,
  };

  const handler = NextAuth(authOptions);
  
  // Cloudflare Pages Function context.params.nextauth can be string or string[]
  // NextAuth expects params.nextauth to be available.
  // We pass it via the second argument to handler.
  
  return handler(context.request as any, {
      params: { nextauth: context.params.nextauth }
  });
}
