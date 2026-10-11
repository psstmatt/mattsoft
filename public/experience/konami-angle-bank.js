const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

// The same calibrated camera and curved tube used by the Green WebGL renderer.
// Every raster view is paired with the screen projected from that exact camera.
export function referenceScreenFrame(source, column, row) {
  if (column === 9 && row === 1) return source.frame;
  const yaw = -0.34 + (column - 9) * 0.01,
    targetZ = 0.155,
    distance = Math.hypot(1.35, 0.22 - targetZ),
    pitch = Math.atan2(0.22 - targetZ, 1.35) - (-0.055 + (row - 1) * 0.015),
    cy = Math.cos(yaw),
    sy = Math.sin(yaw),
    cp = Math.cos(pitch),
    sp = Math.sin(pitch),
    scale = Math.tan((17 * Math.PI) / 180),
    slope = Math.tan((10 * Math.PI) / 180),
    { columns, rows, uv, boundaryVertexIndices } = source.topology;
  const screenMesh = uv.map((_, index) => {
    const u = (index % columns) / (columns - 1),
      v = Math.floor(index / columns) / (rows - 1),
      x = Math.fround((2 * u - 1) * 0.119),
      z0 = 0.203 + (2 * v - 1) * 0.093,
      y = Math.fround(
        -0.15 +
          slope * (z0 - 0.035) -
          0.018 +
          0.245 -
          Math.sqrt(0.245 ** 2 - ((2 * u - 1) * 0.119) ** 2 - (z0 - 0.203) ** 2) +
          0.002,
      ),
      z = Math.fround(z0 - 0.0025),
      horizontal = cy * x - sy * y,
      depth = sy * x + cy * y + cp * distance,
      vertical = z - targetZ - sp * distance,
      forward = depth * cp - vertical * sp,
      up = depth * sp + vertical * cp;
    return [
      Math.fround((0.5 + (0.5 * horizontal) / (forward * scale) - 0.2) / 0.6) * source.width,
      Math.fround((0.5 - (0.5 * up) / (forward * scale) - 0.22) / 0.6) * source.width,
    ];
  });
  const screenQuad = [
    screenMesh[(rows - 1) * columns],
    screenMesh[rows * columns - 1],
    screenMesh[columns - 1],
    screenMesh[0],
  ];
  return {
    screenMesh,
    screenQuad,
    screenBoundary: boundaryVertexIndices?.map((index) => screenMesh[index]) || screenQuad,
  };
}

export function referenceAngleBank(source) {
  const frames = {};
  for (let row = 0; row < 3; row++)
    for (let column = 0; column < 19; column++) {
      const id = `${row}-${column}`;
      frames[id] = {
        case: `/experience/models/references-chrome-baked/frames/case-${id}.webp`,
        coverage: `/experience/models/ivory-classic/frames/case-${id}.webp`,
        glass: `/experience/models/ivory-classic/frames/glass-${id}.webp`,
        ...referenceScreenFrame(source, column, row),
      };
    }
  return {
    version: 1,
    validated: true,
    width: source.width,
    height: source.height || source.width,
    columns: 19,
    rows: 3,
    center: { column: 9, row: 1 },
    topology: source.topology,
    frames,
  };
}

export function validateAngleBank(bank) {
  const finitePoints = (points, count) =>
    Array.isArray(points) &&
    points.length === count &&
    points.every(
      (point) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite),
    );
  if (
    bank?.version !== 1 ||
    bank.validated !== true ||
    bank.columns !== 19 ||
    bank.rows !== 3 ||
    bank.center?.column !== 9 ||
    bank.center?.row !== 1 ||
    !Number.isInteger(bank.width) ||
    bank.width < 16 ||
    bank.width > 1536 ||
    bank.height !== bank.width ||
    !bank.topology?.uv?.length ||
    !Array.isArray(bank.topology.triangles) ||
    !bank.topology.triangles.length
  )
    throw new Error("Angle bank is not a validated 19 by 3 camera bank");
  const vertexCount = bank.topology.uv.length;
  if (
    !finitePoints(bank.topology.uv, vertexCount) ||
    bank.topology.triangles.some(
      (triangle) =>
        !Array.isArray(triangle) ||
        triangle.length !== 3 ||
        triangle.some((index) => !Number.isInteger(index) || index < 0 || index >= vertexCount),
    )
  )
    throw new Error("Angle bank topology is invalid");
  for (let row = 0; row < bank.rows; row++)
    for (let column = 0; column < bank.columns; column++) {
      const id = `${row}-${column}`,
        frame = bank.frames?.[id];
      if (
        !frame ||
        typeof frame.case !== "string" ||
        typeof frame.glass !== "string" ||
        !finitePoints(frame.screenMesh, vertexCount) ||
        !finitePoints(frame.screenQuad, 4) ||
        (frame.screenBoundary || frame.screenQuad).length < 4 ||
        !finitePoints(
          frame.screenBoundary || frame.screenQuad,
          (frame.screenBoundary || frame.screenQuad).length,
        )
      )
        throw new Error(`Angle bank frame ${id} is incomplete`);
      for (const triangle of bank.topology.triangles) {
        const area = (points) => {
          const [a, b, c] = triangle.map((index) => points[index]);
          return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        };
        if (area(frame.screenMesh) * area(bank.topology.uv) <= 0)
          throw new Error(`Angle bank frame ${id} has a folded screen`);
      }
    }
  return bank;
}

export function pointerCameraRequest(pointer, bank) {
  return {
    column: bank.center.column + clamp(pointer.x || 0, -1, 1) * bank.center.column * 0.7,
    row: bank.center.row - clamp(pointer.y || 0, -1, 1) * bank.center.row * 0.75,
  };
}

const distance = (id, camera) => {
  const [row, column] = id.split("-").map(Number);
  return (column - camera.column) ** 2 + (row - camera.row) ** 2;
};

// Demand-first, bounded decode. A partially loaded view can never supply only
// the case or only the aperture: the renderer sees complete registered frames.
export function createCanvasAngleBank({
  definition,
  initial,
  loadFrame,
  releaseFrame = () => {},
  onChange = () => {},
  maxFrames = 6,
  concurrency = 2,
}) {
  const centerId = `${definition.center.row}-${definition.center.column}`,
    cache = new Map([[centerId, initial]]),
    pending = new Map(),
    failed = new Set();
  let queue = [],
    pinned = new Set(),
    selectedId = centerId,
    disposed = false;
  function evict() {
    while (cache.size > Math.max(2, maxFrames, pinned.size)) {
      const id = [...cache.keys()].find(
        (key) => key !== centerId && key !== selectedId && !pinned.has(key),
      );
      if (!id) break;
      const frame = cache.get(id);
      cache.delete(id);
      releaseFrame(frame);
    }
  }
  function load(id) {
    if (cache.has(id)) return Promise.resolve(cache.get(id));
    if (pending.has(id)) return pending.get(id);
    const task = Promise.resolve()
      .then(() => loadFrame(definition.frames[id], id))
      .then((frame) => {
        if (disposed) {
          releaseFrame(frame);
          return null;
        }
        cache.set(id, frame);
        evict();
        onChange();
        return frame;
      })
      .catch((error) => {
        failed.add(id);
        throw error;
      })
      .finally(() => {
        pending.delete(id);
        pump();
      });
    pending.set(id, task);
    task.catch(() => {});
    return task;
  }
  function pump() {
    while (!disposed && pending.size < concurrency && queue.length) {
      const id = queue.shift();
      if (cache.has(id) || pending.has(id) || failed.has(id)) continue;
      load(id);
    }
  }
  return {
    select(camera, request = true) {
      if (disposed) return initial;
      const ids = [...cache.keys()].sort((a, b) => distance(a, camera) - distance(b, camera));
      selectedId = ids[0];
      const frame = cache.get(selectedId);
      cache.delete(selectedId);
      cache.set(selectedId, frame);
      // Keep the request small; successive pointer samples progressively fill
      // the local neighborhood without downloading all 57 views on mount.
      queue = request
        ? Object.keys(definition.frames)
            .sort((a, b) => distance(a, camera) - distance(b, camera))
            .slice(0, 4)
        : [];
      pump();
      return frame;
    },
    pause() {
      queue = [];
    },
    async prepareCenter(signal) {
      signal?.throwIfAborted();
      queue = [];
      const [row, column] = selectedId.split("-").map(Number),
        center = definition.center,
        // Normal pointer travel needs at most eight registered views. Keep
        // that same finite bound even if a future caller selects an extreme.
        steps = Math.min(7, Math.max(Math.abs(column - center.column), Math.abs(row - center.row))),
        ids = steps
          ? Array.from({ length: steps + 1 }, (_, index) => {
              const t = index / steps;
              return `${Math.round(row + (center.row - row) * t)}-${Math.round(column + (center.column - column) * t)}`;
            })
          : [centerId];
      pinned = new Set(ids);
      // Existing demand loads finish before entry requests, so decoding never
      // exceeds the normal concurrency limit. Center is already resident.
      await Promise.allSettled([...pending.values()]);
      signal?.throwIfAborted();
      for (let index = 0; index < ids.length; index += concurrency) {
        await Promise.all(ids.slice(index, index + concurrency).map(load));
        signal?.throwIfAborted();
      }
      return ids.map((id) => cache.get(id));
    },
    releaseCenter() {
      pinned.clear();
      evict();
    },
    dispose() {
      disposed = true;
      queue = [];
      cache.forEach(releaseFrame);
      cache.clear();
    },
    get size() {
      return cache.size;
    },
    get pending() {
      return pending.size;
    },
    get selectedId() {
      return selectedId;
    },
  };
}
