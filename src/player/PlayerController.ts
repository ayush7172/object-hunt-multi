// Player Controller - handles movement, physics, camera

import * as THREE from 'three';
import { InputManager } from './InputManager';
import { InputState, Vector3D, PlayerRole } from '../utils/types';
import { clamp, lerp } from '../utils/math';
import { SceneManager } from '../scene/SceneManager';

export class PlayerController {
  // Position & velocity
  position = new THREE.Vector3(0, 1.6, 0);
  velocity = new THREE.Vector3(0, 0, 0);
  
  // Camera
  yaw = 0;
  pitch = 0;
  cameraOffset = new THREE.Vector3(0, 1.6, 0);
  
  // Movement settings
  moveSpeed = 5;
  walkSpeed = 5;
  runSpeed = 8;
  crouchSpeed = 2.5;
  disguisedSpeed = 2.5;
  jumpForce = 6;
  gravity = -15;
  
  // State
  isGrounded = false;
  isJumping = false;
  isCrouching = false;
  isDisguised = false;
  isSprinting = false;
  
  // Jump fix: coyote time & jump buffer
  private coyoteTime = 0;
  private coyoteTimeMax = 0.1;
  private jumpBufferTime = 0;
  private jumpBufferMax = 0.15;
  
  // Camera smoothing
  private cameraSmoothing = 0.1;
  
  // Collision
  private playerRadius = 0.3;
  private playerHeight = 1.8;
  private crouchHeight = 1.0;
  
  // References
  private sceneManager: SceneManager;
  private inputManager: InputManager;
  
  // Third person
  private thirdPerson = false;
  private thirdPersonDistance = 3;
  private thirdPersonHeight = 1.5;

  constructor(sceneManager: SceneManager, inputManager: InputManager) {
    this.sceneManager = sceneManager;
    this.inputManager = inputManager;
  }

  update(deltaTime: number): void {
    const input = this.inputManager.getInputState();
    const touchJoystick = this.inputManager.getTouchJoystick();
    
    // Handle jump buffer
    if (input.jump) {
      this.jumpBufferTime = this.jumpBufferMax;
    } else {
      this.jumpBufferTime -= deltaTime;
    }
    
    // Ground check with raycast
    this.checkGrounded(deltaTime);
    
    // Handle coyote time
    if (this.isGrounded) {
      this.coyoteTime = this.coyoteTimeMax;
    } else {
      this.coyoteTime -= deltaTime;
    }
    
    // Jump logic with coyote time and jump buffer
    if (this.jumpBufferTime > 0 && this.coyoteTime > 0 && !this.isJumping) {
      this.performJump();
      this.jumpBufferTime = 0;
      this.coyoteTime = 0;
    }
    
    // Apply gravity
    if (!this.isGrounded) {
      this.velocity.y += this.gravity * deltaTime;
    } else if (this.velocity.y < 0) {
      this.velocity.y = 0;
      this.isJumping = false;
    }
    
    // Movement input
    const moveInput = this.getMoveInput(input, touchJoystick);
    
    // Determine speed
    let currentSpeed = this.walkSpeed;
    if (this.isDisguised) {
      currentSpeed = this.disguisedSpeed;
    } else if (this.isCrouching) {
      currentSpeed = this.crouchSpeed;
    } else if (this.isSprinting && !this.isCrouching) {
      currentSpeed = this.runSpeed;
    }
    
    // Calculate movement direction relative to camera
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    
    const moveDirection = new THREE.Vector3();
    moveDirection.addScaledVector(forward, -moveInput.z);
    moveDirection.addScaledVector(right, moveInput.x);
    
    if (moveDirection.lengthSq() > 0) {
      moveDirection.normalize();
      
      // Apply movement with collision
      this.applyMovement(moveDirection, currentSpeed, deltaTime);
    }
    
    // Apply velocity
    this.position.addScaledVector(this.velocity, deltaTime);
    
    // Boundary check
    this.enforceBoundaries();
    
    // Update camera
    this.updateCamera(deltaTime);
  }

  private getMoveInput(input: InputState, touchJoystick: { x: number; y: number }): { x: number; z: number } {
    let x = 0, z = 0;
    
    if (input.moveForward) z -= 1;
    if (input.moveBackward) z += 1;
    if (input.moveLeft) x -= 1;
    if (input.moveRight) x += 1;
    
    // Touch joystick overrides keyboard on mobile
    if (Math.abs(touchJoystick.x) > 0.1 || Math.abs(touchJoystick.y) > 0.1) {
      x = touchJoystick.x;
      z = touchJoystick.y;
    }
    
    const len = Math.sqrt(x * x + z * z);
    if (len > 1) {
      x /= len;
      z /= len;
    }
    
    return { x, z };
  }

  private checkGrounded(deltaTime: number): void {
    const raycastOrigin = this.position.clone();
    raycastOrigin.y += 0.1;
    
    const rayLength = this.isCrouching ? 0.6 : 1.0;
    const groundMeshes = this.sceneManager.getGroundMeshes();
    const collidableMeshes = this.sceneManager.getCollidableMeshes();
    
    const allMeshes = [...groundMeshes, ...collidableMeshes];
    
    // Raycast down
    const raycaster = new THREE.Raycaster(raycastOrigin, new THREE.Vector3(0, -1, 0), 0, rayLength);
    const hits = raycaster.intersectObjects(allMeshes, true);
    
    this.isGrounded = hits.length > 0;
    
    // If grounded, snap to ground
    if (this.isGrounded && this.velocity.y <= 0) {
      const groundY = hits[0].point.y + (this.isCrouching ? this.crouchHeight / 2 : this.playerHeight / 2);
      if (this.position.y < groundY + 0.1) {
        this.position.y = groundY;
        this.velocity.y = 0;
      }
    }
  }

  private applyMovement(direction: THREE.Vector3, speed: number, deltaTime: number): void {
    const moveX = direction.x * speed * deltaTime;
    const moveZ = direction.z * speed * deltaTime;
    
    // Check X movement
    const testPosX = this.position.clone();
    testPosX.x += moveX;
    if (!this.checkCollision(testPosX)) {
      this.position.x = testPosX.x;
    }
    
    // Check Z movement
    const testPosZ = this.position.clone();
    testPosZ.z += moveZ;
    if (!this.checkCollision(testPosZ)) {
      this.position.z = testPosZ.z;
    }
  }

  private checkCollision(testPosition: THREE.Vector3): boolean {
    const collidableMeshes = this.sceneManager.getCollidableMeshes();
    const halfHeight = this.isCrouching ? this.crouchHeight / 2 : this.playerHeight / 2;
    
    const playerBox = new THREE.Box3(
      new THREE.Vector3(
        testPosition.x - this.playerRadius,
        testPosition.y - halfHeight,
        testPosition.z - this.playerRadius
      ),
      new THREE.Vector3(
        testPosition.x + this.playerRadius,
        testPosition.y + halfHeight,
        testPosition.z + this.playerRadius
      )
    );
    
    for (const mesh of collidableMeshes) {
      if (!mesh.visible) continue;
      if (mesh.userData.objectId && mesh.userData.objectId === this.disguisedObjectId) continue;
      
      const meshBox = new THREE.Box3().setFromObject(mesh);
      if (playerBox.intersectsBox(meshBox)) {
        return true;
      }
    }
    
    return false;
  }

  private performJump(): void {
    this.velocity.y = this.jumpForce;
    this.isJumping = true;
    this.isGrounded = false;
    this.coyoteTime = 0;
  }

  private enforceBoundaries(): void {
    const bounds = 45; // Will be set from map config
    this.position.x = clamp(this.position.x, -bounds, bounds);
    this.position.z = clamp(this.position.z, -bounds, bounds);
  }

  private updateCamera(deltaTime: number): void {
    const camera = this.sceneManager.camera;
    
    if (this.thirdPerson) {
      // Third person camera
      const targetPos = this.position.clone();
      targetPos.y += this.thirdPersonHeight;
      
      const offset = new THREE.Vector3(
        -Math.sin(this.yaw) * this.thirdPersonDistance,
        this.thirdPersonHeight,
        -Math.cos(this.yaw) * this.thirdPersonDistance
      );
      
      camera.position.lerp(targetPos.clone().add(offset), this.cameraSmoothing);
      camera.lookAt(targetPos);
    } else {
      // First person camera
      camera.position.set(
        this.position.x,
        this.position.y,
        this.position.z
      );
      camera.rotation.order = 'YXZ';
      camera.rotation.y = this.yaw;
      camera.rotation.x = this.pitch;
    }
  }

  // Mouse look
  handleMouseMove(movementX: number, movementY: number): void {
    const sensitivity = 0.002;
    this.yaw -= movementX * sensitivity;
    this.pitch -= movementY * sensitivity;
    this.pitch = clamp(this.pitch, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
  }

  handleTouchLook(deltaX: number, deltaY: number): void {
    const sensitivity = 0.005;
    this.yaw -= deltaX * sensitivity;
    this.pitch -= deltaY * sensitivity;
    this.pitch = clamp(this.pitch, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
  }

  // Actions
  setDisguised(disguised: boolean, objectId?: string): void {
    this.isDisguised = disguised;
    this.disguisedObjectId = objectId;
  }

  private disguisedObjectId?: string;

  setCrouching(crouching: boolean): void {
    this.isCrouching = crouching;
  }

  setSprinting(sprinting: boolean): void {
    this.isSprinting = sprinting;
  }

  toggleThirdPerson(): void {
    this.thirdPerson = !this.thirdPerson;
  }

  isThirdPerson(): boolean {
    return this.thirdPerson;
  }

  // Getters for networking
  getState(): { position: Vector3D; rotation: Vector3D } {
    return {
      position: { x: this.position.x, y: this.position.y, z: this.position.z },
      rotation: { x: this.pitch, y: this.yaw, z: 0 }
    };
  }

  setState(state: { position: Vector3D; rotation: Vector3D }): void {
    this.position.set(state.position.x, state.position.y, state.position.z);
    this.yaw = state.rotation.y;
    this.pitch = state.rotation.x;
  }

  // Spawn
  spawn(position: THREE.Vector3, yaw: number): void {
    this.position.copy(position);
    this.yaw = yaw;
    this.pitch = 0;
    this.velocity.set(0, 0, 0);
    this.isGrounded = true;
    this.isJumping = false;
  }
}