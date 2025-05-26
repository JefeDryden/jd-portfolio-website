// Technical Effects JavaScript

// Typing animation for hero title
function initTypingEffect() {
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        const text = heroTitle.textContent;
        heroTitle.textContent = '';
        heroTitle.classList.add('typing-text');
        
        let index = 0;
        const typeInterval = setInterval(() => {
            if (index < text.length) {
                heroTitle.textContent += text[index];
                index++;
            } else {
                clearInterval(typeInterval);
                heroTitle.style.borderRight = 'none';
            }
        }, 100);
    }
}

// Add scan line effect
function addScanLine() {
    const scanLine = document.createElement('div');
    scanLine.className = 'scan-line';
    document.body.appendChild(scanLine);
}

// Terminal-style console logs
function initConsoleEffect() {
    const messages = [
        'System initialized...',
        'Loading portfolio modules...',
        'Establishing secure connection...',
        'Rendering UI components...',
        'System ready.'
    ];
    
    messages.forEach((msg, index) => {
        setTimeout(() => {
            console.log(`%cPS C:\\> ${msg}`, 'color: #ffff00; font-family: Consolas, monospace; background: #012456; padding: 2px 5px;');
        }, index * 500);
    });
}

// Add coordinate display on hover
function initCoordinateDisplay() {
    const coordDisplay = document.createElement('div');
    coordDisplay.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        font-family: Consolas, monospace;
        font-size: 0.8rem;
        color: #ffff00;
        background: #012456;
        padding: 0.5rem;
        border: 2px solid #0078d4;
        pointer-events: none;
        z-index: 9999;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    `;
    document.body.appendChild(coordDisplay);
    
    document.addEventListener('mousemove', (e) => {
        coordDisplay.textContent = `X: ${e.clientX.toString().padStart(4, '0')} | Y: ${e.clientY.toString().padStart(4, '0')}`;
    });
}

// Technical grid animation
function initGridPulse() {
    const body = document.querySelector('body');
    setInterval(() => {
        body.style.setProperty('--grid-opacity', '0.05');
        setTimeout(() => {
            body.style.setProperty('--grid-opacity', '0.03');
        }, 100);
    }, 5000);
}

// Add data attributes to skills
function initSkillData() {
    const skills = {
        'Python': 95,
        'R': 85,
        'SQL': 90,
        'JavaScript': 80,
        'Scikit-learn': 92,
        'TensorFlow': 85,
        'PyTorch': 88,
        'Pandas': 95,
        'Matplotlib': 90,
        'Seaborn': 88,
        'Plotly': 85,
        'Tableau': 82,
        'Git': 90,
        'Docker': 78,
        'AWS': 75,
        'Jupyter': 95
    };
    
    const skillLists = document.querySelectorAll('.skill-list li');
    skillLists.forEach(li => {
        const skillName = li.textContent.trim();
        if (skills[skillName]) {
            const skillBar = document.createElement('div');
            skillBar.className = 'skill-bar';
            skillBar.setAttribute('data-skill-level', `${skills[skillName]}%`);
            
            const skillProgress = document.createElement('div');
            skillProgress.className = 'skill-progress';
            skillProgress.style.width = '0%';
            
            skillBar.appendChild(skillProgress);
            li.appendChild(skillBar);
            
            // Animate on scroll
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        setTimeout(() => {
                            skillProgress.style.width = `${skills[skillName]}%`;
                        }, 100);
                        observer.unobserve(entry.target);
                    }
                });
            });
            observer.observe(li);
        }
    });
}

// Matrix rain effect (subtle)
function initMatrixRain() {
    const canvas = document.createElement('canvas');
    canvas.className = 'matrix-bg';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.prepend(canvas);
    
    const ctx = canvas.getContext('2d');
    const columns = Math.floor(canvas.width / 20);
    const drops = new Array(columns).fill(1);
    
    const chars = '01';
    
    function draw() {
        ctx.fillStyle = 'rgba(1, 36, 86, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#0078d4';
        ctx.font = '15px Consolas';
        
        for (let i = 0; i < drops.length; i++) {
            const text = chars[Math.floor(Math.random() * chars.length)];
            ctx.fillText(text, i * 20, drops[i] * 20);
            
            if (drops[i] * 20 > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
    }
    
    setInterval(draw, 100);
    
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
}

// Hover effects for technical elements
function initTechnicalHovers() {
    // Add hover sound effect simulation
    const hoverElements = document.querySelectorAll('.btn, .project-card, .feature-card');
    hoverElements.forEach(elem => {
        elem.addEventListener('mouseenter', () => {
            elem.style.setProperty('--hover-time', Date.now());
        });
    });
}

// Performance monitor
function initPerformanceMonitor() {
    const monitor = document.createElement('div');
    monitor.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        font-family: var(--tech-font);
        font-size: 0.7rem;
        color: var(--tech-gray-light);
        background: rgba(26, 26, 26, 0.9);
        padding: 0.5rem;
        border: 1px solid var(--tech-gray);
        display: none;
        z-index: 9998;
    `;
    monitor.innerHTML = `
        <div>FPS: <span id="fps">60</span></div>
        <div>MEM: <span id="mem">--</span> MB</div>
        <div>TIME: <span id="time">00:00:00</span></div>
    `;
    document.body.appendChild(monitor);
    
    // Toggle with keyboard shortcut
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'd') {
            monitor.style.display = monitor.style.display === 'none' ? 'block' : 'none';
        }
    });
    
    // Update time
    setInterval(() => {
        const now = new Date();
        document.getElementById('time').textContent = 
            now.toTimeString().split(' ')[0];
    }, 1000);
}

// Initialize all effects
document.addEventListener('DOMContentLoaded', () => {
    initTypingEffect();
    initConsoleEffect();
    initCoordinateDisplay();
    initGridPulse();
    initSkillData();
    initMatrixRain();
    initTechnicalHovers();
    initPerformanceMonitor();
    
    // Add PowerShell prompt to console
    console.log('%c' + `
Windows PowerShell
Copyright (C) Microsoft Corporation. All rights reserved.

    ╔═══════════════════════════════════════╗
    ║   JEFF DRYDEN - PORTFOLIO SYSTEM      ║
    ║   Version 2.0.0 | Status: ONLINE      ║
    ╚═══════════════════════════════════════╝

PS C:\\Portfolio> _
    `, 'color: #ffffff; font-family: Consolas, monospace; background: #012456; padding: 10px;');
});

// Smooth section transitions
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