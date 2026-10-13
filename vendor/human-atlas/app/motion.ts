export function explodeStep(current: number, target: number, dt: number, reduced: boolean) {
  return reduced ? target : target + (current - target) * Math.exp(-8 * dt);
}
export function allowAutoRotate(requested: boolean, isolate: boolean, amount: number, reduced: boolean) {
  return requested && !isolate && amount < .4 && !reduced;
}
