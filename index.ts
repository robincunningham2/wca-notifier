import dotenv from 'dotenv';
import main from './src/main';
import cronitor from 'cronitor';
import { log } from './src/utils';
import cron from 'node-cron';

dotenv.config();

if (!process.env.GMAIL_AUTH) {
    throw new Error(`The variable 'GMAIL_AUTH' is not defined. Please define it in your .env file:

    GMAIL_AUTH="<gmail_username:gmail_password>"
`);
}

if (!process.env.MONGODB_AUTH) {
    throw new Error(`The variable 'MONGODB_AUTH' is not defined. Please define it in your .env file:

    MONGODB_AUTH="<mongo_uri>"
`);
}

if (!process.env.CRON_PATTERN && !process.env.CRONITOR_KEY) {
    throw new Error(`The variable 'CRON_PATTERN' is not defined. Please define it in your .env file:

    CRON_PATTERN="<cron_pattern>"

    See https://crontab.guru for more info about cron patterns.
`);
}

if (process.env.CRON_PATTERN) {
    log('cron-manager', 'Scheduling cron job with pattern', process.env.CRON_PATTERN);

    cron.schedule(process.env.CRON_PATTERN, async (startDate: Date) => {
        log('cron-manager', 'Starting cron job at', startDate);

        try {
            await main();
        } catch (err) {
            log('cron-manager', 'Error running cron job', err);
        } finally {
            const endDate = new Date;
            log('cron-manager', 'Cron job finished in', endDate.getTime() - startDate.getTime(), 'ms');
        }
    });
} else {
    log('cron-manager', 'Starting cron job with cronitor key', process.env.CRONITOR_KEY);

    cronitor.wrap(process.env.CRONITOR_KEY || '', main);
}
