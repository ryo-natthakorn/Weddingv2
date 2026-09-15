// Billboard projection adapted from Hyperiux Vault's Orbit Flip Slider.
// https://vault.hyperiux.com (user-supplied source)
export function ringPosition(angle: number, radius: number) {
  const r = radius * 0.65;
  const tilt = 31 * Math.PI / 180;
  const rotation = -25 * Math.PI / 180;
  const z = -r * Math.cos(angle);
  const perspective = (r * 1.75) / (r * 1.75 + z * Math.cos(tilt));
  const positionScale = 1 + (perspective - 1) * 0.45;
  const x = r * Math.sin(angle) * positionScale * 1.5;
  const y = -z * Math.sin(tilt) * positionScale * 1.2;
  return {
    x: x * Math.cos(rotation) - y * Math.sin(rotation),
    y: x * Math.sin(rotation) + y * Math.cos(rotation),
    scale: 0.42 * (1 + (perspective - 1) * 0.42),
    depth: perspective,
  };
}
