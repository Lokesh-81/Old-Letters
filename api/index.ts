/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Request, Response } from 'express';
import app from '../server';

export default function handler(req: Request, res: Response) {
  try {
    const forwardedUri = (req.headers['x-forwarded-uri'] || req.headers['x-matched-path'] || req.headers['x-invoke-path']) as string | undefined;

    if (forwardedUri && forwardedUri.startsWith('/api') && !req.url.startsWith('/api')) {
      req.url = forwardedUri;
    } else if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/?')) {
      req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
    }

    return app(req, res);
  } catch (err: any) {
    console.error('[OLD-LETTERS Vercel API Handler Error]', err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: (err && typeof err.message === 'string') ? err.message : 'Something went wrong. Please try again.',
      });
    }
  }
}

export { app };
