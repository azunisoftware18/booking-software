ALTER TABLE `ticket_types`
ADD COLUMN `booking_mode` VARCHAR(191) NOT NULL DEFAULT 'SINGLE',
ADD COLUMN `single_image_url` VARCHAR(191) NULL,
ADD COLUMN `single_image_key` VARCHAR(191) NULL,
ADD COLUMN `bundle_image_url` VARCHAR(191) NULL,
ADD COLUMN `bundle_image_key` VARCHAR(191) NULL;