// Recolor only the warm plastic. Preserve luminance, neutral trim, glass and highlights.
const smoothstep = (low, high, value) => {
  const x = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return x * x * (3 - 2 * x);
};
export function greenPlastic(red, green, blue) {
  const mask =
    smoothstep(0.03, 0.18, red - blue) *
    smoothstep(0.005, 0.1, green - blue) *
    smoothstep(-0.12, 0.1, red - green);
  const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
  const chroma = Math.max(red, green, blue) - Math.min(red, green, blue);
  const tint = [luminance - chroma * 0.7, luminance + chroma * 0.2, luminance + chroma * 0.08];
  return [red, green, blue].map(
    (channel, index) => channel + (Math.max(0, Math.min(1, tint[index])) - channel) * mask,
  );
}
export async function drawComputerPoster(canvas, signal) {
  const image = new Image();
  image.src = "/experience/models/ivory-classic/frames/case-1-9.webp";
  await image.decode();
  if (signal.aborted) return;
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < pixels.data.length; index += 4) {
    if (!pixels.data[index + 3]) continue;
    const color = greenPlastic(
      pixels.data[index] / 255,
      pixels.data[index + 1] / 255,
      pixels.data[index + 2] / 255,
    );
    color.forEach((channel, offset) => {
      pixels.data[index + offset] = Math.round(channel * 255);
    });
  }
  context.putImageData(pixels, 0, 0);
  canvas.dataset.ready = "true";
}
