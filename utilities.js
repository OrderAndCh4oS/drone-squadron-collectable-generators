import fs from 'fs';

export const makeDir = path => {
    if(!fs.existsSync(path)) fs.mkdirSync(path);
};
