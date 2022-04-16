import express from 'express';
import { DB, DatabaseError, Subscription } from '../src/database';
import { log } from '../src/utils';

const sendOK = (res: express.Response, data: any) => res.status(200).json({ ok: true, apiCode: 'OK', data });

let db: DB;

const api = express.Router(); // eslint-disable-line new-cap

api.use(express.json());

api.get('/', (_, res, next) => {
    sendOK(res, 'Hello, World!');
    next();
});

// === /api/v1 ===

const v1 = express.Router(); // eslint-disable-line new-cap

v1.get('/', (_, res, next) => {
    sendOK(res, 'Hello, World!');
    next();
});

v1.get('/subscription', async (req, res, next) => {
    if (!req.query.id && !req.query.email) {
        res.status(400).json({
            ok: false,
            apiCode: 'INVALID_PARAMETER',
            error: 'Missing parameter \'id\' or \'email\'.',
        });
    } else {
        try {
            const query: { [k: string]: any } = {};
            if (req.query.hasOwnProperty('id')) query.id = req.query.id;
            if (req.query.hasOwnProperty('email')) query.emailAddress = req.query.email;

            if (query.id instanceof Array) query.id = query.id[0];
            if (query.emailAddress instanceof Array) query.id = query.id[0];

            const subscription = await db.getSubscription(query);
            if (!subscription) {
                res.status(404).json({ ok: false, apiCode: 'NOT_FOUND', error: 'Subscription not found.' });
            } else {
                sendOK(res, Object.assign(subscription, {
                    fullfilledEvents: Array.from(subscription.fullfilledEvents),
                }));
            }
        } catch (err) {
            log('server', 'Error fetching subscription:', err);

            res.status(500).json({
                ok: false,
                apiCode: 'DB_ERROR',
                error: 'Unable to fetch subscription. Please try again later.',
            });
        }
    }

    next();
});

v1.post('/subscription', async (req, res, next) => {
    if (
        req.body instanceof Object &&
        typeof req.body.emailAddress == 'string' &&
        typeof req.body.preferredCurrency == 'string' &&
        [
            'AFN', 'ALL', 'DZD', 'ARS', 'AMD', 'AUD', 'AZN', 'BHD',
            'BDT', 'BYN', 'BZD', 'BOB', 'BAM', 'BWP', 'BRL', 'GBP',
            'BND', 'BGN', 'BIF', 'KHR', 'CAD', 'CVE', 'XAF', 'CLP',
            'CNY', 'COP', 'KMF', 'CDF', 'CRC', 'HRK', 'CZK', 'DKK',
            'DJF', 'DOP', 'EGP', 'ERN', 'EEK', 'ETB', 'EUR', 'GEL',
            'GHS', 'GTQ', 'GNF', 'HNL', 'HKD', 'HUF', 'ISK', 'INR',
            'IDR', 'IRR', 'IQD', 'ILS', 'JMD', 'JPY', 'JOD', 'KZT',
            'KES', 'KWD', 'LVL', 'LBP', 'LYD', 'LTL', 'MOP', 'MKD',
            'MGA', 'MYR', 'MUR', 'MXN', 'MDL', 'MAD', 'MZN', 'MMK',
            'NAD', 'NPR', 'TWD', 'NZD', 'NIO', 'NGN', 'NOK', 'OMR',
            'PKR', 'PAB', 'PYG', 'PEN', 'PHP', 'PLN', 'QAR', 'RON',
            'RUB', 'RWF', 'SAR', 'RSD', 'SGD', 'SOS', 'ZAR', 'KRW',
            'LKR', 'SDG', 'SEK', 'CHF', 'SYP', 'TZS', 'THB', 'TOP',
            'TTD', 'TND', 'TRY', 'USD', 'UGX', 'UAH', 'AED', 'UYU',
            'UZS', 'VEF', 'VND', 'XOF', 'YER', 'ZMK', 'ZWL',
        ].includes(req.body.preferredCurrency) &&
        req.body.filter instanceof Object &&
        ((
            typeof req.body.filter.continent == 'string' &&
            [
                '_Africa',
                '_Asia',
                '_Europe',
                '_North America',
                '_Oceania',
                '_South America',
            ].includes(req.body.filter.continent)
        ) || req.body.filter.continent == null) &&
        ((
            typeof req.body.filter.country == 'string' &&
            [
                'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda',
                'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain',
                'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
                'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria',
                'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada',
                'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros',
                'Congo', 'Costa Rica', 'Cote d_Ivoire', 'Croatia', 'Cuba', 'Cyprus',
                'Czech Republic', 'Democratic People_s Republic of Korea',
                'Democratic Republic of the Congo', 'Denmark', 'Djibouti', 'Dominica',
                'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea',
                'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Federated States of Micronesia',
                'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana',
                'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea Bissau', 'Guyana', 'Haiti',
                'Honduras', 'Hong Kong', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran',
                'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan',
                'Kenya', 'Kiribati', 'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon',
                'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Macau',
                'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta',
                'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Moldova', 'Monaco',
                'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'XF', 'XM', 'XA', 'XE', 'XN',
                'XO', 'XS', 'XW', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands',
                'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Macedonia', 'Norway',
                'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay',
                'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Korea', 'Romania', 'Russia',
                'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia',
                'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe',
                'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore',
                'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa',
                'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland',
                'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo',
                'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu',
                'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'USA', 'Uruguay',
                'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia',
                'Zimbabwe',
            ].includes(req.body.filter.country)
        ) || req.body.filter.country == null) &&
        req.body.filter.events instanceof Array && req.body.filter.events.length > 0 &&
        req.body.filter.events.every((event: any) => (
            typeof event == 'string' &&
            [
                '333', '444', '555', '666', '777', '333bf',
                '333fm', '333oh', 'clock', 'minx', 'pyram', 'skewb',
                'sq1', '444bf', '555bf', '333mbf',
            ].includes(event)
        )) &&
        (req.body.filter.eventFilterType == 0 || req.body.filter.eventFilterType == 1) &&
        (typeof req.body.filter.registrationFeeMin == 'number' || req.body.filter.registrationFeeMin == null) &&
        (typeof req.body.filter.registrationFeeMax == 'number' || req.body.filter.registrationFeeMax == null) &&
        (typeof req.body.filter.acceptFull == 'boolean') &&
        (typeof req.body.filter.acceptClosed == 'boolean')
    ) {
        try {
            await db.addSubscription(req.body as Subscription);
            sendOK(res, 'Subscription added.');
        } catch (err) {
            log('server', 'Error adding subscription:', err);

            if (err instanceof DatabaseError && err.code == 'SUBSCRIPTION_ALREADY_EXISTS') {
                res.status(409).json({
                    ok: false,
                    apiCode: 'RECOURSE_ALREADY_EXISTS',
                    error: 'Subscription already exists.',
                });
            } else {
                res.status(500).json({
                    ok: false,
                    apiCode: 'DB_ERROR',
                    error: 'Unable to add subscription. Please try again later.',
                });
            }
        }
    } else {
        res.status(400).json({ ok: false, apiCode: 'BAD_REQUEST', error: 'Invalid request body.' });
    }

    next();
});

v1.delete('/subscription', async (req, res, next) => {
    if (!req.query.id && !req.query.email) {
        res.status(400).json({
            ok: false,
            apiCode: 'INVALID_PARAMETER',
            error: 'Missing parameter \'id\' or \'email\'.',
        });
    } else {
        try {
            const query: { [k: string]: any } = {};
            if (req.query.hasOwnProperty('id')) query.id = req.query.id;
            if (req.query.hasOwnProperty('email')) query.emailAddress = req.query.email;

            if (query.id instanceof Array) query.id = query.id[0];
            if (query.emailAddress instanceof Array) query.id = query.id[0];

            await db.removeSubscriptionByQuery(query);
            sendOK(res, 'Subscription removed.');
        } catch (err) {
            log('server', 'Error removing subscription:', err);

            res.status(500).json({
                ok: false,
                apiCode: 'DB_ERROR',
                error: 'Unable to remove subscription. Please try again later.',
            });
        }
    }

    next();
});

v1.use((req, res, next) => {
    if (res.writableEnded == false) {
        res.status(404).json({
            ok: false,
            apiCode: 'INVALID_ENDPOINT',
            error: `Invalid endpoint: ${req.url}`,
        });
    }

    next();
});

// ======

api.use('/v1', v1);

api.use((_, res, next) => {
    if (res.writableEnded == false) {
        res.status(400).json({
            ok: false,
            apiCode: 'INVALID_API_VERSION',
            error: 'Invalid API version.',
        });
    }

    next();
});

api.use((err: any, _: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err.hasOwnProperty('type') && err.type == 'entity.parse.failed') {
        res.status(400).json({
            ok: false,
            apiCode: 'INVALID_JSON',
            error: `Invalid JSON: ${err.message}`,
        });
    } else {
        log('server', 'Error:', err);
        res.status(500).json({
            ok: false,
            apiCode: 'SERVER_ERROR',
            error: 'An unexpected error occurred. Please try again later.',
        });
    }

    next();
});


export default (database: DB) => {
    db = database;
    return api;
};
