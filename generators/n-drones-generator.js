import droneGenerator from './drone-generator.js';

const nDronesGenerator = (n) => {
    const colour = ~~(Math.random() * 6);
    return new Array(n).fill().map(_ => droneGenerator(colour));
};

export default nDronesGenerator;
