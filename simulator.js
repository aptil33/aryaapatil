// Enhanced Interactive Voice Visualization
// Configuration
const config = {
  blobCount: 120,           // Number of blobs
  maxNoise: 250,            // Maximum noise value
  transitionSpeed: 0.5,     // Speed of transitions between emotions
  fftSmoothing: 0.8,        // Smoothing for FFT analysis
  autoTransition: true,     // Auto-cycle through emotions
  autoTransitionDelay: 8000 // Time between auto-transitions (ms)
};

// Emotion definitions with enhanced properties
const emotions = [
  {
    name: "Joy",
    emoji: "😆",
    baseColor: [255, 0, 0],
    targetColor: [255, 255, 0],
    particleSize: 2.5,
    particleSpeed: 1.2,
    amplitudeMultiplier: 1.5,
    tweets: [236, 255, 225, 239, 221, 206, 242, 231, 201, 245, 212, 217, 229, 214, 235, 213, 237]
  },
  {
    name: "Anger",
    emoji: "😡",
    baseColor: [255, 255, 0],
    targetColor: [255, 0, 0],
    particleSize: 2.0,
    particleSpeed: 1.8,
    amplitudeMultiplier: 2.0,
    tweets: [120, 120, 125, 126, 126, 120, 109, 96, 115, 101, 111, 118, 127, 104, 110, 126, 125]
  },
  {
    name: "Sadness",
    emoji: "😢",
    baseColor: [144, 239, 254],
    targetColor: [100, 100, 255],
    particleSize: 1.8,
    particleSpeed: 0.7,
    amplitudeMultiplier: 0.8,
    tweets: [211, 217, 197, 214, 226, 220, 218, 211, 247, 213, 198, 221, 220, 211, 204, 213, 197]
  },
  {
    name: "Calm",
    emoji: "😌",
    baseColor: [0, 150, 150],
    targetColor: [0, 255, 200],
    particleSize: 1.6,
    particleSpeed: 0.5,
    amplitudeMultiplier: 0.6,
    tweets: [219, 248, 250, 255, 206, 206, 249, 219, 220, 228, 232, 242, 216, 244, 217, 241, 240]
  }
];

// State variables
let mic, fft;
let currentEmotionIndex = 0;
let targetEmotionIndex = 0;
let transitionProgress = 1;
let tweetIndex = 0;
let particles = [];
let lastTransitionTime = 0;
let audioLevel = 0;
let spectrumHistory = [];
let historySize = 10;

// Setup function
function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  colorMode(RGB, 255, 255, 255, 1);
  
  // Initialize audio
  mic = new p5.AudioIn();
  mic.start();
  userStartAudio();
  fft = new p5.FFT(config.fftSmoothing);
  fft.setInput(mic);
  
  // Create base colors and target colors for emotions
  emotions.forEach(emotion => {
    emotion.baseColorObj = color(emotion.baseColor[0], emotion.baseColor[1], emotion.baseColor[2]);
    emotion.targetColorObj = color(emotion.targetColor[0], emotion.targetColor[1], emotion.targetColor[2]);
  });
  
  // Create particles
  for (let i = 0; i < 50; i++) {
    particles.push(new Particle());
  }
  
  // Initialize spectrum history
  for (let i = 0; i < historySize; i++) {
    spectrumHistory.push(Array(1024).fill(0));
  }
  
  // Create UI elements
  createUI();
}

// Draw function
function draw() {
  // Get audio data
  fft.analyze();
  const spectrum = fft.analyze();
  audioLevel = mic.getLevel();
  
  // Update spectrum history
  spectrumHistory.push(spectrum);
  if (spectrumHistory.length > historySize) {
    spectrumHistory.shift();
  }
  
  // Get averaged spectrum
  const avgSpectrum = getAveragedSpectrum();
  
  // Handle auto-transition
  if (config.autoTransition && millis() - lastTransitionTime > config.autoTransitionDelay) {
    targetEmotionIndex = (targetEmotionIndex + 1) % emotions.length;
    transitionProgress = 0;
    lastTransitionTime = millis();
  }
  
  // Update transition progress
  if (transitionProgress < 1) {
    transitionProgress += config.transitionSpeed * 0.01;
    if (transitionProgress >= 1) {
      currentEmotionIndex = targetEmotionIndex;
      transitionProgress = 1;
    }
  }
  
  // Create interpolated emotion based on transition
  const currentEmotion = emotions[currentEmotionIndex];
  const targetEmotion = emotions[targetEmotionIndex];
  const interpolatedEmotion = interpolateEmotions(currentEmotion, targetEmotion, transitionProgress);
  
  // Update tweet index
  if (frameCount % 15 === 0) {
    tweetIndex = (tweetIndex + 1) % 17;
  }
  
  // Clear background with gradient
  setGradientBackground(interpolatedEmotion);
  
  // Draw visualization
  drawVisualization(avgSpectrum, interpolatedEmotion);
  
  // Update and draw particles
  updateParticles(interpolatedEmotion, audioLevel);
  
  // Display UI
  displayEmotionInfo(interpolatedEmotion);
  displayAudioLevels(avgSpectrum);
}

// Create gradient background
function setGradientBackground(emotion) {
  // Create a darker version of the base color for gradient
  const darkColor = color(
    red(emotion.baseColorObj) * 0.1,
    green(emotion.baseColorObj) * 0.1,
    blue(emotion.baseColorObj) * 0.1
  );
  
  // Create gradient background
  for (let y = 0; y < height; y++) {
    const inter = map(y, 0, height, 0, 1);
    const c = lerpColor(darkColor, color(0, 0, 0), inter);
    stroke(c);
    line(0, y, width, y);
  }
}

// Draw the main visualization
function drawVisualization(spectrum, emotion) {
  const t = frameCount / 150;
  const n = config.blobCount;
  const maxNoise = config.maxNoise;
  
  push();
  translate(width / 2, height / 2);
  
  // Draw multiple layers of blobs
  for (let layer = 0; layer < 3; layer++) {
    const layerOffset = map(layer, 0, 2, 0.8, 1.2);
    
    for (let i = n; i > 0; i -= 2) {
      // Calculate size based on audio and emotion
      const freqIndex = floor(map(i, 0, n, 0, spectrum.length - 1));
      const size = (50 + emotion.tweets[tweetIndex % emotion.tweets.length] * 0.5 + spectrum[freqIndex] * 0.5) * layerOffset;
      
      // Calculate noise amount
      const noisiness = maxNoise * (i / n) * emotion.amplitudeMultiplier;
      
      // Calculate color based on audio intensity
      const audioIntensity = map(spectrum[freqIndex], 0, 255, 0, 1);
      const blobColor = lerpColor(emotion.baseColorObj, emotion.targetColorObj, audioIntensity);
      
      // Set style
      noFill();
      stroke(blobColor);
      strokeWeight(map(layer, 0, 2, 0.5, 2));
      
      // Draw blob
      blob(size, 0, 0, 1, t + layer * 0.1, noisiness);
    }
  }
  pop();
}

// Draw a blob with noise
function blob(size, xCenter, yCenter, k, t, noisiness) {
  beginShape();
  const segments = floor(map(size, 0, 300, 12, 36)); // More segments for larger blobs
  const angleStep = 360 / segments;
  
  for (let theta = 0; theta <= 360 + 2 * angleStep; theta += angleStep) {
    const r1 = cos(theta) - 1;
    const r2 = sin(theta) - 1;
    
    // Create more interesting noise patterns
    const noiseVal = noise(k * r1, k * r2, t) * noisiness;
    const r = size + noiseVal;
    
    // Add some harmonics for more organic shape
    const harmonic = sin(theta * 3 + t * 100) * size * 0.05;
    
    const x = xCenter + (r + harmonic) * cos(theta);
    const y = yCenter + (r + harmonic) * sin(theta);
    curveVertex(x, y);
  }
  endShape(CLOSE);
}

// Particle class for background effects
class Particle {
  constructor() {
    this.reset();
  }
  
  reset() {
    this.x = random(width);
    this.y = random(height);
    this.size = random(1, 5);
    this.speedX = random(-1, 1);
    this.speedY = random(-1, 1);
    this.opacity = random(0.1, 0.7);
    this.lifespan = random(100, 200);
    this.age = 0;
  }
  
  update(emotion, audioLevel) {
    // Update position
    this.x += this.speedX * emotion.particleSpeed;
    this.y += this.speedY * emotion.particleSpeed;
    
    // Add some movement based on audio
    this.x += random(-1, 1) * audioLevel * 10;
    this.y += random(-1, 1) * audioLevel * 10;
    
    // Update size
    this.size = emotion.particleSize * (1 + audioLevel * 2);
    
    // Update age
    this.age++;
    
    // Reset if off-screen or too old
    if (this.x < 0 || this.x > width || this.y < 0 || this.y > height || this.age > this.lifespan) {
      this.reset();
    }
  }
  
  display(emotion) {
    // Calculate fade based on age
    const fade = map(this.age, 0, this.lifespan, 0, 1);
    const fadeOpacity = sin(fade * PI) * this.opacity;
    
    // Draw particle
    noStroke();
    fill(emotion.baseColorObj, fadeOpacity);
    ellipse(this.x, this.y, this.size);
  }
}

// Update and draw particles
function updateParticles(emotion, audioLevel) {
  particles.forEach(p => {
    p.update(emotion, audioLevel);
    p.display(emotion);
  });
}

// Interpolate between two emotions based on transition progress
function interpolateEmotions(emotion1, emotion2, progress) {
  if (progress >= 1) return emotion2;
  if (progress <= 0) return emotion1;
  
  return {
    name: progress < 0.5 ? emotion1.name : emotion2.name,
    emoji: progress < 0.5 ? emotion1.emoji : emotion2.emoji,
    baseColorObj: lerpColor(emotion1.baseColorObj, emotion2.baseColorObj, progress),
    targetColorObj: lerpColor(emotion1.targetColorObj, emotion2.targetColorObj, progress),
    particleSize: lerp(emotion1.particleSize, emotion2.particleSize, progress),
    particleSpeed: lerp(emotion1.particleSpeed, emotion2.particleSpeed, progress),
    amplitudeMultiplier: lerp(emotion1.amplitudeMultiplier, emotion2.amplitudeMultiplier, progress),
    tweets: emotion1.tweets.map((val, i) => lerp(val, emotion2.tweets[i], progress))
  };
}

// Display emotion information
function displayEmotionInfo(emotion) {
  push();
  textSize(24);
  fill(255);
  text(`${emotion.emoji} ${emotion.name}`, 20, 40);
  
  textSize(14);
  text(`Click or press 1-4 to change emotion`, 20, 70);
  text(`Press 'A' to toggle auto-transition`, 20, 90);
  pop();
}

// Display audio levels
function displayAudioLevels(spectrum) {
  push();
  noStroke();
  fill(255, 100);
  
  // Draw mini spectrum at bottom
  const spectrumWidth = 200;
  const spectrumHeight = 40;
  const x = width - spectrumWidth - 20;
  const y = height - spectrumHeight - 20;
  
  rect(x, y, spectrumWidth, spectrumHeight, 5);
  
  fill(255);
  for (let i = 0; i < 20; i++) {
    const index = floor(map(i, 0, 20, 0, spectrum.length * 0.5));
    const value = map(spectrum[index], 0, 255, 0, spectrumHeight);
    const barWidth = spectrumWidth / 20;
    rect(x + i * barWidth, y + spectrumHeight - value, barWidth - 2, value);
  }
  
  // Display audio level
  const levelBarWidth = 20;
  const levelBarHeight = 100;
  const levelX = width - levelBarWidth - 20;
  const levelY = y - levelBarHeight - 20;
  
  rect(levelX, levelY, levelBarWidth, levelBarHeight, 5);
  
  fill(255, 100, 100);
  const levelHeight = audioLevel * levelBarHeight;
  rect(levelX, levelY + levelBarHeight - levelHeight, levelBarWidth, levelHeight, 5);
  pop();
}

// Create UI elements
function createUI() {
  // UI is handled through native p5.js drawing in this version
}

// Get averaged spectrum
function getAveragedSpectrum() {
  // Create an array to hold the averaged spectrum
  const averaged = Array(1024).fill(0);
  
  // Sum all spectrums
  for (let i = 0; i < spectrumHistory.length; i++) {
    for (let j = 0; j < 1024; j++) {
      averaged[j] += spectrumHistory[i][j] || 0;
    }
  }
  
  // Divide by count to get average
  for (let i = 0; i < 1024; i++) {
    averaged[i] = averaged[i] / spectrumHistory.length;
  }
  
  return averaged;
}

// Handle mouse clicks
function mouseClicked() {
  targetEmotionIndex = (targetEmotionIndex + 1) % emotions.length;
  transitionProgress = 0;
  lastTransitionTime = millis();
}

// Handle key presses
function keyPressed() {
  // Numbers 1-4 select emotions
  if (key >= '1' && key <= '4') {
    const index = int(key) - 1;
    if (index < emotions.length) {
      targetEmotionIndex = index;
      transitionProgress = 0;
      lastTransitionTime = millis();
    }
  }
  
  // 'A' toggles auto-transition
  if (key === 'a' || key === 'A') {
    config.autoTransition = !config.autoTransition;
    lastTransitionTime = millis();
  }
}

// Handle window resize
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

// Get local audio stream
function getLocalStream() {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ video: false, audio: true })
      .then((stream) => {
        window.localStream = stream;
        if (window.localAudio) {
          window.localAudio.srcObject = stream;
          window.localAudio.autoplay = true;
        }
      })
      .catch((err) => {
        console.error(`Audio permission error: ${err}`);
      });
  }
}

// Initialize local stream
getLocalStream();
