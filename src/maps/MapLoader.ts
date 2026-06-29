import * as THREE from 'three';
import { MapConfig, Vector3D } from '../utils/types';

const OBJECT_TYPES = [
  'table', 'chair', 'barrel', 'plant', 'crate', 'bench', 'rock',
  'haybale', 'lamppost', 'signboard', 'flowerbed', 'trashcan',
  'wheelbarrow', 'ladder', 'candelabra', 'urn', 'pedestal', 'cart'
];

const COLORS = {
  wood: [0x8B6914, 0x6B4914, 0xA0782C, 0x5B3A14, 0x9B7924, 0x7B5924],
  metal: [0x888888, 0x666666, 0x999999, 0x777777, 0xAAAAAA],
  bright: [0xCC3333, 0x3366CC, 0x33AA33, 0xCCCC33, 0xCC6633, 0x9933CC, 0x33CCCC, 0xCC3399, 0xFF8800, 0x44BB44],
  natural: [0x228B22, 0x2d5a1e, 0x3a7a2e, 0x4a8a3e],
  stone: [0x777777, 0x888888, 0x666666, 0x999988],
};

function randColor(arr: number[]): number {
  return arr[Math.floor(Math.random() * arr.length)];
}

export class MapLoader {
  private scene: THREE.Scene;
  private worldObjects: THREE.Group;
  private collisionBoxes: THREE.Box3[] = [];
  private groundMeshes: THREE.Mesh[] = [];
  private transformableCount = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.worldObjects = new THREE.Group();
    this.worldObjects.name = 'world';
    scene.add(this.worldObjects);
  }

  clear(): void {
    this.worldObjects.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });
    this.scene.remove(this.worldObjects);
    this.worldObjects = new THREE.Group();
    this.worldObjects.name = 'world';
    this.scene.add(this.worldObjects);
    this.collisionBoxes = [];
    this.groundMeshes = [];
    this.transformableCount = 0;
  }

  loadMap(config: MapConfig): void {
    this.clear();
    const sizeX = config.bounds.max.x - config.bounds.min.x + 20;
    const sizeZ = config.bounds.max.z - config.bounds.min.z + 20;
    this.addGround(Math.max(sizeX, sizeZ));

    const gridSize = Math.max(1, Math.floor(Math.sqrt(config.objectPositions.length)));
    let idx = 0;
    for (const pos of config.objectPositions) {
      const type = OBJECT_TYPES[idx % OBJECT_TYPES.length];
      this.buildObject(type, pos.x, pos.z, idx);
      idx++;
    }

    this.buildBoundary(config);
    this.addScenery(config);
  }

  private mat(color: number): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 });
  }

  private metalMat(color: number): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.7 });
  }

  private emissiveMat(color: number, emissiveColor: number, intensity: number = 0.3): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({ color, emissive: emissiveColor, emissiveIntensity: intensity, roughness: 0.5, metalness: 0.1 });
  }

  private addGround(size: number): void {
    const geo = new THREE.PlaneGeometry(size, size);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x4a7c2e, roughness: 0.9, metalness: 0 }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    mesh.userData.ground = true;
    this.worldObjects.add(mesh);
    this.groundMeshes.push(mesh);
  }

  private buildObject(type: string, x: number, z: number, seed: number): void {
    const rng = ((seed * 9301 + 49297) % 233280) / 233280;
    switch (type) {
      case 'table': this.addTable(x, z, rng); break;
      case 'chair': this.addChair(x, z, rng); break;
      case 'barrel': this.addBarrel(x, z, seed); break;
      case 'plant': this.addPlant(x, z, rng); break;
      case 'crate': this.addCrate(x, z, rng); break;
      case 'bench': this.addBench(x, z); break;
      case 'rock': this.addRock(x, z, rng); break;
      case 'haybale': this.addHayBale(x, z, rng); break;
      case 'lamppost': this.addLampPost(x, z); break;
      case 'signboard': this.addSignboard(x, z, rng); break;
      case 'flowerbed': this.addFlowerBed(x, z, rng); break;
      case 'trashcan': this.addTrashCan(x, z); break;
      case 'wheelbarrow': this.addWheelbarrow(x, z, rng); break;
      case 'ladder': this.addLadder(x, z); break;
      case 'candelabra': this.addCandelabra(x, z); break;
      case 'urn': this.addUrn(x, z, rng); break;
      case 'pedestal': this.addPedestal(x, z, rng); break;
      case 'cart': this.addCart(x, z); break;
    }
  }

  private markTransformable(obj: THREE.Object3D, name: string): void {
    obj.userData.transformable = true;
    obj.userData.name = `${name}_${this.transformableCount++}`;
    this.addCollisionBox(obj);
  }

  private addCollisionBox(obj: THREE.Object3D): void {
    const box = new THREE.Box3().setFromObject(obj);
    if (box.min.x !== Infinity) {
      this.collisionBoxes.push(box);
    }
  }

  // === OBJECT BUILDERS ===

  private addTable(x: number, z: number, _rng: number): void {
    const group = new THREE.Group();
    const topMat = this.mat(randColor(COLORS.wood));
    const legMat = this.mat(randColor(COLORS.wood));
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 1), topMat);
    top.position.y = 0.75;
    top.castShadow = true;
    group.add(top);
    const legGeo = new THREE.BoxGeometry(0.08, 0.75, 0.08);
    [[-0.6, -0.4], [0.6, -0.4], [-0.6, 0.4], [0.6, 0.4]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(lx, 0.375, lz);
      leg.castShadow = true;
      group.add(leg);
    });
    group.position.set(x, 0, z);
    this.worldObjects.add(group);
    this.markTransformable(group, 'Table');
  }

  private addChair(x: number, z: number, _rng: number): void {
    const group = new THREE.Group();
    const m = this.mat(randColor(COLORS.bright));
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), m);
    seat.position.y = 0.45;
    seat.castShadow = true;
    group.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.06), m);
    back.position.set(0, 0.7, -0.22);
    back.castShadow = true;
    group.add(back);
    const legGeo = new THREE.BoxGeometry(0.05, 0.45, 0.05);
    [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, m);
      leg.position.set(lx, 0.225, lz);
      group.add(leg);
    });
    group.position.set(x, 0, z);
    this.worldObjects.add(group);
    this.markTransformable(group, 'Chair');
  }

  private addBarrel(x: number, z: number, seed: number): void {
    const group = new THREE.Group();
    const isMetal = seed % 3 === 0;
    const bodyMat = isMetal ? this.metalMat(randColor(COLORS.metal)) : this.mat(randColor(COLORS.wood));
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.9, 12), bodyMat);
    body.position.y = 0.45;
    body.castShadow = true;
    group.add(body);
    if (!isMetal) {
      const bandMat = this.mat(0x444444);
      [0.15, 0.45, 0.75].forEach((h) => {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.03, 12), bandMat);
        band.position.y = h;
        group.add(band);
      });
    }
    group.position.set(x, 0, z);
    this.worldObjects.add(group);
    this.markTransformable(group, isMetal ? 'Metal Barrel' : 'Wooden Barrel');
  }

  private addPlant(x: number, z: number, _rng: number): void {
    const group = new THREE.Group();
    const potMat = this.mat(0x8B4513);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.3, 8), potMat);
    pot.position.y = 0.15;
    pot.castShadow = true;
    group.add(pot);
    const leafMat = this.mat(randColor(COLORS.natural));
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), leafMat);
      const angle = (i / 5) * Math.PI * 2;
      leaf.position.set(Math.cos(angle) * 0.12, 0.45 + Math.random() * 0.15, Math.sin(angle) * 0.12);
      leaf.scale.set(1, 0.7, 1);
      group.add(leaf);
    }
    group.position.set(x, 0, z);
    this.worldObjects.add(group);
    this.markTransformable(group, 'Plant');
  }

  private addCrate(x: number, z: number, _rng: number): void {
    const size = 0.4 + Math.random() * 0.4;
    const m = this.mat(randColor(COLORS.wood));
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), m);
    mesh.position.set(x, size / 2, z);
    mesh.castShadow = true;
    mesh.userData.collidable = true;
    this.worldObjects.add(mesh);
    this.markTransformable(mesh, 'Crate');
  }

  private addBench(x: number, z: number): void {
    const group = new THREE.Group();
    const m = this.mat(randColor(COLORS.wood));
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.5), m);
    seat.position.y = 0.45;
    seat.castShadow = true;
    group.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.06), m);
    back.position.set(0, 0.7, -0.22);
    back.castShadow = true;
    group.add(back);
    [[-0.6, 0], [0.6, 0]].forEach(([lx]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.5), m);
      leg.position.set(lx, 0.225, 0);
      group.add(leg);
    });
    group.position.set(x, 0, z);
    this.worldObjects.add(group);
    this.markTransformable(group, 'Bench');
  }

  private addRock(x: number, z: number, _rng: number): void {
    const size = 0.3 + Math.random() * 0.4;
    const geo = new THREE.DodecahedronGeometry(size, 0);
    const m = this.mat(randColor(COLORS.stone));
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, size * 0.5, z);
    mesh.castShadow = true;
    mesh.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
    mesh.userData.collidable = true;
    this.worldObjects.add(mesh);
    this.markTransformable(mesh, 'Rock');
  }

  private addHayBale(x: number, z: number, _rng: number): void {
    const m = this.mat(0xDAA520);
    const hay = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.8, 8), m);
    hay.position.set(x, 0.4, z);
    hay.rotation.z = Math.PI / 2;
    hay.castShadow = true;
    hay.userData.collidable = true;
    this.worldObjects.add(hay);
    this.markTransformable(hay, 'Hay Bale');
  }

  private addLampPost(x: number, z: number): void {
    const group = new THREE.Group();
    const poleMat = this.metalMat(0x555555);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.5, 8), poleMat);
    pole.position.y = 1.25;
    pole.castShadow = true;
    group.add(pole);
    const lampMat = this.emissiveMat(0x333333, 0xFFDD55, 0.5);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), lampMat);
    lamp.position.y = 2.6;
    group.add(lamp);
    group.position.set(x, 0, z);
    this.worldObjects.add(group);
    this.markTransformable(group, 'Lamp Post');
  }

  private addSignboard(x: number, z: number, _rng: number): void {
    const group = new THREE.Group();
    const postMat = this.mat(randColor(COLORS.wood));
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.5, 0.08), postMat);
    post.position.y = 0.75;
    post.castShadow = true;
    group.add(post);
    const boardMat = this.mat(randColor(COLORS.bright));
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.04), boardMat);
    board.position.set(0, 1.3, 0);
    group.add(board);
    group.position.set(x, 0, z);
    this.worldObjects.add(group);
    this.markTransformable(group, 'Signboard');
  }

  private addFlowerBed(x: number, z: number, _rng: number): void {
    const group = new THREE.Group();
    const bedMat = this.mat(0x5B3A14);
    const bed = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 0.6), bedMat);
    bed.position.y = 0.075;
    bed.receiveShadow = true;
    group.add(bed);
    const flowerColors = [0xFF1744, 0x2979FF, 0xFFEA00, 0xD500F9, 0x00E676];
    for (let i = 0; i < 6; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), this.mat(flowerColors[i % flowerColors.length]));
      const angle = (i / 6) * Math.PI * 2;
      f.position.set(Math.cos(angle) * 0.25, 0.2 + Math.random() * 0.1, Math.sin(angle) * 0.18);
      group.add(f);
    }
    group.position.set(x, 0, z);
    this.worldObjects.add(group);
    this.markTransformable(group, 'Flower Bed');
  }

  private addTrashCan(x: number, z: number): void {
    const m = this.metalMat(randColor(COLORS.metal));
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.5, 8), m);
    can.position.set(x, 0.25, z);
    can.castShadow = true;
    can.userData.collidable = true;
    this.worldObjects.add(can);
    this.markTransformable(can, 'Trash Can');
  }

  private addWheelbarrow(x: number, z: number, _rng: number): void {
    const group = new THREE.Group();
    const bodyMat = this.metalMat(0x777777);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.4), bodyMat);
    body.position.y = 0.3;
    body.castShadow = true;
    group.add(body);
    const handleMat = this.mat(randColor(COLORS.wood));
    [[-0.2, 0], [0.2, 0]].forEach(([hx]) => {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.6), handleMat);
      handle.position.set(hx, 0.25, -0.35);
      group.add(handle);
    });
    const wheelMat = this.mat(0x444444);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 8), wheelMat);
    wheel.position.set(0, 0.12, 0.25);
    wheel.rotation.x = Math.PI / 2;
    group.add(wheel);
    group.position.set(x, 0, z);
    this.worldObjects.add(group);
    this.markTransformable(group, 'Wheelbarrow');
  }

  private addLadder(x: number, z: number): void {
    const group = new THREE.Group();
    const m = this.mat(0x8B6914);
    const railGeo = new THREE.BoxGeometry(0.04, 2, 0.04);
    [-0.2, 0.2].forEach((rx) => {
      const rail = new THREE.Mesh(railGeo, m);
      rail.position.set(rx, 1, 0);
      rail.castShadow = true;
      group.add(rail);
    });
    const rungGeo = new THREE.BoxGeometry(0.44, 0.04, 0.04);
    for (let i = 0; i < 7; i++) {
      const rung = new THREE.Mesh(rungGeo, m);
      rung.position.set(0, 0.2 + i * 0.25, 0);
      group.add(rung);
    }
    group.position.set(x, 0, z);
    this.worldObjects.add(group);
    this.markTransformable(group, 'Ladder');
  }

  private addCandelabra(x: number, z: number): void {
    const group = new THREE.Group();
    const m = this.metalMat(0xCCAA44);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.1, 8), m);
    base.position.y = 0.05;
    group.add(base);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.6, 8), m);
    stem.position.y = 0.4;
    group.add(stem);
    const flameMat = this.emissiveMat(0xCC8833, 0xFFAA44, 0.6);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), flameMat);
    flame.position.y = 0.75;
    group.add(flame);
    group.position.set(x, 0, z);
    this.worldObjects.add(group);
    this.markTransformable(group, 'Candelabra');
  }

  private addUrn(x: number, z: number, _rng: number): void {
    const m = this.mat(randColor(COLORS.stone));
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.4, 8), m);
    base.position.set(x, 0.2, z);
    base.castShadow = true;
    base.userData.collidable = true;
    this.worldObjects.add(base);
    this.markTransformable(base, 'Urn');
  }

  private addPedestal(x: number, z: number, _rng: number): void {
    const group = new THREE.Group();
    const m = this.mat(randColor(COLORS.stone));
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.15, 8), m);
    base.position.y = 0.075;
    base.castShadow = true;
    group.add(base);
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.8, 8), m);
    pillar.position.y = 0.55;
    pillar.castShadow = true;
    group.add(pillar);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.2, 0.1, 8), m);
    top.position.y = 1.0;
    group.add(top);
    group.position.set(x, 0, z);
    this.worldObjects.add(group);
    this.markTransformable(group, 'Pedestal');
  }

  private addCart(x: number, z: number): void {
    const group = new THREE.Group();
    const bodyMat = this.mat(0x6B4226);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.8), bodyMat);
    body.position.y = 0.45;
    body.castShadow = true;
    group.add(body);
    const wheelMat = this.mat(0x444444);
    [[-0.5, 0.3], [0.5, 0.3], [-0.5, -0.3], [0.5, -0.3]].forEach(([wx, wz]) => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 8), wheelMat);
      w.position.set(wx, 0.12, wz);
      w.rotation.x = Math.PI / 2;
      group.add(w);
    });
    group.position.set(x, 0, z);
    this.worldObjects.add(group);
    this.markTransformable(group, 'Cart');
  }

  // === SCENERY ===

  private addScenery(config: MapConfig): void {
    const { min, max } = config.bounds;
    const centerX = (min.x + max.x) / 2;
    const centerZ = (min.z + max.z) / 2;
    const rangeX = max.x - min.x;
    const rangeZ = max.z - min.z;

    // Trees scattered around
    const treeCount = Math.floor(rangeX * rangeZ / 400);
    for (let i = 0; i < treeCount; i++) {
      const tx = min.x + Math.random() * rangeX;
      const tz = min.z + Math.random() * rangeZ;
      this.addTree(tx, tz);
    }

    // Fences around the center
    const fenceSize = Math.min(rangeX, rangeZ) * 0.6;
    this.addFence(-fenceSize / 2, fenceSize / 2, -fenceSize / 2, fenceSize / 2);
  }

  private addTree(x: number, z: number): void {
    const group = new THREE.Group();
    const trunkMat = this.mat(0x5B3A14);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 3), trunkMat);
    trunk.position.y = 1.5;
    trunk.castShadow = true;
    group.add(trunk);
    const leafMat = this.mat(randColor(COLORS.natural));
    [{ r: 1.5, h: 3, y: 3 }, { r: 1.2, h: 2, y: 4.2 }, { r: 0.8, h: 1.5, y: 5 }].forEach((l) => {
      const leaves = new THREE.Mesh(new THREE.ConeGeometry(l.r, l.h, 8), leafMat);
      leaves.position.y = l.y;
      leaves.castShadow = true;
      group.add(leaves);
    });
    group.position.set(x, 0, z);
    this.worldObjects.add(group);
  }

  private addFence(xMin: number, xMax: number, zMin: number, zMax: number): void {
    const fenceMat = this.mat(0x8B6914);
    const segments = Math.floor((xMax - xMin) / 2);
    // Front
    for (let i = 0; i <= segments; i++) {
      const fx = xMin + i * 2;
      this.addFencePost(fenceMat, fx, zMin);
    }
    // Back
    for (let i = 0; i <= segments; i++) {
      const fx = xMin + i * 2;
      this.addFencePost(fenceMat, fx, zMax);
    }
    // Sides
    const segZ = Math.floor((zMax - zMin) / 2);
    for (let i = 0; i <= segZ; i++) {
      const fz = zMin + i * 2;
      this.addFencePost(fenceMat, xMin, fz);
      this.addFencePost(fenceMat, xMax, fz);
    }
  }

  private addFencePost(mat: THREE.MeshStandardMaterial, x: number, z: number): void {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 0.15), mat);
    post.position.set(x, 0.6, z);
    post.castShadow = true;
    this.worldObjects.add(post);
  }

  private buildBoundary(config: MapConfig): void {
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x3a5a3a, roughness: 0.8, metalness: 0 });
    const { min, max } = config.bounds;
    const wallH = 3.5;
    const positions = [
      { s: [max.x - min.x, wallH, 0.5], p: [(min.x + max.x) / 2, wallH / 2, min.z] },
      { s: [max.x - min.x, wallH, 0.5], p: [(min.x + max.x) / 2, wallH / 2, max.z] },
      { s: [0.5, wallH, max.z - min.z], p: [min.x, wallH / 2, (min.z + max.z) / 2] },
      { s: [0.5, wallH, max.z - min.z], p: [max.x, wallH / 2, (min.z + max.z) / 2] },
    ];
    positions.forEach(({ s, p }) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(s[0], s[1], s[2]), wallMat);
      wall.position.set(p[0], p[1], p[2]);
      wall.castShadow = true;
      wall.userData.collidable = true;
      this.worldObjects.add(wall);
      this.addCollisionBox(wall);
    });
  }

  getCollisionBoxes(): THREE.Box3[] {
    return this.collisionBoxes;
  }

  getGroundMeshes(): THREE.Mesh[] {
    return this.groundMeshes;
  }

  getWorldGroup(): THREE.Group {
    return this.worldObjects;
  }

  getTransformableObjects(): THREE.Object3D[] {
    const objects: THREE.Object3D[] = [];
    this.worldObjects.traverse((child) => {
      if (child.userData.transformable) {
        objects.push(child);
      }
    });
    return objects;
  }
}
