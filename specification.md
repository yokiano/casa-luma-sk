# Casa Luma - Website Specification

## Business Overview

**Name:** Casa Luma  
**Location:** Koh Phangan, Thailand  
**Type:** Children's Play Café & Venue

### Description
Casa Luma is a Montessori-inspired play café for children located in the beautiful island of Koh Phangan, Thailand. We provide a safe, natural, and engaging environment where children can play, learn, and explore while parents relax and enjoy quality refreshments.

### Facilities
- **Playrooms:** Multiple rooms featuring toys and play equipment
  - Gross motor play elements
  - Soft play areas and toys
  - Montessori-inspired learning materials
- **Parent Lounge:** Dedicated space for parents to relax
  - Coffee and refreshments available
- **Garden Area:** Outdoor seating with café service
  - Tables for coffee and dining
  - Natural play elements

### Services
1. **Open Play** - Drop-in play sessions for children
2. **Café & Restaurant** - Coffee, snacks, and meals for families
3. **Shop** - Kids toys and accessories retail
4. **Workshops** - Educational and creative activities
5. **Events** - Community gatherings and special activities
6. **Birthday Parties** - Private party packages and celebrations

## Brand Identity

### Color Palette
- **Primary:** Golden Sand (#dfbc69) - Warmth and joy
- **Secondary:** Sage Green (#A8C3A0) - Nature and calm
- **Accent:** Terracotta Orange (#E07A5F) - Energy and playfulness
- **Background:** Cream Beige (#F9EDE8) - Natural and soft
- **Foreground:** Charcoal Grey (#333333) - Clarity and stability

### Design Philosophy
- Montessori-inspired minimalism
- Natural, warm, and inviting
- none-template looking. creative design.
- Clean and uncluttered
- Focus on imagery and simplicity
- Easy navigation for parents

### Geometric Design System
Casa Luma's visual identity is built around three fundamental shapes, each serving a specific purpose:

#### **Circles** - Unity & Welcome
- **Usage:** Logo presentation, hero decorative elements, profile images, badges
- **Symbolism:** Wholeness, community, protection, endless play
- **Implementation:** Border-radius full, circular containers, rounded badges

#### **Rectangles** - Structure & Stability  
- **Usage:** Service cards (full-width, zero-gap), content sections, image containers, buttons
- **Symbolism:** Foundation, organization, learning structure, Montessori order
- **Implementation:** Full-width hero sections, stacked service blocks, card layouts

#### **Triangles** - Growth & Direction
- **Usage:** Section dividers, decorative accents, directional elements, highlights
- **Symbolism:** Growth, progress, pointing toward discovery, mountain peaks (Montessori pedagogy)
- **Implementation:** CSS clip-path, SVG shapes, diagonal dividers between sections

#### Design Principles
1. **Balance:** Mix geometric shapes to create visual rhythm
2. **Hierarchy:** Rectangles for main content, circles for emphasis, triangles for flow
3. **Contrast:** Sharp rectangles paired with soft circles
4. **Movement:** Triangles guide the eye through the page
5. **Montessori Alignment:** Geometric shapes reflect hands-on learning materials

## Website Structure

### Home Page

#### Progress Tracker
- [x] Hero Section
- [x] About Section (Brief description)
- [x] Services Navigation Section (Image buttons)
- [x] Geometric Gallery Section
- [x] Layout Components (Header/Footer)

---

#### 1. Hero Section
**Status:** ✅ Complete

**Requirements:**
- Minimalistic design ✓
- Clean, simple layout ✓
- Brand colors incorporated ✓
- Welcome message ✓
- Clear call-to-action ✓

**Component:** `Hero.svelte`

**Implementation:**
- Clean centered layout with max-width constraint
- Two-button CTA (Book a Visit / Learn More)
- Responsive text sizing
- Uses brand colors (primary for emphasis)

---

#### 2. About Section
**Status:** ✅ Complete

**Requirements:**
- Single line or brief paragraph ✓
- Engaging copy about Casa Luma ✓
- Natural, warm tone ✓
- Easy to scan ✓

**Component:** `AboutBrief.svelte`

**Implementation:**
- Centered brief description
- Muted background for visual separation
- Responsive typography
- Highlights location in primary color

---

#### 3. Services Navigation Section
**Status:** ✅ Complete

**Requirements:**
- Full-width image buttons/cards ✓
- Six service categories ✓
  1. Open Play ✓
  2. Café & Restaurant ✓
  3. Shop ✓
  4. Workshops ✓
  5. Events ✓
  6. Birthday Parties ✓
- Each should be clickable and navigate to relevant page ✓
- Large, engaging imagery (placeholders ready) ✓
- Clear labels ✓

**Component:** `ServicesNav.svelte`

**Implementation:**
- 2-column grid on mobile, 3-column on desktop, ZERO gaps between cards
- Each service card takes 40-60vh height
- Hover effects with smooth transitions
- Gradient overlays for text readability  
- Image placeholders ready for actual photos
- Each card links to respective service page
- Clean rectangular blocks emphasize Montessori order and structure

---

#### 4. Geometric Gallery Section
**Status:** ✅ Complete

**Requirements:**
- Floating/overlapping geometric shapes
- Mix of circles, rectangles, and triangles
- Images clipped by shapes
- Playful, dynamic feel
- Responsive layout

**Component:** `GeometricGallery.svelte`

**Implementation:**
- 8 floating images in various geometric shapes
- Absolute positioning with controlled "random" placement
- Floating animations (translateY + slight rotation)
- Hover scale effects
- Shape clipping using utility classes from app.css
- Placeholder images from placehold.co (ready to replace)
- Responsive sizing (different dimensions for mobile/desktop)

---

#### 5. Layout Components
**Status:** ✅ Complete

**Requirements:**
- Header/Navigation ✓
- Footer ✓

**Components:** 
- `Header.svelte` ✓
- `Footer.svelte` ✓
- `+layout.svelte` (updated) ✓

**Implementation:**
- Sticky header with desktop/mobile navigation
- Mobile hamburger menu
- Footer with business info, contact, and social links
- Layout wraps all pages with Header/Footer
- Responsive design

---

## Technical Implementation

### Component Structure
```
src/lib/components/
├── home/
│   ├── Hero.svelte
│   ├── AboutBrief.svelte
│   └── ServicesNav.svelte
├── layout/
│   ├── Header.svelte
│   └── Footer.svelte
└── ui/ (shadcn-svelte components)
```

### Constants & Data
**File:** `src/lib/constants.ts`

**Contains:**
- Business information
- Service categories
- Navigation links
- Contact information
- Social media links

### Technology Stack
- **Framework:** SvelteKit (Svelte 5)
- **Styling:** TailwindCSS
- **UI Components:** shadcn-svelte
- **Package Manager:** pnpm

### Design Principles
- Modular component architecture
- Easy to separate and maintain
- Reusable constants and data
- Responsive design
- Accessibility considerations
- Performance optimized

---

## Future Pages (Placeholder)
- [ ] Open Play page
- [ ] Café & Restaurant page
- [ ] Shop page
- [ ] Workshops page
- [ ] Events page
- [ ] Birthday Parties page
- [ ] About Us page
- [ ] Contact page

---

## Notes
- All copy to be written with warm, inviting tone
- Images will need to be sourced/provided for each service
- Navigation should be intuitive for parents
- Mobile-first responsive design
- Consider Thai and English language support in future

---

_Last Updated: October 2, 2025_

