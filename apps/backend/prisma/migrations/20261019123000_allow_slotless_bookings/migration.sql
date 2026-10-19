ALTER TABLE `bookings`
  MODIFY `slot_date_time` DATETIME(3) NULL;

ALTER TABLE `tickets`
  MODIFY `slot_date_time` DATETIME(3) NULL;
