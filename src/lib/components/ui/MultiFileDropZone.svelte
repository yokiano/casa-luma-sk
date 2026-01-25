<script lang="ts">
  interface DropItem {
    id: string;
    dataUrl: string;
    fileName: string;
    fileSize: number;
    fileType: string;
  }

  interface Props {
    value?: DropItem[];
    onFilesSelect: (items: DropItem[]) => void;
    accept?: string;
    maxSizeMB?: number;
    maxFiles?: number;
    class?: string;
  }

  let {
    value = [],
    onFilesSelect,
    accept = 'image/*',
    maxSizeMB = 5,
    maxFiles = 10,
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

    await processFiles(Array.from(files));
  }

  async function handleFileInputChange(event: Event) {
    error = null;
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (!files || files.length === 0) return;

    await processFiles(Array.from(files));
    if (fileInputRef) {
      fileInputRef.value = '';
    }
  }

  function handleClick() {
    fileInputRef?.click();
  }

  function handleRemove(id: string) {
    onFilesSelect(value.filter((item) => item.id !== id));
  }

  async function processFiles(files: File[]) {
    const currentCount = value.length;
    const availableSlots = Math.max(0, maxFiles - currentCount);

    if (availableSlots === 0) {
      error = `Maximum of ${maxFiles} images reached`;
      return;
    }

    const selected = files.slice(0, availableSlots);
    const rejected = files.slice(availableSlots);
    if (rejected.length > 0) {
      error = `Only ${availableSlots} more image${availableSlots === 1 ? '' : 's'} allowed`;
    }

    const validFiles = selected.filter((file) => validateFile(file));
    if (validFiles.length === 0) return;

    const newItems = await Promise.all(validFiles.map(readFileAsItem));
    onFilesSelect([...value, ...newItems]);
  }

  function validateFile(file: File) {
    if (!file.type.startsWith('image/')) {
      error = 'Only image files are allowed';
      return false;
    }

    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      error = `File size must be less than ${maxSizeMB}MB`;
      return false;
    }

    return true;
  }

  function readFileAsItem(file: File): Promise<DropItem> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          id: crypto.randomUUID(),
          dataUrl: e.target?.result as string,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type
        });
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    });
  }
</script>

<div class={className}>
  <input
    bind:this={fileInputRef}
    type="file"
    multiple
    {accept}
    onchange={handleFileInputChange}
    class="hidden"
  />

  <button
    type="button"
    onclick={handleClick}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
    class={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 px-4 py-8 text-sm transition ${
      isDragging
        ? 'border-[#7a6550] bg-[#f7f1ea]'
        : 'border-dashed border-[#d3c5b8] bg-white hover:border-[#7a6550] hover:bg-[#fdfbf9]'
    }`}
  >
    <svg class="h-8 w-8 text-[#5c4a3d]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
    <span class="text-sm text-[#5c4a3d]/70">
      {isDragging ? 'Drop images here' : 'Drop or click to upload'}
    </span>
    <span class="text-xs text-[#5c4a3d]/50">
      {value.length}/{maxFiles} images
    </span>
  </button>

  {#if value.length > 0}
    <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {#each value as item (item.id)}
        <div class="relative overflow-hidden rounded-2xl bg-[#f1e9df] shadow-inner">
          <img
            src={item.dataUrl}
            alt={item.fileName}
            class="h-32 w-full object-cover object-center"
            draggable="false"
          />
          <button
            type="button"
            onclick={() => handleRemove(item.id)}
            class="absolute right-2 top-2 rounded-full bg-[#5c4a3d]/80 p-1.5 text-white shadow-sm transition hover:bg-[#5c4a3d]"
            title="Remove image"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      {/each}
    </div>
  {/if}

  {#if error}
    <p class="mt-2 text-xs text-red-600">{error}</p>
  {/if}
</div>
