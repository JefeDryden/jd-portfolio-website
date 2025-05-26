// Artistic Effects JavaScript

// Particle System
function createParticles() {
    const particlesContainer = document.getElementById('hero-particles');
    if (!particlesContainer) return;
    
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (Math.random() * 10 + 15) + 's';
        particlesContainer.appendChild(particle);
    }
}


// Parallax Effect
function initParallax() {
    const parallaxElements = document.querySelectorAll('.parallax-element');
    
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        
        parallaxElements.forEach((element, index) => {
            const speed = index % 2 === 0 ? 0.5 : -0.5;
            const yPos = -(scrolled * speed);
            element.style.transform = `translateY(${yPos}px)`;
        });
    });
}

// Magnetic Hover Effect
function initMagneticHover() {
    const magneticElements = document.querySelectorAll('.btn, .nav-link');
    
    magneticElements.forEach(elem => {
        elem.addEventListener('mousemove', (e) => {
            const rect = elem.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            
            elem.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
        });
        
        elem.addEventListener('mouseleave', () => {
            elem.style.transform = 'translate(0, 0)';
        });
    });
}

// 3D Tilt Effect for Cards
function init3DTilt() {
    const tiltElements = document.querySelectorAll('.project-card');
    
    tiltElements.forEach(elem => {
        elem.addEventListener('mousemove', (e) => {
            const rect = elem.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            
            const tiltX = (y - 0.5) * 20;
            const tiltY = (x - 0.5) * -20;
            
            elem.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) translateZ(10px)`;
        });
        
        elem.addEventListener('mouseleave', () => {
            elem.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
        });
    });
}

// Smooth Color Transitions on Scroll
function initColorShift() {
    const sections = document.querySelectorAll('section');
    const navbar = document.querySelector('.navbar');
    
    const colors = [
        { bg: '#667eea', text: '#ffffff' },
        { bg: '#764ba2', text: '#ffffff' },
        { bg: '#f093fb', text: '#212529' },
        { bg: '#4facfe', text: '#212529' },
        { bg: '#00f2fe', text: '#212529' }
    ];
    
    window.addEventListener('scroll', () => {
        const scrollPosition = window.scrollY;
        
        sections.forEach((section, index) => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            
            if (scrollPosition >= sectionTop - 100 && scrollPosition < sectionTop + sectionHeight) {
                const colorIndex = index % colors.length;
                navbar.style.backgroundColor = `${colors[colorIndex].bg}20`;
            }
        });
    });
}

// Animated Skill Bars
function initSkillBars() {
    const skillSection = document.querySelector('.skills-section');
    const skillLists = document.querySelectorAll('.skill-list li');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                skillLists.forEach((skill, index) => {
                    setTimeout(() => {
                        // Create skill bar
                        const skillBar = document.createElement('div');
                        skillBar.className = 'skill-bar';
                        const skillProgress = document.createElement('div');
                        skillProgress.className = 'skill-progress';
                        skillProgress.style.setProperty('--skill-level', Math.random() * 0.3 + 0.7);
                        skillBar.appendChild(skillProgress);
                        skill.appendChild(skillBar);
                    }, index * 100);
                });
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    if (skillSection) {
        observer.observe(skillSection);
    }
}

// Text Reveal Animation
function initTextReveal() {
    const revealElements = document.querySelectorAll('.section-title, .hero-title');
    
    revealElements.forEach(elem => {
        elem.classList.add('reveal-text');
    });
}

// Smooth Scroll Enhancement
function enhanceSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Initialize all effects
document.addEventListener('DOMContentLoaded', () => {
    createParticles();
    initParallax();
    initMagneticHover();
    init3DTilt();
    initColorShift();
    initSkillBars();
    initTextReveal();
    enhanceSmoothScroll();
    
    // Add loading animation
    document.body.classList.add('loaded');
});

// Add morphing background shapes
function createMorphingShapes() {
    const shapes = document.querySelectorAll('.blob-shape');
    shapes.forEach((shape, index) => {
        shape.style.animationDelay = `${index * 2}s`;
    });
}

createMorphingShapes();

