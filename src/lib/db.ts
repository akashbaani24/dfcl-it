import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const tursoToken = process.env.TURSO_AUTH_TOKEN

  if (tursoUrl && tursoUrl.startsWith('libsql:') && tursoToken) {
    // IMPORTANT: PrismaLibSql creates its OWN internal libsql client from the
    // config we pass it. Previously we created a separate `createClient(...)`
    // with tuned concurrency/keepalive settings but then THREW IT AWAY by
    // passing only `{ url, authToken }` to the adapter — so none of the tuning
    // actually took effect. Passing the full config here ensures the adapter's
    // internal client benefits from the optimized settings.
    const adapter = new PrismaLibSql({
      url: tursoUrl,
      authToken: tursoToken,
      concurrency: 20,           // more parallel queries (default is 10)
      maxRetries: 3,             // retry on transient failures
      retryDelay: 100,           // 100ms initial retry delay
      syncInterval: 0,           // disable auto-sync (we don't use embedded replicas)
      fetchOptions: {
        keepalive: true,         // HTTP/2 keep-alive for fewer connection overhead
      },
    })
    return new PrismaClient({ adapter, log: ['error'] })
  }

  // Fallback: local SQLite
  return new PrismaClient({
    log: ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
