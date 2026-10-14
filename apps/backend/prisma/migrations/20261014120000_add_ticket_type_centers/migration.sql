ALTER TABLE `ticket_types`
  ADD COLUMN `center` VARCHAR(191) NOT NULL DEFAULT 'Jaipur',
  ADD COLUMN `is_available` BOOLEAN NOT NULL DEFAULT true;

DROP INDEX `ticket_types_name_key` ON `ticket_types`;
DROP INDEX `ticket_types_name_place_id_key` ON `ticket_types`;

CREATE UNIQUE INDEX `ticket_types_center_name_place_id_key`
  ON `ticket_types`(`center`, `name`, `place_id`);