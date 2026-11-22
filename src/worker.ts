import { App } from 'astro/app';
import { handle } from '@astrojs/cloudflare/handler';
import { rewriteAdminSlashRequest } from './lib/admin-entry';

type HandlerArgs = Parameters<typeof handle>;

export function createExports(manifest: ConstructorParameters<typeof App>[0]) {
  const app = new App(manifest);
  return {
    default: {
      async fetch(request: HandlerArgs[2], env: HandlerArgs[3], context: HandlerArgs[4]) {
        const rewritten = rewriteAdminSlashRequest(request as unknown as Request);
        return handle(manifest, app, rewritten as HandlerArgs[2], env, context);
      },
    },
  };
}
