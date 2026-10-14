ALTER TABLE `places`
ADD COLUMN `created_by_id` VARCHAR(191) NULL,
ADD INDEX `places_created_by_id_idx`(`created_by_id`);

ALTER TABLE `places`
ADD CONSTRAINT `places_created_by_id_fkey`
FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`)
ON DELETE SET NULL ON UPDATE CASCADE;
