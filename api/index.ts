import type { Request, Response } from 'express';
import app from '../server';

export default function handler(req: Request, res: Response) {
  // If Vercel rewrote the request and stripped the path, restore it from headers:
  const forwardedUri = req.headers['x-forwarded-uri'] as string | undefined;
  const matchedPath = req.headers['x-matched-path'] as string | undefined;

  if (forwardedUri && forwardedUri.startsWith('/api') && !req.url.startsWith('/api')) {
    req.url = forwardedUri;
  } else if (matchedPath && matchedPath.startsWith('/api') && !req.url.startsWith('/api')) {
    req.url = matchedPath;
  }

  return app(req, res);
}
