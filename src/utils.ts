import axios from 'axios';
import { load } from 'cheerio';
import { readFileSync } from 'fs';
import { format } from 'util';

const CURRENCY_MAP = JSON.parse(readFileSync('currency-map.json', 'utf8'));

const convertCurrency = async (source: string, target: string) => {
    if (source == target) return 1;
    const res = await axios.get(`https://www.google.com/finance/quote/${source}-${target}`);
    const $ = load(res.data);
    return Number($(`div[data-source="${source}"][data-target="${target}"]`).attr('data-last-price') || 'NaN');
};

const currencyNameToSymbol = (name: string) => CURRENCY_MAP[name.toLowerCase()] || 'UDF';

const log = (tag: string, ...message: any[]) => {
    const now = new Date;

    let msg = format(...message);
    if (process.env.NO_COLOR == '1') {
        msg = msg.replaceAll(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
    }

    process.stdout.write(process.env.LOG_TIMESTAMPS == '0' ?
        `[${tag}] ${msg}\n` :
        `[${now.toISOString()}] [${tag}] ${msg}\n`);
};


export { convertCurrency, currencyNameToSymbol, log };
