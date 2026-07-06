// Test Turso connection with different auth approaches
import { createClient } from '@libsql/client'

async function main() {
  const TURSO_URL = 'libsql://dfcl-it-akash9090.aws-ap-south-1.turso.io'
  const TURSO_TOKEN = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJWaFVWakhrekVmR19keTV6Vkt1d193Iiwib3JnX2lkIjoxMDAwMTg0MDY3fQ.h8-1QyAULP2YU9Q16D89lCg63H_FGJ2Nbn8LRWhdwyPqkiLV1C9loS8GZAfY1nF3RmfMSdPLiVTRDQH-em8FDQ'

  console.log('=== Test: Standard libsql client ===')
  const client = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })
  try {
    const r = await client.execute('SELECT 1 as test')
    console.log('SUCCESS:', r.rows[0])
  } catch (e: any) {
    console.log('FAILED:', e.message)
  }

  console.log('\n=== URL/Token info ===')
  console.log('URL:', TURSO_URL)
  console.log('Token length:', TURSO_TOKEN.length)
}

main()

