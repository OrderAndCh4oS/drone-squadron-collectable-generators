// If you don't want to set up your own nodejs environment,
// this script is also available at https://batch.xtz.tools/
// with a friendlier interface.

import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import sotez from 'sotez';
import { TezosToolkit } from '@taquito/taquito';
import { InMemorySigner } from '@taquito/signer';
import parse from 'csv-parse/lib/sync.js';

import util from 'util';
import { NoopSigner } from '@taquito/taquito/dist/types/signer/noop';

config();

const cryptoUtils = sotez.cryptoUtils;
const contractAddress = process.env.CONTRACT || 'KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton';

const inputFile = path.join('batch', 'send.csv');
const outputFile = path.join('batch', 'completed.csv');

const txConfirmations = process.env.CONFIRMATIONS || 3;
const txConfirmationTimeout = process.env.CONFIRMATIONTIMEOUT || txConfirmations * (2 * 60);

// Todo: make a script to batch swap
// https://better-call.dev/mainnet/KT1HbQepzV1nVGg8QVznG7z4RcHseD5kwqBn/interact?entrypoint=swap

const main = async() => {
    const Tezos = new TezosToolkit('https://mainnet.smartpy.io/');
    let signer;
    if(process.env.MNEMONIC) {
        const keys = await cryptoUtils.generateKeys(process.env.MNEMONIC);
        signer = new InMemorySigner(keys.sk);
    } else if(process.env.SECRET) {
        signer = new InMemorySigner(process.env.SECRET);
    } else {
        throw 'Neither MNEMONIC nor SECRET is set!';
    }

    const walletAddress = await signer.publicKeyHash();

    console.log('Running for sender ' + walletAddress);

    Tezos.setProvider({signer});

    // Prepare smart contract parameters
    const params = [
        {
            from_: walletAddress,
            txs: [],
        },
    ];

    console.log('Reading input ' + inputFile);

    const content = fs.readFileSync(inputFile, 'utf8');

    console.log('Parsing input');

    const records = await parse(content, {
        columns: ['target_address', 'token_id', 'amount'],
        skip_empty_lines: true,
        trim: true,
        bom: true,
    });

    console.log(records);

    if(!records.length || records.length === 1) {
        throw 'No entries to process!';
    }

    for(const record of records.slice(1)) {
        console.log(
            `Found entry: ${record.amount} ├ù #${record.token_id} to ${record.target_address}`);

        params[0].txs.push({
            to_: record.target_address,
            token_id: record.token_id,
            amount: record.amount,
        });
    }

    console.log('Getting information for FA2 contract ' + contractAddress);

    const contract = await Tezos.contract.at(contractAddress);

    console.log('Sending transaction');

    const operation = await contract.methods.transfer(params).send({amount: 0, mutez: true});

    console.log('Waiting for ' + txConfirmations + ' transaction confirmations with a timeout of ' +
        txConfirmationTimeout + ' seconds, see https://tzstats.com/' + operation.hash);

    await operation.confirmation(txConfirmations, 10, txConfirmationTimeout);

    console.log('Transaction confirmed!');
    console.log('Saving transaction hash to ' + outputFile);

    if(!fs.existsSync(outputFile)) {
        fs.writeFileSync(outputFile, 'txn,date\n');
    }

    fs.appendFileSync(outputFile, `${operation.hash},${new Date().toISOString()}\n`);

    console.log('Done!');
};

main().catch(error => {
    console.error('Failed! Here is why:');
    console.error(util.inspect(error, false, null, true));
});
