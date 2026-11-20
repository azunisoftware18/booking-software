ALTER TABLE `bookings`
  ADD COLUMN `activity_qr_code` VARCHAR(191) NULL,
  ADD COLUMN `activity_scanned_at` DATETIME(3) NULL;

CREATE UNIQUE INDEX `bookings_activity_qr_code_key`
  ON `bookings`(`activity_qr_code`);
