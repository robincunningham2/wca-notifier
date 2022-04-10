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
    process.stdout.write(process.env.LOG_TIMESTAMPS == '0' ?
        format('[%s] %s\n', tag, format(...message)) :
        format('[%s] [%s] %s\n', new Date().toISOString(), tag, format(...message)));
};


export { convertCurrency, currencyNameToSymbol, log };
