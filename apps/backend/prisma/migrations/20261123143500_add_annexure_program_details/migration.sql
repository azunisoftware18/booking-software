ALTER TABLE `booking_annexure_items`
  ADD COLUMN `place_or_school_name` VARCHAR(191) NULL,
  ADD COLUMN `program_address` TEXT NULL,
  ADD COLUMN `audience_size` INTEGER NULL,
  ADD COLUMN `staff_count` INTEGER NULL,
  ADD COLUMN `program_type` VARCHAR(191) NULL,
  ADD COLUMN `vip_person_name` VARCHAR(191) NULL;
