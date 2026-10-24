// `npm run build:local`: the static export as a local build, with the values in
// .env.development, on any OS. `npm run build` reads no such file, so a deploy
// that forgets NEXT_PUBLIC_APP_ENV fails instead of shipping this build.
import { spawnSync } from 'node:child_process';

process.loadEnvFile('.env.development');
const next = 'node_modules/next/dist/bin/next';
const { status } = spawnSync(process.execPath, [next, 'build'], { stdio: 'inherit' });
process.exit(status ?? 1);
