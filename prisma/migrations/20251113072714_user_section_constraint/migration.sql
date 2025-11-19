/*
  Warnings:

  - A unique constraint covering the columns `[refreshToken]` on the table `UserSection` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "UserSection_refreshToken_key" ON "UserSection"("refreshToken");
