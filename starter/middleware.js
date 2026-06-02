import { authMiddleware } from '@clerk/nextjs/server';

export default authMiddleware({
  publicRoutes: () => true,
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
};
