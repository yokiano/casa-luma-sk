<script lang="ts">
    import { MapPin } from 'lucide-svelte';
</script>

<div>
    <div class="bg-gray-50 rounded-2xl p-6 border border-gray-100">
        <h4 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin class="w-5 h-5 text-[#00A890]" strokeWidth={1.5} />
            מפת החברות
        </h4>
        
        <!-- Map Placeholder -->
        <div class="aspect-square w-full border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 gap-3 bg-white">
            <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                <MapPin class="w-8 h-8 text-gray-300" strokeWidth={1} />
            </div>
            <p class="text-sm">מפה אינטראקטיבית</p>
            <p class="text-xs text-gray-300">בקרוב</p>
        </div>
        
        <!-- Legend placeholder -->
        <div class="mt-6 space-y-3">
            <div class="flex items-center gap-3">
                <div class="w-3 h-3 rounded-full bg-[#00A890]"></div>
                <span class="text-sm text-gray-600">חברות פעילות</span>
            </div>
            <div class="flex items-center gap-3">
                <div class="w-3 h-3 rounded-full bg-[#ee9129]"></div>
                <span class="text-sm text-gray-600">מרכזי ייצור</span>
            </div>
        </div>
    </div>
</div>
