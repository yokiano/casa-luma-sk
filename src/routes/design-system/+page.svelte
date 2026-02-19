<script lang="ts">
    import { BrandCtrl } from '$lib/utils/brand-controller.svelte';

    const colors = BrandCtrl.getAllColors();
</script>

<div class="min-h-screen bg-background p-8 md:p-12 space-y-16 font-sans text-foreground">
    <section>
        <h1 class="text-4xl md:text-5xl font-heading font-bold mb-4 tracking-tight">Brand Guidelines</h1>
        <p class="text-xl text-muted-foreground max-w-2xl font-light">
            This design system reflects the Casa Luma brand identity: warm, natural, and inviting.
        </p>
    </section>

    <section>
        <h2 class="text-2xl font-heading font-semibold mb-8 border-b border-border pb-2">Color Palette</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
            {#each colors as color}
                <div class="space-y-3 group">
                    <div 
                        class="h-32 rounded-xl shadow-sm border border-border/10 flex items-center justify-center text-white font-medium transition-transform group-hover:scale-105"
                        style:background-color={color.value}
                    >
                        <span class="bg-black/20 px-3 py-1 rounded-full text-sm backdrop-blur-md shadow-sm">
                            {color.name}
                        </span>
                    </div>
                    <div class="flex justify-between items-center text-sm px-1">
                        <span class="font-medium font-heading">{color.value}</span>
                        <span class="text-muted-foreground opacity-50">Base</span>
                    </div>
                </div>
            {/each}
        </div>
    </section>

    <section>
        <h2 class="text-2xl font-heading font-semibold mb-8 border-b border-border pb-2">Typography</h2>
        <div class="grid md:grid-cols-2 gap-12">
            <div class="space-y-8">
                <div class="pl-6 border-l-4 border-primary">
                    <span class="text-xs text-muted-foreground uppercase tracking-widest font-sans mb-4 block">Headings - Poppins</span>
                    <div class="space-y-4">
                        <div>
                            <span class="text-xs text-muted-foreground mb-1 block">H1</span>
                            <h1 class="text-5xl font-heading font-bold">Display Heading</h1>
                        </div>
                        <div>
                            <span class="text-xs text-muted-foreground mb-1 block">H2</span>
                            <h2 class="text-4xl font-heading font-bold">Section Title</h2>
                        </div>
                        <div>
                            <span class="text-xs text-muted-foreground mb-1 block">H3</span>
                            <h3 class="text-3xl font-heading font-medium">Subsection Header</h3>
                        </div>
                    </div>
                </div>
            </div>
            <div class="space-y-8">
                <div class="pl-6 border-l-4 border-secondary">
                    <span class="text-xs text-muted-foreground uppercase tracking-widest font-sans mb-4 block">Body - Manrope</span>
                    <div class="space-y-6">
                        <div>
                            <span class="text-xs text-muted-foreground mb-1 block">Body Large</span>
                            <p class="text-lg leading-relaxed">
                                A modern play cafe with a touch of vintage. Specialty coffee, a bright playroom for kids, and creative workshops for families. Designed to be your go-to community home: warm, simple, inspiring.
                            </p>
                        </div>
                        <div>
                            <span class="text-xs text-muted-foreground mb-1 block">Body Base</span>
                            <p class="text-base text-muted-foreground leading-relaxed">
                                From smooth flat whites to kid-friendly cocoa. Our counter blends clean modern looks with a vintage hint. We believe in natural materials, open-ended play, and coffee that actually tastes good.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <section>
        <h2 class="text-2xl font-heading font-semibold mb-8 border-b border-border pb-2">UI Components</h2>
        <div class="grid md:grid-cols-3 gap-8">
            <!-- Buttons -->
            <div class="bg-card p-8 rounded-2xl shadow-sm border border-border space-y-6">
                <h3 class="text-lg font-heading font-medium mb-4">Buttons</h3>
                <div class="flex flex-col gap-4 items-start w-full">
                    <button class="w-full px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium shadow-sm hover:opacity-90 transition-all active:scale-95">
                        Book a Table
                    </button>
                    <button class="w-full px-6 py-3 bg-secondary text-secondary-foreground rounded-full font-medium shadow-sm hover:opacity-90 transition-all active:scale-95">
                        See Today's Workshops
                    </button>
                    <button class="w-full px-6 py-3 bg-foreground text-background rounded-full font-medium shadow-sm hover:opacity-90 transition-all active:scale-95">
                        Explore the Playroom
                    </button>
                    <button class="w-full px-6 py-3 border border-input bg-background hover:bg-accent/10 hover:border-accent hover:text-accent-foreground rounded-full font-medium transition-all active:scale-95">
                        Secondary Action
                    </button>
                </div>
            </div>

            <!-- Cards -->
            <div class="bg-card p-8 rounded-2xl shadow-sm border border-border space-y-6">
                <h3 class="text-lg font-heading font-medium mb-4">Cards & Tags</h3>
                <div class="bg-[#F9EDE8] border border-[#E07A5F]/10 p-6 rounded-xl space-y-4 shadow-sm">
                    <div class="flex gap-2 flex-wrap">
                        <span class="px-3 py-1 bg-[#A8C3A0] text-[#333333] text-xs font-bold rounded-full uppercase tracking-wider">
                            Workshop
                        </span>
                        <span class="px-3 py-1 bg-white text-[#333333] text-xs font-bold rounded-full uppercase tracking-wider border border-border/50">
                            Cafe
                        </span>
                    </div>
                    <div>
                        <h4 class="text-xl font-heading font-bold text-[#333333] mb-2">Sensory Play</h4>
                        <p class="text-sm text-[#333333]/70 leading-relaxed">
                            Join us for a morning of texture exploration and creative mess-making. Perfect for toddlers aged 18m+.
                        </p>
                    </div>
                    <div class="pt-2 flex items-center justify-between text-xs font-medium text-[#E07A5F] uppercase tracking-wider">
                        <span>Every Tuesday</span>
                        <span>→</span>
                    </div>
                </div>
            </div>

            <!-- Geometric Shapes -->
            <div class="bg-card p-8 rounded-2xl shadow-sm border border-border space-y-6 overflow-hidden relative">
                <h3 class="text-lg font-heading font-medium mb-4 z-10 relative">Shapes & Textures</h3>
                <div class="absolute right-[-20px] top-[-20px] w-40 h-40 bg-primary/10 rounded-full blur-3xl"></div>
                <div class="absolute left-[-20px] bottom-[-20px] w-48 h-48 bg-secondary/20 rounded-full blur-3xl"></div>
                
                <div class="grid grid-cols-2 gap-4 relative z-10">
                    <div class="aspect-square bg-[#E07A5F] rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-[#E07A5F]/20 transition-transform hover:scale-105 cursor-pointer">
                        Circle
                    </div>
                    <div class="aspect-square bg-[#A8C3A0] rounded-xl flex items-center justify-center text-[#333333] text-xs font-bold shadow-lg shadow-[#A8C3A0]/20 transition-transform hover:rotate-3 cursor-pointer">
                        Soft Square
                    </div>
                    <div class="aspect-square bg-[#dfbc69] rounded-none flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-[#dfbc69]/20 transition-transform hover:-translate-y-1 cursor-pointer">
                        Square
                    </div>
                    <div class="aspect-square border-2 border-[#333333] rounded-full flex items-center justify-center text-[#333333] text-xs font-bold hover:bg-[#333333] hover:text-white transition-colors cursor-pointer">
                        Outline
                    </div>
                </div>
            </div>
        </div>
    </section>
</div>