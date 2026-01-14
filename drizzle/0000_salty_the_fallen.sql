CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`address` text,
	`city` text,
	`state` text,
	`zip_code` text,
	`complement` text,
	`country` text DEFAULT 'Brasil',
	`latitude` real,
	`longitude` real,
	`document` text,
	`document_type` text,
	`client_type` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `clients_email_unique` ON `clients` (`email`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`type` text DEFAULT 'INFO' NOT NULL,
	`is_read` integer DEFAULT false NOT NULL,
	`user_id` text,
	`client_id` text,
	`service_order_id` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`service_order_id`) REFERENCES `service_orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `opening_queue_items` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text,
	`client_name` text NOT NULL,
	`contact_phone` text NOT NULL,
	`equipment_type` text NOT NULL,
	`equipment_desc` text,
	`arrival_date` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`position_index` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `receipt_deliveries` (
	`id` text PRIMARY KEY NOT NULL,
	`service_order_id` text NOT NULL,
	`delivery_method` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`recipient_email` text,
	`recipient_phone` text,
	`error_message` text,
	`sent_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`service_order_id`) REFERENCES `service_orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `service_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`order_number` text NOT NULL,
	`client_id` text NOT NULL,
	`technician_id` text,
	`equipment_type` text NOT NULL,
	`brand` text NOT NULL,
	`model` text NOT NULL,
	`serial_number` text,
	`status` text DEFAULT 'SEM_VER' NOT NULL,
	`reported_defect` text NOT NULL,
	`received_accessories` text,
	`budget_note` text,
	`technical_explanation` text,
	`price` real,
	`cost` real,
	`budget_items` text,
	`arrival_date` integer,
	`opening_date` integer DEFAULT (strftime('%s', 'now')),
	`completion_date` integer,
	`delivery_date` integer,
	`payment_date` integer,
	`receipt_generated` integer DEFAULT false NOT NULL,
	`receipt_generated_at` integer,
	`receipt_path` text,
	`created_by_id` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now')),
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`technician_id`) REFERENCES `technicians`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `service_orders_order_number_unique` ON `service_orders` (`order_number`);--> statement-breakpoint
CREATE TABLE `technicians` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`specializations` text,
	`is_available` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `technicians_email_unique` ON `technicians` (`email`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password` text NOT NULL,
	`role` text DEFAULT 'ADMIN' NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')),
	`updated_at` integer DEFAULT (strftime('%s', 'now'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);