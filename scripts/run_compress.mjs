import { spawnSync } from 'node:child_process';

const pythonCommands = process.platform === 'win32'
  ? ['python', 'python3', 'py']
  : ['python3', 'python'];

const args = ['scripts/compress_images.py', 'server/uploads/gallery', '--in-place'];

for (const command of pythonCommands) {
  const version = spawnSync(command, ['--version'], { encoding: 'utf8' });
  if (version.error) continue;

  const result = spawnSync(command, args, { stdio: 'inherit' });
  if (result.error) continue;
  process.exit(result.status ?? 1);
}

console.error('Unable to find Python. Install python3 or python, then run npm run compress again.');
process.exit(1);
