/*
  Warnings:

  - You are about to drop the column `description` on the `mcp_servers` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_mcp_servers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_mcp_servers" ("createdAt", "endpoint", "id", "name", "updatedAt") SELECT "createdAt", "endpoint", "id", "name", "updatedAt" FROM "mcp_servers";
DROP TABLE "mcp_servers";
ALTER TABLE "new_mcp_servers" RENAME TO "mcp_servers";
CREATE UNIQUE INDEX "mcp_servers_name_key" ON "mcp_servers"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
