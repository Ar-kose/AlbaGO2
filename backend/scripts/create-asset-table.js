const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

p.$executeRawUnsafe(`
  CREATE TABLE IF NOT EXISTS "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'IMAGE',
    "format" TEXT NOT NULL,
    "category" TEXT,
    "uri" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "durationSec" DOUBLE PRECISION,
    "sha256" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`)
.then(() => {
  console.log('Asset table created successfully');
  return p.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Asset_category_idx" ON "Asset" ("category")`);
})
.then(() => {
  console.log('Asset category index created');
  return p.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Asset_kind_idx" ON "Asset" ("kind")`);
})
.then(() => {
  console.log('Asset kind index created');
  return p.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Asset_archived_idx" ON "Asset" ("archived")`);
})
.then(() => {
  console.log('Asset archived index created');
})
.catch(e => console.error('Error:', e.message))
.finally(() => p.$disconnect());
