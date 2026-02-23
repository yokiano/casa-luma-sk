<script lang="ts">
  let { data } = $props();

  const formatDate = (value: string | Date | null) => {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
  };
</script>

<section class="space-y-6">
  <header class="space-y-2">
    <h2 class="text-2xl font-semibold text-[#2c2925]">Incidents (Reported Errors)</h2>
    <p class="text-sm text-[#7a6550]/80">Recent incidents persisted by the server error pipeline.</p>
  </header>

  {#if data.dbError}
    <div class="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      {data.dbError}
    </div>
  {/if}

  {#if data.incidents.length === 0}
    <div class="rounded-2xl border border-[#d3c5b8] bg-white p-6 text-sm text-[#7a6550]">No incidents yet.</div>
  {:else}
    <div class="overflow-hidden rounded-2xl border border-[#d3c5b8] bg-white shadow-sm">
      <table class="min-w-full divide-y divide-[#efe5db] text-sm">
        <thead class="bg-[#faf7f3] text-left text-xs uppercase tracking-wider text-[#7a6550]">
          <tr>
            <th class="px-4 py-3">When</th>
            <th class="px-4 py-3">Code</th>
            <th class="px-4 py-3">Severity</th>
            <th class="px-4 py-3">Source</th>
            <th class="px-4 py-3">Notified</th>
            <th class="px-4 py-3">Open</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[#f1e8de]">
          {#each data.incidents as incident}
            <tr>
              <td class="px-4 py-3 text-[#5c4a3d]">{formatDate(incident.createdAt)}</td>
              <td class="px-4 py-3 font-mono text-xs text-[#2c2925]">{incident.code}</td>
              <td class="px-4 py-3">
                <span class="rounded-full px-2 py-1 text-xs font-semibold"
                  class:bg-red-100={incident.severity === 'critical'}
                  class:text-red-800={incident.severity === 'critical'}
                  class:bg-amber-100={incident.severity === 'warning'}
                  class:text-amber-800={incident.severity === 'warning'}
                  class:bg-slate-100={incident.severity !== 'critical' && incident.severity !== 'warning'}
                  class:text-slate-700={incident.severity !== 'critical' && incident.severity !== 'warning'}
                >
                  {incident.severity}
                </span>
              </td>
              <td class="px-4 py-3 text-[#5c4a3d]">{incident.source}</td>
              <td class="px-4 py-3 text-[#5c4a3d]">{incident.notified ? 'yes' : 'no'}</td>
              <td class="px-4 py-3">
                <a class="text-[#7a6550] underline" href={`/tools/incidents/${incident.id}`}>view</a>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>
