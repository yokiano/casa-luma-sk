<script lang="ts">
  import type { JobOpeningsResponseDTO } from '$lib/notion-sdk/dbs/job-openings';
  import GraphicRenderer from '$lib/components/graphics/GraphicRenderer.svelte';
  import AllJobOpeningsGraphic from '$lib/components/graphics/AllJobOpeningsGraphic.svelte';

  interface Props {
    openings: JobOpeningsResponseDTO[];
  }

  let { openings }: Props = $props();

  const mainHeading = 'เรากำลังมองหาทีมที่ใส่ใจครอบครัวบนเกาะพะงัน';
  const subHeading = 'ร่วมงานกับเราเพื่อสร้างพื้นที่แห่งความอบอุ่นและการดูแลเด็ก ๆ ในตำแหน่งต่อไปนี้';
  const filename = 'open-positions-koh-phangan.png';
</script>

<div class="flex flex-col gap-6 w-full">
  <GraphicRenderer {filename} scale={2} quality={1}>
    {#snippet children()}
      <AllJobOpeningsGraphic {openings} {mainHeading} {subHeading} />
    {/snippet}
  </GraphicRenderer>
</div>


