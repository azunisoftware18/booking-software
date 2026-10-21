-- Remove retired social-media settings and add favicon storage.
ALTER TABLE `settings`
    DROP COLUMN `socialLinks`,
    ADD COLUMN `favicon` VARCHAR(191) NULL,
    ADD COLUMN `faviconKey` VARCHAR(191) NULL;
