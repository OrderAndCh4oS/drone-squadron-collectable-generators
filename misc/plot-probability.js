import pkg from 'nodeplotlib';
import gaussian from './gaussian.js';
const {plot} = pkg;

const n = 5000;
const x = new Array(n).fill().map((_, i) => i);
const y = new Array(n)
    .fill()
    .map(_ => gaussian(0, 1, 0.75)) // Note: Try different skew values to see effect on plot
    .sort((a, b) => a - b);

const data = [{x, y, type: 'line'}];

plot(data);
