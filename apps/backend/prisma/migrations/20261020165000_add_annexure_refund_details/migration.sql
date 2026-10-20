ALTER TABLE `bookings`
  ADD COLUMN `refund_amount` DOUBLE NULL,
  ADD COLUMN `refund_details` JSON NULL,
  ADD COLUMN `refunded_at` DATETIME(3) NULL,
  ADD COLUMN `refunded_by_id` VARCHAR(191) NULL;
