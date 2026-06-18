// middleware/renderEJS.ts

import { Request, Response, NextFunction } from 'express';
import ejs from 'ejs';
import { logger } from '@/logging/logger';

function renderEJS(req: Request, res: Response, next: NextFunction) {
  let routePath = req.path;
  if (routePath.includes('ui')) {
    routePath = routePath.replace('ui', 'views');
    routePath = routePath + '.ejs';
    logger.debug('Rendering EJS view', { routePath });
    ejs.renderFile(routePath, (err, html) => {
      if (err) {
        return next(err);
      }
      res.send(html);
    });
  } else {
    next();
  }
}

export default renderEJS;
