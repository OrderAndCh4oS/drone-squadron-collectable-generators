import path from 'path';
import sharp from 'sharp';
import { colours } from './constants/colours.js';
import { makeDir } from './utilities.js';

const visorSprites = ['visor-1.png'];
const chassisSprites = [
    'chassis-1.png',
    'chassis-2.png',
    'chassis-3.png',
    'chassis-4.png',
    'chassis-5.png',
];
const engineSprites = [
    'engine-1.png',
    'engine-2.png',
    'engine-3.png',
    'engine-4.png',
    'engine-5.png',
];
const wingSprites = [
    'wings-1.png',
    'wings-2.png',
    'wings-3.png',
    'wings-4.png',
    'wings-5.png',
    'wings-6.png',
];

const numberRegex = /\d+/;
const imagePath = 'sprites';
makeDir('out');
const smallOutPath = path.join('out', 'small');
const largeOutPath = path.join('out', 'large');
makeDir(smallOutPath);
makeDir(largeOutPath);
for(const colour of colours) {
    const colourPath = path.join(imagePath, colour);
    const colourSmallOutPath = path.join(smallOutPath, colour);
    const colourLargeOutPath = path.join(largeOutPath, colour);
    makeDir(colourSmallOutPath);
    makeDir(colourLargeOutPath);
    for(const visor of visorSprites) {
        const visorPath = path.join(colourPath, visor);
        const visorCode = 'v' + numberRegex.exec(visor)[0];
        for(const wings of wingSprites) {
            const wingPath = path.join(colourPath, wings);
            const wingCode = 'w' + numberRegex.exec(wings)[0];
            for(const engine of engineSprites) {
                const enginePath = path.join(colourPath, engine);
                const engineCode = 'e' + numberRegex.exec(engine)[0];
                for(const chassis of chassisSprites) {
                    const chassisPath = path.join(colourPath, chassis);
                    const chassisCode = 'c' + numberRegex.exec(chassis)[0];
                    const fileName = `${chassisCode}_${wingCode}_${engineCode}_${visorCode}.png`;
                    const finalPath = path.join(colourLargeOutPath, fileName);
                    await sharp(wingPath)
                        .composite(
                            [
                                {input: enginePath},
                                {input: chassisPath},
                                {input: visorPath},
                            ],
                        )
                        .png()
                        .toFile(path.join(colourLargeOutPath, fileName))
                    ;
                    await sharp(finalPath)
                        .resize(48, 48)
                        .png()
                        .toFile(path.join(colourSmallOutPath, fileName))
                    ;
                }
            }
        }
    }
}
