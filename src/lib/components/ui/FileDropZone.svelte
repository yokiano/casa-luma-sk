<script lang="ts">
  interface Props {
    value?: string | null;
    onFileSelect: (dataUrl: string | null) => void;
    accept?: string;
    maxSizeMB?: number;
    class?: string;
  }

  let {
    value = null,
    onFileSelect,
    accept = 'image/*',
    maxSizeMB = 5,
    class: className = ''
  }: Props = $props();

  let isDragging = $state(false);
  let error = $state<string | null>(null);
  let fileInputRef = $state<HTMLInputElement>();

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
    if (!file.type.startsWith('image/')) {
      error = 'Only image files are allowed';
      return;
    }

    // Validate file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      error = `File size must be less than ${maxSizeMB}MB`;
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      onFileSelect(dataUrl);
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
    onFileSelect(null);
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
    <div class="relative mx-auto aspect-[4/5] w-full max-w-[180px] overflow-hidden rounded-2xl bg-[#f1e9df] shadow-inner">
      <img
        src={value}
        alt="Preview"
        class="h-full w-full object-cover object-center"
        draggable="false"
      />
      <button
        type="button"
        onclick={handleClear}
        class="absolute right-2 top-2 rounded-full bg-[#5c4a3d]/80 p-1.5 text-white shadow-sm transition hover:bg-[#5c4a3d]"
        title="Remove image"
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
      class={`mx-auto flex aspect-[4/5] w-full max-w-[180px] flex-col items-center justify-center gap-2 rounded-2xl border-2 transition ${
        isDragging
          ? 'border-[#7a6550] bg-[#f7f1ea]'
          : 'border-dashed border-[#d3c5b8] bg-white hover:border-[#7a6550] hover:bg-[#fdfbf9]'
      }`}
    >
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
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
      <span class="text-xs text-[#5c4a3d]/60">
        {isDragging ? 'Drop image' : 'Drop or click'}
      </span>
    </button>
  {/if}

  {#if error}
    <p class="mt-2 text-xs text-red-600">{error}</p>
  {/if}
</div>

