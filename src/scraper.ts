import axios from 'axios';
import { load } from 'cheerio';
import { convertCurrency, currencyNameToSymbol } from './utils';
import { Subscription } from './database';

const EVENTS_BASE_URL = 'https://www.worldcubeassociation.org/competitions/';

interface Event {
    id: string;
    name: string;
    dateStart: Date;
    dateEnd: Date;
    city: string;
    venue: string;
    latlong: number[];
    maxCompetitors: number;
    registrationFee: number;
    registrationFeeCurrency: any;
    convertedRegistrationFee: number;
    currentCompetitors: number;
};

const getEventInfo = async (id: string, targetCurrency: string): Promise<Event> => {
    const iCalRes = await axios.get(EVENTS_BASE_URL + id + '.ics');

    const dateStartRaw = iCalRes.data.match(/DTSTART;VALUE=DATE:(\d+)/)[1];
    const dateStart = [ dateStartRaw.slice(0, 4), dateStartRaw.slice(4, 6), dateStartRaw.slice(6, 8) ].join('-');
    const dateEndRaw = iCalRes.data.match(/DTEND;VALUE=DATE:(\d+)/)[1];
    const dateEnd = [ dateEndRaw.slice(0, 4), dateEndRaw.slice(4, 6), dateEndRaw.slice(6, 8) ].join('-');

    const res = await axios.get(EVENTS_BASE_URL + id);
    let $ = load(res.data);

    const name = $('#competition-data > h3').text().trim();
    const city = $('dt:contains(City)').next().text().trim();
    const venue = $('dt:contains(Venue)').next().text().trim();
    const latlongStrings = $('dt:contains(Address)').next().find('a').attr('href')?.split('/').at(-1)?.split(',');
    const latlong = latlongStrings?.map((x) => Number(x)) || [ NaN, NaN ];

    const registerRes = await axios.get(EVENTS_BASE_URL + id + '/register');
    $ = load(registerRes.data);
    const text = $('div#competition-data').text();

    const maxCompetitors = parseInt(text.match(/competitor limit of (\d+)/)?.at(1) || 'NaN');

    const registrationFeeMatch = text.match(/fee[^\n\d]+((\d+)([.,]\d+)?) \(([\w\s]+)\)/);
    const registrationFee = Number(registrationFeeMatch?.at(1)?.replace(',', '.') || 'NaN');
    const registrationFeeCurr = currencyNameToSymbol(registrationFeeMatch?.at(4) || '');

    const convertedCurrency = await convertCurrency(registrationFeeCurr, targetCurrency) * registrationFee;

    const registrationsRes = await axios.get(EVENTS_BASE_URL + id + '/registrations');
    $ = load(registrationsRes.data);
    const currentCompetitors = parseInt($('tfoot > tr > td:nth-child(1)').text().match(/=\s+(\d+)/)?.at(1) || 'NaN');

    return {
        id,
        name,
        dateStart: new Date(dateStart),
        dateEnd: new Date(dateEnd),
        city,
        venue,
        latlong,
        maxCompetitors,
        registrationFee,
        registrationFeeCurrency: registrationFeeCurr,
        convertedRegistrationFee: convertedCurrency,
        currentCompetitors,
    };
};

const eventFilter = (subscription: Subscription, event: Event) => {
    const { filter } = subscription;
    if (new Date() >= event.dateStart) return false;
    if (subscription.alreadySent.has(event.id)) return false;
    if (filter.registrationFeeMin && event.convertedRegistrationFee < filter.registrationFeeMin) return false;
    if (filter.registrationFeeMax && event.convertedRegistrationFee > filter.registrationFeeMax) return false;
    if (!filter.acceptFull && event.currentCompetitors >= event.maxCompetitors) return false;
    // TODO: filter.acceptClosed
    return true;
};

const getEvents = async (subscription: Subscription) => {
    const { filter } = subscription;
    let urls: string[];

    const baseURL = 'https://www.worldcubeassociation.org/competitions?utf8=%E2%9C%93&search=&state=present&year=al' +
        `l+years&from_date=&to_date=&delegate=&display=list&region=${filter.continent || filter.country || 'all'}`;

    if (filter.eventFilterType == 1) urls = filter.events.map((event) => `${baseURL}&event_ids%5B%5D=${event}`);
    else urls = [ baseURL + filter.events.map((event) => `&event_ids%5B%5D=${event}`).join('') ];

    const urlArrays: any[] = await Promise.all(urls.map(async (url) => {
        const res = await axios.get(url);
        const $ = load(res.data);
        const selector = 'ul > li.list-group-item.not-past a:not([target="_blank"])';
        return $(selector).toArray().map((x) => x.attribs.href.split('/').at(-1));
    }));

    const ids = Array.from(new Set([].concat(...urlArrays))).filter((x) => x);
    const events = await Promise.all(ids.map((id) => getEventInfo(id, subscription.preferredCurrency)));
    return events.filter((event) => eventFilter(subscription, event));
};


export { Event, eventFilter, EVENTS_BASE_URL, getEventInfo, getEvents };
