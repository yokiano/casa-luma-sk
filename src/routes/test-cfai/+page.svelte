<script lang="ts">
    import { COMPANIES, CATEGORIES, type Company } from './data';
    import CompanyCard from './components/CompanyCard.svelte';
    import CategoryFilter from './components/CategoryFilter.svelte';
    import CompanyModal from './components/CompanyModal.svelte';
    import MapPlaceholder from './components/MapPlaceholder.svelte';
    import { 
        Search, 
        Factory, 
        Wrench, 
        Users, 
        Truck, 
        ShieldCheck, 
        Leaf,
        ChevronLeft,
        ChevronRight,
        Bot,
        Lightbulb,
        BarChart3,
        Calendar,
        Monitor
    } from 'lucide-svelte';

    let activeCategory = $state('all');
    let searchQuery = $state('');
    let selectedCompany = $state<Company | null>(null);
    let servicesContainer: HTMLDivElement;

    const filteredCompanies = $derived(
        COMPANIES.filter(c => {
            const matchesCategory = activeCategory === 'all' || c.category === activeCategory;
            const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 c.description.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        })
    );

    function openModal(company: Company) {
        selectedCompany = company;
    }

    function closeModal() {
        selectedCompany = null;
    }

    function scrollServices(direction: 'left' | 'right') {
        if (!servicesContainer) return;
        const scrollAmount = 300;
        servicesContainer.scrollBy({
            left: direction === 'left' ? scrollAmount : -scrollAmount,
            behavior: 'smooth'
        });
    }

    const services = [
        { icon: Calendar, label: 'אחזקה חזויה ומתוכננת (TPM)' },
        { icon: BarChart3, label: 'הגברת הפריון' },
        { icon: Lightbulb, label: 'התייעלות אנרגטית' },
        { icon: Bot, label: 'ייצור מתקדם Industry 4.0' },
        { icon: Factory, label: 'הפניה למענקים ממשלתיים נוספים להטמעת תוכנית הייעול' },
        { icon: Monitor, label: 'התייעלות מערך שרשרת האספקה והמלאי בארגון' },
    ];
</script>

<svelte:head>
    <title>AI for Industry | One Stop Shop</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
    <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@200;300;400;500;600;700;800&display=swap" rel="stylesheet">
</svelte:head>

<div class="min-h-screen bg-white font-assistant" dir="rtl">
    <!-- Top Green Bar -->
    <div class="h-1.5 bg-[#00A890] w-full"></div>

    <!-- Header -->
    <header class="max-w-7xl mx-auto px-6 py-6">
        <nav class="flex items-center justify-between">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-[#00A890]/10 rounded-xl flex items-center justify-center">
                    <Factory class="w-6 h-6 text-[#00A890]" strokeWidth={1.5} />
                </div>
                <div class="text-right">
                    <h1 class="text-xl font-bold text-gray-900">המרכז לתעשייה</h1>
                    <p class="text-sm text-gray-500">מתקדמת</p>
                </div>
            </div>
            <div class="flex items-center gap-8 text-gray-700">
                <a href="#" class="hover:text-[#00A890] transition-colors">המגזין</a>
                <a href="#" class="hover:text-[#00A890] transition-colors">צרו קשר</a>
            </div>
        </nav>
    </header>

    <!-- Hero Section -->
    <section class="max-w-7xl mx-auto px-6 py-12 text-center">
        <h2 class="text-4xl md:text-5xl font-light text-[#00A890] mb-6">
            פתרונות AI לתעשייה
        </h2>
        <p class="text-lg text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
            גלה את החברות המובילות המביאות את המהפכה התעשייתית הבאה ישירות לרצפת הייצור שלך.
        </p>
        
        <!-- Search Bar -->
        <div class="max-w-xl mx-auto">
            <div class="relative">
                <input 
                    type="text" 
                    placeholder="חיפוש חברה או פתרון..." 
                    bind:value={searchQuery}
                    class="w-full border-2 border-[#00A890] rounded-xl py-4 pr-14 pl-6 focus:outline-none focus:ring-2 focus:ring-[#00A890]/20 transition-all text-lg"
                />
                <div class="absolute right-4 top-1/2 -translate-y-1/2 text-[#00A890]">
                    <Search class="w-6 h-6" strokeWidth={1.5} />
                </div>
            </div>
            <p class="text-sm text-gray-400 mt-2">
                מציג {filteredCompanies.length} חברות מתוך {COMPANIES.length}
            </p>
        </div>
    </section>

    <!-- Services Carousel -->
    <section class="py-12 bg-gray-50/50">
        <div class="max-w-7xl mx-auto px-6">
            <h3 class="text-2xl font-bold text-[#00A890] text-center mb-10">השירותים שלנו</h3>
            
            <div class="relative">
                <!-- Navigation Arrows -->
                <button 
                    onclick={() => scrollServices('right')}
                    class="absolute right-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-400 hover:text-[#00A890] transition-colors"
                >
                    <ChevronRight class="w-6 h-6" strokeWidth={1.5} />
                </button>
                
                <button 
                    onclick={() => scrollServices('left')}
                    class="absolute left-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-400 hover:text-[#00A890] transition-colors"
                >
                    <ChevronLeft class="w-6 h-6" strokeWidth={1.5} />
                </button>

                <!-- Services Container -->
                <div 
                    bind:this={servicesContainer}
                    class="flex gap-8 overflow-x-auto no-scrollbar px-12 py-4"
                >
                    {#each services as service, i}
                        <div class="flex flex-col items-center gap-4 min-w-[140px] group cursor-pointer">
                            <div class="w-24 h-24 rounded-full bg-white shadow-md flex items-center justify-center border border-gray-100 group-hover:shadow-lg group-hover:border-[#00A890]/30 transition-all relative overflow-hidden">
                                <!-- Subtle accent dot -->
                                <div class="absolute top-2 right-2 w-2 h-2 rounded-full {i % 2 === 0 ? 'bg-[#00A890]' : 'bg-[#ee9129]'} opacity-60"></div>
                                <service.icon class="w-10 h-10 text-gray-500 group-hover:text-[#00A890] transition-colors" strokeWidth={1} />
                            </div>
                            <p class="text-sm text-gray-600 text-center max-w-[140px] leading-relaxed group-hover:text-gray-900 transition-colors">{service.label}</p>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    </section>

    <!-- Decorative Line -->
    <div class="flex items-center justify-center py-8">
        <div class="w-4 h-4 rounded-full bg-[#ee9129]"></div>
        <div class="h-1 bg-[#ee9129] flex-1 max-w-3xl"></div>
    </div>

    <!-- Main Content: Companies + Map -->
    <main class="bg-gradient-to-b from-white via-[#00A890]/[0.02] to-white py-12">
        <div class="max-w-7xl mx-auto px-6">
            <div class="flex flex-col lg:flex-row gap-8">
                <!-- Companies Section -->
                <div class="flex-1">
                    <!-- Section Header -->
                    <div class="flex items-center gap-3 mb-6">
                        <div class="w-1 h-8 bg-[#ee9129] rounded-full"></div>
                        <h3 class="text-xl font-semibold text-gray-800">חברות וסטארטאפים</h3>
                    </div>

                    <!-- Category Filter -->
                    <div class="mb-8">
                        <CategoryFilter bind:activeCategory />
                    </div>

                    <!-- Companies Grid -->
                    {#if filteredCompanies.length > 0}
                        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                            {#each filteredCompanies as company (company.id)}
                                <CompanyCard {company} onclick={openModal} />
                            {/each}
                        </div>
                    {:else}
                        <div class="flex flex-col items-center justify-center py-24 text-gray-400 gap-4 bg-gray-50/50 rounded-2xl">
                            <Search class="w-16 h-16" strokeWidth={1} />
                            <p class="text-2xl font-bold">לא נמצאו תוצאות</p>
                            <button 
                                class="text-sm text-[#00A890] underline hover:text-[#00A890]/80 transition-colors" 
                                onclick={() => { searchQuery = ''; activeCategory = 'all'; }}
                            >
                                נקה את כל המסננים
                            </button>
                        </div>
                    {/if}
                </div>

                <!-- Map Section -->
                <div class="lg:w-96 shrink-0">
                    <MapPlaceholder />
                </div>
            </div>
        </div>
    </main>

    <!-- Footer -->
    <footer class="bg-gray-50 py-12 mt-12 relative overflow-hidden">
        <!-- Decorative accent -->
        <div class="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#00A890]/30 to-transparent"></div>
        
        <div class="max-w-7xl mx-auto px-6 relative">
            <div class="flex items-center justify-center gap-2 mb-4">
                <div class="w-2 h-2 rounded-full bg-[#00A890]"></div>
                <h4 class="text-xl font-bold text-gray-900">המרכז לתעשייה מתקדמת</h4>
                <div class="w-2 h-2 rounded-full bg-[#ee9129]"></div>
            </div>
            <p class="text-gray-500 text-center mb-8">מופעל ע"י מכון יעיל, BDO OPEX ומכללת סמי שמעון.</p>
            
            <div class="flex flex-wrap justify-center items-center gap-6">
                <div class="w-24 h-12 bg-white rounded-lg flex items-center justify-center text-gray-400 text-xs border border-gray-100 hover:border-[#00A890]/30 transition-colors">BDO</div>
                <div class="w-24 h-12 bg-white rounded-lg flex items-center justify-center text-gray-400 text-xs border border-gray-100 hover:border-[#00A890]/30 transition-colors">YAIL</div>
                <div class="w-24 h-12 bg-white rounded-lg flex items-center justify-center text-gray-400 text-xs border border-gray-100 hover:border-[#00A890]/30 transition-colors">SCE</div>
                <div class="w-24 h-12 bg-white rounded-lg flex items-center justify-center text-gray-400 text-xs border border-gray-100 hover:border-[#00A890]/30 transition-colors">משרד הכלכלה</div>
            </div>
        </div>
    </footer>

    <!-- Modal -->
    <CompanyModal company={selectedCompany} onclose={closeModal} />
</div>

<style>
    .font-assistant {
        font-family: 'Assistant', sans-serif;
    }

    .no-scrollbar::-webkit-scrollbar {
        display: none;
    }
    .no-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
    
    :global(body) {
        background-color: white;
    }
</style>
