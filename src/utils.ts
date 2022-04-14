import axios from 'axios';
import { load } from 'cheerio';
import { format } from 'util';
import { DB } from './database';
import { config } from 'dotenv';
import { randomBytes } from 'crypto';
import { ObjectId } from 'mongodb';
import { readFileSync, writeFileSync } from 'fs';

config();

writeFileSync('log-id.temp', randomBytes(12).toString('hex'));

const CURRENCY_MAP = JSON.parse(readFileSync('currency-map.json', 'utf8'));

const db = new DB(process.env.MONGODB_AUTH || '');

const convertCurrency = async (source: string, target: string) => {
    if (source == target) return 1;
    const res = await axios.get(`https://www.google.com/finance/quote/${source}-${target}`);
    const $ = load(res.data);
    return Number($(`div[data-source="${source}"][data-target="${target}"]`).attr('data-last-price') || 'NaN');
};

const currencyNameToSymbol = (name: string) => CURRENCY_MAP[name.toLowerCase()] || 'UDF';

const log = async (tag: string, ...message: any[]) => {
    const now = new Date;

    let msg = format(...message);
    if (process.env.NO_COLOR == '1') {
        msg = msg.replaceAll(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
    }

    process.stdout.write(process.env.LOG_TIMESTAMPS == '0' ?
        `[${tag}] ${msg}\n` :
        `[${now.toISOString()}] [${tag}] ${msg}\n`);

    if (!db.client.hasOwnProperty('topology') || !((db.client as any).topology.isConnected())) {
        await db.authorize();
    }

    const _id = new ObjectId(readFileSync('log-id.temp', 'utf8'));
    const doc = await db.coll('logs').findOne({ _id });
    if (!doc) {
        await db.coll('logs').insertOne({
            _id,
            startDate: now,
            env: process.env.NODE_ENV,
            entries: [],
        });
    }

    await db.coll('logs').updateOne({ _id }, { $push: { entries: [ now, tag, format(...message) ] } });
};


export { convertCurrency, currencyNameToSymbol, log };
