# Graphic Generator System

A reusable, component-based system for generating high-quality social graphics using HTML and Tailwind CSS.

## Architecture

### Components

#### `GraphicRenderer.svelte`
The core wrapper component that handles rendering any Svelte component as an image.

**Features:**
- Real-time live preview
- HTML-to-PNG conversion using `modern-screenshot`
- High DPI support (2x pixel ratio by default)
- One-click download
- Auto-generates on mount and when props change

**Props:**
- `children: Snippet` - The component to render as a graphic
- `filename?: string` - Download filename (default: `graphic.png`)
- `scale?: number` - DPI scale factor (default: `2`)
- `quality?: number` - Image quality 0-1 (default: `1`)
- `onGenerating?: (isGenerating: boolean) => void` - Callback for generation state

**Usage:**
```svelte
<GraphicRenderer filename="my-graphic.png">
  {#snippet children()}
    <MyGraphicTemplate data={someData} />
  {/snippet}
</GraphicRenderer>
```

#### `JobOpeningGraphic.svelte`
Beautiful job opening graphic template with:
- Bold hero section with asymmetric design
- Gradient background with decorative circles
- Skill pills with subtle rotation
- Brand colors integrated

**Props:**
- `opening: JobOpeningsResponseDTO` - Job opening data

#### `JobGraphicGenerator.svelte`
Main orchestrator component that combines everything for job graphics.

## How to Create New Graphic Templates

### 1. Create a new template component

```svelte
<script lang="ts">
  import type { MyDataType } from '$lib/types/my-data';

  interface Props {
    data: MyDataType;
  }

  let { data }: Props = $props();
</script>

<!-- Design your graphic using Tailwind CSS -->
<div class="w-full h-full bg-gradient-to-br from-[#fef3c7] to-white p-12 flex flex-col">
  <h1 class="text-6xl font-bold text-[#0f172a]">{data.title}</h1>
  <p class="text-2xl text-[#475569] mt-4">{data.description}</p>
</div>
```

### 2. Use in your component

```svelte
<script lang="ts">
  import GraphicRenderer from '$lib/components/graphics/GraphicRenderer.svelte';
  import MyGraphicTemplate from '$lib/components/graphics/MyGraphicTemplate.svelte';

  let data = { title: 'My Graphic', description: 'A test' };
</script>

<GraphicRenderer filename="my-graphic.png">
  {#snippet children()}
    <MyGraphicTemplate {data} />
  {/snippet}
</GraphicRenderer>
```

## Key Points

### Styling
- **Only use Tailwind CSS** - All classes are supported
- **Use inline hex colors** when needed: `bg-[#dfbc69]`
- **No scoped styles** unless absolutely necessary
- **Use Tailwind utilities** for spacing, sizing, typography, etc.

### Design Considerations
- **Fixed size**: Graphics render at 1080×1080px (1:1 square ratio)
- **Decorative elements**: Use absolute-positioned divs with opacity
- **Typography**: Use large, bold fonts for readability at 1080px
- **Colors**: Leverage brand colors:
  - Primary: `#dfbc69`
  - Secondary: `#A8C3A0`
  - Accent: `#E07A5F`
  - Dark text: `#0f172a`
  - Medium text: `#1e293b`
  - Light text: `#475569`

### Performance
- Live preview updates automatically
- High-quality 2x pixel ratio for sharp visuals
- Web Worker support available (see modern-screenshot docs)

## Browser Support

Works in all modern browsers that support:
- Canvas API
- SVG rendering
- CSS transforms

## Technical Stack

- **Rendering**: `modern-screenshot` (HTML-to-image conversion)
- **Styling**: Tailwind CSS
- **Framework**: Svelte 5
- **Output**: PNG with configurable quality

## Future Extensions

To add more graphic types:

1. Create a new template component in `src/lib/components/graphics/`
2. Use `GraphicRenderer` to wrap it
3. Customize template styling with Tailwind
4. Deploy alongside job graphics

Example use cases:
- Event announcement graphics
- Social media posts
- Blog post headers
- Certificate templates
- Marketing materials
