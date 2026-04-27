import { assumptions } from './assumptions';
import {
	addContingency,
	fundsProjectionRowsFrom,
	nailScenarioRowsFrom,
	sumCosts,
	totalKnownInitialInvestmentFrom,
	workshopScenarioRowsFrom,
	type BusinessPlanParams
} from './assumptions';

const defaultPercent = () => Math.round(assumptions.general.contingencyRate * 100);

function defaults() {
	return {
		contingencyPercent: defaultPercent(),
		nail: {
			averageRevenuePerSessionThb: assumptions.nailPolish.averageRevenuePerSessionThb,
			variableMaterialsPerSessionThb: assumptions.nailPolish.variableMaterialsPerSessionThb,
			staffCostPerSessionThb: assumptions.nailPolish.staffCostPerSessionThb
		},
		poolFenceTotalThb: sumCosts(assumptions.poolFence.initialCosts),
		workshop: {
			averagePricePerChildThb: assumptions.workshopRoom.averagePricePerChildThb,
			variableMaterialsPerChildThb: assumptions.workshopRoom.variableMaterialsPerChildThb,
			facilitatorCostPerWorkshopThb: assumptions.workshopRoom.facilitatorCostPerWorkshopThb
		},
		funds: {
			startingBalanceThb: assumptions.fundsProjection.startingBalanceThb,
			salaryPerPaymentThb: 100_000,
			rentThb: 300_000
		}
	};
}

export class BusinessPlanState {
	/** 0–100, displayed as % on cap-ex buffer for nail + workshop */
	contingencyPercent = $state(defaults().contingencyPercent);
	nailAvgRevenue = $state(defaults().nail.averageRevenuePerSessionThb);
	nailMaterials = $state(defaults().nail.variableMaterialsPerSessionThb);
	nailStaffCost = $state(defaults().nail.staffCostPerSessionThb);
	poolFenceTotalThb = $state(defaults().poolFenceTotalThb);
	wsPricePerChild = $state(defaults().workshop.averagePricePerChildThb);
	wsMaterialsPerChild = $state(defaults().workshop.variableMaterialsPerChildThb);
	wsFacilitator = $state(defaults().workshop.facilitatorCostPerWorkshopThb);
	wsAvgChildren = $state(10);
	wsSessionsPerMonth = $state(8);
	wsInternalHostPay = $state(2_000);
	wsExternalHostFee = $state(3_000);
	wsRevenueSharePercent = $state(30);

	fundsStart = $state(defaults().funds.startingBalanceThb);
	salaryPerPayment = $state(defaults().funds.salaryPerPaymentThb);
	rentThb = $state(defaults().funds.rentThb);

	params = $derived.by(
		(): BusinessPlanParams => ({
			contingencyRate: this.contingencyPercent / 100,
			nail: {
				averageRevenuePerSessionThb: this.nailAvgRevenue,
				variableMaterialsPerSessionThb: this.nailMaterials,
				staffCostPerSessionThb: this.nailStaffCost
			},
			poolFenceTotalThb: this.poolFenceTotalThb,
			workshop: {
				averagePricePerChildThb: this.wsPricePerChild,
				variableMaterialsPerChildThb: this.wsMaterialsPerChild,
				facilitatorCostPerWorkshopThb: this.wsFacilitator
			},
			funds: {
				startingBalanceThb: this.fundsStart,
				salaryPerPaymentThb: this.salaryPerPayment,
				rentThb: this.rentThb
			}
		})
	);

	nailBaseCost = $derived(sumCosts(assumptions.nailPolish.initialCosts));
	nailInvestment = $derived.by(() => addContingency(this.nailBaseCost, this.contingencyPercent / 100));
	workshopBaseCost = $derived(sumCosts(assumptions.workshopRoom.initialCosts));
	workshopInvestment = $derived.by(() => addContingency(this.workshopBaseCost, this.contingencyPercent / 100));
	totalInitialAllProjects = $derived.by(() =>
		totalKnownInitialInvestmentFrom(this.params, this.nailBaseCost, this.workshopBaseCost)
	);
	nailRows = $derived.by(() => nailScenarioRowsFrom(this.params, this.nailBaseCost, this.nailInvestment));
	workshopRows = $derived.by(() =>
		workshopScenarioRowsFrom(this.params, this.workshopBaseCost, this.workshopInvestment)
	);
	cashRows = $derived.by(() => fundsProjectionRowsFrom(this.params));

	bestNailPaybackMonths = $derived.by(() =>
		Math.min(
			...this.nailRows.map((r) => (Number.isFinite(r.roiMonths) ? r.roiMonths : Number.POSITIVE_INFINITY))
		)
	);
	bestWorkshopPaybackMonths = $derived.by(() =>
		Math.min(
			...this.workshopRows.map((r) => (Number.isFinite(r.roiMonths) ? r.roiMonths : Number.POSITIVE_INFINITY))
		)
	);
	minCashBalance = $derived.by(() =>
		Math.min(...this.cashRows.map((r) => r.balance), this.params.funds.startingBalanceThb)
	);
	cashEndBalance = $derived.by(
		() => this.cashRows[this.cashRows.length - 1]?.balance ?? this.params.funds.startingBalanceThb
	);
	cashNegativeBeforeProjects = $derived.by(() => this.minCashBalance < 0);

	wsOperationModels = $derived.by(() => {
		const children = this.wsAvgChildren;
		const sessions = this.wsSessionsPerMonth;
		const price = this.wsPricePerChild;
		const mat = this.wsMaterialsPerChild;
		const totalChildren = children * sessions;
		const grossRevenue = price * totalChildren;
		const totalMaterials = mat * totalChildren;

		const internalHostTotal = this.wsInternalHostPay * sessions;
		const shareRevenue = Math.round((grossRevenue * this.wsRevenueSharePercent) / 100);

		return [
			{
				id: 'internal' as const,
				label: 'Internal host (our Thai staff)',
				how: `We charge parents ${price} /child, pay host ${this.wsInternalHostPay} /session, cover materials`,
				monthlyRevenue: grossRevenue,
				monthlyCosts: totalMaterials + internalHostTotal,
				monthlyMaterials: totalMaterials,
				monthlyHostCost: internalHostTotal,
				monthlyContribution: grossRevenue - totalMaterials - internalHostTotal
			},
			{
				id: 'external-fixed' as const,
				label: 'External host (fixed rental)',
				how: `External instructor pays us ${this.wsExternalHostFee} /session to use the room. They handle pricing, materials, everything.`,
				monthlyRevenue: this.wsExternalHostFee * sessions,
				monthlyCosts: 0,
				monthlyMaterials: 0,
				monthlyHostCost: 0,
				monthlyContribution: this.wsExternalHostFee * sessions
			},
			{
				id: 'revenue-share' as const,
				label: 'Revenue share',
				how: `We provide room + materials, take ${this.wsRevenueSharePercent}% of gross (${price} /child). No host salary.`,
				monthlyRevenue: shareRevenue,
				monthlyCosts: totalMaterials,
				monthlyMaterials: totalMaterials,
				monthlyHostCost: 0,
				monthlyContribution: shareRevenue - totalMaterials
			}
		];
	});

	/** Balance after last event vs total CAPEX: rough sufficiency (does not time project spend) */
	headroomAfterSchedule = $derived.by(() => this.cashEndBalance - this.totalInitialAllProjects);
}
