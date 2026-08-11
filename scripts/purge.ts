/**
 * CivicTrack - purge script.
 *
 * Empties the demo content tables (issues, comments, follows, notifications)
 * so the app starts with REAL data only. Keeps profiles + organizations
 * (real user accounts).
 *
 * Run with:  npm run purge
 *
 * Requires VITE_SUPABASE_URL + VITE_SUPABASE_SERVICE_ROLE_KEY in .env
 * (Dashboard → Settings → API → service_role, Secret). The service key is
 * required because RLS locks down row deletes — the anon key can no longer
 * delete content. It is read directly from .env by this Node script and is
 * never bundled into the client.
 */
import { readFileSync } from 'node:fs'

const env = readFileSync('.env', 'utf8')
const url = (env.match(/VITE_SUPABASE_URL=(.*)/) || [])[1]?.trim()
const key = (env.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=(.*)/) || [])[1]?.trim()

if (!url) {
  console.error('❌ VITE_SUPABASE_URL not found in .env')
  process.exit(1)
}
if (!key) {
  console.error(
    '❌ VITE_SUPABASE_SERVICE_ROLE_KEY not found in .env\n' +
      '   Add it (Dashboard → Settings → API → service_role). It is required now that RLS locks down deletes.',
  )
  process.exit(1)
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  Prefer: 'return=minimal',
}

const TABLES = ['issues', 'comments', 'follows', 'notifications']

async function main() {
  console.log(`Purging demo content from ${url}`)
  for (const table of TABLES) {
    const res = await fetch(`${url}/rest/v1/${table}?id=not.is.null`, {
      method: 'DELETE',
      headers,
    })
    if (res.status >= 400) {
      console.log(`  · ${table}: skipped (${res.status})`)
    } else {
      console.log(`  ✅ ${table} cleared`)
    }
  }
  console.log('Done. The app now starts from a clean, empty database.')
}

main().catch((e) => {
  console.error('ERR', e)
  process.exit(1)
})
