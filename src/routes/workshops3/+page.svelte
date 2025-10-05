<script lang="ts">
    import { getUpcomingEvents, getEventsByType, getEventsByDateRange } from "$lib/workshops.remote";
    import EventList3 from "$lib/components/workshops/EventList3.svelte";
    import EventFilters3 from "$lib/components/workshops/EventFilters3.svelte";
    import FloatingShapes3 from "$lib/components/workshops/FloatingShapes3.svelte";
    import SectionHero from "$lib/components/layout/SectionHero.svelte";
    import type { EventType } from "$lib/types/workshops";

    type TimeFilter = 'All' | 'Today' | 'Tomorrow' | 'This Week' | 'This Weekend' | 'Next Week' | 'This Month';

    let selectedType = $state<EventType | "All">("All");
    let selectedTimeFilter = $state<TimeFilter>("All");
    let events = $state(await getUpcomingEvents());

    function getDateRangeForFilter(filter: TimeFilter): { startDate: string; endDate: string } | null {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (filter) {
            case 'Today': {
                const start = new Date(today);
                const end = new Date(today);
                end.setDate(end.getDate() + 1);
                return { 
                    startDate: start.toISOString(), 
                    endDate: end.toISOString() 
                };
            }
            case 'Tomorrow': {
                const start = new Date(today);
                start.setDate(start.getDate() + 1);
                const end = new Date(start);
                end.setDate(end.getDate() + 1);
                return { 
                    startDate: start.toISOString(), 
                    endDate: end.toISOString() 
                };
            }
            case 'This Week': {
                const start = new Date(today);
                const dayOfWeek = start.getDay();
                const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday
                start.setDate(start.getDate() + diff);
                const end = new Date(start);
                end.setDate(end.getDate() + 7);
                return { 
                    startDate: start.toISOString(), 
                    endDate: end.toISOString() 
                };
            }
            case 'This Weekend': {
                const start = new Date(today);
                const dayOfWeek = start.getDay();
                const daysUntilSaturday = dayOfWeek === 0 ? 6 : 6 - dayOfWeek;
                start.setDate(start.getDate() + daysUntilSaturday);
                const end = new Date(start);
                end.setDate(end.getDate() + 2); // Saturday + Sunday
                return { 
                    startDate: start.toISOString(), 
                    endDate: end.toISOString() 
                };
            }
            case 'Next Week': {
                const start = new Date(today);
                const dayOfWeek = start.getDay();
                const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
                start.setDate(start.getDate() + daysUntilNextMonday);
                const end = new Date(start);
                end.setDate(end.getDate() + 7);
                return { 
                    startDate: start.toISOString(), 
                    endDate: end.toISOString() 
                };
            }
            case 'This Month': {
                const start = new Date(today.getFullYear(), today.getMonth(), 1);
                const end = new Date(today.getFullYear(), today.getMonth() + 1, 1);
                return { 
                    startDate: start.toISOString(), 
                    endDate: end.toISOString() 
                };
            }
            default:
                return null;
        }
    }

    async function refreshEvents() {
        const dateRange = getDateRangeForFilter(selectedTimeFilter);
        
        if (dateRange) {
            events = await getEventsByDateRange({
                startDate: dateRange.startDate,
                endDate: dateRange.endDate,
                eventType: selectedType
            });
        } else {
            // "All" time filter
            if (selectedType === "All") {
                events = await getUpcomingEvents();
            } else {
                events = await getEventsByType(selectedType);
            }
        }
    }

    async function handleTypeChange(type: EventType | "All") {
        selectedType = type;
        await refreshEvents();
    }

    async function handleTimeFilterChange(filter: TimeFilter) {
        selectedTimeFilter = filter;
        await refreshEvents();
    }
</script>

<svelte:head>
    <title>Workshops & Events - Casa Luma</title>
    <meta
        name="description"
        content="Discover upcoming yoga classes, workshops, retreats, and art sessions at Casa Luma. Join our community for transformative experiences."
    />
</svelte:head>

<SectionHero 
    titleBlack="Workshops"
    titleColor="&amp; Events"
    tagline="Nurture creativity, find balance, and connect with our island community through mindful experiences designed for the whole family."
    maxWidth="wide"
/>

<div class="min-h-screen bg-[#F9EDE8] relative overflow-hidden">
    <!-- Floating geometric shapes and gradients for ambient design -->
    <FloatingShapes3
        intensity={0.8}
        quantityScale={1.2}
        opacityScale={0.8}
        grainEnabled={true}
        grainIntensity={0.11}
        grainScale={44}
    />

    <div class="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <!-- Header Section - Bold Typography -->
        

        <!-- Filters - Reimagined -->
        <div class="mb-16">
            <EventFilters3 
                {selectedType} 
                {selectedTimeFilter}
                onTypeChange={handleTypeChange}
                onTimeFilterChange={handleTimeFilterChange}
            />
        </div>

        <!-- Event List - Bold New Design -->
        <EventList3
            {events}
            emptyMessage="No {selectedType === 'All'
                ? ''
                : selectedType.toLowerCase()} events scheduled at the moment"
        />
    </div>
</div>
