/*
  Warnings:

  - You are about to drop the `receipt_deliveries` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "receipt_deliveries";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_service_orders" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "technicianId" TEXT,
    "equipmentType" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "serialNumber" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "reportedDefect" TEXT NOT NULL,
    "receivedAccessories" TEXT,
    "budgetNote" TEXT,
    "arrivalDate" DATETIME,
    "openingDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completionDate" DATETIME,
    "deliveryDate" DATETIME,
    "paymentDate" DATETIME,
    "receiptGenerated" BOOLEAN NOT NULL DEFAULT false,
    "receiptGeneratedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "service_orders_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "service_orders_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "technicians" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "service_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_service_orders" ("arrivalDate", "brand", "budgetNote", "clientId", "completionDate", "createdAt", "createdById", "deliveryDate", "equipmentType", "id", "model", "openingDate", "orderNumber", "paymentDate", "receivedAccessories", "reportedDefect", "serialNumber", "status", "technicianId", "updatedAt") SELECT "arrivalDate", "brand", "budgetNote", "clientId", "completionDate", "createdAt", "createdById", "deliveryDate", "equipmentType", "id", "model", "openingDate", "orderNumber", "paymentDate", "receivedAccessories", "reportedDefect", "serialNumber", "status", "technicianId", "updatedAt" FROM "service_orders";
DROP TABLE "service_orders";
ALTER TABLE "new_service_orders" RENAME TO "service_orders";
CREATE UNIQUE INDEX "service_orders_orderNumber_key" ON "service_orders"("orderNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
