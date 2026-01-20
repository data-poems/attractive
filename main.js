    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    // State variables (declared early for resizeCanvas)
    let sidebarCollapsed = false;
    let panX = 0;
    let panY = 0;

    // Canvas sizing
    function resizeCanvas() {
      // On mobile (viewport width <= 768px), canvas is full width
      if (window.innerWidth <= 768) {
        canvas.width = window.innerWidth;
      } else {
        // Desktop - check if sidebar is collapsed
        const sidebarWidth = sidebarCollapsed ? 0 : 340;
        canvas.width = window.innerWidth - sidebarWidth;
      }
      canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', () => {
      resizeCanvas();
      // Reset pan to center on resize/orientation change
      panX = 0;
      panY = 0;
    });
    // Also handle orientation changes on mobile
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        resizeCanvas();
        panX = 0;
        panY = 0;
      }, 100);
    });
    
    // State (panX, panY, sidebarCollapsed declared above for resizeCanvas)
    let particles = [];
    let rotationX = 0.5;
    let rotationY = 0.5;
    let zoom = 1;
    let speed = 3;
    let isDragging = false;
    let isPanning = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let currentDataset = 'climate';
    let currentAttractor = 'lorenz';
    let currentColorScheme = 'bioluminescent';
    let currentParams = {};
    let isPlaying = true;
    let isAutoAnimating = false;
    let autoAnimateParam = 'p2';
    let autoAnimateDirection = 1;
    let autoAnimateSpeed = 0.02;
    let animationId = null;
    let curatedComboIndex = 0;
    let autoRotate = false;

    // New controls
    let trailLength = 25;
    let glowIntensity = 0;
    let lineWidth = 1.5;
    let depthBrightness = false;
    let trailFade = true;

    // Visual style system
    let currentStyle = 'clean';
    let roughCanvas = null;

    // FPS tracking
    let frameCount = 0;
    let lastFpsUpdate = performance.now();
    let currentFps = 60;

    // History/Undo system
    const historyStack = [];
    const MAX_HISTORY = 20;
    let isRestoringState = false; // Flag to prevent pushState during undo

    // Capture current state for history
    function captureState() {
      return {
        currentAttractor,
        currentDataset,
        currentColorScheme,
        currentStyle,
        currentParams: { ...currentParams },
        particleCount: parseInt(document.getElementById('particleSlider').value),
        speed,
        trailLength,
        glowIntensity,
        lineWidth,
        depthBrightness,
        trailFade,
        rotationX,
        rotationY,
        zoom,
        panX,
        panY
      };
    }

    // Push current state to history
    function pushState() {
      if (isRestoringState) return; // Don't push during undo

      const state = captureState();
      historyStack.push(state);

      // Limit history size
      if (historyStack.length > MAX_HISTORY) {
        historyStack.shift();
      }

      updateHistoryIndicator();
    }

    // Restore state from history
    function restoreState(state) {
      isRestoringState = true;

      currentAttractor = state.currentAttractor;
      currentDataset = state.currentDataset;
      currentColorScheme = state.currentColorScheme;
      currentStyle = state.currentStyle || 'clean';
      currentParams = { ...state.currentParams };
      speed = state.speed;
      trailLength = state.trailLength;
      glowIntensity = state.glowIntensity;
      lineWidth = state.lineWidth;
      depthBrightness = state.depthBrightness;
      trailFade = state.trailFade;
      rotationX = state.rotationX;
      rotationY = state.rotationY;
      zoom = state.zoom;
      panX = state.panX;
      panY = state.panY;

      // Update UI elements
      document.getElementById('datasetSelect').value = currentDataset;
      document.getElementById('attractorSelect').value = currentAttractor;
      document.getElementById('particleSlider').value = state.particleCount;
      document.getElementById('particleValue').textContent = state.particleCount;
      document.getElementById('particleCount').textContent = state.particleCount;
      document.getElementById('speedSlider').value = speed;
      document.getElementById('speedValue').textContent = speed.toFixed(1) + '×';
      document.getElementById('trailSlider').value = trailLength;
      document.getElementById('trailValue').textContent = trailLength;
      document.getElementById('glowSlider').value = glowIntensity;
      document.getElementById('glowValue').textContent = glowIntensity;
      document.getElementById('lineWidthSlider').value = lineWidth;
      document.getElementById('lineWidthValue').textContent = lineWidth.toFixed(1);
      document.getElementById('trailFadeToggle').checked = trailFade;
      document.getElementById('depthBrightnessToggle').checked = depthBrightness;

      // Update color selection
      document.querySelectorAll('.color-option').forEach(o => {
        const isActive = o.dataset.scheme === currentColorScheme;
        o.classList.toggle('active', isActive);
        o.setAttribute('aria-checked', isActive ? 'true' : 'false');
        o.setAttribute('tabindex', isActive ? '0' : '-1');
      });

      // Update style selection
      document.querySelectorAll('.style-card').forEach(c => {
        const isActive = c.dataset.style === currentStyle;
        c.classList.toggle('active', isActive);
        c.setAttribute('aria-checked', isActive ? 'true' : 'false');
        c.setAttribute('tabindex', isActive ? '0' : '-1');
      });
      updateStyleInfo(currentStyle);

      // Initialize rough canvas if needed for restored style
      if (VISUAL_STYLES[currentStyle].line.renderer === 'rough') {
        initRoughCanvas();
      }

      // Update attractor display
      document.getElementById('attractorName').textContent = attractors[currentAttractor].name;
      document.getElementById('datasetName').textContent = datasets[currentDataset].name;
      document.getElementById('datasetInfo').innerHTML = datasets[currentDataset].info;

      generateParameterControls();
      initParticles();

      isRestoringState = false;
    }

    // Undo last change
    function undo() {
      if (historyStack.length === 0) {
        return; // No history to undo
      }

      const previousState = historyStack.pop();
      restoreState(previousState);
      updateHistoryIndicator();
    }

    // Update history depth indicator
    function updateHistoryIndicator() {
      const indicator = document.getElementById('historyIndicator');
      if (indicator) {
        const count = historyStack.length;
        indicator.textContent = count === 0 ? '' : `${count} ${count === 1 ? 'change' : 'changes'}`;

        // Update undo button state
        const undoBtn = document.getElementById('undoBtn');
        if (undoBtn) {
          undoBtn.disabled = count === 0;
          undoBtn.setAttribute('aria-disabled', count === 0 ? 'true' : 'false');
        }
      }
    }

    // Curated beautiful combinations - shown first when clicking random/dice
    const beautifulCombos = [
      // Original favorites
      { dataset: 'crypto', attractor: 'lorenz', color: 'fire', params: { p1: 10, p2: 28, p3: 2.667 } },
      { dataset: 'seismic', attractor: 'halvorsen', color: 'cosmic', params: { p1: 1.4, p2: 1, p3: 1 } },
      { dataset: 'climate', attractor: 'rossler', color: 'ocean', params: { p1: 0.2, p2: 0.2, p3: 5.7 } },
      { dataset: 'economic', attractor: 'chen', color: 'sunset', params: { p1: 35, p2: 3, p3: 28 } },
      { dataset: 'orbital', attractor: 'aizawa', color: 'forest', params: { p1: 0.95, p2: 0.7, p3: 0.6 } },
      { dataset: 'trending', attractor: 'thomas', color: 'bioluminescent', params: { p1: 0.208186, p2: 10, p3: 1.0 } },

      // New attractor showcases
      { dataset: 'heartrate', attractor: 'chua', color: 'lava', params: { p1: 15.6, p2: 28, p3: -1.143 } },
      { dataset: 'brain', attractor: 'rabinovich', color: 'cosmic', params: { p1: 0.87, p2: 1.1, p3: 0.5 } },
      { dataset: 'stocks', attractor: 'fourwing', color: 'aurora', params: { p1: 0.2, p2: 0.01, p3: -0.4 } },
      { dataset: 'power', attractor: 'lu', color: 'fire', params: { p1: 36, p2: 3, p3: 20 } },
      { dataset: 'weather', attractor: 'shimizu', color: 'ice', params: { p1: 0.85, p2: 0.5, p3: 1.0 } },
      { dataset: 'traffic', attractor: 'nose', color: 'sunset', params: { p1: 1.5, p2: 1.0, p3: 1.0 } },
      { dataset: 'tides', attractor: 'rucklidge', color: 'ocean', params: { p1: 2.0, p2: 6.7, p3: 1.0 } },
      { dataset: 'pandemic', attractor: 'genesio', color: 'lava', params: { p1: 0.44, p2: 1.1, p3: 1.0 } },
      { dataset: 'solar', attractor: 'burke', color: 'fire', params: { p1: 10, p2: 4.272, p3: 1.0 } },
      { dataset: 'ocean', attractor: 'arneodo', color: 'bioluminescent', params: { p1: -5.5, p2: 3.5, p3: -1.0 } },

      // Visually stunning combinations
      { dataset: 'audio', attractor: 'rossler', color: 'cosmic', params: { p1: 0.2, p2: 0.2, p3: 18 } },
      { dataset: 'seismic', attractor: 'lorenz', color: 'fire', params: { p1: 10, p2: 24.74, p3: 2.667 } },
      { dataset: 'solar', attractor: 'sprott', color: 'lava', params: { p1: 2.07, p2: 1.79, p3: 1.0 } },
      { dataset: 'crypto', attractor: 'dequan', color: 'aurora', params: { p1: 40, p2: 1.833, p3: 0.16 } },
      { dataset: 'brain', attractor: 'thomas', color: 'cosmic', params: { p1: 0.208186, p2: 10, p3: 1.0 } },
      { dataset: 'heartrate', attractor: 'aizawa', color: 'lava', params: { p1: 0.95, p2: 0.7, p3: 0.6 } },
      { dataset: 'weather', attractor: 'halvorsen', color: 'ice', params: { p1: 1.4, p2: 1, p3: 1 } },
      { dataset: 'stocks', attractor: 'chen', color: 'fire', params: { p1: 40, p2: 3, p3: 28 } },

      // New data source highlights
      { dataset: 'tides', attractor: 'lorenz', color: 'ocean', params: { p1: 10, p2: 28, p3: 2.667 } },
      { dataset: 'power', attractor: 'chua', color: 'aurora', params: { p1: 15.6, p2: 28, p3: -1.143 } },
      { dataset: 'pandemic', attractor: 'dadras', color: 'sunset', params: { p1: 3.0, p2: 2.7, p3: 1.7 } },
      { dataset: 'traffic', attractor: 'fourwing', color: 'forest', params: { p1: 0.2, p2: 0.01, p3: -0.4 } },

      // New Attractors
      { dataset: 'climate', attractor: 'tsucs', color: 'neon', params: { p1: 40, p2: 0.833, p3: 0.65 } },
      { dataset: 'orbital', attractor: 'newton_leipnik', color: 'cyberpunk', params: { p1: 0.4, p2: 0.9, p3: 1.0 } },

      // Iterative map attractors
      { dataset: 'crypto', attractor: 'clifford', color: 'electric', params: { p1: -1.4, p2: 1.6, p3: 1.0 } },
      { dataset: 'trending', attractor: 'dejong', color: 'pastel', params: { p1: -2.24, p2: 0.43, p3: -0.65 } },
      { dataset: 'brain', attractor: 'pickover', color: 'cosmic', params: { p1: -0.97, p2: 2.88, p3: 0.77 } },
      { dataset: 'seismic', attractor: 'clifford', color: 'bloodmoon', params: { p1: 1.5, p2: -1.8, p3: 1.7 } },
      { dataset: 'ocean', attractor: 'dejong', color: 'monochrome', params: { p1: 1.4, p2: -2.3, p3: 2.4 } },

      // New color scheme highlights
      { dataset: 'heartrate', attractor: 'lorenz', color: 'ember', params: { p1: 10, p2: 28, p3: 2.667 } },
      { dataset: 'power', attractor: 'chua', color: 'electric', params: { p1: 15.6, p2: 28, p3: -1.143 } },
      { dataset: 'pandemic', attractor: 'rossler', color: 'bloodmoon', params: { p1: 0.2, p2: 0.2, p3: 5.7 } },
      { dataset: 'weather', attractor: 'halvorsen', color: 'pastel', params: { p1: 1.4, p2: 1, p3: 1 } },

      // Visual style showcases
      { dataset: 'climate', attractor: 'lorenz', color: 'monochrome', style: 'davinci', params: { p1: 10, p2: 28, p3: 2.667 } },
      { dataset: 'seismic', attractor: 'rossler', color: 'ice', style: 'blueprint', params: { p1: 0.2, p2: 0.2, p3: 5.7 } },
      { dataset: 'crypto', attractor: 'chen', color: 'neon', style: 'neon', params: { p1: 35, p2: 3, p3: 28 } },
      { dataset: 'brain', attractor: 'thomas', color: 'pastel', style: 'chalk', params: { p1: 0.208186, p2: 10, p3: 1.0 } },
      { dataset: 'orbital', attractor: 'aizawa', color: 'electric', style: 'oscilloscope', params: { p1: 0.95, p2: 0.7, p3: 0.6 } },
      { dataset: 'ocean', attractor: 'halvorsen', color: 'aurora', style: 'watercolor', params: { p1: 1.4, p2: 1, p3: 1 } },
    ];

    // Dataset configurations with proper parameter names
    const datasets = {
      climate: {
        name: 'Climate',
        info: '<strong>Climate:</strong> Temperature anomalies and CO₂ levels from 1960-2024',
        params: ['Temperature (°C)', 'CO₂ (ppm)', 'Year Index']
      },
      economic: {
        name: 'Economic',
        info: '<strong>Economic:</strong> GDP growth, inflation rate, and unemployment cycles',
        params: ['GDP Growth (%)', 'Inflation Rate (%)', 'Unemployment (%)']
      },
      seismic: {
        name: 'Seismic',
        info: '<strong>Seismic:</strong> Earthquake magnitude, depth, and frequency patterns',
        params: ['Magnitude', 'Depth (km)', 'Frequency']
      },
      crypto: {
        name: 'Crypto',
        info: '<strong>Crypto:</strong> Bitcoin price volatility, trading volume, and market sentiment',
        params: ['Price Volatility', 'Volume (BTC)', 'Market Sentiment']
      },
      trending: {
        name: 'Trending',
        info: '<strong>Trending:</strong> Wikipedia page views, edit frequency, and topic virality',
        params: ['Page Views', 'Edit Frequency', 'Virality Score']
      },
      audio: {
        name: 'Audio',
        info: '<strong>Audio:</strong> Live microphone input frequency, amplitude, and waveform',
        params: ['Frequency (Hz)', 'Amplitude', 'Waveform']
      },
      orbital: {
        name: 'Orbital',
        info: '<strong>Orbital:</strong> ISS position (latitude, longitude, altitude)',
        params: ['Latitude (°)', 'Longitude (°)', 'Altitude (km)']
      },
      solar: {
        name: 'Solar',
        info: '<strong>Solar:</strong> Solar wind speed, sunspot number, and magnetic flux',
        params: ['Solar Wind (km/s)', 'Sunspot Number', 'Magnetic Flux']
      },
      ocean: {
        name: 'Ocean',
        info: '<strong>Ocean:</strong> Gulf Stream velocity, temperature gradient, and salinity',
        params: ['Current Speed (m/s)', 'Temperature (°C)', 'Salinity (PSU)']
      },
      stocks: {
        name: 'Stocks',
        info: '<strong>Stocks:</strong> S&P 500 volatility, trading volume, and market momentum',
        params: ['Volatility (VIX)', 'Volume (B)', 'Momentum']
      },
      weather: {
        name: 'Weather',
        info: '<strong>Weather:</strong> Real-time atmospheric pressure, humidity, and wind patterns',
        params: ['Pressure (hPa)', 'Humidity (%)', 'Wind Speed (m/s)']
      },
      heartrate: {
        name: 'Heart Rate',
        info: '<strong>Heart Rate:</strong> ECG R-R intervals, heart rate variability, and rhythm',
        params: ['BPM', 'HRV (ms)', 'Rhythm Score']
      },
      traffic: {
        name: 'Traffic',
        info: '<strong>Traffic:</strong> Urban traffic flow, congestion index, and average speed',
        params: ['Flow (veh/hr)', 'Congestion', 'Avg Speed (km/h)']
      },
      power: {
        name: 'Power Grid',
        info: '<strong>Power Grid:</strong> Electricity demand, frequency deviation, and load balance',
        params: ['Demand (GW)', 'Frequency (Hz)', 'Balance (%)']
      },
      pandemic: {
        name: 'Pandemic',
        info: '<strong>Pandemic:</strong> Infection rate, reproduction number, and hospitalization',
        params: ['Daily Cases', 'R₀ Value', 'Hospital Load']
      },
      brain: {
        name: 'Brain Waves',
        info: '<strong>Brain Waves:</strong> EEG alpha, beta, and theta wave amplitudes',
        params: ['Alpha (μV)', 'Beta (μV)', 'Theta (μV)']
      },
      tides: {
        name: 'Tides',
        info: '<strong>Tides:</strong> Tidal height, lunar phase influence, and current velocity',
        params: ['Height (m)', 'Lunar Phase', 'Current (m/s)']
      }
    };
    
    // Attractor configurations with proper equations
    const attractors = {
      lorenz: {
        name: 'Lorenz',
        description: 'The iconic "butterfly effect" discovered by Edward Lorenz in 1963 while studying weather. Shows how tiny changes lead to vastly different outcomes.',
        params: [
          { name: 'σ (Prandtl)', min: 0, max: 20, step: 0.1, default: 10, tooltip: 'Prandtl number - controls the rate of convective heat transfer. Higher values create more turbulent motion.' },
          { name: 'ρ (Rayleigh)', min: 0, max: 50, step: 0.1, default: 28, tooltip: 'Rayleigh number - temperature difference driving the system. The famous chaos threshold is ρ=24.74' },
          { name: 'β (Geometry)', min: 0, max: 10, step: 0.1, default: 2.667, tooltip: 'Geometric ratio - aspect ratio of the convection cell. Affects the butterfly wing shape.' }
        ],
        compute: (x, y, z, params, dt) => {
          const dx = params.p1 * (y - x);
          const dy = x * (params.p2 - z) - y;
          const dz = x * y - params.p3 * z;
          return [x + dx * dt, y + dy * dt, z + dz * dt];
        },
        scale: 8,
        initPos: [0.1, 0, 0],
        initSpread: 0.5,
        recommendedSpeed: 3.0,
        recommendedZoom: 1.0
      },
      rossler: {
        name: 'Rössler',
        description: 'Otto Rössler\'s elegant spiral band attractor from 1976. Simpler than Lorenz but equally chaotic with a characteristic twisted ribbon shape.',
        params: [
          { name: 'a (Stiffness)', min: 0, max: 0.5, step: 0.01, default: 0.2, tooltip: 'Stiffness parameter - controls the tightness of spiral winding.' },
          { name: 'b (Damping)', min: 0, max: 0.5, step: 0.01, default: 0.2, tooltip: 'Damping parameter - affects energy dissipation in the system.' },
          { name: 'c (Forcing)', min: 0, max: 20, step: 0.1, default: 5.7, tooltip: 'Forcing parameter - drives the chaotic behavior. Values above 5 produce more complex patterns.' }
        ],
        compute: (x, y, z, params, dt) => {
          const dx = -y - z;
          const dy = x + params.p1 * y;
          const dz = params.p2 + z * (x - params.p3);
          return [x + dx * dt, y + dy * dt, z + dz * dt];
        },
        scale: 15,
        initPos: [1, 1, 1],
        initSpread: 0.3,
        recommendedSpeed: 4.0,
        recommendedZoom: 0.8
      },
      chen: {
        name: 'Chen',
        description: 'Guanrong Chen\'s 1999 dual-wing attractor that bridges Lorenz and Lü systems. Features symmetric lobes with complex folding dynamics.',
        params: [
          { name: 'α (Coupling)', min: 30, max: 45, step: 0.5, default: 35, tooltip: 'Coupling strength - controls how strongly the variables interact.' },
          { name: 'β (Feedback)', min: 1, max: 6, step: 0.1, default: 3, tooltip: 'Feedback parameter - modulates the nonlinear feedback loops.' },
          { name: 'γ (Damping)', min: 20, max: 35, step: 0.5, default: 28, tooltip: 'Damping coefficient - affects the decay rate and wing symmetry.' }
        ],
        compute: (x, y, z, params, dt) => {
          const dx = params.p1 * (y - x);
          const dy = (params.p3 - params.p1) * x - x * z + params.p3 * y;
          const dz = x * y - params.p2 * z;
          return [x + dx * dt, y + dy * dt, z + dz * dt];
        },
        scale: 6,
        initPos: [-0.1, 0.5, -0.6],
        initSpread: 0.3,
        recommendedSpeed: 2.5,
        recommendedZoom: 1.2
      },
      aizawa: {
        name: 'Aizawa',
        params: [
          { name: 'a (Growth)', min: 0.7, max: 1.0, step: 0.01, default: 0.95 },
          { name: 'b (Offset)', min: 0.5, max: 0.9, step: 0.01, default: 0.7 },
          { name: 'c (Constant)', min: 0.5, max: 0.7, step: 0.01, default: 0.6 }
        ],
        compute: (x, y, z, params, dt) => {
          // Standard Aizawa: d=3.5, e=0.25, f=0.1 are fixed
          const a = params.p1, b = params.p2, c = params.p3;
          const d = 3.5, e = 0.25, f = 0.1;
          const dx = (z - b) * x - d * y;
          const dy = d * x + (z - b) * y;
          const dz = c + a * z - (z * z * z) / 3 - (x * x + y * y) * (1 + e * z) + f * z * x * x * x;
          return [x + dx * dt, y + dy * dt, z + dz * dt];
        },
        scale: 200,
        initPos: [0.1, 0.1, 0.1],
        initSpread: 0.01
      },
      thomas: {
        name: 'Thomas',
        params: [
          { name: 'b (Dissipation)', min: 0.15, max: 0.22, step: 0.002, default: 0.208186 },
          { name: 'Speed Mult', min: 5, max: 20, step: 1, default: 10 },
          { name: 'Chaos', min: 0.9, max: 1.1, step: 0.01, default: 1.0 }
        ],
        compute: (x, y, z, params, dt) => {
          // Thomas attractor needs larger timestep - it's slow-evolving
          const b = params.p1;
          const speedMult = params.p2;
          const chaos = params.p3;
          const dx = Math.sin(y * chaos) - b * x;
          const dy = Math.sin(z * chaos) - b * y;
          const dz = Math.sin(x * chaos) - b * z;
          return [x + dx * dt * speedMult, y + dy * dt * speedMult, z + dz * dt * speedMult];
        },
        scale: 70,
        initPos: [1.1, 1.1, -0.01],
        initSpread: 0.3
      },
      halvorsen: {
        name: 'Halvorsen',
        params: [
          { name: 'α (Symmetry)', min: 1.2, max: 1.6, step: 0.05, default: 1.4 },
          { name: 'Scale', min: 0.8, max: 1.5, step: 0.05, default: 1 },
          { name: 'Speed', min: 0.8, max: 1.5, step: 0.05, default: 1 }
        ],
        compute: (x, y, z, params, dt) => {
          const dx = -params.p1 * x - 4 * y - 4 * z - y * y;
          const dy = -params.p1 * y - 4 * z - 4 * x - z * z;
          const dz = -params.p1 * z - 4 * x - 4 * y - x * x;
          return [x + dx * dt * params.p2 * params.p3, y + dy * dt * params.p2 * params.p3, z + dz * dt * params.p2 * params.p3];
        },
        scale: 18,
        initPos: [-1.48, -1.51, 2.04],
        initSpread: 0.3
      },
      sprott: {
        name: 'Sprott',
        params: [
          { name: 'a (Coupling)', min: 2.0, max: 2.2, step: 0.01, default: 2.07 },
          { name: 'b (Nonlinearity)', min: 1.7, max: 1.9, step: 0.01, default: 1.79 },
          { name: 'Speed', min: 0.5, max: 2.0, step: 0.1, default: 1.0 }
        ],
        compute: (x, y, z, params, dt) => {
          // Sprott Case B - one of the simplest chaotic flows
          const dx = y * z;
          const dy = x - y;
          const dz = params.p1 - x * y;
          return [x + dx * dt * params.p3, y + dy * dt * params.p3, z + dz * dt * params.p3];
        },
        scale: 80,
        initPos: [0.1, 0.1, 0.1],
        initSpread: 0.05
      },
      dadras: {
        name: 'Dadras',
        params: [
          { name: 'a (Primary)', min: 2.5, max: 3.5, step: 0.1, default: 3.0 },
          { name: 'b (Secondary)', min: 2.5, max: 3.0, step: 0.1, default: 2.7 },
          { name: 'c (Coupling)', min: 1.5, max: 2.0, step: 0.05, default: 1.7 }
        ],
        compute: (x, y, z, params, dt) => {
          // Dadras attractor - produces three-scroll pattern
          const d = 2.0, e = 9.0; // Fixed parameters
          const dx = y - params.p1 * x + params.p2 * y * z;
          const dy = params.p3 * y - x * z + z;
          const dz = d * x * y - e * z;
          return [x + dx * dt, y + dy * dt, z + dz * dt];
        },
        scale: 25,
        initPos: [0.1, 0.1, 0.1],
        initSpread: 0.1
      },
      bouali: {
        name: 'Bouali',
        params: [
          { name: 'α (Growth)', min: 0.2, max: 0.5, step: 0.02, default: 0.3 },
          { name: 'μ (Coupling)', min: 0.8, max: 1.2, step: 0.02, default: 1.0 },
          { name: 's (Scale)', min: 0.8, max: 1.5, step: 0.05, default: 1.0 }
        ],
        compute: (x, y, z, params, dt) => {
          // Bouali attractor - complex wing structure
          const a = params.p1, s = params.p3;
          const dx = x * (4 - y) + a * z;
          const dy = -y * (1 - x * x);
          const dz = -x * (1.5 - s * z) - 0.05 * z;
          return [x + dx * dt * params.p2, y + dy * dt * params.p2, z + dz * dt * params.p2];
        },
        scale: 40,
        initPos: [1.0, 1.0, 0.0],
        initSpread: 0.2
      },
      chua: {
        name: 'Chua',
        description: 'Leon Chua\'s electronic circuit attractor from 1983. The iconic double-scroll pattern can be built with physical components.',
        params: [
          { name: 'α (Alpha)', min: 14, max: 16, step: 0.1, default: 15.6, tooltip: 'Alpha - time constant ratio in the circuit model.' },
          { name: 'β (Beta)', min: 25, max: 30, step: 0.5, default: 28, tooltip: 'Beta - coupling strength between circuit elements.' },
          { name: 'm₀ (Slope)', min: -1.2, max: -1.0, step: 0.02, default: -1.143, tooltip: 'Slope m₀ - controls the piecewise-linear nonlinearity that creates the double scroll.' }
        ],
        compute: (x, y, z, params, dt) => {
          // Chua's circuit - iconic double scroll attractor
          const m1 = -0.714;
          const h = params.p3 * x + 0.5 * (m1 - params.p3) * (Math.abs(x + 1) - Math.abs(x - 1));
          const dx = params.p1 * (y - x - h);
          const dy = x - y + z;
          const dz = -params.p2 * y;
          return [x + dx * dt, y + dy * dt, z + dz * dt];
        },
        scale: 80,
        initPos: [0.7, 0, 0],
        initSpread: 0.1
      },
      rabinovich: {
        name: 'Rabinovich-Fabrikant',
        params: [
          { name: 'γ (Gamma)', min: 0.8, max: 1.0, step: 0.01, default: 0.87 },
          { name: 'α (Alpha)', min: 1.0, max: 1.2, step: 0.01, default: 1.1 },
          { name: 'Speed', min: 0.3, max: 1.0, step: 0.05, default: 0.5 }
        ],
        compute: (x, y, z, params, dt) => {
          // Rabinovich-Fabrikant - multi-scroll dynamics
          const dx = y * (z - 1 + x * x) + params.p1 * x;
          const dy = x * (3 * z + 1 - x * x) + params.p1 * y;
          const dz = -2 * z * (params.p2 + x * y);
          return [x + dx * dt * params.p3, y + dy * dt * params.p3, z + dz * dt * params.p3];
        },
        scale: 150,
        initPos: [-1, 0, 0.5],
        initSpread: 0.1
      },
      nose: {
        name: 'Nosé-Hoover',
        params: [
          { name: 'a (Coupling)', min: 1.0, max: 2.0, step: 0.1, default: 1.5 },
          { name: 'Speed', min: 0.5, max: 2.0, step: 0.1, default: 1.0 },
          { name: 'Scale', min: 0.8, max: 1.5, step: 0.1, default: 1.0 }
        ],
        compute: (x, y, z, params, dt) => {
          // Nosé-Hoover thermostat from molecular dynamics
          const dx = y;
          const dy = -x + y * z;
          const dz = params.p1 - y * y;
          return [x + dx * dt * params.p2, y + dy * dt * params.p2, z + dz * dt * params.p2];
        },
        scale: 100 * 1,
        initPos: [0, 0.1, 0],
        initSpread: 0.1
      },
      burke: {
        name: 'Burke-Shaw',
        params: [
          { name: 's (Sigma)', min: 8, max: 12, step: 0.5, default: 10 },
          { name: 'v (Nu)', min: 4, max: 5, step: 0.1, default: 4.272 },
          { name: 'Speed', min: 0.5, max: 1.5, step: 0.1, default: 1.0 }
        ],
        compute: (x, y, z, params, dt) => {
          // Burke-Shaw attractor - similar structure to Lorenz
          const dx = -params.p1 * (x + y);
          const dy = -y - params.p1 * x * z;
          const dz = params.p1 * x * y + params.p2;
          return [x + dx * dt * params.p3, y + dy * dt * params.p3, z + dz * dt * params.p3];
        },
        scale: 50,
        initPos: [0.6, 0, 0],
        initSpread: 0.1
      },
      genesio: {
        name: 'Genesio-Tesi',
        params: [
          { name: 'a', min: 0.4, max: 0.5, step: 0.01, default: 0.44 },
          { name: 'b', min: 1.0, max: 1.2, step: 0.02, default: 1.1 },
          { name: 'c', min: 0.9, max: 1.1, step: 0.02, default: 1.0 }
        ],
        compute: (x, y, z, params, dt) => {
          // Genesio-Tesi - simple quadratic system
          const dx = y;
          const dy = z;
          const dz = -params.p3 * x - params.p2 * y - params.p1 * z + x * x;
          return [x + dx * dt, y + dy * dt, z + dz * dt];
        },
        scale: 100,
        initPos: [0.1, 0.1, 0.1],
        initSpread: 0.05
      },
      arneodo: {
        name: 'Arneodo',
        params: [
          { name: 'a', min: -5.5, max: -5.3, step: 0.02, default: -5.5 },
          { name: 'b', min: 3.4, max: 3.6, step: 0.02, default: 3.5 },
          { name: 'c', min: -0.5, max: 0.5, step: 0.1, default: -1.0 }
        ],
        compute: (x, y, z, params, dt) => {
          // Arneodo attractor - simple chaotic system
          const dx = y;
          const dy = z;
          const dz = params.p1 * x + params.p2 * y + params.p3 * z + x * x * x;
          return [x + dx * dt, y + dy * dt, z + dz * dt];
        },
        scale: 100,
        initPos: [0.1, 0, 0],
        initSpread: 0.05
      },
      shimizu: {
        name: 'Shimizu-Morioka',
        params: [
          { name: 'a', min: 0.7, max: 0.9, step: 0.02, default: 0.85 },
          { name: 'b', min: 0.4, max: 0.6, step: 0.02, default: 0.5 },
          { name: 'Speed', min: 0.5, max: 1.5, step: 0.1, default: 1.0 }
        ],
        compute: (x, y, z, params, dt) => {
          // Shimizu-Morioka - from laser physics
          const dx = y;
          const dy = (1 - z) * x - params.p1 * y;
          const dz = -params.p2 * z + x * x;
          return [x + dx * dt * params.p3, y + dy * dt * params.p3, z + dz * dt * params.p3];
        },
        scale: 100,
        initPos: [0.1, 0.1, 0.1],
        initSpread: 0.05
      },
      fourwing: {
        name: 'Four-Wing',
        params: [
          { name: 'a', min: 0.1, max: 0.3, step: 0.02, default: 0.2 },
          { name: 'b', min: 0.01, max: 0.02, step: 0.002, default: 0.01 },
          { name: 'c', min: -0.5, max: -0.3, step: 0.02, default: -0.4 }
        ],
        compute: (x, y, z, params, dt) => {
          // Four-Wing attractor - beautiful multi-wing structure
          const dx = params.p1 * x + y * z;
          const dy = params.p2 * x + params.p3 * y - x * z;
          const dz = -z - x * y;
          return [x + dx * dt, y + dy * dt, z + dz * dt];
        },
        scale: 150,
        initPos: [0.1, 0.1, 0.1],
        initSpread: 0.05
      },
      lu: {
        name: 'Lü',
        params: [
          { name: 'a', min: 35, max: 40, step: 0.5, default: 36 },
          { name: 'b', min: 2.5, max: 3.5, step: 0.1, default: 3 },
          { name: 'c', min: 18, max: 22, step: 0.5, default: 20 }
        ],
        compute: (x, y, z, params, dt) => {
          // Lü attractor - bridge between Lorenz and Chen
          const dx = params.p1 * (y - x);
          const dy = -x * z + params.p3 * y;
          const dz = x * y - params.p2 * z;
          return [x + dx * dt, y + dy * dt, z + dz * dt];
        },
        scale: 7,
        initPos: [0.1, 0.1, 0.1],
        initSpread: 0.1
      },
      rucklidge: {
        name: 'Rucklidge',
        params: [
          { name: 'κ (Kappa)', min: 1.8, max: 2.2, step: 0.05, default: 2.0 },
          { name: 'λ (Lambda)', min: 6.5, max: 7.0, step: 0.1, default: 6.7 },
          { name: 'Speed', min: 0.5, max: 1.5, step: 0.1, default: 1.0 }
        ],
        compute: (x, y, z, params, dt) => {
          // Rucklidge attractor - double-scroll dynamics
          const dx = -params.p1 * x + params.p2 * y - y * z;
          const dy = x;
          const dz = -z + y * y;
          return [x + dx * dt * params.p3, y + dy * dt * params.p3, z + dz * dt * params.p3];
        },
        scale: 50,
        initPos: [1, 0, 4.5],
        initSpread: 0.2
      },
      dequan: {
        name: 'Dequan-Li',
        params: [
          { name: 'a', min: 38, max: 42, step: 0.5, default: 40 },
          { name: 'c', min: 1.5, max: 2.0, step: 0.05, default: 1.833 },
          { name: 'd', min: 0.1, max: 0.2, step: 0.01, default: 0.16 }
        ],
        compute: (x, y, z, params, dt) => {
          // Dequan Li attractor - complex multi-scroll
          const b = 11, e = 0.65, f = 20, k = 55;
          const dx = params.p1 * (y - x) + params.p3 * x * z;
          const dy = k * x + f * y - x * z;
          const dz = params.p2 * z + x * y - e * x * x;
          return [x + dx * dt * 0.3, y + dy * dt * 0.3, z + dz * dt * 0.3];
        },
        scale: 5,
        initPos: [0.349, 0, -0.16],
        initSpread: 0.05
      },
      tsucs: {
        name: 'Tsucs',
        params: [
          { name: 'a (Param)', min: 35, max: 45, step: 0.5, default: 40 },
          { name: 'c (Param)', min: 0.5, max: 1.0, step: 0.01, default: 0.833 },
          { name: 'e (Param)', min: 0.5, max: 0.8, step: 0.01, default: 0.65 }
        ],
        compute: (x, y, z, params, dt) => {
            const a = params.p1;
            const c = params.p2;
            const e = params.p3;
            const d = 0.5;
            const k = 55;
            const f = 20;
            const dx = a * (y - x) + d * x * z;
            const dy = k * x + f * y - x * z;
            const dz = c * z + x * y - e * x * x;
            return [x + dx * dt * 0.05, y + dy * dt * 0.05, z + dz * dt * 0.05];
        },
        scale: 4,
        initPos: [0.1, 0.1, 0.1],
        initSpread: 0.1
      },
      newton_leipnik: {
        name: 'Newton-Leipnik',
        params: [
            { name: 'a (Shear)', min: 0.3, max: 0.5, step: 0.01, default: 0.4 },
            { name: 'b (Attraction)', min: 0.8, max: 1.0, step: 0.01, default: 0.9 },
            { name: 'Scale', min: 0.1, max: 1.0, step: 0.1, default: 1.0 }
        ],
         compute: (x, y, z, params, dt) => {
            const dx = -params.p1 * x + y + 10 * y * z;
            const dy = -x - 0.4 * y + 5 * x * z;
            const dz = params.p2 * z - 5 * x * y;
            return [x + dx * dt * 0.2 * params.p3, y + dy * dt * 0.2 * params.p3, z + dz * dt * 0.2 * params.p3];
        },
        scale: 25,
        initPos: [0.349, 0, -0.16],
        initSpread: 0.05
      },
      clifford: {
        name: 'Clifford',
        params: [
          { name: 'a (Param A)', min: -3, max: 3, step: 0.1, default: -1.4 },
          { name: 'b (Param B)', min: -3, max: 3, step: 0.1, default: 1.6 },
          { name: 'c (Param C)', min: -3, max: 3, step: 0.1, default: 1.0 }
        ],
        compute: (x, y, z, params, dt) => {
          // Clifford attractor - treat as continuous ODE approximation
          const a = params.p1, b = params.p2, c = params.p3;
          const d = -0.6; // Fixed fourth parameter
          // Target positions from Clifford equations
          const tx = Math.sin(a * y) + c * Math.cos(a * x);
          const ty = Math.sin(b * x) + d * Math.cos(b * y);
          // Derivatives point toward target
          const dx = (tx - x) * 2;
          const dy = (ty - y) * 2;
          const dz = Math.sin(x * 3 + y * 2) * 0.5;
          return [x + dx * dt, y + dy * dt, z + dz * dt];
        },
        scale: 35,
        initPos: [0.1, 0.1, 0],
        initSpread: 1.5
      },
      dejong: {
        name: 'De Jong',
        params: [
          { name: 'a (Param A)', min: -3, max: 3, step: 0.1, default: -2.24 },
          { name: 'b (Param B)', min: -3, max: 3, step: 0.1, default: 0.43 },
          { name: 'c (Param C)', min: -3, max: 3, step: 0.1, default: -0.65 }
        ],
        compute: (x, y, z, params, dt) => {
          // De Jong attractor - continuous ODE approximation
          const a = params.p1, b = params.p2, c = params.p3;
          const d = 2.43; // Fixed fourth parameter
          // Target positions from De Jong equations
          const tx = Math.sin(a * y) - Math.cos(b * x);
          const ty = Math.sin(c * x) - Math.cos(d * y);
          // Derivatives point toward target
          const dx = (tx - x) * 1.5;
          const dy = (ty - y) * 1.5;
          const dz = Math.cos(x * 2 + y) * 0.3;
          return [x + dx * dt, y + dy * dt, z + dz * dt];
        },
        scale: 40,
        initPos: [0.5, 0.5, 0],
        initSpread: 1.2
      },
      pickover: {
        name: 'Pickover',
        params: [
          { name: 'a', min: -3, max: 3, step: 0.1, default: -0.966918 },
          { name: 'b', min: -3, max: 3, step: 0.1, default: 2.879879 },
          { name: 'c', min: -3, max: 3, step: 0.1, default: 0.765145 }
        ],
        compute: (x, y, z, params, dt) => {
          // Pickover attractor - 3D chaotic continuous approximation
          const a = params.p1, b = params.p2, c = params.p3;
          const d = 0.744728; // Fixed fourth parameter
          const tx = Math.sin(a * y) - z * Math.cos(b * x);
          const ty = z * Math.sin(c * x) - Math.cos(d * y);
          const tz = Math.sin(x);
          const dx = (tx - x) * 1.2;
          const dy = (ty - y) * 1.2;
          const dz = (tz - z) * 1.2;
          return [x + dx * dt, y + dy * dt, z + dz * dt];
        },
        scale: 50,
        initPos: [0.1, 0.1, 0.1],
        initSpread: 1.0
      }
    };
    
    // Curated defaults for each dataset+attractor combination
    // These are tested to produce clear, beautiful visualizations
    const curatedDefaults = {
      // Climate data works best with these
      'climate-lorenz': { p1: 10, p2: 28, p3: 2.667 },
      'climate-rossler': { p1: 0.2, p2: 0.2, p3: 5.7 },
      'climate-chen': { p1: 35, p2: 3, p3: 28 },
      'climate-aizawa': { p1: 0.95, p2: 0.7, p3: 0.6 },
      'climate-thomas': { p1: 0.208186, p2: 10, p3: 1.0 },
      'climate-halvorsen': { p1: 1.4, p2: 1, p3: 1 },
      
      // Economic data
      'economic-lorenz': { p1: 10, p2: 28, p3: 2.667 },
      'economic-rossler': { p1: 0.2, p2: 0.2, p3: 5.7 },
      'economic-chen': { p1: 35, p2: 3, p3: 28 },
      'economic-aizawa': { p1: 0.95, p2: 0.7, p3: 0.6 },
      'economic-thomas': { p1: 0.208186, p2: 10, p3: 1.0 },
      'economic-halvorsen': { p1: 1.4, p2: 1, p3: 1 },
      
      // Seismic data
      'seismic-lorenz': { p1: 10, p2: 28, p3: 2.667 },
      'seismic-rossler': { p1: 0.2, p2: 0.2, p3: 5.7 },
      'seismic-chen': { p1: 35, p2: 3, p3: 28 },
      'seismic-aizawa': { p1: 0.95, p2: 0.7, p3: 0.6 },
      'seismic-thomas': { p1: 0.208186, p2: 10, p3: 1.0 },
      'seismic-halvorsen': { p1: 1.4, p2: 1, p3: 1 },
      
      // Crypto data
      'crypto-lorenz': { p1: 10, p2: 28, p3: 2.667 },
      'crypto-rossler': { p1: 0.2, p2: 0.2, p3: 5.7 },
      'crypto-chen': { p1: 35, p2: 3, p3: 28 },
      'crypto-aizawa': { p1: 0.95, p2: 0.7, p3: 0.6 },
      'crypto-thomas': { p1: 0.208186, p2: 10, p3: 1.0 },
      'crypto-halvorsen': { p1: 1.4, p2: 1, p3: 1 },
      
      // Trending data
      'trending-lorenz': { p1: 10, p2: 28, p3: 2.667 },
      'trending-rossler': { p1: 0.2, p2: 0.2, p3: 5.7 },
      'trending-chen': { p1: 35, p2: 3, p3: 28 },
      'trending-aizawa': { p1: 0.95, p2: 0.7, p3: 0.6 },
      'trending-thomas': { p1: 0.208186, p2: 10, p3: 1.0 },
      'trending-halvorsen': { p1: 1.4, p2: 1, p3: 1 },
      
      // Audio data
      'audio-lorenz': { p1: 10, p2: 28, p3: 2.667 },
      'audio-rossler': { p1: 0.2, p2: 0.2, p3: 5.7 },
      'audio-chen': { p1: 35, p2: 3, p3: 28 },
      'audio-aizawa': { p1: 0.95, p2: 0.7, p3: 0.6 },
      'audio-thomas': { p1: 0.208186, p2: 10, p3: 1.0 },
      'audio-halvorsen': { p1: 1.4, p2: 1, p3: 1 },
      
      // Orbital data
      'orbital-lorenz': { p1: 10, p2: 28, p3: 2.667 },
      'orbital-rossler': { p1: 0.2, p2: 0.2, p3: 5.7 },
      'orbital-chen': { p1: 35, p2: 3, p3: 28 },
      'orbital-aizawa': { p1: 0.95, p2: 0.7, p3: 0.6 },
      'orbital-thomas': { p1: 0.208186, p2: 10, p3: 1.0 },
      'orbital-halvorsen': { p1: 1.4, p2: 1, p3: 1 },

      // Solar data
      'solar-lorenz': { p1: 10, p2: 28, p3: 2.667 },
      'solar-rossler': { p1: 0.2, p2: 0.2, p3: 5.7 },
      'solar-halvorsen': { p1: 1.4, p2: 1, p3: 1 },

      // Ocean data
      'ocean-lorenz': { p1: 10, p2: 28, p3: 2.667 },
      'ocean-rossler': { p1: 0.2, p2: 0.2, p3: 5.7 },
      'ocean-thomas': { p1: 0.208186, p2: 10, p3: 1.0 },

      // New attractors - defaults for all datasets
      'climate-sprott': { p1: 2.07, p2: 1.79, p3: 1.0 },
      'climate-dadras': { p1: 3.0, p2: 2.7, p3: 1.7 },
      'climate-bouali': { p1: 0.3, p2: 1.0, p3: 1.0 },
      'seismic-sprott': { p1: 2.07, p2: 1.79, p3: 1.0 },
      'crypto-sprott': { p1: 2.07, p2: 1.79, p3: 1.2 },
      'economic-dadras': { p1: 3.0, p2: 2.7, p3: 1.7 },
      'trending-bouali': { p1: 0.3, p2: 1.0, p3: 1.0 }
    };
    
    // Color schemes
    const colorSchemes = {
      bioluminescent: { start: [0, 255, 255], end: [255, 0, 255] },
      fire: { start: [255, 69, 0], end: [255, 215, 0] },
      ocean: { start: [0, 102, 255], end: [0, 255, 170] },
      sunset: { start: [255, 107, 53], end: [247, 147, 30] },
      forest: { start: [0, 255, 136], end: [0, 68, 34] },
      cosmic: { start: [153, 0, 255], end: [255, 0, 153] },
      aurora: { start: [0, 255, 136], end: [153, 0, 255] },
      lava: { start: [255, 0, 68], end: [255, 204, 0] },
      ice: { start: [255, 255, 255], end: [0, 136, 255] },
      neon: { start: [57, 255, 20], end: [255, 20, 147] },
      matrix: { start: [0, 255, 0], end: [0, 50, 0] },
      cyberpunk: { start: [255, 255, 0], end: [0, 255, 255] },
      // New color schemes
      pastel: { start: [255, 182, 193], end: [176, 224, 230] },
      monochrome: { start: [255, 255, 255], end: [80, 80, 80] },
      ember: { start: [255, 87, 34], end: [139, 0, 0] },
      electric: { start: [0, 191, 255], end: [255, 255, 0] },
      bloodmoon: { start: [139, 0, 0], end: [255, 140, 0] }
    };

    // Visual styles for different rendering aesthetics
    const VISUAL_STYLES = {
      clean: {
        id: 'clean',
        name: 'Clean',
        description: 'Crisp lines with subtle glow',
        category: 'modern',
        background: { type: 'solid', color: '#0a0a0a' },
        line: { renderer: 'canvas', width: 1.5, opacity: 1.0 },
        glow: { enabled: true, blur: 15, multiplier: 1.0 },
        rough: null,
        colorTransform: null
      },
      davinci: {
        id: 'davinci',
        name: 'Da Vinci',
        description: 'Aged parchment with ink sketches',
        category: 'artistic',
        background: { type: 'parchment', color: '#e8dcc4', texture: true },
        line: { renderer: 'rough', width: 1.0, opacity: 0.85, lineCap: 'round' },
        glow: { enabled: false },
        rough: { roughness: 2.5, bowing: 2.0 },
        colorTransform: 'sepia',  // Transform colors to sepia tones
        multiStroke: true  // Draw multiple strokes for ink effect
      },
      blueprint: {
        id: 'blueprint',
        name: 'Blueprint',
        description: 'Technical cyanotype drawing',
        category: 'technical',
        background: { type: 'grid', color: '#0a2540', gridColor: '#1a4a7c', gridSize: 20, gridWidth: 0.5 },
        line: { renderer: 'canvas', width: 1.2, opacity: 1.0 },
        glow: { enabled: true, blur: 12, multiplier: 1.5 },
        colorOverride: [220, 240, 255],  // Pale cyan-white lines
        rough: null,
        colorTransform: null
      },
      neon: {
        id: 'neon',
        name: 'Neon',
        description: 'Electric glow tubes',
        category: 'modern',
        background: { type: 'solid', color: '#050508' },
        line: { renderer: 'canvas', width: 2.5, opacity: 1.0 },
        glow: { enabled: true, blur: 35, multiplier: 3.0 },
        rough: null,
        colorTransform: 'saturate',  // Boost saturation for neon effect
        doubleGlow: true  // Extra glow pass for intensity
      },
      chalk: {
        id: 'chalk',
        name: 'Chalk',
        description: 'Dusty chalk on blackboard',
        category: 'artistic',
        background: { type: 'blackboard', color: '#1a2a1a', texture: true },
        line: { renderer: 'rough', width: 3.0, opacity: 0.75 },
        glow: { enabled: true, blur: 8, multiplier: 0.3 },
        rough: { roughness: 3.0, bowing: 1.5 },
        colorTransform: 'pastel',  // Soften to pastel chalk colors
        multiStroke: true
      },
      oscilloscope: {
        id: 'oscilloscope',
        name: 'Oscilloscope',
        description: 'Retro phosphor display',
        category: 'technical',
        background: { type: 'crt', color: '#0a0f0a' },
        line: { renderer: 'canvas', width: 2.0, opacity: 1.0 },
        glow: { enabled: true, blur: 20, multiplier: 2.5 },
        colorOverride: [0, 255, 100],  // Phosphor green
        rough: null,
        colorTransform: null,
        phosphorDecay: true  // Trails fade like phosphor afterglow
      },
      watercolor: {
        id: 'watercolor',
        name: 'Watercolor',
        description: 'Soft bleeding pigments',
        category: 'artistic',
        background: { type: 'paper', color: '#faf8f5', texture: true },
        line: { renderer: 'canvas', width: 4.0, opacity: 0.25 },
        glow: { enabled: true, blur: 25, multiplier: 0.8 },
        rough: null,
        colorTransform: 'watercolor',  // Muted, bleeding colors
        multiStroke: true  // Multiple semi-transparent strokes
      }
    };
    
    // Initialize particles with proper positions for each attractor
    function initParticles() {
      const count = parseInt(document.getElementById('particleSlider').value);
      particles = [];
      
      const attractor = attractors[currentAttractor];
      const [x0, y0, z0] = attractor.initPos;
      const spread = attractor.initSpread;
      
      for (let i = 0; i < count; i++) {
        particles.push({
          x: x0 + (Math.random() - 0.5) * spread,
          y: y0 + (Math.random() - 0.5) * spread,
          z: z0 + (Math.random() - 0.5) * spread,
          trail: []
        });
      }
    }
    
    // Generate parameter controls dynamically
    function generateParameterControls() {
      const container = document.getElementById('parametersContainer');
      const attractor = attractors[currentAttractor];
      const dataset = datasets[currentDataset];

      container.innerHTML = '';

      attractor.params.forEach((param, index) => {
        const paramKey = `p${index + 1}`;
        const value = currentParams[paramKey] !== undefined ? currentParams[paramKey] : param.default;

        const group = document.createElement('div');
        group.className = 'control-group';

        // Map to dataset parameter if available
        let labelText = param.name;
        if (dataset.params[index]) {
          labelText += ` ← ${dataset.params[index]}`;
        }

        // Add tooltip if available
        const tooltipHTML = param.tooltip ?
          `<span class="param-info" tabindex="0" role="tooltip" aria-label="${param.tooltip}">
            <span class="param-tooltip">${param.tooltip}</span>
          </span>` : '';

        group.innerHTML = `
          <div class="control-label">
            <span>${labelText}${tooltipHTML}</span>
            <span class="control-value" id="param${index + 1}Value">${value.toFixed(3)}</span>
          </div>
          <input type="range" id="param${index + 1}Slider"
                 min="${param.min}" max="${param.max}" step="${param.step}" value="${value}">
        `;

        container.appendChild(group);

        // Add event listener
        const slider = group.querySelector('input');
        const valueDisplay = group.querySelector('.control-value');
        slider.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          currentParams[paramKey] = val;
          valueDisplay.textContent = val.toFixed(3);
          // Update mapping display when parameter changes
          updateMappingDisplay();
        });
      });
    }
    
    // Load curated defaults for current dataset+attractor combination
    function loadCuratedDefaults() {
      const key = `${currentDataset}-${currentAttractor}`;
      const defaults = curatedDefaults[key];
      const attractor = attractors[currentAttractor];
      
      if (defaults) {
        currentParams = { ...defaults };
      } else {
        // Fallback to attractor defaults
        currentParams = {
          p1: attractor.params[0].default,
          p2: attractor.params[1].default,
          p3: attractor.params[2].default
        };
      }
      
      // Update dataset info
      const dataset = datasets[currentDataset];
      document.getElementById('datasetInfo').innerHTML = dataset.info;
      document.getElementById('datasetName').textContent = dataset.name;

      // Update mapping display
      updateMappingDisplay();
    }

    // Update attractor
    function updateAttractor() {
      const attractor = attractors[currentAttractor];
      document.getElementById('attractorName').textContent = attractor.name;

      // Update description if available
      const descEl = document.getElementById('attractorDescription');
      if (descEl && attractor.description) {
        descEl.textContent = attractor.description;
        descEl.style.display = 'block';
      } else if (descEl) {
        descEl.style.display = 'none';
      }

      loadCuratedDefaults();
      generateParameterControls();
      initParticles();
    }
    
    // Initialize rough.js canvas when needed
    function initRoughCanvas() {
      if (typeof rough !== 'undefined' && canvas) {
        roughCanvas = rough.canvas(canvas);
      }
    }

    // Render background based on current visual style
    function renderBackground() {
      const style = VISUAL_STYLES[currentStyle];
      const bg = style.background;

      // Fill base background
      ctx.fillStyle = bg.color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw grid if style has grid background
      if (bg.type === 'grid') {
        ctx.strokeStyle = bg.gridColor;
        ctx.lineWidth = bg.gridWidth || 0.5;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();

        // Vertical lines
        for (let x = 0; x <= canvas.width; x += bg.gridSize) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
        }

        // Horizontal lines
        for (let y = 0; y <= canvas.height; y += bg.gridSize) {
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
        }

        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }

      // Parchment texture (Da Vinci style)
      if (bg.type === 'parchment' && bg.texture) {
        ctx.globalAlpha = 0.08;
        for (let i = 0; i < 3000; i++) {
          const x = Math.random() * canvas.width;
          const y = Math.random() * canvas.height;
          const size = Math.random() * 2 + 0.5;
          ctx.fillStyle = Math.random() > 0.5 ? '#8b7355' : '#a08060';
          ctx.fillRect(x, y, size, size);
        }
        // Add some aging stains
        ctx.globalAlpha = 0.03;
        for (let i = 0; i < 5; i++) {
          const x = Math.random() * canvas.width;
          const y = Math.random() * canvas.height;
          const r = Math.random() * 150 + 50;
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
          gradient.addColorStop(0, '#6b5344');
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
        ctx.globalAlpha = 1.0;
      }

      // Blackboard texture (Chalk style)
      if (bg.type === 'blackboard' && bg.texture) {
        ctx.globalAlpha = 0.15;
        for (let i = 0; i < 2000; i++) {
          const x = Math.random() * canvas.width;
          const y = Math.random() * canvas.height;
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.1})`;
          ctx.fillRect(x, y, Math.random() * 3, 1);
        }
        ctx.globalAlpha = 1.0;
      }

      // CRT scanlines (Oscilloscope style)
      if (bg.type === 'crt') {
        ctx.globalAlpha = 0.08;
        ctx.fillStyle = '#001500';
        for (let y = 0; y < canvas.height; y += 3) {
          ctx.fillRect(0, y, canvas.width, 1);
        }
        // Subtle vignette
        const vignette = ctx.createRadialGradient(
          canvas.width / 2, canvas.height / 2, canvas.height * 0.3,
          canvas.width / 2, canvas.height / 2, canvas.height * 0.8
        );
        vignette.addColorStop(0, 'transparent');
        vignette.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;
      }

      // Paper texture (Watercolor style)
      if (bg.type === 'paper' && bg.texture) {
        ctx.globalAlpha = 0.04;
        for (let i = 0; i < 1500; i++) {
          const x = Math.random() * canvas.width;
          const y = Math.random() * canvas.height;
          ctx.fillStyle = Math.random() > 0.5 ? '#d0d0c8' : '#e8e8e0';
          ctx.fillRect(x, y, Math.random() * 4 + 1, Math.random() * 4 + 1);
        }
        ctx.globalAlpha = 1.0;
      }
    }

    // Get the effective line color for current style
    function getStyledColor(r, g, b, style) {
      // Color override takes precedence
      if (style.colorOverride) {
        return {
          r: style.colorOverride[0],
          g: style.colorOverride[1],
          b: style.colorOverride[2]
        };
      }

      // Apply color transforms
      if (style.colorTransform) {
        switch (style.colorTransform) {
          case 'sepia':
            // Convert to sepia/brown ink tones
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            return {
              r: Math.min(255, gray * 0.6 + 60),
              g: Math.min(255, gray * 0.4 + 30),
              b: Math.min(255, gray * 0.2 + 10)
            };

          case 'saturate':
            // Boost saturation for neon effect
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const mid = (max + min) / 2;
            const boost = 1.5;
            return {
              r: Math.min(255, Math.max(0, mid + (r - mid) * boost)),
              g: Math.min(255, Math.max(0, mid + (g - mid) * boost)),
              b: Math.min(255, Math.max(0, mid + (b - mid) * boost))
            };

          case 'pastel':
            // Soften to chalk pastel colors
            return {
              r: Math.floor(r * 0.6 + 100),
              g: Math.floor(g * 0.6 + 100),
              b: Math.floor(b * 0.6 + 100)
            };

          case 'watercolor':
            // Muted, natural pigment colors
            const lum = (r + g + b) / 3;
            return {
              r: Math.floor(r * 0.7 + lum * 0.2),
              g: Math.floor(g * 0.7 + lum * 0.2),
              b: Math.floor(b * 0.7 + lum * 0.2)
            };
        }
      }

      return { r, g, b };
    }

    // Draw a styled line segment using canvas or rough.js
    function drawStyledLine(x1, y1, x2, y2, r, g, b, alpha, brightnessMultiplier) {
      const style = VISUAL_STYLES[currentStyle];
      const { r: sr, g: sg, b: sb } = getStyledColor(r, g, b, style);

      // Apply brightness multiplier
      const fr = Math.min(255, Math.floor(sr * brightnessMultiplier));
      const fg = Math.min(255, Math.floor(sg * brightnessMultiplier));
      const fb = Math.min(255, Math.floor(sb * brightnessMultiplier));

      // Calculate effective opacity
      let effectiveOpacity = alpha * (style.line.opacity || 1.0);

      // Phosphor decay effect (oscilloscope) - exponential fade
      if (style.phosphorDecay) {
        effectiveOpacity = Math.pow(alpha, 0.5) * (style.line.opacity || 1.0);
      }

      // Combine style line width with user's lineWidth setting
      const effectiveLineWidth = style.line.width * (lineWidth / 1.5);

      // Set line cap
      ctx.lineCap = style.line.lineCap || 'butt';
      ctx.lineJoin = 'round';

      if (style.line.renderer === 'rough' && roughCanvas && style.rough) {
        // Use rough.js for hand-drawn effect
        const adjustedRoughness = style.rough.roughness * Math.max(0.3, alpha);

        try {
          // Multi-stroke for ink/chalk effect
          if (style.multiStroke) {
            // Draw multiple slightly offset strokes for richer texture
            const offsets = [
              { dx: 0, dy: 0, opacity: 1.0 },
              { dx: 0.5, dy: 0.3, opacity: 0.6 },
              { dx: -0.3, dy: 0.5, opacity: 0.4 }
            ];
            offsets.forEach(({ dx, dy, opacity }) => {
              roughCanvas.line(x1 + dx, y1 + dy, x2 + dx, y2 + dy, {
                stroke: `rgba(${fr}, ${fg}, ${fb}, ${effectiveOpacity * opacity})`,
                strokeWidth: effectiveLineWidth * (opacity === 1 ? 1 : 0.7),
                roughness: adjustedRoughness * (1 + Math.random() * 0.3),
                bowing: style.rough.bowing * (1 + Math.random() * 0.2)
              });
            });
          } else {
            roughCanvas.line(x1, y1, x2, y2, {
              stroke: `rgba(${fr}, ${fg}, ${fb}, ${effectiveOpacity})`,
              strokeWidth: effectiveLineWidth,
              roughness: adjustedRoughness,
              bowing: style.rough.bowing
            });
          }
        } catch (e) {
          // Fallback to canvas
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = `rgba(${fr}, ${fg}, ${fb}, ${effectiveOpacity})`;
          ctx.lineWidth = effectiveLineWidth;
          ctx.stroke();
        }
      } else {
        // Standard canvas rendering

        // Double glow for neon effect - draw a wider, more diffuse glow first
        if (style.doubleGlow && style.glow && style.glow.enabled && glowIntensity > 0) {
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = `rgba(${fr}, ${fg}, ${fb}, ${effectiveOpacity * 0.3})`;
          ctx.lineWidth = effectiveLineWidth * 3;
          ctx.shadowColor = `rgba(${fr}, ${fg}, ${fb}, 0.8)`;
          ctx.shadowBlur = style.glow.blur * 2 * (glowIntensity / 20);
          ctx.stroke();
        }

        // Multi-stroke for watercolor bleeding effect
        if (style.multiStroke && !style.rough) {
          const strokes = [
            { offset: 0, widthMult: 1.0, opacityMult: 1.0 },
            { offset: 1.5, widthMult: 1.3, opacityMult: 0.3 },
            { offset: -1.5, widthMult: 1.3, opacityMult: 0.3 },
            { offset: 0, widthMult: 2.0, opacityMult: 0.15 }
          ];
          strokes.forEach(({ offset, widthMult, opacityMult }) => {
            ctx.beginPath();
            // Perpendicular offset
            const dx = y2 - y1;
            const dy = x1 - x2;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const ox = (dx / len) * offset;
            const oy = (dy / len) * offset;
            ctx.moveTo(x1 + ox, y1 + oy);
            ctx.lineTo(x2 + ox, y2 + oy);
            ctx.strokeStyle = `rgba(${fr}, ${fg}, ${fb}, ${effectiveOpacity * opacityMult})`;
            ctx.lineWidth = effectiveLineWidth * widthMult;
            ctx.shadowBlur = 0;
            ctx.stroke();
          });
        } else {
          // Standard single stroke
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.strokeStyle = `rgba(${fr}, ${fg}, ${fb}, ${effectiveOpacity})`;
          ctx.lineWidth = effectiveLineWidth;

          // Apply glow if enabled
          if (style.glow && style.glow.enabled && glowIntensity > 0) {
            const glowBlur = style.glow.blur * (style.glow.multiplier || 1.0);
            ctx.shadowColor = `rgba(${fr}, ${fg}, ${fb}, ${effectiveOpacity * 0.6})`;
            ctx.shadowBlur = glowBlur * (glowIntensity / 20);
          } else {
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
          }

          ctx.stroke();
        }

        // Reset
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.lineCap = 'butt';
      }
    }

    // Get point reduction factor for rough.js styles (performance optimization)
    function getPointReductionFactor() {
      const style = VISUAL_STYLES[currentStyle];
      return style.line.renderer === 'rough' ? 3 : 1;
    }

    // Render loop - clean clear each frame with optional glow
    function render() {
      // FPS tracking
      frameCount++;
      const now = performance.now();
      if (now - lastFpsUpdate >= 1000) {
        currentFps = Math.round(frameCount * 1000 / (now - lastFpsUpdate));
        frameCount = 0;
        lastFpsUpdate = now;
        const fpsEl = document.getElementById('fpsCount');
        if (fpsEl) fpsEl.textContent = currentFps;
      }

      // Clear canvas and render background based on style
      renderBackground();

      const dt = 0.005 * speed;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const attractor = attractors[currentAttractor];
      const scale = attractor.scale * zoom;
      const colors = colorSchemes[currentColorScheme];

      // Auto rotate
      if (autoRotate) {
        rotationY += 0.005;
      }

      // Apply glow based on style and user setting
      const currentStyleObj = VISUAL_STYLES[currentStyle];
      if (currentStyleObj.glow && currentStyleObj.glow.enabled && glowIntensity > 0) {
        const glowBlur = currentStyleObj.glow.blur * (currentStyleObj.glow.multiplier || 1.0);
        ctx.shadowBlur = glowBlur * (glowIntensity / 20);
      } else {
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
      }

      // Get point reduction for performance (rough.js styles skip points)
      const pointReduction = getPointReductionFactor();

      particles.forEach((p, i) => {
        // Compute next position
        const [nx, ny, nz] = attractor.compute(p.x, p.y, p.z, currentParams, dt);

        // Check for NaN or Infinity (diverged attractor)
        if (!isFinite(nx) || !isFinite(ny) || !isFinite(nz)) {
          // Reset this particle
          const [x0, y0, z0] = attractor.initPos;
          const spread = attractor.initSpread;
          p.x = x0 + (Math.random() - 0.5) * spread;
          p.y = y0 + (Math.random() - 0.5) * spread;
          p.z = z0 + (Math.random() - 0.5) * spread;
          p.trail = [];
          return;
        }

        // Update position
        p.x = nx;
        p.y = ny;
        p.z = nz;

        // Add to trail (use configurable trail length)
        p.trail.push({ x: nx, y: ny, z: nz });
        while (p.trail.length > trailLength) p.trail.shift();

        // Draw trail as continuous path (or segmented for trail fade)
        if (p.trail.length > 1) {
          // Color based on particle index for variety
          const t = i / particles.length;
          const r = Math.floor(colors.start[0] + (colors.end[0] - colors.start[0]) * t);
          const g = Math.floor(colors.start[1] + (colors.end[1] - colors.start[1]) * t);
          const b = Math.floor(colors.start[2] + (colors.end[2] - colors.start[2]) * t);

          // Calculate depth brightness factor from last point
          let brightnessMultiplier = 1;
          if (depthBrightness && p.trail.length > 0) {
            const lastPoint = p.trail[p.trail.length - 1];
            const rotZ = lastPoint.y * Math.sin(rotationX) + lastPoint.z * Math.cos(rotationX);
            const finalZ = lastPoint.x * Math.sin(rotationY) + rotZ * Math.cos(rotationY);
            // Normalize depth to 0-1 range and map to brightness (closer = brighter)
            brightnessMultiplier = 0.4 + 0.6 * (1 - Math.max(0, Math.min(1, (finalZ + 50) / 100)));
          }

          if (trailFade) {
            // Draw segmented trail with fading opacity using styled lines
            for (let j = 1; j < p.trail.length; j += pointReduction) {
              const prevJ = Math.max(0, j - pointReduction);
              const prevPoint = p.trail[prevJ];
              const point = p.trail[j];

              // 3D rotation for previous point
              const prevRotX = prevPoint.y * Math.cos(rotationX) - prevPoint.z * Math.sin(rotationX);
              const prevRotZ = prevPoint.y * Math.sin(rotationX) + prevPoint.z * Math.cos(rotationX);
              const prevFinalX = prevPoint.x * Math.cos(rotationY) - prevRotZ * Math.sin(rotationY);
              const prevFinalY = prevRotX;
              const prevScreenX = centerX + prevFinalX * scale + panX;
              const prevScreenY = centerY + prevFinalY * scale + panY;

              // 3D rotation for current point
              const rotX_pt = point.y * Math.cos(rotationX) - point.z * Math.sin(rotationX);
              const rotZ_pt = point.y * Math.sin(rotationX) + point.z * Math.cos(rotationX);
              const finalX = point.x * Math.cos(rotationY) - rotZ_pt * Math.sin(rotationY);
              const finalY = rotX_pt;
              const screenX = centerX + finalX * scale + panX;
              const screenY = centerY + finalY * scale + panY;

              // Opacity fades from 0 at start of trail to 1 at end
              const segmentProgress = j / p.trail.length;
              const opacity = segmentProgress;

              // Use the styled line drawing function
              drawStyledLine(prevScreenX, prevScreenY, screenX, screenY, r, g, b, opacity, brightnessMultiplier);
            }
          } else {
            // Solid trail rendering using styled lines
            for (let j = 1; j < p.trail.length; j += pointReduction) {
              const prevJ = Math.max(0, j - pointReduction);
              const prevPoint = p.trail[prevJ];
              const point = p.trail[j];

              // 3D rotation for previous point
              const prevRotX = prevPoint.y * Math.cos(rotationX) - prevPoint.z * Math.sin(rotationX);
              const prevRotZ = prevPoint.y * Math.sin(rotationX) + prevPoint.z * Math.cos(rotationX);
              const prevFinalX = prevPoint.x * Math.cos(rotationY) - prevRotZ * Math.sin(rotationY);
              const prevFinalY = prevRotX;
              const prevScreenX = centerX + prevFinalX * scale + panX;
              const prevScreenY = centerY + prevFinalY * scale + panY;

              // 3D rotation for current point
              const rotX_pt = point.y * Math.cos(rotationX) - point.z * Math.sin(rotationX);
              const rotZ_pt = point.y * Math.sin(rotationX) + point.z * Math.cos(rotationX);
              const finalX = point.x * Math.cos(rotationY) - rotZ_pt * Math.sin(rotationY);
              const finalY = rotX_pt;
              const screenX = centerX + finalX * scale + panX;
              const screenY = centerY + finalY * scale + panY;

              // Use the styled line drawing function with full opacity
              drawStyledLine(prevScreenX, prevScreenY, screenX, screenY, r, g, b, 1.0, brightnessMultiplier);
            }
          }
        }
      });
      
      // Auto-animate parameter if enabled
      if (isAutoAnimating) {
        const attractor = attractors[currentAttractor];
        const paramIndex = parseInt(autoAnimateParam.replace('p', '')) - 1;
        const param = attractor.params[paramIndex];
        
        if (param) {
          let newValue = currentParams[autoAnimateParam] + autoAnimateDirection * autoAnimateSpeed * (param.max - param.min);
          
          // Bounce at boundaries
          if (newValue >= param.max) {
            newValue = param.max;
            autoAnimateDirection = -1;
          } else if (newValue <= param.min) {
            newValue = param.min;
            autoAnimateDirection = 1;
          }
          
          currentParams[autoAnimateParam] = newValue;
          
          // Update slider display
          const slider = document.getElementById(`param${paramIndex + 1}Slider`);
          const valueDisplay = document.getElementById(`param${paramIndex + 1}Value`);
          if (slider) slider.value = newValue;
          if (valueDisplay) valueDisplay.textContent = newValue.toFixed(3);
        }
      }
      
      if (isPlaying) {
        animationId = requestAnimationFrame(render);
      }
    }
    
    // Event listeners
    document.getElementById('datasetSelect').addEventListener('change', (e) => {
      pushState();
      currentDataset = e.target.value;
      updateAttractor();
    });

    document.getElementById('attractorSelect').addEventListener('change', (e) => {
      pushState();
      currentAttractor = e.target.value;
      updateAttractor();
    });

    document.getElementById('particleSlider').addEventListener('input', (e) => {
      pushState();
      const val = e.target.value;
      document.getElementById('particleValue').textContent = val;
      document.getElementById('particleCount').textContent = val;
      initParticles();
    });

    document.getElementById('speedSlider').addEventListener('input', (e) => {
      pushState();
      speed = parseFloat(e.target.value);
      updateSpeedDisplay();
    });

    // Update all speed displays
    function updateSpeedDisplay() {
      document.getElementById('speedValue').textContent = speed.toFixed(1) + '×';
      document.getElementById('speedIndicator').textContent = speed.toFixed(1) + 'x';
    }

    // Update all play/pause button states
    function updatePlayPauseState() {
      const sidebarBtn = document.getElementById('playPauseBtn');
      const floatingBtn = document.getElementById('floatingPlayPauseBtn');

      if (sidebarBtn) {
        sidebarBtn.textContent = isPlaying ? '⏸ Pause' : '▶ Play';
      }
      if (floatingBtn) {
        floatingBtn.classList.toggle('paused', !isPlaying);
        floatingBtn.setAttribute('aria-pressed', isPlaying);
        floatingBtn.setAttribute('aria-label', isPlaying ? 'Pause animation' : 'Play animation');
        floatingBtn.title = isPlaying ? 'Pause' : 'Play';
      }
    }

    // Floating playback controls
    document.getElementById('floatingPlayPauseBtn').addEventListener('click', () => {
      isPlaying = !isPlaying;
      updatePlayPauseState();
      if (isPlaying) {
        render();
      }
    });

    document.getElementById('speedDownBtn').addEventListener('click', () => {
      pushState();
      speed = Math.max(0.1, speed - 0.5);
      document.getElementById('speedSlider').value = speed;
      updateSpeedDisplay();
    });

    document.getElementById('speedUpBtn').addEventListener('click', () => {
      pushState();
      speed = Math.min(5, speed + 0.5);
      document.getElementById('speedSlider').value = speed;
      updateSpeedDisplay();
    });

    // Initialize speed display
    updateSpeedDisplay();
    
    // Color scheme selection with keyboard support
    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach((option, index) => {
      option.addEventListener('click', () => selectColorScheme(option));
      option.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectColorScheme(option);
        } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const next = colorOptions[(index + 1) % colorOptions.length];
          next.focus();
          selectColorScheme(next);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = colorOptions[(index - 1 + colorOptions.length) % colorOptions.length];
          prev.focus();
          selectColorScheme(prev);
        }
      });
    });

    function selectColorScheme(option) {
      pushState();
      colorOptions.forEach(o => {
        o.classList.remove('active');
        o.setAttribute('aria-checked', 'false');
        o.setAttribute('tabindex', '-1');
      });
      option.classList.add('active');
      option.setAttribute('aria-checked', 'true');
      option.setAttribute('tabindex', '0');
      currentColorScheme = option.dataset.scheme;
    }

    // Trail length slider
    document.getElementById('trailSlider').addEventListener('input', (e) => {
      pushState();
      trailLength = parseInt(e.target.value);
      document.getElementById('trailValue').textContent = trailLength;
    });

    // Glow intensity slider
    document.getElementById('glowSlider').addEventListener('input', (e) => {
      pushState();
      glowIntensity = parseInt(e.target.value);
      document.getElementById('glowValue').textContent = glowIntensity;
    });

    // Line width slider
    document.getElementById('lineWidthSlider').addEventListener('input', (e) => {
      pushState();
      lineWidth = parseFloat(e.target.value);
      document.getElementById('lineWidthValue').textContent = lineWidth.toFixed(1);
    });

    // Trail fade toggle
    document.getElementById('trailFadeToggle').addEventListener('change', (e) => {
      pushState();
      trailFade = e.target.checked;
    });

    // Depth brightness toggle
    document.getElementById('depthBrightnessToggle').addEventListener('change', (e) => {
      pushState();
      depthBrightness = e.target.checked;
    });
    
    // Famous bifurcation presets
    const presets = {
      // Lorenz family
      'lorenz-classic': { attractor: 'lorenz', params: { p1: 10, p2: 28, p3: 2.667 } },
      'lorenz-periodic': { attractor: 'lorenz', params: { p1: 10, p2: 24.74, p3: 2.667 } },
      'lorenz-transient': { attractor: 'lorenz', params: { p1: 10, p2: 21, p3: 2.667 } },
      'chen-hyperchaos': { attractor: 'chen', params: { p1: 40, p2: 3, p3: 28 } },
      'lu-bridge': { attractor: 'lu', params: { p1: 36, p2: 3, p3: 20 } },
      // Rössler family
      'rossler-funnel': { attractor: 'rossler', params: { p1: 0.2, p2: 0.2, p3: 4 } },
      'rossler-screw': { attractor: 'rossler', params: { p1: 0.2, p2: 0.2, p3: 18 } },
      // Circuit attractors
      'chua-doublescroll': { attractor: 'chua', params: { p1: 15.6, p2: 28, p3: -1.143 } },
      'chua-spiral': { attractor: 'chua', params: { p1: 15, p2: 25.58, p3: -1.02 } },
      // Multi-wing
      'fourwing-symmetric': { attractor: 'fourwing', params: { p1: 0.2, p2: 0.01, p3: -0.4 } },
      'dadras-triscroll': { attractor: 'dadras', params: { p1: 3.0, p2: 2.7, p3: 1.7 } },
      'dequan-complex': { attractor: 'dequan', params: { p1: 40, p2: 1.833, p3: 0.16 } },
      // Geometric
      'thomas-slow': { attractor: 'thomas', params: { p1: 0.18, p2: 10, p3: 1.0 } },
      'aizawa-spiral': { attractor: 'aizawa', params: { p1: 0.95, p2: 0.7, p3: 0.6 } },
      'halvorsen-symmetric': { attractor: 'halvorsen', params: { p1: 1.4, p2: 1, p3: 1 } },
      // Physics
      'nose-thermostat': { attractor: 'nose', params: { p1: 1.5, p2: 1.0, p3: 1.0 } },
      'shimizu-laser': { attractor: 'shimizu', params: { p1: 0.85, p2: 0.5, p3: 1.0 } },
      'rabinovich-plasma': { attractor: 'rabinovich', params: { p1: 0.87, p2: 1.1, p3: 0.5 } },
      // Simple
      'sprott-minimal': { attractor: 'sprott', params: { p1: 2.07, p2: 1.79, p3: 1.0 } },
      'genesio-quadratic': { attractor: 'genesio', params: { p1: 0.44, p2: 1.1, p3: 1.0 } },
      'arneodo-simple': { attractor: 'arneodo', params: { p1: -5.5, p2: 3.5, p3: -1.0 } }
    };
    
    document.getElementById('presetSelect').addEventListener('change', (e) => {
      const presetKey = e.target.value;
      if (!presetKey) return;

      pushState();

      const preset = presets[presetKey];
      currentAttractor = preset.attractor;
      document.getElementById('attractorSelect').value = currentAttractor;

      currentParams = { ...preset.params };
      document.getElementById('attractorName').textContent = attractors[currentAttractor].name;
      generateParameterControls();
      initParticles();

      // Reset select
      e.target.value = '';
    });
    
    // Play/Pause toggle (sidebar button)
    document.getElementById('playPauseBtn').addEventListener('click', () => {
      isPlaying = !isPlaying;
      updatePlayPauseState();
      if (isPlaying) {
        render();
      }
    });

    // Auto rotate toggle (New Feature)
    document.getElementById('autoRotateBtn').addEventListener('click', () => {
        autoRotate = !autoRotate;
        const btn = document.getElementById('autoRotateBtn');
        btn.textContent = autoRotate ? 'Stop Rotate' : 'Auto Rotate';
        btn.setAttribute('aria-pressed', autoRotate);
    });
    
    // Auto-animate parameter toggle
    document.getElementById('autoAnimateBtn').addEventListener('click', () => {
      isAutoAnimating = !isAutoAnimating;
      const btn = document.getElementById('autoAnimateBtn');
      btn.textContent = isAutoAnimating ? '⏹ Stop Animation' : '🎬 Auto-Animate Parameter';
      
      // If starting animation, prompt for which parameter
      if (isAutoAnimating) {
        const attractor = attractors[currentAttractor];
        const paramNames = attractor.params.map((p, i) => `${i + 1}: ${p.name}`).join('\n');
        const choice = prompt(`Which parameter to animate? (1-3)\n\n${paramNames}`, '2');
        if (choice && ['1', '2', '3'].includes(choice)) {
          autoAnimateParam = 'p' + choice;
        } else {
          isAutoAnimating = false;
          btn.textContent = '🎬 Auto-Animate Parameter';
        }
      }
    });
    
    // Apply a combo (curated or random)
    function applyCombo(combo) {
      pushState();

      currentDataset = combo.dataset;
      currentAttractor = combo.attractor;
      currentColorScheme = combo.color;
      currentParams = { ...combo.params };

      // Apply style if included in combo
      if (combo.style) {
        currentStyle = combo.style;

        // Update style UI
        document.querySelectorAll('.style-card').forEach(c => {
          const isActive = c.dataset.style === currentStyle;
          c.classList.toggle('active', isActive);
          c.setAttribute('aria-checked', isActive ? 'true' : 'false');
          c.setAttribute('tabindex', isActive ? '0' : '-1');
        });
        updateStyleInfo(currentStyle);

        // Initialize rough canvas if needed
        if (VISUAL_STYLES[currentStyle].line.renderer === 'rough') {
          initRoughCanvas();
        }
      }

      document.getElementById('datasetSelect').value = currentDataset;
      document.getElementById('attractorSelect').value = currentAttractor;

      // Update color selection
      document.querySelectorAll('.color-option').forEach(o => {
        const isActive = o.dataset.scheme === currentColorScheme;
        o.classList.toggle('active', isActive);
        o.setAttribute('aria-checked', isActive ? 'true' : 'false');
        o.setAttribute('tabindex', isActive ? '0' : '-1');
      });

      document.getElementById('attractorName').textContent = attractors[currentAttractor].name;
      document.getElementById('datasetName').textContent = datasets[currentDataset].name;
      document.getElementById('datasetInfo').innerHTML = datasets[currentDataset].info;

      generateParameterControls();
      initParticles();
    }

    // Get next combo - curated first, then random
    function getNextCombo() {
      if (curatedComboIndex < beautifulCombos.length) {
        const combo = beautifulCombos[curatedComboIndex];
        curatedComboIndex++;
        return combo;
      } else {
        // After curated combos, generate truly random
        const datasetKeys = Object.keys(datasets);
        const attractorKeys = Object.keys(attractors);
        const colorKeys = Object.keys(colorSchemes);
        const styleKeys = Object.keys(VISUAL_STYLES);
        const randomDataset = datasetKeys[Math.floor(Math.random() * datasetKeys.length)];
        const randomAttractor = attractorKeys[Math.floor(Math.random() * attractorKeys.length)];
        const randomColor = colorKeys[Math.floor(Math.random() * colorKeys.length)];
        // 30% chance to change style on random (keep clean most of the time)
        const randomStyle = Math.random() < 0.3 ? styleKeys[Math.floor(Math.random() * styleKeys.length)] : currentStyle;
        const key = `${randomDataset}-${randomAttractor}`;
        const params = curatedDefaults[key] || {
          p1: attractors[randomAttractor].params[0].default,
          p2: attractors[randomAttractor].params[1].default,
          p3: attractors[randomAttractor].params[2].default
        };
        return { dataset: randomDataset, attractor: randomAttractor, color: randomColor, style: randomStyle, params };
      }
    }

    document.getElementById('randomBtn').addEventListener('click', () => {
      applyCombo(getNextCombo());
    });
    
    // Export PNG with watermark
    document.getElementById('exportBtn').addEventListener('click', () => {
      // Create a temporary canvas for export
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = canvas.width;
      exportCanvas.height = canvas.height;
      const exportCtx = exportCanvas.getContext('2d');

      // Copy current canvas
      exportCtx.drawImage(canvas, 0, 0);

      // Determine watermark colors based on style (light vs dark background)
      const style = VISUAL_STYLES[currentStyle];
      const isLightBg = ['davinci', 'watercolor'].includes(currentStyle);
      const watermarkColor = isLightBg ? 'rgba(100, 100, 100, 0.7)' : 'rgba(0, 255, 255, 0.6)';
      const infoColor = isLightBg ? 'rgba(60, 60, 60, 0.8)' : 'rgba(255, 255, 255, 0.7)';

      // Add watermark
      exportCtx.font = '14px Inter, sans-serif';
      exportCtx.fillStyle = watermarkColor;
      exportCtx.textAlign = 'right';
      exportCtx.fillText('dr.eamer.dev/datavis', exportCanvas.width - 20, exportCanvas.height - 20);

      // Add attractor info
      exportCtx.textAlign = 'left';
      exportCtx.fillStyle = infoColor;
      exportCtx.fillText(`${attractors[currentAttractor].name} Attractor · ${datasets[currentDataset].name} Data · ${style.name} Style`, 20, exportCanvas.height - 20);
      
      // Download
      const link = document.createElement('a');
      link.download = `attractor-${currentAttractor}-${currentDataset}-${Date.now()}.png`;
      link.href = exportCanvas.toDataURL('image/png');
      link.click();
    });
    
    // Reset view (pan, zoom, rotation)
    document.getElementById('resetBtn').addEventListener('click', () => {
      pushState();
      panX = 0;
      panY = 0;
      zoom = 1;
      rotationX = 0.5;
      rotationY = 0.5;
      updateAttractor();
    });

    // Undo button
    const undoBtn = document.getElementById('undoBtn');
    if (undoBtn) {
      undoBtn.addEventListener('click', undo);
    }
    
    // Modal handling with focus trap
    const modal = document.getElementById('modal');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    let lastFocusedElement = null;

    function openModal() {
      lastFocusedElement = document.activeElement;
      modal.classList.add('active');
      modalCloseBtn.focus();

      // Trap focus inside modal
      modal.addEventListener('keydown', trapFocus);
    }

    function closeModal() {
      modal.classList.remove('active');
      modal.removeEventListener('keydown', trapFocus);
      if (lastFocusedElement) {
        lastFocusedElement.focus();
      }
    }

    function trapFocus(e) {
      if (e.key === 'Tab') {
        const focusableElements = modal.querySelectorAll('button, a[href], input, select');
        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      } else if (e.key === 'Escape') {
        closeModal();
      }
    }

    document.getElementById('infoBtn').addEventListener('click', openModal);
    modalCloseBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
    
    // Mouse controls - drag to rotate, shift+drag or right-click drag to pan
    canvas.addEventListener('mousedown', (e) => {
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      if (e.shiftKey || e.button === 2) {
        isPanning = true;
        isDragging = false;
      } else {
        isDragging = true;
        isPanning = false;
      }
    });
    
    canvas.addEventListener('mousemove', (e) => {
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      
      if (isPanning) {
        panX += dx;
        panY += dy;
      } else if (isDragging) {
        rotationY += dx * 0.005;
        rotationX += dy * 0.005;
      }
      
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    });
    
    canvas.addEventListener('mouseup', () => {
      isDragging = false;
      isPanning = false;
    });
    
    canvas.addEventListener('mouseleave', () => {
      isDragging = false;
      isPanning = false;
    });
    
    // Prevent context menu on right-click
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
    
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      zoom *= e.deltaY > 0 ? 0.95 : 1.05;
      zoom = Math.max(0.3, Math.min(5, zoom));
    });
    
    // Touch controls for mobile
    let touchStartX = 0;
    let touchStartY = 0;
    let lastTouchDistance = 0;
    let isTwoFingerTouch = false;
    
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        isDragging = true;
        isTwoFingerTouch = false;
      } else if (e.touches.length === 2) {
        isTwoFingerTouch = true;
        isDragging = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
        touchStartX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        touchStartY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      }
    }, { passive: false });
    
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length === 1 && isDragging) {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        rotationY += dx * 0.005;
        rotationX += dy * 0.005;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      } else if (e.touches.length === 2 && isTwoFingerTouch) {
        // Pinch to zoom
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const zoomDelta = distance / lastTouchDistance;
        zoom *= zoomDelta;
        zoom = Math.max(0.3, Math.min(5, zoom));
        lastTouchDistance = distance;
        
        // Two-finger drag to pan
        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
        panX += centerX - touchStartX;
        panY += centerY - touchStartY;
        touchStartX = centerX;
        touchStartY = centerY;
      }
    }, { passive: false });
    
    canvas.addEventListener('touchend', () => {
      isDragging = false;
      isTwoFingerTouch = false;
    });

    // Mobile hamburger menu toggle
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebar = document.querySelector('.sidebar');

    function toggleMobileSidebar() {
      const isOpen = sidebar.classList.toggle('open');
      hamburgerBtn.setAttribute('aria-expanded', isOpen);
      if (isOpen) {
        document.body.classList.add('sidebar-open');
      } else {
        document.body.classList.remove('sidebar-open');
      }
    }

    function closeMobileSidebar() {
      sidebar.classList.remove('open');
      hamburgerBtn.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('sidebar-open');
    }

    // Desktop sidebar toggle
    function toggleDesktopSidebar() {
      if (window.innerWidth > 768) {
        sidebarCollapsed = !sidebarCollapsed;
        sidebar.classList.toggle('collapsed', sidebarCollapsed);
        canvas.classList.toggle('expanded', sidebarCollapsed);
        sidebarToggleBtn.classList.toggle('collapsed', sidebarCollapsed);
        sidebarToggleBtn.innerHTML = sidebarCollapsed ? '▶' : '◀';
        sidebarToggleBtn.setAttribute('aria-expanded', !sidebarCollapsed);
        sidebarToggleBtn.setAttribute('aria-label', sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar');

        // Resize canvas after transition
        setTimeout(() => {
          resizeCanvas();
        }, 300);
      }
    }

    if (hamburgerBtn) {
      hamburgerBtn.addEventListener('click', toggleMobileSidebar);
    }

    if (sidebarCloseBtn) {
      sidebarCloseBtn.addEventListener('click', closeMobileSidebar);
    }

    if (sidebarToggleBtn) {
      sidebarToggleBtn.addEventListener('click', toggleDesktopSidebar);
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 &&
          sidebar.classList.contains('open') &&
          !sidebar.contains(e.target) &&
          e.target !== hamburgerBtn) {
        closeMobileSidebar();
      }
    });

    // Fullscreen toggle
    document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);

    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
          console.log('Fullscreen not available:', err);
        });
      } else {
        document.exitFullscreen();
      }
    }

    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Don't trigger if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
          e.preventDefault();
          document.getElementById('playPauseBtn').click();
          break;
        case 'r':
          document.getElementById('randomBtn').click();
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'escape':
          if (document.getElementById('modal').classList.contains('active')) {
            closeModal();
          } else if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
            closeMobileSidebar();
          }
          break;
        case 'arrowleft':
          if (document.activeElement === canvas) {
            e.preventDefault();
            rotationY -= 0.1;
          }
          break;
        case 'arrowright':
          if (document.activeElement === canvas) {
            e.preventDefault();
            rotationY += 0.1;
          }
          break;
        case 'arrowup':
          if (document.activeElement === canvas) {
            e.preventDefault();
            rotationX -= 0.1;
          }
          break;
        case 'arrowdown':
          if (document.activeElement === canvas) {
            e.preventDefault();
            rotationX += 0.1;
          }
          break;
        case '+':
        case '=':
          if (document.activeElement === canvas) {
            e.preventDefault();
            zoom = Math.min(5, zoom * 1.1);
          }
          break;
        case '-':
          if (document.activeElement === canvas) {
            e.preventDefault();
            zoom = Math.max(0.3, zoom / 1.1);
          }
          break;
      }
    });

    // Mood filter functionality
    let currentMoodFilter = 'all';
    const moodButtons = document.querySelectorAll('.mood-btn');
    const colorCategories = document.querySelectorAll('.color-category');

    moodButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        currentMoodFilter = btn.dataset.mood;

        // Update active state
        moodButtons.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');

        // Filter color categories
        if (currentMoodFilter === 'all') {
          colorCategories.forEach(cat => cat.classList.remove('hidden'));
        } else {
          colorCategories.forEach(cat => {
            if (cat.dataset.category === currentMoodFilter) {
              cat.classList.remove('hidden');
            } else {
              cat.classList.add('hidden');
            }
          });
        }
      });
    });

    // ================================
    // VISUAL STYLE SYSTEM UI
    // ================================

    // Initialize style grid with all styles
    function initStyleUI() {
      const grid = document.getElementById('styleGrid');
      if (!grid) return;

      // Clear existing content
      grid.innerHTML = '';

      // Create style cards
      Object.values(VISUAL_STYLES).forEach(style => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'style-card' + (style.id === currentStyle ? ' active' : '');
        card.dataset.style = style.id;
        card.dataset.category = style.category;
        card.title = style.name;
        card.setAttribute('role', 'radio');
        card.setAttribute('aria-checked', style.id === currentStyle ? 'true' : 'false');
        card.setAttribute('tabindex', style.id === currentStyle ? '0' : '-1');
        card.innerHTML = `<span class="style-label">${style.name}</span>`;

        card.addEventListener('click', () => selectStyle(style.id));
        card.addEventListener('keydown', (e) => handleStyleKeyboard(e, style.id));

        grid.appendChild(card);
      });

      // Set up category filter buttons
      document.querySelectorAll('.style-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => filterStylesByCategory(btn.dataset.category));
      });

      // Update info display
      updateStyleInfo(currentStyle);
    }

    // Select a visual style
    function selectStyle(styleId) {
      if (!VISUAL_STYLES[styleId]) return;

      pushState();  // For undo
      currentStyle = styleId;

      // Update UI
      document.querySelectorAll('.style-card').forEach(c => {
        const isActive = c.dataset.style === styleId;
        c.classList.toggle('active', isActive);
        c.setAttribute('aria-checked', isActive ? 'true' : 'false');
        c.setAttribute('tabindex', isActive ? '0' : '-1');
      });

      updateStyleInfo(styleId);

      // Initialize rough canvas if needed for this style
      if (VISUAL_STYLES[styleId].line.renderer === 'rough') {
        initRoughCanvas();
      }
    }

    // Update style info display
    function updateStyleInfo(styleId) {
      const style = VISUAL_STYLES[styleId];
      const infoEl = document.getElementById('styleInfo');
      if (infoEl && style) {
        infoEl.innerHTML = `<span class="style-name">${style.name}</span> — <span class="style-desc">${style.description}</span>`;
      }
    }

    // Filter styles by category
    function filterStylesByCategory(category) {
      // Update filter button states
      document.querySelectorAll('.style-filter-btn').forEach(btn => {
        const isActive = btn.dataset.category === category;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      // Filter style cards
      document.querySelectorAll('.style-card').forEach(card => {
        if (category === 'all' || card.dataset.category === category) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });
    }

    // Keyboard navigation for style cards
    function handleStyleKeyboard(e, styleId) {
      const cards = Array.from(document.querySelectorAll('.style-card:not(.hidden)'));
      const currentIndex = cards.findIndex(c => c.dataset.style === styleId);

      let nextIndex;
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          nextIndex = (currentIndex + 1) % cards.length;
          cards[nextIndex].focus();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          nextIndex = (currentIndex - 1 + cards.length) % cards.length;
          cards[nextIndex].focus();
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          selectStyle(styleId);
          break;
      }
    }

    // Initialize style UI
    initStyleUI();

    // Generate mock data values for visualization
    function generateMockDataValues(dataset) {
      // Mock values that make sense for each dataset type
      const mockData = {
        climate: ['15.2°C', '421 ppm', 'Year 64'],
        economic: ['2.3%', '3.1%', '4.2%'],
        seismic: ['5.8 Mw', '12 km', '8.2 Hz'],
        crypto: ['$42,150', '18.5K BTC', '+12'],
        trending: ['1.2M views', '342/hr', '87'],
        audio: ['440 Hz', '0.72', 'sine'],
        orbital: ['51.6°N', '0.0°E', '408 km'],
        solar: ['450 km/s', '127', '15.2 μT'],
        ocean: ['2.3 m/s', '18.5°C', '35.2 PSU'],
        stocks: ['18.5', '$2.1B', '+0.8'],
        weather: ['1013 hPa', '65%', '12 m/s'],
        heartrate: ['72 BPM', '45 ms', '0.89'],
        traffic: ['1,850/hr', '6.2', '45 km/h'],
        power: ['42.3 GW', '50.02 Hz', '98%'],
        pandemic: ['1,284', '1.15', '78%'],
        brain: ['12.5 μV', '18.2 μV', '8.7 μV'],
        tides: ['2.4 m', '0.67', '1.8 m/s']
      };

      return mockData[dataset] || ['Value 1', 'Value 2', 'Value 3'];
    }

    // Update the data mapping visualization
    function updateMappingDisplay() {
      const mappingContent = document.getElementById('mappingContent');
      if (!mappingContent) return;

      const dataset = datasets[currentDataset];
      const attractor = attractors[currentAttractor];

      // Generate mock data values based on dataset type
      const dataValues = generateMockDataValues(currentDataset);

      // Build mapping HTML
      let html = '';
      attractor.params.forEach((param, index) => {
        const paramKey = `p${index + 1}`;
        const paramValue = currentParams[paramKey] !== undefined ? currentParams[paramKey] : param.default;
        const dataSource = dataset.params[index] || 'Data';
        const dataValue = dataValues[index];

        html += `
          <div class="mapping-item">
            <div class="mapping-source">
              <strong>${dataSource}</strong><br>
              <span class="mapping-value">${dataValue}</span>
            </div>
            <div class="mapping-arrow">→</div>
            <div class="mapping-target">
              <strong>${param.name}</strong><br>
              <span class="mapping-value">${paramValue.toFixed(3)}</span>
            </div>
          </div>
        `;
      });

      mappingContent.innerHTML = html;
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }

    function init() {
      // Ensure canvas is properly sized for current viewport
      resizeCanvas();
      // Initialize rough.js canvas for hand-drawn styles
      initRoughCanvas();
      updateAttractor();
      updateHistoryIndicator();
      updateMappingDisplay();
      render();
    }
