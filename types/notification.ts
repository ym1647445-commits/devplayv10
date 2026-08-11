export interface CustomerNotification {
  id: string;

  type: string;

  title: string;
  message: string;

  entityType: string | null;
  entityId: string | null;

  actionUrl: string | null;

  isRead: boolean;

  createdAt: string;
  readAt: string | null;
}