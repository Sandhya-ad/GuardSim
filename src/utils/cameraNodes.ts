import type { CameraNodeKey } from '../types';

export const cameraNodes: Record<CameraNodeKey, { position: [number, number, number]; lookAt: [number, number, number] }> = {
  securityPost: {
    position: [0, 2.2, 8],
    lookAt: [0, 1.4, 0],
  },
  fenceLine: {
    position: [-3.5, 2.1, 5.2],
    lookAt: [-7, 1.2, -2],
  },
  trailerArea: {
    position: [2.5, 2.1, 4.5],
    lookAt: [5, 1.3, -3],
  },
  policeArrival: {
    position: [0.5, 2.4, 10.5],
    lookAt: [0, 1.3, 0],
  },
};
