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
        req.body.filter instanceof Object &&
        (typeof req.body.filter.continent == 'string' || req.body.filter.continent == null) &&
        (typeof req.body.filter.country == 'string' || req.body.filter.country == null) &&
        req.body.filter.events instanceof Array && req.body.filter.events.length > 0 &&
        req.body.filter.events.every((event: any) => typeof event == 'string') &&
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

            await db.removeSubscription(query);
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

// ======

api.use('/v1', v1);

api.use((_, res, next) => {
    if (res.writableEnded == false) {
        res.status(400).json({
            ok: false,
            apiCode: 'INVALID_API_VERSION',
            data: 'Invalid API version.',
        });
    }

    next();
});

api.use((err: any, _: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err.hasOwnProperty('type') && err.type == 'entity.parse.failed') {
        res.status(400).json({
            ok: false,
            apiCode: 'INVALID_JSON',
            data: `Invalid JSON: ${err.message}`,
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
