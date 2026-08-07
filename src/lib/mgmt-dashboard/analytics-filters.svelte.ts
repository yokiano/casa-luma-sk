export const MGMT_ANALYTICS_PERIODS = ['today', '7d', '30d', '90d', '12m'] as const;
export type MgmtAnalyticsPeriod = (typeof MGMT_ANALYTICS_PERIODS)[number];
export type MgmtAnalyticsGroupBy = 'day' | 'week' | 'month';
export type MgmtAnalyticsCustomerPresence = 'all' | 'assigned' | 'unassigned';
export type MgmtAnalyticsFilterOption = { id: string; label: string; secondaryLabel?: string };

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
  customer = $state<MgmtAnalyticsFilterOption | null>(null);
  items = $state<MgmtAnalyticsFilterOption[]>([]);
  paymentTypes = $state<MgmtAnalyticsFilterOption[]>([]);
  customerPresence = $state<MgmtAnalyticsCustomerPresence>('all');

  readonly periodOptions = MGMT_ANALYTICS_PERIODS.map((value) => ({
    value,
    label: value === 'today' ? 'Today' : value.toUpperCase()
  }));

  readonly groupByOptions: MgmtAnalyticsGroupBy[] = ['day', 'week', 'month'];

  label = $derived(periodLabels[this.period]);
  activeFilterCount = $derived(
    (this.customer ? 1 : 0) + this.items.length + this.paymentTypes.length + (this.customerPresence === 'all' ? 0 : 1)
  );
  queryKey = $derived(
    [
      this.period,
      this.groupBy,
      this.customer?.id ?? '',
      this.items.map(({ id }) => id).sort().join(','),
      this.paymentTypes.map(({ id }) => id).sort().join(','),
      this.customerPresence
    ].join(':')
  );

  setPeriod(period: MgmtAnalyticsPeriod) {
    this.period = period;
    if (period === '12m') this.groupBy = 'month';
    else if (period === '90d') this.groupBy = 'week';
    else this.groupBy = 'day';
  }

  setGroupBy(groupBy: MgmtAnalyticsGroupBy) {
    this.groupBy = groupBy;
  }

  setCustomer(customer: MgmtAnalyticsFilterOption | null) {
    this.customer = customer;
    if (customer) this.customerPresence = 'all';
  }

  toggleItem(item: MgmtAnalyticsFilterOption) {
    this.items = this.items.some(({ id }) => id === item.id)
      ? this.items.filter(({ id }) => id !== item.id)
      : [...this.items, item];
  }

  togglePaymentType(paymentType: MgmtAnalyticsFilterOption) {
    this.paymentTypes = this.paymentTypes.some(({ id }) => id === paymentType.id)
      ? this.paymentTypes.filter(({ id }) => id !== paymentType.id)
      : [...this.paymentTypes, paymentType];
  }

  setCustomerPresence(value: MgmtAnalyticsCustomerPresence) {
    this.customerPresence = value;
    if (value !== 'all') this.customer = null;
  }

  clearAll() {
    this.customer = null;
    this.items = [];
    this.paymentTypes = [];
    this.customerPresence = 'all';
  }
}
