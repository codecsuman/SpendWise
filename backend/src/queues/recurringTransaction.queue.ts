// ============================================================================
// recurringTransaction.queue.ts — the scheduler side of Phase 9.
//
// A recurring rule is only a template. This file is what turns it into real
// money: every minute it asks the database "which active rules are due?", and
// for each one it
//   1. moves the schedule forward (nextRunAt + lastRunAt),
//   2. writes a normal Transaction dated on the scheduled day.
//
// Why "move first, insert second": if the process dies between the two steps,
// the occurrence is missed (and logged) instead of being inserted twice on the
// next tick. A duplicate bill is worse than a missing one for a ledger.
//
// Scope: this is an in-process timer, so it only works while the server runs
// and only on one server. Phase 13 (RabbitMQ) replaces it with a durable job
// that survives restarts and retries. The rule itself does not change: the
// worker calls the same nextRunDate() helper from recurring.service.ts.
//
// No HTTP route calls this file. It starts once from server.ts.
// ============================================================================

import { TransactionRepository } from '../repositories/transaction.repository.js';
import { RecurringTransactionRepository } from '../repositories/recurring.repository.js';
import { nextRunDate } from '../services/recurring.service.js';

const recurringRepository = new RecurringTransactionRepository();
const transactionRepository = new TransactionRepository();

// One minute is fine for day-level schedules, and it keeps the load tiny:
// the (isActive, nextRunAt) index makes the lookup cheap.
const TICK_MS = 60_000;

// Scan a batch, not the whole collection. A backlog is cleared over several
// ticks instead of in one huge memory spike.
const BATCH_SIZE = 100;

let timer: NodeJS.Timeout | null = null;
// A slow tick must not overlap with the next one: two runs of the same rule
// would both see "due" and create two transactions.
let isRunning = false;

// Exported so it can be tested or triggered by hand (node --import tsx ...).
export async function processDueRecurring(now = new Date()): Promise<number> {
  if (isRunning) return 0;

  isRunning = true;
  let created = 0;

  try {
    const due = await recurringRepository.findDue(now, BATCH_SIZE);

    for (const rule of due) {
      const ruleId = String(rule._id);
      const userId = String(rule.user);
      // The date the bill belongs to — NOT "now". A rule that was missed for
      // three days still lands on its own due date in the ledger.
      const dueDate = rule.nextRunAt;
      const next = nextRunDate(dueDate, rule.frequency, rule.interval);
      // No point scheduling a date after the rule asked to stop.
      const finished = rule.endDate ? next > rule.endDate : false;

      try {
        // Step 1: claim the occurrence by moving the schedule forward.
        await recurringRepository.advanceSchedule(
          ruleId,
          dueDate,
          next,
          finished ? false : undefined
        );

        // Step 2: write the ledger row. The category is copied as-is: it was
        // ownership-checked when the rule was created.
        await transactionRepository.create(userId, {
          type: rule.type,
          amount: rule.amount,
          currency: rule.currency,
          category: rule.category,
          description: rule.description,
          date: dueDate,
        });

        created += 1;
      } catch (error) {
        // The schedule already moved, so a broken rule cannot create a hot
        // loop of retries. The skipped occurrence is traceable by its date.
        console.error(
          `[recurring] rule ${ruleId} skipped the occurrence at ${dueDate.toISOString()}:`,
          error
        );
      }
    }

    return created;
  } finally {
    isRunning = false;
  }
}

export function startRecurringScheduler(intervalMs = TICK_MS): void {
  // Starting twice would double every run, so the first call wins.
  if (timer) return;

  // Do not wait a full interval for the first pass: bills may already be due.
  void processDueRecurring().catch((error) => {
    console.error('[recurring] first pass failed:', error);
  });

  timer = setInterval(() => {
    void processDueRecurring().catch((error) => {
      console.error('[recurring] tick failed:', error);
    });
  }, intervalMs);

  // Do not keep the process alive just for the timer (useful for scripts).
  timer.unref();

  console.log(
    `[recurring] scheduler started (every ${Math.round(intervalMs / 1000)}s)`
  );
}

export function stopRecurringScheduler(): void {
  if (!timer) return;

  clearInterval(timer);
  timer = null;
}
