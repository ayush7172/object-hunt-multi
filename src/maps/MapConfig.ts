// Map configurations for 4 tiers: Small, Medium, Large, XL

import { MapConfig, TransformableObject, Vector3D } from '../utils/types';

function vec(x: number, y: number, z: number): Vector3D {
  return { x, y, z };
}

// ========== SMALL MAP (2-4 players) ==========
export const MAP_SMALL: MapConfig = {
  id: 'house_garden',
  name: 'Cozy Cottage',
  minPlayers: 2,
  maxPlayers: 4,
  bounds: { min: vec(-25, 0, -25), max: vec(25, 0, 25) },
  spawnZones: {
    hider: [vec(-5, 0, -8), vec(5, 0, -8), vec(-3, 0, -10), vec(3, 0, -6)],
    seeker: [vec(0, 0, 15), vec(2, 0, 14)]
  },
  transformableObjects: [
    { id: 'table_1', name: 'Kitchen Table', position: vec(-3, 0, -6), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'chair_1', name: 'Chair', position: vec(-4.2, 0, -6), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'chair_2', name: 'Chair', position: vec(-1.8, 0, -6), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'bookshelf_1', name: 'Bookshelf', position: vec(-5.2, 0, -11), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'couch_1', name: 'Couch', position: vec(3, 0, -11), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'lamp_1', name: 'Floor Lamp', position: vec(5, 0, -12), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'crate_1', name: 'Wooden Crate', position: vec(-4, 0, -12), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'plant_1', name: 'Indoor Plant', position: vec(5, 0, -4), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'barrel_1', name: 'Wooden Barrel', position: vec(8, 0, 0), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'barrel_2', name: 'Iron Barrel', position: vec(7, 0, 1.5), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'toolbox_1', name: 'Tool Box', position: vec(10, 0, -2), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'bench_1', name: 'Garden Bench', position: vec(-3, 0, 5), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'rock_1', name: 'Large Rock', position: vec(5, 0, 6), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'hay_1', name: 'Hay Bale', position: vec(12, 0, 10), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
  ],
  modelPath: '/maps/small.gltf',
  collisionPath: '/maps/small_collision.json'
};

// ========== MEDIUM MAP (4-6 players) ==========
export const MAP_MEDIUM: MapConfig = {
  id: 'farmhouse',
  name: 'Old Farmhouse',
  minPlayers: 4,
  maxPlayers: 6,
  bounds: { min: vec(-35, 0, -35), max: vec(35, 0, 35) },
  spawnZones: {
    hider: [vec(-5, 0, -8), vec(5, 0, -8), vec(-3, 0, -10), vec(3, 0, -6), vec(-15, 0, 5), vec(15, 0, 5)],
    seeker: [vec(0, 0, 20), vec(2, 0, 18), vec(-2, 0, 22)]
  },
  transformableObjects: [
    ...MAP_SMALL.transformableObjects.map(o => ({...o})),
    { id: 'shed_crate_1', name: 'Shed Crate', position: vec(-13, 0, 0), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'hay_2', name: 'Hay Bale', position: vec(13.5, 0, 10), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'hay_3', name: 'Stacked Hay', position: vec(12.75, 0.8, 10), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'rock_2', name: 'Small Rock', position: vec(-9, 0, 0), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'rock_3', name: 'Medium Rock', position: vec(11, 0, 5), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'barrel_3', name: 'Oil Drum', position: vec(-11, 0, -1), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'cart_1', name: 'Wooden Cart', position: vec(14, 0, -5), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'plant_2', name: 'Garden Bush', position: vec(-8, 0, 2), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'plant_3', name: 'Flower Pot', position: vec(-7, 0, 3), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'plant_4', name: 'Shed Plant', position: vec(-13, 0, 1), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
  ],
  modelPath: '/maps/medium.gltf',
  collisionPath: '/maps/medium_collision.json'
};

// ========== LARGE MAP (6-8 players) ==========
export const MAP_LARGE: MapConfig = {
  id: 'village',
  name: 'Quiet Village',
  minPlayers: 6,
  maxPlayers: 8,
  bounds: { min: vec(-50, 0, -50), max: vec(50, 0, 50) },
  spawnZones: {
    hider: [
      vec(-5, 0, -8), vec(5, 0, -8), vec(-3, 0, -10), vec(3, 0, -6),
      vec(-25, 0, 5), vec(25, 0, 5), vec(-20, 0, -20), vec(20, 0, -20),
      vec(0, 0, 15)
    ],
    seeker: [vec(0, 0, 35), vec(2, 0, 33), vec(-2, 0, 37)]
  },
  transformableObjects: [
    ...MAP_MEDIUM.transformableObjects.map(o => ({...o})),
    { id: 'shop_counter', name: 'Shop Counter', position: vec(-20, 0, 5), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'market_stall', name: 'Market Stall', position: vec(20, 0, 5), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'dumpster_1', name: 'Dumpster', position: vec(-22, 0, -20), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'park_bench', name: 'Park Bench', position: vec(22, 0, -20), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'fire_hydrant', name: 'Fire Hydrant', position: vec(10, 0, 15), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'trash_can', name: 'Trash Can', position: vec(-10, 0, 15), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'fountain', name: 'Fountain', position: vec(0, 0, 0), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
  ],
  modelPath: '/maps/large.gltf',
  collisionPath: '/maps/large_collision.json'
};

// ========== XL MAP (8-10 players) ==========
export const MAP_XL: MapConfig = {
  id: 'town_square',
  name: 'Town Square',
  minPlayers: 8,
  maxPlayers: 10,
  bounds: { min: vec(-60, 0, -60), max: vec(60, 0, 60) },
  spawnZones: {
    hider: [
      vec(-5, 0, -8), vec(5, 0, -8), vec(-3, 0, -10), vec(3, 0, -6),
      vec(-25, 0, 5), vec(25, 0, 5), vec(-20, 0, -20), vec(20, 0, -20),
      vec(0, 0, 15), vec(-40, 0, 0), vec(40, 0, 0)
    ],
    seeker: [vec(0, 0, 45), vec(2, 0, 43), vec(-2, 0, 47), vec(4, 0, 44)]
  },
  transformableObjects: [
    ...MAP_LARGE.transformableObjects.map(o => ({...o})),
    { id: 'subway_entrance', name: 'Subway Entrance', position: vec(-40, 0, 0), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'bus_stop', name: 'Bus Stop', position: vec(40, 0, 0), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'newspaper_stand', name: 'Newspaper Stand', position: vec(-35, 0, 20), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'mail_box', name: 'Mail Box', position: vec(35, 0, 20), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'construction_pile', name: 'Construction Pile', position: vec(-40, 0, -30), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
    { id: 'van_1', name: 'Parked Van', position: vec(40, 0, -30), rotation: vec(0, 0, 0), scale: vec(1, 1, 1), durability: 100, maxDurability: 100, isTransformable: true, hasHider: false },
  ],
  modelPath: '/maps/xl.gltf',
  collisionPath: '/maps/xl_collision.json'
};

export const MAPS: Record<string, MapConfig> = {
  house_garden: MAP_SMALL,
  farmhouse: MAP_MEDIUM,
  village: MAP_LARGE,
  town_square: MAP_XL,
};

export function getMapForPlayerCount(playerCount: number): MapConfig {
  if (playerCount <= 4) return MAP_SMALL;
  if (playerCount <= 6) return MAP_MEDIUM;
  if (playerCount <= 8) return MAP_LARGE;
  return MAP_XL;
}

export function getMapById(id: string): MapConfig {
  return MAPS[id] || MAP_SMALL;
}