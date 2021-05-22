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
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

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
    gimbalNormal: ((1 + drone.gimbal) / gimbals.length).toFixed(3),
    scannerNormal: ((1 + drone.scanner) / scanners.length).toFixed(3),
});

function getNormalsAverage(normalValues) {
    return (normalValues.reduce((x, v) => x + Number(v), 0) / normalValues.length).toFixed(3);
}

const generateDroneStats = (colour) => {
    const squad = nDronesGenerator(6, colour);

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
            normalsAverage: getNormalsAverage(normalValues),
        });
    });
};

function getText(drone) {
    return `${drone.weapon}\n${drone.gimbal}\n${drone.scanner}\n${drone.chassis}\n${drone.steering}\n${drone.thruster}`;
}

const pad = (n, width, unit) => {
    unit = unit || '0';
    n = n + '';
    return n.length >= width ? n : new Array(width - n.length + 1).join(unit) + n;
};

const textData = (colour) => ({
    color: colourHex[colour],
    localFontPath: './fonts/Grafista-Regular.otf',
    localFontName: 'Grafista-Regular',
    output: 'buffer',
});

const generateDroneCards = async(seedPath, smallCardPath, drones, seed, edition) => {
    try {
        let i = 1;
        for(const drone of drones) {
            const outPath = path.join(seedPath, `${i}_drone.png`);
            const cardPath = path.join('sprites', 'cards', `${drone.colour}.png`);
            const smallOutPath = path.join(smallCardPath, `${i}_drone_small.png`);
            const sprite = getSprite(drone.keys);
            const value = await sharp(
                text2png(drone.normalsAverage, {
                    font: '16px Grafista-Regular',
                    paddingLeft: 8,
                    paddingRight: 8,
                    paddingBottom: 8,
                    paddingTop: 8,
                    textAlign: 'right',
                    ...textData(drone.colour),
                }),
            ).rotate(90).toBuffer({resolveWithObject: true});
            const editionText = await sharp(
                text2png(`#${pad(edition, 4)}`, {
                    font: '19px Grafista-Regular',
                    paddingLeft: 8,
                    paddingRight: 8,
                    paddingBottom: 8,
                    paddingTop: 8,
                    textAlign: 'right',
                    ...textData(drone.colour),
                }),
            ).rotate(90).toBuffer({resolveWithObject: true});
            const name = await sharp(
                text2png(drone.name, {
                    font: '24px Grafista-Regular',
                    paddingBottom: 10,
                    ...textData(drone.colour),
                }),
            ).toBuffer({resolveWithObject: true});
            const text = await sharp(
                text2png(getText(drone), {
                    font: '24px Grafista-Regular',
                    paddingBottom: 10,
                    lineSpacing: 4,
                    ...textData(drone.colour),
                }),
            ).toBuffer({resolveWithObject: true});

            const seedText = await sharp(
                text2png(seed, {
                    font: '10px Grafista-Regular',
                    paddingBottom: 10,
                    lineSpacing: 4,
                    ...textData(drone.colour),
                }),
            ).toBuffer({resolveWithObject: true});
            await sharp(cardPath)
                .composite(
                    [
                        {
                            input: sprite,
                            left: 111,
                            top: 107,
                        },
                        {input: name.data, top: 28, left: 30},
                        {input: text.data, top: 295, left: 30},
                        {input: value.data, top: 10, left: 320},
                        {input: editionText.data, top: 420, left: 310},
                        {input: seedText.data, top: 465, left: 20},
                    ],
                )
                .png().toFile(path.join(outPath));
            await sharp(outPath).resize(302, 418).toFile(path.join(smallOutPath));
            i++;
        }
    } catch(e) {
        console.log(e);
    }
};

const createSquadronData = (i, seed, drones, colour) => ({
    id: i,
    seed,
    leader: drones.sort((a, b) => b.normalsAverage - a.normalsAverage)[0].name,
    colour,
    value: (drones.reduce((sum, d) => {return sum + Number(d.normalsAverage);}, 0) /
        5).toFixed(
        3),
    drones: drones.map(
        (d) => ({seed: seed.toString(), ...d.keys, value: d.normalsAverage, ...d.normals})),
});

const generateThumb = async(seedPath, smallCardPath, seed, colour, number) => {
    const backPath = path.join('sprites', 'drone-cards-thumbnail.png');
    const text = await sharp(
        text2png(`Drone Squadron #${pad(number, 4)}`, {
            font: '52px Grafista-Regular',
            paddingTop: 4,
            paddingBottom: 4,
            paddingLeft: 4,
            paddingRight: 4,
            lineSpacing: 4,
            ...textData(colours[colour]),
        }),
    ).toBuffer({resolveWithObject: true});
    let cards = [];
    for(let i = 1; i <= 6; i++) {
        cards.push(path.join(smallCardPath, `${i}_drone_small.png`));
    }
    await sharp(backPath)
        .composite(
            [
                {
                    input: cards[0],
                    left: 46,
                    top: 123,
                },
                {
                    input: cards[1],
                    left: 361,
                    top: 123,
                },
                {
                    input: cards[2],
                    left: 676,
                    top: 123,
                },
                {
                    input: cards[3],
                    left: 46,
                    top: 554,
                },
                {
                    input: cards[4],
                    left: 361,
                    top: 554,
                },
                {
                    input: cards[5],
                    left: 676,
                    top: 554,
                },
                {input: text.data, top: 40, left: 46},
            ],
        )
        .png()
        .toFile(path.join(seedPath, 'thumbnail.png'))
    ;
};

async function generateAllSquadrons(seeds, outPath, name) {
    const allDrones = [];
    let allSquads = [];
    const distPath = outPath;
    makeDir(distPath);
    const smallCardPath = path.join('out', 'cards');
    makeDir(smallCardPath);

    for(let i = 0; i < seeds.length; i++) {
        const seed = seeds[i];
        seedrandom(seed, {global: true});
        const seedPath = path.join(distPath, `${i}_${seed}`);
        if(fs.existsSync(seedPath)) continue;
        fs.mkdirSync(seedPath);
        const dataPath = path.join(seedPath, 'squadron.json');
        const colour = ~~(Math.random() * 6);
        const drones = generateDroneStats(colour);
        await generateDroneCards(seedPath, smallCardPath, drones, seed, i + 1);
        await generateThumb(seedPath, smallCardPath, seed, colour, i + 1);
        const squadron = createSquadronData(i, seed, drones, colour);
        fs.writeFileSync(dataPath, JSON.stringify(squadron));
        allDrones.push(...squadron.drones);
        allSquads.push(squadron);
    }

    await new ObjectsToCsv(allDrones).toDisk(path.join(distPath, 'drones.csv'));
    await new ObjectsToCsv(allSquads).toDisk(path.join(distPath, 'squads.csv'));
    fs.writeFileSync(path.join(distPath, `${name}-queue.js`), `const ${name}Queue = ${JSON.stringify(allSquads
        .sort((a, b) => a.value - b.value)
        .map(s => ({id: s.id, seed: s.seed, value: s.value, leader: s.leader}))
    )};
    export default ${name}Queue;`);
}

const seeds = [
    'ooiv5T9KCamR6KTkRTcHQ2GspoML7w4D1XfWzbjNnd24cF6BWYB',
    'onzFv4cfbhxoPTyjuoDpFNDntMMyR9ThS3M6sfqKN2juA9PydVo',
    'oof5rYYLysjmJMsJzzXzgfkezbmuUEKbyVPqw1G1vTB3ruM6Dtt',
    'oovWusjQiHBKkhxGs7UWN1Zn5W4NEe3aouSMTAWmrg2QAtE9BKA',
    'opKR1NhYtnJisgKtKbdAMdP2WT2Gx2rTq6AHGRZ2gRvnbvjkbBh',
    'onu23dvFM5yaYfi58W6aEvdkSazSx25dDifJVznayT5dPv1CnMp',
    'ooxWRw7uFkitKGCAyxThN6suLPKCv2jWsfEKghQa2ZiHLR7eyb4',
    'opX4ZYt4Ve858M1mQoaFT647SRSJqj2MJ2GsPMn7yiXKfd172GV',
    'ooD3c2Xg2dZxwyqbNwQRuaA6u5eGzZsysPw18oAiwGZ5GqEjAYe',
    'oo4BdW1hAcN9TNcM2fAo3EsB6km7tLF58NVibKQGYGQrwduphfj',
];

const distPath = 'dist';
makeDir(distPath);

await generateAllSquadrons(seeds, path.join(distPath, 'player-drones'), 'player');
await generateAllSquadrons(new Array(100).fill().map(() => uuidv4()), path.join(distPath, 'enemy-drones'), 'enemy');
