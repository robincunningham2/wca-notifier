import express from 'express';
import { log } from '../src/utils';
import api from './api';
import dotenv from 'dotenv';
import { DB } from '../src/database';
import { Server } from 'http';

dotenv.config();

const db = new DB(process.env.MONGODB_AUTH || '');

const PORT = parseInt(process.env.PORT || '3000');
const HOST = process.env.HOSTNAME || '0.0.0.0';

const app = express();

app.set('view engine', 'ejs');
app.set('views', './server/pages');

app.use((req, res, next) => {
    if ((process.env.NODE_ENV == 'prod' || process.env.NODE_ENV == 'production') && req.protocol != 'https') {
        res.redirect('https://' + req.hostname + req.url);
    } else next();
});

app.use('/api', api(db));

app.get('/', (_, res, next) => {
    res.render('index');
    next();
});

app.use((req, res, next) => {
    if (res.writableEnded == false) res.status(404).end(`${req.url} was not found on this server`);
    next();
});

app.use((req, res) => {
    let status; let url; let method;

    if (res.statusCode < 200) status = `\x1B[90m${res.statusCode}\x1B[39m`;
    else if (res.statusCode >= 200 && res.statusCode < 300) status = `\x1B[38;5;46m${res.statusCode}\x1B[39m`;
    else if (res.statusCode >= 300 && res.statusCode < 400) status = `\x1B[94m${res.statusCode}\x1B[39m`;
    else if (res.statusCode >= 400 && res.statusCode < 500) status = `\x1B[38;5;214m${res.statusCode}\x1B[39m`;
    else status = `\x1B[31m${res.statusCode}\x1B[39m`;

    if (req.url == '/favicon.ico') url = `\x1B[90m${req.url}\x1B[39m`;
    else url = req.url;

    if (req.method == 'CONNECT' || req.method == 'HEAD') method = `\x1B[90m${req.method}\x1B[39m`;
    else method = req.method;

    let forwardedForHeader = req.headers['x-forwarded-for'];
    if (forwardedForHeader instanceof Array) forwardedForHeader = forwardedForHeader[0];
    const remoteIp = forwardedForHeader?.split(',').at(-1) || req.socket.remoteAddress;

    log('server', `${remoteIp} -> ${req.hostname}  (${status?.padStart(3, '0')})  ${method.padEnd(9)} ${url}`);
});

let server: Server;
db.authorize().then(() => {
    server = app.listen(PORT, HOST, () => log('server', `Server listening on http://${HOST}:${PORT}`));
});

process.on('SIGINT', () => {
    log('server', 'Received SIGINT, shutting down...');
    Promise.all([ db.close(), server.close() ]).finally(() => process.exit(0));
});

process.on('SIGTERM', () => {
    log('server', 'Received SIGTERM, shutting down...');
    Promise.all([ db.close(), server.close() ]).finally(() => process.exit(0));
});
