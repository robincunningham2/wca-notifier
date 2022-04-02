import dotenv from 'dotenv';
import { MongoClient, ServerApiVersion } from 'mongodb';
import { getEvents } from './src/scraper';
import nodemailer from 'nodemailer';

dotenv.config();

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

    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        auth: {
            user: process.env.GMAIL_AUTH.split(':')[0],
            pass: process.env.GMAIL_AUTH.split(':')[1],
        },
    });

    await transporter.verify();

    const client = new MongoClient(process.env.MONGODB_AUTH, { serverApi: ServerApiVersion.v1 });
    await client.connect();

    const completed = client.db('data').collection('completed');
    const subscribed = client.db('data').collection('subscribed');

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

        await Promise.all(events.map((event) => transporter.sendMail({
            from: `WCA Notifier <${process.env.GMAIL_AUTH?.split(':')[0]}>`,
            to: subscription.emailAddress,
            subject: 'New WCA Competition!',
            text: '',
            html: '<textarea readonly>' + JSON.stringify(event, null, 2) + '</textarea>',
        })));

        await completed.updateOne({ _id: subscription.emailAddress }, {
            $push: { completedIDs: { $each: events.map((e) => e.id) } },
        });
    }));

    await client.close();
})();
