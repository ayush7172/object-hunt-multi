// Math utilities

import * as THREE from 'three';

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function smoothDamp(current: number, target: number, currentVelocity: { value: number }, smoothTime: number, deltaTime: number): number {
  smoothTime = Math.max(0.0001, smoothTime);
  const omega = 2 / smoothTime;
  const x = omega * deltaTime;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  let change = current - target;
  const originalTo = target;
  const maxChange = 1000000;
  change = clamp(change, -maxChange, maxChange);
  target = current - change;
  const temp = (currentVelocity.value + omega * change) * deltaTime;
  currentVelocity.value = (currentVelocity.value - omega * temp) * exp;
  let output = target + (change + temp) * exp;
  if (originalTo - current > 0 === output > originalTo) {
    output = originalTo;
    currentVelocity.value = (output - originalTo) / deltaTime;
  }
  return output;
}

export function smoothDampVec3(current: THREE.Vector3, target: THREE.Vector3, currentVelocity: THREE.Vector3, smoothTime: number, deltaTime: number): THREE.Vector3 {
  const vx = { value: currentVelocity.x };
  const vy = { value: currentVelocity.y };
  const vz = { value: currentVelocity.z };
  
  const rx = smoothDamp(current.x, target.x, vx, smoothTime, deltaTime);
  const ry = smoothDamp(current.y, target.y, vy, smoothTime, deltaTime);
  const rz = smoothDamp(current.z, target.z, vz, smoothTime, deltaTime);
  
  currentVelocity.x = vx.value;
  currentVelocity.y = vy.value;
  currentVelocity.z = vz.value;
  
  return new THREE.Vector3(rx, ry, rz);
}

export function degreesToRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function radiansToDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

export function getRandomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}