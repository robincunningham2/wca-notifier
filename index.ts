import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion } from 'mongodb';
import { getEvents } from './src/scraper';
import ejs from 'ejs';
import getSymbolFromCurrency from 'currency-symbol-map';
import { htmlToText } from 'html-to-text';
import { MailClient } from './src/email';

dotenv.config();

const main = async () => {
    const mail = new MailClient(process.env.GMAIL_AUTH || '');
    await mail.authorize();

    const client = new MongoClient(process.env.MONGODB_AUTH || '', { serverApi: ServerApiVersion.v1 });
    await client.connect();

    const completed = client.db('data').collection('completed');
    const subscribed = client.db('data').collection('subscribed');

    const unseenEmails = await mail.search([ 'UNSEEN' ], { markMessagesAsRead: true });
    const unsubEmails = unseenEmails.filter((x) => x.subject == 'unsubscribe').map((e) => e.from.address);
    await subscribed.deleteMany({ emailAddress: { $in: unsubEmails } });

    await Promise.all((await subscribed.find().toArray()).map(async (subscription) => {
        const doc = await completed.findOne({ _id: subscription.emailAddress });
        let alreadySent = doc?.completedIDs;
        if (!alreadySent) {
            await completed.insertOne({ _id: subscription.emailAddress, completedIDs: [] });
            alreadySent = [];
        }

        alreadySent = new Set(alreadySent);

        const events = await getEvents({
            filter: subscription.filter,
            preferredCurrency: subscription.preferredCurrency,
            emailAddress: subscription.emailAddress,
            alreadySent,
        });

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

        await completed.updateOne({ _id: subscription.emailAddress }, {
            $push: { completedIDs: { $each: events.map((e) => e.id) } },
        });
    }));

    await client.close();
    await mail.close();
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
