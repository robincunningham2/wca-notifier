import dotenv from 'dotenv';
// import { getEvents } from './src/scraper';

dotenv.config();

if (!process.env.GMAIL_AUTH) {
    throw new Error(
        'The variable \x1B[1mGMAIL_AUTH\x1B[22m is not defined. Please add this line to your .env file:\n\n\t' +
        '\x1B[90m...\x1B[39m\n\t\x1B[34mGMAIL_AUTH\x1B[39m=\x1B[32m"<gmail_address>:<gmail_password>"\x1B[39m\n',
    );
}

/*
(async () => {
    const events = await getEvents({
        filter: {
            events: [ '333' ],
            continent: 'Bolivia',
            eventFilterType: 0,
            registrationFeeMax: 5,
        },
        preferredCurrency: 'USD',
        emailAddress: 'robinmichaelcunningham@gmail.com',
        alreadySent: [],
    });

    console.log(events);
})();
*/
