import { Event, getEvents } from './scraper';
import ejs from 'ejs';
import getSymbolFromCurrency from 'currency-symbol-map';
import { htmlToText } from 'html-to-text';
import { MailClient } from './email';
import { DB } from './database';
import { log } from './utils';

const main = async (): Promise<void> => {
    log('background-job', 'Starting up');

    const mail = new MailClient(process.env.GMAIL_AUTH || '');
    const db = new DB(process.env.MONGODB_AUTH || '');

    await Promise.all([ mail.authorize(), db.authorize() ]);
    log('background-job', 'Authorized to Gmail and MongoDB');

    const unseenEmails = await mail.search([ 'UNSEEN' ], { markMessagesAsRead: true });
    const unsubEmails = unseenEmails.filter((x) => x.subject == 'unsubscribe').map((e) => e.from.address);

    unsubEmails.forEach((email) => log('background-job', 'Unsubscribed', email));

    await db.removeSubscription(...unsubEmails);

    await Promise.all((await db.getSubscriptions()).map(async (subscription) => {
        let events: Event[];
        try {
            events = await getEvents(subscription);
        } catch (err) {
            log('background-job', 'Error fetching events for subscription', subscription.emailAddress, err);
            return;
        }

        log('background-job', 'Sending', subscription.emailAddress, events.length, 'events');

        if (events.length == 0) return;

        try {
            await mail.sendEmailFromTemplate(
                subscription.emailAddress,
                `New WCA ${events.length > 1 ? 'Competitions' : 'Competition'}!`,
                'emails/update.ejs',
                {
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
                },
                { rmWhitespace: true },
            );
        } catch (err) {
            log('background-job', 'Error sending email', subscription.emailAddress, err);
        }

        await db.coll('fullfilled').updateOne({ emailAddress: subscription.emailAddress }, {
            $push: { fullfilledIDs: { $each: events.map((e) => e.id) } },
        });
    }));

    await Promise.all([ db.close(), mail.close() ]);

    log('background-job', 'Finished');
};


export default main;
