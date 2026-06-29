import { MapConfig, Vector3D } from '../utils/types';

function vec(x: number, y: number, z: number): Vector3D {
  return { x, y, z };
}

export const MAP_COZY_COTTAGE: MapConfig = {
  id: 'house_garden',
  name: 'Cozy Cottage',
  minPlayers: 2,
  maxPlayers: 4,
  bounds: { min: vec(-25, 0, -25), max: vec(25, 0, 25) },
  spawnZones: {
    hider: [
      vec(-5, 0, -12), vec(5, 0, -12), vec(-8, 0, -6), vec(8, 0, -6),
      vec(-3, 0, -15), vec(3, 0, -15), vec(-12, 0, 5), vec(12, 0, 5),
      vec(0, 0, 10), vec(-6, 0, 8)
    ],
    seeker: [vec(0, 0, 18), vec(3, 0, 17)]
  },
  objectPositions: [
    vec(-3, 0, -6), vec(-4.2, 0, -6), vec(-1.8, 0, -6), vec(-5.2, 0, -11),
    vec(3, 0, -11), vec(-4, 0, -12), vec(6, 0, -4), vec(8, 0, 0),
    vec(7, 0, 1.5), vec(10, 0, -2), vec(-3, 0, 5), vec(5, 0, 6),
    vec(12, 0, 10), vec(-12, 0, -3), vec(0, 0, -8), vec(-8, 0, 2),
    vec(9, 0, -5), vec(-6, 0, 3), vec(2, 0, 6), vec(-5, 0, 13),
    vec(5, 0, 13), vec(0, 0, -4), vec(-7, 0, -9), vec(7, 0, -9),
    vec(-10, 0, 8), vec(10, 0, 8), vec(-14, 0, 0), vec(14, 0, 0),
    vec(-9, 0, -15), vec(9, 0, -15), vec(0, 0, -18), vec(-15, 0, -8),
    vec(15, 0, -8), vec(-13, 0, 10), vec(13, 0, 10)
  ],
  modelPath: '/maps/small.gltf',
  collisionPath: '/maps/small_collision.json'
};

export const MAP_OLD_FARMHOUSE: MapConfig = {
  id: 'farmhouse',
  name: 'Old Farmhouse',
  minPlayers: 4,
  maxPlayers: 6,
  bounds: { min: vec(-35, 0, -35), max: vec(35, 0, 35) },
  spawnZones: {
    hider: [
      vec(-5, 0, -12), vec(5, 0, -12), vec(-8, 0, -6), vec(8, 0, -6),
      vec(-15, 0, 5), vec(15, 0, 5), vec(-20, 0, -15), vec(20, 0, -15),
      vec(0, 0, 15), vec(-12, 0, 15), vec(12, 0, 15), vec(-25, 0, 0),
      vec(25, 0, 0), vec(-18, 0, -25), vec(18, 0, -25)
    ],
    seeker: [vec(0, 0, 25), vec(4, 0, 24), vec(-4, 0, 26)]
  },
  objectPositions: [
    vec(-3, 0, -6), vec(-4.2, 0, -6), vec(-1.8, 0, -6), vec(3, 0, -12),
    vec(-5, 0, -11), vec(6, 0, -4), vec(8, 0, 0), vec(7, 0, 1.5),
    vec(10, 0, -2), vec(-3, 0, 5), vec(5, 0, 6), vec(12, 0, 10),
    vec(-13, 0, 0), vec(14, 0, -5), vec(-11, 0, -1), vec(11, 0, 5),
    vec(13.5, 0, 10), vec(12.75, 0.8, 10), vec(-9, 0, 0), vec(-8, 0, 2),
    vec(-7, 0, 3), vec(-15, 0, 1), vec(-20, 0, -10), vec(20, 0, -10),
    vec(-18, 0, 8), vec(18, 0, 8), vec(-22, 0, -18), vec(22, 0, -18),
    vec(-16, 0, -5), vec(16, 0, -5), vec(0, 0, 10), vec(-5, 0, 15),
    vec(5, 0, 15), vec(-10, 0, -15), vec(10, 0, -15), vec(-25, 0, 2),
    vec(25, 0, 2), vec(-17, 0, 20), vec(17, 0, 20), vec(-14, 0, -22),
    vec(14, 0, -22), vec(-6, 0, -20), vec(6, 0, -20), vec(-23, 0, -5),
    vec(23, 0, -5), vec(-2, 0, 20), vec(2, 0, 20), vec(-30, 0, 10),
    vec(30, 0, 10), vec(-28, 0, -10), vec(28, 0, -10), vec(-12, 0, 10),
    vec(12, 0, 10)
  ],
  modelPath: '/maps/medium.gltf',
  collisionPath: '/maps/medium_collision.json'
};

export const MAP_QUIET_VILLAGE: MapConfig = {
  id: 'village',
  name: 'Quiet Village',
  minPlayers: 6,
  maxPlayers: 8,
  bounds: { min: vec(-50, 0, -50), max: vec(50, 0, 50) },
  spawnZones: {
    hider: [
      vec(-5, 0, -12), vec(5, 0, -12), vec(-8, 0, -6), vec(8, 0, -6),
      vec(-25, 0, 5), vec(25, 0, 5), vec(-20, 0, -20), vec(20, 0, -20),
      vec(0, 0, 15), vec(-35, 0, 0), vec(35, 0, 0), vec(-30, 0, -30),
      vec(30, 0, -30), vec(-15, 0, 25), vec(15, 0, 25), vec(-40, 0, 20),
      vec(40, 0, 20), vec(-28, 0, -10), vec(28, 0, -10)
    ],
    seeker: [vec(0, 0, 40), vec(4, 0, 38), vec(-4, 0, 42), vec(2, 0, 39)]
  },
  objectPositions: [
    vec(-3, 0, -6), vec(-4.2, 0, -6), vec(-1.8, 0, -6), vec(3, 0, -12),
    vec(-5, 0, -11), vec(6, 0, -4), vec(8, 0, 0), vec(7, 0, 1.5),
    vec(10, 0, -2), vec(-3, 0, 5), vec(5, 0, 6), vec(12, 0, 10),
    vec(-13, 0, 0), vec(14, 0, -5), vec(-11, 0, -1), vec(11, 0, 5),
    vec(13.5, 0, 10), vec(-9, 0, 0), vec(-8, 0, 2), vec(-7, 0, 3),
    vec(-15, 0, 1), vec(-20, 0, 5), vec(20, 0, 5), vec(-22, 0, -20),
    vec(22, 0, -20), vec(10, 0, 15), vec(-10, 0, 15), vec(0, 0, 0),
    vec(-30, 0, -15), vec(30, 0, -15), vec(-25, 0, 20), vec(25, 0, 20),
    vec(-18, 0, -5), vec(18, 0, -5), vec(0, 0, 20), vec(-5, 0, 22),
    vec(5, 0, 22), vec(-35, 0, 10), vec(35, 0, 10), vec(-32, 0, -25),
    vec(32, 0, -25), vec(-28, 0, 25), vec(28, 0, 25), vec(-15, 0, -15),
    vec(15, 0, -15), vec(-8, 0, -25), vec(8, 0, -25), vec(-40, 0, -5),
    vec(40, 0, -5), vec(-38, 0, 30), vec(38, 0, 30), vec(-45, 0, 15),
    vec(45, 0, 15), vec(-33, 0, -35), vec(33, 0, -35), vec(-10, 0, 30),
    vec(10, 0, 30), vec(-22, 0, 12), vec(22, 0, 12), vec(-6, 0, -30),
    vec(6, 0, -30), vec(-42, 0, -40), vec(42, 0, -40), vec(-48, 0, 0),
    vec(48, 0, 0), vec(-36, 0, 35), vec(36, 0, 35), vec(-25, 0, -40),
    vec(25, 0, -40), vec(-2, 0, 35), vec(2, 0, 35), vec(-14, 0, -35),
    vec(14, 0, -35), vec(-50, 0, 25), vec(50, 0, 25), vec(-48, 0, -20),
    vec(48, 0, -20), vec(-38, 0, -10), vec(38, 0, -10)
  ],
  modelPath: '/maps/large.gltf',
  collisionPath: '/maps/large_collision.json'
};

export const MAP_TOWN_SQUARE: MapConfig = {
  id: 'town_square',
  name: 'Town Square',
  minPlayers: 8,
  maxPlayers: 10,
  bounds: { min: vec(-65, 0, -65), max: vec(65, 0, 65) },
  spawnZones: {
    hider: [
      vec(-5, 0, -12), vec(5, 0, -12), vec(-8, 0, -6), vec(8, 0, -6),
      vec(-25, 0, 5), vec(25, 0, 5), vec(-20, 0, -20), vec(20, 0, -20),
      vec(0, 0, 15), vec(-40, 0, 0), vec(40, 0, 0), vec(-50, 0, -30),
      vec(50, 0, -30), vec(-35, 0, 35), vec(35, 0, 35), vec(-55, 0, 10),
      vec(55, 0, 10), vec(-15, 0, 40), vec(15, 0, 40), vec(-60, 0, -20),
      vec(60, 0, -20), vec(-45, 0, -50), vec(45, 0, -50)
    ],
    seeker: [vec(0, 0, 55), vec(5, 0, 53), vec(-5, 0, 57), vec(3, 0, 54), vec(-3, 0, 56)]
  },
  objectPositions: [
    vec(-3, 0, -6), vec(-4.2, 0, -6), vec(-1.8, 0, -6), vec(3, 0, -12),
    vec(-5, 0, -11), vec(6, 0, -4), vec(8, 0, 0), vec(7, 0, 1.5),
    vec(10, 0, -2), vec(-3, 0, 5), vec(5, 0, 6), vec(12, 0, 10),
    vec(-13, 0, 0), vec(14, 0, -5), vec(-11, 0, -1), vec(11, 0, 5),
    vec(13.5, 0, 10), vec(-9, 0, 0), vec(-8, 0, 2), vec(-7, 0, 3),
    vec(-15, 0, 1), vec(-20, 0, 5), vec(20, 0, 5), vec(-22, 0, -20),
    vec(22, 0, -20), vec(10, 0, 15), vec(-10, 0, 15), vec(0, 0, 0),
    vec(-40, 0, 0), vec(40, 0, 0), vec(-35, 0, 20), vec(35, 0, 20),
    vec(-40, 0, -30), vec(40, 0, -30), vec(-30, 0, -15), vec(30, 0, -15),
    vec(-25, 0, 30), vec(25, 0, 30), vec(-18, 0, -5), vec(18, 0, -5),
    vec(0, 0, 25), vec(-6, 0, 28), vec(6, 0, 28), vec(-45, 0, 15),
    vec(45, 0, 15), vec(-42, 0, -40), vec(42, 0, -40), vec(-38, 0, 40),
    vec(38, 0, 40), vec(-55, 0, 0), vec(55, 0, 0), vec(-50, 0, -20),
    vec(50, 0, -20), vec(-15, 0, -15), vec(15, 0, -15), vec(-8, 0, -35),
    vec(8, 0, -35), vec(-48, 0, 30), vec(48, 0, 30), vec(-60, 0, 25),
    vec(60, 0, 25), vec(-33, 0, -50), vec(33, 0, -50), vec(-10, 0, 40),
    vec(10, 0, 40), vec(-28, 0, 15), vec(28, 0, 15), vec(-5, 0, -45),
    vec(5, 0, -45), vec(-58, 0, -40), vec(58, 0, -40), vec(-65, 0, -10),
    vec(65, 0, -10), vec(-52, 0, 45), vec(52, 0, 45), vec(-35, 0, -60),
    vec(35, 0, -60), vec(-2, 0, 50), vec(2, 0, 50), vec(-20, 0, -55),
    vec(20, 0, -55), vec(-65, 0, 40), vec(65, 0, 40), vec(-60, 0, -55),
    vec(60, 0, -55), vec(-55, 0, -60), vec(55, 0, -60), vec(-10, 0, -60),
    vec(10, 0, -60), vec(-45, 0, 55), vec(45, 0, 55), vec(-38, 0, -25),
    vec(38, 0, -25), vec(-25, 0, 45), vec(25, 0, 45), vec(-50, 0, 10),
    vec(50, 0, 10), vec(-15, 0, 50), vec(15, 0, 50), vec(-42, 0, -10),
    vec(42, 0, -10), vec(-63, 0, -50), vec(63, 0, -50), vec(-32, 0, 50),
    vec(32, 0, 50), vec(-7, 0, 55), vec(7, 0, 55), vec(-58, 0, 55),
    vec(58, 0, 55), vec(-55, 0, -35), vec(55, 0, -35), vec(-48, 0, -55),
    vec(48, 0, -55), vec(-22, 0, 55), vec(22, 0, 55), vec(-65, 0, 5),
    vec(65, 0, 5), vec(-30, 0, -45), vec(30, 0, -45), vec(-12, 0, -50),
    vec(12, 0, -50), vec(-40, 0, 50), vec(40, 0, 50)
  ],
  modelPath: '/maps/xl.gltf',
  collisionPath: '/maps/xl_collision.json'
};

export const MAPS: Record<string, MapConfig> = {
  house_garden: MAP_COZY_COTTAGE,
  farmhouse: MAP_OLD_FARMHOUSE,
  village: MAP_QUIET_VILLAGE,
  town_square: MAP_TOWN_SQUARE,
};

export function getMapForPlayerCount(playerCount: number): MapConfig {
  if (playerCount <= 4) return MAP_COZY_COTTAGE;
  if (playerCount <= 6) return MAP_OLD_FARMHOUSE;
  if (playerCount <= 8) return MAP_QUIET_VILLAGE;
  return MAP_TOWN_SQUARE;
}

export function getMapById(id: string): MapConfig {
  return MAPS[id] || MAP_COZY_COTTAGE;
}
