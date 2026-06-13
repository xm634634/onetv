/**
 * Cloudflare Pages Function wrapper
 * Initializes storage adapter with KV binding
 */

import { setCloudflareEnv } from '@/lib/db';

export const onRequest = async (context: any) => {
  if (context.env) {
    setCloudflareEnv(context.env);
  }
  return context.next();
};
