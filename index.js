import nDronesGenerator from './generators/n-drones-generator.js';
import { weapons } from './constants/weapons.js';
import { chassis, colours, gimbals, scanners, steering, thrusters } from './constants/utilities.js';
import { makeDir } from './utilities.js';
import { colourHex } from './constants/colours.js';

import seedrandom from 'seedrandom';
import path from 'path';
import ObjectsToCsv from 'objects-to-csv';
import text2png from 'text2png';
import sharp from 'sharp';

const getSprite = ({
    colour,
    thruster,
    steering,
    chassis,
}) => {
    const sprite = `c${chassis + 1}_w${steering + 1}_e${thruster + 1}_v1.png`;
    return path.join('out', 'large', colours[colour], sprite);
};

const getNormalisedSum = drone => ({
    weaponNormal: ((1 + drone.weapon) / weapons.length).toFixed(3),
    thrusterNormal: ((1 + drone.thruster) / thrusters.length).toFixed(3),
    steeringNormal: ((1 + drone.steering) / steering.length).toFixed(3),
    chassisNormal: ((1 + drone.chassis) / chassis.length).toFixed(3),
    // colourNormal: ((1 + drone.colour) / colours.length).toFixed(3),
    gimbalNormal: ((1 + drone.gimbal) / gimbals.length).toFixed(3),
    scannerNormal: ((1 + drone.scanner) / scanners.length).toFixed(3),
});

const generateDroneStats = () => {
    const squad = nDronesGenerator(5);

    return squad.map(s => {
        const normals = getNormalisedSum(s);
        const normalValues = Object.values(normals);
        return ({
            ...s,
            weapon: weapons[s.weapon],
            thruster: thrusters[s.thruster],
            steering: steering[s.steering],
            chassis: chassis[s.chassis],
            colour: colours[s.colour],
            gimbal: gimbals[s.gimbal],
            scanner: scanners[s.scanner],
            keys: s,
            normals,
            normalsAverage: (normalValues.reduce((x, v) => x + Number(v), 0) /
                normalValues.length).toFixed(
                3),
        });
    });
};

function getText(drone) {
    return `${drone.weapon}\n${drone.gimbal}\n${drone.scanner}\n${drone.chassis}\n${drone.steering}\n${drone.thruster}`;
}

const generateDroneCards = async(drones, seed) => {
    try {
        let i = 1;
        const distPath = 'dist';
        makeDir(distPath);
        const seedPath = path.join(distPath, seed);
        makeDir(seedPath);
        for(const drone of drones) {
            const outPath = path.join(seedPath, `${i}_drone.png`);
            const cardPath = path.join('sprites', 'cards', `${drone.colour}.png`);
            const sprite = getSprite(drone.keys);
            // const name = await sharp(
            //     text2png(drone.name, {
            //         font: '24px Grafista-Regular',
            //         paddingBottom: 10,
            //         color: colourHex[drone.colour],
            //         localFontPath: './fonts/Grafista-Regular.otf',
            //         localFontName: 'Grafista-Regular',
            //         output: 'buffer',
            //     }),
            // ).toBuffer({resolveWithObject: true});
            // const text = await sharp(
            //     text2png(getText(drone), {
            //         font: '24px Grafista-Regular',
            //         paddingBottom: 10,
            //         lineSpacing: 4,
            //         color: colourHex[drone.colour],
            //         localFontPath: './fonts/Grafista-Regular.otf',
            //         localFontName: 'Grafista-Regular',
            //         output: 'buffer',
            //     }),
            // ).toBuffer({resolveWithObject: true});
            //
            // await sharp(cardPath)
            //     .composite(
            //         [
            //             {
            //                 input: sprite,
            //                 left: 111,
            //                 top: 107,
            //             },
            //             {input: name.data, top: 25, left: 40},
            //             {input: text.data, top: 300, left: 40},
            //         ],
            //     )
            //     .png()
            //     .toFile(path.join(outPath))
            // ;
            i++;
        }
    } catch(e) {
        console.log(e);
    }
};
const allDrones = [];
let allSquads = [];
for(let i = 0; i < 1000; i++) {
    const seed = Math.random();
    seedrandom(seed.toString(), {global: true});
    const drones = generateDroneStats();
    await generateDroneCards(drones, seed.toString());
    allDrones.push(...drones.map(
        d => ({seed: seed.toString(), ...d.keys, value: d.normalsAverage, ...d.normals})));
    allSquads.push({
        seed, value: (drones.reduce((sum, d) => {
            return sum + Number(d.normalsAverage);
        }, 0) / 5).toFixed(3),
    });
}

await new ObjectsToCsv(allDrones).toDisk('./drones.csv');
await new ObjectsToCsv(allSquads).toDisk('./squads.csv');
