import nameGenerator from './name-generator.js';
import gaussian from '../gaussian.js';
import matrix from './generator-matrix.js';

const droneGenerator = (colour) => {
    let skew = 1;
    const skewMod = Math.random();
    if(skewMod > 0.80) skew += 0.75;
    if(skewMod > 0.90) skew += 0.75;
    if(skewMod > 0.95) skew += 1;
    if(skewMod > 0.98) skew += 1.5;
    if(skewMod > 0.99) skew += 0.5;
    const set = matrix[~~(gaussian(0, 1, skew) * matrix.length)];
    return ({
        name: nameGenerator(),
        weapon: set[0],
        gimbal: set[1],
        steering: set[2],
        thruster: set[3],
        chassis: set[4],
        scanner: set[5],
        colour,
    });
};

export default droneGenerator;
