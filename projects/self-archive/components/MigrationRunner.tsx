'use client'

import { useEffect } from 'react'
import { runMigrations } from '@/lib/migrate'

export default function MigrationRunner() {
  useEffect(() => { runMigrations() }, [])
  return null
}
