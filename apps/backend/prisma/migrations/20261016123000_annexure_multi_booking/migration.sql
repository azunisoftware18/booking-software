ALTER TABLE `places`
  DROP INDEX `places_annexure_annexure_option_key`,
  ADD COLUMN `location_id` VARCHAR(191) NULL,
  ADD COLUMN `rate_4_hours` DOUBLE NULL,
  ADD COLUMN `rate_8_hours` DOUBLE NULL,
  ADD COLUMN `rate_per_person` DOUBLE NULL,
  ADD COLUMN `rate_per_student` DOUBLE NULL,
  ADD INDEX `places_location_id_idx` (`location_id`),
  ADD UNIQUE INDEX `places_location_id_annexure_annexure_option_key` (`location_id`, `annexure`, `annexure_option`);

UPDATE `places`
SET
  `rate_4_hours` = CASE `annexure_option`
    WHEN 'A1' THEN 5000 WHEN 'A2' THEN 1000 WHEN 'A3' THEN 2000
    WHEN 'A4' THEN 1500 WHEN 'A5' THEN 2000 WHEN 'A6' THEN 2000
    WHEN 'A7' THEN 5000 WHEN 'B1' THEN 1500 WHEN 'B2' THEN 500
    WHEN 'B3' THEN 200 WHEN 'B4' THEN 200 WHEN 'B5' THEN 100
    WHEN 'B6' THEN 1000 WHEN 'B7' THEN 1500 ELSE NULL END,
  `rate_8_hours` = CASE `annexure_option`
    WHEN 'A1' THEN 7000 WHEN 'A2' THEN 2000 WHEN 'A3' THEN 3000
    WHEN 'A4' THEN 2000 WHEN 'A5' THEN 3500 WHEN 'A6' THEN 4000
    WHEN 'A7' THEN 10000 WHEN 'B1' THEN 3000 WHEN 'B2' THEN 1000
    WHEN 'B3' THEN 400 WHEN 'B4' THEN 400 WHEN 'B5' THEN 200
    WHEN 'B6' THEN 2000 WHEN 'B7' THEN 3000 ELSE NULL END,
  `rate_per_person` = CASE `annexure_option`
    WHEN 'C1' THEN 20 WHEN 'D1' THEN 20 WHEN 'D2' THEN 10
    WHEN 'D3' THEN 20 WHEN 'D4' THEN 10 ELSE NULL END,
  `rate_per_student` = CASE `annexure_option`
    WHEN 'C1' THEN 10 WHEN 'D1' THEN 10 WHEN 'D2' THEN 5
    WHEN 'D3' THEN 10 WHEN 'D4' THEN 7 ELSE NULL END;

UPDATE `places` AS p
JOIN `locations` AS l
  ON p.`location` = l.`name`
  OR p.`location` = l.`city`
SET p.`location_id` = l.`id`
WHERE p.`location_id` IS NULL;

ALTER TABLE `places`
  ADD CONSTRAINT `places_location_id_fkey`
  FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `bookings`
  ADD COLUMN `location_id` VARCHAR(191) NULL,
  ADD INDEX `bookings_location_id_idx` (`location_id`),
  MODIFY `booking_type` ENUM('TICKET', 'PASS', 'ANNEXURE') NOT NULL DEFAULT 'TICKET';

ALTER TABLE `bookings`
  ADD CONSTRAINT `bookings_location_id_fkey`
  FOREIGN KEY (`location_id`) REFERENCES `locations` (`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `booking_annexure_items` (
  `id` VARCHAR(191) NOT NULL,
  `booking_id` VARCHAR(191) NOT NULL,
  `place_id` VARCHAR(191) NOT NULL,
  `slot_date_time` DATETIME(3) NOT NULL,
  `duration_hours` INTEGER NULL,
  `persons` INTEGER NOT NULL DEFAULT 0,
  `students` INTEGER NOT NULL DEFAULT 0,
  `seat_count` INTEGER NOT NULL,
  `amount` DOUBLE NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `booking_annexure_items_place_id_slot_date_time_idx` (`place_id`, `slot_date_time`),
  INDEX `booking_annexure_items_booking_id_idx` (`booking_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `booking_annexure_items`
  ADD CONSTRAINT `booking_annexure_items_booking_id_fkey`
  FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`)
  ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `booking_annexure_items_place_id_fkey`
  FOREIGN KEY (`place_id`) REFERENCES `places` (`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
