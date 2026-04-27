export type CostItem = {
	label: string;
	amountThb: number;
	note?: string;
};

export type NailScenario = {
	label: string;
	sessionsPerMonth: number;
};

export type WorkshopScenario = {
	label: string;
	sessionsPerMonth: number;
	averageChildren: number;
};

export type CashEvent = {
	date: string;
	label: string;
	amountThb: number;
};

export const assumptions = {
	currency: 'THB',
	lastUpdated: '2026-04-26',
	general: {
		contingencyRate: 0.15,
		notes: [
			'All numbers are planning estimates and should be replaced with supplier quotes when available.',
			'ROI is calculated as initial investment divided by monthly contribution profit, before tax and overhead allocation.',
			'Salaries and rent are shown in the cash projection, not allocated into individual project ROI yet.'
		]
	},
	nailPolish: {
		averageRevenuePerSessionThb: 1000,
		variableMaterialsPerSessionThb: 80,
		staffCostPerSessionThb: 100,
		initialCosts: [
			{ label: 'Nail polish / gel course', amountThb: 20000, note: 'Known estimate from owner' },
			{
				label: 'Professional gel polish starter colors and top/base coats',
				amountThb: 12000,
				note: 'Mid-range starter set: 20–50 colors, base/top/primer. Research range: ~2.3k–6.2k for basic kits, ~12k–35k for service-ready setup.'
			},
			{ label: 'UV/LED lamps, nail drill, bits and manicure tools', amountThb: 7500 },
			{ label: 'Anatomic / builder gel supplies and brushes', amountThb: 4500 },
			{ label: 'Disinfection, files, buffers, wipes, removers and setup supplies', amountThb: 4000 },
			{ label: 'Display / storage / small setup extras', amountThb: 2500 }
		] satisfies CostItem[],
		scenarios: [
			{ label: '2 sessions per week', sessionsPerMonth: 2 * 4.33 },
			{ label: '1 session per day', sessionsPerMonth: 30 },
			{ label: '3 sessions per day', sessionsPerMonth: 90 }
		] satisfies NailScenario[],
		missingInfo: [
			'Exact brand/quality level for gels and tools',
			'Whether existing staff can perform sessions or salary/commission should be added per session',
			'How much space and furniture is already available for nail service',
			'Expected pricing mix: simple gel, extensions/anatomic, nail art upsells'
		]
	},
	poolFence: {
		initialCosts: [
			{
				label: 'Pool safety fence: acrylic sheets + metal frame',
				amountThb: 20000,
				note: 'Known estimate from owner'
			}
		] satisfies CostItem[],
		decisionNotes: [
			'Safety/compliance project: direct ROI is not applicable unless it enables pool-related revenue.',
			'Business value should be evaluated as risk reduction, parent confidence, and ability to use/market pool-adjacent areas safely.',
			'Confirm height, gate latch/lock, sharp edges, installation warranty, and acrylic thickness before ordering.'
		],
		missingInfo: ['Final measured fence length', 'Acrylic thickness/spec', 'Gate/lock inclusion', 'Installer warranty']
	},
	workshopRoom: {
		averagePricePerChildThb: 300,
		variableMaterialsPerChildThb: 100,
		facilitatorCostPerWorkshopThb: 400,
		initialCosts: [
			{ label: 'Lighting upgrade', amountThb: 8000, note: 'Research range: ~1.5k–8k item cost before larger electrical work' },
			{ label: 'Wall-mounted foldable tables', amountThb: 18000, note: 'Research range: ~6k–25k depending quantity and DIY vs bought' },
			{ label: 'Kids chairs', amountThb: 12000, note: 'Approx. 10–12 chairs; research range ~6k–20k' },
			{ label: 'Decorations / wall treatment', amountThb: 8000, note: 'Research range: ~3k–15k' },
			{ label: 'Storage closets / cabinets', amountThb: 18000, note: 'Research range: ~8k–40k depending built-ins/lockable storage' },
			{ label: 'Paint, safety items, small tools and installation misc.', amountThb: 10000 }
		] satisfies CostItem[],
		scenarios: [
			{ label: 'Light usage: 1 workshop/week', sessionsPerMonth: 4, averageChildren: 8 },
			{ label: 'Base case: 2 workshops/week', sessionsPerMonth: 8, averageChildren: 10 },
			{ label: 'Strong usage: 4 workshops/week', sessionsPerMonth: 16, averageChildren: 12 }
		] satisfies WorkshopScenario[],
		missingInfo: [
			'Room dimensions and number of wall tables possible',
			'Max safe children capacity per workshop',
			'Whether workshops need an extra facilitator or use existing salary staff',
			'Planned workshop price: single class, package, member discount',
			'Any aircon/electrical upgrades needed'
		]
	},
	fundsProjection: {
		startingBalanceThb: 600000,
		startingDate: '2026-04-26',
		events: [
			{ date: '2026-04-30', label: 'Salary payment', amountThb: -100000 },
			{ date: '2026-05-15', label: 'Salary payment', amountThb: -100000 },
			{ date: '2026-05-30', label: 'Salary payment', amountThb: -100000 },
			{ date: '2026-06-15', label: 'Salary payment', amountThb: -100000 },
			{ date: '2026-06-15', label: 'Rent payment', amountThb: -300000 },
			{ date: '2026-06-30', label: 'Salary payment', amountThb: -100000 },
			{ date: '2026-07-15', label: 'Salary payment', amountThb: -100000 },
			{ date: '2026-07-30', label: 'Salary payment', amountThb: -100000 }
		] satisfies CashEvent[]
	}
};

export const sumCosts = (items: CostItem[]) => items.reduce((sum, item) => sum + item.amountThb, 0);

export const addContingency = (amount: number, rate = assumptions.general.contingencyRate) =>
	Math.round(amount * (1 + rate));

export const formatThb = (amount: number) =>
	new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'THB',
		maximumFractionDigits: 0
	}).format(amount);

export const formatMonths = (months: number) => {
	if (!Number.isFinite(months)) return 'N/A';
	if (months < 1) return `${Math.round(months * 30)} days`;
	return `${months.toFixed(1)} months`;
};

export const nailInvestment = () => addContingency(sumCosts(assumptions.nailPolish.initialCosts));

export type BusinessPlanParams = {
	contingencyRate: number;
	nail: {
		averageRevenuePerSessionThb: number;
		variableMaterialsPerSessionThb: number;
		staffCostPerSessionThb: number;
	};
	poolFenceTotalThb: number;
	workshop: {
		averagePricePerChildThb: number;
		variableMaterialsPerChildThb: number;
		facilitatorCostPerWorkshopThb: number;
	};
	funds: {
		startingBalanceThb: number;
		salaryPerPaymentThb: number;
		rentThb: number;
	};
};

export const nailScenarioRowsFrom = (
	p: BusinessPlanParams,
	_nailBaseCostThb: number,
	nailInv: number
) => {
	const rev = p.nail.averageRevenuePerSessionThb;
	const mat = p.nail.variableMaterialsPerSessionThb;
	const staff = p.nail.staffCostPerSessionThb;
	const contributionPerSession = rev - mat - staff;

	return assumptions.nailPolish.scenarios.map((scenario) => {
		const monthlyRevenue = scenario.sessionsPerMonth * rev;
		const monthlyVariableCost = scenario.sessionsPerMonth * (mat + staff);
		const monthlyContribution = monthlyRevenue - monthlyVariableCost;

		return {
			...scenario,
			contributionPerSession,
			monthlyRevenue,
			monthlyVariableCost,
			monthlyContribution,
			roiMonths: nailInv / monthlyContribution
		};
	});
};

export const workshopScenarioRowsFrom = (
	p: BusinessPlanParams,
	_workshopBaseCostThb: number,
	workshopInv: number
) => {
	const w = p.workshop;
	return assumptions.workshopRoom.scenarios.map((scenario) => {
		const monthlyChildren = scenario.sessionsPerMonth * scenario.averageChildren;
		const monthlyRevenue = monthlyChildren * w.averagePricePerChildThb;
		const monthlyMaterials = monthlyChildren * w.variableMaterialsPerChildThb;
		const monthlyFacilitator = scenario.sessionsPerMonth * w.facilitatorCostPerWorkshopThb;
		const monthlyContribution = monthlyRevenue - monthlyMaterials - monthlyFacilitator;

		return {
			...scenario,
			monthlyChildren,
			monthlyRevenue,
			monthlyMaterials,
			monthlyFacilitator,
			monthlyContribution,
			roiMonths: workshopInv / monthlyContribution
		};
	});
};

/**
 * Replays the same schedule as the static assumptions, with salary and rent taken from `p.funds`.
 */
export const fundsProjectionRowsFrom = (p: BusinessPlanParams) => {
	const salary = p.funds.salaryPerPaymentThb;
	const rent = p.funds.rentThb;
	const reordered: CashEvent[] = [
		{ date: '2026-04-30', label: 'Salary payment', amountThb: -salary },
		{ date: '2026-05-15', label: 'Salary payment', amountThb: -salary },
		{ date: '2026-05-30', label: 'Salary payment', amountThb: -salary },
		{ date: '2026-06-15', label: 'Salary payment', amountThb: -salary },
		{ date: '2026-06-15', label: 'Rent payment', amountThb: -rent },
		{ date: '2026-06-30', label: 'Salary payment', amountThb: -salary },
		{ date: '2026-07-15', label: 'Salary payment', amountThb: -salary },
		{ date: '2026-07-30', label: 'Salary payment', amountThb: -salary }
	];

	let balance = p.funds.startingBalanceThb;
	return reordered.map((event) => {
		balance += event.amountThb;
		return { ...event, balance };
	});
};

export const totalKnownInitialInvestmentFrom = (
	p: BusinessPlanParams,
	nailBaseCostThb: number,
	workshopBaseCostThb: number
) =>
	addContingency(nailBaseCostThb, p.contingencyRate) +
	p.poolFenceTotalThb +
	addContingency(workshopBaseCostThb, p.contingencyRate);

export const nailScenarioRows = () => {
	const p = staticParams();
	const nailBase = sumCosts(assumptions.nailPolish.initialCosts);
	const nailInv = addContingency(nailBase, p.contingencyRate);
	return nailScenarioRowsFrom(p, nailBase, nailInv);
};

const staticParams = (): BusinessPlanParams => ({
	contingencyRate: assumptions.general.contingencyRate,
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
});

export const workshopInvestment = () => addContingency(sumCosts(assumptions.workshopRoom.initialCosts));

export const workshopScenarioRows = () => {
	const p = staticParams();
	const wBase = sumCosts(assumptions.workshopRoom.initialCosts);
	const wInv = addContingency(wBase, p.contingencyRate);
	return workshopScenarioRowsFrom(p, wBase, wInv);
};

export const fundsProjectionRows = () => fundsProjectionRowsFrom(staticParams());

export const totalKnownInitialInvestment = () => {
	const p = staticParams();
	const n = sumCosts(assumptions.nailPolish.initialCosts);
	const w = sumCosts(assumptions.workshopRoom.initialCosts);
	return totalKnownInitialInvestmentFrom(p, n, w);
};
