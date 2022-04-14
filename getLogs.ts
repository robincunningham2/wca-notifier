import { DB } from './src/database';
import { config } from 'dotenv';
import { ObjectId } from 'mongodb';

config();

const main = async () => {
    let helpFlag = false;
    let listProcessesFlag = false;
    const query = {} as { [k: string]: any };

    if (process.argv[2] == '--help') helpFlag = true;
    else if (process.argv[2] == '--list-processes') listProcessesFlag = true;
    else if (typeof process.argv[2] == 'string') query._id = new ObjectId(process.argv[2]);

    if (helpFlag) {
        process.stdout.write(`Get logs CLI tool

Usage:

    getLogs [--help] [--list-processes] [process id]

Flags:
    --help: Show this help message
    --list-processes: List all processes by their ids
    process id: Get logs for a specific process. If not specified, get logs for all processes
`);
        process.exit(0);
    }

    const db = new DB(process.env.MONGODB_AUTH || '');
    await db.authorize();
    const logDocuments = await db.coll('logs').find(query).toArray();
    await db.close();

    if (listProcessesFlag) {
        process.stdout.write('\x1B[1mID                       Date                     Env\x1B[22m\n');
        logDocuments.forEach((doc) => {
            const id = `\x1B[38;5;214m${doc._id}\x1B[39m`;
            const date = `\x1B[38;5;127m${doc.startDate.toISOString()}\x1B[39m`;
            process.stdout.write(`${id} ${date} ${doc.env}\n`);
        });
    } else {
        const entries: { id: ObjectId, entry: [ Date, string, string ] }[] = [];
        logDocuments.forEach((doc) => {
            doc.entries.forEach((entry: [ Date, string, string ]) => {
                entries.push({ id: doc._id, entry });
            });
        });

        entries.sort((a, b) => a.entry[0].getTime() - b.entry[0].getTime()).forEach(({ id, entry }) => {
            const logDocumentId = `\x1B[38;5;214m${id}\x1B[39m`;
            const date = `[\x1B[90m${entry[0].toISOString()}\x1B[39m]`;
            const tag = `\x1B[92m[${entry[1]}]\x1B[39m`;
            process.stdout.write(`${logDocumentId} ${date} ${tag} ${entry[2]}\n`);
        });
    }
};

main();
