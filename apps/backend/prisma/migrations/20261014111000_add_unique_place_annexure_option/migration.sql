ALTER TABLE `places`
ADD COLUMN `annexure` VARCHAR(191) NULL,
ADD COLUMN `annexure_option` VARCHAR(191) NULL,
ADD UNIQUE INDEX `places_annexure_annexure_option_key`(`annexure`, `annexure_option`);
