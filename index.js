let canvas;
let stats, gui;
let scene, camera, renderer;
let particleTexture, particleGeometry, particleMaterial, particles;
let trailGeometry, trailMaterial, trails;
let controls, clock, composer;

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}

const params = {
  currentIndex: "Lorenz Attractor"
};

//let currentIndex = parseInt(document.querySelector('.i').textContent);
currentIndex = 0;

const TITLES = [
  "Lorenz Attractor",
  "Aizawa Attractor",
  "Thomas Attractor",
  "Yu-Wang Attractor"
];

const CONSTANTS = [{
  s: 10,
  b: 8 / 3,
  r: 28
}, {
  a: 0.95,
  b: 0.7,
  c: 0.6,
  d: 3.5,
  e: 0.25,
  f: 0.1
}, {
  b: 0.19
}, {
  a: 10,
  b: 40,
  c: 2,
  d: 2.5
}];

const TIME_INTERVAL = [
  0.004,
  0.004,
  0.04,
  0.002
];

const CAMERA_POS = [
  [0, 0, 80, 75, 1, 1000, 0, 0, 0, 20],
  [-2.50, 0, -0.13, 75, 0.0001, 10, 3.142, -1.261, 3.142, 0.5],
  [-5, -5, -5, 75, 0.1, 400, 2.420, -0.657, 2.420, 5],
  [9.69, 2.78, 0.07, 75, 0.1, 400, -2.929, 0.646, 1.213, 3]
];
const PARTICLE_COUNT = 5000;
const PARTICLE_COLOUR = [
  0x3366ff,
  0xff5522,
  0xdddd11,
  0x660833
]
const PARTICLE_SIZE = [
  0.5,
  0.01,
  0.05,
  0.1
]
const TRAIL_LENGTH = 50;
const TRAIL_COLOUR = [{
  value: new THREE.Vector3(0.2, 0.4, 0.8)
}, {
  value: new THREE.Vector3(0.8, 0.2, 0.2)
}, {
  value: new THREE.Vector3(0.8, 0.5, 0.2)
}, {
  value: new THREE.Vector3(0.6, 0.1, 0.2)
}];
const TRAIL_COLOUR_MOD = [{
  value: new THREE.Vector3(-0.2, 0.4, -0.4)
}, {
  value: new THREE.Vector3(0, 0.4, -0.1)
}, {
  value: new THREE.Vector3(-0.6, 0.3, 0.2)
}, {
  value: new THREE.Vector3(0, 0.2, 0.3)
}];
const MOD_FACTOR = [{
  value: 140
}, {
  value: 4.2
}, {
  value: 9
}, {
  value: 20
}];

const VERTEX_SHADER = `
  varying float v_Norm;

  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    v_Norm = length(position);
  }
`;
const FRAGMENT_SHADER = `
  uniform float modFactor;
  uniform vec3 trailColour;
  uniform vec3 trailColourMod;

  varying float v_Norm;

  void main() {
    gl_FragColor = vec4(trailColour + v_Norm * trailColourMod / modFactor, 0.2);
  }
`;

const particleVel = new Float32Array(PARTICLE_COUNT * 3);

// Initialize
init();
// Start animations
animate();

function init() {
  clock = new THREE.Clock();

  // Canvas
  canvas = document.querySelector('.webgl');
  //console.log(canvas);
  refreshGraphics();

  // Event listener for window resize
  window.addEventListener('resize', onWindowResize, false);

  // Debugging
  //window.addEventListener('keydown', keyDown);

  // Stats Display
  stats = new Stats();
  document.body.appendChild(stats.dom);

  // GUI Display
  gui = new dat.GUI();
  gui.add(params, 'currentIndex', TITLES).name('Index').listen().onChange(i => {
    currentIndex = TITLES.indexOf(i);
    refreshGraphics();
  });
}

function refreshGraphics() {
  // Misc
  const particleStartPos = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
    particleStartPos[i] = Math.random() / 500 - 0.001;
    particleVel[i] = 0
  }
  /*
  switch (currentIndex) {
    case 0:

      break;
    case 1:
      for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
        particleStartPos[i] = Math.random() / 5000 - 0.0001;
        particleVel[i] = 0
      }
      break;
    case 2:
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particleStartPos[i * 3] = Math.random() / 500 + 2.198;
        particleStartPos[i * 3 + 1] = Math.random() / 500 + 2.198;
        particleStartPos[i * 3 + 2] = Math.random() / 500 + 27.998;
        particleVel[i] = 0
      }
      break;
  }*/
  const trailStartPos = new Float32Array(PARTICLE_COUNT * 3 * TRAIL_LENGTH * 2);

  // Textures
  particleTexture = new THREE.TextureLoader().load('particle.png');

  // Scene
  scene = new THREE.Scene();

  // Camera
  camera = new THREE.PerspectiveCamera(CAMERA_POS[currentIndex][3], sizes.width / sizes.height, CAMERA_POS[currentIndex][4], CAMERA_POS[currentIndex][5]);
  camera.position.set(CAMERA_POS[currentIndex][0], CAMERA_POS[currentIndex][1], CAMERA_POS[currentIndex][2]);
  //camera.lookAt(CAMERA_POS[currentIndex][6], CAMERA_POS[currentIndex][7], CAMERA_POS[currentIndex][8]);
  camera.rotation.set(CAMERA_POS[currentIndex][6], CAMERA_POS[currentIndex][7], CAMERA_POS[currentIndex][8]);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, canvas: canvas});
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(sizes.width, sizes.height);

  // Objects
  particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particleStartPos, 3));

  trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailStartPos, 3));

  // Materials
  particleMaterial = new THREE.PointsMaterial({
    color: PARTICLE_COLOUR[currentIndex],
    size: PARTICLE_SIZE[currentIndex],
    map: particleTexture,
    depthTest: true,
    depthWrite: false,
    transparent: true,
    blending: THREE.AdditiveBlending
  });

  trailMaterial = new THREE.ShaderMaterial({
    uniforms: {
      modFactor: MOD_FACTOR[currentIndex],
      trailColour: TRAIL_COLOUR[currentIndex],
      trailColourMod: TRAIL_COLOUR_MOD[currentIndex]
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    depthTest: true,
    depthWrite: false,
    transparent: true,
    blending: THREE.AdditiveBlending
  });

  // Mesh
  particles = new THREE.Points(particleGeometry, particleMaterial);
  particles.frustumCulled = false;
  trails = new THREE.LineSegments(trailGeometry, trailMaterial);
  trails.frustumCulled = false;
  scene.add(particles, trails);

  // Lights

  // Controls
  controls = new THREE.FlyControls(camera, renderer.domElement);
  controls.movementSpeed = CAMERA_POS[currentIndex][9];
	controls.rollSpeed = Math.PI / 6;
  controls.dragToLook = true;

/*
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
	controls.dampingFactor = 0.05;

  controls.minDistance = 40;
	controls.maxDistance = 160;

  controls.target = new THREE.Vector3(0, 0, 28);*/

  // Post-processing
  composer = new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene, camera));

  const bloomPass = new THREE.UnrealBloomPass({x: sizes.height, y: sizes.width}, 0.6, 0.0, 0.8);
  composer.addPass(bloomPass);

  // HTML Title
  const title = document.title;
  document.title = TITLES[currentIndex] + " | " + title;
}

/*function keyDown(e) {
  switch (e.code) {
    case 'KeyP':
      const cam = [camera.position.x, camera.position.y, camera.position.z, camera.rotation.x, camera.rotation.y, camera.rotation.z].toString();
      document.write(cam);
      break;
  }
}*/

function onWindowResize() {
    // Update sizes
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    // Update camera
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();

    // Update renderer
    renderer.setSize(sizes.width, sizes.height);
}

function animate() {
  requestAnimationFrame(animate);
  render();
  composer.render();
  stats.update();
}

function render() {
  updateParticles();
  const delta = clock.getDelta();
	controls.update(delta);
}

function updateParticles() {
  const particlePos = particles.geometry.attributes.position.array;
  const trailPos = trails.geometry.attributes.position.array;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particlePos[i * 3] += particleVel[i * 3];
    particlePos[i * 3 + 1] += particleVel[i * 3 + 1];
    particlePos[i * 3 + 2] += particleVel[i * 3 + 2];
  }
  switch (currentIndex) {
    case 0:
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particleVel[i * 3] = (CONSTANTS[0].s * (particlePos[i * 3 + 1] - particlePos[i * 3])) * TIME_INTERVAL[currentIndex];
        particleVel[i * 3 + 1] = (particlePos[i * 3] * (CONSTANTS[0].r - particlePos[i * 3 + 2]) - particlePos[i * 3 + 1]) * TIME_INTERVAL[currentIndex];
        particleVel[i * 3 + 2] = (particlePos[i * 3] * particlePos[i * 3 + 1] - CONSTANTS[0].b * particlePos[i * 3 + 2]) * TIME_INTERVAL[currentIndex];
      }
      break;
    case 1:
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particleVel[i * 3] = ((particlePos[i * 3 + 2] - CONSTANTS[1].b) * particlePos[i * 3] - CONSTANTS[1].d * particlePos[i * 3 + 1]) * TIME_INTERVAL[currentIndex];
        particleVel[i * 3 + 1] = (CONSTANTS[1].d * particlePos[i * 3] + (particlePos[i * 3 + 2] - CONSTANTS[1].b) * particlePos[i * 3 + 1]) * TIME_INTERVAL[currentIndex];
        particleVel[i * 3 + 2] = (CONSTANTS[1].c + CONSTANTS[1].a * particlePos[i * 3 + 2] - particlePos[i * 3 + 2] * particlePos[i * 3 + 2] * particlePos[i * 3 + 2] / 3 - (particlePos[i * 3] * particlePos[i * 3] + particlePos[i * 3 + 1] * particlePos[i * 3 + 1]) * (1 + CONSTANTS[1].e * particlePos[i * 3 + 2]) + CONSTANTS[1].f * particlePos[i * 3 + 2] * particlePos[i * 3] * particlePos[i * 3] * particlePos[i * 3]) * TIME_INTERVAL[currentIndex];
      }
      break;
    case 2:
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particleVel[i * 3] = (-CONSTANTS[currentIndex].b * particlePos[i * 3] + Math.sin(particlePos[i * 3 + 1])) * TIME_INTERVAL[currentIndex];
        particleVel[i * 3 + 1] = (-CONSTANTS[currentIndex].b * particlePos[i * 3 + 1] + Math.sin(particlePos[i * 3 + 2])) * TIME_INTERVAL[currentIndex];
        particleVel[i * 3 + 2] = (-CONSTANTS[currentIndex].b * particlePos[i * 3 + 2] + Math.sin(particlePos[i * 3])) * TIME_INTERVAL[currentIndex];
      }
      break;
    case 3:
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particleVel[i * 3] = (CONSTANTS[currentIndex].a * (particlePos[i * 3 + 1] - particlePos[i * 3])) * TIME_INTERVAL[currentIndex];
        particleVel[i * 3 + 1] = (CONSTANTS[currentIndex].b * particlePos[i * 3] - CONSTANTS[currentIndex].c * particlePos[i * 3] * particlePos[i * 3 + 2]) * TIME_INTERVAL[currentIndex];
        particleVel[i * 3 + 2] = (Math.exp(particlePos[i * 3] * particlePos[i * 3 + 1]) - CONSTANTS[currentIndex].d * particlePos[i * 3 + 2]) * TIME_INTERVAL[currentIndex];
      }
      break;
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    for (let j = TRAIL_LENGTH - 1; j > 0; j--) {
      trailPos[i * 3 * TRAIL_LENGTH * 2 + j * 3 * 2] = trailPos[i * 3 * TRAIL_LENGTH * 2 + (j - 1) * 3 * 2];
      trailPos[i * 3 * TRAIL_LENGTH * 2 + j * 3 * 2 + 1] = trailPos[i * 3 * TRAIL_LENGTH * 2 + (j - 1) * 3 * 2 + 1];
      trailPos[i * 3 * TRAIL_LENGTH * 2 + j * 3 * 2 + 2] = trailPos[i * 3 * TRAIL_LENGTH * 2 + (j - 1) * 3 * 2 + 2];
      trailPos[i * 3 * TRAIL_LENGTH * 2 + j * 3 * 2 + 3] = trailPos[i * 3 * TRAIL_LENGTH * 2 + (j - 1) * 3 * 2 + 3];
      trailPos[i * 3 * TRAIL_LENGTH * 2 + j * 3 * 2 + 4] = trailPos[i * 3 * TRAIL_LENGTH * 2 + (j - 1) * 3 * 2 + 4];
      trailPos[i * 3 * TRAIL_LENGTH * 2 + j * 3 * 2 + 5] = trailPos[i * 3 * TRAIL_LENGTH * 2 + (j - 1) * 3 * 2 + 5];
    }
    trailPos[i * 3 * TRAIL_LENGTH * 2 + 3] = trailPos[i * 3 * TRAIL_LENGTH * 2];
    trailPos[i * 3 * TRAIL_LENGTH * 2 + 4] = trailPos[i * 3 * TRAIL_LENGTH * 2 + 1];
    trailPos[i * 3 * TRAIL_LENGTH * 2 + 5] = trailPos[i * 3 * TRAIL_LENGTH * 2 + 2];
    trailPos[i * 3 * TRAIL_LENGTH * 2] = particlePos[i * 3];
    trailPos[i * 3 * TRAIL_LENGTH * 2 + 1] = particlePos[i * 3 + 1];
    trailPos[i * 3 * TRAIL_LENGTH * 2 + 2] = particlePos[i * 3 + 2];
  }

  particles.geometry.attributes.position.needsUpdate = true;
  trails.geometry.attributes.position.needsUpdate = true;
}
