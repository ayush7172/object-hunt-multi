// Remote Player - renders other players in the scene

import * as THREE from 'three';
import { PlayerState, PlayerRole, Vector3D } from '../utils/types';

const SKIN_COLORS: number[] = [
  0x2196F3, // Blue
  0x4CAF50, // Green
  0xFF9800, // Orange
  0x9C27B0, // Purple
  0xF44336, // Red
  0x00BCD4, // Cyan
];

export class RemotePlayer {
  mesh: THREE.Group;
  bodyMesh: THREE.Mesh;
  headMesh: THREE.Mesh;
  nameTag: THREE.Sprite;

  targetPosition = new THREE.Vector3();
  targetRotation = new THREE.Vector3();
  currentVelocity = new THREE.Vector3();

  state: PlayerState;
  skinColor: number;
  isDisguised = false;

  private lerpSpeed = 15;

  constructor(state: PlayerState, scene: THREE.Scene) {
    this.state = state;
    const colorIndex = Math.abs(state.id.charCodeAt(0)) % SKIN_COLORS.length;
    this.skinColor = SKIN_COLORS[colorIndex];

    this.mesh = new THREE.Group();
    this.bodyMesh = this.createBody();
    this.headMesh = this.createHead();
    this.nameTag = this.createNameTag(state.name);

    this.mesh.add(this.bodyMesh);
    this.mesh.add(this.headMesh);
    this.mesh.add(this.nameTag);

    this.mesh.position.set(state.position.x, state.position.y, state.position.z);
    scene.add(this.mesh);
  }

  private createBody(): THREE.Mesh {
    const isSeeker = this.state.role === 'seeker';
    const color = isSeeker ? 0xcc3333 : this.skinColor;
    const geo = new THREE.CylinderGeometry(0.25, 0.3, 1.4, 8);
    const mat = new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.7;
    mesh.castShadow = true;
    return mesh;
  }

  private createHead(): THREE.Mesh {
    const geo = new THREE.SphereGeometry(0.18, 8, 8);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffcc99 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 1.55;
    mesh.castShadow = true;
    return mesh;
  }

  private createNameTag(name: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(0, 0, 256, 64, 8);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.position.y = 2.0;
    sprite.scale.set(1.2, 0.3, 1);
    return sprite;
  }

  update(dt: number): void {
    this.mesh.position.x += (this.targetPosition.x - this.mesh.position.x) * this.lerpSpeed * dt;
    this.mesh.position.y += (this.targetPosition.y - this.mesh.position.y) * this.lerpSpeed * dt;
    this.mesh.position.z += (this.targetPosition.z - this.mesh.position.z) * this.lerpSpeed * dt;

    const targetRotY = this.targetRotation.y;
    let diff = targetRotY - this.mesh.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.mesh.rotation.y += diff * this.lerpSpeed * dt;

    const speed = this.currentVelocity.length();
    if (speed > 0.5) {
      const bobAmount = Math.sin(Date.now() * 0.01) * 0.05;
      this.bodyMesh.position.y = 0.7 + bobAmount;
    }
  }

  setTarget(position: Vector3D, rotation: Vector3D): void {
    this.targetPosition.set(position.x, position.y, position.z);
    this.targetRotation.set(rotation.x, rotation.y, rotation.z);
  }

  setDisguised(disguised: boolean, _objectId?: string): void {
    this.isDisguised = disguised;
    this.bodyMesh.visible = !disguised;
    this.headMesh.visible = !disguised;
  }

  setRole(role: PlayerRole): void {
    this.state.role = role;
    const isSeeker = role === 'seeker';
    const color = isSeeker ? 0xcc3333 : this.skinColor;
    (this.bodyMesh.material as THREE.MeshLambertMaterial).color.setHex(color);
  }

  updateState(newState: Partial<PlayerState>): void {
    Object.assign(this.state, newState);
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.mesh.traverse((child) => {
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
  }
}