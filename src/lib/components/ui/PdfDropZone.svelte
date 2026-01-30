<script lang="ts">
  interface Props {
    value?: string | null;
    onFileSelect: (dataUrl: string | null, fileName: string | null) => void;
    accept?: string;
    maxSizeMB?: number;
    class?: string;
  }

  let {
    value = null,
    onFileSelect,
    accept = 'application/pdf',
    maxSizeMB = 10,
    class: className = ''
  }: Props = $props();

  let isDragging = $state(false);
  let error = $state<string | null>(null);
  let fileInputRef = $state<HTMLInputElement>();
  let selectedFileName = $state<string | null>(null);

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
  }

  async function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
    error = null;

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    await processFile(files[0]);
  }

  async function handleFileInputChange(event: Event) {
    error = null;
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (!files || files.length === 0) return;

    await processFile(files[0]);
  }

  async function processFile(file: File) {
    // Validate file type
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      error = 'Only PDF files are allowed';
      return;
    }

    // Validate file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      error = `File size must be less than ${maxSizeMB}MB`;
      return;
    }

    selectedFileName = file.name;

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      onFileSelect(dataUrl, file.name);
    };
    reader.onerror = () => {
      error = 'Failed to read file';
    };
    reader.readAsDataURL(file);
  }

  function handleClick() {
    fileInputRef?.click();
  }

  function handleClear(event: MouseEvent) {
    event.stopPropagation();
    onFileSelect(null, null);
    selectedFileName = null;
    if (fileInputRef) {
      fileInputRef.value = '';
    }
  }
</script>

<div class={className}>
  <input
    bind:this={fileInputRef}
    type="file"
    {accept}
    onchange={handleFileInputChange}
    class="hidden"
  />

  {#if value}
    <div class="relative mx-auto w-full p-4 border border-[#7a6550] rounded-2xl bg-[#f7f1ea] flex items-center gap-3">
      <div class="bg-[#7a6550] text-white p-2 rounded-lg">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </div>
      <div class="flex-grow min-w-0">
        <p class="text-xs font-semibold text-[#7a6550] truncate">{selectedFileName || 'PDF Selected'}</p>
        <p class="text-[10px] text-[#7a6550]/60 uppercase font-bold tracking-tighter">Ready to upload</p>
      </div>
      <button
        type="button"
        onclick={handleClear}
        class="rounded-full bg-[#5c4a3d]/10 p-1.5 text-[#5c4a3d] transition hover:bg-[#5c4a3d]/20"
        title="Remove file"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  {:else}
    <button
      type="button"
      onclick={handleClick}
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
      ondrop={handleDrop}
      class={`w-full flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 transition ${
        isDragging
          ? 'border-[#7a6550] bg-[#f7f1ea]'
          : 'border-dashed border-[#d3c5b8] bg-white/50 hover:border-[#7a6550] hover:bg-[#fdfbf9]'
      }`}
    >
      <div class="p-3 bg-[#7a6550]/5 rounded-full">
        <svg
          class="h-8 w-8 text-[#5c4a3d]/40"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      </div>
      <div class="text-center">
        <p class="text-sm font-semibold text-[#5c4a3d]/80">{isDragging ? 'Drop PDF here' : 'Click to upload PDF'}</p>
        <p class="text-[10px] text-[#5c4a3d]/40 uppercase font-bold tracking-widest mt-1">Payslip PDF from print dialog</p>
      </div>
    </button>
  {/if}

  {#if error}
    <p class="mt-2 text-xs text-red-600 font-medium text-center">{error}</p>
  {/if}
</div>
