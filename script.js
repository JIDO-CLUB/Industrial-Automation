document.addEventListener('DOMContentLoaded', async () => {
    highlightCurrentPage();
    initializeMobileMenu();
    initializeModals();
    initializeEventForm();
    
    // Check if we are on the home page with the dynamic slider
    if (document.getElementById('dynamic-slider')) {
        await fetchEventsForSlider(); // Fetch events first
    } else {
        initializeSlider(); // Run normally on other pages
    }
});

function highlightCurrentPage() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        if (currentPath.endsWith(link.getAttribute('href')) || (currentPath.endsWith('/') && link.getAttribute('href') === 'index.html')) {
            link.classList.add('active');
        }
    });
}

// --- Dynamic Fetch Logic for Home Page Slider ---
async function fetchEventsForSlider() {
    const sliderContainer = document.getElementById('dynamic-slider');
    const controlsContainer = sliderContainer.querySelector('.slider-controls');
    
    try {
        // 1. Fetch the events.html page
        const response = await fetch('events.html');
        if (!response.ok) throw new Error('Network response was not ok');
        const htmlText = await response.text();

        // 2. Parse the HTML to extract event cards
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        const eventCards = doc.querySelectorAll('.event-card');

        // 3. Clear existing slides (keep controls)
        sliderContainer.innerHTML = '';
        
        // Let's show the first 5 events in the slider
        const recentEvents = Array.from(eventCards).slice(0, 5);

        // 4. Build new slides based on the fetched events
        recentEvents.forEach((card, index) => {
            const title = card.querySelector('.hidden-title').innerText;
            const imgSrc = card.querySelector('.card-img-top').getAttribute('src');
            
            let rawDesc = card.querySelector('.hidden-desc p:nth-of-type(2)')?.innerText || "Join us for this exciting JIDO event.";
            let shortDesc = rawDesc.length > 100 ? rawDesc.substring(0, 100) + '...' : rawDesc;

            const slide = document.createElement('div');
            slide.className = `slide ${index === 0 ? 'active' : ''}`;
            slide.innerHTML = `
                <img src="${imgSrc}" alt="${title}" class="slide-image">
                <div class="slide-overlay"></div>
                <div class="slide-content">
                    <h3>${title}</h3>
                    <p>${shortDesc}</p>
                </div>
            `;
            sliderContainer.appendChild(slide);
        });

        // 5. Re-add controls and start the slider mechanics
        sliderContainer.appendChild(controlsContainer);
        initializeSlider();

    } catch (error) {
        console.error('Error fetching events:', error);
        sliderContainer.innerHTML = '<div style="color:white; text-align:center; padding: 100px 20px;"><h3>Unable to load events.</h3><p>Make sure you are running a local server (like VS Code Live Server).</p></div>';
    }
}

// --- Mobile Menu Logic ---
function initializeMobileMenu() {
    const toggle = document.getElementById('mobile-menu');
    const nav = document.querySelector('.nav-links');
    
    if (toggle && nav) {
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            toggle.classList.toggle('active');
            nav.classList.toggle('active');
            document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
        });
        
        document.addEventListener('click', (e) => {
            if (nav.classList.contains('active') && !nav.contains(e.target) && !toggle.contains(e.target)) {
                toggle.classList.remove('active');
                nav.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
}

// --- Slider Logic ---
function initializeSlider() {
    const slides = document.querySelectorAll('.slide');
    const dotsContainer = document.querySelector('.slider-controls');
    const sliderContainer = document.querySelector('.slider-container');
    
    if (slides.length === 0) return;
    
    dotsContainer.innerHTML = '';
    
    let currentSlideIndex = 0;
    let sliderInterval;
    
    slides.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.classList.add('slider-dot');
        if (index === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goToSlide(index));
        dotsContainer.appendChild(dot);
    });
    
    const dots = document.querySelectorAll('.slider-dot');
    
    function showSlide(index) {
        slides[currentSlideIndex].classList.remove('active');
        dots[currentSlideIndex].classList.remove('active');
        currentSlideIndex = index;
        slides[currentSlideIndex].classList.add('active');
        dots[currentSlideIndex].classList.add('active');
    }
    
    function nextSlide() { showSlide((currentSlideIndex + 1) % slides.length); }
    function prevSlide() { showSlide((currentSlideIndex - 1 + slides.length) % slides.length); }
    
    function goToSlide(index) {
        showSlide(index);
        resetAutoSlide();
    }
    
    function startAutoSlide() { sliderInterval = setInterval(nextSlide, 5000); }
    function resetAutoSlide() { clearInterval(sliderInterval); startAutoSlide(); }
    
    startAutoSlide();

    let touchStartX = 0;
    let touchEndX = 0;

    if (sliderContainer) {
        sliderContainer.addEventListener('touchstart', e => {
            touchStartX = e.changedTouches[0].screenX;
            clearInterval(sliderInterval); 
        }, { passive: true });

        sliderContainer.addEventListener('touchend', e => {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
            startAutoSlide(); 
        }, { passive: true });
    }

    function handleSwipe() {
        const swipeThreshold = 50; 
        if (touchStartX - touchEndX > swipeThreshold) nextSlide(); 
        if (touchEndX - touchStartX > swipeThreshold) prevSlide(); 
    }
}

// --- Modal & Gallery Logic ---
function initializeModals() {
    const overlay = document.getElementById('eventOverlay');
    const title = document.getElementById('modalTitle');
    const desc = document.getElementById('modalDesc');
    
    let lightbox = document.getElementById('lightbox');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'lightbox';
        lightbox.className = 'lightbox';
        lightbox.innerHTML = '<span class="lightbox-close">&times;</span><img id="lightbox-img" src="" alt="Full view">';
        document.body.appendChild(lightbox);
    }
    const lightboxImg = document.getElementById('lightbox-img');

    document.querySelectorAll('.event-card').forEach(card => {
        card.addEventListener('click', () => {
            title.innerText = card.querySelector('.hidden-title').innerText;
            const imagesAttr = card.getAttribute('data-images');
            
            let galleryHTML = '';
            if (imagesAttr && imagesAttr.trim() !== "") {
                galleryHTML = '<div class="modal-gallery">';
                imagesAttr.split(',').forEach(src => {
                    if (src.trim()) {
                        galleryHTML += `<img src="${src.trim()}" alt="Event" loading="lazy">`;
                    }
                });
                galleryHTML += '</div>';
            }

            desc.innerHTML = galleryHTML + card.querySelector('.hidden-desc').innerHTML;
            
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden'; 
        });
    });

    document.addEventListener('click', (e) => {
        if (e.target.matches('.modal-gallery img')) {
            lightboxImg.src = e.target.src;
            lightbox.classList.add('open');
        }
    });

    const modalClose = document.querySelector('.modal-close');
    if (modalClose) {
        modalClose.addEventListener('click', (e) => {
            e.stopPropagation(); 
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        });
    }

    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('open');
                document.body.style.overflow = '';
            }
        });
    }

    lightbox.querySelector('.lightbox-close').addEventListener('click', () => {
        lightbox.classList.remove('open');
    });
}

// --- Form Logic (Supabase Direct Integration) ---
// --- Form Logic (Supabase Direct Integration) ---
function initializeEventForm() {
    const formBox = document.getElementById('eventFormBox');
    const applyBtn = document.getElementById('applyEventBtn');
    const form = document.getElementById('modernEventForm');
    const responseBox = document.getElementById('responseMessage');
    
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpbnZvd3R5cHZjc2NuYm1wZmN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMTMxMDgsImV4cCI6MjA5Mjc4OTEwOH0.eYwnLWfnas3fu5wVP98ARjNoAfGfK2HnFjZmN-oud8E'; 
    const SUPABASE_URL = 'https://uinvowtypvcscnbmpfct.supabase.co/rest/v1/IdeathonRegistration';

    if (applyBtn && formBox) {
        // Ensure form is hidden initially to make the button have a clear effect
        formBox.style.display = 'none';

        applyBtn.addEventListener('click', async () => {
            // Check team count before opening the form
            try {
                const countResponse = await fetch(`${SUPABASE_URL}?select=id`, {
                    method: 'GET',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Range-Unit': 'items',
                        'Prefer': 'count=exact'
                    }
                });
                
                // Supabase returns total count in the Content-Range header (e.g., "0-24/25")
                const contentRange = countResponse.headers.get('content-range');
                if (contentRange) {
                    const totalCount = parseInt(contentRange.split('/')[1], 10);
                    if (totalCount >= 35) {
                        formBox.style.display = 'block';
                        formBox.classList.add('active');
                        applyBtn.style.display = 'none';
                        if(form) form.style.display = 'none';
                        if(responseBox) {
                            responseBox.style.display = 'block';
                            responseBox.className = 'error';
                            responseBox.innerHTML = "<strong>Registration Closed:</strong> The maximum limit of 25 teams has been reached.";
                        }
                        formBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        return;
                    }
                }
            } catch (err) {
                console.error('Could not verify team count:', err);
            }

            formBox.style.display = 'block';
            formBox.classList.add('active');
            
            if(responseBox) responseBox.style.display = 'none';
            if(form) form.reset();
            
            applyBtn.style.display = 'none';
            
            // Smoothly scroll down to the form
            formBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }
    
    if (form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            submitBtn.disabled = true;
            submitBtn.innerText = "Processing...";
            
            const formData = new FormData(form);
            const dataPayload = Object.fromEntries(formData.entries());
            
            // Format participants to integer if it exists
            if (dataPayload.participants) {
                dataPayload.participants = parseInt(dataPayload.participants, 10);
            }
            
            try {
                // Double-check count right before submitting
                const countCheck = await fetch(`${SUPABASE_URL}?select=id`, {
                    method: 'GET',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Range-Unit': 'items',
                        'Prefer': 'count=exact'
                    }
                });
                const rangeHeader = countCheck.headers.get('content-range');
                if (rangeHeader) {
                    const currentTotal = parseInt(rangeHeader.split('/')[1], 10);
                    if (currentTotal >= 35) {
                        throw new Error('Registration closed: The maximum limit of 25 teams has already been reached.');
                    }
                }

                const response = await fetch(SUPABASE_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(dataPayload)
                });
                
                if (!response.ok) {
                    const errData = await response.json();
                    
                    // Intercept database constraint violations (duplicate data)
                    if (errData.code === '23505' || (errData.message && errData.message.includes('duplicate key'))) {
                        throw new Error('A user is already registered using this email or phone number.');
                    }
                    
                    throw new Error(errData.message || 'Failed to submit registration');
                }
                
                if(responseBox) {
                    responseBox.style.display = 'block';
                    responseBox.className = 'success';
                    responseBox.innerText = "Registration successful!";
                }
                form.reset();
                
                // Clear the dynamic participants container if they registered a team
                const dynamicContainer = document.getElementById('dynamic-members-container');
                if(dynamicContainer) {
                    dynamicContainer.innerHTML = '';
                }

            } catch (error) {
                console.error('Submission error:', error);
                if(responseBox) {
                    responseBox.style.display = 'block';
                    responseBox.className = 'error';
                    
                    const errMsg = error.message.toLowerCase();
                    
                    // 1. Detect network blocks (Adblockers, strict firewalls)
                    if (errMsg.includes('failed to fetch') || errMsg.includes('networkerror')) {
                        responseBox.innerHTML = "<strong>Network Blocked:</strong> Your browser or Wi-Fi network is blocking the connection. Please disable adblockers or switch to Mobile Data and try again.";
                    } 
                    // 2. Detect duplicate entries
                    else if (errMsg.includes('already registered')) {
                        responseBox.innerHTML = "<strong>Registration Failed:</strong> A user is already registered using this email or phone number.";
                    } 
                    // 3. Detect max limit reached
                    else if (errMsg.includes('maximum limit') || errMsg.includes('registration closed')) {
                        responseBox.innerHTML = "<strong>Registration Closed:</strong> The maximum limit of 25 teams has been reached.";
                    }
                    // 4. Fallback for any other errors
                    else {
                        responseBox.innerText = "Error: " + error.message; 
                    }
                }
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = "Confirm Registration";
            }
        });
    }
}
