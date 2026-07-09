export const MGMT_ANALYTICS_PERIODS = ['today', '7d', '30d', '90d', '12m'] as const;
export type MgmtAnalyticsPeriod = (typeof MGMT_ANALYTICS_PERIODS)[number];
export type MgmtAnalyticsGroupBy = 'day' | 'week' | 'month';

const periodLabels: Record<MgmtAnalyticsPeriod, string> = {
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '12m': 'Last 12 months'
};

export class MgmtAnalyticsFilters {
  period = $state<MgmtAnalyticsPeriod>('30d');
  groupBy = $state<MgmtAnalyticsGroupBy>('day');

  readonly periodOptions = MGMT_ANALYTICS_PERIODS.map((value) => ({
    value,
    label: value === 'today' ? 'Today' : value.toUpperCase()
  }));

  readonly groupByOptions: MgmtAnalyticsGroupBy[] = ['day', 'week', 'month'];

  label = $derived(periodLabels[this.period]);
  queryKey = $derived(`${this.period}:${this.groupBy}`);

  setPeriod(period: MgmtAnalyticsPeriod) {
    this.period = period;
    if (period === '12m') this.groupBy = 'month';
    else if (period === '90d') this.groupBy = 'week';
    else this.groupBy = 'day';
  }

  setGroupBy(groupBy: MgmtAnalyticsGroupBy) {
    this.groupBy = groupBy;
  }
}
