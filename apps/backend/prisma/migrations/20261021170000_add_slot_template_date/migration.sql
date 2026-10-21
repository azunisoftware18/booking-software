ALTER TABLE `slot_templates`
ADD COLUMN `date` DATETIME NULL;

DROP INDEX `slot_templates_place_id_start_time_end_time_key`
ON `slot_templates`;

CREATE UNIQUE INDEX `slot_templates_place_id_date_start_time_end_time_key`
ON `slot_templates` (`place_id`, `date`, `start_time`, `end_time`);
