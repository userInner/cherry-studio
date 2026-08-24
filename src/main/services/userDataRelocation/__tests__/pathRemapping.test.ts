import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import Database from 'better-sqlite3'
import { afterEach, describe, expect, it } from 'vitest'

import { remapCopiedAgentWorkspacePaths } from '../pathRemapping'

const roots: string[] = []

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cherry-relocation-paths-'))
  roots.push(root)
  const from = path.join(root, 'old-profile')
  const to = path.join(root, 'new-profile')
  fs.mkdirSync(path.join(to, 'Data'), { recursive: true })
  const databaseFile = path.join(to, 'Data', 'cherrystudio.sqlite')
  const database = new Database(databaseFile)
  database.exec(`
    CREATE TABLE agent_workspace (
      id TEXT PRIMARY KEY,
      path TEXT NOT NULL,
      type TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)
  return { database, databaseFile, from, to }
}

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true })
})

describe('remapCopiedAgentWorkspacePaths', () => {
  it('re-anchors only system workspaces stored below the previous profile', () => {
    const { database, databaseFile, from, to } = fixture()
    const oldManagedPath = path.join(from, 'Data', 'Agents', 'system', 'session-1')
    const externalPath = path.join(path.dirname(from), 'project')
    const insert = database.prepare('INSERT INTO agent_workspace (id, path, type, updated_at) VALUES (?, ?, ?, 1)')
    insert.run('managed', oldManagedPath, 'system')
    insert.run('external-system', externalPath, 'system')
    insert.run('user', oldManagedPath, 'user')
    database.close()

    expect(remapCopiedAgentWorkspacePaths(databaseFile, from, to)).toBe(1)

    const result = new Database(databaseFile, { readonly: true })
    const rows = result.prepare('SELECT id, path FROM agent_workspace ORDER BY id').all()
    result.close()
    expect(rows).toEqual([
      { id: 'external-system', path: externalPath },
      { id: 'managed', path: path.join(to, 'Data', 'Agents', 'system', 'session-1') },
      { id: 'user', path: oldManagedPath }
    ])
  })

  it('is a no-op when the copied profile predates the workspace table', () => {
    const { database, databaseFile, from, to } = fixture()
    database.exec('DROP TABLE agent_workspace')
    database.close()

    expect(remapCopiedAgentWorkspacePaths(databaseFile, from, to)).toBe(0)
  })
})
