<script lang="ts">
  import type { JobOpeningsResponseDTO } from '../../notion-sdk/dbs/job-openings/response.dto';

interface Props {
    openings: JobOpeningsResponseDTO[];
    mainHeading: string;
    subHeading: string;
  }

  let { openings, mainHeading, subHeading }: Props = $props();

  const positions = $derived.by(() => {
    return Array.from(
      new Set(
        openings
          .map((opening) => (opening.properties.jobTitle?.text || 'ไม่ระบุชื่อ').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, 'th'));
  });

  const totalPositions = $derived(positions.length);

  const pointOfContact = $derived.by(() => {
    for (const opening of openings) {
      const contact = ((opening.properties as any)?.pointOfContact?.text || '').trim();
      if (contact) {
        return contact;
      }
    }

    return '';
  });
</script>

<div
  style="
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at top, #fdf2d6 0%, #fff8eb 55%, #fbf6e7 100%);
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: 80px 96px;
    font-family: 'Sarabun', 'Prompt', system-ui, -apple-system, sans-serif;
    color: #1f2a44;
  "
>
  <div style="position: absolute; inset: 0; pointer-events: none;">
    <div
      style="
        position: absolute;
        width: 480px;
        height: 480px;
        border-radius: 50%;
        background: rgba(216, 182, 109, 0.22);
        top: -120px;
        right: -140px;
        filter: blur(0px);
      "
    ></div>
    <div
      style="
        position: absolute;
        width: 520px;
        height: 520px;
        border-radius: 50%;
        background: rgba(152, 188, 164, 0.25);
        bottom: -180px;
        left: -160px;
        filter: blur(0px);
      "
    ></div>
    <div
      style="
        position: absolute;
        width: 360px;
        height: 360px;
        border-radius: 50%;
        background: rgba(227, 143, 106, 0.18);
        top: 180px;
        left: 50%;
        transform: translateX(-50%);
      "
    ></div>
    <div
      style="
        position: absolute;
        inset: 60px;
        border-radius: 40px;
        border: 1px solid rgba(223, 188, 105, 0.25);
        background: rgba(255, 255, 255, 0.72);
        backdrop-filter: blur(18px);
      "
    ></div>
  </div>

  <div
    style="
      position: relative;
      z-index: 10;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
    "
  >
    <header style="text-align: center; max-width: 760px;">
      <h1
        style="
          font-size: 56px;
          line-height: 1.1;
          letter-spacing: 0.02em;
          font-weight: 800;
          color: #b5832e;
          margin-bottom: 24px;
        "
      >
        {mainHeading}
      </h1>
      <p
        style="
          font-size: 24px;
          line-height: 1.6;
          font-weight: 400;
          color: rgba(31, 42, 68, 0.78);
          margin: 0 auto 36px auto;
        "
      >
        {subHeading}
      </p>
      <div
        style="
          width: 160px;
          height: 6px;
          border-radius: 9999px;
          background: linear-gradient(90deg, #d9b36e, #98bca4, #e38f6a);
          margin: 0 auto;
        "
      ></div>
    </header>

    <main
      style="
        width: 100%;
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 32px;
        margin: 52px 0 48px 0;
      "
    >
      <div
        style="
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 18px;
          font-weight: 600;
          color: rgba(31, 42, 68, 0.6);
        "
      >
        Open Positions
      </div>

      <div
        style="
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 18px;
          padding: 28px 40px;
          border-radius: 36px;
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid rgba(31, 42, 68, 0.08);
          box-shadow: 0 18px 35px rgba(31, 42, 68, 0.08);
          max-width: 720px;
        "
      >
        {#each positions as title}
          <div
            style="
              font-size: 34px;
              line-height: 1.2;
              font-weight: 700;
              color: rgba(31, 42, 68, 0.92);
              text-align: center;
            "
          >
            {title}
          </div>
        {/each}
      </div>

      <div
        style="
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 16px;
          font-size: 18px;
          font-weight: 500;
          color: rgba(31, 42, 68, 0.75);
        "
      >
        <span
          style="
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 12px 20px;
            border-radius: 9999px;
            background: rgba(216, 182, 109, 0.18);
            border: 1px solid rgba(216, 182, 109, 0.36);
          "
        >
          • Good English
        </span>
        <span
          style="
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 12px 20px;
            border-radius: 9999px;
            background: rgba(152, 188, 164, 0.18);
            border: 1px solid rgba(152, 188, 164, 0.36);
          "
        >
          • Full Time / Part Time
        </span>
        <span
          style="
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 12px 20px;
            border-radius: 9999px;
            background: rgba(227, 143, 106, 0.14);
            border: 1px solid rgba(227, 143, 106, 0.32);
          "
        >
          • Accommodation Possible
        </span>
      </div>
    </main>

    <footer style="text-align: center;">
      <div
        style="
          font-size: 18px;
          font-weight: 500;
          letter-spacing: 0.06em;
          color: rgba(31, 42, 68, 0.65);
          margin-bottom: 12px;
        "
      >
        {totalPositions} ตำแหน่งเปิดรับสมัคร
      </div>
      <div
        style="
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 16px 28px;
          border-radius: 9999px;
          background: rgba(215, 180, 110, 0.16);
          border: 1px solid rgba(215, 180, 110, 0.4);
          font-size: 18px;
          font-weight: 600;
          color: #b5832e;
        "
      >
        {#if pointOfContact}
          ติดต่อ: {pointOfContact}
        {:else}
          ติดต่อ: 061-178-7000
        {/if}
      </div>
    </footer>
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }
</style>


