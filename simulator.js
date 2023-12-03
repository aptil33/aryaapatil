let n = 120; // number of blobs
//voice modulating designs 
let radius = 0; // diameter of the circle
let inter = 0; // difference between the sizes of two blobs
let maxNoise = 250;
let mic, fft;
let emotions = [{
    //name: "joy",
    //emoji: "😆",
    r: 255,//100,
    g: 0, //218,
    b:0, //72,
    tweets: [236,
      255,
      225,
      239,
      221,
      206,
      242,
      231,
      201,
      245,
      212,
      217,
      229,
      214,
      235,
      213,
      237
    ]
  },
  {
    //name: "anger",
    //emoji: "😡",
    r:600,
    g:300,
    b:100,
    tweets: [120,
      120,
      125,
      126,
      126,
      120,
      109,
      96,
      115,
      101,
      111,
      118,
      127,
      104,
      110,
      126,
      125
    ]
  },
  {
   // name: "sadness",
    //emoji: "😢",
    r:144,
    g:239,
    b:254,
    tweets: [211,
      217,
      197,
      214,
      226,
      220,
      218,
      211,
      247,
      213,
      198,
      221,
      220,
      211,
      204,
      213,
      197
    ]
  },
  {
    //name: "sick",
    //emoji: "😷",
    r:0, //233,
    g:0, //233, 
    b:0, //233,
    tweets: [219,
      248,
      250,
      255,
      206,
      206,
      249,
      219,
      220,
      228,
      232,
      242,
      216,
      244,
      217,
      241,
      240
    ]
  }
];
let hi = 0; // hi = array.length... change this iterate through the array
if (hi < 17){
  hi += 1;
} else if (hi == 17) {
  hi = 0;
}
  
let noiseProg = (x) => (x);

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  kMax = random(1, 10);
  step = 0.1;
  mic = new p5.AudioIn();
  mic.start();
  userStartAudio();
  fft = new p5.FFT();
  fft.setInput(mic);
   baseColors = [
    color(255, 0, 0),    // Base color for "joy"
    color(255, 255, 0),  // Base color for "anger"
    color(0, 0, 255),    // Base color for "sadness"
    color(0, 255, 0)     // Base color for "sick"
  ];
  targetColors = [
    color(255, 255, 0),  // Target color for "joy"
    color(255, 0, 0),    // Target color for "anger"
    color(100, 100, 255),// Target color for "sadness"
    color(0, 100, 0)     // Target color for "sick"
  ];
}

function blob(size, xCenter, yCenter, k, t, noisiness) {
  beginShape();
	let angleStep = 360 / 12;
    for (let theta = 0; theta <= 360 + 2 * angleStep; theta += angleStep) {
    let r1, r2;
		//r1 = cos(theta)+1;
    r1 = cos(theta)-1;
    //r1 = (sin(theta)+1)/cos(theta)+1;;
		//r2 = sin(theta)+1;
    r2 = sin(theta)-1;
    //r2 = (cos(theta)+1)/(sin(theta)-1);
    let r = size + noise(k * r1,  k * r2, t) * noisiness;
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
  text(emoName, 50, 20+y*20);
  text(emotions[y].emoji, 100, 20+y*20);
}
// function mousePressed() {
//   userStartAudio();
// }
function chooseNoisiness(i, n, maxNoise) {
  let choice = Math.floor(Math.random() * 4); // Randomly choose a number between 0 and 3
  switch (choice) {
      case 0:
          return maxNoise * noiseProg(i / n);
      case 1:
          return maxNoise - noiseProg(i / n);
      case 2:
          return maxNoise * noiseProg(Math.pow(i / n, 2));
      case 3:
          return maxNoise * noiseProg(Math.sqrt(i) / n);
  }
}
let currentEmotion =0;
function mouseClicked() {
  currentEmotion = (currentEmotion + 1) % emotions.length;
}
function draw() {
  background(0); // Set a background

  // Map mouse position to various factors
  let mouseXFactor = map(mouseX, 0, width, 0.5, 2);
  let mouseYFactor = map(mouseY, 0, height, 0.5, 2);
  let mouseReact = map(mouseX, 0, width, 0.1, 1);

  let spectrum = fft.analyze();
  let emotion = emotions[currentEmotion]; // Current emotion based on mouse click
  let t = frameCount / 150;

  // Iterate through blobs with adjustments based on mouse position
  for (let i = n; i > 0; i -= 2) { // Skipping blobs for performance
    let size = (radius + emotion.tweets[hi] * inter + spectrum[i]) * mouseXFactor;
    let noisiness = maxNoise * noiseProg(i / n) * mouseYFactor;

    // Determine color based on audio intensity adjusted by mouseReact
    let audioIntensity = map(spectrum[i], 0, 255, 0, 1) * mouseReact;
    let currentColor = lerpColor(baseColors[currentEmotion], targetColors[currentEmotion], audioIntensity);

    noFill();
    stroke(currentColor);
    blob(size, width / 2, height / 2, 1, t, noisiness); // 'k' is less relevant in 2D, set to 1
  }
}

function getLocalStream() {
  navigator.mediaDevices
    .getUserMedia({ video: false, audio: true })
    .then((stream) => {
      window.localStream = stream; // A
      window.localAudio.srcObject = stream; // B
      window.localAudio.autoplay = true; // C
    })
    .catch((err) => {
      console.error(`you got an error: ${err}`);
    });
}
getLocalStream();
// function mousePressed() {
//   userStartAudio();
// }