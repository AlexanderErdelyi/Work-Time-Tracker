import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const webRoot = path.resolve(__dirname, '..')
const repoRoot = path.resolve(webRoot, '..')

function run(command, cwd) {
  return execSync(command, {
    cwd,
    stdio: 'pipe',
    encoding: 'utf8'
  }).trim()
}

try {
  run('node scripts/sync-docs.mjs', webRoot)

  const changedFiles = run('git diff --name-only -- docs Timekeeper.Web/public/docs', repoRoot)

  if (changedFiles) {
    console.error('[check-docs-sync] Documentation is out of sync.')
    console.error('[check-docs-sync] Run `npm run sync-docs` in `Timekeeper.Web/` and commit the updated files.')
    console.error('')
    console.error(changedFiles)
    process.exit(1)
  }

  console.log('[check-docs-sync] Documentation sync check passed.')
} catch (error) {
  console.error('[check-docs-sync] Failed to verify docs sync.')
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
