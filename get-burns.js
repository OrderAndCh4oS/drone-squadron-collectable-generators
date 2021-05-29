import fetch from 'node-fetch';
import ObjectsToCsv from 'objects-to-csv';
import path from 'path';

const getBurns = async (objktId) => {
    const response = await fetch(`https://api.tzkt.io/v1/operations/transactions?target=KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton&entrypoint=transfer&status=applied&limit=10000&parameter.[0].txs.[0].token_id=${objktId}&parameter.[0].txs.[0].to_=tz1burnburnburnburnburnburnburjAYjjX&select=id,hash,parameter`)
    const data = await response.json();
    return data.reduce((arr, d) => {
        for(const row of d.parameter.value) {
            for(const burn of row.txs) {
                if(Number(burn.token_id) === objktId) {
                    arr.push({burnId: d.hash, walletAddress: row.from_, amount: Number(burn.amount)})
                }
            }
        }
        return arr;
    }, []);
}

const burns = await getBurns(103271);
await new ObjectsToCsv(burns).toDisk(path.join('csv', `burns.csv`));

console.log(burns);

