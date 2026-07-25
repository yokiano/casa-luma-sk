<script lang="ts">
	import menuQr from '$lib/assets/menu/menu-qr.png';

	function printPage() {
		window.print();
	}
</script>

<svelte:head>
	<title>Print Casa Luma Menu QR Code</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="min-h-screen bg-[#F9F7F2] px-6 py-12 text-[#2D3A3A]">
	<div class="mx-auto flex max-w-lg flex-col items-center text-center">
		<div class="no-print mb-8">
			<p class="text-xs font-semibold uppercase tracking-[0.18em] text-[#E07A5F]">Casa Luma</p>
			<h1 class="mt-2 font-heading text-3xl font-medium">Print the menu QR code</h1>
			<p class="mt-3 text-sm text-[#2D3A3A]/65">Place this code on tables, counters, or takeaway cards.</p>
		</div>

		<section class="qr-card w-full rounded-[2rem] border-2 border-[#DFBC69] bg-white p-8 shadow-xl sm:p-12">
			<img src={menuQr} alt="QR code for the Casa Luma menu" class="mx-auto w-full max-w-[360px]" />
			<div class="mt-6 border-t border-[#DFBC69]/40 pt-5">
				<h2 class="font-heading text-2xl font-medium">Scan for our menu</h2>
				<p class="mt-2 text-sm text-[#2D3A3A]/60">casalumakpg.com/menu</p>
			</div>
		</section>

		<div class="no-print mt-8 flex flex-wrap justify-center gap-3">
			<button
				type="button"
				class="rounded-full bg-[#2D3A3A] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1f2929]"
				onclick={printPage}
			>
				Print QR code
			</button>
			<a
				href="/menu"
				class="rounded-full border border-[#2D3A3A]/15 bg-white px-6 py-3 text-sm font-semibold text-[#2D3A3A] transition-colors hover:bg-[#2D3A3A]/5"
			>
				Back to menu
			</a>
		</div>
	</div>
</main>

<style>
	@media print {
		:global(body) {
			background: white !important;
		}

		:global(.no-print) {
			display: none !important;
		}

		.qr-card {
			border-width: 1px;
			box-shadow: none;
			break-inside: avoid;
		}
	}
</style>
