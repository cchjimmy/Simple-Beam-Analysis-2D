// SBA stands for Simple Beam Analysis

export default {
  Beam: function Beam(type = {'simply-supported': true, 'cantilever': false}, length, height, forces = [], distributedForces = [], moments = []) {
  this.type = type;
  this.length = length;
  this.height = height;
  this.forces = {
    normal: forces,
    distributed: distributedForces
  }
  this.moments = moments;
},

Force: function Force(magX = 0, magY = 0, posX = 0, posY = 0) {
  this.components = {x: magX, y: magY};
  this.magnitude = (magX**2+magY**2)**0.5;
  this.direction = Math.atan2(magY, magX);
  this.position = {x: posX, y: posY}
  // Because clockwise moment is positive. If force Y is pointing down (-ve), moment is clockwise (+ve) from reference on the left.
  this.moment = {x: -this.components.y * this.position.x, y: this.components.x*this.position.y};
},

DistForce: function DistForce(func, posX = 0, posY = 0, length) {
  this.distribution = func
  this.position = {
    x: posX,
    y: posY
  }
  this.length = length;
},

Moment: function Moment(magnitude = 0, posX = 0, posY = 0) {
  this.magnitude = magnitude;
  this.position = {
    x: posX,
    y: posY
  }
},

evalBeam: function evalBeam(ctx, beam) {
  // Beam type check
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
  for (let i = 0; i < beam.forces.normal.length; i++) {
    let force = beam.forces.normal[i];
    
    if (force.position.x > beam.length) continue;
    
    // Moment calculations, sum of all moment is 0 in equilibrium.
    momentX_R += force.moment.x;
    
    // Sum of all forces Y must be 0 in equilibrium.
    forcesY_R += force.components.y;
    
    // Sum of all forces X must also be 0 in equilibrium.
    forcesX_R += force.components.x;
  }
  
  // Resultant moment
  for (let i = 0; i < beam.moments.length; i++) {
    if (beam.moments[i].position.x > beam.length) continue;
    momentX_R += beam.moments[i].magnitude;
  }
  
  // Convert distributed force as normal force
  for (let i = 0; i < beam.forces.distributed.length; i++) {
    let distF = beam.forces.distributed[i];
    if (distF.position.x + distF.length / 2 > beam.length || distF.position.x - distF.length / 2 < 0) continue;
    
    let splitString = distF.distribution.toString().split('');
    let test = splitString.splice(splitString.indexOf('>')+1).join().replace(/[ ,{}]/g, '').replace('x', distF.length);
    // Turns string into number, assume distF.length is in m
    let magnitude = new Function(`return ${test}*${distF.length};`)();
    forcesY_R += magnitude;
    // Downward force (-ve) means +ve moment, calculated from the left, because clockwise moments are +ve
    momentX_R += -distF.position.x * magnitude;
  }
  
  let R1, R2, R3;
  // Resolve moment
  if (momentX_R != 0) {
    if (beam.type['simply-supported']) {
      // +ve moment is clockwise, so force should point downwards (-ve)
      // -ve moment is anticlockwise, so force points upwards (+ve)
      // Here R2 is +ve, because moment is calculated from the left, this creates an anticlockwise moment (-ve)
      R2 = new this.Force(0, momentX_R / beam.length, beam.length);
      forcesY_R += R2.components.y;
    }
    if (beam.type.cantilever) beam.moments.push(new this.Moment(-momentX_R, 0));
  }
  
  // Resolve forces in X
  if (forcesX_R != 0) R3 = new this.Force(-forcesX_R);
  
  // Resolve forces in Y
  if (forcesY_R != 0) R1 = new this.Force(0, -forcesY_R);
  
  // Apply reaction forces to beam
  if (R1) beam.forces.normal.push(R1);
  if (R2) beam.forces.normal.push(R2);
  if (R3) beam.forces.normal.push(R3);
  
  // Illustrations
  // Clear canvas with black;
  const canvas = ctx.canvas;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.save();
  const scaleX = 50;
  const scaleY = 0.002; // means for force
  const b = {
    L: beam.length * scaleX,
    h: beam.height * 10,
  }
  b.x = canvas.width*0.5 - b.L*0.5;
  b.y = canvas.height*0.167 - b.h*0.5;
  
  // Draw beam
  ctx.fillStyle = 'grey';
  ctx.fillRect(b.x, b.y, b.L, b.h);
  
  // Draw forces
  for (let i = 0; i < beam.forces.normal.length; i++) {
    let force = beam.forces.normal[i];
    drawVec(force.position.x * scaleX + b.x, b.y + b.h*0.5, force.magnitude * scaleY, force.direction, `${force.magnitude}N`);
  }
  
  // Draw distributed forces
  for (let i = 0; i < beam.forces.distributed.length; i++) {
    let distF = beam.forces.distributed[i];
    let splitString = distF.distribution.toString().split('');
    let label = splitString.splice(splitString.indexOf('>')+1).join().replace(/[ ,{}]/g, '') + 'N/m';
    label = label.split('').includes('x') ? 'f(x)N/m' : label;
    drawDistForce(distF.distribution, distF.position.x*scaleX + b.x, -distF.position.y + b.y + b.h*0.5, distF.length*scaleX, label);
  }
  
  // Draw moments
  for (let i = 0; i < beam.moments.length; i++) {
    let moment = beam.moments[i];
    drawMoment(moment.position.x*scaleX + b.x, -moment.position.y + b.y + b.h*0.5, moment.magnitude, `${Math.abs(moment.magnitude)}Nm`);
  }
  
  // Shear force graph
  drawFunc(V, canvas.width*0.5, canvas.height * 0.5, b.L);
  
  // Moment graph
  drawFunc(M, canvas.width*0.5, canvas.height - canvas.height*0.167 ,b.L);
  
  function drawDistForce(func, x, y, length, label = '') {
    ctx.save();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.translate(x, y);
    let interval = length*0.25;
    let max = 0;
    
    // Plot
    ctx.beginPath();
    for (let i = 0; i <= length; i++) {
      max = Math.max(max, func(i));
      // Assume beam length in m
      // func(i)/Math.abs(func(i)) is 1 or -1, for finding the direction of the distributed force
      ctx.lineTo(-length*0.5 + i, func(i)*scaleY + func(i)/Math.abs(func(i))*b.h);
    }
    ctx.stroke();
    
    // Distributed arrows
    for (let i = 0; i <= length; i++) {
      if (!(i % interval)) drawVec(-length*0.5 + i, 0, Math.abs(func(i))*scaleY, Math.atan2(func(i), 0));
    }
    
    // Label
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.font = '18px Menlo';
    ctx.translate(0, -max*0.001);
    let textMetrics = ctx.measureText(label);
    let textPos = {
      x: -textMetrics.width*0.5,
      y: +textMetrics.emHeightDescent +b.h
    }
    ctx.strokeText(label, textPos.x, textPos.y);
    ctx.fillText(label, textPos.x, textPos.y);
    ctx.restore();
    
    ctx.restore();
  }
  
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
      x: -textMetrics.width*0.5,
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
    ctx.rotate(-angle*0.5-0.3);
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
    ctx.translate(-b.h, 0); // -b.h is padding
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
    ctx.translate(-magnitude*0.5,0);
    ctx.rotate(rotation);
    ctx.translate(-textMetrics.width-10,-b.h); // -b.h is padding
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
    ctx.moveTo(-length*0.5, -innerHeight*0.25);
    ctx.lineTo(-length*0.5, innerHeight*0.25);
    ctx.moveTo(-length*0.5, 0);
    ctx.lineTo(length*0.5, 0);
    ctx.stroke();
    
    // Plot
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-length*0.5, 0);
    for (let _x = 0; _x <= length; _x++) {
      ctx.lineTo(_x - length * 0.5, -func(_x/scaleX)*scaleY);
    }
    ctx.stroke();
    
    ctx.restore();
  }
  
  // Shear force function
  function V(x) {
    let shearF = 0;
    for (let i = 0; i < beam.forces.normal.length; i++) {
      let force = beam.forces.normal[i];
      if (x >= force.position.x) shearF += force.components.y;
    }
    for (let i = 0; i < beam.forces.distributed.length; i++) {
      let distF = beam.forces.distributed[i];
      let distStart = distF.position.x - distF.length * 0.5;
      
      // Assume distance in m
      if (distStart > x) continue;
      let dx = x - distStart;
      if (dx > distF.length) dx = distF.length;
      shearF += distF.distribution(dx) * dx;
    }
    return shearF;
  }
  
  // Moment function
  function M(x) {
    let moment = 0;
    for (let i = 0; i < beam.forces.normal.length; i++) {
      let f = beam.forces.normal[i];
      let distance = x - f.position.x;
      if (distance < 0) continue;
      moment += f.components.y * distance;
    }
    for (let i = 0; i < beam.forces.distributed.length; i++) {
      let f = beam.forces.distributed[i];
      let start = f.position.x - f.length * 0.5;
      if (x < start) continue;
      
      let dx = x - start;
      if (dx > f.length) dx = f.length;
      let distance = dx * 0.5;
      let end = start + f.length;
      if (x > end) distance += x - end;
      moment += f.distribution(dx) * dx * distance;
    }
    for (let i = 0; i < beam.moments.length; i++) {
      let m = beam.moments[i];
      if (x < m.position.x) continue;
      moment += m.magnitude;
    }
    return moment;
  }
}
}