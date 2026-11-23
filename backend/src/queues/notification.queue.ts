import { logger } from '../config/logger.js';
import { Goal } from '../models/Goal.model.js';
import { NotificationService } from '../services/notification.service.js';

const notificationService = new NotificationService();
const DAY_MS = 24 * 60 * 60 * 1000;

let timer: NodeJS.Timeout | undefined;

export async function processGoalReminders(now = new Date()): Promise<void> {
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);

  // Exclusive upper bound so the seventh day is included in full.
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + 8);

  const goals = Goal.find({
    status: 'active',
    targetDate: { $gte: today, $lt: end },
  })
    .select('_id user name targetDate')
    .lean()
    .cursor();

  for await (const goal of goals) {
    try {
      await notificationService.createGoalReminder(
        String(goal.user),
        String(goal._id),
        goal.name,
        goal.targetDate,
      );
    } catch (error) {
      logger.warn(
        { err: error, goalId: String(goal._id) },
        'Failed to create goal reminder',
      );
    }
  }
}

export function startGoalReminderScheduler(): void {
  if (timer) return;

  const run = () => {
    void processGoalReminders().catch((error) => {
      logger.error({ err: error }, 'Goal reminder scan failed');
    });
  };

  timer = setInterval(run, DAY_MS);
  timer.unref();
  run();
}
