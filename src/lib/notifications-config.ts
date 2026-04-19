import notifications from "../../config/notifications.json";

export type NotificationsConfig = {
  adminRecipients: string[];
};

const config = notifications as NotificationsConfig;

export function getNotificationsConfig(): NotificationsConfig {
  return config;
}

export function assertNotificationsConfig(): void {
  if (!Array.isArray(config.adminRecipients) || config.adminRecipients.length === 0) {
    throw new Error(
      "config/notifications.json: adminRecipients must be a non-empty array",
    );
  }
}
