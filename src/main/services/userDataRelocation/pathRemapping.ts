import fs from 'node:fs'
import path from 'node:path'

import Database from 'better-sqlite3'

function relocatedDescendant(sourcePath: string, sourceRoot: string, targetRoot: string): string | null {
  if (!path.isAbsolute(sourcePath)) return null
  const relative = path.relative(sourceRoot, sourcePath)
  if (relative === '') return targetRoot
  if (relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) return null
  return path.join(targetRoot, relative)
}

/**
 * Re-anchor managed workspace rows in the copied profile before relocation is
 * committed. User workspaces may intentionally live outside userData and must
 * remain byte-for-byte unchanged.
 */
export function remapCopiedAgentWorkspacePaths(databaseFile: string, sourceRoot: string, targetRoot: string): number {
  if (!fs.existsSync(databaseFile)) return 0

  const database = new Database(databaseFile, { fileMustExist: true })
  try {
    const table = database
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'agent_workspace'")
      .get()
    if (!table) return 0

    const rows = database.prepare("SELECT id, path FROM agent_workspace WHERE type = 'system'").all() as Array<{
      id: string
      path: string
    }>
    const updates = rows.flatMap((row) => {
      const remapped = relocatedDescendant(row.path, sourceRoot, targetRoot)
      return remapped && remapped !== row.path ? [{ id: row.id, path: remapped }] : []
    })
    if (updates.length === 0) return 0

    const update = database.prepare('UPDATE agent_workspace SET path = ?, updated_at = ? WHERE id = ?')
    database.transaction(() => {
      const now = Date.now()
      for (const row of updates) update.run(row.path, now, row.id)
    })()
    return updates.length
  } finally {
    database.close()
  }
}
