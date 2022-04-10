import express from 'express';
import { log } from '../src/utils';

const PORT = parseInt(process.env.PORT || '3000');
const HOST = process.env.HOSTNAME || '0.0.0.0';

const app = express();

app.get('/', (_, res, next) => {
    res.end('Hello, World!');
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

    log('server', `${req.ip} -> ${req.hostname}  (${status?.padStart(3, '0')})  ${method.padEnd(9)} ${url}`);
});

app.listen(PORT, HOST, () => log('server', `Server listening on http://${HOST}:${PORT}`));
