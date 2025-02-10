import * as THREE from 'three';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas = document.getElementById('obj');
const container = document.querySelector('.image');

let camera, scene, renderer, controls;

init();

function init() {
  // Use a narrower field of view (FOV) to zoom in more on the object.
  // (You can tweak this value as needed.)
  camera = new THREE.PerspectiveCamera(2, 1, 0.1, 1000);
  // Set an initial camera position; it will be adjusted after the model loads.
  camera.position.set(0, 0, 2.5);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);

  // Add ambient light so the model is uniformly lit.
  const ambientLight = new THREE.AmbientLight(0xffffff);
  scene.add(ambientLight);

  // Add a point light attached to the camera.
  const pointLight = new THREE.PointLight(0xffffff, 15);
  camera.add(pointLight);
  scene.add(camera);

  // A simple progress callback for model loading.
  const onProgress = function (xhr) {
    if (xhr.lengthComputable) {
      const percentComplete = (xhr.loaded / xhr.total) * 100;
      console.log(percentComplete.toFixed(2) + '% downloaded');
    }
  };

  // Load the MTL file, then the OBJ file.
  new MTLLoader()
    .setPath('models/obj/')
    .load('Omni-Wheel.mtl', function (materials) {
      materials.preload();

      new OBJLoader()
        .setMaterials(materials)
        .setPath('models/obj/')
        .load('Omni-Wheel.obj', function (object) {
          // Adjust the object's position and scale.
          object.position.y = -0.95;
          object.scale.setScalar(0.01);
          scene.add(object);

          object.rotation.z = Math.PI;

          // Once the object is loaded, reposition the camera so that the object
          // fills the view from a top-left-back perspective.
          // The view direction vector (-1, 1, -1) means: left (negative X), top (positive Y), and back (negative Z).
          fitCameraToObject(camera, object, new THREE.Vector3(0, -1, 1), 2);

          // Update the OrbitControls target to the object's center.
          const boundingBox = new THREE.Box3().setFromObject(object);
          const center = new THREE.Vector3();
          boundingBox.getCenter(center);
          controls.target.copy(center);
          controls.update();
        }, onProgress);
    });

  // Create the renderer using the existing canvas element.
  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0xffffff, 1);

  // Set up OrbitControls for interactive rotation and zooming.
  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 0.1;
  controls.maxDistance = 50;

  controls.minPolarAngle = 0;
  controls.maxPolarAngle = Math.PI;

  updateRendererSize();
  window.addEventListener('resize', updateRendererSize);

  renderer.setAnimationLoop(animate);
}

function updateRendererSize() {
  // Get the current width and height of the container.
  const width = container.clientWidth;
  const height = container.clientHeight;
  // Update renderer size.
  renderer.setSize(width, height);
  // Update camera aspect ratio and projection matrix.
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function animate() {
  renderer.render(scene, camera);
}

/**
 * Adjusts the camera so that the given object fits in the view.
 *
 * @param {THREE.Camera} camera - The camera to adjust.
 * @param {THREE.Object3D} object - The target object.
 * @param {THREE.Vector3} viewDirection - The direction from the object where the camera should be placed.
 *   (For a top-left-back view, use a vector like new THREE.Vector3(-1, 1, -1).)
 * @param {number} offset - A multiplier to provide some extra margin around the object.
 */
function fitCameraToObject(camera, object, viewDirection, offset = 1.25) {
  // Compute the bounding box of the object.
  const boundingBox = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();
  boundingBox.getCenter(center);
  const size = boundingBox.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);

  // Convert the camera's vertical FOV from degrees to radians.
  const fov = camera.fov * (Math.PI / 180);
  // Calculate the distance required for the object to fit in the view.
  let cameraDistance = (maxDim / 2) / Math.tan(fov / 2);
  cameraDistance *= offset; // Apply an offset for margin.

  // Normalize the view direction.
  const normalizedDirection = viewDirection.clone().normalize();

  // Set the camera position so that it lies along the view direction, at the calculated distance from the center.
  camera.position.copy(center).add(normalizedDirection.multiplyScalar(cameraDistance));
  camera.lookAt(center);
  camera.updateProjectionMatrix();
}
