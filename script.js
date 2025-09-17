document.addEventListener('DOMContentLoaded', () => {
    // --- CONFIGURATION ---
    const API_KEY = ''; // <-- PASTE YOUR SPOONACULAR API KEY HERE (sign up free at https://spoonacular.com/food-api/console)

    // --- GLOBAL STATE ---
    let pantry = JSON.parse(localStorage.getItem('pantry')) || [];
    let cookbook = JSON.parse(localStorage.getItem('cookbook')) || [];
    let mealPlan = JSON.parse(localStorage.getItem('mealPlan')) || {};
    let eventPlans = JSON.parse(localStorage.getItem('eventPlans')) || [];
    let history = JSON.parse(localStorage.getItem('history')) || [];
    let notifications = JSON.parse(localStorage.getItem('notifications')) || [];
    let searchIngredients = [];
    let cookbookSortOrder = 'latest';
    let debounceTimer;
    let loadingInterval;
    let tempEventMenu = [];

    // --- DOM ELEMENTS ---
    const landingPage = document.getElementById('landing-page');
    const mainApp = document.getElementById('main-app');
    const getStartedBtn = document.getElementById('get-started-btn');
    const pages = document.querySelectorAll('.page');
    const navLinks = document.querySelectorAll('.nav-link');
    const searchForm = document.getElementById('search-form');
    const ingredientInput = document.getElementById('ingredient-input');
    const addIngredientBtn = document.getElementById('add-ingredient-btn');
    const pantryForm = document.getElementById('pantry-form');
    const pantryInput = document.getElementById('pantry-input');
    const pantryList = document.getElementById('pantry-list');
    const cookbookSearchInput = document.getElementById('cookbook-search-input');
    const cookbookSortBtn = document.getElementById('cookbook-sort-btn');
    const historySearchInput = document.getElementById('history-search-input');
    const historyFilterSelect = document.getElementById('history-filter-select');
    const savePlanBtn = document.getElementById('save-plan-to-history-btn');
    const makeEventPlanBtn = document.getElementById('make-event-plan-btn');
    const toggleFiltersBtn = document.getElementById('toggle-filters-btn');
    const filtersPanel = document.getElementById('filters-panel');
    const clearFiltersBtn = document.getElementById('clear-filters-btn');
    const openSidebarBtn = document.getElementById('open-sidebar-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const sidebarMenu = document.getElementById('sidebar-menu');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const loadingModal = document.getElementById('loading-modal');

    // --- TEMPLATES ---
    const noResultsHTML = (message) => `<p class="text-slate-500 text-center p-8">${message}</p>`;

    // --- FEEDBACK TOAST ---
    function showFeedbackMessage(message, type = 'info') {
        const container = document.getElementById('feedback-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `feedback-toast p-3 rounded-lg shadow-lg text-white font-semibold text-center`;
        
        const typeClasses = {
            success: 'bg-emerald-500',
            info: 'bg-blue-500',
            error: 'bg-red-500'
        };
        toast.classList.add(typeClasses[type] || typeClasses.info);
        toast.textContent = message;
        
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('out');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 3000);
    }

    // --- LOADING SCREEN ---
    function showLoadingScreen() {
        let currentStage = 0;
        const stages = [
            { text: 'Finding your perfect recipe…', icon: '👨‍🍳', animation: 'stage-icon-bounce' },
            { text: 'Mixing ingredients…', icon: '🥣', animation: 'stage-icon-stir' },
            { text: 'Cooking something special…', icon: '🍳', animation: 'stage-icon-sizzle' },
            { text: 'Almost ready to serve…', icon: '🥖', animation: 'stage-icon-roll' }
        ];
        
        loadingModal.innerHTML = `
            <div class="text-center flex flex-col items-center gap-6">
                <div class="relative w-48 h-48">
                    <div class="text-6xl absolute inset-0 flex items-center justify-center pot-shake">🍲</div>
                    <div class="dropping-ingredient absolute w-8 h-8 top-0 left-1/2 transform -translate-x-1/2 text-4xl" style="animation-delay: 0s;">🍅</div>
                    <div class="dropping-ingredient absolute w-10 h-10 top-0 left-1/3 transform -translate-x-1/2 text-4xl" style="animation-delay: 0.3s;">🧅</div>
                    <div class="dropping-ingredient absolute w-8 h-8 top-0 left-2/3 transform -translate-x-1/2 text-4xl" style="animation-delay: 0.6s;">🧄</div>
                    <div class="steam-plume absolute w-2 h-8 bg-white/50 rounded-full bottom-2/3 left-1/3" style="animation-delay: 0s;"></div>
                    <div class="steam-plume absolute w-2 h-12 bg-white/50 rounded-full bottom-2/3 left-1/2" style="animation-delay: 0.5s;"></div>
                    <div class="steam-plume absolute w-2 h-6 bg-white/50 rounded-full bottom-2/3 left-2/3" style="animation-delay: 1s;"></div>
                </div>
                <div class="relative w-48 h-48 flex flex-col items-center justify-center -mt-16">
                     <div id="stage-icon-container" class="text-6xl h-20 flex items-center justify-center"></div>
                     <p id="loading-text" class="text-xl font-semibold text-slate-100"></p>
                </div>
                <div class="w-48 h-4 bg-slate-700 rounded-full overflow-hidden relative">
                    <div id="progress-bar-fill" class="h-full bg-emerald-500 rounded-full absolute left-0 top-0"></div>
                </div>
            </div>`;
        
        const textEl = document.getElementById('loading-text');
        const iconContainer = document.getElementById('stage-icon-container');
        const progressBar = document.getElementById('progress-bar-fill');

        function updateStage() {
            const stage = stages[currentStage];
            textEl.textContent = stage.text;
            iconContainer.innerHTML = `<div class="${stage.animation}">${stage.icon}</div>`;
            
            progressBar.style.transition = 'none';
            progressBar.style.width = '0%';
            setTimeout(() => {
                progressBar.style.transition = 'width 2.5s linear';
                progressBar.style.width = '100%';
            }, 50);

            currentStage = (currentStage + 1) % stages.length;
        }

        updateStage();
        loadingInterval = setInterval(updateStage, 2500);
        loadingModal.classList.remove('modal-hidden');
        loadingModal.classList.add('modal-visible');
    }

    function hideLoadingScreen() {
        clearInterval(loadingInterval);
        loadingModal.classList.add('modal-hidden');
        loadingModal.classList.remove('modal-visible');
        loadingModal.innerHTML = '';
    }

    // --- LANDING PAGE LOGIC ---
    function initializeLandingPage() {
        if (!landingPage) return;

        const featureSlidesData = [
            { image: 'https://placehold.co/600x400/10B981/FFFFFF?text=Search', heading: "Ingredient Search", text: "Got ingredients? Get recipes. Turn what you have into a meal you'll love." },
            { image: 'https://placehold.co/600x400/3B82F6/FFFFFF?text=Planner', heading: "Smart Meal Planner", text: "Plan your week, your way. Drag & drop recipes to build your perfect meal schedule." },
            { image: 'https://placehold.co/600x400/F59E0B/FFFFFF?text=Pantry', heading: "Pantry Management", text: "Know what's in your kitchen. Our virtual pantry helps you track ingredients and reduce waste." },
            { image: 'https://placehold.co/600x400/8B5CF6/FFFFFF?text=Events', heading: "Custom Event Planning", text: "Host like a pro. Create custom events, build menus, and get reminders for your special occasions." },
            { image: 'https://placehold.co/600x400/EC4899/FFFFFF?text=Hands-Free', heading: "Hands-Free Cooking", text: "Stay in the zone. With voice commands and read-aloud instructions, cooking is easier than ever." },
            { image: 'https://placehold.co/600x400/94A3B8/FFFFFF?text=History', heading: "Activity History", text: "Never lose track. Your searches, meal plans, and shopping lists are automatically saved for you." },
            { image: 'https://placehold.co/600x400/111827/FFFFFF?text=Themes', heading: "Dark & Light Mode", text: "Customize your experience. Switch between a sleek, neon dark mode and a clean light theme." },
            { image: 'https://placehold.co/600x400/EF4444/FFFFFF?text=Alerts', heading: "Smart Notifications", text: "Stay on track with automatic reminders for your daily recipes and upcoming events." }
        ];
        const footerMessagesData = [
            { icon: "✨", text: "Stop scrolling, start cooking — your next favorite recipe is just one click away." },
            { icon: "🌮", text: "Good food = good mood. Let’s find your flavor." },
            { icon: "🔥", text: "From ‘what’s for dinner?’ to ‘damn, that was good’ — in seconds." },
            { icon: "🥗", text: "Cook smart, eat fresh, live your best bite." },
            { icon: "🍕", text: "Recipes made easy, so you can chef it up like a pro." }
        ];

        function renderFeatureCard(slide) {
            const slideElement = document.createElement('div');
            slideElement.className = 'flex-shrink-0 w-full sm:w-1/2 lg:w-1/3 p-4 card-hover-effect';
            slideElement.innerHTML = `<div class="bg-gray-800 rounded-xl overflow-hidden h-full flex flex-col transform hover:-translate-y-2 transition-transform duration-300"><img src="${slide.image}" alt="${slide.heading}" class="w-full h-48 object-cover"><div class="p-6 flex-grow"><h3 class="text-xl font-bold text-emerald-400">${slide.heading}</h3><p class="mt-2 text-gray-300">${slide.text}</p></div></div>`;
            return slideElement;
        }

        function renderFooterCard(slide) {
            const slideElement = document.createElement('div');
            slideElement.className = 'flex-shrink-0 w-full sm:w-1/2 lg:w-1/3 p-4 card-hover-effect';
            slideElement.innerHTML = `<div class="bg-gray-800 rounded-xl h-full flex flex-col p-8 items-center justify-center text-center transform hover:-translate-y-2 transition-transform duration-300"><div class="text-5xl mb-4">${slide.icon}</div><p class="text-lg text-gray-300">${slide.text}</p></div>`;
            return slideElement;
        }

        function createCarousel(containerId, dotsId, slidesData, renderSlideFunc, itemsPerPageConfig) {
            const carousel = document.getElementById(containerId);
            const dotsContainer = document.getElementById(dotsId);
            if (!carousel || !dotsContainer) return () => {};

            let currentPage = 0, itemsPerPage = 3, totalPages = 1;

            function setup() {
                const screenWidth = window.innerWidth;
                itemsPerPage = (screenWidth < 768) ? itemsPerPageConfig.sm : (screenWidth < 1024) ? itemsPerPageConfig.md : itemsPerPageConfig.lg;
                totalPages = Math.ceil(slidesData.length / itemsPerPage);
                currentPage = 0;
                renderSlides();
                renderDots();
                updatePosition();
            }

            function renderSlides() {
                carousel.innerHTML = '';
                slidesData.forEach(slide => carousel.appendChild(renderSlideFunc(slide)));
            }

            function renderDots() {
                dotsContainer.innerHTML = '';
                for (let i = 0; i < totalPages; i++) {
                    const dot = document.createElement('button');
                    dot.className = `w-3 h-3 rounded-full transition-colors duration-300 ${i === currentPage ? 'bg-emerald-500' : 'bg-gray-600'}`;
                    dot.addEventListener('click', () => { currentPage = i; updatePosition(); });
                    dotsContainer.appendChild(dot);
                }
            }
            
            function updatePosition() {
                const offset = -currentPage * 100;
                carousel.style.transform = `translateX(${offset}%)`;
                Array.from(dotsContainer.children).forEach((dot, i) => dot.className = `w-3 h-3 rounded-full transition-colors duration-300 ${i === currentPage ? 'bg-emerald-500' : 'bg-gray-600'}`);
            }

            function autoRotate() {
                currentPage = (currentPage + 1) % totalPages;
                updatePosition();
            }

            window.addEventListener('resize', setup);
            setup();
            return autoRotate;
        }

        document.querySelectorAll('.fade-in-on-load').forEach(el => setTimeout(() => el.classList.remove('opacity-0'), 100));
        
        const autoRotateFeatures = createCarousel('features-carousel', 'carousel-dots', featureSlidesData, renderFeatureCard, { sm: 1, md: 2, lg: 3 });
        setInterval(autoRotateFeatures, 5000);

        const autoRotateFooter = createCarousel('footer-carousel', 'footer-carousel-dots', footerMessagesData, renderFooterCard, { sm: 1, md: 2, lg: 3 });
        setInterval(autoRotateFooter, 6000);

        getStartedBtn.addEventListener('click', () => {
            landingPage.style.display = 'none';
            mainApp.classList.remove('hidden');
            initializeApp();
        });
    }
    
    // --- MAIN APP LOGIC ---
    function initializeApp() {
        if (!API_KEY) {
             showFeedbackMessage('API Key missing. Please add it to script.js (free signup: https://spoonacular.com/food-api/console)', 'error');
        }
        
        populateFilterDropdowns();
        const initialPage = window.location.hash.replace('#', '') || 'search';
        navigate(initialPage);
        generateNotifications();
        showInitialPopup();
        
        navLinks.forEach(link => link.addEventListener('click', e => { e.preventDefault(); navigate(link.dataset.page); closeSidebar(); }));
        pantryForm.addEventListener('submit', handlePantryFormSubmit);
        pantryList.addEventListener('click', handlePantryListClick);
        document.getElementById('pantry-page').addEventListener('click', handlePantryPageClick);
        cookbookSearchInput.addEventListener('input', renderCookbook);
        cookbookSortBtn.addEventListener('click', handleCookbookSort);
        searchForm.addEventListener('submit', handleSearchFormSubmit);
        addIngredientBtn.addEventListener('click', addIngredientTag);
        ingredientInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addIngredientTag(); } });
        document.getElementById('search-tags-container').addEventListener('click', handleSearchTagDelete);
        toggleFiltersBtn.addEventListener('click', () => filtersPanel.classList.toggle('open'));
        clearFiltersBtn.addEventListener('click', handleClearFilters);
        document.body.addEventListener('click', handleBodyClickDelegation);
        document.getElementById('image-upload').addEventListener('change', handleImageUpload);
        document.getElementById('meal-planner-grid').addEventListener('dragover', handleDragOver);
        document.getElementById('meal-planner-grid').addEventListener('dragleave', handleDragLeave);
        document.getElementById('meal-planner-grid').addEventListener('drop', handleDrop);
        document.getElementById('meal-planner-grid').addEventListener('click', handleMealPlannerGridClick);
        document.body.addEventListener('dragstart', handleDragStart);
        document.getElementById('generate-shopping-list-btn').addEventListener('click', generateShoppingList);
        savePlanBtn.addEventListener('click', handleSavePlan);
        historySearchInput.addEventListener('input', renderHistory);
        historyFilterSelect.addEventListener('change', renderHistory);
        document.getElementById('history-list').addEventListener('click', handleHistoryListClick);
        document.getElementById('notifications-page').addEventListener('click', handleNotificationsPageClick);
        makeEventPlanBtn.addEventListener('click', () => openEventModal());
        openSidebarBtn.addEventListener('click', openSidebar);
        closeSidebarBtn.addEventListener('click', closeSidebar);
        sidebarOverlay.addEventListener('click', closeSidebar);
        darkModeToggle.addEventListener('change', handleDarkModeToggle);
    }

    function renderRecipes(recipes, container, options = {}) {
        container.innerHTML = '';
        if (!recipes || recipes.length === 0) {
            container.innerHTML = noResultsHTML("No recipes found. Try different ingredients or filters!");
            return;
        }
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-8';
        
        recipes.forEach(recipe => {
            const isFavorite = isRecipeInCookbook(recipe.id);
            const card = document.createElement('div');
            card.className = 'bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 group flex flex-col hover:-translate-y-1 hover:shadow-lg';
            card.dataset.recipe = JSON.stringify(recipe);
            if (options.draggable) {
                card.classList.add('recipe-card-draggable');
                card.draggable = true;
            }

            const instructionsHtml = recipe.analyzedInstructions && recipe.analyzedInstructions.length > 0
                ? `<ol class="list-decimal list-inside space-y-2 text-sm">${recipe.analyzedInstructions[0].steps.map(step => `<li>${step.step}</li>`).join('')}</ol>`
                : '<p class="text-sm text-slate-500">No instructions available.</p>';
            
            const ingredientsHtml = recipe.extendedIngredients && recipe.extendedIngredients.length > 0
                ? `<ul class="list-disc list-inside space-y-1 text-sm">${recipe.extendedIngredients.map(ing => `<li>${ing.original}</li>`).join('')}</ul>`
                : '<p class="text-sm text-slate-500">No ingredients listed.</p>';

            card.innerHTML = `
                <div class="relative">
                    <img src="${recipe.image || 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image'}" alt="${recipe.title}" class="w-full h-48 object-cover">
                    <button data-recipe-id="${recipe.id}" class="cookbook-toggle-btn absolute top-2 right-2 p-2 rounded-full bg-white bg-opacity-75 text-slate-600 hover:text-emerald-500 ${isFavorite ? 'text-emerald-500' : ''} transition">
                        <svg class="w-6 h-6" fill="${isFavorite ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                    </button>
                </div>
                <div class="p-4 flex-grow flex flex-col">
                    <h3 class="font-bold text-lg text-slate-800 group-hover:text-emerald-600 cursor-pointer" data-recipe-id="${recipe.id}">${recipe.title}</h3>
                    <div class="flex items-center text-sm text-slate-500 mt-2 mb-4">
                        <svg class="w-5 h-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                        <span>Ready in ${recipe.readyInMinutes || '?'} minutes</span>
                    </div>
                    
                    <div class="space-y-2 flex-grow">
                        <div>
                            <button class="recipe-accordion-btn w-full text-left font-semibold flex justify-between items-center p-2 bg-slate-100 rounded hover:bg-slate-200">
                                <span>Ingredients</span>
                                <svg class="w-5 h-5 transform transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </button>
                            <div class="recipe-accordion-content hidden p-2 pl-4 border-l-2 border-emerald-200">
                               ${ingredientsHtml}
                            </div>
                        </div>
                        <div>
                            <button class="recipe-accordion-btn w-full text-left font-semibold flex justify-between items-center p-2 bg-slate-100 rounded hover:bg-slate-200">
                                <span>Instructions</span>
                                <svg class="w-5 h-5 transform transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </button>
                            <div class="recipe-accordion-content hidden p-2 pl-4 border-l-2 border-emerald-200">
                               ${instructionsHtml}
                            </div>
                        </div>
                    </div>
                </div>`;
            grid.appendChild(card);
        });
        container.appendChild(grid);
    }

    async function renderPantryRecommendations() {
        const container = document.getElementById('pantry-recommendations');
        if (!container) return;
        if (pantry.length === 0) {
            container.innerHTML = '';
            return;
        }
        container.innerHTML = `<h2 class="text-3xl font-extrabold text-slate-900 mb-4">Based on Your Pantry</h2>` + `<div class="text-center p-8"><svg class="animate-spin h-10 w-10 text-emerald-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>`;
        
        const ingredientsString = pantry.join(',');
        const url = `https://api.spoonacular.com/recipes/complexSearch?includeIngredients=${ingredientsString}&addRecipeInformation=true&number=8&apiKey=${API_KEY}`;
        const recipesResponse = await fetchAPI(url);
        renderRecipes(recipesResponse ? recipesResponse.results : [], container, { draggable: true });
    }

    function navigate(pageId) {
        const pageContainer = document.getElementById(`${pageId}-page`);
        if(!pageContainer) return;
        pages.forEach(p => p.classList.remove('active'));
        pageContainer.classList.add('active');
        navLinks.forEach(l => l.classList.toggle('active', l.dataset.page === pageId));
        window.location.hash = pageId;

        if (pageId === 'cookbook') renderCookbook();
        if (pageId === 'pantry') renderPantry();
        if (pageId === 'planner') renderMealPlanner();
        if (pageId === 'search' && mainApp.style.display !== 'none') renderPantryRecommendations();
        if (pageId === 'history') renderHistory();
        if (pageId === 'notifications') renderNotificationsPage();
    }

    async function fetchAPI(url) {
        if (!API_KEY) {
            showFeedbackMessage("API Key is missing. Please add it to script.js.", "error");
            return null;
        }
        try {
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 401) {
                    showFeedbackMessage("API Error: Unauthorized. Check your API key.", "error");
                }
                throw new Error(`API Error: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error("API Fetch Error:", error);
            showFeedbackMessage("Network error. Please check your connection.", "error");
            return null;
        }
    }
    
    function savePantry() { localStorage.setItem('pantry', JSON.stringify(pantry)); }
    function renderPantry() {
        const pantryActions = document.getElementById('pantry-actions');
        pantryList.innerHTML = '';
        if (pantry.length === 0) {
            pantryList.innerHTML = noResultsHTML("Your pantry is empty.");
            if (pantryActions) {
                pantryActions.innerHTML = '';
                pantryActions.style.display = 'none';
            }
            return;
        }
        if (pantryActions) {
            pantryActions.style.display = 'block';
            pantryActions.innerHTML = `<button id="find-recipes-from-pantry-btn" class="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-md transition shadow hover:shadow-lg flex items-center justify-center gap-2"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>Find Recipes with these Ingredients</button>`;
        }
        pantry.forEach(item => {
            const li = document.createElement('div');
            li.className = 'flex justify-between items-center bg-slate-50 p-3 rounded-md animate-fadeIn';
            li.innerHTML = `<span>${item}</span><button data-item="${item}" class="pantry-delete-btn text-red-500 hover:text-red-700 font-bold text-xl">&times;</button>`;
            pantryList.appendChild(li);
        });
    }

    function handlePantryFormSubmit(e) {
        e.preventDefault();
        const newItem = pantryInput.value.trim().toLowerCase();
        if (newItem && !pantry.includes(newItem)) {
            pantry.push(newItem);
            savePantry();
            renderPantry();
            renderPantryRecommendations();
            showFeedbackMessage(`'${newItem}' added to pantry`, 'success');
        }
        pantryInput.value = '';
    }

    function handlePantryListClick(e) {
        if (e.target.classList.contains('pantry-delete-btn')) {
            const itemToRemove = e.target.dataset.item;
            pantry = pantry.filter(item => item !== itemToRemove);
            savePantry();
            renderPantry();
            renderPantryRecommendations();
            showFeedbackMessage(`'${itemToRemove}' removed from pantry`, 'info');
        }
    }

    function handlePantryPageClick(e) {
        if (e.target.id === 'find-recipes-from-pantry-btn') {
            if (pantry.length > 0) {
                searchIngredients = [...pantry];
                ingredientInput.value = '';
                navigate('search');
                renderSearchTags();
                searchForm.dispatchEvent(new Event('submit', {cancelable: true}));
            }
        }
    }
    
    function saveCookbook() { localStorage.setItem('cookbook', JSON.stringify(cookbook)); }
    function isRecipeInCookbook(recipeId) { return cookbook.some(r => r.id === recipeId); }
    function toggleCookbook(recipe) {
        if (isRecipeInCookbook(recipe.id)) {
            cookbook = cookbook.filter(r => r.id !== recipe.id);
            showFeedbackMessage('Recipe removed from Cookbook', 'info');
        } else {
            cookbook.push({ ...recipe, savedAt: new Date().getTime() });
            showFeedbackMessage('Recipe saved to Cookbook!', 'success');
        }
        saveCookbook();
        renderCookbook(); // Re-render to update hearts
    }
    function renderCookbook() {
        const cookbookGrid = document.getElementById('cookbook-grid');
        if (!cookbookGrid) return;
        const searchTerm = cookbookSearchInput.value.toLowerCase();
        let recipesToRender = [...cookbook];
        if (searchTerm) {
            recipesToRender = recipesToRender.filter(r => r.title.toLowerCase().includes(searchTerm));
        }
        if (cookbookSortOrder === 'latest') {
            recipesToRender.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
        } else {
            recipesToRender.sort((a, b) => (a.savedAt || 0) - (b.savedAt || 0));
        }
        
        const simplifiedGrid = document.createElement('div');
        simplifiedGrid.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8';
        if(recipesToRender.length === 0){
            cookbookGrid.innerHTML = noResultsHTML("No saved recipes found.");
            return;
        }
        recipesToRender.forEach(recipe => {
            const card = document.createElement('div');
            card.className = 'bg-white rounded-lg shadow-md overflow-hidden transform hover:-translate-y-1 transition-all duration-300 group recipe-card-draggable';
            card.dataset.recipe = JSON.stringify(recipe);
            card.draggable = true;
            card.innerHTML = `
                <div class="relative">
                    <img src="${recipe.image || 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image'}" alt="${recipe.title}" class="w-full h-48 object-cover">
                    <button data-recipe-id="${recipe.id}" class="cookbook-toggle-btn absolute top-2 right-2 p-2 rounded-full bg-white bg-opacity-75 text-slate-600 hover:text-emerald-500 text-emerald-500 transition">
                        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                    </button>
                </div>
                <div class="p-4 cursor-pointer" data-recipe-id="${recipe.id}">
                    <h3 class="font-bold text-lg text-slate-800 truncate group-hover:text-emerald-600" data-recipe-id="${recipe.id}">${recipe.title}</h3>
                </div>`;
            simplifiedGrid.appendChild(card);
        });
        cookbookGrid.innerHTML = '';
        cookbookGrid.appendChild(simplifiedGrid);
    }
    function handleCookbookSort() {
        cookbookSortOrder = cookbookSortOrder === 'latest' ? 'oldest' : 'latest';
        cookbookSortBtn.textContent = cookbookSortOrder === 'latest' ? 'Latest' : 'Oldest';
        renderCookbook();
    }
    
    function populateFilterDropdowns() {
        const cuisines = ['','African','Asian','American','British','Cajun','Caribbean','Chinese','Eastern European','European','French','German','Greek','Indian','Irish','Italian','Japanese','Jewish','Korean','Latin American','Mediterranean','Mexican','Middle Eastern','Nordic','Southern','Spanish','Thai','Vietnamese'];
        const diets = ['','Gluten Free','Ketogenic','Vegetarian','Lacto-Vegetarian','Ovo-Vegetarian','Vegan','Pescetarian','Paleo','Primal','Low FODMAP','Whole30'];
        const types = ['','main course','side dish','dessert','appetizer','salad','bread','breakfast','soup','beverage','sauce','marinade','fingerfood','snack','drink'];
        const sorts = {'popularity':'Popularity', 'healthiness':'Health Score', 'time':'Prep Time'};

        const cuisineSelect = document.getElementById('filter-cuisine');
        const dietSelect = document.getElementById('filter-diet');
        const typeSelect = document.getElementById('filter-type');
        const sortSelect = document.getElementById('filter-sort');
        
        if(!cuisineSelect || !dietSelect || !typeSelect || !sortSelect) return;

        cuisineSelect.innerHTML = cuisines.map(c => `<option value="${c.toLowerCase()}">${c || 'Any Cuisine'}</option>`).join('');
        dietSelect.innerHTML = diets.map(d => `<option value="${d.toLowerCase().replace(/\s+/g, '-')}">${d || 'Any Diet'}</option>`).join('');
        typeSelect.innerHTML = types.map(t => `<option value="${t.toLowerCase()}">${t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Any Type'}</option>`).join('');
        sortSelect.innerHTML = Object.entries(sorts).map(([value, text]) => `<option value="${value}">${text}</option>`).join('');
    }
    
    function handleClearFilters() {
        ['filter-cuisine', 'filter-diet', 'filter-type', 'filter-time', 'filter-sort'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.value = '';
        });
        renderActiveFilters();
        // Fire a submit event to re-run the search with cleared filters
        searchForm.dispatchEvent(new Event('submit', { cancelable: true }));
    }
    
    function addIngredientTag() {
        const newIngredient = ingredientInput.value.trim().toLowerCase();
        if (newIngredient && !searchIngredients.includes(newIngredient)) {
            searchIngredients.push(newIngredient);
            renderSearchTags();
        }
        ingredientInput.value = '';
        ingredientInput.focus();
    }

    async function handleSearchFormSubmit(e) {
        e.preventDefault();
        const query = ingredientInput.value.trim();
        const activeFilters = renderActiveFilters();
        
        if (searchIngredients.length > 0 || Object.values(activeFilters).some(v => v) || query) {
            showLoadingScreen();
            
            let url = new URL("https://api.spoonacular.com/recipes/complexSearch");
            url.searchParams.append('apiKey', API_KEY);
            url.searchParams.append('addRecipeInformation', true);
            url.searchParams.append('number', 12);
            
            if (query) {
                url.searchParams.append('query', query);
            }

            if(searchIngredients.length > 0) {
                url.searchParams.append('includeIngredients', searchIngredients.join(','));
            }
            
            // **FIXED**: Directly append filter keys and values
            for (const [key, value] of Object.entries(activeFilters)) {
                if (value) {
                    url.searchParams.append(key, value);
                }
            }
            
            const recipesResponse = await fetchAPI(url.toString());
            hideLoadingScreen();
            renderRecipes(recipesResponse ? recipesResponse.results : [], document.getElementById('search-results'), { draggable: true });
            addHistoryEvent('search', { query, ingredients: [...searchIngredients], filters: activeFilters });
        }
    }

    function renderSearchTags() {
        const container = document.getElementById('search-tags-container');
        if (!container) return;
        container.innerHTML = searchIngredients.map(ing => `
            <div class="bg-emerald-100 text-emerald-800 text-sm font-semibold mr-2 mb-2 px-3 py-1 rounded-full flex items-center">
                ${ing}
                <button data-ingredient="${ing}" class="search-tag-delete-btn ml-2 text-emerald-600 hover:text-emerald-800">&times;</button>
            </div>
        `).join('');
    }

    function renderActiveFilters() {
        const container = document.getElementById('active-filters-container');
        if (!container) return {};
        const filters = {
            cuisine: document.getElementById('filter-cuisine')?.value || '',
            diet: document.getElementById('filter-diet')?.value || '',
            type: document.getElementById('filter-type')?.value || '',
            maxReadyTime: document.getElementById('filter-time')?.value || '',
            sort: document.getElementById('filter-sort')?.value || ''
        };
        
        container.innerHTML = '';
        Object.entries(filters).forEach(([key, value]) => {
            if(value) {
                const tag = document.createElement('div');
                tag.className = 'bg-indigo-100 text-indigo-800 text-xs font-semibold px-2.5 py-1 rounded-full';
                tag.textContent = `${key.replace('maxReadyTime', 'Time')}: ${value}`;
                container.appendChild(tag);
            }
        });
        return filters;
    }

    function handleSearchTagDelete(e) {
         if (e.target.classList.contains('search-tag-delete-btn')) {
             searchIngredients = searchIngredients.filter(i => i !== e.target.dataset.ingredient);
             renderSearchTags();
         }
    }

    function handleBodyClickDelegation(e) {
        const cookbookBtn = e.target.closest('.cookbook-toggle-btn');
        const recipeTitle = e.target.closest('h3[data-recipe-id]');
        const accordionBtn = e.target.closest('.recipe-accordion-btn');

        if (accordionBtn) {
            const content = accordionBtn.nextElementSibling;
            const icon = accordionBtn.querySelector('svg');
            content.classList.toggle('hidden');
            icon.classList.toggle('rotate-180');
        }

        if (cookbookBtn) {
            const recipeCard = cookbookBtn.closest('[data-recipe]');
            if (recipeCard) {
                const recipe = JSON.parse(recipeCard.dataset.recipe);
                toggleCookbook(recipe);
                const svg = cookbookBtn.querySelector('svg');
                svg.setAttribute('fill', isRecipeInCookbook(recipe.id) ? 'none' : 'currentColor');
                cookbookBtn.classList.toggle('text-emerald-500', isRecipeInCookbook(recipe.id));
            }
        }
        if (recipeTitle) {
            openRecipeModal(recipeTitle.dataset.recipeId);
        }
    }
    
    async function openRecipeModal(recipeId) {
        const modalContainer = document.getElementById('recipe-modal');
        if (!modalContainer) return;
        modalContainer.innerHTML = `<div class="glass-effect rounded-lg shadow-2xl w-11/12 max-w-4xl m-4 relative animate-fadeIn">` + `<div class="text-center p-8"><svg class="animate-spin h-10 w-10 text-emerald-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>` + `</div>`;
        modalContainer.classList.remove('modal-hidden');
        modalContainer.classList.add('modal-visible');

        const url = `https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${API_KEY}`;
        const recipe = await fetchAPI(url);

        if (!recipe) {
            modalContainer.innerHTML = `<div class="bg-white rounded-lg p-8">Error loading recipe.</div>`;
            return;
        }
        
        let currentStep = -1;
        const steps = recipe.analyzedInstructions?.[0]?.steps || [];

        function closeModal() {
            modalContainer.classList.add('modal-hidden');
            modalContainer.classList.remove('modal-visible');
            if ('speechSynthesis' in window) speechSynthesis.cancel();
        }

        function renderModalContent() {
            const isFavorite = isRecipeInCookbook(recipe.id);
            modalContainer.innerHTML = `
            <div class="glass-effect rounded-lg shadow-2xl w-11/12 max-w-4xl m-4 relative">
                <button id="close-modal-btn" class="absolute top-4 right-4 text-slate-500 hover:text-slate-800 text-3xl font-bold">&times;</button>
                <div class="p-6 max-h-[85vh] overflow-y-auto">
                    <h2 class="text-3xl font-extrabold mb-4">${recipe.title}</h2>
                    <img src="${recipe.image}" alt="${recipe.title}" class="w-full h-72 object-cover rounded-lg mb-4">
                    <div class="flex items-center space-x-4 mb-4">
                        <span>${recipe.readyInMinutes} min</span>
                        <span>${recipe.servings} servings</span>
                        <button data-recipe-id="${recipe.id}" class="cookbook-toggle-btn p-2 rounded-full text-slate-600 hover:text-emerald-500 ${isFavorite ? 'text-emerald-500' : ''}">
                            <svg class="w-6 h-6" fill="${isFavorite ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                        </button>
                    </div>
                    <div id="cooking-mode-container">
                        <h3 class="text-xl font-bold mb-2">Ingredients</h3>
                        <ul class="list-disc list-inside mb-4">${recipe.extendedIngredients.map(i => `<li>${i.original}</li>`).join('')}</ul>
                        <h3 class="text-xl font-bold mb-2">Instructions</h3>
                        <div id="instruction-steps" class="space-y-2">
                            ${steps.map((step, index) => `<div class="cooking-step" data-step-index="${index}"><p><b>Step ${step.number}:</b> ${step.step}</p></div>`).join('')}
                        </div>
                    </div>
                    <div class="flex justify-center items-center gap-4 mt-4 border-t pt-4">
                       <button id="prev-step-btn" class="bg-slate-200 px-4 py-2 rounded">Prev</button>
                       <span id="step-indicator">Overview</span>
                       <button id="next-step-btn" class="bg-slate-200 px-4 py-2 rounded">Next</button>
                       <button id="read-aloud-btn" class="bg-emerald-500 text-white px-4 py-2 rounded">Read Step</button>
                    </div>
                </div>
            </div>`;
            
            // Re-attach event listeners after re-render
            const closeBtn = modalContainer.querySelector('#close-modal-btn');
            if (closeBtn) closeBtn.addEventListener('click', closeModal);
            const nextBtn = modalContainer.querySelector('#next-step-btn');
            if (nextBtn) nextBtn.addEventListener('click', () => { if (currentStep < steps.length - 1) { currentStep++; updateCookingMode(); } });
            const prevBtn = modalContainer.querySelector('#prev-step-btn');
            if (prevBtn) prevBtn.addEventListener('click', () => { if (currentStep > -1) { currentStep--; updateCookingMode(); } });
            const readBtn = modalContainer.querySelector('#read-aloud-btn');
            if (readBtn) {
                readBtn.addEventListener('click', () => {
                    if (!('speechSynthesis' in window)) {
                        showFeedbackMessage('Speech Synthesis not supported in this browser.', 'error');
                        return;
                    }
                    if (currentStep > -1 && steps[currentStep]) {
                        speechSynthesis.cancel();
                        const utterance = new SpeechSynthesisUtterance(steps[currentStep].step);
                        speechSynthesis.speak(utterance);
                    } else {
                        showFeedbackMessage('Select a step to read aloud.', 'info');
                    }
                });
            }
            const toggleBtn = modalContainer.querySelector('.cookbook-toggle-btn');
            if (toggleBtn) toggleBtn.addEventListener('click', () => toggleCookbook(recipe));
        }
        
        function updateCookingMode() {
            const allSteps = modalContainer.querySelectorAll('.cooking-step');
            const indicator = modalContainer.querySelector('#step-indicator');
            allSteps.forEach(el => el.classList.remove('active-step'));
            
            if (currentStep >= 0 && currentStep < steps.length) {
                allSteps[currentStep].classList.add('active-step');
                if (indicator) indicator.textContent = `Step ${currentStep + 1} of ${steps.length}`;
                allSteps[currentStep].scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                 if (indicator) indicator.textContent = 'Overview';
            }
        }
        
        renderModalContent();

        // Allow clicking outside modal to close
        modalContainer.addEventListener('click', e => { if (e.target === modalContainer) closeModal(); });
    }
    
    function handleImageUpload(e) {
        const statusEl = document.getElementById('visual-recognition-status');
        if (!statusEl || e.target.files.length === 0) return;
        statusEl.textContent = 'Analyzing image... (Demo)';
        setTimeout(() => {
            const demoItems = ['tomato', 'onion', 'lettuce', 'cheese'];
            const randomItem = demoItems[Math.floor(Math.random()*demoItems.length)];
            statusEl.textContent = `Detected: ${randomItem}. Added to pantry.`;
            pantryInput.value = randomItem;
            pantryForm.dispatchEvent(new Event('submit'));
        }, 1500);
    }

    function saveMealPlan() { localStorage.setItem('mealPlan', JSON.stringify(mealPlan)); }
    function renderMealPlanner() {
        const plannerGrid = document.getElementById('meal-planner-grid');
        if (!plannerGrid) return;
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        plannerGrid.innerHTML = days.map(day => {
            const recipesForDay = mealPlan[day] || [];
            const recipesHTML = recipesForDay.map((recipe, index) => `
                <div class="bg-white p-2 mt-2 rounded shadow-sm text-sm flex justify-between items-center">
                    <span class="truncate">${recipe.title}</span>
                    <button data-day="${day}" data-index="${index}" class="meal-plan-delete-btn text-red-500 hover:text-red-700 font-bold">&times;</button>
                </div>
            `).join('');

            return `
            <div class="border rounded p-2 bg-slate-50 flex flex-col">
                <h4 class="font-bold text-center text-slate-700">${day}</h4>
                <div class="meal-planner-dropzone p-2 min-h-[100px] flex-grow" data-day="${day}">
                    ${recipesForDay.length > 0 ? recipesHTML : '<p class="text-slate-400 text-center text-xs">Drop recipes here</p>'}
                </div>
                <button data-day="${day}" class="add-recipe-to-day-btn mt-2 w-full text-center py-1 bg-slate-200 hover:bg-slate-300 rounded text-sm text-slate-600 font-semibold">+ Add Recipe</button>
            </div>`;
        }).join('');
    }

    function handleDragOver(e) { 
        e.preventDefault(); 
        const dropzone = e.target.closest('.meal-planner-dropzone'); 
        if (dropzone) dropzone.classList.add('drag-over'); 
    }
    function handleDragLeave(e) { 
        const dropzone = e.target.closest('.meal-planner-dropzone'); 
        if (dropzone) dropzone.classList.remove('drag-over'); 
    }
    function handleDrop(e) {
        e.preventDefault();
        const dropzone = e.target.closest('.meal-planner-dropzone');
        if (dropzone) {
            dropzone.classList.remove('drag-over');
            const recipeText = e.dataTransfer.getData('application/json');
            if (recipeText) {
                const recipe = JSON.parse(recipeText);
                const day = dropzone.dataset.day;
                if (!mealPlan[day]) mealPlan[day] = [];
                mealPlan[day].push({ id: recipe.id, title: recipe.title });
                saveMealPlan();
                renderMealPlanner();
                showFeedbackMessage(`'${recipe.title}' added to ${day}`, 'success');
            }
        }
    }
    function handleDragStart(e) { 
        if (e.target.classList.contains('recipe-card-draggable')) { 
            const recipeCard = e.target.closest('[data-recipe]');
            if (recipeCard) e.dataTransfer.setData('application/json', recipeCard.dataset.recipe); 
        } 
    }
    function handleMealPlannerGridClick(e) {
         if (e.target.classList.contains('meal-plan-delete-btn')) {
             const { day, index } = e.target.dataset;
             if (day && index !== undefined) {
                const removedRecipe = mealPlan[day].splice(index, 1)[0];
                saveMealPlan();
                renderMealPlanner();
                showFeedbackMessage(`'${removedRecipe.title}' removed`, 'info');
             }
         }
         if (e.target.classList.contains('add-recipe-to-day-btn')) {
            const day = e.target.dataset.day;
            if (day) openAddRecipeModal(day);
        }
    }

    async function generateShoppingList() {
        const modalContainer = document.getElementById('shopping-list-modal');
        if (!modalContainer) return;
        modalContainer.innerHTML = `<div class="glass-effect rounded-lg shadow-2xl w-11/12 max-w-md m-4 relative p-6">` + `<div class="text-center p-8"><svg class="animate-spin h-10 w-10 text-emerald-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>` + `</div>`;
        modalContainer.classList.remove('modal-hidden');
        modalContainer.classList.add('modal-visible');

        const allRecipeIds = [...new Set(Object.values(mealPlan).flat().map(r => r.id))];
        
        if (allRecipeIds.length === 0) {
            openShoppingListModal([], 'Your meal plan is empty. Add some recipes to generate a list.');
            return;
        }

        showLoadingScreen();
        const recipePromises = allRecipeIds.map(id => fetchAPI(`https://api.spoonacular.com/recipes/${id}/information?apiKey=${API_KEY}`));
        const recipeDetails = await Promise.all(recipePromises);
        hideLoadingScreen();

        let allIngredients = recipeDetails.filter(Boolean).flatMap(r => r.extendedIngredients ? r.extendedIngredients.map(i => i.name.toLowerCase()) : []);
        let uniqueIngredients = [...new Set(allIngredients)];
        const pantryLower = pantry.map(p => p.toLowerCase());
        const shoppingList = uniqueIngredients.filter(ing => !pantryLower.some(pantryItem => ing.includes(pantryItem)));
        
        addHistoryEvent('shoppinglist', { items: [...shoppingList], count: shoppingList.length });
        openShoppingListModal(shoppingList, 'Your Shopping List');
        showFeedbackMessage('Shopping list generated!', 'success');
    }

    function openShoppingListModal(list, title) {
        const modalContainer = document.getElementById('shopping-list-modal');
        if (!modalContainer) return;
        let listHTML = '';
        if (list.length > 0) {
             listHTML = `<ul class="space-y-2">${list.map(item => `
                <li class="shopping-list-item"><label class="flex items-center"><input type="checkbox" class="mr-2"/><span>${item}</span></label></li>
             `).join('')}</ul>`;
        } else {
            listHTML = `<p class="text-slate-500">Nothing to shop for! Your pantry has everything you need for your planned meals.</p>`;
            if (title.includes('empty')) listHTML = `<p class="text-slate-500">${title}</p>`;
        }

        modalContainer.innerHTML = `
            <div class="glass-effect rounded-lg shadow-2xl w-11/12 max-w-md m-4 relative">
                <button id="close-shopping-modal" class="absolute top-2 right-4 text-slate-500 hover:text-slate-800 font-bold text-2xl">&times;</button>
                <div class="p-6">
                    <h2 class="text-2xl font-extrabold mb-4">${title}</h2>
                    <div class="max-h-96 overflow-y-auto pr-2">${listHTML}</div>
                </div>
            </div>
        `;
        
        const closeModal = () => {
            modalContainer.classList.add('modal-hidden');
            modalContainer.classList.remove('modal-visible');
        };

        const closeBtn = modalContainer.querySelector('#close-shopping-modal');
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        modalContainer.addEventListener('click', e => { if (e.target === modalContainer) closeModal(); });

        modalContainer.querySelectorAll('.shopping-list-item input').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const item = e.target.closest('.shopping-list-item');
                if (item) item.classList.toggle('checked');
            });
        });
    }

    function saveHistory() { localStorage.setItem('history', JSON.stringify(history)); }
    function addHistoryEvent(type, data) {
        const event = { type, data, timestamp: new Date().toISOString() };
        history.unshift(event);
        if (history.length > 100) history.pop();
        saveHistory();
    }
    
    function handleSavePlan() {
        if (Object.keys(mealPlan).some(day => mealPlan[day] && mealPlan[day].length > 0)) {
            addHistoryEvent('weeklyplan', { plan: JSON.parse(JSON.stringify(mealPlan)) });
            showFeedbackMessage('Weekly plan saved to history!', 'success');
        } else {
            showFeedbackMessage('Your meal plan is empty.', 'info');
        }
    }

    function formatTimeAgo(isoString) {
        const date = new Date(isoString);
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return "Just now";
    }

    function renderHistory() {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;
        const searchTerm = historySearchInput.value.toLowerCase();
        const activeFilter = historyFilterSelect.value;
        
        let historyToRender = [...history];

        if (activeFilter !== 'all') {
            historyToRender = historyToRender.filter(event => event.type === activeFilter);
        }

        if (searchTerm) {
            historyToRender = historyToRender.filter(event => {
                if (event.type === 'search') {
                    const queryMatch = event.data.query && event.data.query.toLowerCase().includes(searchTerm);
                    const ingredientMatch = event.data.ingredients && event.data.ingredients.join(' ').toLowerCase().includes(searchTerm);
                    return queryMatch || ingredientMatch;
                }
                if (event.type === 'shoppinglist') {
                    return event.data.items.join(' ').toLowerCase().includes(searchTerm);
                }
                if (event.type === 'weeklyplan') {
                    return Object.values(event.data.plan).flat().some(recipe => recipe.title.toLowerCase().includes(searchTerm));
                }
                 if (event.type === 'eventplan') {
                    return event.data.eventName.toLowerCase().includes(searchTerm) || event.data.menu.some(r => r.title.toLowerCase().includes(searchTerm));
                }
                return false;
            });
        }

        if (historyToRender.length === 0) {
            historyList.innerHTML = noResultsHTML("No history found for this filter.");
            return;
        }

        historyList.innerHTML = historyToRender.map(event => {
            let content = '';
            let editButton = '';
            switch (event.type) {
                case 'search':
                    let searchText = '';
                    if (event.data.query) {
                        searchText += `Searched for: <strong>${event.data.query}</strong>`;
                    }
                    if (event.data.ingredients && event.data.ingredients.length > 0) {
                        searchText += `${event.data.query ? ' with ingredients' : 'Searched for recipes with'}: <strong>${event.data.ingredients.join(', ')}</strong>`;
                    }
                    content = searchText || 'Performed an empty search with filters.';
                    break;
                case 'shoppinglist':
                    content = `Generated a shopping list with <strong>${event.data.count} items</strong>.`;
                    break;
                case 'weeklyplan':
                    const recipeCount = Object.values(event.data.plan).flat().length;
                    content = `Saved a weekly plan with <strong>${recipeCount} recipes</strong>.`;
                    break;
                case 'eventplan':
                    content = `Created event: <strong>${event.data.eventName}</strong> for ${new Date(event.data.date).toLocaleDateString()}.`;
                    editButton = `<button class="edit-event-btn bg-indigo-100 text-indigo-700 text-xs font-semibold px-2 py-1 rounded hover:bg-indigo-200 ml-4" data-event-id="${event.data.id}">Edit Plan</button>`;
                    break;
            }
            return `
                <div class="p-4 bg-slate-50 rounded-lg flex justify-between items-center mb-4">
                    <div>
                        <p class="mb-1">${content}</p>
                        <p class="text-sm text-slate-500">${formatTimeAgo(event.timestamp)}</p>
                    </div>
                    ${editButton}
                </div>
            `;
        }).join('');
    }

    function handleHistoryListClick(e) {
        if (e.target.classList.contains('edit-event-btn')) {
            const eventId = e.target.dataset.eventId;
            openEventModal(eventId);
        }
    }
    
    function saveNotifications() { localStorage.setItem('notifications', JSON.stringify(notifications)); }
    function updateNotificationBadge() {
        const badges = document.querySelectorAll('.notification-badge');
        const count = notifications.length;
        badges.forEach(badge => {
            badge.textContent = count > 99 ? '99+' : count;
            if (count > 0) {
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        });
    }

    function generateNotifications() {
        notifications = []; // Clear old notifications
        generateDailyRecipeNotifications();
        generateUpcomingEventNotifications();
        saveNotifications();
        updateNotificationBadge();
    }

    function generateDailyRecipeNotifications() {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const today = new Date();
        const dayName = days[today.getDay()];
        
        const todaysRecipes = mealPlan[dayName] || [];

        todaysRecipes.forEach(recipe => {
            notifications.push({
                id: `daily-${recipe.id}`,
                type: 'daily',
                title: `Today's Recipe (${today.toLocaleDateString()})`,
                body: `Time to cook: ${recipe.title}`,
                recipe: recipe
            });
        });
    }

    function generateUpcomingEventNotifications() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        eventPlans.forEach(event => {
            const eventDate = new Date(event.date + 'T00:00:00');
            let reminderType = null;
            if (eventDate.getTime() === today.getTime()) {
                reminderType = 'Today';
            } else if (eventDate.getTime() === tomorrow.getTime()) {
                reminderType = 'Tomorrow';
            }
            if (reminderType) {
                notifications.push({
                    id: `event-${event.id}`,
                    type: 'event',
                    title: `${reminderType}'s Event: ${event.eventName}`,
                    body: `Scheduled for ${event.time}.`,
                    event: event
                });
            }
        });
    }
    
    function showInitialPopup() {
        if (sessionStorage.getItem('popupShown') || notifications.length === 0) {
            return;
        }
        sessionStorage.setItem('popupShown', 'true');
        
        let currentIndex = 0;
        const modal = document.getElementById('popup-modal');
        if (!modal) return;
        
        function renderPopupContent() {
            const notification = notifications[currentIndex];
             modal.innerHTML = `
                <div class="glass-effect rounded-lg shadow-2xl w-11/12 max-w-md m-4 relative animate-fadeIn">
                    <button id="close-popup-modal-btn" class="absolute top-2 right-4 text-slate-500 hover:text-slate-800 font-bold text-2xl">&times;</button>
                    <div class="p-6 text-center">
                        <h2 class="text-2xl font-extrabold mb-2">${notification.title}</h2>
                        <p class="text-slate-600 mb-4">${notification.body}</p>
                        <div class="flex justify-between items-center">
                            <button id="prev-popup-btn" class="p-2 rounded-full hover:bg-slate-100 disabled:opacity-50" ${currentIndex === 0 ? 'disabled' : ''}>&lt;</button>
                            <span class="text-sm font-semibold">${currentIndex + 1} / ${notifications.length}</span>
                            <button id="next-popup-btn" class="p-2 rounded-full hover:bg-slate-100 disabled:opacity-50" ${currentIndex === notifications.length - 1 ? 'disabled' : ''}>&gt;</button>
                        </div>
                    </div>
                </div>
            `;
            
            const closeBtn = modal.querySelector('#close-popup-modal-btn');
            if (closeBtn) closeBtn.addEventListener('click', closeModal);
            
            const prevBtn = modal.querySelector('#prev-popup-btn');
            const nextBtn = modal.querySelector('#next-popup-btn');
            if (prevBtn) prevBtn.addEventListener('click', () => { if(currentIndex > 0) { currentIndex--; renderPopupContent(); } });
            if (nextBtn) nextBtn.addEventListener('click', () => { if(currentIndex < notifications.length - 1) { currentIndex++; renderPopupContent(); } });
        }
        
         const closeModal = () => {
            modal.classList.add('modal-hidden');
            modal.classList.remove('modal-visible');
        };

        modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
        
        renderPopupContent();
        modal.classList.remove('modal-hidden');
        modal.classList.add('modal-visible');
    }

    function renderNotificationsPage() {
        const container = document.getElementById('notifications-list');
        if (!container) return;
        if (notifications.length === 0) {
            container.innerHTML = noResultsHTML("You have no new notifications.");
            return;
        }

        container.innerHTML = notifications.map(notification => {
             return `
                <div class="bg-white p-4 rounded-lg shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div>
                        <p class="font-bold text-slate-800">${notification.title}</p>
                        <p class="text-sm text-slate-600 mt-1">${notification.body}</p>
                    </div>
                    <div class="flex gap-2 w-full sm:w-auto">
                        <button data-notification-id="${notification.id}" class="notification-cook-btn flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold py-2 px-3 rounded-md transition">Cook</button>
                        <button data-notification-id="${notification.id}" class="notification-decline-btn flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-bold py-2 px-3 rounded-md transition">Dismiss</button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    function handleNotificationsPageClick(e) {
        const target = e.target;
        const notificationId = target.dataset.notificationId;
        if (!notificationId) return;

        const notification = notifications.find(n => n.id === notificationId);
        if (!notification) return;

        if (target.classList.contains('notification-cook-btn')) {
            if(notification.type === 'daily'){
                openRecipeModal(notification.recipe.id);
            } else if (notification.type === 'event') {
                navigate('search');
                const container = document.getElementById('search-results');
                if (container) {
                    document.getElementById('pantry-recommendations').innerHTML = '';
                    container.innerHTML = `<h2 class="text-3xl font-extrabold text-slate-800 mb-4">Event Menu: ${notification.event.eventName}</h2>`;
                    renderRecipes(notification.event.menu || [], container, { draggable: false });
                }
            }
        }

        notifications = notifications.filter(n => n.id !== notificationId);
        saveNotifications();
        renderNotificationsPage();
        updateNotificationBadge();
    }
    
    function saveEventPlans() { localStorage.setItem('eventPlans', JSON.stringify(eventPlans)); }
    function openEventModal(eventId = null) {
        const isEditing = eventId !== null;
        const event = isEditing ? eventPlans.find(p => p.id === eventId) : null;
        tempEventMenu = isEditing ? [...(event ? event.menu : [])] : [];

        const modal = document.getElementById('event-modal');
        if (!modal) return;
        modal.classList.remove('modal-hidden');
        modal.classList.add('modal-visible');
        modal.innerHTML = `
            <div class="glass-effect rounded-lg shadow-2xl w-11/12 max-w-2xl m-4 relative animate-fadeIn">
                <button id="close-event-modal-btn" class="absolute top-4 right-4 text-slate-500 hover:text-slate-800 text-3xl font-bold">&times;</button>
                <div class="p-6 max-h-[85vh] overflow-y-auto">
                    <h2 class="text-3xl font-extrabold mb-6">${isEditing ? 'Edit Event' : 'Create a New Event'}</h2>
                    <form id="event-plan-form" class="space-y-4">
                         <input type="hidden" id="event-id" value="${eventId || ''}">
                        <div>
                            <label for="event-name" class="block text-sm font-medium text-slate-700">Event Name</label>
                            <input type="text" id="event-name" required class="mt-1 block w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500" value="${event?.eventName || ''}">
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label for="event-date" class="block text-sm font-medium text-slate-700">Date</label>
                                <input type="date" id="event-date" required class="mt-1 block w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500" value="${event?.date || ''}">
                            </div>
                            <div>
                                <label for="event-time" class="block text-sm font-medium text-slate-700">Time</label>
                                <input type="time" id="event-time" required class="mt-1 block w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500" value="${event?.time || ''}">
                            </div>
                        </div>
                         <div>
                            <label for="event-description" class="block text-sm font-medium text-slate-700">Description</label>
                            <textarea id="event-description" rows="3" class="mt-1 block w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500">${event?.description || ''}</textarea>
                        </div>
                         <div class="border-t pt-4">
                            <h3 class="text-lg font-semibold text-slate-800 mb-2">Menu for the Day</h3>
                            <input type="text" id="event-recipe-search" placeholder="Search recipes to add..." class="w-full p-2 border border-slate-300 rounded-md">
                            <div id="event-recipe-search-results" class="mt-2 max-h-40 overflow-y-auto"></div>
                            <div id="event-menu-list" class="mt-2 space-y-2"></div>
                        </div>
                        <div class="pt-4 flex justify-end">
                            <button type="submit" class="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-md">${isEditing ? 'Save Changes' : 'Create Event'}</button>
                        </div>
                    </form>
                </div>
            </div>`;
        
        renderEventMenu();
        
        const closeModal = () => {
            modal.classList.add('modal-hidden');
            modal.classList.remove('modal-visible');
        };

        const closeBtn = modal.querySelector('#close-event-modal-btn');
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        const searchInput = modal.querySelector('#event-recipe-search');
        if (searchInput) searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => searchRecipesForModal(e.target.value, '#event-recipe-search-results'), 500);
        });

        const form = modal.querySelector('#event-plan-form');
        if (form) form.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = {
                eventName: document.getElementById('event-name').value,
                date: document.getElementById('event-date').value,
                time: document.getElementById('event-time').value,
                description: document.getElementById('event-description').value,
                menu: [...tempEventMenu]
            };
            const eventIdInput = document.getElementById('event-id').value;
            if (eventIdInput) {
                const eventIndex = eventPlans.findIndex(p => p.id === eventIdInput);
                if (eventIndex > -1) {
                    eventPlans[eventIndex] = { ...eventPlans[eventIndex], ...formData };
                     showFeedbackMessage('Event plan updated!', 'success');
                }
            } else {
                const newEvent = { id: `evt_${Date.now()}`, ...formData };
                eventPlans.push(newEvent);
                addHistoryEvent('eventplan', newEvent);
                showFeedbackMessage('New event created!', 'success');
            }
            saveEventPlans();
            renderHistory();
            closeModal();
        });

        // Attach event listener for adding recipes to event menu
        modal.addEventListener('click', (e) => {
            const addBtn = e.target.closest('.add-recipe-to-event-btn');
            if (addBtn) {
                const recipe = JSON.parse(addBtn.dataset.recipe);
                if (!tempEventMenu.some(r => r.id === recipe.id)) {
                    tempEventMenu.push(recipe);
                    renderEventMenu();
                }
                const searchInput = modal.querySelector('#event-recipe-search');
                if (searchInput) searchInput.value = '';
                const results = modal.querySelector('#event-recipe-search-results');
                if (results) results.innerHTML = '';
            }
        });
    }
    
    async function searchRecipesForModal(query, resultsContainerSelector) {
        const resultsContainer = document.querySelector(resultsContainerSelector);
        if (!resultsContainer) return;
        if (!query || query.length < 3) {
            resultsContainer.innerHTML = '';
            return;
        }
        resultsContainer.innerHTML = `<div class="text-center p-8"><svg class="animate-spin h-10 w-10 text-emerald-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>`;
        const url = `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(query)}&addRecipeInformation=true&number=5&apiKey=${API_KEY}`;
        const response = await fetchAPI(url);
        
        if (response && response.results && response.results.length > 0) {
             const buttonClass = resultsContainerSelector === '#add-recipe-search-results' ? 'add-recipe-to-plan-btn' : 'add-recipe-to-event-btn';
            resultsContainer.innerHTML = response.results.map(recipe => `
                <div class="p-2 hover:bg-slate-100 cursor-pointer flex items-center gap-2 ${buttonClass}" data-recipe='${JSON.stringify(recipe)}'>
                    <img src="${recipe.image || 'https://placehold.co/40x40'}" class="w-10 h-10 rounded-sm object-cover" alt="${recipe.title}">
                    <span class="truncate">${recipe.title}</span>
                </div>
            `).join('');
        } else {
            resultsContainer.innerHTML = `<p class="p-2 text-sm text-slate-500">No results found.</p>`;
        }
    }
    
    function openAddRecipeModal(day) {
        const modal = document.getElementById('add-recipe-modal');
        if (!modal) return;
        modal.classList.remove('modal-hidden');
        modal.classList.add('modal-visible');
        modal.innerHTML = `
            <div class="glass-effect rounded-lg shadow-2xl w-11/12 max-w-lg m-4 relative animate-fadeIn">
                <button id="close-add-recipe-modal-btn" class="absolute top-4 right-4 text-slate-500 hover:text-slate-800 text-3xl font-bold">&times;</button>
                <div class="p-6">
                    <h2 class="text-2xl font-extrabold mb-4">Add a Recipe to ${day}</h2>
                    <input type="text" id="add-recipe-search" placeholder="Search for a recipe..." class="w-full p-2 border border-slate-300 rounded-md mb-2">
                    <div id="add-recipe-search-results" class="max-h-60 overflow-y-auto"></div>
                </div>
            </div>`;
        
        const closeModal = () => {
            modal.classList.add('modal-hidden');
            modal.classList.remove('modal-visible');
        };

        const closeBtn = modal.querySelector('#close-add-recipe-modal-btn');
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

        const searchInput = modal.querySelector('#add-recipe-search');
        if (searchInput) searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => searchRecipesForModal(e.target.value, '#add-recipe-search-results'), 500);
        });

        const resultsContainer = modal.querySelector('#add-recipe-search-results');
        if (resultsContainer) resultsContainer.addEventListener('click', (e) => {
            const addBtn = e.target.closest('.add-recipe-to-plan-btn');
            if(addBtn){
                const recipe = JSON.parse(addBtn.dataset.recipe);
                 if (!mealPlan[day]) {
                    mealPlan[day] = [];
                }
                mealPlan[day].push({ id: recipe.id, title: recipe.title });
                saveMealPlan();
                renderMealPlanner();
                showFeedbackMessage(`'${recipe.title}' added to ${day}`, 'success');
                closeModal();
            }
        });
    }
    
    function renderEventMenu() {
        const menuListContainer = document.getElementById('event-menu-list');
        if (!menuListContainer) return;
        menuListContainer.innerHTML = tempEventMenu.map((recipe, index) => `
            <div class="p-2 bg-emerald-50 rounded flex items-center justify-between text-sm">
                <span class="truncate">${recipe.title}</span>
                <button type="button" data-index="${index}" class="text-red-500 font-bold text-lg remove-recipe-from-event-btn">&times;</button>
            </div>
        `).join('');
        
        menuListContainer.querySelectorAll('.remove-recipe-from-event-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                tempEventMenu.splice(index, 1);
                renderEventMenu();
            });
        });
    }
    
    function openSidebar() { 
        if (sidebarMenu) sidebarMenu.classList.remove('-translate-x-full'); 
        if (sidebarOverlay) sidebarOverlay.classList.remove('hidden'); 
    }
    function closeSidebar() { 
        if (sidebarMenu) sidebarMenu.classList.add('-translate-x-full'); 
        if (sidebarOverlay) sidebarOverlay.classList.add('hidden'); 
    }
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            if (darkModeToggle) darkModeToggle.checked = true;
        } else {
            document.documentElement.classList.remove('dark');
            if (darkModeToggle) darkModeToggle.checked = false;
        }
    }
    function handleDarkModeToggle() {
        const theme = darkModeToggle.checked ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
        applyTheme(theme);
    }

    // --- INITIALIZE THE APP ---
    if(landingPage) {
        initializeLandingPage();
    }

    // Theme initialization
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme) {
        applyTheme(savedTheme);
    } else if (systemPrefersDark) {
        applyTheme('dark');
    } else {
        applyTheme('light');
    }

    // Initial renders
    if (mainApp && !mainApp.classList.contains('hidden')) {
        initializeApp();
    }
});
