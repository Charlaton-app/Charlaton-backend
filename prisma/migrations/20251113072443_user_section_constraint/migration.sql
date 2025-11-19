/*
  Warnings:

  - A unique constraint covering the columns `[userId,deviceId]` on the table `UserSection` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "UserSection_userId_deviceId_key" ON "UserSection"("userId", "deviceId");
