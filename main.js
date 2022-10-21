import SBA from './SBA.js';

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

main();

function main() {
  canvas.width = innerWidth;
  canvas.height = innerHeight*3;

  // evalBeam(ctx, new Beam({'simply-supported': true, cantilever: false}, 10, 10, [new Force(0, -100000, 5)]));
  // evalBeam(ctx, new Beam({'simply-supported': true}, 12, 1, [new Force(0, -36000, 10)], [new DistForce(()=>-8000, 5, 0, 6)]));
  SBA.evalBeam(ctx, new SBA.Beam({'simply-supported':true}, 10, 1, [new SBA.Force(0, -10000, 8)], [new SBA.DistForce(()=>-20000, 2, 0, 4)]))
}