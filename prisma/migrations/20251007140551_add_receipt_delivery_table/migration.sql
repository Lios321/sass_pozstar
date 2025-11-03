-- CreateTable
CREATE TABLE "receipt_deliveries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceOrderId" TEXT NOT NULL,
    "deliveryMethod" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "errorMessage" TEXT,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "receipt_deliveries_serviceOrderId_fkey" FOREIGN KEY ("serviceOrderId") REFERENCES "service_orders" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
