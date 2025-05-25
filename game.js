class HockeyGame {
    constructor() {
        console.log('HockeyGame constructor called');
        this.canvas = document.getElementById('hockey-rink');
        this.ctx = this.canvas.getContext('2d');
        this.mouseX = this.canvas.width / 2 || 0;
        this.mouseY = this.canvas.height / 2 || 0;
        this.players = [];
        this.puckTrail = [];
        this.scores = { red: 0, blue: 0 };
        console.log('Initial scores:', this.scores);
        
        // Puck physics
        this.puck = {
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            radius: 10,
            collisionRadius: 7, // Smaller collision detection
            controlled: true,
            lastMouseMove: Date.now(),
            lastDirectionalShot: 0,
            lastTouchedBy: null, // Track which player last touched the puck
            recentCollisions: [], // Track recent collisions for scrum detection
            scrumCooldown: 0 // Prevent collisions during scrums
        };
        
        // Game state
        this.gameState = 'playing'; // 'playing', 'goal', 'countdown'
        this.countdown = 0;
        this.countdownStartTime = 0;
        this.scoringTeam = null;
        
        this.init();
    }

    init() {
        this.setupCanvas();
        
        // Initialize puck and mouse at center ice after canvas is set up
        this.puck.x = this.canvas.width / 2;
        this.puck.y = this.canvas.height / 2;
        this.mouseX = this.canvas.width / 2;
        this.mouseY = this.canvas.height / 2;
        
        console.log(`Puck initialized at: (${this.puck.x}, ${this.puck.y}), Mouse at: (${this.mouseX}, ${this.mouseY})`);
        
        this.createPlayers();
        this.setupEventListeners();
        this.animate();
    }

    setupCanvas() {
        const resize = () => {
            // NHL rink is 200ft x 85ft (ratio: 2.35:1)
            const maxWidth = Math.min(window.innerWidth * 0.9, 1200);
            const maxHeight = Math.min(window.innerHeight * 0.8, 600);
            
            // Maintain NHL rink aspect ratio
            if (maxWidth / maxHeight > 2.35) {
                this.canvas.height = maxHeight;
                this.canvas.width = maxHeight * 2.35;
            } else {
                this.canvas.width = maxWidth;
                this.canvas.height = maxWidth / 2.35;
            }
            
            // Scale factor from NHL dimensions (200ft x 85ft) to canvas pixels
            this.scale = this.canvas.width / 200;
            
            // If puck is at origin, center it
            if (this.puck && this.puck.x === 0 && this.puck.y === 0) {
                this.puck.x = this.canvas.width / 2;
                this.puck.y = this.canvas.height / 2;
                console.log(`Puck repositioned in resize to: (${this.puck.x}, ${this.puck.y})`);
            }
        };
        resize();
        window.addEventListener('resize', resize);
    }

    createPlayers() {
        const colors = {
            red: '#ff7f7f',
            blue: '#87ceeb'
        };

        for (let team of ['red', 'blue']) {
            for (let i = 0; i < 3; i++) {
                const x = team === 'red' 
                    ? this.canvas.width * 0.25 
                    : this.canvas.width * 0.75;
                const y = this.canvas.height * (0.3 + i * 0.2);
                
                this.players.push({
                    x: x,
                    y: y,
                    vx: 0,
                    vy: 0,
                    team: team,
                    color: colors[team],
                    size: 3 * this.scale, // Scale based on rink size (3ft diameter)
                    speed: 0.5 * this.scale, // Scale speed (0.5 ft/frame)
                    baseSpeed: 0.5 * this.scale,
                    angle: 0,
                    // Fatigue and shift tracking
                    timeOnIce: Date.now(),
                    fatigueStartTime: null,
                    dramaticSlowdownTime: Date.now() + (38000 + Math.random() * 14000), // 38-52 seconds
                    shiftChangeEligibleTime: Date.now() + 33000, // 33 seconds
                    isChanging: false,
                    replacementTimeoutId: null, // Track pending replacement
                    actualVx: 0,
                    actualVy: 0
                });
            }
        }
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const newMouseX = e.clientX - rect.left;
            const newMouseY = e.clientY - rect.top;
            
            // Calculate mouse velocity for puck physics
            if (this.puck.controlled) {
                this.puck.vx = newMouseX - this.mouseX;
                this.puck.vy = newMouseY - this.mouseY;
                
                // Limit mouse velocity to prevent unrealistic speeds
                const maxSpeed = 15;
                const speed = Math.sqrt(this.puck.vx * this.puck.vx + this.puck.vy * this.puck.vy);
                if (speed > maxSpeed) {
                    this.puck.vx = (this.puck.vx / speed) * maxSpeed;
                    this.puck.vy = (this.puck.vy / speed) * maxSpeed;
                }
            }
            
            this.mouseX = newMouseX;
            this.mouseY = newMouseY;
            this.puck.lastMouseMove = Date.now();
        });

        // Set custom cursor for the entire page
        const style = document.createElement('style');
        style.textContent = `
            * {
                cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="none" stroke="white" stroke-width="2" opacity="0.8"/><circle cx="10" cy="10" r="3" fill="white" opacity="0.6"/></svg>') 10 10, auto !important;
            }
        `;
        document.head.appendChild(style);
    }

    handleGoal(scoringTeam) {
        // Prevent multiple goal calls
        if (this.gameState !== 'playing') {
            console.log('Goal already being processed, ignoring...');
            return;
        }
        
        console.log(`handleGoal called for team: ${scoringTeam}`);
        console.log(`Scores before: Red ${this.scores.red} - Blue ${this.scores.blue}`);
        
        // Set game state immediately to prevent multiple calls
        this.gameState = 'goal';
        
        // Increment score
        this.scores[scoringTeam]++;
        
        console.log(`Scores after: Red ${this.scores.red} - Blue ${this.scores.blue}`);
        
        // Update HTML scoreboard
        this.updateScoreboard();
        
        console.log(`GOAL! ${scoringTeam.toUpperCase()} team scores! Score: Red ${this.scores.red} - Blue ${this.scores.blue}`);
        
        // Set other game state properties
        this.scoringTeam = scoringTeam;
        this.countdown = 3;
        
        // Stop puck
        this.puck.vx = 0;
        this.puck.vy = 0;
        this.puck.controlled = false;
        
        // Clean up any ongoing shift changes
        this.cleanupShiftChanges();
        
        // Position players for face-off after a brief delay
        setTimeout(() => this.positionForFaceoff(), 1000);
    }
    
    updateScoreboard() {
        // Update red team score
        const redScoreElements = document.querySelectorAll('.red-team .score');
        redScoreElements.forEach(element => {
            element.textContent = this.scores.red;
        });
        
        // Update blue team score
        const blueScoreElements = document.querySelectorAll('.blue-team .score');
        blueScoreElements.forEach(element => {
            element.textContent = this.scores.blue;
        });
        
        console.log('Scoreboard updated - Red:', this.scores.red, 'Blue:', this.scores.blue);
    }
    
    positionForFaceoff() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const faceoffRadius = 15 * this.scale;
        
        // Position puck at center
        this.puck.x = centerX;
        this.puck.y = centerY;
        this.puck.vx = 0;
        this.puck.vy = 0;
        
        // Get players by team
        const redPlayers = this.players.filter(p => p.team === 'red');
        const bluePlayers = this.players.filter(p => p.team === 'blue');
        
        // Log player counts for debugging
        console.log(`Face-off positioning: Red players: ${redPlayers.length}, Blue players: ${bluePlayers.length}`);
        
        // Position one player from each team at center face-off circle
        if (redPlayers.length > 0 && bluePlayers.length > 0) {
            // Center face-off players - closer to puck
            const faceoffDistance = 20; // Much closer to the puck
            
            redPlayers[0].x = centerX - faceoffDistance;
            redPlayers[0].y = centerY;
            redPlayers[0].vx = 0;
            redPlayers[0].vy = 0;
            redPlayers[0].angle = 0; // Facing right (toward puck)
            
            bluePlayers[0].x = centerX + faceoffDistance;
            bluePlayers[0].y = centerY;
            bluePlayers[0].vx = 0;
            bluePlayers[0].vy = 0;
            bluePlayers[0].angle = Math.PI; // Facing left (toward puck)
            
            // Position other players at neutral zone dots
            const blueLineDistance = 75 * this.scale;
            const neutralDotX1 = blueLineDistance + (5 * this.scale);
            const neutralDotX2 = this.canvas.width - blueLineDistance - (5 * this.scale);
            const neutralDotY = 22.5 * this.scale;
            
            // Place remaining players and make them face the puck
            if (redPlayers.length > 1) {
                redPlayers[1].x = neutralDotX1;
                redPlayers[1].y = neutralDotY;
                redPlayers[1].vx = 0;
                redPlayers[1].vy = 0;
                // Calculate angle to face puck
                const dx = centerX - redPlayers[1].x;
                const dy = centerY - redPlayers[1].y;
                redPlayers[1].angle = Math.atan2(dy, dx);
            }
            if (redPlayers.length > 2) {
                redPlayers[2].x = neutralDotX1;
                redPlayers[2].y = this.canvas.height - neutralDotY;
                redPlayers[2].vx = 0;
                redPlayers[2].vy = 0;
                // Calculate angle to face puck
                const dx = centerX - redPlayers[2].x;
                const dy = centerY - redPlayers[2].y;
                redPlayers[2].angle = Math.atan2(dy, dx);
            }
            
            if (bluePlayers.length > 1) {
                bluePlayers[1].x = neutralDotX2;
                bluePlayers[1].y = neutralDotY;
                bluePlayers[1].vx = 0;
                bluePlayers[1].vy = 0;
                // Calculate angle to face puck
                const dx = centerX - bluePlayers[1].x;
                const dy = centerY - bluePlayers[1].y;
                bluePlayers[1].angle = Math.atan2(dy, dx);
            }
            if (bluePlayers.length > 2) {
                bluePlayers[2].x = neutralDotX2;
                bluePlayers[2].y = this.canvas.height - neutralDotY;
                bluePlayers[2].vx = 0;
                bluePlayers[2].vy = 0;
                // Calculate angle to face puck
                const dx = centerX - bluePlayers[2].x;
                const dy = centerY - bluePlayers[2].y;
                bluePlayers[2].angle = Math.atan2(dy, dx);
            }
        }
        
        // Start countdown
        this.gameState = 'countdown';
        this.countdownStartTime = Date.now();
    }
    
    updateCountdown() {
        if (this.gameState === 'countdown') {
            const elapsed = Date.now() - this.countdownStartTime;
            const newCountdown = Math.max(0, 3 - Math.floor(elapsed / 1000));
            
            if (this.countdown !== newCountdown) {
                this.countdown = newCountdown;
                
                if (this.countdown === 0) {
                    // Resume game
                    this.gameState = 'playing';
                    this.puck.controlled = false;
                    
                    // Launch puck in random direction
                    const randomAngle = Math.random() * Math.PI * 2;
                    const initialSpeed = 8 + Math.random() * 4; // Random speed between 8-12
                    this.puck.vx = Math.cos(randomAngle) * initialSpeed;
                    this.puck.vy = Math.sin(randomAngle) * initialSpeed;
                }
            }
        }
    }

    updatePuck() {
        // Don't update puck during goal celebration or countdown
        if (this.gameState !== 'playing') {
            return;
        }
        
        // Check if mouse has been stationary for 500ms
        if (Date.now() - this.puck.lastMouseMove > 500) {
            this.puck.controlled = false;
        }
        
        if (this.puck.controlled) {
            // Puck follows mouse - clear collision tracking
            this.puck.lastTouchedBy = null;
            this.puck.recentCollisions = [];
            this.puck.scrumCooldown = 0;
            const constrainedPos = this.constrainPuckPosition(this.mouseX, this.mouseY);
            this.puck.x = constrainedPos.x;
            this.puck.y = constrainedPos.y;
        } else {
            // Store position before movement
            const oldX = this.puck.x;
            const oldY = this.puck.y;
            
            // Physics update
            this.puck.x += this.puck.vx;
            this.puck.y += this.puck.vy;
            
            // Friction
            this.puck.vx *= 0.98;
            this.puck.vy *= 0.98;
            
            // Check wall collisions
            const cornerRadius = 28 * this.scale;
            const margin = this.puck.collisionRadius;
            
            // Check corners
            const inTopLeftCorner = this.puck.x < cornerRadius && this.puck.y < cornerRadius;
            const inTopRightCorner = this.puck.x > this.canvas.width - cornerRadius && this.puck.y < cornerRadius;
            const inBottomLeftCorner = this.puck.x < cornerRadius && this.puck.y > this.canvas.height - cornerRadius;
            const inBottomRightCorner = this.puck.x > this.canvas.width - cornerRadius && this.puck.y > this.canvas.height - cornerRadius;
            
            let bounced = false;
            
            if (inTopLeftCorner || inTopRightCorner || inBottomLeftCorner || inBottomRightCorner) {
                // Handle corner bounces
                let cx, cy;
                if (inTopLeftCorner) {
                    cx = cornerRadius;
                    cy = cornerRadius;
                } else if (inTopRightCorner) {
                    cx = this.canvas.width - cornerRadius;
                    cy = cornerRadius;
                } else if (inBottomLeftCorner) {
                    cx = cornerRadius;
                    cy = this.canvas.height - cornerRadius;
                } else {
                    cx = this.canvas.width - cornerRadius;
                    cy = this.canvas.height - cornerRadius;
                }
                
                const dx = this.puck.x - cx;
                const dy = this.puck.y - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist > cornerRadius - margin) {
                    // Corner collision
                    const normal = Math.atan2(dy, dx);
                    
                    // Position puck at edge
                    this.puck.x = cx + Math.cos(normal) * (cornerRadius - margin);
                    this.puck.y = cy + Math.sin(normal) * (cornerRadius - margin);
                    
                    // Reflect velocity
                    const dot = this.puck.vx * Math.cos(normal) + this.puck.vy * Math.sin(normal);
                    this.puck.vx -= 2 * dot * Math.cos(normal);
                    this.puck.vy -= 2 * dot * Math.sin(normal);
                    
                    bounced = true;
                }
            } else {
                // Handle straight wall bounces
                if (this.puck.x <= margin) {
                    this.puck.x = margin;
                    this.puck.vx = Math.abs(this.puck.vx);
                    bounced = true;
                } else if (this.puck.x >= this.canvas.width - margin) {
                    this.puck.x = this.canvas.width - margin;
                    this.puck.vx = -Math.abs(this.puck.vx);
                    bounced = true;
                }
                
                if (this.puck.y <= margin) {
                    this.puck.y = margin;
                    this.puck.vy = Math.abs(this.puck.vy);
                    bounced = true;
                } else if (this.puck.y >= this.canvas.height - margin) {
                    this.puck.y = this.canvas.height - margin;
                    this.puck.vy = -Math.abs(this.puck.vy);
                    bounced = true;
                }
            }
            
            // Check goal collisions
            this.checkGoalCollisions(oldX, oldY, margin);
            
            // Re-capture puck if mouse moves near it
            const mouseDist = Math.sqrt(Math.pow(this.mouseX - this.puck.x, 2) + Math.pow(this.mouseY - this.puck.y, 2));
            if (mouseDist < 30 && Date.now() - this.puck.lastMouseMove < 100) {
                this.puck.controlled = true;
            }
        }
    }

    checkGoalCollisions(oldX, oldY, margin) {
        const goalLineDistance = 11 * this.scale;
        const goalWidth = 6 * this.scale;
        const goalDepth = 4 * this.scale;
        const goalY = (this.canvas.height - goalWidth) / 2;
        
        // Define goal rectangles (left, top, right, bottom)
        const leftGoal = {
            left: goalLineDistance - goalDepth,
            top: goalY,
            right: goalLineDistance,
            bottom: goalY + goalWidth,
            team: 'blue'
        };
        
        const rightGoal = {
            left: this.canvas.width - goalLineDistance,
            top: goalY,
            right: this.canvas.width - goalLineDistance + goalDepth,
            bottom: goalY + goalWidth,
            team: 'red'
        };
        
        this.checkGoalArea(oldX, oldY, margin, leftGoal);
        this.checkGoalArea(oldX, oldY, margin, rightGoal);
    }
    
    checkRectangleCollision(puckX, puckY, vx, vy, rect, margin) {
        // Check each wall of the rectangle
        const collisions = [];
        
        // Left wall - could be back wall OR goal line depending on which goal
        if (puckX >= rect.left - margin && puckX <= rect.left + margin) {
            // For right goal, left wall is the goal line - check if puck is in goal mouth
            const isRightGoal = rect.left > this.canvas.width / 2;
            const inGoalMouth = isRightGoal && puckY > rect.top && puckY < rect.bottom;
            
            // Skip collision only if this is a goal line and puck is in goal mouth
            if (!inGoalMouth) {
                if (puckY >= rect.top - margin && puckY <= rect.bottom + margin) {
                    if (vx > 0) { // Moving right into left wall
                        collisions.push({ wall: 'left', newX: rect.left - margin, newVx: -Math.abs(vx) });
                    }
                }
            }
        }
        
        // Right wall - could be back wall OR goal line depending on which goal  
        if (puckX >= rect.right - margin && puckX <= rect.right + margin) {
            // For left goal, right wall is the goal line - check if puck is in goal mouth
            const isLeftGoal = rect.right < this.canvas.width / 2;
            const inGoalMouth = isLeftGoal && puckY > rect.top && puckY < rect.bottom;
            
            // Skip collision only if this is a goal line and puck is in goal mouth
            if (!inGoalMouth) {
                if (puckY >= rect.top - margin && puckY <= rect.bottom + margin) {
                    if (vx < 0) { // Moving left into right wall
                        collisions.push({ wall: 'right', newX: rect.right + margin, newVx: Math.abs(vx) });
                    }
                }
            }
        }
        
        // Top wall - use very small margin (almost 0) for goal mouth
        if (puckX >= rect.left && puckX <= rect.right) {
            // Use minimal collision detection (1 pixel) to allow easy goal entry
            const topMargin = 1;
            if (puckY >= rect.top - topMargin && puckY <= rect.top + topMargin) {
                if (vy > 0) { // Moving down into top wall
                    collisions.push({ wall: 'top', newY: rect.top - topMargin, newVy: -Math.abs(vy) });
                }
            }
        }
        
        // Bottom wall - use very small margin (almost 0) for goal mouth
        if (puckX >= rect.left && puckX <= rect.right) {
            // Use minimal collision detection (1 pixel) to allow easy goal entry
            const bottomMargin = 1;
            if (puckY >= rect.bottom - bottomMargin && puckY <= rect.bottom + bottomMargin) {
                if (vy < 0) { // Moving up into bottom wall
                    collisions.push({ wall: 'bottom', newY: rect.bottom + bottomMargin, newVy: Math.abs(vy) });
                }
            }
        }
        
        return collisions;
    }
    
    checkGoalArea(oldX, oldY, margin, goal) {
        // Quick bounds check
        if (this.puck.x < goal.left - margin * 2 || this.puck.x > goal.right + margin * 2 ||
            this.puck.y < goal.top - margin * 2 || this.puck.y > goal.bottom + margin * 2) {
            return;
        }
        
        // Check for goal scoring with more forgiving bounds on the inside
        const goalTolerance = margin / 2; // Half the collision margin for more forgiving goal detection
        if (this.gameState === 'playing' && 
            this.puck.y > goal.top - goalTolerance && 
            this.puck.y < goal.bottom + goalTolerance) {
            if (goal.team === 'blue' && this.puck.x < goal.right && oldX >= goal.right) {
                this.handleGoal('blue');
                return;
            } else if (goal.team === 'red' && this.puck.x > goal.left && oldX <= goal.left) {
                this.handleGoal('red');
                return;
            }
        }
        
        // Check collisions
        const collisions = this.checkRectangleCollision(
            this.puck.x, this.puck.y, 
            this.puck.vx, this.puck.vy, 
            goal, margin
        );
        
        if (collisions.length > 0) {
            // Apply the first collision (could be improved to handle corner cases)
            const collision = collisions[0];
            
            if (collision.newX !== undefined) {
                this.puck.x = collision.newX;
                this.puck.vx = collision.newVx;
            }
            if (collision.newY !== undefined) {
                this.puck.y = collision.newY;
                this.puck.vy = collision.newVy;
            }
            
            console.log(`Goal collision: ${goal.team} goal ${collision.wall} wall`);
        }
    }

    checkLeftGoal(oldX, oldY, margin, goalLineDistance, goalWidth, goalDepth, goalY) {
        const goalLine = goalLineDistance;
        const goalBack = goalLineDistance - goalDepth;
        const goalTop = goalY;
        const goalBottom = goalY + goalWidth;
        
        // Debug: log when puck is near left goal
        if (this.puck.x < goalLine + 20 && this.puck.x > goalBack - 20 &&
            this.puck.y > goalTop - 20 && this.puck.y < goalBottom + 20) {
            console.log(`Left goal area: puck(${this.puck.x.toFixed(1)}, ${this.puck.y.toFixed(1)}) goalBack=${goalBack.toFixed(1)} goalLine=${goalLine.toFixed(1)} bounds=${goalTop.toFixed(1)}-${goalBottom.toFixed(1)}`);
        }
        
        // Quick bounds check
        if (this.puck.x > goalLine + margin + 5 || this.puck.x < goalBack - margin - 5 ||
            this.puck.y > goalBottom + margin + 5 || this.puck.y < goalTop - margin - 5) {
            return;
        }

        // Check for goal scoring
        if (this.gameState === 'playing') {
            if (this.puck.x < goalLine && oldX >= goalLine &&
                this.puck.y > goalTop && this.puck.y < goalBottom) {
                this.handleGoal('blue');
                return;
            }
        }

        // Check collisions - more forgiving bounds
        let collision = false;
        let newX = this.puck.x;
        let newY = this.puck.y;

        // Back wall - check position and velocity
        if (this.puck.x < goalBack + margin && this.puck.x > goalBack - margin &&
            this.puck.y > goalTop - margin && this.puck.y < goalBottom + margin) {
            
            const onOutsideOfGoal = this.puck.x > goalBack; // Right of back wall = outside goal
            const movingIntoWall = (onOutsideOfGoal && this.puck.vx < 0) || (!onOutsideOfGoal && this.puck.vx > 0);
            
            if (movingIntoWall) {
                if (onOutsideOfGoal) {
                    // Outside goal, moving left into wall - bounce right
                    newX = goalBack + margin;
                    this.puck.vx = Math.abs(this.puck.vx);
                } else {
                    // Inside goal, moving right into wall - bounce left
                    newX = goalBack - margin;
                    this.puck.vx = -Math.abs(this.puck.vx);
                }
                collision = true;
                console.log(`Left goal back wall collision: outside=${onOutsideOfGoal}, vx=${this.puck.vx.toFixed(1)}`);
            }
        }
        // Top wall - check if puck is inside goal area horizontally and hitting top
        else if (this.puck.y < goalTop + margin && this.puck.y > goalTop - margin &&
                 this.puck.x > goalBack - margin && this.puck.x < goalLine + margin) {
            newY = goalTop + margin;
            this.puck.vy = Math.abs(this.puck.vy);
            collision = true;
            console.log('Left goal top wall collision');
        }
        // Bottom wall - check if puck is inside goal area horizontally and hitting bottom
        else if (this.puck.y > goalBottom - margin && this.puck.y < goalBottom + margin &&
                 this.puck.x > goalBack - margin && this.puck.x < goalLine + margin) {
            newY = goalBottom - margin;
            this.puck.vy = -Math.abs(this.puck.vy);
            collision = true;
            console.log('Left goal bottom wall collision');
        }

        if (collision) {
            this.puck.x = newX;
            this.puck.y = newY;
        }
    }

    checkRightGoal(oldX, oldY, margin, goalLineDistance, goalWidth, goalDepth, goalY) {
        const goalLine = this.canvas.width - goalLineDistance;
        const goalBack = this.canvas.width - goalLineDistance + goalDepth;
        const goalTop = goalY;
        const goalBottom = goalY + goalWidth;
        
        // Quick bounds check
        if (this.puck.x < goalLine - margin - 5 || this.puck.x > goalBack + margin + 5 ||
            this.puck.y > goalBottom + margin + 5 || this.puck.y < goalTop - margin - 5) {
            return;
        }

        // Check for goal scoring
        if (this.gameState === 'playing') {
            if (this.puck.x > goalLine && oldX <= goalLine &&
                this.puck.y > goalTop && this.puck.y < goalBottom) {
                this.handleGoal('red');
                return;
            }
        }

        // Check collisions - more forgiving bounds
        let collision = false;
        let newX = this.puck.x;
        let newY = this.puck.y;

        // Back wall - check position and velocity
        if (this.puck.x > goalBack - margin && this.puck.x < goalBack + margin &&
            this.puck.y > goalTop - margin && this.puck.y < goalBottom + margin) {
            
            const onOutsideOfGoal = this.puck.x < goalBack; // Left of back wall = outside goal
            const movingIntoWall = (onOutsideOfGoal && this.puck.vx > 0) || (!onOutsideOfGoal && this.puck.vx < 0);
            
            if (movingIntoWall) {
                if (onOutsideOfGoal) {
                    // Outside goal, moving right into wall - bounce left
                    newX = goalBack - margin;
                    this.puck.vx = -Math.abs(this.puck.vx);
                } else {
                    // Inside goal, moving left into wall - bounce right
                    newX = goalBack + margin;
                    this.puck.vx = Math.abs(this.puck.vx);
                }
                collision = true;
                console.log(`Right goal back wall collision: outside=${onOutsideOfGoal}, vx=${this.puck.vx.toFixed(1)}`);
            }
        }
        // Top wall - check if puck is inside goal area horizontally and hitting top
        else if (this.puck.y < goalTop + margin && this.puck.y > goalTop - margin &&
                 this.puck.x > goalLine - margin && this.puck.x < goalBack + margin) {
            newY = goalTop + margin;
            this.puck.vy = Math.abs(this.puck.vy);
            collision = true;
            console.log('Right goal top wall collision');
        }
        // Bottom wall - check if puck is inside goal area horizontally and hitting bottom
        else if (this.puck.y > goalBottom - margin && this.puck.y < goalBottom + margin &&
                 this.puck.x > goalLine - margin && this.puck.x < goalBack + margin) {
            newY = goalBottom - margin;
            this.puck.vy = -Math.abs(this.puck.vy);
            collision = true;
            console.log('Right goal bottom wall collision');
        }

        if (collision) {
            this.puck.x = newX;
            this.puck.y = newY;
        }
    }
    
    updatePlayerFatigue(player) {
        const currentTime = Date.now();
        const timeOnIce = currentTime - player.timeOnIce;
        
        // Start gradual fatigue after 10 seconds
        if (timeOnIce > 10000 && !player.fatigueStartTime) {
            player.fatigueStartTime = currentTime;
        }
        
        // Calculate current speed based on fatigue
        let speedMultiplier = 1.0;
        
        if (player.fatigueStartTime) {
            const fatigueTime = currentTime - player.fatigueStartTime;
            // Gradual slowdown over time (reaches ~80% speed by 28 seconds of fatigue)
            speedMultiplier = Math.max(0.6, 1.0 - (fatigueTime / 140000)); // Gradual decline
        }
        
        // Dramatic slowdown if past the dramatic slowdown time
        if (currentTime > player.dramaticSlowdownTime) {
            speedMultiplier = Math.min(speedMultiplier, 0.3); // Down to 30% of base speed
        }
        
        // Apply minimum speed floor
        const newSpeed = Math.max(0.5, player.baseSpeed * speedMultiplier);
        player.speed = newSpeed;
    }

    getBenchPosition(team) {
        const blueLineDistance = 75 * this.scale;
        return {
            x: team === 'red' ? blueLineDistance : this.canvas.width - blueLineDistance,
            y: 20 // Top wall, slightly below edge
        };
    }

    checkShiftChange(player) {
        const currentTime = Date.now();
        
        // Don't check if already changing or not eligible yet
        if (player.isChanging || currentTime < player.shiftChangeEligibleTime) {
            return;
        }
        
        // Check prevention conditions
        // 1. Don't change if this player last touched the puck
        if (this.puck.lastTouchedBy === player) {
            return;
        }
        
        // 2. Don't change if this is the closest opposing player to the puck
        const opposingTeam = player.team === 'red' ? 'blue' : 'red';
        const opposingPlayers = this.players.filter(p => p.team === opposingTeam && !p.isChanging);
        if (opposingPlayers.length > 0) {
            const closestOpponent = opposingPlayers.reduce((closest, p) => {
                const pDist = Math.sqrt(Math.pow(this.puck.x - p.x, 2) + Math.pow(this.puck.y - p.y, 2));
                const closestDist = Math.sqrt(Math.pow(this.puck.x - closest.x, 2) + Math.pow(this.puck.y - closest.y, 2));
                return pDist < closestDist ? p : closest;
            });
            
            if (player === closestOpponent) {
                return;
            }
        }
        
        // 10% chance per second (checked each frame, so ~10%/60fps)
        if (Math.random() < 0.10 / 60) {
            this.initiateShiftChange(player);
        }
    }

    initiateShiftChange(player) {
        console.log(`${player.team} player initiating shift change after ${((Date.now() - player.timeOnIce) / 1000).toFixed(1)}s on ice`);
        player.isChanging = true;
        
        // Calculate time to reach bench
        const benchPos = this.getBenchPosition(player.team);
        const distanceToBench = Math.sqrt(Math.pow(benchPos.x - player.x, 2) + Math.pow(benchPos.y - player.y, 2));
        const timeToReachBench = (distanceToBench / player.speed) * (1000 / 60); // Convert to milliseconds (assuming 60fps)
        
        // Schedule replacement to appear 1 second before removal (minimum 0ms delay)
        const replacementDelay = Math.max(0, timeToReachBench - 1000);
        
        console.log(`Player will reach bench in ${(timeToReachBench / 1000).toFixed(1)}s, replacement in ${(replacementDelay / 1000).toFixed(1)}s`);
        
        // Store the timeout ID so we can cancel it if needed
        player.replacementTimeoutId = setTimeout(() => {
            this.addReplacementPlayer(player.team);
            player.replacementTimeoutId = null; // Clear after execution
        }, replacementDelay);
    }

    addReplacementPlayer(team) {
        const benchPos = this.getBenchPosition(team);
        const colors = { red: '#ff7f7f', blue: '#87ceeb' };
        
        // Add slight variation to bench entry position
        const entryX = benchPos.x + (Math.random() - 0.5) * 30;
        const entryY = benchPos.y + 20;
        
        this.players.push({
            x: entryX,
            y: entryY,
            vx: 0,
            vy: 0,
            team: team,
            color: colors[team],
            size: 3 * this.scale, // Scale based on rink size
            speed: 0.5 * this.scale,
            baseSpeed: 0.5 * this.scale,
            angle: 0,
            // Fresh player - reset all timers
            timeOnIce: Date.now(),
            fatigueStartTime: null,
            dramaticSlowdownTime: Date.now() + (38000 + Math.random() * 14000),
            shiftChangeEligibleTime: Date.now() + 33000,
            isChanging: false,
            replacementTimeoutId: null,
            actualVx: 0,
            actualVy: 0
        });
        
        console.log(`Fresh ${team} player added to ice`);
    }

    completeShiftChange(player) {
        // Remove the changing player from the game
        const index = this.players.indexOf(player);
        if (index > -1) {
            this.players.splice(index, 1);
            console.log(`${player.team} player completed shift change`);
        }
    }

    cleanupShiftChanges() {
        // Find all players currently changing
        const changingPlayers = this.players.filter(p => p.isChanging);
        
        changingPlayers.forEach(player => {
            console.log(`Goal scored - cleaning up ${player.team} player shift change`);
            
            // Cancel any pending replacement timeout
            if (player.replacementTimeoutId) {
                clearTimeout(player.replacementTimeoutId);
                console.log(`Cancelled pending replacement for ${player.team} player`);
            }
            
            // Remove the changing player
            const index = this.players.indexOf(player);
            if (index > -1) {
                this.players.splice(index, 1);
            }
        });
        
        // After removing all changing players, ensure each team has exactly 3 players
        const teams = ['red', 'blue'];
        teams.forEach(team => {
            const teamPlayers = this.players.filter(p => p.team === team);
            const playersNeeded = 3 - teamPlayers.length;
            
            if (playersNeeded > 0) {
                console.log(`Adding ${playersNeeded} ${team} player(s) to reach 3 total`);
                for (let i = 0; i < playersNeeded; i++) {
                    this.addReplacementPlayerAtNormalPosition(team);
                }
            } else if (playersNeeded < 0) {
                // Too many players - remove extras
                console.log(`Removing ${-playersNeeded} extra ${team} player(s)`);
                for (let i = 0; i < -playersNeeded; i++) {
                    const playerIndex = this.players.findIndex(p => p.team === team);
                    if (playerIndex > -1) {
                        this.players.splice(playerIndex, 1);
                    }
                }
            }
        });
    }

    addReplacementPlayerAtNormalPosition(team) {
        const colors = { red: '#ff7f7f', blue: '#87ceeb' };
        
        // Position like original players (similar to createPlayers logic)
        const x = team === 'red' 
            ? this.canvas.width * 0.25 
            : this.canvas.width * 0.75;
        
        // Find how many players of this team are already on ice to position appropriately
        const teamPlayers = this.players.filter(p => p.team === team);
        const y = this.canvas.height * (0.3 + (teamPlayers.length % 3) * 0.2);
        
        this.players.push({
            x: x,
            y: y,
            vx: 0,
            vy: 0,
            team: team,
            color: colors[team],
            size: 3 * this.scale, // Scale based on rink size
            speed: 0.5 * this.scale,
            baseSpeed: 0.5 * this.scale,
            angle: 0,
            // Fresh player - reset all timers
            timeOnIce: Date.now(),
            fatigueStartTime: null,
            dramaticSlowdownTime: Date.now() + (38000 + Math.random() * 14000),
            shiftChangeEligibleTime: Date.now() + 33000,
            isChanging: false,
            replacementTimeoutId: null,
            actualVx: 0,
            actualVy: 0
        });
        
        console.log(`Replacement ${team} player added at normal position due to goal`);
    }

    updatePlayers() {
        // Don't update players during countdown
        if (this.gameState !== 'playing') {
            return;
        }
        
        const cornerRadius = 28 * this.scale;
        
        // First, determine closest players for each team
        const teams = ['red', 'blue'];
        const closestPlayers = {};
        
        teams.forEach(team => {
            const teamPlayers = this.players.filter(p => p.team === team && !p.isChanging);
            teamPlayers.sort((a, b) => {
                const distA = Math.sqrt(Math.pow(this.puck.x - a.x, 2) + Math.pow(this.puck.y - a.y, 2));
                const distB = Math.sqrt(Math.pow(this.puck.x - b.x, 2) + Math.pow(this.puck.y - b.y, 2));
                return distA - distB;
            });
            closestPlayers[team] = teamPlayers;
        });
        
        this.players.forEach(player => {
            // Update fatigue
            this.updatePlayerFatigue(player);
            
            // Check for shift change eligibility
            this.checkShiftChange(player);
            
            // Store old position to calculate actual movement
            const oldX = player.x;
            const oldY = player.y;
            
            if (player.isChanging) {
                // Player is changing - move toward bench
                const benchX = this.getBenchPosition(player.team).x;
                const benchY = this.getBenchPosition(player.team).y;
                const dx = benchX - player.x;
                const dy = benchY - player.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 5) {
                    const angle = Math.atan2(dy, dx);
                    player.vx = Math.cos(angle) * player.speed;
                    player.vy = Math.sin(angle) * player.speed;
                    player.angle = angle;
                } else {
                    // Player reached bench - remove them
                    this.completeShiftChange(player);
                    return;
                }
            } else {
                // Determine player role based on distance ranking
                const teamRanking = closestPlayers[player.team];
                const playerIndex = teamRanking.indexOf(player);
                
                // Different behavior based on ranking
                if (playerIndex === 0) {
                    // Closest player - aggressive puck chase
                    const dx = this.puck.x - player.x;
                    const dy = this.puck.y - player.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance > 5) {
                        const angle = Math.atan2(dy, dx);
                        player.vx = Math.cos(angle) * player.speed;
                        player.vy = Math.sin(angle) * player.speed;
                        player.angle = angle;
                    }
                } else if (playerIndex === 1) {
                    // Second closest - support position (move toward puck but less aggressively)
                    const dx = this.puck.x - player.x;
                    const dy = this.puck.y - player.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance > 50) { // Stay further back
                        const angle = Math.atan2(dy, dx);
                        player.vx = Math.cos(angle) * player.speed; // Full speed
                        player.vy = Math.sin(angle) * player.speed;
                        player.angle = angle;
                    } else {
                        // Slow down when close enough
                        player.vx *= 0.9;
                        player.vy *= 0.9;
                    }
                } else {
                    // Third player - defensive position
                    const blueLineDistance = 75 * this.scale;
                    const opposingBlueLineX = player.team === 'red' 
                        ? this.canvas.width - blueLineDistance  // Red team can go up to right blue line
                        : blueLineDistance;  // Blue team can go up to left blue line
                    
                    // Calculate target position - stay between puck and own goal
                    let targetX;
                    if (player.team === 'red') {
                        // Red defends left side - limit forward movement to opposing blue line
                        targetX = Math.min(this.puck.x - 100, opposingBlueLineX);
                        targetX = Math.max(targetX, this.canvas.width * 0.15); // Don't go too far back
                    } else {
                        // Blue defends right side - limit forward movement to opposing blue line
                        targetX = Math.max(this.puck.x + 100, opposingBlueLineX);
                        targetX = Math.min(targetX, this.canvas.width * 0.85); // Don't go too far back
                    }
                    
                    const targetY = this.puck.y; // Mirror puck's vertical position
                    const dx = targetX - player.x;
                    const dy = targetY - player.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Use standard movement toward target position
                    if (distance > 20) {
                        const angle = Math.atan2(dy, dx);
                        player.vx = Math.cos(angle) * player.speed; // Full speed
                        player.vy = Math.sin(angle) * player.speed;
                        player.angle = angle;
                    } else {
                        // Slow down when close to target
                        player.vx *= 0.9;
                        player.vy *= 0.9;
                        // Face the puck when in position
                        const puckDx = this.puck.x - player.x;
                        const puckDy = this.puck.y - player.y;
                        player.angle = Math.atan2(puckDy, puckDx);
                    }
                }
            }

            player.x += player.vx;
            player.y += player.vy;

            player.vx *= 0.95;
            player.vy *= 0.95;

            // Constrain players to rink bounds with rounded corners
            const margin = player.size;
            
            // Check if player is in a corner region
            const inTopLeftCorner = player.x < cornerRadius && player.y < cornerRadius;
            const inTopRightCorner = player.x > this.canvas.width - cornerRadius && player.y < cornerRadius;
            const inBottomLeftCorner = player.x < cornerRadius && player.y > this.canvas.height - cornerRadius;
            const inBottomRightCorner = player.x > this.canvas.width - cornerRadius && player.y > this.canvas.height - cornerRadius;
            
            if (inTopLeftCorner) {
                // Top-left corner
                const cx = cornerRadius;
                const cy = cornerRadius;
                const dx = player.x - cx;
                const dy = player.y - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > cornerRadius - margin) {
                    const angle = Math.atan2(dy, dx);
                    player.x = cx + Math.cos(angle) * (cornerRadius - margin);
                    player.y = cy + Math.sin(angle) * (cornerRadius - margin);
                }
            } else if (inTopRightCorner) {
                // Top-right corner
                const cx = this.canvas.width - cornerRadius;
                const cy = cornerRadius;
                const dx = player.x - cx;
                const dy = player.y - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > cornerRadius - margin) {
                    const angle = Math.atan2(dy, dx);
                    player.x = cx + Math.cos(angle) * (cornerRadius - margin);
                    player.y = cy + Math.sin(angle) * (cornerRadius - margin);
                }
            } else if (inBottomLeftCorner) {
                // Bottom-left corner
                const cx = cornerRadius;
                const cy = this.canvas.height - cornerRadius;
                const dx = player.x - cx;
                const dy = player.y - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > cornerRadius - margin) {
                    const angle = Math.atan2(dy, dx);
                    player.x = cx + Math.cos(angle) * (cornerRadius - margin);
                    player.y = cy + Math.sin(angle) * (cornerRadius - margin);
                }
            } else if (inBottomRightCorner) {
                // Bottom-right corner
                const cx = this.canvas.width - cornerRadius;
                const cy = this.canvas.height - cornerRadius;
                const dx = player.x - cx;
                const dy = player.y - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > cornerRadius - margin) {
                    const angle = Math.atan2(dy, dx);
                    player.x = cx + Math.cos(angle) * (cornerRadius - margin);
                    player.y = cy + Math.sin(angle) * (cornerRadius - margin);
                }
            } else {
                // Straight edges
                player.x = Math.max(margin, Math.min(this.canvas.width - margin, player.x));
                player.y = Math.max(margin, Math.min(this.canvas.height - margin, player.y));
            }
            
            // Check goal collisions for players
            const goalLineDistance = 11 * this.scale;
            const goalWidth = 6 * this.scale;
            const goalDepth = 4 * this.scale;
            const goalY = (this.canvas.height - goalWidth) / 2;
            const goalRadius = goalDepth / 2;
            
            // Left goal collision
            const leftGoalX = goalLineDistance - goalDepth;
            if (player.x < goalLineDistance + margin && player.x > leftGoalX - margin &&
                player.y > goalY - margin && player.y < goalY + goalWidth + margin) {
                
                let collision = false;
                let pushX = player.x;
                let pushY = player.y;
                
                // Check if player is in the goal area
                if (player.x < goalLineDistance && player.x > leftGoalX &&
                    player.y > goalY && player.y < goalY + goalWidth) {
                    
                    // Check rounded corners
                    const backCenterX = leftGoalX + goalRadius;
                    const topCornerY = goalY + goalRadius;
                    const bottomCornerY = goalY + goalWidth - goalRadius;
                    
                    // Top corner
                    if (player.y < topCornerY) {
                        const dx = player.x - backCenterX;
                        const dy = player.y - topCornerY;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (player.x < backCenterX && dist < goalRadius) {
                            collision = true;
                            const angle = Math.atan2(dy, dx);
                            pushX = backCenterX + Math.cos(angle) * (goalRadius + margin);
                            pushY = topCornerY + Math.sin(angle) * (goalRadius + margin);
                        }
                    }
                    // Bottom corner
                    else if (player.y > bottomCornerY) {
                        const dx = player.x - backCenterX;
                        const dy = player.y - bottomCornerY;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (player.x < backCenterX && dist < goalRadius) {
                            collision = true;
                            const angle = Math.atan2(dy, dx);
                            pushX = backCenterX + Math.cos(angle) * (goalRadius + margin);
                            pushY = bottomCornerY + Math.sin(angle) * (goalRadius + margin);
                        }
                    }
                    // Inside straight sections
                    else {
                        collision = true;
                        // Find closest edge
                        const distToFront = goalLineDistance - player.x;
                        const distToBack = player.x - leftGoalX;
                        const distToTop = player.y - goalY;
                        const distToBottom = goalY + goalWidth - player.y;
                        
                        const minDist = Math.min(distToFront, distToBack, distToTop, distToBottom);
                        
                        if (minDist === distToFront) {
                            pushX = goalLineDistance + margin;
                        } else if (minDist === distToBack) {
                            pushX = leftGoalX - margin;
                        } else if (minDist === distToTop) {
                            pushY = goalY - margin;
                        } else {
                            pushY = goalY + goalWidth + margin;
                        }
                    }
                }
                
                if (collision) {
                    player.x = pushX;
                    player.y = pushY;
                }
            }
            
            // Right goal collision
            const rightGoalX = this.canvas.width - goalLineDistance;
            if (player.x > rightGoalX - margin && player.x < rightGoalX + goalDepth + margin &&
                player.y > goalY - margin && player.y < goalY + goalWidth + margin) {
                
                let collision = false;
                let pushX = player.x;
                let pushY = player.y;
                
                // Check if player is in the goal area
                if (player.x > rightGoalX && player.x < rightGoalX + goalDepth &&
                    player.y > goalY && player.y < goalY + goalWidth) {
                    
                    // Check rounded corners
                    const backCenterX = rightGoalX + goalDepth - goalRadius;
                    const topCornerY = goalY + goalRadius;
                    const bottomCornerY = goalY + goalWidth - goalRadius;
                    
                    // Top corner
                    if (player.y < topCornerY) {
                        const dx = player.x - backCenterX;
                        const dy = player.y - topCornerY;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (player.x > backCenterX && dist < goalRadius) {
                            collision = true;
                            const angle = Math.atan2(dy, dx);
                            pushX = backCenterX + Math.cos(angle) * (goalRadius + margin);
                            pushY = topCornerY + Math.sin(angle) * (goalRadius + margin);
                        }
                    }
                    // Bottom corner
                    else if (player.y > bottomCornerY) {
                        const dx = player.x - backCenterX;
                        const dy = player.y - bottomCornerY;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (player.x > backCenterX && dist < goalRadius) {
                            collision = true;
                            const angle = Math.atan2(dy, dx);
                            pushX = backCenterX + Math.cos(angle) * (goalRadius + margin);
                            pushY = bottomCornerY + Math.sin(angle) * (goalRadius + margin);
                        }
                    }
                    // Inside straight sections
                    else {
                        collision = true;
                        // Find closest edge
                        const distToFront = player.x - rightGoalX;
                        const distToBack = rightGoalX + goalDepth - player.x;
                        const distToTop = player.y - goalY;
                        const distToBottom = goalY + goalWidth - player.y;
                        
                        const minDist = Math.min(distToFront, distToBack, distToTop, distToBottom);
                        
                        if (minDist === distToFront) {
                            pushX = rightGoalX - margin;
                        } else if (minDist === distToBack) {
                            pushX = rightGoalX + goalDepth + margin;
                        } else if (minDist === distToTop) {
                            pushY = goalY - margin;
                        } else {
                            pushY = goalY + goalWidth + margin;
                        }
                    }
                }
                
                if (collision) {
                    player.x = pushX;
                    player.y = pushY;
                }
            }

            this.players.forEach(other => {
                if (player !== other) {
                    const dx = other.x - player.x;
                    const dy = other.y - player.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < player.size * 2) {
                        const angle = Math.atan2(dy, dx);
                        const push = (player.size * 2 - distance) / 2;
                        player.x -= Math.cos(angle) * push;
                        player.y -= Math.sin(angle) * push;
                        other.x += Math.cos(angle) * push;
                        other.y += Math.sin(angle) * push;
                    }
                }
            });
            
            // Calculate actual movement speed after all constraints
            player.actualVx = player.x - oldX;
            player.actualVy = player.y - oldY;
        });
    }

    drawRink() {
        // Clear canvas (transparent background)
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Log scores every 60 frames (about once per second)
        if (!this.frameCount) this.frameCount = 0;
        this.frameCount++;
        if (this.frameCount % 60 === 0) {
            console.log(`Drawing scores - Red: ${this.scores.red}, Blue: ${this.scores.blue}`);
        }

        // Create clipping path for rink shape
        const cornerRadius = 28 * this.scale;
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.moveTo(cornerRadius, 0);
        this.ctx.lineTo(this.canvas.width - cornerRadius, 0);
        this.ctx.arc(this.canvas.width - cornerRadius, cornerRadius, cornerRadius, -Math.PI/2, 0);
        this.ctx.lineTo(this.canvas.width, this.canvas.height - cornerRadius);
        this.ctx.arc(this.canvas.width - cornerRadius, this.canvas.height - cornerRadius, cornerRadius, 0, Math.PI/2);
        this.ctx.lineTo(cornerRadius, this.canvas.height);
        this.ctx.arc(cornerRadius, this.canvas.height - cornerRadius, cornerRadius, Math.PI/2, Math.PI);
        this.ctx.lineTo(0, cornerRadius);
        this.ctx.arc(cornerRadius, cornerRadius, cornerRadius, Math.PI, -Math.PI/2);
        this.ctx.closePath();
        this.ctx.clip();

        // Ice surface inside clipping area
        const iceGradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        iceGradient.addColorStop(0, '#1a1a2e');
        iceGradient.addColorStop(1, '#0f0f1e');
        this.ctx.fillStyle = iceGradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw rink outline
        this.ctx.strokeStyle = '#4a4a5a';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(cornerRadius, 0);
        this.ctx.lineTo(this.canvas.width - cornerRadius, 0);
        this.ctx.arc(this.canvas.width - cornerRadius, cornerRadius, cornerRadius, -Math.PI/2, 0);
        this.ctx.lineTo(this.canvas.width, this.canvas.height - cornerRadius);
        this.ctx.arc(this.canvas.width - cornerRadius, this.canvas.height - cornerRadius, cornerRadius, 0, Math.PI/2);
        this.ctx.lineTo(cornerRadius, this.canvas.height);
        this.ctx.arc(cornerRadius, this.canvas.height - cornerRadius, cornerRadius, Math.PI/2, Math.PI);
        this.ctx.lineTo(0, cornerRadius);
        this.ctx.arc(cornerRadius, cornerRadius, cornerRadius, Math.PI, -Math.PI/2);
        this.ctx.closePath();
        this.ctx.stroke();

        // Center red line
        this.ctx.strokeStyle = '#6a6a7a';
        this.ctx.lineWidth = 6;
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();

        // Blue lines (64ft from goal lines, which are 11ft from ends)
        this.ctx.strokeStyle = '#5a5a6a';
        this.ctx.lineWidth = 6;
        const blueLineDistance = 75 * this.scale; // 64 + 11 = 75ft from ends
        
        this.ctx.beginPath();
        this.ctx.moveTo(blueLineDistance, 0);
        this.ctx.lineTo(blueLineDistance, this.canvas.height);
        this.ctx.stroke();
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width - blueLineDistance, 0);
        this.ctx.lineTo(this.canvas.width - blueLineDistance, this.canvas.height);
        this.ctx.stroke();

        // Goal lines (11ft from ends)
        this.ctx.strokeStyle = '#5a5a6a';
        this.ctx.lineWidth = 2;
        const goalLineDistance = 11 * this.scale;
        
        // Left goal line
        this.ctx.beginPath();
        this.ctx.moveTo(goalLineDistance, 0);
        this.ctx.lineTo(goalLineDistance, this.canvas.height);
        this.ctx.stroke();
        
        // Right goal line
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width - goalLineDistance, 0);
        this.ctx.lineTo(this.canvas.width - goalLineDistance, this.canvas.height);
        this.ctx.stroke();

        // Goal creases (6ft radius semicircles)
        const creaseRadius = 6 * this.scale;
        this.ctx.fillStyle = '#2a3545';
        this.ctx.strokeStyle = '#5a5a6a';
        this.ctx.lineWidth = 2;
        
        // Left crease
        this.ctx.beginPath();
        this.ctx.arc(goalLineDistance, this.canvas.height / 2, creaseRadius, -Math.PI/2, Math.PI/2);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        // Right crease
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width - goalLineDistance, this.canvas.height / 2, creaseRadius, Math.PI/2, -Math.PI/2);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();

        // Center ice circle (15ft radius for face-off circle)
        this.ctx.strokeStyle = '#5a5a6a';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width / 2, this.canvas.height / 2, 15 * this.scale, 0, Math.PI * 2);
        this.ctx.stroke();

        // Center dot
        this.ctx.fillStyle = '#8a8a9a';
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width / 2, this.canvas.height / 2, 1 * this.scale, 0, Math.PI * 2);
        this.ctx.fill();

        // Face-off circles in each zone (15ft radius, positioned 31ft from goal line)
        const faceoffX = 31 * this.scale + goalLineDistance;
        const faceoffY1 = 22 * this.scale; // 22ft from centerline
        const faceoffY2 = this.canvas.height - faceoffY1;
        
        this.ctx.strokeStyle = '#5a5a6a';
        this.ctx.lineWidth = 2;
        
        // Left zone circles
        this.ctx.beginPath();
        this.ctx.arc(faceoffX, faceoffY1, 15 * this.scale, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.arc(faceoffX, faceoffY2, 15 * this.scale, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // Right zone circles
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width - faceoffX, faceoffY1, 15 * this.scale, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width - faceoffX, faceoffY2, 15 * this.scale, 0, Math.PI * 2);
        this.ctx.stroke();

        // Face-off dots
        this.ctx.fillStyle = '#8a8a9a';
        this.ctx.beginPath();
        this.ctx.arc(faceoffX, faceoffY1, 1 * this.scale, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(faceoffX, faceoffY2, 1 * this.scale, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width - faceoffX, faceoffY1, 1 * this.scale, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(this.canvas.width - faceoffX, faceoffY2, 1 * this.scale, 0, Math.PI * 2);
        this.ctx.fill();

        // Hash marks on face-off circles (only zone circles, not center)
        this.ctx.strokeStyle = '#5a5a6a';
        this.ctx.lineWidth = 2;
        const hashLength = 2 * this.scale; // Shorter hash marks
        const hashSpacing = 3 * this.scale; // Spacing between the two hash marks
        const circleRadius = 15 * this.scale;
        
        // Draw hash marks only for zone face-off circles
        const zoneCircles = [
            {x: faceoffX, y: faceoffY1},
            {x: faceoffX, y: faceoffY2},
            {x: this.canvas.width - faceoffX, y: faceoffY1},
            {x: this.canvas.width - faceoffX, y: faceoffY2}
        ];
        
        zoneCircles.forEach(circle => {
            // Top hash marks (two marks, starting at circle edge)
            // Left hash mark
            this.ctx.beginPath();
            this.ctx.moveTo(circle.x - hashSpacing/2, circle.y - circleRadius);
            this.ctx.lineTo(circle.x - hashSpacing/2, circle.y - circleRadius - hashLength);
            this.ctx.stroke();
            
            // Right hash mark
            this.ctx.beginPath();
            this.ctx.moveTo(circle.x + hashSpacing/2, circle.y - circleRadius);
            this.ctx.lineTo(circle.x + hashSpacing/2, circle.y - circleRadius - hashLength);
            this.ctx.stroke();
            
            // Bottom hash marks (two marks, starting at circle edge)
            // Left hash mark
            this.ctx.beginPath();
            this.ctx.moveTo(circle.x - hashSpacing/2, circle.y + circleRadius);
            this.ctx.lineTo(circle.x - hashSpacing/2, circle.y + circleRadius + hashLength);
            this.ctx.stroke();
            
            // Right hash mark
            this.ctx.beginPath();
            this.ctx.moveTo(circle.x + hashSpacing/2, circle.y + circleRadius);
            this.ctx.lineTo(circle.x + hashSpacing/2, circle.y + circleRadius + hashLength);
            this.ctx.stroke();
        });

        // Neutral zone face-off dots (closer to center, about 5ft from blue lines)
        const neutralDotX1 = blueLineDistance + (5 * this.scale);
        const neutralDotX2 = this.canvas.width - blueLineDistance - (5 * this.scale);
        const neutralDotY = 22.5 * this.scale; // 22.5ft from boards (same as zone face-off circles)
        
        this.ctx.fillStyle = '#8a8a9a';
        // Left side neutral zone dots
        this.ctx.beginPath();
        this.ctx.arc(neutralDotX1, neutralDotY, 1 * this.scale, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(neutralDotX1, this.canvas.height - neutralDotY, 1 * this.scale, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Right side neutral zone dots
        this.ctx.beginPath();
        this.ctx.arc(neutralDotX2, neutralDotY, 1 * this.scale, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(neutralDotX2, this.canvas.height - neutralDotY, 1 * this.scale, 0, Math.PI * 2);
        this.ctx.fill();

        // Goals (6ft wide, 4ft deep)
        const goalWidth = 6 * this.scale;
        const goalDepth = 4 * this.scale;
        const goalY = (this.canvas.height - goalWidth) / 2;
        const goalRadius = goalDepth / 2; // Rounded back corners
        
        // Draw goal fills first
        this.ctx.fillStyle = '#2a2a3a';
        
        // Left goal fill
        this.ctx.beginPath();
        this.ctx.moveTo(goalLineDistance, goalY);
        this.ctx.lineTo(goalLineDistance - goalDepth + goalRadius, goalY);
        this.ctx.arc(goalLineDistance - goalDepth + goalRadius, goalY + goalRadius, goalRadius, -Math.PI/2, Math.PI, true);
        this.ctx.lineTo(goalLineDistance - goalDepth, goalY + goalWidth - goalRadius);
        this.ctx.arc(goalLineDistance - goalDepth + goalRadius, goalY + goalWidth - goalRadius, goalRadius, Math.PI, Math.PI/2, true);
        this.ctx.lineTo(goalLineDistance, goalY + goalWidth);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Right goal fill
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width - goalLineDistance, goalY);
        this.ctx.lineTo(this.canvas.width - goalLineDistance + goalDepth - goalRadius, goalY);
        this.ctx.arc(this.canvas.width - goalLineDistance + goalDepth - goalRadius, goalY + goalRadius, goalRadius, -Math.PI/2, 0, false);
        this.ctx.lineTo(this.canvas.width - goalLineDistance + goalDepth, goalY + goalWidth - goalRadius);
        this.ctx.arc(this.canvas.width - goalLineDistance + goalDepth - goalRadius, goalY + goalWidth - goalRadius, goalRadius, 0, Math.PI/2, false);
        this.ctx.lineTo(this.canvas.width - goalLineDistance, goalY + goalWidth);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Goal mesh pattern with clipping for rounded shape
        this.ctx.save();
        this.ctx.strokeStyle = '#4a4a5a';
        this.ctx.lineWidth = 1;
        const meshSize = 0.5 * this.scale;
        
        // Left goal mesh with clipping
        this.ctx.beginPath();
        this.ctx.moveTo(goalLineDistance, goalY);
        this.ctx.lineTo(goalLineDistance - goalDepth + goalRadius, goalY);
        this.ctx.arc(goalLineDistance - goalDepth + goalRadius, goalY + goalRadius, goalRadius, -Math.PI/2, Math.PI, true);
        this.ctx.lineTo(goalLineDistance - goalDepth, goalY + goalWidth - goalRadius);
        this.ctx.arc(goalLineDistance - goalDepth + goalRadius, goalY + goalWidth - goalRadius, goalRadius, Math.PI, Math.PI/2, true);
        this.ctx.lineTo(goalLineDistance, goalY + goalWidth);
        this.ctx.closePath();
        this.ctx.clip();
        
        // Draw left goal mesh
        for (let x = goalLineDistance - goalDepth; x < goalLineDistance; x += meshSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, goalY);
            this.ctx.lineTo(x, goalY + goalWidth);
            this.ctx.stroke();
        }
        for (let y = goalY; y <= goalY + goalWidth; y += meshSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(goalLineDistance - goalDepth, y);
            this.ctx.lineTo(goalLineDistance, y);
            this.ctx.stroke();
        }
        this.ctx.restore();
        
        // Right goal mesh with clipping (matching updated goal style)
        this.ctx.save();
        this.ctx.strokeStyle = '#4a4a5a';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width - goalLineDistance, goalY);
        this.ctx.lineTo(this.canvas.width - goalLineDistance + goalDepth - goalRadius, goalY);
        this.ctx.arc(this.canvas.width - goalLineDistance + goalDepth - goalRadius, goalY + goalRadius, goalRadius, -Math.PI/2, 0, false);
        this.ctx.lineTo(this.canvas.width - goalLineDistance + goalDepth, goalY + goalWidth - goalRadius);
        this.ctx.arc(this.canvas.width - goalLineDistance + goalDepth - goalRadius, goalY + goalWidth - goalRadius, goalRadius, 0, Math.PI/2, false);
        this.ctx.lineTo(this.canvas.width - goalLineDistance, goalY + goalWidth);
        this.ctx.closePath();
        this.ctx.clip();
        
        // Draw right goal mesh
        for (let x = this.canvas.width - goalLineDistance; x <= this.canvas.width - goalLineDistance + goalDepth; x += meshSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, goalY);
            this.ctx.lineTo(x, goalY + goalWidth);
            this.ctx.stroke();
        }
        for (let y = goalY; y <= goalY + goalWidth; y += meshSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.canvas.width - goalLineDistance, y);
            this.ctx.lineTo(this.canvas.width - goalLineDistance + goalDepth, y);
            this.ctx.stroke();
        }
        this.ctx.restore();
        
        // Draw goal outlines on top
        this.ctx.strokeStyle = '#6a6a7a';
        this.ctx.lineWidth = 3;
        
        // Left goal outline
        this.ctx.beginPath();
        this.ctx.moveTo(goalLineDistance, goalY);
        this.ctx.lineTo(goalLineDistance - goalDepth + goalRadius, goalY);
        this.ctx.arc(goalLineDistance - goalDepth + goalRadius, goalY + goalRadius, goalRadius, -Math.PI/2, Math.PI, true);
        this.ctx.lineTo(goalLineDistance - goalDepth, goalY + goalWidth - goalRadius);
        this.ctx.arc(goalLineDistance - goalDepth + goalRadius, goalY + goalWidth - goalRadius, goalRadius, Math.PI, Math.PI/2, true);
        this.ctx.lineTo(goalLineDistance, goalY + goalWidth);
        this.ctx.stroke();
        
        // Right goal outline
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width - goalLineDistance, goalY);
        this.ctx.lineTo(this.canvas.width - goalLineDistance + goalDepth - goalRadius, goalY);
        this.ctx.arc(this.canvas.width - goalLineDistance + goalDepth - goalRadius, goalY + goalRadius, goalRadius, -Math.PI/2, 0, false);
        this.ctx.lineTo(this.canvas.width - goalLineDistance + goalDepth, goalY + goalWidth - goalRadius);
        this.ctx.arc(this.canvas.width - goalLineDistance + goalDepth - goalRadius, goalY + goalWidth - goalRadius, goalRadius, 0, Math.PI/2, false);
        this.ctx.lineTo(this.canvas.width - goalLineDistance, goalY + goalWidth);
        this.ctx.stroke();
        
        // Restore context (remove clipping)
        this.ctx.restore();
    }

    drawPlayer(player) {
        this.ctx.save();
        this.ctx.translate(player.x, player.y);
        this.ctx.rotate(player.angle);

        const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, player.size);
        gradient.addColorStop(0, player.color);
        gradient.addColorStop(1, 'transparent');
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.moveTo(player.size, 0);
        this.ctx.lineTo(-player.size/2, -player.size/2);
        this.ctx.lineTo(-player.size/2, player.size/2);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.strokeStyle = player.color;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        this.ctx.restore();
    }

    constrainPuckPosition(x, y) {
        const cornerRadius = 28 * this.scale;
        const margin = this.puck.collisionRadius; // Puck collision radius
        
        // Check if puck is in a corner region
        const inTopLeftCorner = x < cornerRadius && y < cornerRadius;
        const inTopRightCorner = x > this.canvas.width - cornerRadius && y < cornerRadius;
        const inBottomLeftCorner = x < cornerRadius && y > this.canvas.height - cornerRadius;
        const inBottomRightCorner = x > this.canvas.width - cornerRadius && y > this.canvas.height - cornerRadius;
        
        let constrainedX = x;
        let constrainedY = y;
        
        if (inTopLeftCorner) {
            const cx = cornerRadius;
            const cy = cornerRadius;
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > cornerRadius - margin) {
                const angle = Math.atan2(dy, dx);
                constrainedX = cx + Math.cos(angle) * (cornerRadius - margin);
                constrainedY = cy + Math.sin(angle) * (cornerRadius - margin);
            }
        } else if (inTopRightCorner) {
            const cx = this.canvas.width - cornerRadius;
            const cy = cornerRadius;
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > cornerRadius - margin) {
                const angle = Math.atan2(dy, dx);
                constrainedX = cx + Math.cos(angle) * (cornerRadius - margin);
                constrainedY = cy + Math.sin(angle) * (cornerRadius - margin);
            }
        } else if (inBottomLeftCorner) {
            const cx = cornerRadius;
            const cy = this.canvas.height - cornerRadius;
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > cornerRadius - margin) {
                const angle = Math.atan2(dy, dx);
                constrainedX = cx + Math.cos(angle) * (cornerRadius - margin);
                constrainedY = cy + Math.sin(angle) * (cornerRadius - margin);
            }
        } else if (inBottomRightCorner) {
            const cx = this.canvas.width - cornerRadius;
            const cy = this.canvas.height - cornerRadius;
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > cornerRadius - margin) {
                const angle = Math.atan2(dy, dx);
                constrainedX = cx + Math.cos(angle) * (cornerRadius - margin);
                constrainedY = cy + Math.sin(angle) * (cornerRadius - margin);
            }
        } else {
            // Straight edges
            constrainedX = Math.max(margin, Math.min(this.canvas.width - margin, x));
            constrainedY = Math.max(margin, Math.min(this.canvas.height - margin, y));
        }
        
        return { x: constrainedX, y: constrainedY };
    }

    drawCountdown() {
        if (this.gameState === 'countdown' && this.countdown > 0) {
            this.ctx.save();
            this.ctx.font = 'bold 120px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.lineWidth = 4;
            
            const text = this.countdown.toString();
            this.ctx.strokeText(text, this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2);
            
            this.ctx.restore();
        }
    }
    
    checkPuckPlayerCollisions() {
        // Don't check collisions during countdown
        if (this.gameState !== 'playing') {
            return;
        }
        
        // Update scrum cooldown
        if (this.puck.scrumCooldown > 0) {
            this.puck.scrumCooldown -= 1000 / 60; // Decrease by frame time (assuming 60fps)
            if (this.puck.scrumCooldown <= 0) {
                console.log('Scrum cooldown ended');
            }
        }
        
        // Clean up old collisions (older than 100ms)
        const currentTime = Date.now();
        this.puck.recentCollisions = this.puck.recentCollisions.filter(
            collision => currentTime - collision.time < 100
        );
        
        this.players.forEach(player => {
            const dx = this.puck.x - player.x;
            const dy = this.puck.y - player.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = this.puck.collisionRadius + player.size;
            
            if (distance < minDistance) {
                // Skip collision if in scrum cooldown
                if (this.puck.scrumCooldown > 0) {
                    return;
                }
                // Collision detected
                const angle = Math.atan2(dy, dx);
                
                // Check if player is actively moving towards puck (making a play)
                const playerMovingToPuck = (player.actualVx * dx + player.actualVy * dy) > 0; // Positive means moving toward puck
                const playerSpeed = Math.sqrt(player.actualVx * player.actualVx + player.actualVy * player.actualVy);
                const isActivePlay = playerMovingToPuck && playerSpeed > 2;
                
                // 10% chance to pass through if not an active play
                if (!isActivePlay && Math.random() < 0.1) {
                    // Puck passes through - do nothing
                    return;
                }
                
                // Separate puck and player
                const overlap = minDistance - distance;
                this.puck.x += Math.cos(angle) * overlap;
                this.puck.y += Math.sin(angle) * overlap;
                
                // Calculate desired direction towards target net
                let targetAngle = angle; // Default to collision angle
                
                console.log(`Player collision - Team: ${player.team}, Active: ${isActivePlay}, Speed: ${playerSpeed.toFixed(2)}`);
                
                // Check for teammate pass-through conditions
                const isTeammate = this.puck.lastTouchedBy && this.puck.lastTouchedBy.team === player.team;
                const currentPuckSpeed = Math.sqrt(this.puck.vx * this.puck.vx + this.puck.vy * this.puck.vy);
                
                console.log(`Pass-through check: isTeammate=${isTeammate}, speed=${currentPuckSpeed.toFixed(2)}, lastTouched=${this.puck.lastTouchedBy?.team || 'none'}`);
                
                if (isTeammate && currentPuckSpeed > 2) {
                    // Check if puck is moving toward the correct net for this team
                    const targetNetX = player.team === 'red' ? this.canvas.width - (11 * this.scale) : 11 * this.scale;
                    const targetNetY = this.canvas.height / 2; // Center of net
                    
                    // Vector from puck to target net
                    const netDx = targetNetX - this.puck.x;
                    const netDy = targetNetY - this.puck.y;
                    
                    // Check if puck velocity has a component toward the net (dot product)
                    const dotProduct = this.puck.vx * netDx + this.puck.vy * netDy;
                    const movingTowardNet = dotProduct > 0;
                    
                    if (movingTowardNet) {
                        console.log(`Teammate pass-through: ${player.team} player, puck moving toward net`);
                        return; // Skip collision, puck passes through teammate
                    }
                }
                
                // Check if enough time has passed since last directional shot
                const timeSinceLastShot = Date.now() - this.puck.lastDirectionalShot;
                const canUseDirectionalShot = timeSinceLastShot > 500; // 0.5 seconds
                
                if (isActivePlay && playerSpeed > 0.5 && canUseDirectionalShot) {
                    // Determine target net based on team
                    const targetNetX = player.team === 'red' ? 
                        this.canvas.width - (11 * this.scale) : // Right net for red team
                        11 * this.scale; // Left net for blue team
                    const targetNetY = this.canvas.height / 2;
                    
                    console.log(`Target net for ${player.team}: (${targetNetX.toFixed(1)}, ${targetNetY.toFixed(1)})`);
                    
                    // Calculate angle to target net
                    const netDx = targetNetX - player.x;
                    const netDy = targetNetY - player.y;
                    const angleToNet = Math.atan2(netDy, netDx);
                    
                    // Get player's current movement angle
                    const playerAngle = Math.atan2(player.vy, player.vx);
                    
                    console.log(`Angle to net: ${(angleToNet * 180 / Math.PI).toFixed(1)}°, Player angle: ${(playerAngle * 180 / Math.PI).toFixed(1)}°`);
                    
                    // Calculate the difference between desired direction and player movement
                    let angleDiff = angleToNet - playerAngle;
                    
                    // Normalize angle difference to [-π, π]
                    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                    
                    console.log(`Angle difference: ${(angleDiff * 180 / Math.PI).toFixed(1)}°`);
                    
                    // Constrain to maximum 90 degrees (π/2 radians) deviation
                    const maxDeviation = Math.PI / 2;
                    if (Math.abs(angleDiff) <= maxDeviation) {
                        // Player can aim towards net
                        targetAngle = angleToNet;
                        console.log('Using direct angle to net');
                    } else {
                        // Limit to maximum deviation
                        if (angleDiff > 0) {
                            targetAngle = playerAngle + maxDeviation;
                        } else {
                            targetAngle = playerAngle - maxDeviation;
                        }
                        console.log('Using limited deviation angle');
                    }
                    
                    // Add 5 degrees of randomness (convert to radians: 5° = π/36)
                    const randomness = (Math.random() - 0.5) * (Math.PI / 18); // ±5 degrees
                    targetAngle += randomness;
                    
                    console.log(`Final target angle: ${(targetAngle * 180 / Math.PI).toFixed(1)}° (vs collision angle: ${(angle * 180 / Math.PI).toFixed(1)}°)`);
                    
                    // Record the time of this directional shot
                    this.puck.lastDirectionalShot = Date.now();
                } else {
                    if (!canUseDirectionalShot) {
                        console.log('Not using directional shooting - too soon after last shot');
                    } else {
                        console.log('Not using directional shooting - conditions not met');
                    }
                }
                
                // Update last touched player for any collision
                this.puck.lastTouchedBy = player;
                
                // Record this collision
                this.puck.recentCollisions.push({
                    player: player,
                    time: Date.now()
                });
                
                // Check for scrum (multiple different players hitting puck within 100ms)
                const uniquePlayers = new Set(this.puck.recentCollisions.map(c => c.player));
                if (uniquePlayers.size >= 2) {
                    console.log(`Scrum detected! ${uniquePlayers.size} players involved`);
                    this.puck.scrumCooldown = 300; // 300ms cooldown
                    
                    // Clear recent collisions to start fresh after cooldown
                    this.puck.recentCollisions = [];
                }
                
                // Calculate speed based on collision and player movement
                const relativeVx = this.puck.vx - player.vx;
                const relativeVy = this.puck.vy - player.vy;
                const speed = Math.sqrt(relativeVx * relativeVx + relativeVy * relativeVy);
                const shotSpeed = (speed + player.speed) * 1.5;
                
                // Apply the calculated direction and speed
                this.puck.vx = Math.cos(targetAngle) * shotSpeed + player.vx * 0.3;
                this.puck.vy = Math.sin(targetAngle) * shotSpeed + player.vy * 0.3;
                
                // Limit puck speed to maximum
                const maxSpeed = 15;
                const puckSpeed = Math.sqrt(this.puck.vx * this.puck.vx + this.puck.vy * this.puck.vy);
                if (puckSpeed > maxSpeed) {
                    this.puck.vx = (this.puck.vx / puckSpeed) * maxSpeed;
                    this.puck.vy = (this.puck.vy / puckSpeed) * maxSpeed;
                }
                
                // Make puck uncontrolled after hit
                this.puck.controlled = false;
                
                // Visual feedback - add a hit effect
                this.ctx.save();
                this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                this.ctx.lineWidth = 3;
                this.ctx.beginPath();
                this.ctx.arc(player.x, player.y, player.size + 5, targetAngle - 0.5, targetAngle + 0.5);
                this.ctx.stroke();
                this.ctx.restore();
            }
        });
    }
    
    drawPuck() {
        this.puckTrail.push({ x: this.puck.x, y: this.puck.y });
        if (this.puckTrail.length > 10) this.puckTrail.shift();

        this.puckTrail.forEach((point, index) => {
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 5 * (index / this.puckTrail.length), 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(255, 255, 255, ${0.2 * (index / this.puckTrail.length)})`;
            this.ctx.fill();
        });

        // Draw puck with different style if not controlled
        const gradient = this.ctx.createRadialGradient(this.puck.x, this.puck.y, 0, this.puck.x, this.puck.y, 15);
        if (this.puck.controlled) {
            gradient.addColorStop(0, 'white');
            gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
            gradient.addColorStop(1, 'transparent');
        } else {
            gradient.addColorStop(0, '#ffff00');
            gradient.addColorStop(0.5, 'rgba(255, 255, 0, 0.5)');
            gradient.addColorStop(1, 'transparent');
        }
        
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(this.puck.x, this.puck.y, this.puck.radius, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw puck outline
        this.ctx.strokeStyle = this.puck.controlled ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(this.puck.x, this.puck.y, this.puck.radius, 0, Math.PI * 2);
        this.ctx.stroke();
    }

    animate() {
        try {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.drawRink();
            this.updateCountdown();
            this.updatePuck();
            this.updatePlayers();
            this.checkPuckPlayerCollisions();
            this.players.forEach(player => this.drawPlayer(player));
            this.drawPuck();
            this.drawCountdown();
        } catch (error) {
            console.error('Animation error:', error);
            console.error('Current scores when error occurred:', this.scores);
        }

        requestAnimationFrame(() => this.animate());
    }
}

const game = new HockeyGame();