import { useState, useEffect } from 'react'

export interface ChangelogEntry {
  added: string[]
  changed: string[]
  fixed: string[]
  removed: string[]
}

export interface Release {
  version: string
  date: string
  title: string
  changes: ChangelogEntry
}

interface VersionManifest {
  currentVersion: string
  releasedAt: string
  releases: Release[]
}

const LAST_SEEN_KEY = 'timekeeper_lastSeenVersion'

/** Semver comparison: returns >0 if a > b, <0 if a < b, 0 if equal.
 *  Pre-release versions (e.g. 3.0.0-rc1) are treated as older than their
 *  base release (3.0.0-rc1 < 3.0.0), matching the semver spec. */
function compareSemver(a: string, b: string): number {
  const [aBase, aPre] = a.split('-')
  const [bBase, bPre] = b.split('-')
  const parseBase = (v: string) => v.split('.').map(n => parseInt(n, 10) || 0)
  const [aMaj, aMin = 0, aPatch = 0] = parseBase(aBase)
  const [bMaj, bMin = 0, bPatch = 0] = parseBase(bBase)
  if (aMaj !== bMaj) return aMaj - bMaj
  if (aMin !== bMin) return aMin - bMin
  if (aPatch !== bPatch) return aPatch - bPatch
  // Same base: pre-release is always less than the release
  if (aPre && !bPre) return -1
  if (!aPre && bPre) return 1
  if (aPre && bPre) return aPre.localeCompare(bPre)
  return 0
}

export function useChangelog() {
  const [releases, setReleases] = useState<Release[]>([])
  const [currentVersion, setCurrentVersion] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [lastSeenVersion, setLastSeenVersionState] = useState<string>(
    () => localStorage.getItem(LAST_SEEN_KEY) ?? ''
  )

  useEffect(() => {
    fetch('/version.json')
      .then(r => r.json())
      .then((manifest: VersionManifest) => {
        setReleases(manifest.releases)
        setCurrentVersion(manifest.currentVersion)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  /** Number of releases newer than what the user last acknowledged */
  const newReleaseCount = releases.filter(r =>
    compareSemver(r.version, lastSeenVersion) > 0
  ).length

  function markAsSeen() {
    if (!currentVersion) return
    localStorage.setItem(LAST_SEEN_KEY, currentVersion)
    setLastSeenVersionState(currentVersion)
  }

  return { releases, currentVersion, newReleaseCount, markAsSeen, loading }
}
