-- CreateTable
CREATE TABLE `org_settings` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'singleton',
    `organizationName` VARCHAR(191) NOT NULL DEFAULT 'BFDO',
    `supportEmail` VARCHAR(191) NULL,
    `publicGalleryEnabled` BOOLEAN NOT NULL DEFAULT true,
    `updatedById` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `org_settings` ADD CONSTRAINT `org_settings_updatedById_fkey` FOREIGN KEY (`updatedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
