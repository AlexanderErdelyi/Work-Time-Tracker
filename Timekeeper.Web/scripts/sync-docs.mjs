import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const docsSourceDir = path.resolve(__dirname, '../../docs')
const docsTargetDir = path.resolve(__dirname, '../public/docs')

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true })
}

async function syncDocs() {
  await ensureDir(docsTargetDir)

  const sourceEntries = await fs.readdir(docsSourceDir, { withFileTypes: true })
  const filesToCopy = sourceEntries
    .filter(entry => entry.isFile())
    .map(entry => entry.name)
    .filter(fileName => fileName.endsWith('.md') || fileName === 'manifest.json')

  for (const fileName of filesToCopy) {
    const sourcePath = path.join(docsSourceDir, fileName)
    const targetPath = path.join(docsTargetDir, fileName)
    await fs.copyFile(sourcePath, targetPath)
  }

  console.log(`[sync-docs] Synced ${filesToCopy.length} file(s) from docs/ to public/docs/`)
}

syncDocs().catch(error => {
  console.error('[sync-docs] Failed to sync docs:', error)
  process.exitCode = 1
})
