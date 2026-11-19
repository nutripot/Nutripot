// ============================================================================
// BusinessHub Enterprise - Edge Serverless Router for Cloudflare Workers
// Zero dependencies, fast regex route matching, middleware execution
// ============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS';

export interface RouteContext {
  request: Request;
  env: Env;
  params: Record<string, string>;
  url: URL;
  userId?: string;
  userRole?: string;
  data?: any;
}

export interface Env {
  DB: D1Database;
  STORAGE?: R2Bucket;
  ENVIRONMENT: string;
  BASE_URL: string;
  SESSION_TTL_SECONDS?: string;
  BOOTSTRAP_TOKEN?: string;
}

export type Handler = (ctx: RouteContext) => Promise<Response> | Response;
export type Middleware = (ctx: RouteContext, next: () => Promise<Response>) => Promise<Response>;

interface Route {
  method: HttpMethod;
  pattern: RegExp;
  paramNames: string[];
  handler: Handler;
  middlewares: Middleware[];
}

export class Router {
  private routes: Route[] = [];
  private globalMiddlewares: Middleware[] = [];

  use(middleware: Middleware): void {
    this.globalMiddlewares.push(middleware);
  }

  add(method: HttpMethod, path: string, handler: Handler, ...middlewares: Middleware[]): void {
    const paramNames: string[] = [];
    const regexPath = path.replace(/:([a-zA-Z0-9_]+)/g, (_, paramName) => {
      paramNames.push(paramName);
      return '([^/]+)';
    });
    const pattern = new RegExp(`^${regexPath}$`);
    this.routes.push({ method, pattern, paramNames, handler, middlewares });
  }

  get(path: string, handler: Handler, ...middlewares: Middleware[]): void {
    this.add('GET', path, handler, ...middlewares);
  }

  post(path: string, handler: Handler, ...middlewares: Middleware[]): void {
    this.add('POST', path, handler, ...middlewares);
  }

  put(path: string, handler: Handler, ...middlewares: Middleware[]): void {
    this.add('PUT', path, handler, ...middlewares);
  }

  delete(path: string, handler: Handler, ...middlewares: Middleware[]): void {
    this.add('DELETE', path, handler, ...middlewares);
  }

  async handle(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method as HttpMethod;

    // Handle preflight OPTIONS
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': request.headers.get('Origin') || '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Idempotency-Key',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Match route
    for (const route of this.routes) {
      if (route.method !== method) continue;
      const match = url.pathname.match(route.pattern);
      if (match) {
        const params: Record<string, string> = {};
        route.paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(match[i + 1]);
        });

        const ctx: RouteContext = { request, env, params, url };
        const pipeline = [...this.globalMiddlewares, ...route.middlewares];

        let index = 0;
        const next = async (): Promise<Response> => {
          if (index < pipeline.length) {
            const mw = pipeline[index++];
            return await mw(ctx, next);
          }
          return await route.handler(ctx);
        };

        try {
          return await next();
        } catch (err: any) {
          console.error('[ROUTER_ERROR]', err);
          return jsonResponse(
            {
              success: false,
              error: {
                code: err.code || 'INTERNAL_ERROR',
                message: err.message || 'An unexpected internal error occurred',
              },
            },
            err.statusCode || 500
          );
        }
      }
    }

    return jsonResponse(
      {
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Endpoint ${method} ${url.pathname} not found`,
        },
      },
      404
    );
  }
}

export function jsonResponse(body: any, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      ...headers,
    },
  });
}
