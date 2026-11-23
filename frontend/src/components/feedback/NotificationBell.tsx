import { Bell } from 'lucide-react'
import { Popover } from 'radix-ui'

import {
  useListNotificationsQuery,
  useMarkNotificationAsReadMutation,
} from '../../features/notifications/services/notificationApi'

export default function NotificationBell({ userId }: { userId: string }) {
  const { currentData, isFetching, isError, refetch } =
    useListNotificationsQuery(userId)
  const [markAsRead, { isLoading: isMarking, isError: markFailed }] =
    useMarkNotificationAsReadMutation()

  const notifications = currentData?.notifications ?? []
  const hasUnread = notifications.some((item) => item.readAt === null)

  return (
    <Popover.Root onOpenChange={(open) => {
      if (open && !isFetching) void refetch()
    }}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={hasUnread ? 'Notifications, unread items' : 'Notifications'}
          className="button-secondary relative inline-flex size-9 items-center justify-center p-0"
        >
          <Bell className="size-4" aria-hidden="true" />
          {hasUnread && (
            <span
              aria-hidden="true"
              className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary"
            />
          )}
        </button>
      </Popover.Trigger>

      <Popover.Content
        aria-label="Notifications"
        align="end"
        sideOffset={8}
        collisionPadding={12}
        className="surface-card max-h-[min(20rem,var(--radix-popover-content-available-height))] w-80 max-w-[calc(100vw-1.5rem)] overflow-y-auto p-4 text-sm"
      >
        <h2 className="mb-3 font-semibold">Notifications</h2>

        {isFetching && !currentData ? (
          <p role="status">Loading notifications…</p>
        ) : isError ? (
          <button type="button" className="button-secondary" onClick={() => void refetch()}>
            Couldn’t load notifications. Retry
          </button>
        ) : notifications.length === 0 ? (
          <p className="text-muted-foreground">No notifications yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {notifications.map((item) => (
              <li key={item._id} className="space-y-2 py-3">
                <p className="wrap-break-word">{item.message}</p>
                {item.readAt === null && (
                  <button
                    type="button"
                    className="button-secondary"
                    disabled={isMarking}
                    onClick={() => void markAsRead(item._id)}
                  >
                    Mark as read
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {markFailed && <p role="alert">Couldn’t mark the notification as read.</p>}
      </Popover.Content>
    </Popover.Root>
  )
}
