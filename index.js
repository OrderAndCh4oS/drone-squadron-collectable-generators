import nDronesGenerator from './generators/n-drones-generator.js';
import { weapons } from './constants/weapons.js';
import { chassis, colours, gimbals, scanners, steering, thrusters } from './constants/utilities.js';
import { makeDir } from './misc/utilities.js';
import { colourHex } from './constants/colours.js';

import seedrandom from 'seedrandom';
import path from 'path';
import ObjectsToCsv from 'objects-to-csv';
import text2png from 'text2png';
import sharp from 'sharp';
import fs from 'fs';
import util from 'util';
import { exec } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

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

const makeTweet = (walletId, seed, squadron, edition) => {
    const title = `Drone Squadron: Elite #${pad(edition, 4)}`;
    const text = `Drones ${squadron.drones.map(d => `${d.name} (${d.value})`).join(', ')}.`;
    const burnLink = `Burn Token: https://hic.link/103271`;
    const tags = `#hicetnunc #generative\n#nft #CleanNFT #NFTcollectibles`;
    return `{link}\n\n${title}\n---\n${text}\n\n${burnLink}\n\n${tags}\n`;
};

async function generateAllSquadrons(seeds) {
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
        await generateDroneCards(cardOutPath, drones, seed, edition);
        const cards = await generateThumb(cardOutPath, seed, colour, edition);
        for(let j = 0; j < cards.length; j++) {
            await generateUvMap(colour, cards[j], j);
        }
        const squadron = createSquadronData(i, seed, drones, colour);
        fs.writeFileSync(dataPath, JSON.stringify(squadron));
        fs.writeFileSync(path.join(finalPath, `${edition}_squadron_${seed}.json`),
            JSON.stringify(squadron));
        fs.writeFileSync(path.join(finalPath, `${edition}_text_${seed}.txt`),
            makeText(walletId, seed, squadron, edition));
        fs.writeFileSync(path.join(finalPath, `${edition}_tweet_${seed}.txt`),
            makeTweet(walletId, seed, squadron, edition));

        await copySrc(seed, edition);
    }
    // fs.writeFileSync(path.join(playerDronesPath, `${name}-queue.js`),
    //     `const ${name}Queue = ${JSON.stringify(allSquads
    //         .sort((a, b) => a.value - b.value)
    //         .map(s => ({id: s.id, seed: s.seed, value: s.value, leader: s.leader})),
    //     )};
    // export default ${name}Queue;`);
}

async function generateEnemySquadronData(n) {
    const enemyDronesPath = path.join('dist', 'enemy-drones');
    const enemies = [];
    for(let i = 0; i < n; i++) {
        const seed = uuidv4();
        seedrandom(seed, {global: true});
        const colour = ~~(Math.random() * 6);
        const drones = generateDroneStats(colour);
        const squadron = createSquadronData(i, seed, drones, colour);
        enemies.push(squadron);
        fs.writeFileSync(path.join(enemyDronesPath, `${seed}.json`), JSON.stringify(squadron));
    }
    fs.writeFileSync(path.join(enemyDronesPath, `enemy-queue.js`),
        `const enemyQueue = ${JSON.stringify(enemies
            .sort((a, b) => a.value - b.value)
            .map(s => ({id: s.id, seed: s.seed, value: s.value, leader: s.leader})),
        )};
    export default enemyQueue;`);
}

async function generateStats(seeds) {
    const allDrones = [];
    let allSquads = [];
    const cardOutPath = path.join('out', 'cards');
    makeDir(cardOutPath);
    for(let i = 0; i < seeds.length; i++) {
        const seed = seeds[i].seed;
        const edition = seeds[i].edition;
        seedrandom(seed, {global: true});
        const colour = ~~(Math.random() * 6);
        const drones = generateDroneStats(colour);
        const squadron = createSquadronData(i, seed, drones, colour);
        fs.writeFileSync(path.join(finalPath, `${edition}_squadron_${seed}.json`),
            JSON.stringify(squadron));
        allDrones.push(...squadron.drones);
        allSquads.push(squadron);
    }
    await new ObjectsToCsv(allDrones).toDisk(path.join(csvPath, `drones.csv`), {append: false});
    await new ObjectsToCsv(allSquads).toDisk(path.join(csvPath, `squads.csv`), {append: false});
}

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
    {
        seed: 'onoYGs95ASAShzKK4Gg2fr2RZrton1dU2a1qHB84ajwXGCX1tEP',
        walletId: 'tz1Vkoqo2ZQsVXBniYJDfX6F2NMfH5RoEuGn',
        edition: 19,
    },
    {
        seed: 'onnuFbYfVE8V8rrpJA6dsnNVNx5khtpGSH9AG65PZJQELa1HSKY',
        walletId: 'tz1PXmUnJDh9zPKQxZLtSZ11DZbPki6XmWfP',
        edition: 20,
    },
    {
        seed: 'ooBfZ7jw2GBy9tLn7LgJSR4aDJzBK6gRSD1TFm7uSaB3HzfT6ck',
        walletId: 'tz1d4zP1ZbzvXo9nzGVADieAYRyTLJzFvPvW',
        edition: 21,
    },
    {
        seed: 'onkaoQYDQbCTyXsPZn6inqEvuG9CGCkgcpRTPXmzEsTT7KzgUdZ',
        walletId: 'tz1WRVgKHfkZvuEymYgHTFZ9ck5wNBQ4GQzC',
        edition: 22,
    },
    {
        seed: 'oo1xZYiujpCp11QpiTeoP9u1qmNesJEkSsQrDu6QWKe4n4GJDQh',
        walletId: 'tz1TVa5tuFYt1wnUL2EZoZ5qknWLPhYrrGMa',
        edition: 23,
    },
    {
        seed: 'opCYMAzpWkYsNCzGHeDfSRzeyyctFNCqNzTUkJiLEtNGqyJHgdH',
        walletId: 'tz1KmM4DjPbXUG7FkZDsLFLeK5kHUKUNrto3',
        edition: 24,
    },
    {
        seed: 'op7i9ffN57Y73WpbpsoFUkNYn9V95VQCBd3WL76gxREArAnhFfH',
        walletId: 'tz1TtUyR5URy2rGZS9pV8JT8TuhixiEPf3xF',
        edition: 25,
    },
    {
        seed: 'ooucvC42egb4B3UjoUUmVJvssbcUfpzwwKXU7c9VxfBrh4KTTL9',
        walletId: 'tz1d4zP1ZbzvXo9nzGVADieAYRyTLJzFvPvW',
        edition: 26,
    },
    {
        seed: 'ookH7Yy279PWSuC6ZuUQvgFA6e76Kmub2mFHMg7CHZTP3CoA5y7',
        walletId: 'tz1QpvURES6sBsL6gGh4aeBRtw6ShcAjYj6u',
        edition: 27,
    },
    {
        seed: 'ooKNGBWRhtqpBY6SBhAwNFShusmoAi5uZ9txc9jJMzbkvzfqF9M',
        walletId: 'tz1QWFRpbN4rA8vABvxPAREtuffu6F1VKFTB',
        edition: 28,
    },
    {
        seed: 'op46GHGnfhoWpK4JDqPqxX35EV22T6bawRobxX6CcirnFfKKvED',
        walletId: 'tz1ehhHuAQXrdXukswG2PP7TnptsEfHDxbZK',
        edition: 29,
    },
    {
        seed: 'opDVjVpVF2zmhLK1BRca3MLgM3CcRodrVGmMe7sg8iB2ENFWYcM',
        walletId: 'tz1M348mq4NQsN56yGhFtLo66LDRHD9WjHSu',
        edition: 30,
    },
    {
        seed: 'ooqzMn5bPFMXF1f6ymaxDnXUcQMhU4v6mLc6gv38pFrYeDcRysC',
        walletId: 'tz1Tp2oAMsVSbYvvvuAP9sdFsuXd5Q414WJU',
        edition: 31,
    },
    {
        seed: 'opRSNtzQERYoZhr5CUSBXQMZKYogcDNStFGAGqmmShR4z2JGMYq',
        walletId: 'tz1fhd4k1jSJRRcNVbkMwVzkKEhX3kzApsfk',
        edition: 32,
    },
    {
        seed: 'op2CZQuAxuxhACnF9AbC9YeYgrQcuSqJ1c2wLFHWdv1vPWwbsre',
        walletId: 'tz1QETJtQrvb1YrqKNNS2T1rdVuNa6Y7s7iS',
        edition: 33,
    },
    {
        seed: 'opMxvqtjzVxUMC5mfUxtHFwCXouUPpKYXVGEf3BxYyPYUQT6768',
        walletId: 'tz1YJvMiZyXnzvV9pxtAiuCFvaG7XoBZhbUQ',
        edition: 34,
    },
    {
        seed: 'ooRDCkJWtXjwB8JE926SFUeNVbhPuyREK14VhzFKG6dTKJoLUov',
        walletId: 'tz1RNaWaAuZjWxmdFzm28pVBgf3bhMcfTN8R',
        edition: 35,
    },
    {
        seed: 'oooxtAk9s4PWy3iGarc59oD92sxVw1KCxFW7mZEWZXoQu95b97x',
        walletId: 'tz1MfuHgpyDBmwbYRJjjBGyKGZgFBPLyEVWd',
        edition: 36,
    },
    {
        seed: 'op9hpFDRDtAnAk8VkWk2pPaXLiSaY86qJpfab74ZVwP1UFNT3Jm',
        walletId: 'tz1MsrdFYZfY5SJynGCjBCgsLeR3aVRMitTn',
        edition: 37,
    },
    {
        seed: 'ooRDCkJWtXjwB8JE926SFUeNVbhPuyREK14VhzFKG6dTKJoLUov',
        walletId: 'tz1RNaWaAuZjWxmdFzm28pVBgf3bhMcfTN8R',
        edition: 35,
    },
    {
        seed: 'oooxtAk9s4PWy3iGarc59oD92sxVw1KCxFW7mZEWZXoQu95b97x',
        walletId: 'tz1MfuHgpyDBmwbYRJjjBGyKGZgFBPLyEVWd',
        edition: 36,
    },
    {
        seed: 'op9hpFDRDtAnAk8VkWk2pPaXLiSaY86qJpfab74ZVwP1UFNT3Jm',
        walletId: 'tz1MsrdFYZfY5SJynGCjBCgsLeR3aVRMitTn',
        edition: 37,
    },
    {
        seed: 'onoaiH49xwNVM77M7AGggaHUPcjE6gtf3K6Fr2ukkeYgSzvHwmF',
        walletId: 'tz1h7sQhBdKfiiAYXvtTFNPocFG92b47K94Y',
        edition: 38,
    },
    {
        seed: 'oozhTEiGs2NHNNW3fsv6s8vqYjKeQK1ySu7eqSJ49JY6wbRX952',
        walletId: 'tz1i5uekB9LeMyJFZKbMD4PkKwSJHpcXVrBJ',
        edition: 39,
    },
    {
        seed: 'oozhTEiGs2NHNNW3fsv6s8vqYjKeQK1ySu7eqSJ49JY6wbRX952_2',
        walletId: 'tz1i5uekB9LeMyJFZKbMD4PkKwSJHpcXVrBJ',
        edition: 40,
    },
    {
        seed: 'oozhTEiGs2NHNNW3fsv6s8vqYjKeQK1ySu7eqSJ49JY6wbRX952_3',
        walletId: 'tz1i5uekB9LeMyJFZKbMD4PkKwSJHpcXVrBJ',
        edition: 41,
    },
    {
        seed: 'ooR8jK8UAceE6MKoXBDfmbym6kZtBfETqaMwTrpYBQWfiA6Kh2N',
        walletId: 'tz1eXhtT4wrw6RYciuTatNPMNE2ZRjySCJTL',
        edition: 42,
    },
    {
        seed: 'op7r3jjBvuUJCXKxY35SkgrdJewi5craNpLXwF865A3icaNdGRC',
        walletId: 'tz1eXhtT4wrw6RYciuTatNPMNE2ZRjySCJTL',
        edition: 43,
    },
    {
        seed: 'opWrvQC396L7k8N1Pj8PboUtDd9k6shtJNJmtuyY5U8uKg8edHT',
        walletId: 'tz1eXhtT4wrw6RYciuTatNPMNE2ZRjySCJTL',
        edition: 44,
    },
    {
        seed: 'onofUNa1XAeDGbw3d84x97xQZ9ypUWPtfuaif5RDCdVng1KgXKV',
        walletId: 'tz1eXhtT4wrw6RYciuTatNPMNE2ZRjySCJTL',
        edition: 45,
    },
    {
        seed: 'opVFRcGfRz84oQ8aJNNBs6qFsrY48j8LKkSxncwfyidmUJ4h9b6',
        walletId: 'tz1QWFRpbN4rA8vABvxPAREtuffu6F1VKFTB',
        edition: 46,
    },
    {
        seed: 'opVFRcGfRz84oQ8aJNNBs6qFsrY48j8LKkSxncwfyidmUJ4h9b6_2',
        walletId: 'tz1QWFRpbN4rA8vABvxPAREtuffu6F1VKFTB',
        edition: 47,
    },
    {
        seed: 'oneTCoDq5bu5mgcAzVZg3Ya6s66U8egJZ3DFYvjkFE7FzSPUwTh',
        walletId: 'tz1VP6GUGdHdjCLzVFqRjBwsie3uw5UM4D1p',
        edition: 48,
    },
    {
        seed: 'ookrw5TZNKfYa96EiSnHB3mnYMt2M6YabhC4PJ27MjBcanZrBoZ',
        walletId: 'tz1VP6GUGdHdjCLzVFqRjBwsie3uw5UM4D1p',
        edition: 49,
    },
    {
        seed: 'ooTswNdbyrjHZQ8BbzB4Y465jCbkeqcGkd3Fie2veLBD2stsbE5',
        walletId: 'tz1VP6GUGdHdjCLzVFqRjBwsie3uw5UM4D1p',
        edition: 50,
    },
    {
        seed: 'opUwpPjamEe5D1TgBQcptRNLcRKoQwNJbvwjHm97jSigJayDHbv',
        walletId: 'tz1N5LxqGVNxim9F9hVAciPGqxNjqscL1eUL',
        edition: 51,
    },
    {
        seed: 'opUwpPjamEe5D1TgBQcptRNLcRKoQwNJbvwjHm97jSigJayDHbv_2',
        walletId: 'tz1N5LxqGVNxim9F9hVAciPGqxNjqscL1eUL',
        edition: 52,
    },
    {
        seed: 'opUwpPjamEe5D1TgBQcptRNLcRKoQwNJbvwjHm97jSigJayDHbv_3',
        walletId: 'tz1N5LxqGVNxim9F9hVAciPGqxNjqscL1eUL',
        edition: 53,
    },
    {
        seed: 'oodUa4mqJgEavWh8cztcL9DztguWmBdXm6fALHDEftFteNBqnjC',
        walletId: 'tz1VjQwV2YrNchNz2CtCHaM6VhkyKXeiujmz',
        edition: 54,
    },
    {
        seed: 'oodUa4mqJgEavWh8cztcL9DztguWmBdXm6fALHDEftFteNBqnjC_2',
        walletId: 'tz1VjQwV2YrNchNz2CtCHaM6VhkyKXeiujmz',
        edition: 55,
    },
    {
        seed: 'ooiQEnSBj3Y7ULvXK9hmTp1ZSU8pUHeDRg1EME4iHFzPR1Qntd9',
        walletId: 'tz1VjaaBTjSEywNDdtHyQsdPKquDxKMwkmWp',
        edition: 56,
    },
    {
        seed: 'oofazm4ha4yz36mdKnL5D8WSbgAooSynyYf2gm46pCpGXuWZ9Vx',
        walletId: 'tz1bgkctNuMBKKkmqdw1NVTKChv5Sewb5t9y',
        edition: 57,
    },
    {
        seed: 'ooCBsk4fBnAiUGBH7yn69nYUvNKqoHfWvk7DxzUttYF9Y1rMqWK',
        walletId: 'tz1VdW8kSNjausgiMw19ZECcB2Gn4pEtxH9w',
        edition: 58,
    },
    {
        seed: 'oo5gE2wtQn22VH4tJxNgGFwGoizt1G2qEUXMnfRhZDUUsHGE1Xk',
        walletId: 'tz1VjQwV2YrNchNz2CtCHaM6VhkyKXeiujmz',
        edition: 59,
    },
    {
        seed: 'oo5gE2wtQn22VH4tJxNgGFwGoizt1G2qEUXMnfRhZDUUsHGE1Xk_2',
        walletId: 'tz1VjQwV2YrNchNz2CtCHaM6VhkyKXeiujmz',
        edition: 60,
    },
    {
        seed: 'oo5gE2wtQn22VH4tJxNgGFwGoizt1G2qEUXMnfRhZDUUsHGE1Xk_3',
        walletId: 'tz1VjQwV2YrNchNz2CtCHaM6VhkyKXeiujmz',
        edition: 61,
    },
    {
        seed: 'ooe12bY28vXxjgsJ9BfHtAxPG9MMDA2H6zuPHFXbg5AAL9Pviu2',
        walletId: 'tz2LjW2Zw6VY8G5aaH7JUBN4XdYSF3mKqGh8',
        edition: 62,
    },
    {
        seed: 'op5osbkMxU2cjHFh2F8nTk7b5v4KhXdYfUoSdCA6vW98tHbVRP9',
        walletId: 'tz1i5uekB9LeMyJFZKbMD4PkKwSJHpcXVrBJ',
        edition: 63,
    },
    {
        seed: 'op5osbkMxU2cjHFh2F8nTk7b5v4KhXdYfUoSdCA6vW98tHbVRP9_2',
        walletId: 'tz1i5uekB9LeMyJFZKbMD4PkKwSJHpcXVrBJ',
        edition: 64,
    },
    {
        seed: 'op5osbkMxU2cjHFh2F8nTk7b5v4KhXdYfUoSdCA6vW98tHbVRP9_3',
        walletId: 'tz1i5uekB9LeMyJFZKbMD4PkKwSJHpcXVrBJ',
        edition: 65,
    },
    {
        seed: 'ooXXsQgkjUaQz8TgXU4MxR57dVrmY6eR4UEYpAfFMcckKSbxbZv',
        walletId: 'tz1iaGYzLKTnatyN7UjimbKfYdUEwiG9xKM5',
        edition: 66,
    },
    {
        seed: 'ooWz7iE2D8MBYnVMUX5JPfbRyPrsyTXskyM3aVv5HkDda8ytPdT',
        walletId: 'tz29tCQDFw8KwaMaBuroze6Sv2qd47nnP5Hv',
        edition: 67,
    },
    {
        seed: 'ooWz7iE2D8MBYnVMUX5JPfbRyPrsyTXskyM3aVv5HkDda8ytPdT_2',
        walletId: 'tz29tCQDFw8KwaMaBuroze6Sv2qd47nnP5Hv',
        edition: 68,
    },
    {
        seed: 'opEPFzsSY4dT7UvauQK2U56wFLng6tbFgFNBF4yZ1TGJij5ncMQ',
        walletId: 'tz2LjW2Zw6VY8G5aaH7JUBN4XdYSF3mKqGh8',
        edition: 69,
    },
    {
        seed: 'ontsB16djrtJJUAEFozNG3AsV3bdnVXQTwCtK37zVk7toZvG2V7',
        walletId: 'tz1YQh4z1fEYZEJhMyV4iXuxAW17LZ4Ashmo',
        edition: 70,
    },
    {
        seed: 'oo2kRkwStanekbDpTwoj3knx5hSXVnBnxrh93Q5p5yZ3P2r2VLv',
        walletId: 'tz1MsrdFYZfY5SJynGCjBCgsLeR3aVRMitTn',
        edition: 71,
    },
    {
        seed: 'ooCXog4hf4wTpsVm6TRWeAC8ADr6BiNCamWgXDqbuNYeRMVmvoL',
        walletId: 'tz1iaGYzLKTnatyN7UjimbKfYdUEwiG9xKM5',
        edition: 72,
    },
    {
        seed: 'ooCXog4hf4wTpsVm6TRWeAC8ADr6BiNCamWgXDqbuNYeRMVmvoL_2',
        walletId: 'tz1iaGYzLKTnatyN7UjimbKfYdUEwiG9xKM5',
        edition: 73,
    },
    {
        seed: 'onr4j9mRmJ2EDUh4crpeezV79VQtqjTnRJP9noQ185gXjuUbr4b',
        walletId: 'tz1gHQkfAo2bnWXUaSXK9a4t2p8CmesJZWfW',
        edition: 74,
    },
    {
        seed: 'opNRyCHkaCeWG229PftNs1CKg4jaL9kipQHLq9sgd6j2QQBnBfn',
        walletId: 'tz1X7g3cVm1kkoTp6d4cNKprZUC2e3cDC91x',
        edition: 75,
    },
    {
        seed: 'ooEcpEhaCtatiPdri98nTju4rfCgojticZEdvRhhxipibe5pABm',
        walletId: 'tz1Us632Z8mVMLZqCs1FXuwyBEBe6o4KjHzG',
        edition: 76,
    },
    {
        seed: 'ooEcpEhaCtatiPdri98nTju4rfCgojticZEdvRhhxipibe5pABm_2',
        walletId: 'tz1Us632Z8mVMLZqCs1FXuwyBEBe6o4KjHzG',
        edition: 77,
    },
    {
        seed: 'ooEcpEhaCtatiPdri98nTju4rfCgojticZEdvRhhxipibe5pABm_3',
        walletId: 'tz1Us632Z8mVMLZqCs1FXuwyBEBe6o4KjHzG',
        edition: 78,
    },
    {
        seed: 'ooDwTo88CX9414iE8np22AQX1vu1ucrz55bNpuGmj5HYT7Qc2t5',
        walletId: 'tz1TGLDoTGF8qyc6gDjCgquKxUMAwCoU6jwV',
        edition: 79,
    },
    {
        seed: 'ooW41yEgG6REzh7gJZ2qER2tN9YFckzZKrrW5gdSY2tdwY9t9kt',
        walletId: 'tz1iaGYzLKTnatyN7UjimbKfYdUEwiG9xKM5',
        edition: 80,
    },
    {
        seed: 'ooW41yEgG6REzh7gJZ2qER2tN9YFckzZKrrW5gdSY2tdwY9t9kt_2',
        walletId: 'tz1iaGYzLKTnatyN7UjimbKfYdUEwiG9xKM5',
        edition: 81,
    },
    {
        seed: 'ooZpdXfeVkRUej5AYV5s1sH3yxGBzPTXPTWaJeXKbJaSCDzt19S',
        walletId: 'tz1NQWFFhVCiz9Kdc5XFEJrf7LoAuFMZjp1f',
        edition: 82,
    },
    {
        seed: 'ooJBK1dUUYTWvuomDJbUfjnK33uxScDFodX6kz9A3cKM9vkcXzh',
        walletId: 'tz1Mq3CUUWnnKVRvW8pVg6xGFFt7ArxudsYP',
        edition: 83,
    },
    {
        seed: 'ooFbxC66jRfprx1DM2ovsWU5vCC9UPVL5oGXD7DpuQPHsnNeWCD',
        walletId: 'tz1e52CpddrybiDgawzvqRPXthy2hbAWGJba',
        edition: 84,
    },
    {
        seed: 'oozDpnFABSpjYAwXsYKz4rAjJ57C1uy5xBfu3NLAtWHMFfLenGf',
        walletId: 'tz1e52CpddrybiDgawzvqRPXthy2hbAWGJba',
        edition: 85,
    },
    {
        seed: 'oozDpnFABSpjYAwXsYKz4rAjJ57C1uy5xBfu3NLAtWHMFfLenGf_2',
        walletId: 'tz1e52CpddrybiDgawzvqRPXthy2hbAWGJba',
        edition: 86,
    },
    {
        seed: 'oo79MMo3W6KgRSBLn1C6VUQA4DCfcvFAC8RaLWH2KU4u1ixwykk',
        walletId: 'tz1e52CpddrybiDgawzvqRPXthy2hbAWGJba',
        edition: 87,
    },
    {
        seed: 'onwEgiwn5KMmZ238zNsLyehJ3fNcyVRmPK6A4ZZqgYB8aj46nYd',
        walletId: 'tz1e52CpddrybiDgawzvqRPXthy2hbAWGJba',
        edition: 88,
    },
    {
        seed: 'ooAgZGaeu5wwVdQLSxSEWWQtaBgPWhhFYJbuVfeigBSdmXoghhd',
        walletId: 'tz1SebuhdgF39y5JGVKx4k9i2aj99VDG6eST',
        edition: 89,
    },
    {
        seed: 'opNimZ6ivkYRocwuMCQYa41tSuUMXUc5CqrCAbbfopsuWeQjEz6',
        walletId: 'tz1hYc8FKJSztPJb8a9b4V4yQBGtk9t1FkEj',
        edition: 90,
    },
    {
        seed: 'ooTDmeofAgrfWdM123pRFKvZ5TSqNLJug6XQeWYtzGoNTpeQwbA',
        walletId: 'tz2MRhfAKUyNZDKH8XBzmXyCwd2h5ySbgZJJ',
        edition: 91,
    },
    {
        seed: 'ooWpFPFKbCJ3Pep7m2D3os4L7tWGc5Ab8YLghGtqoWHEsnCAPBz',
        walletId: 'tz1Ze1yDkdjswuNSstQ3hTLa6hnZmBBJ5oUQ',
        edition: 92,
    },
    {
        seed: 'ons7PaRDbe45ds9sGc5dzSQZ4qXvs2CVVxER11wEVGXXrQcD9gy',
        walletId: 'tz2DZSaGavoCUi6Y6sihtZKTiFfES8kjUpP2',
        edition: 93,
    },
    {
        seed: 'onh2PuZCdBRae8Dd4eW1m9oaFxqVDsB9G93KURf8YZxohbExwBk',
        walletId: 'tz1VLyW483Xza4WHHQyRKVp7WoBcN9mhiuQW',
        edition: 94,
    },
    {
        seed: 'oogyCfJTKDrf71ZomEE5os8GMz7mrRjT5YfKRPQMHgqP851Q7ga',
        walletId: 'tz1dghi1QtW2ATgLjWEw6agacKXQifkZSNA3',
        edition: 95,
    },
    {
        seed: 'onjmECzrCMgvm6cDGAmDVam48eDjV4EcDtKCP1qRoELaFaZ8GM4',
        walletId: 'tz1YxmRHQRy1WVbo1k5ZaG7iuEqPowLkBKqi',
        edition: 96,
    },
    {
        seed: 'ooSh3oE4bdJrecY9pdQFv1J3AnW5PKNVWph7m312TEYuJ8KjLrK',
        walletId: 'tz1R53ECSBpkmcXLtxJxvuvM7KoqETHimHRf',
        edition: 97,
    },
    {
        seed: 'ooePFfiDao4ingVYXLo713LkByaXsxcVVfvCssDD6MeUGvWTcW5',
        walletId: 'tz1dd2tmTJFRJh8ycLuZeMpKLquJYkMypu2Q',
        edition: 98,
    },
    {
        seed: 'oohPMM5wqKxFg4CMmgn5XCthTebPQ71n6kspKSrRRsmnGN9nhBx',
        walletId: 'tz1McVAjR9YULDNWTUpSKtutjYCWzfKFF7h9',
        edition: 99,
    },
    {
        seed: 'oosTNuxQw6uCSbHjdSKAjnmkNVpMhVZbwBXGapQ1wYMY5ziR2VZ',
        walletId: 'tz1PqooZUtCQqP539PmMzUWHtaUX6EQtFY5S',
        edition: 100,
    },
    {
        seed: 'oozeUb3px2aG618HWQqjfGqRpwMxjzvGrSgK5D5Qidwtkvivo8x',
        walletId: 'tz1esEY2yNUNAFnescGecqbiEjuB7W5uvJNE',
        edition: 101,
    },
    {
        seed: 'ooLzvDjp7M3KgWw7Ua4avKaCv7VcTKe8EGYn2JxkTLSAYopueAT',
        walletId: 'tz1d4nw6znAeP9ovjdvTJEN6t88ai6b912QU',
        edition: 102,
    },
    {
        seed: 'oomYGYBnqGcUR2utBVwrt9xtPm3LjZq3U9qQhYk4jFpZXd98uAx',
        walletId: 'tz1R53ECSBpkmcXLtxJxvuvM7KoqETHimHRf',
        edition: 103,
    },
    {
        seed: 'opNDNcqBqmzXcenh1LhGkitV7eU82hq2WLMGj6W6TedMiZhzYzC',
        walletId: 'tz1VCjq6K1XpxTYstoHF2TuG8AFr4vp3JC8G',
        edition: 104,
    },
    {
        seed: 'onpCiLR1tQvCzVWQ6ise7DphkUnYB7x8EHFt17aySs8gCiaEzNb',
        walletId: 'tz1ZGQ9DKUy8JeSS6WrYrDr1rC68bjgwbxVB',
        edition: 105,
    },
    {
        seed: 'ooqoVaffHZdXC4jiN9U1NbB6anBkLfj29d5o1MmzY65MFxSJdse',
        walletId: 'tz1PYqfNnkpZydtSY2Tn3Rv8mjkgUpHJpFXC',
        edition: 106,
    },
    {
        seed: 'ongv2wA4gSZRuXLnYDMYknDt3tPFCUt4VUZNiBRxvKBDR4uUFse',
        walletId: 'tz1MsrdFYZfY5SJynGCjBCgsLeR3aVRMitTn',
        edition: 107,
    },
    {
        seed: 'oo6UY9H6mBsCj7bpYisy1fafZuiUGvJgK6sRsUAUiPY5FUbzAMH',
        walletId: 'tz1VoWbkbPq18NGrq4M4mdiVfNf5Tr6Rr8HV',
        edition: 108,
    },
    {
        seed: 'ooAa21iPqwKGEExQ3hK9mqELLCp5Cg3mvJ4XnhUgQRfhFW7zsBM',
        walletId: 'tz1L3RYAdYkTe8UckJ5DWDh3pLWrHXLpzNmS',
        edition: 109,
    },
    {
        seed: 'ooEGuvFpiZ8rBu4A2jyrPrApGcfErcdpb8o1TPCY29ooTG9ZTzE',
        walletId: 'tz1McVAjR9YULDNWTUpSKtutjYCWzfKFF7h9',
        edition: 110,
    },
    {
        seed: 'onsT9RC36QetrjkSBM29EEtZhNG3ADScw7UW5Zt6HTLA9BGUHVU',
        walletId: 'tz1esEY2yNUNAFnescGecqbiEjuB7W5uvJNE',
        edition: 111,
    },
    {
        seed: 'op2okgx9UmjuqZySFVTYiqj857ZGZdqjLFmsK33ds71dYcrht69',
        walletId: 'tz2Mz3ovkZR2HyC89CHHSdsrPya1mKSmLWfD',
        edition: 112,
    },
    {
        seed: 'opTf8wUugRazBDstepp52woq16xPGeuNsrT3vc3c53sjuvRFfoa',
        walletId: 'tz1KySTBB8RXWVraggfXWLaLR9H3K3JBEbgt',
        edition: 113,
    },
    {
        seed: 'ookeutv2wDQQTi3skcYf9svJ76axnuKkMM17kZHXCVsnrJoH149',
        walletId: 'tz1f7LPedx2RMTthZUfdySURZPZsBeQb2TFK',
        edition: 114,
    },
    {
        seed: 'opQRGj2JQdKtX351y882zqhqsdGkaLweCJrEzfzAKDYtevywqTZ',
        walletId: 'tz1f7LPedx2RMTthZUfdySURZPZsBeQb2TFK',
        edition: 115,
    },
    {
        seed: 'onwWhF1qhHhboQTm3BXjFzu921ffDBCBUCfbhAJjn4pcmG3GnAj',
        walletId: 'tz1KggojgYhTawRaj2r9i8mTANNr2Dsn44cx',
        edition: 116,
    },
    {
        seed: 'ooqy95F4fEJFYXTi9ixMYZC5zKbxPcis1QM6bEXY6XvCrWJnwBC',
        walletId: 'tz1RnCGSjMafWbx6WioVAyw8wxSDTz7parWU',
        edition: 117,
    },
    {
        seed: 'oou8L8kezPakyuZ7U1PYARkMnwiNVr3NxeVuE663JXnL3izgP1d',
        walletId: 'tz1anXcLR9C6gjs8FLAB5ZuZnLB3MUepByEE',
        edition: 118,
    },
    {
        seed: 'oo9E2iBjNGBTnpXEt8ykrAfLG2yLJzqfeiQQxffQAnYh5C7dFj9',
        walletId: 'tz1NcUUJKg79Vpk4jxQjmKrrxY7gpUXJXhTY',
        edition: 119,
    },
    {
        seed: 'ooBYwZnnQnVJa1EoqjwjqiaPSipboNev5FfJLjE5xDfqjezCp9V',
        walletId: 'tz1Uza3jMhipiQMtmeEidizjbSqnqZMQyRv7',
        edition: 120,
    },
    {
        seed: 'ooU3U5Px8BGskucsXYktPKGJkx6ZRDEFcYCc5Uh3YXzvmkCgxwH',
        walletId: 'tz1SXnaADssozctaFKr6ajZgJ6jSjq5uLxjF',
        edition: 121,
    },
    {
        seed: 'ooZ62LZMwDT2smKrXPt9w24eWnMLuZ1Zq85m9SAKAbBzD4CV2aS',
        walletId: 'tz1N1uQa5RhpYDcKAGVp9wg3wvJ4oq1VPSsW',
        edition: 122,
    },
    {
        seed: 'op9RD7t5PdHcL5wZapvykvmRYH1qdAHFG6ZKKRMpjezcn7JTHAD',
        walletId: 'tz1fzJFDVUYJSCv5EkXWv6S1zDNjmPtsxRD2',
        edition: 123,
    },
    {
        seed: 'oneJu4A84ReJ7CNLS3ZakeDt36hZowPYvVj5i8sMZet585V9VwR',
        walletId: 'tz1PRMuiYwSLE6mJy9PnjScPEGYLiRn6C8b8',
        edition: 124,
    },
    {
        seed: 'opK2d8mBpWiTKWXo9eMbSs87DRXhvnQfZQL2wzVk1oa6RyYbVrU',
        walletId: 'tz1MDEdswvC13ijGhPKHvAYZYjfNGXnCsekp',
        edition: 125,
    },
    {
        seed: 'ooSNuee7Lms9d1JdTKaw3XpmYkbL3qo1jU18qN22CJ9zQwjc4n5',
        walletId: 'tz1MDEdswvC13ijGhPKHvAYZYjfNGXnCsekp',
        edition: 126,
    },
    {
        seed: 'ongr44pyeQyf8otrAU1oYL22uBqaBXtWSJknxNJgGh8ibe6MJz3',
        walletId: 'tz1bpZNjxdgrUkMnGSiuBQduciHKLAFe41gM',
        edition: 127,
    },
    {
        seed: 'op32Nm23pTBa2457CUeGGtJqA2qEDLCsYpFaT1s3kEEZDpnTK6y',
        walletId: 'tz1bVYxjA1CuaTLqqZ9GwxVtmJQB3c7oNsta',
        edition: 128,
    },
    {
        seed: 'onsT1hvfYNxSckvZ6CduWbsWvifqyHMewzuLJLAQ8JGZHwU9cyj',
        walletId: 'tz1UZGPJtRLsNyYUuYyQU9DSepSF13XxYxFk',
        edition: 129,
    },
    {
        seed: 'opDaq2fM7A7JKXNvPKWJjNyN1gfdbWxrf5f81Js8bZc6z5A9vU2',
        walletId: 'tz1YQh4z1fEYZEJhMyV4iXuxAW17LZ4Ashmo',
        edition: 130,
    },
    {
        seed: 'oor6GnbBKhrASLeWxjPs1qAME2CEUM1f1TivyYdc5LLd9NBCnAA',
        walletId: 'tz1bvZLTXp7fXUSZsVZQRtyvcEz5hy3pGbwZ',
        edition: 131,
    },
    {
        seed: 'oo6PJX2AeZQTNcx9PtcGk6ZSB6BxUgZNG4fXz3YYMgDu3wQxXMc',
        walletId: 'tz1PYqfNnkpZydtSY2Tn3Rv8mjkgUpHJpFXC',
        edition: 132,
    },
    {
        seed: 'onhEHp14gjsi1xbCB2dFoDzMKNms9UNqxB3T3ZhWfuBShfG7D4w',
        walletId: 'tz1d4zP1ZbzvXo9nzGVADieAYRyTLJzFvPvW',
        edition: 133,
    },
    {
        seed: 'ooaNU9LPPbXHUD7SJJYMuSQKDVoUkgW4AetEFy3TSwa4r1PN56G',
        walletId: 'tz1SbPqeXzDLBveaDonADGSBCso3ta7jenHP',
        edition: 134,
    },
    {
        seed: 'ooBgyBWjWaYxXh2yLvksnzabeXeeGLQZFq6ivn34vcj2FpUbDZw',
        walletId: 'tz1f7LPedx2RMTthZUfdySURZPZsBeQb2TFK',
        edition: 135,
    },
    {
        seed: 'oovx5JjvXBYC1bxPxg6zxo3Wbw913kTYTPxenQwj3fbCosq4xyg',
        walletId: 'tz1dQoq5JSxGX5ZjT2rM2pABefNMU98MsLvW',
        edition: 136,
    },
    {
        seed: 'onhgdyqCjpyKymqWAwzf6jCcasUDe3gr61GjWh5qa3xSxSKgJBG',
        walletId: 'tz1WdZcXjzUZUwEYqDvKzYZ5oDMTXgNw9myj',
        edition: 137,
    },
    {
        seed: 'ooNp79oYwjfXnmaSH6EkhfSQm3ELFAXbe5X5ba3PEeVr2EcUZhZ',
        walletId: 'tz1i5uekB9LeMyJFZKbMD4PkKwSJHpcXVrBJ',
        edition: 138,
    },
    {
        seed: 'oo6kfoCdZjiVwoTjEsgaUBeDwE2s9Ut2DpKT2XZW5UmdmM6u2R8',
        walletId: 'tz1bfPZGyRWBBUhmVL6AtRBvwtr63B9oBGVc',
        edition: 139,
    },
    {
        seed: 'oomKbRPABkMZBHDGihMGBmT3B6RrzsYLd7SfhwHute2MaiZRiGN',
        walletId: 'tz1WLzGuhJx3Tarf3RvzFGgZBHQBYsz956fZ',
        edition: 140,
    },
    {
        seed: 'oomZ5UkqVnshftUUHmXDLzVU5tuRqyC7foSsyUW6pcBwf7C5MA6',
        walletId: 'tz1dKBei1mr3mA4LvmiMMM2iHpGz3Vuwn2Fx',
        edition: 141,
    },
    {
        seed: 'ookHmoBAX5rz4Mw9uX7enJnRRTVQHygaU3bag1Cn6hm9NnGmjWK',
        walletId: 'tz1cDCf4DbaeP2MNLAbCUpu1PXhrKtJiAcra',
        edition: 142,
    },
    {
        seed: 'oovXwLeTe433hB3AewwZAbRF52ewt8VwF1viSUcRCbYCmwZuANJ',
        walletId: 'tz1Me77NWVevASUjQGdKfnvuGpgsRCxL9Vp5',
        edition: 143,
    },
    {
        seed: 'ooA8Y5YhgD2ewRnvhT143Tt7JUJFJjXfkSgt8NWA6snNAfyF9sr',
        walletId: 'tz1Ze2Lj7GaHbwbhVzkJVPwGfHfYZfVfmfBo',
        edition: 144,
    },
    {
        seed: 'oo64QuHkCf8mPxuL2b2Rpcw5RaTQKJm3H5VsP9DYcH1axQ4vjq2',
        walletId: 'tz1gN5Ch4VeDZjiM6R1KPMBxPWFxL3HHKZyT',
        edition: 145,
    },
    {
        seed: 'ookH6BJVbqzFKQgwdmN1xCt9HaL8E6rWgeeSZPT2d5t7nQkSUS6',
        walletId: 'tz2L4t9S9LjpR2ca6B869siiKe2Ymp3aQ4gg',
        edition: 146,
    },
    {
        seed: 'ooU7TvvcEBDMusF2Bob1gAkA9dgCAnXaCfTrKgm9eaSjJvgZZqc',
        walletId: 'tz1esEY2yNUNAFnescGecqbiEjuB7W5uvJNE',
        edition: 147,
    },
    {
        seed: 'ooU7TvvcEBDMusF2Bob1gAkA9dgCAnXaCfTrKgm9eaSjJvgZZqc_2',
        walletId: 'tz1esEY2yNUNAFnescGecqbiEjuB7W5uvJNE',
        edition: 148,
    },
    {
        seed: 'oneLJHCW3MTKHZiKiVtrwsWNa6xTuMtRVY5MJnNBiZbhK2uXP1G',
        walletId: 'tz1UAZp8zBYH81fEwHyymxr2uLSJ85tr7jRo',
        edition: 149,
    },
    {
        seed: 'onxZtszrRSiE8VifMc6dzVraLpqdaqsAj8Yjg9XwSEqS4eVxADC',
        walletId: 'tz2PmGHgqgaLqgGmnCuZionifH3sFvKBsQtn',
        edition: 150,
    },
    {
        seed: 'ooP5mbPjVPcQYXatKg4KX7J71mFszRjNFpFiGzMp5yLiLoFKvuq',
        walletId: 'tz1WFzAHogHEZXivRWGiM85K3DjxxHeZGZ8J',
        edition: 151,
    },
    {
        seed: 'oomXhFep9b2g3XqkWxD99WqK1XDHuKZw58rqg8de5Bkaq1NeBXu',
        walletId: 'tz1dTmMLY7tan1HKfW5e3KxJcfZput6UuTH6',
        edition: 152,
    },
    {
        seed: 'oo1q6RFo6AdaU2LGevooUGPh5gBq6mpcA8s1f6QiaXKfi2XvtnV',
        walletId: 'tz1NGDuYTuuB1geX1K5b88cqa8JinFLdd3d5',
        edition: 153,
    },
    {
        seed: 'opFc2UB35UyEvWTjoL8QJaMYoFA5znuZj9M9HZb6GG56Ptr42xt',
        walletId: 'tz1TbfHAvNjs2D52ejHuXRrH1iQxHWePwoAm',
        edition: 154,
    },
    {
        seed: 'opa1Nd4CWTgzYfRACBATmS9vDPBhiQroWVhKFZvcJUwAJJTB51j',
        walletId: 'tz2ALu8Jxf2SMgzSZaZEwfiJQbogpUDPStwz',
        edition: 155,
    },
    {
        seed: 'onsa85hQRVfSY9oZi5Njg5R8saGkQcUiiWgAH7GSNogE7gTnMEj',
        walletId: 'tz1M5JLvUZTiBDt2MMtLbJ4BFWTfocihsw36',
        edition: 156,
    },
    {
        seed: 'opQu4SBxjXhNkmF6G1XNF9B8igKDF5RcTAtfVAkcrtBdFFtenm4',
        walletId: 'tz1M5JLvUZTiBDt2MMtLbJ4BFWTfocihsw36',
        edition: 157,
    },
    {
        seed: 'oo5imeWGP64sHetdCW1yjy29qK1cz1SBh6UoMbTPWNFaVXkQzyM',
        walletId: 'tz1M5JLvUZTiBDt2MMtLbJ4BFWTfocihsw36',
        edition: 158,
    },
    {
        seed: 'oni9GNBiaNPjZDydRj24aiySNxf5qMYJ54ZDNq9s6mfYAfCcMbc',
        walletId: 'tz1SsYVf2h1PLq9gerxgZPaE24wUZ3pt1k6t',
        edition: 159,
    },
    {
        seed: 'opBPYMh1AWcCYaxZfr3GLtaoqst1xpMDj6M6QhjXLyTzXfzm3pt',
        walletId: 'tz1XFhvZvojfqw2jsC9xw1KrPDddneFNgSMr',
        edition: 160,
    },
    {
        seed: 'opaGbmj1TzMLSVCBtYGeWsBsvFhNZUDcJZrKmLbuXHdzBSQd9rf',
        walletId: 'tz1T5pieJfaDg3f9yVMJRsApkVPjARjo2zaP',
        edition: 161,
    },
    {
        seed: 'onrS7UGgTHVBzEMBRqe6AomuuL3wdwovvNmZfFBKkT4i273vN3c',
        walletId: 'tz1ePSjwH41f5LZMtKKFHhY41QA7ixBLAhq3',
        edition: 162,

    },
    {
        seed: 'opXiNowRmAo4XTH5qvgQ3YxQpW97gN8ZJXnZUXHgNfi38upzUo1',
        walletId: 'tz1MP7MmTh2XkMLqCPbsfhZek14nM5mHKKfZ',
        edition: 163
    },
    {
        seed: 'ood8jt16phi57AHHYGFjDs6m83g9A9i9Tqx25yLTUpQDVQNQYVr',
        walletId: 'tz1PBGpgE1birFw6SyKgfrSRv5ZZYjMQZrrw',
        edition: 164
    },
    {
        seed: 'opGmqybtwZFAmkg5qK3SaVbr6AzG84A82iBeC2hSHVYjHeDymYy',
        walletId: 'tz1dURcNHJFPx8kWPt43JFW4MmfrPJEv1H71',
        edition: 165
    },
    {
        seed: 'ooHZLX4cAQpavA9HmUWVPCNhmPiivwzwX4YNpVcJ774j7VxLP2i',
        walletId: 'tz1MSv7LkbsexbVLtiDuwY4wcyj1iDszHyCp',
        edition: 166
    },
    {
        seed: 'oomNZsgARMFjXR5CMSdiERG32zYHew8PkWVPc5aoDKj6ioWKn81',
        walletId: 'tz1R6mtcAQwBTK9YpSqRL9y2a6JZWgDkBm6M',
        edition: 167
    },
    {
        seed: 'opAU4u2bMioB75aiDjQCYF9hYgRcoe34C6trPQH6qVQVB4Q7FbJ',
        walletId: 'tz1R6mtcAQwBTK9YpSqRL9y2a6JZWgDkBm6M',
        edition: 168
    },
    {
        seed: 'opAU4u2bMioB75aiDjQCYF9hYgRcoe34C6trPQH6qVQVB4Q7FbJ_2',
        walletId: 'tz1R6mtcAQwBTK9YpSqRL9y2a6JZWgDkBm6M',
        edition: 169
    },
    {
        seed: 'opM2oxkPFyQ78iDhZdutzy9W3zn9zV5fNieUnGgfGPPyGdDsFK8',
        walletId: 'tz1L7JF1ghvTqoAkLiHD5Ze5EonsYAaD3pv4',
        edition: 170
    },
    {
        seed: 'opM2oxkPFyQ78iDhZdutzy9W3zn9zV5fNieUnGgfGPPyGdDsFK8_2',
        walletId: 'tz1L7JF1ghvTqoAkLiHD5Ze5EonsYAaD3pv4',
        edition: 171
    },
    {
        seed: 'opM2oxkPFyQ78iDhZdutzy9W3zn9zV5fNieUnGgfGPPyGdDsFK8_3',
        walletId: 'tz1L7JF1ghvTqoAkLiHD5Ze5EonsYAaD3pv4',
        edition: 172
    },
    {
        seed: 'opVoSJNSUoHTZca2xbc2LV823B4yG8axCULjW2RuLHCwUen6PWA',
        walletId: 'tz1Xd75PTAwQhK9TAhUZxB7GtdczkE3397Bu',
        edition: 173
    },
    {
        seed: 'op47zkGuJzNMNQ8Lt8seFZVXZCodqYd7rm7hjCvntqcoVHNUbnR',
        walletId: 'tz1Us632Z8mVMLZqCs1FXuwyBEBe6o4KjHzG',
        edition: 174
    },
    {
        seed: 'op1WBf8Tg1HXJJspPTzJxp28FApFrWN7geyZcYq6S8a1Wexog9f',
        walletId: 'tz1bxnm4UrKDq1kR8qfxYvnW6Czjhv1yRqPK',
        edition: 175
    },
    {
        seed: 'opEozzUT1HHvv9gAY3QPv8f4GhrjqSmaiUDfuwDms7W11h6yQC4',
        walletId: 'tz1bxnm4UrKDq1kR8qfxYvnW6Czjhv1yRqPK',
        edition: 176
    },
    {
        seed: 'oo2H9NKVGSYrYaLyVdQcJ3G3BLSoMpumHaxRrNYdjTrHYKf8PvY',
        walletId: 'tz1Tp8PHdx2KsvHyVWb4NaGev8wXLk1HwqCw',
        edition: 177
    },
    {
        seed: 'ooQF93Cr4pniUEJHL9XrTfGnS5sYuQz8HEyH8QBa3iMx7gVKtDS',
        walletId: 'tz1TG9d5ACUTVsyASTP2yi412VbW8hf2HUV6',
        edition: 178
    },
    {
        seed: 'op8yRhFfkfEdg62voV9Vxnf35GpMhWgsci83x71cjv1G8tPpLDV',
        walletId: 'tz1h8HEENKv32TSzTzS52STTZGrE2q7rnrDL',
        edition: 179
    },
    {
        seed: 'oom285fmSbaVR5eJouQ9QnP8RLb9gdwwKQfDvotB7mowjLfUbTG',
        walletId: 'tz1XD1xSVzgY8Qs1id1kNyFJDbv9e9pNMe2c',
        edition: 180
    },
    {
        seed: 'oo7hFBqfFkhrBA4U6wBQEM6W7yEZWjGsYiopL1zhR6dwRnkQZrJ',
        walletId: 'tz1fsz5x9dABLHt97kvXAa3LYomtu1BVrS7e',
        edition: 181
    },
    {
        seed: 'oo3w1dduimFrhGWXWHdKPv859W8f53CpaafmiZC5mVMyGiAcMdr',
        walletId: 'tz2KJHLT5wR9fYXPNF5TbHLKYEQzDA8ibMcV',
        edition: 182
    },
    {
        seed: 'oohS8Co4qibC6SN7E5q85UMqDwDUr5jUkCr4pVatA7BL9cPXo8e',
        walletId: 'tz2A1H2nqwm2ZYzyRsFs1iWPsCjdmWd4Srmz',
        edition: 183
    },
    {
        seed: 'onpVNUqnaWrxN4z2kYfceTGseZKPk2YgxBjw7nD8ZmpLXuxy3KP',
        walletId: 'tz1Rgihrarr9RntBqEiqWkkomGmBMiqb2SUh',
        edition: 184
    },
    {
        seed: 'ooawykmocLRUjzzCe1boLSfJSJsxNR54KTpKtPANmMjwtUYyky3',
        walletId: 'tz1LGVwoTMUhi76Jc8TeaNUQhanfeLLNF4xm',
        edition: 185
    },
    {
        seed: 'opaYoYoqHTbASnhcCsmJv7KsaFUNZqaBjNRBGHkYPrJ9eZ3455N',
        walletId: 'tz1XT3SAzJh47s5DxMJud63MWnvDftqWFtS3',
        edition: 186
    },
    {
        seed: 'oo1jwc3WUgqwtWbf1ptxbU48og8kp5hjTkQanvXXpvnYLu9rmDU',
        walletId: 'tz1LN3wPFYuS5fCnodwxT94xVFLPtcFHvcHk',
        edition: 187
    },
    {
        seed: 'oo1jwc3WUgqwtWbf1ptxbU48og8kp5hjTkQanvXXpvnYLu9rmDU_2',
        walletId: 'tz1LN3wPFYuS5fCnodwxT94xVFLPtcFHvcHk',
        edition: 188
    },
    {
        seed: 'oo1jwc3WUgqwtWbf1ptxbU48og8kp5hjTkQanvXXpvnYLu9rmDU_3',
        walletId: 'tz1LN3wPFYuS5fCnodwxT94xVFLPtcFHvcHk',
        edition: 189
    },
    {
        seed: 'op9EtdjnxvCCfGzYGVbVnhsfHcNzMurywpKF5ESuALjPptZhwfx',
        walletId: 'tz1NAwUw8mNv2k7gnpf9UtJabNUtgHq1qMEN',
        edition: 190
    },
    {
        seed: 'ong6ujEv6fyoo7WtQfspYUyCQz8mPC52Q8kVtTVni2qsTKNDxAK',
        walletId: 'tz1bZvpoyfHK8uM3KSeiiXbUuwNFBgVRGrAw',
        edition: 191
    },
    {
        seed: 'opAAt5C2GdctJaeLdh7Ci5RvUVi8kbpwTBrpXbXRJaaQb1cE5Hj',
        walletId: 'tz1NiULfBXvqec3r4P2U96YJpcwyA2U4MdKV',
        edition: 192
    },
    {
        seed: 'oo6YTcRopARbmxU3BjGFkTQwdS9XuNRtgKRbiJAMogBQnj2ZaTG',
        walletId: 'tz1PYGX3eFGnCsikqU8mPdNGCh9qb3RQ1JWC',
        edition: 193
    },
    {
        seed: 'opXjZzcZVYwuUfJHUV2Ag5XhPLBfW91aroK6jiaVtDUUwc6VbYz',
        walletId: 'tz1hD7VdzRpWG3nmYpCyW2gNc8mQNs3TCgxu',
        edition: 194
    },
    {
        seed: 'ooWj8iMJgSMksTxsjZwUnPzECAorcS5F6NMKbtUVX7eofDai5HG',
        walletId: 'tz1ek5o2mwGMGnwqpPdyaQu2jR42CbiHK8nM',
        edition: 195
    },
    {
        seed: 'onmPDPebqW3yf1wvVtWjwZK3weSoMwKczsXsRefiuJthXJLyVEE',
        walletId: 'tz1ek5o2mwGMGnwqpPdyaQu2jR42CbiHK8nM',
        edition: 196
    },
    {
        seed: 'onmPDPebqW3yf1wvVtWjwZK3weSoMwKczsXsRefiuJthXJLyVEE_2',
        walletId: 'tz1ek5o2mwGMGnwqpPdyaQu2jR42CbiHK8nM',
        edition: 197
    },
    {
        seed: 'onmPDPebqW3yf1wvVtWjwZK3weSoMwKczsXsRefiuJthXJLyVEE_3',
        walletId: 'tz1ek5o2mwGMGnwqpPdyaQu2jR42CbiHK8nM',
        edition: 198
    },
    {
        seed: 'onmPDPebqW3yf1wvVtWjwZK3weSoMwKczsXsRefiuJthXJLyVEE_4',
        walletId: 'tz1ek5o2mwGMGnwqpPdyaQu2jR42CbiHK8nM',
        edition: 199
    },
    {
        seed: 'onmPDPebqW3yf1wvVtWjwZK3weSoMwKczsXsRefiuJthXJLyVEE_5',
        walletId: 'tz1ek5o2mwGMGnwqpPdyaQu2jR42CbiHK8nM',
        edition: 200
    },
    {
        seed: 'onmPDPebqW3yf1wvVtWjwZK3weSoMwKczsXsRefiuJthXJLyVEE_6',
        walletId: 'tz1ek5o2mwGMGnwqpPdyaQu2jR42CbiHK8nM',
        edition: 201
    },
    {
        seed: 'onmPDPebqW3yf1wvVtWjwZK3weSoMwKczsXsRefiuJthXJLyVEE_7',
        walletId: 'tz1ek5o2mwGMGnwqpPdyaQu2jR42CbiHK8nM',
        edition: 202
    },
    {
        seed: 'onmPDPebqW3yf1wvVtWjwZK3weSoMwKczsXsRefiuJthXJLyVEE_8',
        walletId: 'tz1ek5o2mwGMGnwqpPdyaQu2jR42CbiHK8nM',
        edition: 203
    },
    {
        seed: 'onmPDPebqW3yf1wvVtWjwZK3weSoMwKczsXsRefiuJthXJLyVEE_9',
        walletId: 'tz1ek5o2mwGMGnwqpPdyaQu2jR42CbiHK8nM',
        edition: 204
    },
    {
        seed: 'onmPDPebqW3yf1wvVtWjwZK3weSoMwKczsXsRefiuJthXJLyVEE_10',
        walletId: 'tz1ek5o2mwGMGnwqpPdyaQu2jR42CbiHK8nM',
        edition: 205
    },
    {
        seed: 'onmPDPebqW3yf1wvVtWjwZK3weSoMwKczsXsRefiuJthXJLyVEE_11',
        walletId: 'tz1ek5o2mwGMGnwqpPdyaQu2jR42CbiHK8nM',
        edition: 206
    },
    {
        seed: 'onmPDPebqW3yf1wvVtWjwZK3weSoMwKczsXsRefiuJthXJLyVEE_12',
        walletId: 'tz1ek5o2mwGMGnwqpPdyaQu2jR42CbiHK8nM',
        edition: 207
    },
    {
        seed: 'onmPDPebqW3yf1wvVtWjwZK3weSoMwKczsXsRefiuJthXJLyVEE_13',
        walletId: 'tz1ek5o2mwGMGnwqpPdyaQu2jR42CbiHK8nM',
        edition: 208
    },
    {
        seed: 'onmPDPebqW3yf1wvVtWjwZK3weSoMwKczsXsRefiuJthXJLyVEE_14',
        walletId: 'tz1ek5o2mwGMGnwqpPdyaQu2jR42CbiHK8nM',
        edition: 209
    },
    {
        seed: 'onmPDPebqW3yf1wvVtWjwZK3weSoMwKczsXsRefiuJthXJLyVEE_15',
        walletId: 'tz1ek5o2mwGMGnwqpPdyaQu2jR42CbiHK8nM',
        edition: 210
    },
    {
        seed: 'opJr1bAwUteHGgbZDkU9QoWampG5fMTW7kLmA16aecPZG5Zbxkh',
        walletId: 'tz1aqdfLHiLoAHpeMpJ2jwFybreRz8UQiyNp',
        edition: 211
    },
];

const currentSeeds = [
    {
        seed: 'opDb65XjqSRjnm7dicwpnu4dP2ysZw7DJcJH4WdFhSFBr8jiJ59',
        walletId: 'tz1NViSbjkeTiV1qRTNfTvcwn6gXxfP1pDwp',
        edition: 212
    },
    {
        seed: 'oofXzcgjeygu4T6pxEkaKYaVqk34KSqcoSaEFNLUCJ4WtLE1Cyt',
        walletId: 'tz1NViSbjkeTiV1qRTNfTvcwn6gXxfP1pDwp',
        edition: 213
    }
];

const distPath = 'dist';
makeDir(distPath);

// await generateAllSquadrons(allSeeds);
await generateAllSquadrons(currentSeeds);
// Note: Stats Only
// await generateStats(allSeeds);
// Note: Enemies
// await generateEnemySquadronData(10);
// Note: Test Only
// await generateAllSquadrons(testSeeds, 'player');
