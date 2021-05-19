const generateMatrix = () => {
    const matrix = [];
    for(let a = 0; a < 3; a++) { // weapon
        for(let b = 0; b < 6; b++) { // gimbal
            for(let c = 0; c < 6; c++) { // wings
                for(let d = 0; d < 5; d++) { // engine
                    for(let e = 0; e < 5; e++) { // chassis
                        for(let f = 0; f < 6; f++) { // scanner
                            matrix.push([a, b, c, d, e, f]);
                        }
                    }
                }
            }
        }
    }

    return matrix.sort((a, b) => b.reduce((a, b) => a + b, 0) - a.reduce((a, b) => a + b, 0));
};

const matrix = generateMatrix();

export default matrix;
