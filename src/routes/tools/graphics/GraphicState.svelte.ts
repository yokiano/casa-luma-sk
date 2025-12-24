import { REPLICATE_MODELS } from '$lib/constants';

const CASA_LUMA_PALETTE =
    'Strict color palette only (use exactly these hex colors, no others): #F9EDE8 (base), #dfbc69, #A8C3A0, #E07A5F, #333333. Prefer #F9EDE8 as the main background; use the others as subtle accents.';

export type TextLayout = 'center' | 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'custom';
export type FontFamily = 'Sarabun' | 'Prompt' | 'Playfair Display' | 'Courier Prime';

export interface TextOverlayState {
    content: string;
    fontFamily: FontFamily;
    fontSize: number;
    color: string;
    backgroundColor: string;
    backgroundOpacity: number;
    layout: TextLayout;
    x: number; // percentage 0-100
    y: number; // percentage 0-100
    maxWidth: number; // percentage 0-100
}

export interface GeneratedImage {
    id: string;
    url: string;
    prompt: string;
    seed?: number;
    model: string;
    createdAt: Date;
}

export class GraphicState {
    // Generation State
    prompt = $state('');
    negativePrompt = $state(
        [
            'text',
            'letters',
            'typography',
            'logo',
            'watermark',
            'frame',
            'border',
            'people',
            'face',
            'hands',
            'animals',
            'objects',
            'scene',
            'landscape',
            'photorealistic',
            'high contrast',
            'busy composition'
        ].join(', ')
    );
    selectedModel = $state<string>(REPLICATE_MODELS.IMAGEN_4_FAST);
    aspectRatio = $state('1:1');
    isGenerating = $state(false);
    isSeedPinned = $state(false);
    seed = $state<number | null>(null);
    
    // Image State
    currentImage = $state<GeneratedImage | null>(null);
    history = $state<GeneratedImage[]>([]);

    // Text Overlay State
    textOverlay = $state<TextOverlayState>({
        content: 'Casa Luma',
        fontFamily: 'Sarabun',
        fontSize: 48,
        color: '#333333',
        backgroundColor: '#ffffff',
        backgroundOpacity: 0,
        layout: 'center',
        x: 50,
        y: 50,
        maxWidth: 80
    });

    // Prompt Templates
    readonly templates = [
        {
            label: 'Linen Weave (Warm Neutral)',
            prompt: `Subtle background pattern only (NOT a scene). ${CASA_LUMA_PALETTE} Seamless repeating textile swatch: soft linen weave + faint slubs, riso/screenprint texture, gentle paper grain, slightly vintage 70s but modern-chic, very low contrast, lots of negative space, no focal point, no objects, no people, no text.`
        },
        {
            label: 'Micro Florals (Ditsy)',
            prompt: `Subtle background pattern only (NOT a scene). ${CASA_LUMA_PALETTE} Seamless repeating micro-ditsy florals + dots, hand-drawn + imperfect, blockprint / risograph look with slight ink misregistration, airy spacing, very low contrast, elegant 70s alternative vibe, no objects, no text, no central motif.`
        },
        {
            label: 'Retro Waves (Soft Stripes)',
            prompt: `Subtle background pattern only (NOT a scene). ${CASA_LUMA_PALETTE} Seamless repeating gentle wavy ribbons/stripes, mid-century 70s alternative poster feel, flat ink + subtle halftone, slight edge wobble, minimal contrast, calm spacing, no objects, no text, no focal point.`
        },
        {
            label: 'Terrazzo Dust (Gouache)',
            prompt: `Subtle background pattern only (NOT a scene). ${CASA_LUMA_PALETTE} Seamless terrazzo-dust speckles: tiny irregular gouache flecks + paper fibers, sparse distribution, matte texture, very low contrast, sophisticated and quiet, lots of breathing room, tileable, no text.`
        },
        {
            label: 'Sunburst (Very Subtle)',
            prompt: `Subtle background pattern only (NOT a scene). ${CASA_LUMA_PALETTE} Minimal sunburst/radiating lines, extremely subtle tone-on-tone, screenprint grain + slight ink fade, refined 70s editorial vibe, low contrast, no icons, no objects, no text.`
        },
        {
            label: 'Cane / Rattan Grid',
            prompt: `Subtle background pattern only (NOT a scene). ${CASA_LUMA_PALETTE} Seamless repeating cane webbing / rattan grid, minimal and chic, very gentle shadowing, matte paper texture, low contrast, 70s interior-modern vibe, no objects, no text, no central motif.`
        },
        {
            label: 'Blockprint Petals',
            prompt: `Subtle background pattern only (NOT a scene). ${CASA_LUMA_PALETTE} Hand-stamped blockprint petal shapes, imperfect edges + ink bleed, sparse repeat, alternative artisan vibe, very low contrast, textile print, seamless repeat, no text.`
        },
        {
            label: 'Marbled Paper (Soft)',
            prompt: `Subtle background pattern only (NOT a scene). ${CASA_LUMA_PALETTE} Gentle marbled paper, extremely subtle swirls, mono-print look, matte paper grain + fibers, low contrast, elegant vintage stationery vibe, seamless/tileable, no objects, no text.`
        },
        {
            label: 'Geometric Mid‑Century',
            prompt: `Subtle background pattern only (NOT a scene). ${CASA_LUMA_PALETTE} Minimal mid-century geometry (rounded rectangles, arcs, dots), sparse composition, cut-paper + screenprint texture, slight misregistration, low contrast, lots of negative space, seamless repeat, no text.`
        },
        {
            label: 'Risograph Halftone Mist',
            prompt: `Subtle background pattern only (NOT a scene). ${CASA_LUMA_PALETTE} Abstract halftone mist / grain cloud, riso print texture, soft layered dots, barely-there contrast, calm open space, seamless/tileable, no objects, no text, no focal point.`
        },
        {
            label: 'Tape Collage (Minimal)',
            prompt: `Subtle background pattern only (NOT a scene). ${CASA_LUMA_PALETTE} Minimal tape-collage fragments and soft paper edges, tiny shapes, matte paper textures, imperfect alignment, very low contrast, sophisticated alternative 70s vibe, seamless repeat, no objects, no text.`
        },
        {
            label: 'Ink Stipple Field',
            prompt: `Subtle background pattern only (NOT a scene). ${CASA_LUMA_PALETTE} Fine ink stipple field (micro dots), slightly irregular density, screenprint grain, very low contrast, quiet and chic, seamless repeat, no objects, no text.`
        }
    ];

    constructor() {
        // Initialize with a default template if needed
        this.prompt = this.templates[0].prompt;
    }

    setPrompt(prompt: string) {
        this.prompt = prompt;
    }

    setGeneratedImage(image: GeneratedImage) {
        this.currentImage = image;
        this.history = [image, ...this.history];
    }

    updateTextOverlay(updates: Partial<TextOverlayState>) {
        this.textOverlay = { ...this.textOverlay, ...updates };
        
        // Auto-update position based on layout if layout changed
        if (updates.layout) {
            this.applyLayout(updates.layout);
        }
    }

    applyLayout(layout: TextLayout) {
        switch (layout) {
            case 'center':
                this.textOverlay.x = 50;
                this.textOverlay.y = 50;
                break;
            case 'bottom-left':
                this.textOverlay.x = 10;
                this.textOverlay.y = 90;
                break;
            case 'bottom-right':
                this.textOverlay.x = 90;
                this.textOverlay.y = 90;
                break;
            case 'top-left':
                this.textOverlay.x = 10;
                this.textOverlay.y = 10;
                break;
            case 'top-right':
                this.textOverlay.x = 90;
                this.textOverlay.y = 10;
                break;
        }
    }
}

