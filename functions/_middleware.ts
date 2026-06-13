/**
 * Cloudflare Pages Function wrapper
 * Initializes storage adapter with KV binding
 */

export const onRequest = async (context: any) => {
  if (context.env) {
    const { setCloudflareEnv } = await import('@/lib/db');
    setCloudflareEnv(context.env);
  }
  return context.next();
};
