<script lang="ts">
	import { tick } from 'svelte';
	import logoUrl from '$lib/assets/logo/logo-no-sun-transparent.png';
	import { Printer, ArrowLeft, Clock } from 'lucide-svelte';

	const slips = Array.from({ length: 10 }, (_, index) => index + 1);

	let isPrinting = $state(false);

	$effect(() => {
		document.body.classList.toggle('printing-check-in-slips', isPrinting);

		return () => {
			document.body.classList.remove('printing-check-in-slips');
		};
	});

	const printPage = async () => {
		isPrinting = true;
		await tick();
		window.print();
	};
</script>

<svelte:head>
	<title>Print check-in paper · Casa Luma</title>
</svelte:head>

<svelte:window onafterprint={() => (isPrinting = false)} />

<div class:printing={isPrinting} class="print-page">
	<div class="screen-toolbar print:hidden">
		<div>
			<a href="/tools/memberships" class="back-link">
				<ArrowLeft class="h-4 w-4" />
				Back to memberships
			</a>
			<h1>Print check-in paper</h1>
			<p>
				Print one sheet, cut on the dotted lines, and use each note for 1-hour memberships or flexi pass visits.
			</p>
		</div>
		<button type="button" class="print-button" onclick={printPage}>
			<Printer class="h-4 w-4" />
			Print slips
		</button>
	</div>

	<section class="slip-sheet" aria-label="Printable check-in slips">
		{#each slips as slip}
			<article class="check-in-slip" aria-label={`Check-in slip ${slip}`}>
				<header class="slip-header">
					<img src={logoUrl} alt="Casa Luma Play Cafe" />
					<p class="slip-title">Check-in note</p>
				</header>

				<div class="fields">
					<div class="top-fields">
						<label class="family-code">Family code <span></span></label>
						<label>Date <span></span></label>
					</div>
					<div class="time-fields">
						<label>
							<span class="time-label"><Clock class="time-icon" /> Start time</span>
							<span class="time-blank"></span>
						</label>
						<label>
							<span class="time-label"><Clock class="time-icon" /> Finish time</span>
							<span class="time-blank"></span>
						</label>
					</div>
				</div>

				<div class="rules">
					<p><strong>1-hour visit:</strong> over 1 hour is charged as a full day.</p>
					<p>If finish time is not reported at reception, we use the leaving time.</p>
					<p>Thank you for your cooperation.</p>
				</div>
			</article>
		{/each}
	</section>
</div>

<style>
	:global(body) {
		background: #f6f1eb;
	}

	.print-page {
		color: #2c2925;
	}

	.print-page.printing .screen-toolbar,
	:global(body.printing-check-in-slips .min-h-screen > header) {
		display: none !important;
	}

	:global(body.printing-check-in-slips main) {
		max-width: none !important;
		padding: 0 !important;
		margin: 0 !important;
	}

	:global(body.printing-check-in-slips) {
		background: white !important;
	}

	.screen-toolbar {
		margin-bottom: 1.5rem;
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
		border-bottom: 1px solid #e3d7cc;
		padding-bottom: 1.5rem;
	}

	.screen-toolbar h1 {
		margin: 0.5rem 0 0;
		font-size: 1.875rem;
		font-weight: 650;
		letter-spacing: -0.03em;
		color: #5c4a3d;
	}

	.screen-toolbar p {
		margin: 0.5rem 0 0;
		max-width: 42rem;
		font-size: 0.875rem;
		color: rgba(122, 101, 80, 0.82);
	}

	.back-link,
	.print-button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		border-radius: 999px;
		font-size: 0.875rem;
		font-weight: 600;
		text-decoration: none;
	}

	.back-link {
		color: #7a6550;
	}

	.print-button {
		border: 1px solid #7a6550;
		background: #7a6550;
		padding: 0.75rem 1.2rem;
		color: white;
		box-shadow: 0 10px 24px rgba(92, 74, 61, 0.14);
		transition: background 120ms ease, transform 120ms ease;
	}

	.print-button:hover {
		background: #5c4a3d;
		transform: translateY(-1px);
	}

	.slip-sheet {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0;
		width: min(100%, 210mm);
		margin: 0 auto;
		background: white;
		box-shadow: 0 20px 50px rgba(92, 74, 61, 0.12);
	}

	.check-in-slip {
		box-sizing: border-box;
		min-height: 57mm;
		border: 1px dashed #8d7b69;
		padding: 4mm;
		break-inside: avoid;
		page-break-inside: avoid;
		background: white;
	}

	.slip-header {
		display: grid;
		align-items: center;
		grid-template-columns: 24mm 1fr;
		gap: 3mm;
		border-bottom: 1px solid #ded3c7;
		padding-bottom: 1mm;
	}

	.slip-header img {
		height: 10mm;
		width: 24mm;
		object-fit: contain;
		object-position: left center;
	}

	.slip-title {
		margin: 0;
		font-size: 8pt;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-align: left;
		text-transform: uppercase;
		color: #7a6550;
	}

	.fields {
		display: grid;
		gap: 2.5mm;
		margin-top: 2.5mm;
		font-size: 9.5pt;
		font-weight: 700;
	}

	.top-fields,
	.time-fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 3.5mm;
	}

	.top-fields label {
		display: flex;
		align-items: baseline;
		gap: 2mm;
		white-space: nowrap;
	}

	.family-code span {
		max-width: 22mm;
	}

	.fields span {
		min-width: 0;
		flex: 1;
		border-bottom: 1.5px solid #2c2925;
	}

	.time-fields label {
		display: grid;
		gap: 1.5mm;
		border: 1.5px solid #2c2925;
		border-radius: 2mm;
		padding: 1.5mm;
		font-size: 10pt;
		font-weight: 800;
	}

	.fields .time-label {
		display: flex;
		align-items: center;
		gap: 1.5mm;
		min-width: auto;
		flex: none;
		border-bottom: 0;
	}

	.fields .time-blank {
		display: block;
		width: 100%;
		min-height: 4.5mm;
		flex: none;
	}

	.time-icon {
		height: 4mm;
		width: 4mm;
		flex: 0 0 auto;
		stroke-width: 2.5;
	}

	.rules {
		margin-top: 2.8mm;
		border: 1.6px solid #2c2925;
		padding: 1.8mm 2mm;
		text-align: center;
		font-size: 8.2pt;
		font-weight: 700;
		line-height: 1.18;
		text-wrap: balance;
	}

	.rules p {
		margin: 0 auto;
		max-width: 78mm;
	}

	.rules p + p {
		margin-top: 0.8mm;
		font-size: 7.7pt;
	}

	@media print {
		:global(html),
		:global(body) {
			margin: 0 !important;
			background: white !important;
		}

		:global(main) {
			max-width: none !important;
			padding: 0 !important;
			margin: 0 !important;
		}

		:global(.min-h-screen) {
			min-height: 0 !important;
			background: white !important;
		}

		.print-page {
			margin: 0;
		}

		.slip-sheet {
			width: 210mm;
			box-shadow: none;
		}

		.check-in-slip {
			min-height: 57mm;
		}
	}

	@page {
		size: A4 portrait;
		margin: 6mm 0;
	}

	@media (max-width: 720px) {
		.screen-toolbar {
			align-items: stretch;
			flex-direction: column;
		}

		.print-button {
			justify-content: center;
		}

		.slip-sheet {
			grid-template-columns: 1fr;
		}
	}
</style>
