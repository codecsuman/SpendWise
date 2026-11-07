// ============================================================================
// Analytics service
//
// Turns raw aggregation rows into the shape the dashboard needs:
//   - month defaults to the current month
//   - trend months with no transactions are filled with zeros
//   - money is rounded to 2 decimals, percentages to 1
//   - savings can be negative (spent more than earned), and that is fine
//
// No caching yet. Redis (Phase 12) wraps this method later with cache-aside.
// ============================================================================

import { AnalyticsRepository } from '../repositories/analytics.repository.js';
import type { AnalyticsQuery } from '../validators/analytics.validator.js';

const analyticsRepository = new AnalyticsRepository();

export interface CategoryBreakdown {
  categoryId: string;
  name: string;
  color: string;
  amount: number;
  percent: number;
}

export interface TrendPoint {
  month: string;
  income: number;
  expense: number;
}

export interface AnalyticsOverview {
  month: string;
  income: number;
  expense: number;
  savings: number;
  savingsRate: number;
  categories: CategoryBreakdown[];
  trend: TrendPoint[];
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function percentOf(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
}

// "2026-11" in the server's local timezone (same rule as budget.service.ts).
function currentMonth(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${now.getFullYear()}-${month}`;
}

// First and last millisecond of a "YYYY-MM" month, in UTC. Transactions are
// stored in UTC, so both sides compare the same way.
function monthRange(month: string): { from: Date; to: Date } {
  const [year, monthNumber] = month.split('-').map(Number);

  return {
    from: new Date(Date.UTC(year, monthNumber - 1, 1)),
    // Day 0 of the next month = last day of this month.
    to: new Date(Date.UTC(year, monthNumber, 0, 23, 59, 59, 999)),
  };
}

// Move a "YYYY-MM" value by offset months. Date.UTC rolls over the year.
function shiftMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  const shiftedMonth = String(date.getUTCMonth() + 1).padStart(2, '0');

  return `${date.getUTCFullYear()}-${shiftedMonth}`;
}

export class AnalyticsService {
  async overview(
    userId: string,
    query: AnalyticsQuery
  ): Promise<AnalyticsOverview> {
    const month = query.month ?? currentMonth();
    const months = query.months;

    const { from, to } = monthRange(month);
    const trendStart = monthRange(shiftMonth(month, -(months - 1))).from;

    // The three aggregations are independent, so they run together.
    const [totals, categories, monthlyRows] = await Promise.all([
      analyticsRepository.totalsForRange(userId, from, to),
      analyticsRepository.expensesByCategory(userId, from, to),
      analyticsRepository.monthlyTotals(userId, trendStart, to),
    ]);

    const income = roundMoney(totals.income);
    const expense = roundMoney(totals.expense);
    const savings = roundMoney(income - expense);

    const breakdown = categories.map((row) => ({
      categoryId: row.categoryId,
      // A deleted category still shows its money, under a safe label.
      name: row.name ?? 'Uncategorized',
      color: row.color ?? '#6b7280',
      amount: roundMoney(row.total),
      percent: percentOf(row.total, expense),
    }));

    // Fill the gaps so the chart has exactly `months` points.
    const byMonth = new Map(monthlyRows.map((row) => [row.month, row]));
    const trend: TrendPoint[] = [];

    for (let index = 0; index < months; index += 1) {
      const key = shiftMonth(month, -(months - 1 - index));
      const row = byMonth.get(key);

      trend.push({
        month: key,
        income: roundMoney(row?.income ?? 0),
        expense: roundMoney(row?.expense ?? 0),
      });
    }

    return {
      month,
      income,
      expense,
      savings,
      savingsRate: percentOf(savings, income),
      categories: breakdown,
      trend,
    };
  }
}

export const analyticsService = new AnalyticsService();
