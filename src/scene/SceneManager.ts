// Scene Manager - handles Three.js scene, camera, renderer, lighting

import * as THREE from 'three';

export class SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  clock: THREE.Clock;

  constructor(canvas: HTMLCanvasElement) {
    this.clock = new THREE.Clock();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);
    this.scene.fog = new THREE.Fog(0x87CEEB, 30, 100);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
    this.camera.position.set(0, 1.6, 0);

    // Lighting
    const ambient = new THREE.AmbientLight(0x6688aa, 0.5);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    dirLight.position.set(15, 30, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 80;
    dirLight.shadow.camera.left = -40;
    dirLight.shadow.camera.right = 40;
    dirLight.shadow.camera.top = 40;
    dirLight.shadow.camera.bottom = -40;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    const hemi = new THREE.HemisphereLight(0x87CEEB, 0x362907, 0.3);
    this.scene.add(hemi);
  }

  getGroundMeshes(): THREE.Mesh[] {
    const grounds: THREE.Mesh[] = [];
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.ground) {
        grounds.push(child);
      }
    });
    return grounds;
  }

  getCollidableMeshes(): THREE.Object3D[] {
    const collidables: THREE.Object3D[] = [];
    this.scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.userData.collidable) {
        collidables.push(child);
      }
    });
    return collidables;
  }

  raycastFromCamera(distance: number = 4): THREE.Intersection[] {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    raycaster.far = distance;

    const objects: THREE.Object3D[] = [];
    this.scene.traverse((child) => {
      if ((child instanceof THREE.Mesh || child instanceof THREE.Group) && child.visible) {
        objects.push(child);
      }
    });

    return raycaster.intersectObjects(objects, true);
  }

  resize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  getDeltaTime(): number {
    return this.clock.getDelta();
  }

  dispose(): void {
    this.renderer.dispose();
  }
}