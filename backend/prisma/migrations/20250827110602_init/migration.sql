-- CreateTable
CREATE TABLE "workers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "walletId" TEXT,
    "recipientId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "payroll_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "adminId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalAmount" TEXT NOT NULL,
    "totalWorkers" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME
);

-- CreateTable
CREATE TABLE "payroll_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "payrollRunId" TEXT NOT NULL,
    "workerId" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payoutId" TEXT,
    "transactionHash" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    CONSTRAINT "payroll_items_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "payroll_items_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "workerId" TEXT,
    "payrollRunId" TEXT,
    "payrollItemId" TEXT,
    "payload" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "workers" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_payrollRunId_fkey" FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_payrollItemId_fkey" FOREIGN KEY ("payrollItemId") REFERENCES "payroll_items" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "cross_chain_transfers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workerId" TEXT NOT NULL,
    "fromChain" TEXT NOT NULL,
    "destinationChain" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "sourceAddress" TEXT NOT NULL,
    "destinationAddress" TEXT NOT NULL,
    "messageHash" TEXT,
    "attestation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "transactionHash" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME
);

-- CreateTable
CREATE TABLE "gas_station_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workerId" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "userOpHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "gasUsed" TEXT,
    "gasPrice" TEXT,
    "transactionHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME
);

-- CreateTable
CREATE TABLE "paymaster_operations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workerId" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "userOpHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "gasUsed" TEXT,
    "gasFeeInUSDC" TEXT,
    "transactionHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "workers_email_key" ON "workers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "workers_walletId_key" ON "workers"("walletId");

-- CreateIndex
CREATE UNIQUE INDEX "workers_recipientId_key" ON "workers"("recipientId");

-- CreateIndex
CREATE UNIQUE INDEX "gas_station_transactions_userOpHash_key" ON "gas_station_transactions"("userOpHash");

-- CreateIndex
CREATE UNIQUE INDEX "paymaster_operations_userOpHash_key" ON "paymaster_operations"("userOpHash");
