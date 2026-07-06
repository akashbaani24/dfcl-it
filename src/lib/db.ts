import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const tursoToken = process.env.TURSO_AUTH_TOKEN

  if (tursoUrl && tursoUrl.startsWith('libsql:') && tursoToken) {
    // Optimized libsql client for high concurrency
    const libsql = createClient({
      url: tursoUrl,
      authToken: tursoToken,
      concurrency: 20,           // increased from 10 → 20 for more parallel queries
      maxRetries: 3,             // retry on transient failures
      retryDelay: 100,           // 100ms initial retry delay
      syncInterval: 0,           // disable auto-sync (we don't use embedded replicas)
      // Use HTTP/2 keep-alive for fewer connection overhead
      fetchOptions: {
        keepalive: true,
      },
    })
    const adapter = new PrismaLibSql({ url: tursoUrl, authToken: tursoToken })
    return new PrismaClient({ adapter, log: ['error'] })
  }

  // Fallback: local SQLite
  return new PrismaClient({
    log: ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
