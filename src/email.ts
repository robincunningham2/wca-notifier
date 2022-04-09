import nodemailer from 'nodemailer';
import Imap from 'imap';
import { MailParser } from 'mailparser';

interface SearchOptions {
    markMessagesAsRead?: boolean;
}

interface Email {
    rawHeaders: { [k: string]: any };
    from: { address: string; name: string; };
    to: { address: string; name: string; };
    subject: string;
    html: string;
    text: string;
};

class MailClient {
    _open: number;
    auth: string;
    transporter: nodemailer.Transporter;
    imap: Imap;

    constructor(auth: string) {
        this._open = 0;
        this.auth = auth;
        this.transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            auth: {
                user: this.auth.split(':')[0],
                pass: this.auth.split(':')[1],
            },
        });

        this.imap = new Imap({
            user: this.auth.split(':')[0],
            password: this.auth.split(':')[1],
            host: 'imap.gmail.com',
            port: 993,
            tls: true,
            tlsOptions: { rejectUnauthorized: false },
        });
    }

    async authorize(): Promise<void> {
        if (this._open != 0) throw new Error('Already authorized!');

        await this.transporter.verify();
        await new Promise((resolve, reject) => {
            this.imap.once('error', reject);
            this.imap.once('ready', () => {
                this.imap.openBox('INBOX', false, (err) => {
                    if (err) return reject(err);
                    resolve(void 0);
                });
            });

            this.imap.connect();
        });

        this._open = 1;
    }

    // eslint-disable-next-line valid-jsdoc
    /**
     * See https://www.marshallsoft.com/ImapSearch.htm for search criteria documentation.
     */
    search(criteria: string[], options: SearchOptions = {}): Promise<Email[]> {
        if (this._open != 1) throw new Error('MailClient is not authorized!');

        return new Promise((resolve, reject) => {
            const res: Email[] = [];

            this.imap.search(criteria, (err, uids) => {
                if (err) return reject(err);
                if (!uids || !uids.length) return resolve([]);

                let total = 0;
                let totalCountIsSet = false;
                let completed = 0;

                const f = this.imap.fetch(uids, { bodies: '' });
                f.on('message', (msg) => {
                    total++;

                    msg.once('body', (stream) => {
                        const parser = new MailParser();
                        const result: { [k: string]: any } = { headers: {}, html: '', text: '' };

                        parser.once('headers', (headers) => result.headers = Object.fromEntries(headers));

                        parser.once('data', ({ html, text }) => {
                            result.html = html;
                            result.text = text;
                        });

                        parser.once('end', () => {
                            res.push({
                                rawHeaders: result.headers,
                                from: result.headers.from.value[0],
                                to: result.headers.from.value[0],
                                subject: result.headers.subject,
                                html: result.html,
                                text: result.text,
                            });

                            completed++;
                            if (totalCountIsSet && completed == total) {
                                if (options.markMessagesAsRead == true) {
                                    this.imap.setFlags(uids, '\\Seen', (err) => {
                                        if (err) return reject(err);
                                        resolve(res);
                                    });
                                } else resolve(res);
                            }
                        });

                        stream.pipe(parser);
                    });
                });

                f.on('error', reject);
                f.once('end', () => totalCountIsSet = true);
            });
        });
    }

    async sendEmail(options: nodemailer.SendMailOptions): Promise<void> {
        if (this._open != 1) throw new Error('MailClient is not authorized!');
        await this.transporter.sendMail({
            from: `WCA Notifier <${process.env.GMAIL_AUTH?.split(':')[0]}>`,
            ...options,
        });
    }

    close(): Promise<void> {
        return new Promise((resolve) => {
            if (this._open != 1) return resolve(void 0);
            this.transporter.close();

            this.imap.closeBox(() => {
                this.imap.end();
                this._open = -1;
                resolve(void 0);
            });
        });
    }
}

export { Email, MailClient, SearchOptions };
