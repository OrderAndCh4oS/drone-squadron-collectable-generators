import nDronesGenerator from './generators/n-drones-generator.js';
import { weapons } from './constants/weapons.js';
import { chassis, colours, gimbals, scanners, steering, thrusters } from './constants/utilities.js';

import seedrandom from 'seedrandom';
import sharp from 'sharp';
import text2png from 'text2png';
import path from 'path';

const seed = 'ooiv5T9KCamR6KTkRTcHQ2GspoML7w4D1XfWzbjNnd24cF6BWYB';
seedrandom(seed, {global: true});

const getSprite = ({
    colour,
    thruster,
    steering,
    chassis,
}) => {
    const sprite = `c${chassis}_w${steering}_e${thruster}_v1.png`;
    return path.join('out', 'large', colours[colour], sprite);
};

const generateDroneStats = () => {
    const squad = nDronesGenerator(5);

    return squad.map(s => {
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
        });
    });
};

const generateDroneCards = async(drones, seed) => {
    try {
        let i = 1;
        for(const drone of drones) {
            const outPath = path.join('dist', `${i}_drone.png`);
            const cardPath = path.join('sprites', 'cards', `${drone.colour}.png`);
            const sprite = getSprite(drone.keys);
            console.log(cardPath);
            console.log(sprite);
            const text = await sharp(
                text2png(Math.round((Math.random() * 150000)).toLocaleString("en-US") + ".00", {
                    font: '18px Grafista-Regular',
                    localFontPath: './fonts/Grafista-Regular.otf',
                    localFontName: 'Grafista-Regular',
                    output: 'buffer'
                })
            ).toBuffer({ resolveWithObject: true });

            await sharp(cardPath)
                .composite(
                    [
                        {
                            input: sprite,
                            left: 111,
                            top: 107
                        },
                        { input: text.data, top: 10, left: 10 },
                    ],
                )
                .png()
                .toFile(path.join(outPath))
            ;
            i++;
        }
    } catch(e) {
        console.log(e);
    }
};

const drones = generateDroneStats();
console.log(drones);
generateDroneCards(drones, seed);
