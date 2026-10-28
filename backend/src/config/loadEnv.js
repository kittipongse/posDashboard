import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { getBackendRoot } from './paths.js';

/** Load backend env from `.env.local` only. */
export const loadBackendEnv = () => {
  const backendRoot = getBackendRoot();
  const localFile = path.join(backendRoot, '.env.local');

  if (fs.existsSync(localFile)) {
    dotenv.config({ path: localFile });
    return { path: localFile, source: 'local' };
  }

  dotenv.config({ path: localFile });
  return { path: localFile, source: 'missing' };
};
