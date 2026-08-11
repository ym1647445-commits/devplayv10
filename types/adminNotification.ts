export type NotificationAudienceType =
  | "all"
  | "single_user"
  | "status"
  | "level"
  | "minimum_points"
  | "birthday_today";

export interface AdminNotificationCampaign {
  id: string;

  title: string;
  message: string;

  notificationType: string;
  actionUrl: string | null;

  audienceType:
    NotificationAudienceType;

  audienceValue:
    string | null;

  recipientsCount: number;

  sentBy: string | null;

  createdAt: string;
}

export interface AdminNotificationUserOption {
  id: string;

  customerId: string;
  fullName: string | null;

  email: string | null;
  phone: string | null;

  status: string;
  level: string;
  points: number;

  birthDate: string | null;
}

export interface SendAdminNotificationInput {
  title: string;
  message: string;

  notificationType: string;
  actionUrl: string | null;

  audienceType:
    NotificationAudienceType;

  audienceValue:
    string | null;
}

export interface AdminNotificationActionResult {
  success: boolean;
  message: string;

  campaignId?: string;
  recipientsCount?: number;
}