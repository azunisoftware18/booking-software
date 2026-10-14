ALTER TABLE `locations`
  ADD COLUMN `created_by_id` VARCHAR(191) NULL,
  ADD INDEX `locations_created_by_id_idx`(`created_by_id`);

ALTER TABLE `roles`
  ADD COLUMN `created_by_id` VARCHAR(191) NULL,
  ADD INDEX `roles_created_by_id_idx`(`created_by_id`);

ALTER TABLE `locations`
  ADD CONSTRAINT `locations_created_by_id_fkey`
  FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `roles`
  ADD CONSTRAINT `roles_created_by_id_fkey`
  FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;