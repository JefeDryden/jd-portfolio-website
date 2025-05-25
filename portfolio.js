// Portfolio JavaScript - Smooth interactions and effects

document.addEventListener('DOMContentLoaded', function() {
    // Smooth scrolling for navigation links
    const navLinks = document.querySelectorAll('a[href^="#"]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Navbar background on scroll
    const navbar = document.getElementById('mainNav');
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.15)';
        } else {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
        }
    });

    // Active navigation highlighting
    const sections = document.querySelectorAll('section');
    const navItems = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (scrollY >= (sectionTop - 200)) {
                current = section.getAttribute('id');
            }
        });

        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href').slice(1) === current) {
                item.classList.add('active');
            }
        });
    });

    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe all feature cards and project cards
    const animatedElements = document.querySelectorAll('.feature-card, .project-card, .skill-category');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    // Game canvas responsive sizing
    function resizeGameCanvas() {
        const gameContainer = document.querySelector('.game-container');
        const canvas = document.getElementById('gameCanvas');
        
        if (gameContainer && canvas) {
            // Mark canvas as externally controlled
            canvas.dataset.externalResize = 'true';
            
            const containerWidth = gameContainer.clientWidth;
            const containerHeight = gameContainer.clientHeight;
            
            // Maintain NHL rink aspect ratio (200:85)
            const gameAspectRatio = 200 / 85; // NHL rink dimensions
            let canvasWidth, canvasHeight;
            
            if (containerWidth / containerHeight > gameAspectRatio) {
                canvasHeight = containerHeight * 0.8;
                canvasWidth = canvasHeight * gameAspectRatio;
            } else {
                canvasWidth = containerWidth * 0.9;
                canvasHeight = canvasWidth / gameAspectRatio;
            }
            
            // Set both actual canvas dimensions and display size
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            canvas.style.width = canvasWidth + 'px';
            canvas.style.height = canvasHeight + 'px';
            
            // Update game scale if it exists
            if (window.gameInstance) {
                window.gameInstance.scale = canvas.width / 200;
                // Only re-center puck if game is already initialized
                if (window.gameInstance.puck && window.gameInstance.players && window.gameInstance.players.length > 0) {
                    window.gameInstance.puck.x = canvas.width / 2;
                    window.gameInstance.puck.y = canvas.height / 2;
                }
            }
        }
    }

    // Resize canvas first, before game initializes
    resizeGameCanvas();
    
    // Also resize when game instance becomes available
    const checkGame = setInterval(() => {
        if (window.gameInstance) {
            resizeGameCanvas();
            clearInterval(checkGame);
        }
    }, 50);
    
    window.addEventListener('resize', resizeGameCanvas);

    // Pause game when not in viewport
    let gameInView = true;
    const gameObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            gameInView = entry.isIntersecting;
            // You can add game pause/resume logic here
            if (window.gameInstance) {
                if (gameInView) {
                    window.gameInstance.resume();
                } else {
                    window.gameInstance.pause();
                }
            }
        });
    }, { threshold: 0.5 });

    const gameCanvas = document.getElementById('gameCanvas');
    if (gameCanvas) {
        gameObserver.observe(gameCanvas);
    }
});

// Add active class styles
const style = document.createElement('style');
style.textContent = `
    .nav-link.active {
        color: var(--accent-color);
    }
    .nav-link.active::after {
        width: 100%;
    }
`;
document.head.appendChild(style);

// Image Modal Functions
function openImageModal(img) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('expandedImg');
    modal.style.display = 'block';
    modalImg.src = img.src;
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
}

function closeImageModal() {
    const modal = document.getElementById('imageModal');
    modal.style.display = 'none';
    
    // Restore body scroll
    document.body.style.overflow = 'auto';
}

// Close modal on Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeImageModal();
    }
});