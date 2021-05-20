import droneGenerator from './drone-generator.js';

const nDronesGenerator = (n, colour) => {
    return new Array(n).fill().map(_ => droneGenerator(colour));
};

export default nDronesGenerator;
