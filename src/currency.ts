import axios from 'axios';
import { load } from 'cheerio';
import { readFileSync } from 'fs';

const CURRENCY_MAP = JSON.parse(readFileSync('currency-map.json', 'utf8'));

const convertCurrency = async (source: string, target: string) => {
    const res = await axios.get(`https://www.google.com/finance/quote/${source}-${target}`);
    const $ = load(res.data);
    return Number($(`div[data-source="${source}"][data-target="${target}"]`).attr('data-last-price') || 'NaN');
};

const currencyNameToSymbol = (name: string) => CURRENCY_MAP[name.toLowerCase()] || 'UDF';

export { convertCurrency, currencyNameToSymbol };
