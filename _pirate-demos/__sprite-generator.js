const fs = require("fs");
const path = require("path");
const { mainModule } = require("process");

const sharp = require("sharp");
const text2png = require('text2png');

if (!fs.existsSync("out")) {
    fs.mkdirSync("out");
}

const readRandom = (directory) => {
    return path.join(directory, randomArrayElement(fs.readdirSync(directory)));
};

const randomArrayElement = (array) => {
    return array[Math.floor(Math.random() * array.length)];
};

const main = async () => {
    const hat = readRandom(path.join("imgs", "1-hats"));
    const sword = readRandom(path.join("imgs", "2-sword"));
    const pant = readRandom(path.join("imgs", "3-pants"));
    const boot = readRandom(path.join("imgs", "4-boots"));
    const jacket = readRandom(path.join("imgs", "5-jacket"));
    const facialHair = readRandom(path.join("imgs", "6-facial-hair"));
    const animal = readRandom(path.join("imgs", "7-animal"));

    const text = await sharp(
        text2png(Math.round((Math.random() * 150000)).toLocaleString("en-US") + ".00", {
            font: '147px chunkfive_printregular',
            localFontPath: 'Chunk Five Print.ttf',
            localFontName: 'chunkfive_printregular',
            output: 'buffer'
        })
    ).toBuffer({ resolveWithObject: true });

    sharp(path.join("imgs", "0-back.png"))
        .composite(
            [
                { input: path.join("imgs", "0-body.png") },
                { input: hat },
                { input: sword },
                { input: pant },
                { input: boot },
                { input: jacket },
                { input: facialHair },
                { input: animal },
                { input: text.data, top: 1654, left: (1306 - text.info.width) },
                { input: path.join("imgs", "0-overlay.png") },
            ]
        )
        .png()
        .toFile(path.join("out", "result.png"))
    ;
};

main();
