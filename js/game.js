// Global error handler to catch syntax errors and other issues
window.addEventListener('error', function(e) {
    console.error('Global error caught:', e.error || e.message);
    
    // Show error on screen for debugging
    const debugElement = document.getElementById('debug-message');
    if (debugElement) {
        debugElement.textContent = 'Error: ' + (e.error ? e.error.message : e.message);
        debugElement.style.display = 'block';
        debugElement.style.backgroundColor = 'rgba(255,0,0,0.8)';
    }
    
    // Try to recover and continue
    return false;
});

// Use THREE from global scope (loaded via script tag)
// No imports - using global THREE object from script tag
// Stub for GLTFLoader which isn't being used but was imported in original code
const GLTFLoader = function() {
    // This is just a stub since we're not using 3D models in this simple version
    this.load = function() {};
};

// Enhanced debug helper function
function debug(message, isError = false) {
    // Log to console for all messages to help diagnose issues
    console.log(`[IPL Game] ${message}`);
    
    // Show debug message on screen
    const debugElement = document.getElementById('debug-message');
    if (debugElement) {
        debugElement.style.display = 'block';
        debugElement.style.color = '#ffffff';
        debugElement.textContent = message;
        debugElement.style.zIndex = '10000'; // Ensure it's on top
        
        // Style for errors
        if (isError) {
            debugElement.style.backgroundColor = 'rgba(255,0,0,0.8)';
            debugElement.style.fontWeight = 'bold';
            debugElement.style.padding = '15px';
            // Keep error messages visible longer
            setTimeout(() => {
                debugElement.style.display = 'none';
            }, 8000);
        } else {
            debugElement.style.backgroundColor = 'rgba(0,0,0,0.7)';
            debugElement.style.padding = '10px';
            setTimeout(() => {
                debugElement.style.display = 'none';
            }, 3000);
        }
    }
    
    // If this is an error, also try to show a fullscreen error message
    if (isError && message.includes('404')) {
        showErrorOverlay("Some game files couldn't be loaded. The game might not work correctly. Please try refreshing the page.");
    }
}

// Show a full-screen error overlay
function showErrorOverlay(message) {
    // Check if overlay already exists
    let errorOverlay = document.getElementById('error-overlay');
    
    if (!errorOverlay) {
        // Create error overlay
        errorOverlay = document.createElement('div');
        errorOverlay.id = 'error-overlay';
        
        // Style the overlay
        Object.assign(errorOverlay.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(0,0,0,0.85)',
            color: 'white',
            padding: '20px',
            borderRadius: '10px',
            zIndex: '10000',
            maxWidth: '80%',
            textAlign: 'center',
            boxShadow: '0 0 20px rgba(0,0,0,0.5)'
        });
        
        // Add the message
        errorOverlay.innerHTML = `
            <h3 style="color:#e74c3c; margin-bottom:15px;">Game Error</h3>
            <p>${message}</p>
            <button style="margin-top:15px; padding:8px 15px; background:#3498db; border:none; color:white; border-radius:5px; cursor:pointer;" 
                    onclick="location.reload()">Refresh Page</button>
        `;
        
        // Add to the body
        document.body.appendChild(errorOverlay);
    }
}

// Game state variables
let renderer, scene, camera, controls;
let batsman, ball, stadium, pitch;
let selectedPlayer = null;
let totalRuns = 0;
let ballsLeft = 6;
let ballIsMoving = false;
let isGameStarted = false;
let isGameOver = false;
let swipeStartX, swipeStartY;
let playerModels = {};
let soundEffects = {};

// Player stats (will affect gameplay)
const playerStats = {
    virat: { power: 92, technique: 98, timing: 95, name: "Virat Kohli" },
    rohit: { power: 95, technique: 92, timing: 94, name: "Rohit Sharma" }
};

// Initialize the game
console.log("Document loaded, waiting for DOMContentLoaded event");
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded fired, initializing game");
    init();
});

function init() {
    debug("Initializing game");
    
    try {
        // Pre-check for browser compatibility
        preCheckCompatibility();
        
        // Ensure Three.js is loaded
        if (!window.THREE) {
            throw new Error("Three.js is not loaded");
        }
        
        debug("Three.js detected");
        
        // Generate dynamic icons for PWA if needed
        generateIcons();
        
        // Setup player selection and show it immediately
        setupPlayerSelection();
        document.getElementById('player-selection').style.display = 'flex';
        
        // Skip loading screen as per user request
        document.getElementById('loading-screen').style.display = 'none';
        
        // Set up the 3D scene
        debug("Setting up 3D scene");
        setupScene();
        
        // Load game assets
        debug("Loading game assets");
        loadAssets().then(() => {
            debug("Assets loaded, player selection already visible");
            
            // Ensure player selection is visible
            document.getElementById('player-selection').style.display = 'flex';
            
            // Start animation loop
            animate();
        }).catch(error => {
            debug("Error loading assets: " + error.message, true);
        });
        
        // Setup event handlers
        setupEventHandlers();
        
    } catch (error) {
        debug("Initialization error: " + error.message, true);
        // Show error on loading screen
        const loadingText = document.querySelector('#loading-screen p');
        if (loadingText) {
            loadingText.textContent = "Error starting game. Please check console and refresh.";
            loadingText.style.color = "red";
        }
    }
}

// Pre-check for browser compatibility issues
function preCheckCompatibility() {
    // Check for WebGL support
    if (!window.WebGLRenderingContext) {
        throw new Error("Your browser does not support WebGL");
    }
    
    // Check for Three.js compatibility
    if (window.THREE) {
        debug("Checking Three.js version compatibility...");
        
        // Check for essential Three.js features
        if (!window.THREE.WebGLRenderer) {
            throw new Error("Missing WebGLRenderer - incompatible Three.js version");
        }
        
        // Check for texture support
        if (!window.THREE.Texture && !window.THREE.CanvasTexture) {
            debug("Warning: Limited texture support", true);
        }
        
        // Check for essential geometry support
        if (!window.THREE.BoxGeometry && !window.THREE.BoxBufferGeometry) {
            debug("Warning: Missing basic geometry support", true);
        }
    }
    
    debug("Compatibility check complete");
}

function generateIcons() {
    // Dynamic icon generation for PWA using canvas
    const sizes = [16, 192, 512]; // favicon, app icon, large app icon
    
    sizes.forEach(size => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        
        // Create a cricket-themed icon
        // Background gradient
        const gradient = ctx.createLinearGradient(0, 0, size, size);
        gradient.addColorStop(0, '#1a2a6c');  // Blue
        gradient.addColorStop(0.5, '#b21f1f'); // Red
        gradient.addColorStop(1, '#fdbb2d');  // Yellow
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        
        // Draw cricket ball
        const ballSize = size * 0.6;
        const ballX = size / 2;
        const ballY = size / 2;
        
        ctx.fillStyle = '#e53935'; // Red
        ctx.beginPath();
        ctx.arc(ballX, ballY, ballSize / 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw cricket seam
        ctx.strokeStyle = 'white';
        ctx.lineWidth = size * 0.05;
        ctx.beginPath();
        ctx.arc(ballX, ballY, ballSize / 3, 0, Math.PI, true);
        ctx.stroke();
        
        // Add a link element if it doesn't exist
        let link;
        const fileName = size === 16 ? 'favicon' : `icon-${size}`;
        
        if (size === 16) {
            link = document.querySelector('link[rel="icon"]');
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.head.appendChild(link);
            }
        } else if (size === 192) {
            link = document.querySelector('link[rel="apple-touch-icon"]');
            if (!link) {
                link = document.createElement('link');
                link.rel = 'apple-touch-icon';
                document.head.appendChild(link);
            }
        }
        
        if (link) {
            link.href = canvas.toDataURL('image/png');
        }
        
        // For debugging and saving as file (would use Blob and download in a real app)
        console.log(`Generated ${fileName}.png`);
    });
}

function setupPlayerSelection() {
    // Create placeholder images for players if not available
    createPlaceholderPlayerImages();
    
    const playerCards = document.querySelectorAll('.player-card');
    playerCards.forEach(card => {
        card.addEventListener('click', () => {
            // Remove selection from all cards
            playerCards.forEach(c => c.classList.remove('selected'));
            // Add selection to clicked card
            card.classList.add('selected');
            // Set selected player
            selectedPlayer = card.getAttribute('data-player');
            
            // CHANGE 1: Start game immediately when player is selected
            setTimeout(() => {
                startGame();
            }, 300); // Short delay for visual feedback of selection
        });
    });
    
    // Keep this for backward compatibility
    document.getElementById('start-game').addEventListener('click', () => {
        if (!selectedPlayer) {
            alert('Please select a player first!');
            return;
        }
        
        startGame();
    });
}

function setupScene() {
    try {
        debug("Creating WebGL renderer");
        // Create renderer
        renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('game-canvas'),
            antialias: true 
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        
        debug("Creating scene");
        // Create scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB); // Sky blue background
        
        debug("Setting up camera");
        // Create camera - CHANGE 4: Fixed front view of the pitch
        camera = new THREE.PerspectiveCamera(
            60, 
            window.innerWidth / window.innerHeight, 
            0.1, 
            1000
        );
        // Position camera for a good view of the pitch from the front side
        camera.position.set(0, 5, 15);
        
        debug("Adding lights");
        // Create lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Brighter ambient light
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2); // Brighter main light
        directionalLight.position.set(5, 10, 7.5);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.right = 15;
        directionalLight.shadow.camera.left = -15;
        directionalLight.shadow.camera.top = 15;
        directionalLight.shadow.camera.bottom = -15;
        scene.add(directionalLight);        
        debug("Setting up controls");
        // CHANGE 5: User should not be able to move the screen
        // Create a dummy controls object that does nothing - effectively locking the view
        controls = {
            update: function() { return true; },
            enableZoom: false,
            enablePan: false,
            enableRotate: false,
            minPolarAngle: 0,
            maxPolarAngle: 0,
            minAzimuthAngle: 0,
            maxAzimuthAngle: 0
        };
        
        // Handle window resize
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        debug("Scene setup completed successfully");
    } catch (error) {
        debug("Error in setupScene: " + error.message);
        console.error("Scene setup error:", error);
    }
}

function createPlaceholderPlayerImages() {
    // Since we're now using divs instead of img tags, we don't need this function
    // It's kept for compatibility but doesn't do anything
    debug("Using inline player cards instead of images");
}

function loadAssets() {
    return new Promise((resolve) => {
        try {
            // Create cricket field
            createCricketField();
            
            // Create simple placeholder models
            createPlaceholderModels();
            
            // Load sound effects
            loadSoundEffects();
            
            // Signal that assets are loaded
            console.log("Assets loaded successfully!");
            setTimeout(resolve, 1000);
        } catch (error) {
            console.error("Error loading game assets:", error);
            // Show error on loading screen and resolve anyway
            const loadingText = document.querySelector('#loading-screen p');
            if (loadingText) {
                loadingText.textContent = "Error loading game assets. Please refresh the page.";
                loadingText.style.color = "red";
            }
            setTimeout(resolve, 2000);
        }
    });
}

function createCricketField() {
    // Create the ground
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x3a9d23,  // Green
        side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Create the pitch - ENLARGED (wider and more prominent)
    const pitchGeometry = new THREE.PlaneGeometry(5, 20);
    const pitchMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xd6c394,  // Light brown
        side: THREE.DoubleSide
    });
    pitch = new THREE.Mesh(pitchGeometry, pitchMaterial);
    pitch.rotation.x = -Math.PI / 2;
    pitch.position.y = 0.02; // Slightly raised for better visibility
    pitch.receiveShadow = true;
    scene.add(pitch);
    
    // Create special pitch markings (crease lines)
    const creaseGeometry = new THREE.PlaneGeometry(6, 0.1);
    const creaseMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide
    });
    
    // Batsman end crease
    const batsmanCrease = new THREE.Mesh(creaseGeometry, creaseMaterial);
    batsmanCrease.rotation.x = -Math.PI / 2;
    batsmanCrease.position.set(0, 0.025, -8);
    scene.add(batsmanCrease);
    
    // Bowler end crease
    const bowlerCrease = new THREE.Mesh(creaseGeometry, creaseMaterial);
    bowlerCrease.rotation.x = -Math.PI / 2;
    bowlerCrease.position.set(0, 0.025, 8);
    scene.add(bowlerCrease);
    
    // Create boundary line
    const boundaryGeometry = new THREE.RingGeometry(40, 40.5, 32);
    const boundaryMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        side: THREE.DoubleSide
    });
    const boundary = new THREE.Mesh(boundaryGeometry, boundaryMaterial);
    boundary.rotation.x = -Math.PI / 2;
    boundary.position.y = 0.02;
    scene.add(boundary);
    
    // Create sky backdrop (blue sky instead of gray stadium)
    const skyGeometry = new THREE.CylinderGeometry(60, 60, 25, 32, 1, true);
    const skyMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x1E88E5, // Blue sky color
        side: THREE.BackSide
    });
    stadium = new THREE.Mesh(skyGeometry, skyMaterial);
    stadium.position.y = 12.5; // Higher position for more sky visibility
    scene.add(stadium);
    
    // Add Hindustan Times IPL 2025 banner
    createIPLBanner();
    
    // Add simple crowd
    createCrowd();
}

// Create Hindustan Times IPL 2025 banner
function createIPLBanner() {
    try {
        // Create a banner at the back of the stadium
        const bannerGroup = new THREE.Group();
    
    // Banner background
    const bannerGeometry = new THREE.PlaneGeometry(30, 5);
    const bannerMaterial = new THREE.MeshStandardMaterial({
        color: 0x0c2461, // Deep blue
        side: THREE.DoubleSide
    });
    const banner = new THREE.Mesh(bannerGeometry, bannerMaterial);
    bannerGroup.add(banner);
    
    // Create text as a separate geometry
    const textGeometry = new THREE.PlaneGeometry(28, 3);
    const textMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xffffff,
        emissiveIntensity: 0.2,
        side: THREE.DoubleSide
    });
    const textPlane = new THREE.Mesh(textGeometry, textMaterial);
    textPlane.position.z = 0.1;
    
    // Since we can't easily create text in Three.js without additional libraries,
    // we'll create a canvas texture with the text
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    // Fill background
    context.fillStyle = '#0c2461';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw gradient
    const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, '#0c2461');   // Deep blue
    gradient.addColorStop(0.3, '#1e3799'); // Mid blue
    gradient.addColorStop(0.7, '#1e3799'); // Mid blue
    gradient.addColorStop(1, '#0c2461');   // Deep blue
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add text
    context.font = 'bold 100px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // Text with gradient
    const textGradient = context.createLinearGradient(0, 0, 0, 100);
    textGradient.addColorStop(0, '#f5f6fa');  // White
    textGradient.addColorStop(0.5, '#f5f6fa'); // White
    textGradient.addColorStop(1, '#dcdde1');  // Light gray
    context.fillStyle = textGradient;
    
    // Add text shadow
    context.shadowColor = 'rgba(0, 0, 0, 0.5)';
    context.shadowBlur = 10;
    context.shadowOffsetX = 5;
    context.shadowOffsetY = 5;
    
    context.fillText('HINDUSTAN TIMES', canvas.width / 2, canvas.height / 2 - 40);
    
    // IPL 2025 text
    context.font = 'bold 120px Arial';
    // Create gold gradient for IPL text
    const iplGradient = context.createLinearGradient(0, 120, 0, 240);
    iplGradient.addColorStop(0, '#f6e58d'); // Light gold
    iplGradient.addColorStop(0.5, '#ffbe76'); // Gold
    iplGradient.addColorStop(1, '#f9ca24'); // Deep gold
    context.fillStyle = iplGradient;
    context.fillText('IPL 2025', canvas.width / 2, canvas.height / 2 + 60);
    
    // Create a texture from the canvas with error handling
    try {
        // Check if CanvasTexture exists, otherwise use regular Texture
        if (THREE.CanvasTexture) {
            const texture = new THREE.CanvasTexture(canvas);
            textMaterial.map = texture;
        } else {
            // Fallback for older Three.js versions
            const texture = new THREE.Texture(canvas);
            texture.needsUpdate = true;
            textMaterial.map = texture;
        }
        textMaterial.needsUpdate = true;
    } catch (error) {
        debug("Error creating banner texture: " + error.message);
        // Use a simple color instead if texture creation fails
        textMaterial.color.set(0xffffff);
    }
    
    bannerGroup.add(textPlane);
    
    // Position the banner high up at the back of the stadium
    bannerGroup.position.set(0, 12, -40);
    bannerGroup.rotation.y = Math.PI;
    scene.add(bannerGroup);
    
    // Add another banner on the opposite side
    const bannerGroup2 = bannerGroup.clone();
    bannerGroup2.position.set(0, 12, 40);
    bannerGroup2.rotation.y = 0;
    scene.add(bannerGroup2);
    
    // Add banners on the sides
    const bannerGroupSide1 = bannerGroup.clone();
    bannerGroupSide1.position.set(-40, 12, 0);
    bannerGroupSide1.rotation.y = Math.PI / 2;
    scene.add(bannerGroupSide1);
    
    const bannerGroupSide2 = bannerGroup.clone();
    bannerGroupSide2.position.set(40, 12, 0);
    bannerGroupSide2.rotation.y = -Math.PI / 2;
    scene.add(bannerGroupSide2);
    
    } catch (error) {
        debug("Banner creation error: " + error.message);
        
        // Create a fallback simple banner if the fancy one fails
        try {
            // Simple colored planes as banners
            const simpleBannerGeometry = new THREE.PlaneGeometry(30, 5);
            const simpleBannerMaterial = new THREE.MeshStandardMaterial({
                color: 0x0c2461, // Deep blue
                side: THREE.DoubleSide
            });
            
            // Create four simple banners around the stadium
            const positions = [
                {pos: [0, 12, -40], rot: [0, Math.PI, 0]},
                {pos: [0, 12, 40], rot: [0, 0, 0]},
                {pos: [-40, 12, 0], rot: [0, Math.PI/2, 0]},
                {pos: [40, 12, 0], rot: [0, -Math.PI/2, 0]}
            ];
            
            positions.forEach(config => {
                const banner = new THREE.Mesh(simpleBannerGeometry, simpleBannerMaterial);
                banner.position.set(...config.pos);
                banner.rotation.set(...config.rot);
                scene.add(banner);
            });
            
            debug("Created fallback banners");
        } catch (e) {
            debug("Failed to create even simple banners: " + e.message);
        }
    }
}

function createCrowd() {
    const crowdGroup = new THREE.Group();
    const rows = 5;
    const seatsPerRow = 60;
    const radius = 45;
    
    // Create colored cubes to represent crowd
    for (let r = 0; r < rows; r++) {
        const rowRadius = radius - (r * 2);
        const yPos = 3 + (r * 2);
        
        for (let i = 0; i < seatsPerRow; i++) {
            const angle = (i / seatsPerRow) * Math.PI * 2;
            const x = Math.cos(angle) * rowRadius;
            const z = Math.sin(angle) * rowRadius;
            
            // Don't place crowd behind the batsman (to see better)
            if (z < -20) continue;
            
            const personGeometry = new THREE.BoxGeometry(1, 1, 1);
            
            // Random colors for crowd
            const colors = [0xf44336, 0x2196f3, 0xffeb3b, 0x4caf50, 0x9c27b0];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            const personMaterial = new THREE.MeshStandardMaterial({ color });
            const person = new THREE.Mesh(personGeometry, personMaterial);
            
            person.position.set(x, yPos, z);
            // Make them look toward center
            person.lookAt(new THREE.Vector3(0, yPos, 0));
            
            crowdGroup.add(person);
        }
    }
    
    scene.add(crowdGroup);
}

function createPlaceholderModels() {
    // CHANGE 3: Simplified to show only a bat (no batsman or bowler)
    
    // Create just a single realistic cricket bat with no batsman
    batsman = new THREE.Group(); // Create an empty group to hold just the bat
    
    // Create realistic cricket bat
    const batGroup = new THREE.Group();
    
    // Create a simple orange stick for the bat - positioned like a right-handed batsman
    const batGeometry = new THREE.CylinderGeometry(0.05, 0.15, 2.8, 8);
    const batMaterial = new THREE.MeshStandardMaterial({
        color: 0xFF8C00, // Orange color
        metalness: 0.3,
        roughness: 0.7
    });
    const batStick = new THREE.Mesh(batGeometry, batMaterial);
    
    // Shift the bat's center point to have the bottom at the origin
    batStick.position.y = 0.8; // Half the height to place bottom at origin
    batGroup.add(batStick);
    
    // Position the bat in front of the wicket
    // Bottom on the ground in front of wicket, angled for batting stance
    batGroup.rotation.z = -Math.PI / 4; // 45-degree tilt upward
    batGroup.rotation.x = -Math.PI / 6; // Slight forward tilt
    batGroup.rotation.y = 0.3; // Slight angle to the right
    batGroup.position.set(0.1, 0.0, -1.5); // Moved forward in front of wicket
    batGroup.scale.set(1.1, 1.1, 1.1); // Slightly larger for visibility
    batsman.add(batGroup);
    
    // Position the bat in front of the wicket at the farther end (batsman end)
    batsman.position.set(-0.5, 1.0, -3); // Moved forward from wickets
    batsman.rotation.y = 0; // Face toward bowler/camera
    batsman.castShadow = true;
    scene.add(batsman);
    
    // Create a cricket ball - bigger and more detailed
    const ballGeometry = new THREE.SphereGeometry(0.25, 32, 32); // Slightly smaller ball
    const ballMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xc0392b, // Dark red cricket ball
        roughness: 0.3,
        metalness: 0.2
    });
    ball = new THREE.Mesh(ballGeometry, ballMaterial);
    
    // Add seam to cricket ball
    // Check if TorusGeometry exists, otherwise fall back to older API naming
    const TorusGeometry = THREE.TorusGeometry || THREE.TorusBufferGeometry;
    const seamGeometry = new TorusGeometry(0.25, 0.025, 8, 24);
    const seamMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.5,
        metalness: 0.1
    });
    const seam = new THREE.Mesh(seamGeometry, seamMaterial);
    seam.rotation.x = Math.PI / 2;
    ball.add(seam);
    
    // Set the ball position at the bowler end for bowling animation (now closer to camera)
    ball.position.set(0, 1.5, 8); // Positioned at the bowler end (swapped with batsman)
    ball.castShadow = true;
    scene.add(ball);
    
    // Add Hindustan Times IPL 2025 text on the back wall - BIGGER SIZE
    const loader = new THREE.TextureLoader();
    // Create a canvas to generate the text texture
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 2048; // Higher resolution
    canvas.height = 512; // Higher resolution
    context.fillStyle = '#000066';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = 'bold 120px Arial'; // Larger font
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#FFFFFF';
    context.fillText('Hindustan Times IPL 2025', canvas.width / 2, canvas.height / 2);
    
    // Create a texture from the canvas
    const texture = new THREE.CanvasTexture(canvas);
    const bannerMaterial = new THREE.MeshBasicMaterial({ 
        map: texture,
        side: THREE.DoubleSide
    });
    const bannerGeometry = new THREE.PlaneGeometry(16, 4); // Much larger banner
    const banner = new THREE.Mesh(bannerGeometry, bannerMaterial);
    banner.position.set(0, 10, -15); // Position it higher on the back wall
    scene.add(banner);
    
    // Create wickets
    createWickets(-8); // Batsman end
    createWickets(8);  // Bowler end
}

function createWickets(zPosition) {
    const wicketGroup = new THREE.Group();
    
    // Create three stumps - LARGER SIZE and TALLER
    for (let i = -1; i <= 1; i++) {
        const stumpGeometry = new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8); // Increased height from 1.2 to 1.8
        const stumpMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const stump = new THREE.Mesh(stumpGeometry, stumpMaterial);
        stump.position.set(i * 0.25, 0.9, 0); // Adjusted y position (0.6 -> 0.9) for the taller stumps
        stump.castShadow = true;
        wicketGroup.add(stump);
        
        // Add bails - larger to match stumps
        if (i < 1) {
            const bailGeometry = new THREE.BoxGeometry(0.3, 0.08, 0.08);
            const bailMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
            const bail = new THREE.Mesh(bailGeometry, bailMaterial);
            bail.position.set(i * 0.25 + 0.125, 1.85, 0); // Adjusted height (1.25 -> 1.85) to match taller stumps
            wicketGroup.add(bail);
        }
    }
    
    wicketGroup.position.set(0, 0, zPosition);
    scene.add(wicketGroup);
}

function loadSoundEffects() {
    // Pre-load audio elements for better mobile support
    const audioElements = {
        four: new Audio('./assets/Four.mp3'),
        six: new Audio('./assets/Six.mp3'),
        out: new Audio('./assets/Out.mp3')
    };

    // Set attributes for mobile playback
    Object.values(audioElements).forEach(audio => {
        audio.setAttribute('playsinline', '');
        audio.setAttribute('webkit-playsinline', '');
        audio.preload = 'auto';
    });

    // Initialize sound effects with proper mobile handling
    soundEffects = {
        bat: { 
            play: function() { 
                debug('Bat sound played');
            }
        },
        crowd: { 
            play: function() { 
                debug('Crowd sound played');
            }
        },
        four: { 
            play: async function() { 
                debug('Four sound played');
                try {
                    await audioElements.four.play();
                } catch (e) {
                    debug('Error playing four sound: ' + e.message);
                    // Try to recover by resetting and playing again
                    audioElements.four.currentTime = 0;
                    try {
                        await audioElements.four.play();
                    } catch (e2) {
                        debug('Failed to play sound after retry');
                    }
                }
            }
        },
        six: { 
            play: async function() { 
                debug('Six sound played');
                try {
                    await audioElements.six.play();
                } catch (e) {
                    debug('Error playing six sound: ' + e.message);
                    // Try to recover by resetting and playing again
                    audioElements.six.currentTime = 0;
                    try {
                        await audioElements.six.play();
                    } catch (e2) {
                        debug('Failed to play sound after retry');
                    }
                }
            }
        },
        out: {
            play: async function() {
                debug('Out sound played');
                try {
                    await audioElements.out.play();
                } catch (e) {
                    debug('Error playing out sound: ' + e.message);
                    // Try to recover by resetting and playing again
                    audioElements.out.currentTime = 0;
                    try {
                        await audioElements.out.play();
                    } catch (e2) {
                        debug('Failed to play sound after retry');
                    }
                }
            }
        }
    };

    // Add touch event listener to enable audio on first interaction
    document.addEventListener('touchstart', function() {
        // Try to play all sounds with volume 0 to enable them
        Object.values(audioElements).forEach(audio => {
            audio.volume = 0;
            audio.play().catch(() => {});
            audio.pause();
            audio.volume = 1;
        });
    }, { once: true });
}

function setupEventHandlers() {
    // For touch devices - detect swipes
    const canvas = document.getElementById('game-canvas');
    
    canvas.addEventListener('touchstart', handleTouchStart, false);
    canvas.addEventListener('touchmove', handleTouchMove, false);
    canvas.addEventListener('touchend', handleTouchEnd, false);
    
    // For desktop - mouse events
    canvas.addEventListener('mousedown', handleMouseDown, false);
    canvas.addEventListener('mousemove', handleMouseMove, false);
    canvas.addEventListener('mouseup', handleMouseUp, false);
    
    // Play again button
    document.getElementById('play-again').addEventListener('click', () => {
        debug("Play Again clicked");
        
        document.getElementById('game-over').style.display = 'none';
        document.getElementById('player-selection').style.display = 'flex';
        
        // Reset game state
        ballsLeft = 6;
        totalRuns = 0;
        isGameOver = false;
        
        // Reset UI
        updateScoreUI();
    });
}

// Touch event handlers
function handleTouchStart(event) {
    if (!isGameStarted || ballIsMoving || isGameOver) return;
    
    const touch = event.touches[0];
    swipeStartX = touch.clientX;
    swipeStartY = touch.clientY;
}

function handleTouchMove(event) {
    if (!swipeStartX || !swipeStartY) return;
    
    // We could add some visual feedback here to show the swipe direction
}

function handleTouchEnd(event) {
    if (!swipeStartX || !swipeStartY || ballIsMoving || isGameOver) return;
    
    const touch = event.changedTouches[0];
    const swipeEndX = touch.clientX;
    const swipeEndY = touch.clientY;
    
    // Calculate swipe direction and strength
    const deltaX = swipeEndX - swipeStartX;
    const deltaY = swipeEndY - swipeStartY;
    
    // Normalize the direction
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Only count as a swipe if there was enough movement
    if (distance > 30) {
        const directionX = deltaX / distance;
        const directionY = -deltaY / distance; // Invert Y for 3D space
        
        // Use the swipe to hit the ball
        hitBall(directionX, directionY, distance);
    }
    
    // Reset swipe tracking
    swipeStartX = null;
    swipeStartY = null;
}

// Mouse event handlers (similar to touch)
function handleMouseDown(event) {
    if (!isGameStarted || ballIsMoving || isGameOver) return;
    
    swipeStartX = event.clientX;
    swipeStartY = event.clientY;
}

function handleMouseMove(event) {
    if (!swipeStartX || !swipeStartY) return;
    
    // Visual feedback could be added here
}

function handleMouseUp(event) {
    if (!swipeStartX || !swipeStartY || ballIsMoving || isGameOver) return;
    
    const swipeEndX = event.clientX;
    const swipeEndY = event.clientY;
    
    // Calculate swipe direction and strength
    const deltaX = swipeEndX - swipeStartX;
    const deltaY = swipeEndY - swipeStartY;
    
    // Normalize the direction
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Only count as a swipe if there was enough movement
    if (distance > 30) {
        const directionX = deltaX / distance;
        const directionY = -deltaY / distance; // Invert Y for 3D space
        
        // Use the swipe to hit the ball
        hitBall(directionX, directionY, distance);
    }
    
    // Reset swipe tracking
    swipeStartX = null;
    swipeStartY = null;
}

function startGame() {
    debug("Starting game with player: " + selectedPlayer);
    console.log("Starting game with player:", selectedPlayer);
    
    try {
        // Reset game state
        ballsLeft = 6;
        totalRuns = 0;
        isGameOver = false;
        
        // Hide player selection screen
        document.getElementById('player-selection').style.display = 'none';
        // Show game screen - make sure it's visible
        const gameContainer = document.getElementById('game-container');
        gameContainer.style.display = 'flex';
        gameContainer.classList.remove('hidden');
        
        // Update UI with selected player and initial game state
        document.getElementById('current-batsman').textContent = 
            `Batsman: ${playerStats[selectedPlayer].name}`;
        updateScoreUI(); // Show initial ball count
        
        // Make sure the canvas is visible
        const canvas = document.getElementById('game-canvas');
        canvas.style.display = 'block';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        
        // Updated camera position for a better view of the centered pitch and players
        camera.position.set(0, 4, 12);
        camera.lookAt(0, 2, 0); // Look at players' upper bodies
        
        // Check if controls are available before setting properties
        if (controls.enableRotate !== undefined) {
            // Enable controls for slight movements
            controls.enableRotate = true;
            controls.minPolarAngle = Math.PI / 3;
            controls.maxPolarAngle = Math.PI / 2.5;
            controls.minAzimuthAngle = -Math.PI / 6;
            controls.maxAzimuthAngle = Math.PI / 6;
        }
        
        // Force renderer resize to match new container
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        
        // Render a frame to make sure scene is visible
        renderer.render(scene, camera);
        
        // Prepare for the first ball
        prepareBall();
        
        // Set game as started
        isGameStarted = true;
        
        debug("Game started successfully");
        console.log("Game started successfully - scene:", scene);
        
        // Additional debug render
        setTimeout(() => {
            renderer.render(scene, camera);
            debug("Rendered additional frame");
        }, 1000);
    } catch (error) {
        debug("Error starting game: " + error.message);
        console.error("Game start error:", error);
    }
}

function prepareBall() {
    // Position the ball at the bowler end (now at z=8 after position swap)
    ball.position.set(0, 1.5, 8);
    
    // Rotate ball for animation
    ball.rotation.set(0, 0, 0);
    
    // Animate the ball moving from bowler end to batsman end
    const ballSpeed = 0.25; // Speed for new trajectory
    let spin = 0;
    
    const animateBall = () => {
        if (ball.position.z > -7.5) { // Move ball toward batsman positioned at z=-8
            ball.position.z -= ballSpeed; // Move in negative Z direction (toward batsman)
            
            // Add spinning effect
            spin += 0.15;
            ball.rotation.x = spin;
            ball.rotation.y = spin * 0.5;
            
            // Ball arc trajectory (up and down as it moves toward batsman)
            // Calculate progress as a percentage of total journey
            const progress = (8 - ball.position.z) / 16; // 8 to -8 = 16 units total
            
            // Create an arc effect using sin function
            if (progress <= 0.5) {
                // First half - ball rises
                ball.position.y = 1.5 + Math.sin(progress * Math.PI) * 2.0;
            } else {
                // Second half - ball falls
                ball.position.y = 1.5 + Math.sin(progress * Math.PI) * 2.0;
            }
            
            requestAnimationFrame(animateBall);
        } else {
            // Ball reached the batsman, ready to be hit
            ball.position.set(0, 1.2, -7.5);
            ballIsMoving = false;
        }
    };
    
    ballIsMoving = true;
    animateBall();
}

function hitBall(directionX, directionY, swipeStrength) {
    if (ballIsMoving) return;
    
    // CHANGE 1: Move the bat based on swipe direction
    moveBatWithSwipe(directionX, directionY);
    
    // Mark ball as moving
    ballIsMoving = true;
    
    // Calculate shot power based on player stats and swipe strength
    const powerFactor = playerStats[selectedPlayer].power / 100;
    const timingFactor = playerStats[selectedPlayer].timing / 100;
    
    // Normalize swipe strength (max 300)
    const normalizedStrength = Math.min(swipeStrength, 300) / 300;
    
    // Calculate final power
    const shotPower = normalizedStrength * powerFactor * timingFactor * 25;
    
    // CHANGE 2: Add miss chance - player can get out if timing is off
    // Calculate distance between bat and ball to determine if it's a hit or miss
    const hitChance = calculateHitChance(normalizedStrength, timingFactor);
    const isHit = Math.random() < hitChance;
    
    if (!isHit) {
        // Missed the ball - player is out
        if (soundEffects && soundEffects.out) {
            soundEffects.out.play();
        }
        ballIsMoving = false;
        showShotResult(0, true); // Show OUT!
        
        // Update total - player out
        ballsLeft = 0; // End game immediately on out
        updateScoreUI();
        
        // Show "OUT!" animation
        showAnimatedText("OUT!", "out-animation");
        
        // End game after a delay
        setTimeout(endGame, 2000);
        return;
    }
    
    // Add controlled randomness to the shot
    const randomAngle = Math.random() * Math.PI * 0.15 - Math.PI * 0.075; // Reduced randomness
    const finalDirectionX = directionX * Math.cos(randomAngle) - directionY * Math.sin(randomAngle);
    const finalDirectionY = directionX * Math.sin(randomAngle) + directionY * Math.cos(randomAngle);
    
    // Ball should go forward toward bowler end (positive Z direction)
    const finalDirectionZ = 10 + (Math.random() * 5); // Forward toward bowler with some randomness
    
    // Play bat sound
    soundEffects.bat.play();
    
    // Set initial ball velocity - adjusted for proper cricket layout
    // Ball should go forward from batsman toward the bowler end
    const velocity = {
        x: finalDirectionX * shotPower * 0.6, // Reduced side movement
        y: finalDirectionY * shotPower + 8, // More vertical lift
        z: finalDirectionZ  // Ball goes forward toward bowler end (positive Z)
    };
    
    // Ball physics - adjusted for more realistic cricket shots
    const gravity = 0.25; // Increased gravity
    const friction = 0.985; // Less friction
    const bounceFactor = 0.65; // More bounce
    
    // Animate the ball's movement
    let bounceCount = 0;
    
    const animateBallPhysics = () => {
        // Update position with smoother movement
        ball.position.x += velocity.x * 0.12;
        ball.position.y += velocity.y * 0.12;
        ball.position.z += velocity.z * 0.12;
        
        // Add ball spin effect
        ball.rotation.x += velocity.z * 0.01;
        ball.rotation.y += velocity.x * 0.01;
        
        // Apply gravity
        velocity.y -= gravity;
        
        // Apply friction
        velocity.x *= friction;
        velocity.y *= friction;
        velocity.z *= friction;
        
        // Ground bounce with improved physics
        if (ball.position.y <= 0.2) {
            ball.position.y = 0.2;
            velocity.y = -velocity.y * bounceFactor;
            bounceCount++;
            
            // Ball losing energy with each bounce
            if (bounceCount > 2) { // Reduced bounce count for quicker stop
                velocity.x *= 0.6;
                velocity.z *= 0.6;
            }
        }
        
        // Check if ball has stopped or gone far enough
        const speed = Math.sqrt(
            velocity.x * velocity.x + 
            velocity.y * velocity.y + 
            velocity.z * velocity.z
        );
        
        // Calculate distance from center for better run calculation
        const distanceFromCenter = Math.sqrt(
            ball.position.x * ball.position.x + 
            ball.position.z * ball.position.z
        );
        
        if (speed < 0.05 || distanceFromCenter > 70 || bounceCount > 8) {
            // Ball stopped or went far enough
            ballIsMoving = false;
            calculateRuns(distanceFromCenter);
            return;
        }
        
        requestAnimationFrame(animateBallPhysics);
    };
    
    animateBallPhysics();
}

// Function to move bat according to swipe direction - like a cricket/baseball swing
function moveBatWithSwipe(directionX, directionY) {
    // With the simplified model, batGroup is the first and only child of batsman
    const batGroup = batsman.children[0];
    
    if (!batGroup) return;
    
    // Original position and rotation for bat in front of wicket
    const originalPosition = { x: 0.1, y: 0.0, z: -1.5 }; // Moved further forward in front of wickets
    const originalRotationZ = -Math.PI / 4; // 45-degree upward tilt
    const originalRotationX = -Math.PI / 6; // Slight forward tilt
    const originalRotationY = 0.3; // Slight angle to the right
    
    // Enhanced rotation based on swipe direction for more dramatic swing
    const swingIntensity = Math.sqrt(directionX * directionX + directionY * directionY);
    const powerFactor = Math.min(swingIntensity * 1.5, 2.0); // Amplify the swing but cap it
    
    // Calculate new rotations with enhanced movement
    const newRotationZ = originalRotationZ - directionY * 0.8 * powerFactor; // More vertical movement
    const newRotationY = originalRotationY - directionX * 1.2 * powerFactor; // Enhanced horizontal swing
    const newRotationX = originalRotationX - Math.abs(directionX) * 0.6 * powerFactor; // More forward rotation
    
    // Animate the bat swing with more dramatic movement
    const swingDuration = 15; // Slightly longer for more visible movement
    let frame = 0;
    
    const animateBatSwing = () => {
        if (frame >= swingDuration) {
            // Smooth reset to original position
            batGroup.position.set(originalPosition.x, originalPosition.y, originalPosition.z);
            batGroup.rotation.z = originalRotationZ;
            batGroup.rotation.x = originalRotationX;
            batGroup.rotation.y = originalRotationY;
            return;
        }
        
        const progress = frame / swingDuration;
        // Enhanced easing for more dramatic swing
        const easeProgress = progress < 0.35 ? 
            3 * progress * progress : // More aggressive backswing
            1 - Math.pow(-2 * progress + 2, 1.8) / 2; // More powerful forward swing
        
        // Apply enhanced swing movement
        if (progress < 0.35) {
            // Dramatic backswing
            batGroup.position.z = originalPosition.z + 0.6 * easeProgress * powerFactor; // More pullback
            batGroup.position.y = originalPosition.y + 0.3 * easeProgress * powerFactor; // Slight upward movement
            batGroup.rotation.y = originalRotationY + 0.8 * easeProgress * powerFactor; // More wind up
            batGroup.rotation.x = originalRotationX - 0.3 * easeProgress * powerFactor; // Tilt back
        } else {
            // Powerful forward swing with follow-through
            const swingProgress = (progress - 0.35) / 0.65; // Normalized progress for forward swing
            const followThrough = Math.sin(swingProgress * Math.PI); // Smooth follow-through motion
            
            // Enhanced forward movement
            batGroup.position.z = originalPosition.z + 0.6 - (1.2 * powerFactor * followThrough); // More forward reach
            batGroup.position.y = originalPosition.y + 0.3 - (0.4 * powerFactor * followThrough); // Vertical movement
            
            // Dynamic rotation during swing
            batGroup.rotation.y = originalRotationY + 0.8 - (1.2 + Math.abs(newRotationY - originalRotationY)) * followThrough;
            batGroup.rotation.x = originalRotationX + (newRotationX - originalRotationX) * followThrough;
            batGroup.rotation.z = originalRotationZ + (newRotationZ - originalRotationZ) * followThrough;
        }
        
        frame++;
        requestAnimationFrame(animateBatSwing);
    };
    
    animateBatSwing();
}

// CHANGE 2: Calculate hit chance based on timing and swipe
function calculateHitChance(normalizedStrength, timingFactor) {
    // Base hit chance - player skill matters
    const baseHitChance = 0.7 + (timingFactor * 0.2);
    
    // Too weak or too strong swipes reduce hit chance
    const strengthPenalty = Math.abs(normalizedStrength - 0.7) * 0.5;
    
    // Final hit chance
    return Math.max(0.2, Math.min(0.95, baseHitChance - strengthPenalty));
}

// Helper function to get performance message based on score and strike rate
function getPerformanceMessage(runs, strikeRate) {
    if (runs >= 30 && strikeRate >= 200) {
        return "🏆 Phenomenal batting! You're the next IPL superstar!";
    } else if (runs >= 24) {
        return "🔥 Outstanding performance! True cricket legend material!";
    } else if (runs >= 18) {
        return "👏 Excellent batting! You've got serious talent!";
    } else if (runs >= 12) {
        return "💪 Good show! Keep honing those skills!";
    } else {
        return "🎯 Nice start! Practice makes perfect!";
    }
}

// Function to share score on social media
function shareScore(runs) {
    const text = `🏏 Just scored ${runs} runs in IPL Cricket 2025! Can you beat my score? 🎮`;
    
    if (navigator.share) {
        navigator.share({
            title: "IPL Cricket 2025 Score",
            text: text,
            url: window.location.href
        }).catch(err => {
            console.log("Error sharing:", err);
        });
    } else {
        // Fallback: Copy to clipboard
        navigator.clipboard.writeText(text).then(() => {
            alert("Score copied to clipboard!");
        }).catch(err => {
            console.log("Error copying to clipboard:", err);
        });
    }
}

function calculateRuns(distance) {
    // Determine runs based on distance
    let runs = 0;
    let isOut = false;
    
    // Random chance of getting out (higher if poor timing)
    const outChance = 0.1 - (playerStats[selectedPlayer].technique / 1000);
    if (Math.random() < outChance) {
        runs = 0;
        isOut = true;
    } 
    // Boundary
    else if (distance >= 40) {
        if (ball.position.y > 0.5) {
            runs = 6; // Six
            if (soundEffects && soundEffects.six) {
                soundEffects.six.play();
            }
        } else {
            runs = 4; // Four
            if (soundEffects && soundEffects.four) {
                soundEffects.four.play();
            }
        }
    } 
    // Regular runs
    else {
        // Convert distance to runs (roughly distance / 10)
        runs = Math.floor(distance / 10);
        if (runs > 0 && soundEffects && soundEffects.crowd) {
            soundEffects.crowd.play();
        }
    }
    
    // Update total
    totalRuns += runs;
    
    // Update UI with current ball result
    showShotResult(runs, isOut);
    
    // Check if game should continue
    ballsLeft--;
    
    // Update UI with new ball count
    updateScoreUI();
    
    if (ballsLeft > 0 && !isOut) {
        // Prepare next ball after a delay
        setTimeout(prepareBall, 2000);
    } else {
        // Game over
        setTimeout(endGame, 2000);
    }
}

// CHANGE 3: Show good graphics of 6, 4 and Out with sound effects
function showShotResult(runs, isOut) {
    const lastShotContainer = document.getElementById('last-shot-container');
    const lastShotRuns = document.getElementById('last-shot-runs');
    
    if (isOut) {
        lastShotRuns.textContent = 'OUT!';
        lastShotRuns.style.color = '#e74c3c'; // Red
        showAnimatedText("OUT!", "out-animation");
        // Play out sound effect
        if (soundEffects && soundEffects.out) {
            soundEffects.out.play();
        }
    } else if (runs === 6) {
        lastShotRuns.textContent = 'SIX!';
        lastShotRuns.style.color = '#f1c40f'; // Gold
        showAnimatedText("SIX!", "six-animation");
        // Play six sound effect
        if (soundEffects && soundEffects.six) {
            soundEffects.six.play();
        }
    } else if (runs === 4) {
        lastShotRuns.textContent = 'FOUR!';
        lastShotRuns.style.color = '#3498db'; // Blue
        showAnimatedText("FOUR!", "four-animation");
        // Play four sound effect
        if (soundEffects && soundEffects.four) {
            soundEffects.four.play();
        }
    } else {
        lastShotRuns.textContent = runs > 0 ? `${runs} RUNS` : 'NO RUN';
        lastShotRuns.style.color = 'white';
    }
    
    // Show and animate the result
    lastShotContainer.classList.remove('hidden');
    
    // Hide after animation
    setTimeout(() => {
        lastShotContainer.classList.add('hidden');
    }, 2000);
}

// Create animated text for important shot results (6, 4, OUT)
function showAnimatedText(text, className, targetElement = 'game-container') {
    // Create a div for the animated text
    const animatedText = document.createElement('div');
    
    if (text === 'Congratulations! You have won the MyCircle11 Voucher.') {
        // Set position and z-index for the voucher
        Object.assign(animatedText.style, {
            position: 'fixed',
            bottom: '20px',
            left: '0',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            zIndex: '200'
        });
        
        // Create modern voucher container matching game over theme
        const voucherContainer = document.createElement('div');
        voucherContainer.className = 'voucher-container';
        Object.assign(voucherContainer.style, {
            background: 'linear-gradient(135deg, #1a2a6c 0%, #b21f1f 100%)',
            maxWidth: '350px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            fontStyle: 'italic',
            animation: 'slideInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        });
        
        // Add voucher title with matching style
        const voucherTitle = document.createElement('div');
        voucherTitle.className = 'voucher-title';
        voucherTitle.innerHTML = 'Congratulations! <span style="font-size: 24px">🎉</span>';
        voucherTitle.style.fontStyle = 'italic';
        voucherContainer.appendChild(voucherTitle);
        
        // Add voucher description
        const voucherDesc = document.createElement('div');
        Object.assign(voucherDesc.style, {
            fontSize: '16px',
            color: '#fff',
            marginBottom: '20px',
            textAlign: 'center',
            fontStyle: 'italic'
        });
        voucherDesc.textContent = 'You have won the MyCircle11 Voucher';
        voucherContainer.appendChild(voucherDesc);
        
        // Add redeem button with icon matching game over buttons
        const redeemButton = document.createElement('a');
        redeemButton.href = '#';
        redeemButton.className = 'voucher-button';
        redeemButton.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 6L9 17l-5-5"/>
            </svg>R
            Click to Redeem
        `;
        redeemButton.style.fontStyle = 'italic';
        redeemButton.style.background = 'linear-gradient(135deg, #00b4db 0%, #0083b0 100%)';
        redeemButton.onclick = (e) => {
            e.preventDefault();
            // Add redemption logic here
            alert('Voucher code will be sent to your registered email!');
        };
        voucherContainer.appendChild(redeemButton);
        
        animatedText.appendChild(voucherContainer);
    } else {
        animatedText.textContent = text;
        animatedText.className = 'animated-text ' + className;
        
        // Set styles directly
        Object.assign(animatedText.style, {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '80px',
            fontWeight: 'bold',
            textAlign: 'center',
            zIndex: '100',
            textShadow: '0 0 10px rgba(0,0,0,0.5)',
            opacity: '0',
            animation: 'textAnimation 2s ease-out forwards'
        });
        
        // Different styles based on text
        if (text === 'SIX!') {
            animatedText.style.color = '#f39c12';
            animatedText.style.textShadow = '0 0 20px #f1c40f';
        } else if (text === 'FOUR!') {
            animatedText.style.color = '#3498db';
            animatedText.style.textShadow = '0 0 20px #2980b9';
        } else if (text === 'OUT!') {
            animatedText.style.color = '#e74c3c';
            animatedText.style.textShadow = '0 0 20px #c0392b';
        } else if (text === 'CONGRATULATIONS!') {
            animatedText.style.color = '#f1c40f';
            animatedText.style.textShadow = '0 0 20px #f39c12';
            animatedText.style.fontSize = '60px';
        }
    }
    
    // Add keyframe animation style
    const style = document.createElement('style');
    style.textContent = `
        @keyframes textAnimation {
            0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
            20% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
            80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(2); }
        }
    `;
    document.head.appendChild(style);
    
    // Add to specified container
    document.getElementById(targetElement).appendChild(animatedText);
    
    // Remove after animation
    setTimeout(() => {
        animatedText.remove();
        style.remove();
    }, 2000);
    
    // Return a promise that resolves when animation is complete
    return new Promise(resolve => setTimeout(resolve, 2000));
}

function updateScoreUI() {
    document.getElementById('total-runs').textContent = `Runs: ${totalRuns}`;
    document.getElementById('balls-left').textContent = `Balls Left: ${ballsLeft}`;
}

async function endGame() {
    try {
        debug("Game over. Final score: " + totalRuns);
        
        isGameOver = true;
        
        // Hide other screens first
        const gameContainer = document.getElementById('game-container');
        const playerSelection = document.getElementById('player-selection');
        const gameOver = document.getElementById('game-over');
        
        if (!gameOver) {
            throw new Error('Game over element not found!');
        }
        
        // Hide other screens
        if (gameContainer) gameContainer.style.display = 'none';
        if (playerSelection) playerSelection.style.display = 'none';
        
        // Calculate game statistics
        const ballsFaced = 6 - ballsLeft;
        const strikeRate = ballsFaced > 0 ? (totalRuns / ballsFaced) * 100 : 0;
        
        // Count boundaries and sixes
        let fours = 0;
        let sixes = 0;
        document.querySelectorAll('.shot-result').forEach(shot => {
            if (shot.textContent === 'FOUR!') fours++;
            if (shot.textContent === 'SIX!') sixes++;
        });
        
        // Create modern game over screen HTML with combined summary and voucher
        gameOver.innerHTML = `
            <div class="game-over-container">
                <h1 class="game-over-title" style="font-size: 28px; margin: 10px 0;">Congratulations!</h1>
                <div class="score-card" style="background: rgba(44, 62, 80, 0.9); padding: 20px; border-radius: 10px; margin: 20px; border: 3px solid #f1c40f;">
                    <div class="score-header" style="font-size: 24px; margin-bottom: 15px;">Match Summary</div>
                    <div id="final-score" class="final-score" style="font-size: 32px; margin-bottom: 20px;">Total Runs: ${totalRuns}</div>
                    <div class="voucher-message" style="font-size: 22px; margin: 20px 0;">
                        You have won the MyCircle11 Voucher!
                        <div style="margin-top: 15px;">
                            <a href="https://mycircle11.com/redeem" class="voucher-link" target="_blank" 
                               style="display: inline-block; padding: 10px 20px; background: #f1c40f; color: #2c3e50; 
                                      border-radius: 5px; text-decoration: none; font-weight: bold;">Click to Redeem</a>
                        </div>
                    </div>
                </div>
                
                <div class="action-buttons" style="display: flex; flex-direction: column; gap: 15px; align-items: center;">
                    <button id="share-score" class="btn-secondary" style="background: #3498db; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; width: 200px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                            <polyline points="16 6 12 2 8 6"/>
                            <line x1="12" y1="2" x2="12" y2="15"/>
                        </svg>
                        Share Score
                    </button>
                    <button id="play-again" class="btn-primary" style="background: #2ecc71; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; width: 200px; display: flex; align-items: center; justify-content: center; gap: 8px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                            <path d="M3 3v5h5"/>
                        </svg>
                        Play Again
                    </button>
                </div>
            </div>
        `;
        
        // Show the game over screen
        gameOver.classList.remove('hidden');
        gameOver.style.display = 'flex';
        
        // Add event listeners for buttons
        document.getElementById('share-score').addEventListener('click', () => {
            shareScore(totalRuns);
        });
        
        document.getElementById('play-again').addEventListener('click', () => {
            // Hide game over screen
            gameOver.style.display = 'none';
            // Show player selection screen
            document.getElementById('player-selection').style.display = 'flex';
            
            // Reset game state
            ballsLeft = 6;
            totalRuns = 0;
            isGameOver = false;
            
            // Reset UI
            updateScoreUI();
        });
        
        try {
            // Show animated congratulations message
            await showAnimatedText("CONGRATULATIONS!", "voucher-animation", "game-over");
        } catch (error) {
            debug('Animation error: ' + error.message, true);
        }
        
        // Voucher message is now integrated into the main game over screen
        
        // Play Again functionality is now handled through the Play Again button in the action buttons
        
        // Final check to ensure visibility
        requestAnimationFrame(() => {
            gameOver.style.display = 'flex';
            void gameOver.offsetWidth;
            debug("Game over screen is now visible with all content");
        });
        
    } catch (error) {
        debug('Error in endGame: ' + error.message, true);
    }
    
    // This section is now handled by the modern game over screen HTML
    // and is no longer needed since we're using a template literal approach
    // for the entire game over screen content
    
    // Add performance message
    let performanceMessage = '';
    if (totalRuns >= 30) {
        performanceMessage = 'Outstanding performance! You are a cricket legend!';
    } else if (totalRuns >= 20) {
        performanceMessage = 'Great batting! You have got serious skills!';
    } else if (totalRuns >= 10) {
        performanceMessage = 'Good job! Keep practicing!';
    } else {
        performanceMessage = 'Nice try! Everyone has to start somewhere.';
    }
    
    // Performance message is now handled in the modern game over screen HTML

    
    // Create voucher message with hyperlink as requested
    const voucherMessage = document.createElement('div');
    voucherMessage.id = 'voucher-message';
    voucherMessage.style.marginTop = '30px';
    voucherMessage.style.marginBottom = '30px';
    voucherMessage.style.padding = '20px';
    voucherMessage.style.backgroundColor = '#2c3e50';
    voucherMessage.style.borderRadius = '10px';
    voucherMessage.style.border = '3px solid #f1c40f';
    voucherMessage.style.color = '#ffffff';
    voucherMessage.style.fontSize = '22px';
    voucherMessage.style.fontWeight = 'bold';
    voucherMessage.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
    voucherMessage.style.width = '90%';
    voucherMessage.style.maxWidth = '500px';
    voucherMessage.style.boxShadow = '0 5px 20px rgba(0,0,0,0.7)';
    voucherMessage.style.animation = 'pulse 2s infinite';
    voucherMessage.style.textAlign = 'center';
    
    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
        }
        .voucher-link {
            display: inline-block;
            color: #f1c40f;
            text-decoration: none;
            background-color: rgba(0,0,0,0.3);
            padding: 10px 20px;
            border-radius: 5px;
            margin-top: 15px;
            transition: all 0.3s ease;
            border: 2px solid #f1c40f;
        }
        .voucher-link:hover {
            background-color: rgba(0,0,0,0.5);
            transform: scale(1.05);
        }
        .play-again-link {
            display: inline-block;
            background-color: #2ecc71;
            color: white;
            text-decoration: none;
            padding: 15px 30px;
            border-radius: 8px;
            margin-top: 20px;
            font-weight: bold;
            transition: all 0.3s ease;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }
        .play-again-link:hover {
            background-color: #27ae60;
            transform: translateY(-2px);
            box-shadow: 0 6px 8px rgba(0,0,0,0.4);
        }
    `;
    document.head.appendChild(style);
    
    // The voucher message and play again button are now handled in the modern game over screen HTML
    // with the template literal approach above
    
    // Make the game over screen visible
    const gameOver = document.getElementById('game-over');
    if (gameOver) {
        gameOver.style.display = 'flex';
        
        // Force a reflow to ensure the display change takes effect
        void gameOver.offsetWidth;
    }
    debug("Game over screen is now visible with all content");
}

function animate() {
    try {
        requestAnimationFrame(animate);
        
        // Update controls if available
        if (controls && typeof controls.update === 'function') {
            controls.update();
        }
        
        // Render scene with additional error checking
        if (renderer && scene && camera) {
            // Check for missing resources
            if (!scene.children || scene.children.length === 0) {
                debug("Warning: Empty scene detected");
            }
            
            try {
                renderer.render(scene, camera);
            } catch (renderError) {
                console.error("Render error:", renderError);
                
                // Try to recover by rebuilding the scene
                if (renderError.message && renderError.message.includes("404")) {
                    debug("Recovered from 404 error in rendering");
                    
                    // Force redraw entire scene if needed
                    scene.children.forEach(child => {
                        if (child.material) {
                            child.material.needsUpdate = true;
                        }
                    });
                }
            }
        }
    } catch (error) {
        console.error("Animation error:", error);
        
        // Try to show an error message to the user
        const debugElement = document.getElementById('debug-message');
        if (debugElement) {
            debugElement.textContent = "Game error - please refresh the page";
            debugElement.style.display = 'block';
            debugElement.style.backgroundColor = 'rgba(255,0,0,0.7)';
        }
    }
}