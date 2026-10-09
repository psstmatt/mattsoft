// Use untransformed stage dimensions for every representation of the computer.
// On phones the stage is anchored to 100svh, so browser chrome cannot move it.
export function computerLayout(width, height) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
    return { x: 0, y: 0, s: 0 };
  const base = Math.min(height, width * 1.5);
  const size = Math.min(base * 0.66, width <= 700 ? width * 0.78 : Infinity);
  return { x: (width - size) / 2, y: height / 2 + base * 0.01 - size / 2, s: size };
}

// The poster and labels inherit the same measured values as either renderer.
// CSS supplies equivalent values before a renderer is available.
export function applyComputerLayout(element, width, height) {
  const pose = computerLayout(width, height);
  if (pose.s > 0) {
    element.style.setProperty("--computer-scene-size", `${pose.s}px`);
    element.style.setProperty(
      "--computer-scene-offset-y",
      `${Math.min(height, width * 1.5) * 0.01}px`,
    );
  }
  return pose;
}

export function allowsComputerCameraMotion(finePointer, reducedMotion = false) {
  return !!finePointer && !reducedMotion;
}
