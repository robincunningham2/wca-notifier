import dotenv from 'dotenv';
import main from './src/main';
import Cronitor from 'cronitor';
import { log } from './src/utils';
import { CronJob } from 'cron';

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

if (!process.env.CRON_PATTERN) {
    throw new Error(`The variable 'CRON_PATTERN' is not defined. Please define it in your .env file:

    CRON_PATTERN="<cron_pattern>"

    See https://crontab.guru for more info about cron patterns.
`);
}

if (
    (process.env.CRONITOR_JOB_KEY && !process.env.CRONITOR_API_KEY) ||
    (process.env.CRONITOR_API_KEY && !process.env.CRONITOR_JOB_KEY)
) {
    throw new Error(`Either 'CRONITOR_JOB_KEY' or 'CRONITOR_API_KEY' is not defined. Please define it in your .env file:

    CRONITOR_JOB_KEY="<cronitor_job_key>"
    or:
    CRONITOR_API_KEY="<cronitor_api_key>"
`);
}

log('cron-manager', 'Scheduling cron job with pattern', process.env.CRON_PATTERN);

const job = new CronJob(process.env.CRON_PATTERN, async () => {
    const startDate = new Date;
    try {
        if (process.env.CRONITOR_JOB_KEY && process.env.CRONITOR_API_KEY) {
            log('cron-manager', 'Starting cron job and sending telemetry to cronitor at', startDate);
            const cronitor = Cronitor(process.env.CRONITOR_API_KEY); // eslint-disable-line new-cap
            const worker = cronitor.wrap(process.env.CRONITOR_JOB_KEY, main);
            await worker();
        } else {
            log('cron-manager', 'Starting cron job at', startDate);
            await main();
        }
    } catch (err) {
        log('cron-manager', 'Error running cron job', err);
    } finally {
        const endDate = new Date;
        log('cron-manager', 'Cron job finished in', endDate.getTime() - startDate.getTime(), 'ms');
    }
}, null, true, process.env.TZ);

job.start();
