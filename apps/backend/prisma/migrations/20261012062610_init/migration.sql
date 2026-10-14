/*
  Warnings:

  - You are about to drop the column `created_at` on the `places` table. All the data in the column will be lost.
  - You are about to drop the column `maxPerBooking` on the `ticket_types` table. All the data in the column will be lost.
  - You are about to drop the column `bookingType` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `entry_at` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `entry_gate_id` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `exit_at` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `exit_gate_id` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `expires_at` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `maxEntries` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `slot_id` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `usedEntries` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `validFrom` on the `tickets` table. All the data in the column will be lost.
  - You are about to drop the column `validTill` on the `tickets` table. All the data in the column will be lost.
  - You are about to alter the column `status` on the `tickets` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(3))` to `VarChar(191)`.
  - You are about to drop the column `role` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `slots` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[name,location]` on the table `places` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `ticket_types` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,place_id]` on the table `ticket_types` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `places` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `ticket_types` table without a default value. This is not possible if the table is not empty.
  - Added the required column `booking_id` to the `tickets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slot_date_time` to the `tickets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role_id` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `slots` DROP FOREIGN KEY `slots_placeId_fkey`;

-- DropForeignKey
ALTER TABLE `tickets` DROP FOREIGN KEY `tickets_slot_id_fkey`;

-- DropForeignKey
ALTER TABLE `tickets` DROP FOREIGN KEY `tickets_user_id_fkey`;

-- DropIndex
DROP INDEX `tickets_qr_code_idx` ON `tickets`;

-- DropIndex
DROP INDEX `tickets_slot_id_idx` ON `tickets`;

-- DropIndex
DROP INDEX `tickets_user_id_idx` ON `tickets`;

-- AlterTable
ALTER TABLE `places` DROP COLUMN `created_at`,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `description` LONGTEXT NULL,
    ADD COLUMN `imageKey` VARCHAR(191) NULL,
    ADD COLUMN `imageUrl` VARCHAR(191) NULL,
    ADD COLUMN `shortDescription` VARCHAR(191) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `scan_logs` MODIFY `gate_id` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `ticket_types` DROP COLUMN `maxPerBooking`,
    ADD COLUMN `max_per_booking` INTEGER NOT NULL DEFAULT 6,
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL;

-- AlterTable
ALTER TABLE `tickets` DROP COLUMN `bookingType`,
    DROP COLUMN `entry_at`,
    DROP COLUMN `entry_gate_id`,
    DROP COLUMN `exit_at`,
    DROP COLUMN `exit_gate_id`,
    DROP COLUMN `expires_at`,
    DROP COLUMN `maxEntries`,
    DROP COLUMN `slot_id`,
    DROP COLUMN `usedEntries`,
    DROP COLUMN `validFrom`,
    DROP COLUMN `validTill`,
    ADD COLUMN `booking_id` VARCHAR(191) NOT NULL,
    ADD COLUMN `slot_date_time` DATETIME(3) NOT NULL,
    MODIFY `user_id` VARCHAR(191) NULL,
    MODIFY `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE `users` DROP COLUMN `role`,
    ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `level` INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN `parent_id` VARCHAR(191) NULL,
    ADD COLUMN `password` VARCHAR(191) NULL,
    ADD COLUMN `place_id` VARCHAR(191) NULL,
    ADD COLUMN `refresh_token` VARCHAR(191) NULL,
    ADD COLUMN `role_id` VARCHAR(191) NOT NULL;

-- DropTable
DROP TABLE `slots`;

-- CreateTable
CREATE TABLE `slot_templates` (
    `id` VARCHAR(191) NOT NULL,
    `place_id` VARCHAR(191) NOT NULL,
    `start_time` VARCHAR(191) NOT NULL,
    `end_time` VARCHAR(191) NOT NULL,
    `capacity` INTEGER NOT NULL,

    UNIQUE INDEX `slot_templates_place_id_start_time_key`(`place_id`, `start_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `slot_overrides` (
    `id` VARCHAR(191) NOT NULL,
    `place_id` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `start_time` VARCHAR(191) NOT NULL,
    `capacity` INTEGER NULL,
    `is_closed` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `slot_overrides_place_id_date_start_time_key`(`place_id`, `date`, `start_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `addons` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `price` DOUBLE NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `place_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `addons_name_place_id_key`(`name`, `place_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bookings` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `place_id` VARCHAR(191) NOT NULL,
    `slot_date_time` DATETIME(3) NOT NULL,
    `booking_type` ENUM('TICKET', 'PASS') NOT NULL DEFAULT 'TICKET',
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `total_amount` DOUBLE NOT NULL,
    `total_seats` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `expires_at` DATETIME(3) NULL,
    `txn_id` VARCHAR(191) NULL,
    `payment_id` VARCHAR(191) NULL,
    `ticket_payload` JSON NULL,
    `payment_method` ENUM('CASH', 'UPI', 'ONLINE') NOT NULL,
    `addon_ids` JSON NULL,
    `ticket_pdf_url` VARCHAR(191) NULL,
    `ticket_pdf_key` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `bookings_txn_id_key`(`txn_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `settings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'global-setting',
    `companyName` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` LONGTEXT NULL,
    `logo` VARCHAR(191) NULL,
    `logoKey` VARCHAR(191) NULL,
    `socialLinks` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` VARCHAR(191) NOT NULL,
    `role_name` VARCHAR(191) NOT NULL,
    `role_code` VARCHAR(191) NOT NULL,
    `description` LONGTEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `roles_role_name_key`(`role_name`),
    UNIQUE INDEX `roles_role_code_key`(`role_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` VARCHAR(191) NOT NULL,
    `resource` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `service_code` VARCHAR(191) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `permissions_resource_idx`(`resource`),
    INDEX `permissions_action_idx`(`action`),
    INDEX `permissions_service_code_idx`(`service_code`),
    UNIQUE INDEX `permissions_resource_action_key`(`resource`, `action`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assigned_permissions` (
    `id` VARCHAR(191) NOT NULL,
    `permission_id` VARCHAR(191) NOT NULL,
    `role_id` VARCHAR(191) NULL,
    `user_id` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `assigned_permissions_permission_id_idx`(`permission_id`),
    INDEX `assigned_permissions_role_id_idx`(`role_id`),
    INDEX `assigned_permissions_user_id_idx`(`user_id`),
    UNIQUE INDEX `assigned_permissions_permission_id_role_id_key`(`permission_id`, `role_id`),
    UNIQUE INDEX `assigned_permissions_permission_id_user_id_key`(`permission_id`, `user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `places_name_location_key` ON `places`(`name`, `location`);

-- CreateIndex
CREATE UNIQUE INDEX `ticket_types_name_key` ON `ticket_types`(`name`);

-- CreateIndex
CREATE UNIQUE INDEX `ticket_types_name_place_id_key` ON `ticket_types`(`name`, `place_id`);

-- CreateIndex
CREATE INDEX `users_role_id_idx` ON `users`(`role_id`);

-- CreateIndex
CREATE INDEX `users_place_id_idx` ON `users`(`place_id`);

-- CreateIndex
CREATE INDEX `users_parent_id_idx` ON `users`(`parent_id`);

-- CreateIndex
CREATE INDEX `users_level_idx` ON `users`(`level`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_place_id_fkey` FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `slot_templates` ADD CONSTRAINT `slot_templates_place_id_fkey` FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `slot_overrides` ADD CONSTRAINT `slot_overrides_place_id_fkey` FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `addons` ADD CONSTRAINT `addons_place_id_fkey` FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_place_id_fkey` FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assigned_permissions` ADD CONSTRAINT `assigned_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assigned_permissions` ADD CONSTRAINT `assigned_permissions_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assigned_permissions` ADD CONSTRAINT `assigned_permissions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
