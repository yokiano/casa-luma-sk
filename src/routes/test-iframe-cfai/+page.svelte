<!-- THE WORDPRESS HTML BLOCK STARTS HERE -->
<!-- THE WORDPRESS HTML BLOCK STARTS HERE -->
<!-- THE WORDPRESS HTML BLOCK STARTS HERE -->
<!-- THE WORDPRESS HTML BLOCK STARTS HERE -->
<!--<div class="casa-luma-embed" dir="rtl">
    <style>
        /* Container styling */
        .iframe-wrapper {
            position: relative;
            width: 100%;
            min-height: 400px;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 4px 24px rgba(0,0,0,0.08);
            border: 1px solid rgba(0,0,0,0.06);
            background: white;
            transition: height 0.2s ease;
        }
        
        .iframe-content {
            width: 100%;
            height: 100%;
            border: none;
            display: block;
            opacity: 1;
            transition: opacity 0.3s ease;
        }

        .iframe-content.loading {
            opacity: 0;
        }

        /* Loader/Spinner Styles */
        .iframe-loader {
            position: absolute;
            inset: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: white;
            z-index: 10;
            gap: 1rem;
            color: #64748b;
            font-family: 'Assistant', sans-serif;
        }

        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #00A890; /* Casa Luma Green */
            border-radius: 50%;
            animation: casaLumaSpin 1s linear infinite;
        }

        @keyframes casaLumaSpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>

    <div id="cl-iframe-wrapper" class="iframe-wrapper">
        <div id="cl-iframe-loader" class="iframe-loader">
            <div class="spinner"></div>
            <p>טוען את המדריך...</p>
        </div>
        
        <!~~ IMPORTANT: Change the src to your actual hosted URL ~~>
        <iframe
            id="cl-embedded-iframe"
            src="https://your-domain.com/test-cfai"
            title="CFAI Directory"
            class="iframe-content loading"
            scrolling="no"
        ></iframe>
    </div>

    <script>
        (function() {
            const wrapper = document.getElementById('cl-iframe-wrapper');
            const iframe = document.getElementById('cl-embedded-iframe');
            const loader = document.getElementById('cl-iframe-loader');

            // 1. Handle Iframe Loading
            iframe.onload = function() {
                loader.style.display = 'none';
                iframe.classList.remove('loading');
            };

            // 2. Listen for Height Updates (from Iframe)
            window.addEventListener('message', function(event) {
                // Security: Optional - check event.origin here
                if (event.data?.type === 'iframe-height' && typeof event.data.height === 'number') {
                    wrapper.style.height = event.data.height + 'px';
                }
            });

            // 3. Send Scroll Info (to Iframe)
            // This allows the sticky search bar inside the iframe to work correctly
            function sendScrollData() {
                if (!iframe || !iframe.contentWindow) return;
                
                const rect = iframe.getBoundingClientRect();
                iframe.contentWindow.postMessage({
                    type: 'parent-scroll',
                    iframeTop: rect.top,
                    viewportHeight: window.innerHeight
                }, '*');
            }

            window.addEventListener('scroll', sendScrollData, { passive: true });
            window.addEventListener('resize', sendScrollData);
            
            // Initial sync
            setTimeout(sendScrollData, 500);
        })();
    </script>
</div>-->
<!-- END OF THE WORDPRESS HTML BLOCK -->


<script lang="ts">



    
    let iframeWrapper: HTMLDivElement;
    let iframeElement: HTMLIFrameElement;
    let isLoading = $state(true);

    function handleIframeLoad() {
        isLoading = false;
    }

    // Listen for height updates from iframe and send scroll updates to iframe
    $effect(() => {
        if (typeof window === 'undefined') return;

        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'iframe-height' && typeof event.data.height === 'number') {
                if (iframeWrapper) {
                    iframeWrapper.style.height = `${event.data.height}px`;
                }
            }
        };

        const sendScrollToIframe = () => {
            if (!iframeElement) return;
            const rect = iframeElement.getBoundingClientRect();
            iframeElement.contentWindow?.postMessage({
                type: 'parent-scroll',
                iframeTop: rect.top,
                viewportHeight: window.innerHeight
            }, '*');
        };

        window.addEventListener('message', handleMessage);
        window.addEventListener('scroll', sendScrollToIframe, { passive: true });
        window.addEventListener('resize', sendScrollToIframe);
        
        // Initial send
        setTimeout(sendScrollToIframe, 100);

        return () => {
            window.removeEventListener('message', handleMessage);
            window.removeEventListener('scroll', sendScrollToIframe);
            window.removeEventListener('resize', sendScrollToIframe);
        };
    });
</script>

<svelte:head>
    <title>CFAI Directory - Embedded</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
    <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@200;300;400;500;600;700;800&display=swap" rel="stylesheet">
</svelte:head>

<div class="min-h-screen bg-gray-50" dir="rtl">
    <!-- WordPress-like Header -->
    <header class="bg-white shadow-sm border-b border-gray-200 ">
        <div class="max-w-6xl mx-auto px-6 py-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                        <span class="text-white font-bold">W</span>
                    </div>
                    <span class="font-bold text-gray-900">האתר שלי</span>
                </div>
                <nav class="hidden md:flex items-center gap-6 text-sm">
                    <a href="#" class="text-gray-600 hover:text-blue-600 transition-colors">דף הבית</a>
                    <a href="#" class="text-gray-600 hover:text-blue-600 transition-colors">אודות</a>
                    <a href="#" class="text-blue-600 font-medium">מדריך החברות</a>
                    <a href="#" class="text-gray-600 hover:text-blue-600 transition-colors">צור קשר</a>
                </nav>
                <button class="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    התחבר
                </button>
            </div>
        </div>
    </header>

    <!-- Page Content Before Iframe -->
    <section class="max-w-6xl mx-auto px-6 py-10">
        <div class="text-center mb-10">
            <span class="inline-block bg-blue-100 text-blue-800 text-sm font-medium px-4 py-1.5 rounded-full mb-4">
                מדריך החברות המלא
            </span>
            <h1 class="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                מצאו את הפתרון המושלם לתעשייה שלכם
            </h1>
            <p class="text-gray-600 max-w-2xl mx-auto">
                ברוכים הבאים למדריך החברות המקיף שלנו. כאן תוכלו למצוא את כל החברות והסטארטאפים 
                המובילים בתחום ה-AI לתעשייה.
            </p>
        </div>

        <!-- Info Cards -->
        <div class="grid md:grid-cols-3 gap-4 mb-10">
            <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                    <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                    </svg>
                </div>
                <h3 class="font-bold text-gray-900 mb-1">חיפוש חכם</h3>
                <p class="text-sm text-gray-600">חפשו לפי קטגוריה או מילת מפתח</p>
            </div>
            <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                    <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                </div>
                <h3 class="font-bold text-gray-900 mb-1">חברות מאומתות</h3>
                <p class="text-sm text-gray-600">כל החברות עברו תהליך אימות</p>
            </div>
            <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                    <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                </div>
                <h3 class="font-bold text-gray-900 mb-1">עדכני תמיד</h3>
                <p class="text-sm text-gray-600">המידע מתעדכן בקביעות</p>
            </div>
        </div>
    </section>

    <!-- Iframe Section -->
    <section class="px-4 sm:px-6 mb-12">
        <div class="max-w-7xl mx-auto">
            <!-- Section Label -->
            <div class="flex items-center gap-3 mb-4 px-2">
                <div class="h-px bg-gray-300 flex-1"></div>
                <span class="text-sm text-gray-500 font-medium">מדריך החברות</span>
                <div class="h-px bg-gray-300 flex-1"></div>
            </div>
            
            <!-- Iframe Container -->
            <div class="iframe-wrapper" bind:this={iframeWrapper}>
                {#if isLoading}
                    <div class="iframe-loader">
                        <div class="spinner"></div>
                        <p>טוען את המדריך...</p>
                    </div>
                {/if}
                <iframe
                    src="/test-cfai"
                    title="AI for Industry Directory"
                    class="iframe-content"
                    class:opacity-0={isLoading}
                    scrolling="no"
                    bind:this={iframeElement}
                    onload={handleIframeLoad}
                ></iframe>
            </div>
        </div>
    </section>

    <!-- Page Content After Iframe -->
    <section class="max-w-6xl mx-auto px-6 py-12">
        <!-- CTA Section -->
        <div class="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-8 text-center text-white mb-12">
            <h2 class="text-2xl md:text-3xl font-bold mb-3">רוצים להצטרף למדריך?</h2>
            <p class="text-blue-100 max-w-xl mx-auto mb-6">
                אם אתם חברה או סטארטאפ בתחום ה-AI לתעשייה, נשמח לכלול אתכם במדריך שלנו.
            </p>
            <div class="flex flex-col sm:flex-row gap-3 justify-center">
                <button class="bg-white text-blue-600 px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
                    הגישו בקשה
                </button>
                <button class="bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-600 transition-colors border border-blue-500">
                    למידע נוסף
                </button>
            </div>
        </div>

        <!-- FAQ Section -->
        <div class="max-w-2xl mx-auto">
            <h2 class="text-xl font-bold text-gray-900 text-center mb-6">שאלות נפוצות</h2>
            
            <div class="space-y-3">
                <div class="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
                    <h3 class="font-bold text-gray-900 mb-2">איך ניתן לסנן את החברות במדריך?</h3>
                    <p class="text-sm text-gray-600">ניתן לסנן את החברות לפי קטגוריות שונות או לחפש ישירות לפי שם החברה.</p>
                </div>
                <div class="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
                    <h3 class="font-bold text-gray-900 mb-2">האם השימוש במדריך הוא בחינם?</h3>
                    <p class="text-sm text-gray-600">כן! המדריך הוא שירות חינמי שמטרתו לחבר בין תעשיות לבין ספקי הפתרונות.</p>
                </div>
                <div class="bg-white rounded-lg p-5 shadow-sm border border-gray-100">
                    <h3 class="font-bold text-gray-900 mb-2">איך ניתן ליצור קשר עם החברות?</h3>
                    <p class="text-sm text-gray-600">לכל חברה בעמוד המפורט יש פרטי התקשרות מלאים.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- WordPress-like Footer -->
    <footer class="bg-gray-900 text-gray-400 py-10">
        <div class="max-w-6xl mx-auto px-6">
            <div class="flex flex-col md:flex-row items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                        <span class="text-white font-bold text-sm">W</span>
                    </div>
                    <span class="text-white font-bold">האתר שלי</span>
                </div>
                <div class="flex gap-6 text-sm">
                    <a href="#" class="hover:text-white transition-colors">דף הבית</a>
                    <a href="#" class="hover:text-white transition-colors">מדריך החברות</a>
                    <a href="#" class="hover:text-white transition-colors">צור קשר</a>
                </div>
                <p class="text-sm">© 2025 האתר שלי. כל הזכויות שמורות.</p>
            </div>
        </div>
    </footer>
</div>

<style>
    /* Iframe wrapper - dynamic height based on content */
    .iframe-wrapper {
        position: relative;
        width: 100%;
        min-height: 400px; /* Minimum height */
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 4px 24px rgba(0,0,0,0.08);
        border: 1px solid rgba(0,0,0,0.06);
        background: white;
    }
    
    /* Iframe fills the container */
    .iframe-content {
        width: 100%;
        height: 100%;
        border: none;
        display: block;
        transition: opacity 0.3s ease;
    }

    .opacity-0 {
        opacity: 0;
    }

    /* Loader Styles - easily transferable to WordPress */
    .iframe-loader {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: white;
        z-index: 10;
        gap: 1rem;
        color: #64748b;
        font-family: sans-serif;
    }

    .spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #f3f3f3;
        border-top: 3px solid #00A890;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    /* Responsive adjustments */
    @media (max-width: 768px) {
        .iframe-wrapper {
            min-height: 400px;
            border-radius: 12px;
        }
    }
    
    :global(body) {
        background-color: #f9fafb;
    }
</style>
