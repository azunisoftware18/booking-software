DROP INDEX `slot_templates_place_id_start_time_key` ON `slot_templates`;

CREATE UNIQUE INDEX `slot_templates_place_id_start_time_end_time_key`
ON `slot_templates` (`place_id`, `start_time`, `end_time`);
