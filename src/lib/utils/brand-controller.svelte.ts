export interface BrandColor {
    name: string;
    value: string;
}

export type ColorWeight = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

interface ColorVariantOptions {
    weight?: ColorWeight;
    alpha?: number;
}

export class BrandController {
    private static instance: BrandController;
    
    private readonly brandColors: BrandColor[] = [
        { name: 'Cream', value: '#F9EDE8' },
        { name: 'Yellow', value: '#dfbc69' },
        { name: 'Sage', value: '#A8C3A0' },
        { name: 'Terra Cotta', value: '#E07A5F' },
        { name: 'Charcoal', value: '#333333' }
    ];

    private constructor() {
        // Private constructor to enforce singleton
    }

    public static getInstance(): BrandController {
        if (!BrandController.instance) {
            BrandController.instance = new BrandController();
        }
        return BrandController.instance;
    }

    private getColorVariant(color: string, weight: ColorWeight = 500, alpha: number = 1): string {
        // 500 is considered the base color
        if (weight === 500) {
            if (alpha === 1) {
                return color;
            }
            // Convert hex color to rgba or use color-mix with alpha
            return `color-mix(in srgb, ${color}, transparent ${(1 - alpha) * 100}%)`;
        }

        // Calculate how much to mix with white or black based on the weight
        let mixedColor: string;
        if (weight < 500) {
            // Lighter variants (mix with white)
            const whiteAmount = ((500 - weight) / 500) * 100;
            mixedColor = `color-mix(in srgb, ${color}, white ${whiteAmount}%)`;
        } else {
            // Darker variants (mix with black)
            const blackAmount = ((weight - 500) / 400) * 100;
            mixedColor = `color-mix(in srgb, ${color}, black ${blackAmount}%)`;
        }
        
        if (alpha === 1) {
            return mixedColor;
        }
        
        // Apply alpha by mixing with transparent
        return `color-mix(in srgb, ${mixedColor}, transparent ${(1 - alpha) * 100}%)`;
    }

    private transformBrandColor(color: BrandColor, options?: ColorVariantOptions): BrandColor {
        // If no options provided, return original color
        if (!options) {
            return color;
        }

        // Default weight to 500 if not specified
        const weight = options.weight || 500;
        const alpha = options.alpha || 1;

        // If weight is 500 and alpha is 1, return original color
        if (weight === 500 && alpha === 1) {
            return color;
        }

        // Generate variant name based on options
        let variantName = color.name;
        if (weight !== 500) {
            variantName += `-${weight}`;
        }
        if (alpha !== 1) {
            variantName += `-alpha${alpha}`;
        }

        return {
            name: variantName,
            value: this.getColorVariant(color.value, weight, alpha)
        };
    }

    /**
     * Returns a deterministic color based on the string input by creating a hash
     * @param str Any string to be used for color determination
     * @param options Optional color weight options (50-900, default 500)
     * @returns A brand color from the available colors
     */
    public getColorByHash(str: string, options?: ColorVariantOptions): BrandColor {
        if (this.brandColors.length === 0) {
            throw new Error('No brand colors defined');
        }
        
        // Simple hash function
        let hash = 0;
        if (str.length === 0) return this.transformBrandColor(this.brandColors[0], options);
        
        // Generate a simple hash based on the string
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        
        // Use absolute value to ensure positive index
        const index = Math.abs(hash) % this.brandColors.length;
        return this.transformBrandColor(this.brandColors[index], options);
    }

    public getColorByIndex(index: number, options?: ColorVariantOptions): BrandColor {
        if (this.brandColors.length === 0) {
            throw new Error('No brand colors defined');
        }
        // Use modulo to cycle through colors
        const normalizedIndex = index % this.brandColors.length;
        return this.transformBrandColor(this.brandColors[normalizedIndex], options);
    }

    public getAllColors(options?: ColorVariantOptions): BrandColor[] {
        return this.brandColors.map(color => this.transformBrandColor(color, options));
    }
}

export const BrandCtrl = BrandController.getInstance();
