import { Router, RequestHandler } from "express";

/** Express 4 does not forward rejected handler promises. */
export function asyncRouter(): Router {
  const router = Router();
  for (const method of ["get", "post", "put", "patch", "delete"] as const) {
    const register = (router[method] as Function).bind(router);
    (router as any)[method] = (path: string, ...handlers: RequestHandler[]) =>
      register(path, ...handlers.flat().map(handler => (req: any, res: any, next: any) => {
        try { Promise.resolve(handler(req, res, next)).catch(next); }
        catch (error) { next(error); }
      }));
  }
  return router;
}
