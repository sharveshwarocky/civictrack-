import { describe, expect, it } from 'vitest'
import { friendlyDbError } from '../format'

describe('friendlyDbError', () => {
  it('rewrites the PostgREST schema-cache error for known tables', () => {
    expect(friendlyDbError("Could not find the table 'public.profiles' in the schema cache")).toContain('profiles')
    expect(friendlyDbError("Could not find the table 'public.profiles' in the schema cache")).toContain('supabase/live.sql')
    expect(friendlyDbError("Could not find the table 'public.issues' in the schema cache")).toContain('supabase/live.sql')
  })

  it('rewrites RLS errors', () => {
    expect(friendlyDbError('new row violates row-level security policy')).toContain('sign in')
  })

  it('rewrites PGRST errors', () => {
    expect(friendlyDbError('PGRST204 column not found')).toContain('supabase/live.sql')
  })

  it('passes through unrelated messages unchanged', () => {
    expect(friendlyDbError('Token has expired')).toBe('Token has expired')
  })
})
