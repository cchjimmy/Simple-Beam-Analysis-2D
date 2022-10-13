const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

main();

function main() {
  canvas.width = innerWidth;
  canvas.height = innerHeight*3;

  evalBeam(new Beam({'simply-supported': false, cantilever: true}, 600, [new Force(0, -100, 600)], [new Moment(5000, 400), new Moment(-1000, 100)]));
}

function Beam(type = {'simply-supported': true, 'cantilever': false}, length, forces = [], moments = []) {
  this.type = type;
  this.length = length;
  this.forces = forces;
  this.moments = moments;
}

function Force(magX = 0, magY = 0, posX = 0, posY = 0) {
  this.components = {x: magX, y: magY};
  this.magnitude = (magX**2+magY**2)**0.5;
  this.direction = Math.atan2(magY, magX);
  this.position = {x: posX, y: posY}
  // Because clockwise moment is positive. If force Y is pointing down (-ve), moment is clockwise (+ve) from reference on the left.
  this.moment = {x: -this.components.y * this.position.x, y: this.components.x*this.position.y};
}

function Moment(magnitude = 0, posX = 0, posY = 0) {
  this.magnitude = magnitude;
  this.position = {
    x: posX,
    y: posY
  }
}

function evalBeam(beam) {
  const types = ['simply-supported', 'cantilever'];
  if (beam.type[types[0]] && beam.type[types[1]]) {
    throw('Multi-type beam is not supported');
    return;
  }
  if (!beam.type[types[0]] && !beam.type[types[1]]) {
    throw('Unknow beam type');
    return;
  }
  console.log('Beam type supported');
  
  let momentX_R = 0; // _R means resultant
  let forcesY_R = 0;
  let forcesX_R = 0;
  for (let i = 0; i < beam.forces.length; i++) {
    let force = beam.forces[i];
    
    if (force.position.x > beam.length) continue;
    
    // Moment calculations, sum of all moment is 0 if equilibrium.
    momentX_R += force.moment.x;
    
    // Sum of all forces Y must be 0, if equilibrium.
    forcesY_R += force.components.y;
    
    // Sum of all forces X must also be 0, if in equilibrium.
    forcesX_R += force.components.x;
  }
  
  for (let i = 0; i < beam.moments.length; i++) {
    momentX_R += beam.moments[i].magnitude;
  }
  
  let R1, R2, R3;
  // Resolve moment
  if (momentX_R != 0 && beam.type['simply-supported']) {
    R2 = new Force(0, -momentX_R/beam.length, beam.length);
    forcesY_R += R2.components.y;
  }
  if (beam.type.cantilever) beam.moments.push(new Moment(-momentX_R, 0));
  
  // Resolve forces in X
  if (forcesX_R != 0) R3 = new Force(-forcesX_R);
  
  // Resolve forces in Y
  if (forcesY_R != 0) R1 = new Force(0, -forcesY_R);
  
  // Apply reaction forces to beam
  if (R1) beam.forces.push(R1);
  if (R2) beam.forces.push(R2);
  if (R3) beam.forces.push(R3);
  
  // Illustrations
  // Clear canvas with black;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.save();
  const b = {
    L: beam.length,
    h: 10,
    x: canvas.width / 2 - beam.length / 2,
    y: canvas.height / 3 / 2 - 10 / 2
  }
  
  // Draw beam
  ctx.fillStyle = 'grey';
  ctx.fillRect(b.x, b.y, b.L, b.h);
  
  // Draw forces
  for (let i = 0; i < beam.forces.length; i++) {
    let force = beam.forces[i];
    drawVec(force.position.x + b.x, b.y + b.h / 2, force.magnitude, force.direction, `${force.magnitude}N`);
  }
  
  // Draw moments
  for (let i = 0; i < beam.moments.length; i++) {
    let moment = beam.moments[i];
    drawMoment(moment.position.x + b.x, moment.position.y + b.y + b.h/2, moment.magnitude, `${Math.abs(moment.magnitude)}Nm`);
  }
  
  // Shear force graph
  drawFunc(V, canvas.width / 2, canvas.height * 0.5, b.L);
  
  // Moment graph
  drawFunc(M, canvas.width / 2, canvas.height - canvas.height / 3 / 2, b.L);
  
  function drawMoment(x, y, magnitude, label = '') {
    if (magnitude == 0) return;
    
    ctx.save();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.translate(x, y);
    ctx.beginPath();
    let r = 80;
    
    // Label
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 5;
    ctx.font = '18px Menlo';
    let textMetrics = ctx.measureText(label);
    let textPos = {
      x: -textMetrics.width / 2,
      y: -r - textMetrics.emHeightAscent
    }
    ctx.strokeText(label, textPos.x, textPos.y);
    ctx.fillText(label, textPos.x, textPos.y);
    ctx.restore();
    
    // +ve clockwise, -ve anticlockwise
    if (magnitude < 0) {
      ctx.scale(-1, 1)
    }
    
    // Arc
    ctx.arc(0, 0, r, Math.PI / 2 - 1, -Math.PI / 2 + 1);
    let angle = -Math.PI / 2 - 1;
    let _x = -r * Math.cos(angle);
    let _y = r * Math.sin(angle);
    
    // Arrow
    ctx.translate(_x, _y);
    ctx.rotate(-angle/2-0.3);
    ctx.moveTo(-10, 10);
    ctx.lineTo(0, 0);
    ctx.lineTo(-10, -10);
    ctx.stroke();
    ctx.restore();
  }
  
  function drawVec(x, y, magnitude, rotation, label = '') {
    if (magnitude == 0) return;
    
    ctx.save();
    
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.translate(x, y);
    
    // Arrow
    ctx.rotate(-rotation);
    ctx.translate(-10, 0); // -10 is padding
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-magnitude, 0);
    ctx.moveTo(-10, 10);
    ctx.lineTo(0, 0);
    ctx.lineTo(-10, -10);
    ctx.stroke();
    
    // Label
    ctx.font = '18px Menlo';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 5;
    let textMetrics = ctx.measureText(label);
    ctx.translate(-magnitude / 2,0);
    ctx.rotate(rotation);
    ctx.translate(-textMetrics.width-10,-10); // -10 is padding
    ctx.strokeText(label, 0, 0);
    ctx.fillText(label, 0, 0);
    
    ctx.restore();
  }
  
  function drawFunc(func, posX, posY, length) {
    ctx.save();
    
    ctx.translate(posX, posY);
    ctx.strokeStyle = 'white';
    
    // Draw axis
    ctx.beginPath();
    ctx.moveTo(-length/2, -innerHeight / 2 + 10);
    ctx.lineTo(-length/2, innerHeight / 2 - 10);
    ctx.moveTo(-length/2, 0);
    ctx.lineTo(length/2, 0);
    ctx.stroke();
    
    // Plot
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-length/2, 0);
    for (let _x = 0; _x <= length; _x++) {
      ctx.lineTo(_x - length / 2, func(_x));
    }
    ctx.stroke();
    
    ctx.restore();
  }
  
  // Shear force function
  function V(x) {
    let shearF = 0;
    for (let i = 0; i < beam.forces.length; i++) {
      let force = beam.forces[i];
      // Shear force takes down as +ve, this works graphically here because y increases downwards
      if (force.position.x <= x) shearF -= force.components.y;
    }
    return shearF;
  }
  
  // Moment function
  function M(x) {
    let moment = 0;
    for (let i = 0; i < beam.forces.length; i++) {
      let force = beam.forces[i];
      if (force.position.x <= x) moment += -force.components.y * (x - force.position.x);
    }
    for (let i = 0; i < beam.moments.length; i++) {
      let M = beam.moments[i];
      if (M.position.x <= x ) moment += -M.magnitude;
    }
    return moment / 200;
  }
}