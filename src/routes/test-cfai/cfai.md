# CFAI - Company/Startup Directory Page Prompt

A specification for creating a Hebrew RTL directory page showcasing companies/startups in a specific industry domain.

## Core Concept

Create a **self-contained directory page** displaying companies/solutions organized by categories, with:
- Filterable grid of company cards
- Search functionality
- Modal for detailed company view
- Map placeholder (for future interactive map)
- Sticky toolbar when scrolling

## Design Language

### Colors
- Primary (teal): `#00A890`
- Accent (orange): `#ee9129`
- Background: White with subtle gradient `from-white via-[#00A890]/[0.02] to-white`

### Typography
- Font: **Assistant** (Google Fonts)
- Hebrew RTL layout (`dir="rtl"`)

### Visual Elements
- Thin accent lines/ribbons (1px or 1.5px height)
- Rounded corners (2xl = 1rem for cards)
- Small decorative dots in primary/accent colors
- Minimal shadows (`shadow-sm`, `shadow-lg` on hover)
- Clean separators using dots + lines

## File Structure

All files contained within the route folder (zero code leakage):

```
/routes/[route-name]/
├── +page.svelte          # Main page component
├── data.ts               # Types, categories, mock data
├── components/
│   ├── CompanyCard.svelte
│   ├── CategoryFilter.svelte
│   ├── CompanyModal.svelte
│   └── MapPlaceholder.svelte
└── cfai.md               # This spec
```

## Data Structure

### Company Interface
```typescript
interface Company {
    id: string;
    name: string;
    description: string;        // Short tagline
    longDescription: string;    // Full description for modal
    category: string;           // Category ID
    logo?: string;              // Logo URL (optional)
    website?: string;           // Company website (optional)
    tags: string[];             // Technology/feature tags
}
```

### Categories
Array of `{ id: string, label: string }` with first item being `{ id: 'all', label: 'הכל' }` for "show all".

## Component Specifications

### Main Page (`+page.svelte`)

**State:**
- `activeCategory` - Selected filter category
- `searchQuery` - Search input value
- `selectedCompany` - Company for modal (null when closed)

**Derived:**
- `filteredCompanies` - Companies filtered by category AND search query

**Layout Structure:**
1. Optional header/hero (commented out for embedding)
2. Main content: flex container with companies (flex-1) + map sidebar (fixed width)
3. Sticky toolbar with search + category filter
4. Optional footer (commented out for embedding)

**Iframe Embedding Support:**
- Detect if embedded (`window.self !== window.top`)
- ResizeObserver to communicate height to parent
- Listen for parent scroll events to adjust sticky positioning

### CompanyCard

- Clickable card opening modal
- Top accent ribbon (1px green bar)
- Logo area with placeholder icon if no logo
- Title, description (2 line clamp)
- Tags displayed as small pills
- Hover effect: arrow circle changes to orange

### CategoryFilter

- Horizontally scrollable pills
- Active state: filled green background
- Inactive: white with border
- Scroll arrows for overflow navigation
- Hidden scrollbar CSS

### CompanyModal

- Backdrop with blur effect
- Scale + fade transitions
- Close button (X) top-left (RTL)
- Company logo, name, tags
- Decorative separator line with orange dot
- Long description section
- Optional website link button

### MapPlaceholder

- Placeholder for future interactive map
- Dashed border placeholder area
- Legend showing dot colors meaning

## Key Implementation Details

### Svelte 5 Patterns
- Use `$state()` for reactive state
- Use `$derived()` for computed values
- Use `$effect()` only for side effects (iframe communication)
- Use `$props()` for component props
- Use `$bindable()` for two-way binding

### Tailwind Classes
- Use utility-first approach
- Common patterns:
  - Cards: `bg-white rounded-2xl shadow-sm hover:shadow-lg border border-gray-100`
  - Accent bar: `h-1 bg-[#00A890] w-full`
  - Tags: `text-[10px] px-2.5 py-1 bg-[#00A890]/5 rounded text-[#00A890]/70`
  - Buttons: `px-4 py-1.5 rounded-full text-sm font-medium`

### Icons
Use **lucide-svelte** with thin stroke:
- `strokeWidth={1}` for decorative/large icons
- `strokeWidth={1.5}` for interactive elements
- Common icons: Search, Factory, MapPin, ExternalLink, X, ChevronLeft, ChevronRight, QrCode

### RTL Considerations
- Scroll direction is reversed
- Text alignment natural with `text-right`
- Close buttons on left side
- Chevron meanings inverted

## Mock Data Guidelines

Generate 8-12 companies across 5-7 categories relevant to the domain. Each company should have:
- Realistic Hebrew name (or English if fitting the domain)
- Short value proposition (1 sentence)
- Longer explanation (2-3 sentences)
- 2-3 relevant tags (in English/industry terms)

Categories should cover logical divisions of the industry domain (e.g., for factories: production, maintenance, HR, logistics, quality, safety).

## Customization Points

To adapt for different domains:
1. Update `CATEGORIES` in `data.ts`
2. Replace mock companies with domain-relevant ones
3. Adjust section headers and labels
4. Optionally update accent colors
5. Add/enable header/hero/footer sections as needed
