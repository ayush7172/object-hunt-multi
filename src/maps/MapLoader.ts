// Map Loader - procedural world builder using Three.js primitives

import * as THREE from 'three';
import { MapConfig, Vector3D } from '../utils/types';

export interface CollisionBox {
  min: Vector3D;
  max: Vector3D;
}

export class MapLoader {
  private scene: THREE.Scene;
  private worldObjects: THREE.Group;
  private collisionBoxes: CollisionBox[] = [];
  private groundMeshes: THREE.Mesh[] = [];

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
  }

  loadMap(config: MapConfig): void {
    this.clear();
    const groundSize = Math.max(
      config.bounds.max.x - config.bounds.min.x,
      config.bounds.max.z - config.bounds.min.z
    ) + 20;
    this.addGround(groundSize);

    switch (config.id) {
      case 'house_garden': this.buildSmallMap(config); break;
      case 'farmhouse': this.buildMediumMap(config); break;
      case 'village': this.buildLargeMap(config); break;
      case 'town_square': this.buildXLMap(config); break;
      default: this.buildSmallMap(config);
    }

    this.buildBoundary(config);
  }

  private mat(color: number): THREE.MeshPhongMaterial {
    return new THREE.MeshPhongMaterial({ color, shininess: 30 });
  }

  private addGround(size: number): void {
    const geo = new THREE.PlaneGeometry(size, size);
    const mesh = new THREE.Mesh(geo, this.mat(0x4a7c2e));
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    mesh.userData.ground = true;
    this.worldObjects.add(mesh);
    this.groundMeshes.push(mesh);
  }

  private createBox(w: number, h: number, d: number, color: number, pos: Vector3D): THREE.Mesh {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, this.mat(color));
    mesh.position.set(pos.x, pos.y + h / 2, pos.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.collidable = true;
    this.worldObjects.add(mesh);
    this.addCollisionBox(mesh);
    return mesh;
  }

  private createGroup(): THREE.Group {
    return new THREE.Group();
  }

  private addGroupToScene(group: THREE.Group, pos: Vector3D): void {
    group.position.set(pos.x, pos.y, pos.z);
    this.worldObjects.add(group);
  }

  private addCollisionBox(obj: THREE.Object3D): void {
    const box = new THREE.Box3().setFromObject(obj);
    this.collisionBoxes.push({
      min: { x: box.min.x, y: box.min.y, z: box.min.z },
      max: { x: box.max.x, y: box.max.y, z: box.max.z }
    });
  }

  // ========== FURNITURE BUILDERS ==========
  private addTable(x: number, z: number): void {
    const group = this.createGroup();
    const topMat = this.mat(0x8B6914);
    const legMat = this.mat(0x6B4914);

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

    this.addGroupToScene(group, { x, y: 0, z });
    this.addCollisionBox(group);
    group.userData.name = 'Kitchen Table';
    group.userData.transformable = true;
  }

  private addChair(x: number, z: number): void {
    const group = this.createGroup();
    const mat = this.mat(0x9B7924);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), mat);
    seat.position.y = 0.45;
    seat.castShadow = true;
    group.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.06), mat);
    back.position.set(0, 0.7, -0.22);
    back.castShadow = true;
    group.add(back);

    const legGeo = new THREE.BoxGeometry(0.05, 0.45, 0.05);
    [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, mat);
      leg.position.set(lx, 0.225, lz);
      group.add(leg);
    });

    this.addGroupToScene(group, { x, y: 0, z });
    this.addCollisionBox(group);
    group.userData.name = 'Chair';
  }

  private addBookshelf(x: number, z: number): void {
    const group = this.createGroup();
    const frameMat = this.mat(0x5B3A14);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 0.4), frameMat);
    frame.position.y = 1;
    frame.castShadow = true;
    group.add(frame);

    const colors = [0xcc3333, 0x3366cc, 0x33aa33, 0xcccc33, 0xcc6633];
    for (let shelf = 0; shelf < 3; shelf++) {
      for (let i = 0; i < 4; i++) {
        const book = new THREE.Mesh(
          new THREE.BoxGeometry(0.08, 0.25, 0.2),
          this.mat(colors[(shelf * 4 + i) % colors.length])
        );
        book.position.set(-0.3 + i * 0.18, 0.35 + shelf * 0.6, 0.05);
        group.add(book);
      }
    }

    this.addGroupToScene(group, { x, y: 0, z });
    this.addCollisionBox(group);
    group.userData.name = 'Bookshelf';
  }

  private addCouch(x: number, z: number): void {
    const group = this.createGroup();
    const mat = this.mat(0x664433);

    const base = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.8), mat);
    base.position.y = 0.25;
    base.castShadow = true;
    group.add(base);

    const back = new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 0.2), mat);
    back.position.set(0, 0.55, -0.3);
    back.castShadow = true;
    group.add(back);

    const cushionMat = this.mat(0x885544);
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.5), cushionMat);
    c1.position.set(-0.5, 0.55, 0.05);
    group.add(c1);
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.5), cushionMat);
    c2.position.set(0.5, 0.55, 0.05);
    group.add(c2);

    this.addGroupToScene(group, { x, y: 0, z });
    this.addCollisionBox(group);
    group.userData.name = 'Couch';
  }

  private addBarrel(x: number, z: number, name: string = 'Barrel'): void {
    const group = this.createGroup();
    const bodyMat = this.mat(0x6B4226);

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.9, 12), bodyMat);
    body.position.y = 0.45;
    body.castShadow = true;
    group.add(body);

    const bandMat = this.mat(0x444444);
    [0.15, 0.45, 0.75].forEach((h) => {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.03, 12), bandMat);
      band.position.y = h;
      group.add(band);
    });

    this.addGroupToScene(group, { x, y: 0, z });
    this.addCollisionBox(group);
    group.userData.name = name;
  }

  private addPlant(x: number, z: number): void {
    const group = this.createGroup();
    const potMat = this.mat(0x8B4513);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.3, 8), potMat);
    pot.position.y = 0.15;
    pot.castShadow = true;
    group.add(pot);

    const leafMat = this.mat(0x228B22);
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 6), leafMat);
      const angle = (i / 5) * Math.PI * 2;
      leaf.position.set(Math.cos(angle) * 0.12, 0.45 + Math.random() * 0.15, Math.sin(angle) * 0.12);
      leaf.scale.set(1, 0.7, 1);
      group.add(leaf);
    }

    this.addGroupToScene(group, { x, y: 0, z });
    this.addCollisionBox(group);
    group.userData.name = 'Plant';
  }

  private addTree(x: number, z: number): void {
    const group = this.createGroup();
    const trunkMat = this.mat(0x5B3A14);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 3), trunkMat);
    trunk.position.y = 1.5;
    trunk.castShadow = true;
    group.add(trunk);

    const leafMat = this.mat(0x2d5a1e);
    [{ r: 1.5, h: 3, y: 3 }, { r: 1.2, h: 2, y: 4.2 }, { r: 0.8, h: 1.5, y: 5 }].forEach((l) => {
      const leaves = new THREE.Mesh(new THREE.ConeGeometry(l.r, l.h, 8), leafMat);
      leaves.position.y = l.y;
      leaves.castShadow = true;
      group.add(leaves);
    });

    this.addGroupToScene(group, { x, y: 0, z });
    this.addCollisionBox(group);
  }

  private addBox(x: number, z: number, size: number, color: number, name: string): THREE.Mesh {
    const mesh = this.createBox(size, size, size, color, { x, y: 0, z });
    mesh.userData.name = name;
    mesh.userData.transformable = true;
    return mesh;
  }

  private addRock(x: number, z: number, size: number, name: string): void {
    const geo = new THREE.DodecahedronGeometry(size, 0);
    const mesh = new THREE.Mesh(geo, this.mat(0x777777));
    mesh.position.set(x, size * 0.5, z);
    mesh.castShadow = true;
    mesh.rotation.set(Math.random(), Math.random(), Math.random());
    mesh.userData.name = name;
    mesh.userData.transformable = true;
    mesh.userData.collidable = true;
    this.worldObjects.add(mesh);
    this.addCollisionBox(mesh);
  }

  private addHayBale(x: number, z: number, name: string = 'Hay Bale'): void {
    const hay = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.8, 8), this.mat(0xDAA520));
    hay.position.set(x, 0.4, z);
    hay.rotation.z = Math.PI / 2;
    hay.castShadow = true;
    hay.userData.name = name;
    hay.userData.transformable = true;
    hay.userData.collidable = true;
    this.worldObjects.add(hay);
    this.addCollisionBox(hay);
  }

  private addWell(x: number, z: number): void {
    const group = this.createGroup();
    const stoneMat = this.mat(0x888888);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.8, 12), stoneMat);
    base.position.y = 0.4;
    base.castShadow = true;
    group.add(base);

    const woodMat = this.mat(0x6B4226);
    [[-0.7, 0], [0.7, 0]].forEach(([px]) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.1), woodMat);
      post.position.set(px, 1.2, 0);
      post.castShadow = true;
      group.add(post);
    });

    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.1), woodMat);
    beam.position.y = 2;
    group.add(beam);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(1, 0.6, 4), this.mat(0x8B4513));
    roof.position.y = 2.3;
    roof.rotation.y = Math.PI / 4;
    group.add(roof);

    this.addGroupToScene(group, { x, y: 0, z });
    this.addCollisionBox(group);
  }

  private addBench(x: number, z: number): void {
    const group = this.createGroup();
    const mat = this.mat(0x6B4226);

    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.08, 0.5), mat);
    seat.position.y = 0.45;
    seat.castShadow = true;
    group.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.06), mat);
    back.position.set(0, 0.7, -0.22);
    back.castShadow = true;
    group.add(back);

    [[-0.6, 0], [0.6, 0]].forEach(([lx]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.45, 0.5), mat);
      leg.position.set(lx, 0.225, 0);
      group.add(leg);
    });

    this.addGroupToScene(group, { x, y: 0, z });
    this.addCollisionBox(group);
    group.userData.name = 'Bench';
  }

  // ========== HOUSE ==========
  private addHouse(x: number, z: number, wallW: number, wallD: number, wallH: number = 4): void {
    const floorMat = this.mat(0x8B6914);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(wallW, 0.2, wallD), floorMat);
    floor.position.set(x, 0.1, z);
    floor.receiveShadow = true;
    this.worldObjects.add(floor);

    const t = 0.3;
    this.createBox(wallW, wallH, t, 0xdec89a, { x, y: 0, z: z - wallD / 2 });
    this.createBox(wallW / 2 - 1, wallH, t, 0xdec89a, { x: x - wallW / 4 - 0.5, y: 0, z: z + wallD / 2 });
    this.createBox(wallW / 2 - 1, wallH, t, 0xdec89a, { x: x + wallW / 4 + 0.5, y: 0, z: z + wallD / 2 });
    this.createBox(wallW / 2 + 1, 1.5, t, 0xdec89a, { x, y: wallH, z: z + wallD / 2 });
    this.createBox(t, wallH, wallD, 0xdec89a, { x: x - wallW / 2, y: 0, z });
    this.createBox(t, wallH, wallD, 0xdec89a, { x: x + wallW / 2, y: 0, z });

    const roofMat = this.mat(0x8B4513);
    const roofGeo = new THREE.ConeGeometry(wallW * 0.8, 3, 4);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(x, wallH + 2, z);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    this.worldObjects.add(roof);
  }

  private addFence(xMin: number, xMax: number, z: number): void {
    const fenceMat = this.mat(0x8B6914);
    for (let x = xMin; x <= xMax; x += 2) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.2, 0.15), fenceMat);
      post.position.set(x, 0.6, z);
      post.castShadow = true;
      this.worldObjects.add(post);

      if (x < xMax) {
        const r1 = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 0.1), fenceMat);
        r1.position.set(x + 1, 0.8, z);
        this.worldObjects.add(r1);
        const r2 = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 0.1), fenceMat);
        r2.position.set(x + 1, 0.4, z);
        this.worldObjects.add(r2);
      }
    }
  }

  // ========== MAP BUILDS ==========
  private buildSmallMap(_config: MapConfig): void {
    this.addHouse(0, -8, 12, 10);
    this.addTable(-3, -6);
    this.addChair(-4.2, -6);
    this.addChair(-1.8, -6);
    this.addBookshelf(-5.2, -11);
    this.addCouch(3, -11);
    this.addFence(-15, 15, 8);
    this.addTree(-10, 5);
    this.addTree(10, 3);
    this.addBarrel(8, 0, 'Wooden Barrel');
    this.addBarrel(7, 1.5, 'Iron Barrel');
    this.addPlant(-8, 2);
    this.addBox(10, -2, 0.8, 0x5a4a2a, 'Tool Box');
    this.addBench(-3, 5);
    this.addRock(5, 6, 0.5, 'Large Rock');
    this.addRock(-9, 0, 0.3, 'Small Rock');
    this.addHayBale(12, 10);
    this.addWell(0, 12);
  }

  private buildMediumMap(_config: MapConfig): void {
    this.buildSmallMap(_config);
    this.addBox(-13, 0, 0.6, 0x6B4226, 'Shed');
    this.addBarrel(-11, -1, 'Oil Drum');
    this.addPlant(-13, 1);
    this.addRock(11, 5, 0.4, 'Medium Rock');
    this.addBox(14, -5, 1.0, 0x5a3a1a, 'Wooden Cart');
    this.addTree(-12, -5);
    this.addTree(12, -10);
    this.addTree(-8, 12);
    this.addTree(8, 12);
  }

  private buildLargeMap(_config: MapConfig): void {
    this.buildMediumMap(_config);
    this.addBox(-20, 5, 1.5, 0x8B4513, 'Shop Counter');
    this.addBox(20, 5, 1.5, 0x5a4a2a, 'Market Stall');
    this.addBox(-22, -20, 1.2, 0x4a7a2e, 'Dumpster');
    this.addBench(22, -20);
    this.addBox(10, 15, 0.5, 0xcc3333, 'Fire Hydrant');
    this.addBox(-10, 15, 0.4, 0x555555, 'Trash Can');
    this.addWell(0, 0);
    this.addTree(-30, 10);
    this.addTree(30, 10);
    this.addTree(-30, -10);
    this.addTree(30, -10);
  }

  private buildXLMap(_config: MapConfig): void {
    this.buildLargeMap(_config);
    this.addBox(-40, 0, 2.0, 0x888888, 'Subway Entrance');
    this.addBox(40, 0, 1.5, 0x2196F3, 'Bus Stop');
    this.addBox(-35, 20, 1.0, 0xFF9800, 'Newspaper Stand');
    this.addBox(35, 20, 0.5, 0xcc3333, 'Mail Box');
    this.addBox(-40, -30, 1.5, 0xDAA520, 'Construction Pile');
    this.addBox(40, -30, 2.0, 0x5a4a2a, 'Parked Van');
    this.addTree(-50, 20);
    this.addTree(50, 20);
    this.addTree(-50, -20);
    this.addTree(50, -20);
  }

  private buildBoundary(config: MapConfig): void {
    const wallMat = this.mat(0x3a5a3a);
    const { min, max } = config.bounds;
    const wallH = 3;
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

  getCollisionBoxes(): CollisionBox[] {
    return this.collisionBoxes;
  }

  getGroundMeshes(): THREE.Mesh[] {
    return this.groundMeshes;
  }

  getWorldGroup(): THREE.Group {
    return this.worldObjects;
  }

  getTransformableObjects(): THREE.Group[] {
    const objects: THREE.Group[] = [];
    this.worldObjects.traverse((child) => {
      if (child instanceof THREE.Group && child.userData.transformable) {
        objects.push(child);
      }
    });
    return objects;
  }
}