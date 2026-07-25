<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import menuQr from '$lib/assets/menu/menu-qr.png';
	import { Check, Copy, Download, ExternalLink, Printer, Share2 } from 'lucide-svelte';

	const menuUrl = 'https://www.casalumakpg.com/menu';

	let {
		open = false,
		onClose = () => {}
	}: { open?: boolean; onClose?: () => void } = $props();

	let copied = $state(false);
	let copyError = $state(false);
	let canShare = $state(false);

	$effect(() => {
		if (typeof navigator !== 'undefined') canShare = typeof navigator.share === 'function';
	});

	async function copyLink() {
		copyError = false;
		copied = false;
		try {
			if (!navigator.clipboard) throw new Error('Clipboard API unavailable');
			await navigator.clipboard.writeText(menuUrl);
			copied = true;
			window.setTimeout(() => (copied = false), 2200);
		} catch (error) {
			copyError = true;
			console.error('Could not copy the menu link', error);
		}
	}

	async function shareMenu() {
		if (!navigator.share) return;

		try {
			await navigator.share({
				title: 'Casa Luma menu',
				text: 'Explore the Casa Luma cafe menu',
				url: menuUrl
			});
		} catch (error) {
			if (error instanceof DOMException && error.name === 'AbortError') return;
			console.error('Could not share the menu link', error);
		}
	}
</script>

<Dialog.Root {open} onOpenChange={(value) => !value && onClose()}>
	<Dialog.Content class="max-h-[90vh] max-w-xl overflow-y-auto rounded-[2rem] border-[#2D3A3A]/10 bg-[#F9F7F2] p-0 text-[#2D3A3A] shadow-2xl">
		<Dialog.Header class="p-6 pb-0 sm:p-8 sm:pb-0">
			<div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#E07A5F]">
				<Share2 size={14} />
				Share the menu
			</div>
			<Dialog.Title class="mt-2 font-heading text-3xl font-medium tracking-tight">Casa Luma menu</Dialog.Title>
			<Dialog.Description class="mt-2 text-sm leading-relaxed text-[#2D3A3A]/65">
				Scan the code or send this link to friends planning their visit.
			</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-6 p-6 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] sm:p-8">
			<div class="rounded-[1.5rem] border border-[#DFBC69]/45 bg-white p-4 shadow-sm sm:p-5">
				<img src={menuQr} alt="QR code for the Casa Luma menu" class="mx-auto aspect-square w-full max-w-[260px]" />
				<p class="mt-3 text-center text-xs font-medium uppercase tracking-[0.14em] text-[#2D3A3A]/55">
					Scan to view menu
				</p>
			</div>

			<div class="flex flex-col justify-center gap-4">
				<div>
					<p class="text-xs font-semibold uppercase tracking-[0.16em] text-[#2D3A3A]/50">Menu link</p>
					<p class="mt-2 break-all rounded-xl bg-white px-3 py-2.5 text-sm text-[#2D3A3A]/75 shadow-sm">
						{menuUrl}
					</p>
				</div>

				<div class="grid gap-2">
					<button
						type="button"
						class="inline-flex items-center justify-center gap-2 rounded-full bg-[#2D3A3A] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1f2929]"
						onclick={copyLink}
					>
						{#if copied}
							<Check size={16} />
							Link copied
						{:else}
							<Copy size={16} />
							Copy link
						{/if}
					</button>

					{#if canShare}
						<button
							type="button"
							class="inline-flex items-center justify-center gap-2 rounded-full border border-[#2D3A3A]/15 bg-white px-4 py-3 text-sm font-semibold text-[#2D3A3A] transition-colors hover:border-[#2D3A3A]/30 hover:bg-[#2D3A3A]/5"
							onclick={shareMenu}
						>
							<Share2 size={16} />
							Share from device
						</button>
					{/if}

					<a
						href={menuQr}
						download="casa-luma-menu-qr.png"
						class="inline-flex items-center justify-center gap-2 rounded-full border border-[#2D3A3A]/15 bg-white px-4 py-3 text-sm font-semibold text-[#2D3A3A] transition-colors hover:border-[#2D3A3A]/30 hover:bg-[#2D3A3A]/5"
					>
						<Download size={16} />
						Download QR code
					</a>

					<a
						href="/menu/print-qr"
						target="_blank"
						rel="noreferrer"
						class="inline-flex items-center justify-center gap-2 rounded-full border border-[#2D3A3A]/15 bg-white px-4 py-3 text-sm font-semibold text-[#2D3A3A] transition-colors hover:border-[#2D3A3A]/30 hover:bg-[#2D3A3A]/5"
					>
						<Printer size={16} />
						Open print view
						<ExternalLink size={13} class="opacity-50" />
					</a>
					{#if copyError}
						<p role="alert" class="text-xs leading-relaxed text-[#E07A5F]">
							Copying was blocked. Press and hold the link above to copy it manually.
						</p>
					{/if}
				</div>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
