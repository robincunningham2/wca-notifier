import dotenv from 'dotenv';
import main from './src/main';

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

    await main();
})();
