// Voice Responsive Blob Visualization
// Based on the original code with targeted improvements

let n = 120; // number of blobs
let radius = 0; // base radius
let inter = 0.8; // difference between blob sizes
let maxNoise = 250; 
let mic, fft;
let emotions = [
  {
    name: "joy",
    emoji: "😆",
    r: 255,
    g: 0,
    b: 0,
    tweets: [236, 255, 225, 239, 221, 206, 242, 231, 201, 245, 212, 217, 229, 214, 235, 213, 237]
  },
  {
    name: "anger",
    emoji: "😡",
    r: 600,
    g: 300,
    b: 100,
    tweets: [120, 120, 125, 126, 126, 120, 109, 96, 115, 101, 111, 118, 127, 104, 110, 126, 125]
  },
  {
    name: "sadness",
    emoji: "😢",
    r: 144,
    g: 239,
    b: 254,
    tweets: [211, 217, 197, 214, 226, 220, 218, 211, 247, 213, 198, 221, 220, 211, 204, 213, 197]
  },
  {
    name: "sick",
    emoji: "😷",
    r: 0,
    g: 0,
    b: 0,
    tweets: [219, 248, 250, 255, 206, 206, 249, 219, 220, 228, 232, 242, 216, 244, 217, 241, 240]
  }
];

let hi = 0; // tweet index
let baseColors = [];
let targetColors = [];
let currentEmotion = 0;
let micSensitivity = 5; // Adjust this to change sensitivity to voice input
let voiceLevel = 0;
let voiceLevelSmooth = 0;
let voiceSmoothFactor = 0.1; // How quickly the voice level responds (0-1)

function noiseProg(x) {
  return x;
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  
  // Setup audio input
  mic = new p5.AudioIn();
  mic.start();
  fft = new p5.FFT(0.8, 1024); // Add some smoothing to the FFT
  fft.setInput(mic);
  
  // Setup colors
  baseColors = [
    color(255, 0, 0),     // Base color for "joy"
    color(255, 255, 0),   // Base color for "anger"
    color(0, 0, 255),     // Base color for "sadness"
    color(0, 255, 0)      // Base color for "sick"
  ];
  
  targetColors = [
    color(255, 255, 0),   // Target color for "joy"
    color(255, 0, 0),     // Target color for "anger"
    color(100, 100, 255), // Target color for "sadness"
    color(0, 100, 0)      // Target color for "sick"
  ];
  
  // Try to get user audio immediately
  userStartAudio();
}

function blob(size, xCenter, yCenter, k, t, noisiness) {
  beginShape();
  let angleStep = 360 / 12;
  
  for (let theta = 0; theta <= 360 + 2 * angleStep; theta += angleStep) {
    let r1 = cos(theta) - 1;
    let r2 = sin(theta) - 1;
    
    // Create noise-based distortion
    let r = size + noise(k * r1, k * r2, t) * noisiness;
    let x = xCenter + r * cos(theta);
    let y = yCenter + r * sin(theta);
    curveVertex(x, y);
  }
  
  endShape(CLOSE);
}

function emoCycle(y) {
  let emoName = emotions[y].name;
  noStroke();
  fill(emotions[y].r, emotions[y].g, emotions[y].b);
  textSize(16);
  text(emoName, 50, 30 + y * 25);
  textSize(20);
  text(emotions[y].emoji, 120, 30 + y * 25);
}

function mouseClicked() {
  currentEmotion = (currentEmotion + 1) % emotions.length;
}

function draw() {
  background(0);
  
  // Update tweet index every 10 frames
  if (frameCount % 10 === 0) {
    hi = (hi + 1) % 17;
  }
  
  // Get audio data
  fft.analyze();
  let spectrum = fft.analyze();
  
  // Get current voice level and smooth it
  let currentLevel = mic.getLevel() * micSensitivity;
  voiceLevelSmooth = lerp(voiceLevelSmooth, currentLevel, voiceSmoothFactor);
  voiceLevel = voiceLevelSmooth;
  
  // Get current emotion
  let emotion = emotions[currentEmotion];
  
  // Display emotion labels
  for (let i = 0; i < emotions.length; i++) {
    emoCycle(i);
  }
  
  // Display active emotion and voice level
  fill(255);
  textSize(18);
  text("Active Emotion: " + emotion.name + " " + emotion.emoji, 20, height - 70);
  text("Voice Level: " + nf(voiceLevel, 1, 2), 20, height - 40);
  
  // Draw background visualization of spectrum
  drawSpectrum(spectrum, 30);
  
  // Draw blobs
  let t = frameCount / 150;
  
  // Render blobs from largest to smallest for better layering
  for (let i = 0; i < n; i += 2) {
    // Get frequency data for this blob
    let freqIndex = floor(map(i, 0, n, 0, spectrum.length * 0.5)); // Only use lower half of spectrum
    let freqValue = spectrum[freqIndex];
    
    // Calculate size based on tweet value and voice level
    let size = radius + emotion.tweets[hi] * inter; 
    
    // Add voice-responsive scaling
    size += freqValue * 0.5 + voiceLevel * 100;
    
    // Calculate noise amount - less for inner blobs, more for outer
    let noisiness = maxNoise * noiseProg(i / n);
    
    // Make noise respond to voice
    noisiness = noisiness * (1 + voiceLevel);
    
    // Get audio intensity for this frequency band
    let audioIntensity = map(freqValue, 0, 255, 0, 1);
    
    // Adjust by overall voice level
    audioIntensity = constrain(audioIntensity + voiceLevel, 0, 1);
    
    // Create color blend based on audio
    let blobColor = lerpColor(
      baseColors[currentEmotion], 
      targetColors[currentEmotion], 
      audioIntensity
    );
    
    // Draw the blob
    noFill();
    stroke(blobColor);
    strokeWeight(1.5);
    blob(size, width / 2, height / 2, 1, t, noisiness);
  }
}

// Draw a visualization of the audio spectrum
function drawSpectrum(spectrum, height) {
  noStroke();
  fill(255, 40);
  
  let w = width / (spectrum.length * 0.5);
  
  for (let i = 0; i < spectrum.length * 0.5; i++) {
    let x = map(i, 0, spectrum.length * 0.5, 0, width);
    let h = -height + map(spectrum[i], 0, 255, height, 0);
    rect(x, height, w, h);
  }
}

// Reliable way to get microphone access
function getLocalStream() {
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices
      .getUserMedia({ video: false, audio: true })
      .then((stream) => {
        console.log("Got microphone access");
        window.localStream = stream;
        if (window.localAudio) {
          window.localAudio.srcObject = stream;
          window.localAudio.autoplay = true;
        }
      })
      .catch((err) => {
        console.error(`Audio permission error: ${err}`);
        alert("Please allow microphone access for this visualization to work properly.");
      });
  }
}

// Make sure audio starts
function touchStarted() {
  if (getAudioContext().state !== 'running') {
    userStartAudio();
  }
}

// Initialize local stream
getLocalStream();
