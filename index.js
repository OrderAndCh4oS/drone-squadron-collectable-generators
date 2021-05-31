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
import util from 'util';
import { exec } from 'child_process';

const execAsync = util.promisify(exec);

async function copySrc(seed, edition) {
    await execAsync(
        `cd final && cp -R ../src ./${seed} && zip -r ./${edition}_${seed}.zip ./${seed} && rm -rf ./${seed} && cd -`);
}

const playerDronesPath = path.join('src', 'data', 'player-drones');
const finalPath = path.join('final');
makeDir(finalPath);
const srcRootPath = path.join('src');
const csvPath = path.join('csv');
makeDir(csvPath);

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

const generateDroneCards = async(cardOutPath, drones, seed, edition) => {
    try {
        let i = 1;
        for(const drone of drones) {
            const outPath = path.join(playerDronesPath, `${i}_drone.png`);
            const cardPath = path.join('sprites', 'cards', `${drone.colour}.png`);
            const smallOutPath = path.join(cardOutPath, `${i}_drone_small.png`);
            const largeOutPath = path.join(cardOutPath, `${i}_drone_large.png`);
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
            await sharp(outPath).resize(504, 698).toFile(path.join(largeOutPath));
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

const generateThumb = async(cardOutPath, seed, colour, edition) => {
    const backPath = path.join('sprites', 'drone-cards-thumbnail.png');
    const text = await sharp(
        text2png(`Drone Squadron #${pad(edition, 4)}`, {
            font: '52px Grafista-Regular',
            paddingTop: 4,
            paddingBottom: 4,
            paddingLeft: 4,
            paddingRight: 4,
            lineSpacing: 4,
            ...textData(colours[colour]),
        }),
    ).toBuffer({resolveWithObject: true});
    let smallCards = [];
    let largeCards = [];
    for(let i = 1; i <= 6; i++) {
        smallCards.push(path.join(cardOutPath, `${i}_drone_small.png`));
        largeCards.push(path.join(cardOutPath, `${i}_drone_large.png`));
    }
    await sharp(backPath)
        .composite(
            [
                {
                    input: smallCards[0],
                    left: 46,
                    top: 123,
                },
                {
                    input: smallCards[1],
                    left: 361,
                    top: 123,
                },
                {
                    input: smallCards[2],
                    left: 676,
                    top: 123,
                },
                {
                    input: smallCards[3],
                    left: 46,
                    top: 554,
                },
                {
                    input: smallCards[4],
                    left: 361,
                    top: 554,
                },
                {
                    input: smallCards[5],
                    left: 676,
                    top: 554,
                },
                {input: text.data, top: 40, left: 46},
            ],
        )
        .png()
        .toFile(path.join(srcRootPath, 'thumbnail.png'))
    ;
    await sharp(path.join(srcRootPath, 'thumbnail.png'))
        .toFile(path.join(finalPath, `${edition}_thumbnail_${seed}.png`));
    return largeCards;
};

const generateUvMap = async(colour, card, i) => {
    const edge = path.join('sprites', 'uv-map', `${colours[colour]}-edge.png`);
    const back = path.join('sprites', 'uv-map', `${colours[colour]}-back.png`);
    const uvSlots = path.join('sprites', 'uv-map', 'uv-slots.png');
    await sharp(edge)
        .composite(
            [
                {
                    input: card,
                    left: 0,
                    top: 325,
                },
                {
                    input: back,
                    left: 503,
                    top: 325,
                },
                {
                    input: uvSlots,
                    left: 0,
                    top: 0,
                },
            ],
        )
        .png()
        .toFile(path.join(playerDronesPath, `${i + 1}-card-uv.png`))
    ;
};

const makeText = (walletId, seed, squadron, edition) => {
    const title = `Drone Squadron: Elite #${pad(edition, 4)}`;
    const text = `Drones ${squadron.drones.map(d => `${d.name} (${d.value})`)
        .join(
            ', ')} were created by ${walletId} burning OBJKT#103271 with seed ${seed}. By @__orderandchaos.`;
    const tags = `Drone Squadron, Collectible, Cards, Interactive, Random, Generative`;
    return `${title}\n---\n${text}\n---\n${tags}\n`;
};

const makeDiscord = (walletId, seed, squadron, edition) => {
    const title = `Drone Squadron: Elite #${pad(edition, 4)}`;
    const text = `Drones ${squadron.drones.map(d => `${d.name} (${d.value})`)
        .join(', ')}\n\nCreated by ${walletId}\nSeed ${seed}`;
    return `${title}\n---\n${text}\n`;
};

const makeTweet = (walletId, seed, squadron, edition) => {
    const title = `Drone Squadron: Elite #${pad(edition, 4)}`;
    const text = `Drones ${squadron.drones.map(d => `${d.name} (${d.value})`).join(', ')}.`;
    const tags = `#hicetnunc #generative\n#nft #CleanNFT #NFTcollectibles`;
    return `{link}\n\n${title}\n---\n${text}\n\n${tags}\n`;
};

async function generateAllSquadrons(seeds, name, statsOnly = false) {
    const allDrones = [];
    let allSquads = [];
    const cardOutPath = path.join('out', 'cards');
    makeDir(cardOutPath);
    for(let i = 0; i < seeds.length; i++) {
        const seed = seeds[i].seed;
        const walletId = seeds[i].walletId;
        const edition = seeds[i].edition;
        seedrandom(seed, {global: true});
        const dataPath = path.join(playerDronesPath, 'squadron.json');
        const colour = ~~(Math.random() * 6);
        const drones = generateDroneStats(colour);
        if(!statsOnly) {
            await generateDroneCards(cardOutPath, drones, seed, edition);
            const cards = await generateThumb(cardOutPath, seed, colour, edition);
            for(let j = 0; j < cards.length; j++) {
                await generateUvMap(colour, cards[j], j);
            }
        }
        const squadron = createSquadronData(i, seed, drones, colour);
        if(!statsOnly) {
            fs.writeFileSync(dataPath, JSON.stringify(squadron));
            fs.writeFileSync(path.join(finalPath, `${edition}_text_${seed}.txt`),
                makeText(walletId, seed, squadron, edition));
            fs.writeFileSync(path.join(finalPath, `${edition}_tweet_${seed}.txt`),
                makeTweet(walletId, seed, squadron, edition));
            fs.writeFileSync(path.join(finalPath, `${edition}_discord_${seed}.txt`),
                makeDiscord(walletId, seed, squadron, edition));
        }

        allDrones.push(...squadron.drones);
        allSquads.push(squadron);

        await copySrc(seed, edition);
    }
    if(statsOnly) {
        await new ObjectsToCsv(allDrones).toDisk(path.join(csvPath, `drones.csv`), {append: false});
        await new ObjectsToCsv(allSquads).toDisk(path.join(csvPath, `squads.csv`), {append: false});
    }
    fs.writeFileSync(path.join(playerDronesPath, `${name}-queue.js`),
        `const ${name}Queue = ${JSON.stringify(allSquads
            .sort((a, b) => a.value - b.value)
            .map(s => ({id: s.id, seed: s.seed, value: s.value, leader: s.leader})),
        )};
    export default ${name}Queue;`);
}

const testSeeds = [
    // 'onqJ6Pvfz8E4EmTqduZpZfkHaJiLgh1p6cPZjFrTHXekPDhYRJY',
    // 'onzFv4cfbhxoPTyjuoDpFNDntMMyR9ThS3M6sfqKN2juA9PydVo',
    // 'oof5rYYLysjmJMsJzzXzgfkezbmuUEKbyVPqw1G1vTB3ruM6Dtt',
    // 'oovWusjQiHBKkhxGs7UWN1Zn5W4NEe3aouSMTAWmrg2QAtE9BKA',
    // 'opKR1NhYtnJisgKtKbdAMdP2WT2Gx2rTq6AHGRZ2gRvnbvjkbBh',
    // 'onu23dvFM5yaYfi58W6aEvdkSazSx25dDifJVznayT5dPv1CnMp',
    // 'ooxWRw7uFkitKGCAyxThN6suLPKCv2jWsfEKghQa2ZiHLR7eyb4',
    // 'opX4ZYt4Ve858M1mQoaFT647SRSJqj2MJ2GsPMn7yiXKfd172GV',
    // 'ooD3c2Xg2dZxwyqbNwQRuaA6u5eGzZsysPw18oAiwGZ5GqEjAYe',
    // 'oo4BdW1hAcN9TNcM2fAo3EsB6km7tLF58NVibKQGYGQrwduphfj',
];

const allSeeds = [
    {
        seed: 'ooU8CrAGL3ASBUMaAhfB3R9a5T3m4V6TEVVDzmiYoMmCGXwvhJo',
        walletId: 'tz1UZGPJtRLsNyYUuYyQU9DSepSF13XxYxFk',
        edition: 1,
    },
    {
        seed: 'ooa8PHz6zA8toZ4FBac7H972oupjbSpq8SQGFTaMuDL3dXQb2q7',
        walletId: 'tz1fhd4k1jSJRRcNVbkMwVzkKEhX3kzApsfk',
        edition: 2,
    },
    {
        seed: 'opW8eZwer244UHaYBtPNEWz6LLNfrpyjZNcu9GTJMHuHqEb7SL1',
        walletId: 'tz1ZTDCfahwoYqF6sJmxTmbtGDskPoAateJX',
        edition: 3,
    },
    {
        seed: 'oneZnunCguSKwZMeN7TKmvsxQ1ZzyeHojuiQsSJycFnfEkrWbuj',
        walletId: 'tz2K1rDmszPuzVQYUcyDFxeSm7ZEJdDvhXx4',
        edition: 4,
    },
    {
        seed: 'opaWJPFcyqQUpk2JdUaG3ry8C5gkJHMo97PSS6tZFk9Skrcidfg',
        walletId: 'tz1KseWbS7f7YQhGsGP8QmXDJyzrKV71xxyj',
        edition: 5,
    },
    {
        seed: 'oobGxJDksDQZqGkcHcVRajzmAu8DDoEix7i2fXBchdAAh5XAdsp',
        walletId: 'tz1Xxc5xZmEaz8xJ8STdBZ9CXHHxTsA6eyFT',
        edition: 6,
    },
    {
        seed: 'opCby8nsd2jxF3SFrjVMUfdenNMP3dVEF1mvLvi3rCr5saUErNp',
        walletId: 'tz1TSWEDs9wcBx2KiRzVzyzECsNpRiZaLJ1D',
        edition: 7,
    },
    {
        seed: 'opD9PnSLY9b5Eqe1r5cNAFVGA3Xt1FXviQArnZ3Z7AzN9qdrFoV',
        walletId: 'tz1NKHjwrYfg7GWwbWZ3bvdejkVL34De72Pz',
        edition: 8,
    },
    {
        seed: 'oo3o7GRmekzo153w2zLN9TyMZsTUJEiBrwkKuNE2em85f6unFEP',
        walletId: 'tz1cbhmVZuFTKHcACSFpg5ER1bGVGkanhrbW',
        edition: 9,
    },
    {
        seed: 'onzFVkvDf5feHKrvY1fwga3vr9YTAcUdb2aJYwuHfuGCRnZiRBH',
        walletId: 'tz1WRVgKHfkZvuEymYgHTFZ9ck5wNBQ4GQzC',
        edition: 10,
    },
    {
        seed: 'oomLi3xMVkV3ZpZBQHwoK1yN2ayBuRpQRsLU7Y98sXukQ89QKD6',
        walletId: 'tz1TVa5tuFYt1wnUL2EZoZ5qknWLPhYrrGMa',
        edition: 11,
    },
    {
        seed: 'op7CfeSWtZvHut2H33D18TRkxJXywSiGRYPeHBUTc8pwoJUpipM',
        walletId: 'tz1RJaJXwrqyjUtWyXqcybX77yUKHj8j3oyL',
        edition: 12,
    },
    {
        seed: 'onktvWNLMWiTYsDtAze9z2NzGoTRuu98homJGvLgceygE14TLqG',
        walletId: 'tz1aRPbvjrtvt7wC9352giq3LhWpH3s8NoBv',
        edition: 13,
    },
    {
        seed: 'ooE6Te1Cuh9Q9NPv4W5aJURRcWoNYjf9JUNDvVKLw8s8nJRakoK',
        walletId: 'tz1Y9XuoJJqQgNxVVesix1RLvn2k94JxD92Q',
        edition: 14,
    },
    {
        seed: 'ooE6Te1Cuh9Q9NPv4W5aJURRcWoNYjf9JUNDvVKLw8s8nJRakoK_2',
        walletId: 'tz1Y9XuoJJqQgNxVVesix1RLvn2k94JxD92Q',
        edition: 15,
    },
    {
        seed: 'onhzEL2sG9hWM5y1YhMQroSicBWiMSqFsD76MtTRiqeq283JyLZ',
        walletId: 'tz1g7Aaac9ssD7cDUTngyXyx8QiVUsAVZCjQ',
        edition: 16,
    },
    {
        seed: 'oowZsif3iKoLjRrrcBRShhbb7YusonukjSKA3n5EMaJNrrVSc2v',
        walletId: 'tz1gsrd3CfZv4BfPnYKq5pKpHGFVdtGCgd71',
        edition: 17,
    },
    {
        seed: 'opFcVfcjDULwYFXyF6f5fDq5jtuhw4vz2bNYn9EEhJ9h5SaNgNt',
        walletId: 'tz1PB9bzCecPNF9Tp6Gy6KunwxxFA7wqJ4E6',
        edition: 18,
    },
];

const currentSeeds = [];

const distPath = 'dist';
makeDir(distPath);

await generateAllSquadrons(currentSeeds, 'player', false);
// Note: Stats Only
// await generateAllSquadrons(allSeeds, 'player', true);
// Note: Enemies
// await generateAllSquadrons(new Array(100).fill().map(() => uuidv4()), path.join(distPath, 'enemy-drones'), 'enemy');
