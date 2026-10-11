const clamp = (value) => Math.max(-1, Math.min(1, value));

// A prepared image has one measured camera pose. Translate the entire composite
// in that plane so its case, glass, aperture and click target stay registered.
export function pointerComputerPose(pose, pointer) {
  return {
    ...pose,
    x: pose.x + clamp(pointer.x) * Math.min(8, pose.s * 0.018),
    y: pose.y + clamp(pointer.y) * Math.min(5, pose.s * 0.012),
  };
}

export function computerPointerTarget(point, pose) {
  if (!pose?.s || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return { x: 0, y: 0 };
  return {
    x: clamp((point.x - pose.x - pose.s / 2) / (pose.s * 0.5)),
    y: clamp((point.y - pose.y - pose.s / 2) / (pose.s * 0.5)),
  };
}

export function pointInsidePolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i],
      [xj, yj] = polygon[j];
    if (yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi)
      inside = !inside;
  }
  return inside;
}

// Input and lifecycle only: the renderer owns the sole animation frame loop.
export function mountComputerPointer({
  element,
  canvas,
  stage,
  signal,
  getPose,
  isAvailable,
  hitTest,
  onChange,
  env = globalThis,
}) {
  const fine = env.matchMedia("(hover: hover) and (pointer: fine)");
  const reduced = env.matchMedia("(prefers-reduced-motion: reduce)");
  let x = 0,
    y = 0,
    tx = 0,
    ty = 0,
    lastTime = null;
  let hovered = false,
    inView = true,
    disposed = false;
  const available = () => !disposed && inView && isAvailable() && !env.document.hidden;
  const publishHover = () => {
    element.dataset.computerHovered = String(hovered);
  };
  const reset = (immediate = true, notify = true) => {
    tx = ty = 0;
    hovered = false;
    if (immediate) {
      x = y = 0;
      lastTime = null;
    }
    publishHover();
    if (!disposed && notify) onChange(immediate);
  };
  const move = (event) => {
    if (!available() || !fine.matches || event.pointerType !== "mouse") return;
    const rect = canvas.getBoundingClientRect(),
      pose = getPose();
    if (!pose?.s || !rect.width || !rect.height) return;
    const point = {
      x: ((event.clientX - rect.left) * stage.clientWidth) / rect.width,
      y: ((event.clientY - rect.top) * stage.clientHeight) / rect.height,
    };
    hovered = hitTest
      ? hitTest(point, pose)
      : point.x >= pose.x &&
        point.x <= pose.x + pose.s &&
        point.y >= pose.y &&
        point.y <= pose.y + pose.s;
    const target =
      hovered && !reduced.matches ? computerPointerTarget(point, pose) : { x: 0, y: 0 };
    tx = target.x;
    ty = target.y;
    publishHover();
    onChange(false);
  };
  const options = { signal };
  element.addEventListener("pointermove", move, options);
  element.addEventListener("pointerleave", () => reset(false), options);
  element.addEventListener("pointercancel", () => reset(), options);
  element.addEventListener("focusout", () => reset(), options);
  env.addEventListener?.("blur", () => reset(), options);
  env.document.addEventListener("visibilitychange", () => reset(), options);
  fine.addEventListener("change", () => reset(), options);
  reduced.addEventListener("change", () => reset(), options);
  const observer = env.IntersectionObserver
    ? new env.IntersectionObserver(([entry]) => {
        if (!entry || inView === entry.isIntersecting) return;
        inView = entry.isIntersecting;
        reset();
      })
    : null;
  observer?.observe(element);
  const dispose = () => {
    reset(true, false);
    disposed = true;
    observer?.disconnect();
  };
  signal?.addEventListener("abort", dispose, { once: true });
  publishHover();
  return {
    get inView() {
      return inView;
    },
    get hovered() {
      return hovered;
    },
    get target() {
      return { x: tx, y: ty };
    },
    get settling() {
      return (
        available() &&
        fine.matches &&
        !reduced.matches &&
        (Math.abs(tx - x) > 0.001 || Math.abs(ty - y) > 0.001)
      );
    },
    sample(now) {
      if (!available() || !fine.matches) reset(true, false);
      if (reduced.matches) {
        x = y = tx = ty = 0;
      }
      const elapsed = lastTime === null ? 16 : Math.min(80, Math.max(0, now - lastTime));
      const ease = 1 - Math.exp(-elapsed / 75);
      x += (tx - x) * ease;
      y += (ty - y) * ease;
      if (Math.abs(tx - x) < 0.001) x = tx;
      if (Math.abs(ty - y) < 0.001) y = ty;
      lastTime = now;
      return { x, y };
    },
    reset,
    dispose,
  };
}
