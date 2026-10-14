ALTER TABLE `ticket_types`
ADD COLUMN `ticket_category` VARCHAR(191) NOT NULL DEFAULT 'ENTRY_FEE',
ADD COLUMN `booking_details` VARCHAR(191) NULL,
ADD COLUMN `venue_name` VARCHAR(191) NULL,
ADD COLUMN `venue_size` VARCHAR(191) NULL,
ADD COLUMN `venue_capacity` INTEGER NULL,
ADD COLUMN `booking_hours` DOUBLE NULL,
ADD COLUMN `rate_per_hour` DOUBLE NULL,
ADD COLUMN `electricity_rate_per_unit` DOUBLE NOT NULL DEFAULT 15,
ADD COLUMN `entry_fee_image_url` VARCHAR(191) NULL,
ADD COLUMN `entry_fee_image_key` VARCHAR(191) NULL,
ADD COLUMN `venue_image_url` VARCHAR(191) NULL,
ADD COLUMN `venue_image_key` VARCHAR(191) NULL;

UPDATE `ticket_types`
SET `booking_mode` = 'BULK'
WHERE `booking_mode` = 'BUNDLE';