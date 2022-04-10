import dotenv from 'dotenv';
import { getEvents } from './src/scraper';
import ejs from 'ejs';
import getSymbolFromCurrency from 'currency-symbol-map';
import { htmlToText } from 'html-to-text';
import { MailClient } from './src/email';
import { DB } from './src/database';

dotenv.config();

const main = async () => {
    const mail = new MailClient(process.env.GMAIL_AUTH || '');
    const db = new DB(process.env.MONGODB_AUTH || '');

    await Promise.all([ mail.authorize(), db.authorize() ]);

    const unseenEmails = await mail.search([ 'UNSEEN' ], { markMessagesAsRead: true });
    const unsubEmails = unseenEmails.filter((x) => x.subject == 'unsubscribe').map((e) => e.from.address);

    await db.removeSubscription(...unsubEmails);

    await Promise.all((await db.getSubscriptions()).map(async (subscription) => {
        const events = await getEvents(subscription);

        process.stdout.write(`Sending ${subscription.emailAddress} ${events.length} events!\n`);

        if (events.length == 0) return;

        const html = await ejs.renderFile('email.ejs', {
            events: events.map((event) => ({
                eventURL: `https://www.worldcubeassociation.org/competitions/${event.id}#general-info`,
                date: event.dateStart.getTime(),
                title: event.name,
                location: event.city,
                fee: {
                    origional: {
                        symbol: getSymbolFromCurrency(event.registrationFeeCurrency),
                        ammount: event.registrationFee,
                    },
                    converted: {
                        symbol: getSymbolFromCurrency(subscription.preferredCurrency),
                        ammount: event.convertedRegistrationFee,
                    },
                },
                loc: event.latlong,
                competitors: {
                    current: event.currentCompetitors,
                    max: event.maxCompetitors,
                },
            })),
            unsubURL: 'https://www.google.com',
            websiteName: 'WCA Notifier',
            summary: `${events.length} new ${events.length > 1 ? 'events' : 'event'} found!`,
        }, { rmWhitespace: true });

        await mail.sendEmail({
            from: `WCA Notifier <${process.env.GMAIL_AUTH?.split(':')[0]}>`,
            to: subscription.emailAddress,
            subject: `New WCA ${events.length > 1 ? 'Competitions' : 'Competition'}!`,
            html,
            text: htmlToText(html),
            headers: {
                'List-Unsubscribe': '<mailto:wca.notifier@gmail.com?subject=unsubscribe>',
            },
        });

        await db.coll('completed').updateOne({ emailAddress: subscription.emailAddress }, {
            $push: { completedIDs: { $each: events.map((e) => e.id) } },
        });
    }));

    await Promise.all([ db.close(), mail.close() ]);
};

(async () => {
    if (!process.env.GMAIL_AUTH) {
        throw new Error(
            'The variable \x1B[1mGMAIL_AUTH\x1B[22m is not defined. Please add this line to your .env file:\n\n\t' +
            '\x1B[90m...\x1B[39m\n\t\x1B[34mGMAIL_AUTH\x1B[39m=\x1B[32m"<gmail_address>:<gmail_password>"\x1B[39m\n',
        );
    }

    if (!process.env.MONGODB_AUTH) {
        throw new Error(
            'The variable \x1B[1mMONGODB_AUTH\x1B[22m is not defined. Please add this line to your .env file:\n\n\t' +
            '\x1B[90m...\x1B[39m\n\t\x1B[34mMONGODB_AUTH\x1B[39m=\x1B[32m"<mongodb_uri>"\x1B[39m\n',
        );
    }

    await main();
})();
