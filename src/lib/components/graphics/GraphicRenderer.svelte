<script lang="ts">
	import { domToPng } from 'modern-screenshot';
	import { tick } from 'svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		filename?: string;
		scale?: number;
		quality?: number;
		onGenerating?: (isGenerating: boolean) => void;
	}

	let {
		children,
		filename = 'graphic.png',
		scale = 2,
		quality = 1,
		onGenerating
	}: Props = $props();

	let renderContainer: HTMLDivElement | undefined = $state();
	let previewImage: string | null = $state(null);
	let isGenerating = $state(false);
	let downloadUrl: string | null = $state(null);

	async function generateGraphic() {
		if (!renderContainer) return;

		try {
			isGenerating = true;
			onGenerating?.(true);

			// Wait for DOM to fully render
			await tick();

			// Wait for fonts and styles to load
			if (typeof document !== 'undefined' && 'fonts' in document) {
				try {
					await (document as any).fonts.ready;
				} catch (e) {
					// Fonts might not be available in all contexts
				}
			}
			
			// Wait a bit more for everything to settle
			await new Promise(resolve => setTimeout(resolve, 300));

			// Move into viewport for capture
			const originalStyle = renderContainer.style.cssText;
			renderContainer.style.position = 'absolute';
			renderContainer.style.left = '0';
			renderContainer.style.top = '0';
			renderContainer.style.width = '1080px';
			renderContainer.style.height = '1080px';
			
			// Create a temporary container to hold it
			const tempWrapper = document.createElement('div');
			tempWrapper.style.position = 'fixed';
			tempWrapper.style.top = '0';
			tempWrapper.style.left = '0';
			tempWrapper.style.width = '1080px';
			tempWrapper.style.height = '1080px';
			tempWrapper.style.zIndex = '-9999';
			tempWrapper.style.pointerEvents = 'none';
			
			document.body.appendChild(tempWrapper);
			const parent = renderContainer.parentElement;
			tempWrapper.appendChild(renderContainer);
			
			await tick();

			// Convert DOM to PNG with high quality
			const dataUrl = await domToPng(renderContainer, {
				cacheBust: true,
				pixelRatio: 2
			});

			// Restore original location
			if (parent) {
				parent.appendChild(renderContainer);
			}
			document.body.removeChild(tempWrapper);
			renderContainer.style.cssText = originalStyle;

			previewImage = dataUrl;
			downloadUrl = dataUrl;

			onGenerating?.(false);
		} catch (error) {
			console.error('[GraphicRenderer] Error:', error);
			onGenerating?.(false);
		} finally {
			isGenerating = false;
		}
	}

	function downloadGraphic() {
		if (!downloadUrl) return;

		const link = document.createElement('a');
		link.href = downloadUrl;
		link.download = filename;
		link.click();
	}

	// Auto-generate on mount and when props change
	$effect(() => {
		if (renderContainer) {
			generateGraphic();
		}
	});
</script>

<div class="flex flex-col gap-8">
	<!-- Hidden render container -->
	<div
		bind:this={renderContainer}
		style="
			position: fixed;
			left: -2000px;
			top: -2000px;
			width: 1080px;
			height: 1080px;
			box-sizing: border-box;
			font-family: system-ui, -apple-system, sans-serif;
		"
	>
		{@render children()}
	</div>

	<!-- Live Preview -->
	{#if previewImage}
		<div class="relative bg-white rounded-lg shadow-lg overflow-hidden">
			<img
				src={previewImage}
				alt="Graphic preview"
				class="w-full h-auto"
			/>
		</div>

		<!-- Download Button -->
		<button
			onclick={downloadGraphic}
			disabled={isGenerating}
			class="px-6 py-3 bg-[#dfbc69] hover:bg-[#e8c878] disabled:opacity-50 text-[#0f172a] font-medium rounded-lg transition-colors w-full"
		>
			{isGenerating ? 'Generating...' : 'Download Graphic (1080×1080px)'}
		</button>
	{:else if isGenerating}
		<div class="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center">
			<p class="text-gray-500">Generating graphic...</p>
		</div>
	{/if}
</div>
