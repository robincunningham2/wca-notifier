import { randomBytes } from 'crypto';
import { Collection, Document, MongoClient, ObjectId, ServerApiVersion } from 'mongodb';

class DatabaseError extends Error {
    message: string;
    code: string;

    constructor(code: string, message: string) {
        super(message);
        Object.setPrototypeOf(this, DatabaseError.prototype);
        this.message = message;
        this.code = code;
    }
}

interface EventFilter {
    continent: string | null;
    country: string | null;
    events: string[];
    eventFilterType: number; // 0 = must contain all events, 1 = must contain at least one event
    registrationFeeMin: number | null;
    registrationFeeMax: number | null;
    acceptFull: boolean; // if true, the filter will also match full events
    acceptClosed: boolean; // if true, the filter will also match events after their registration period
};

interface Subscription {
    filter: EventFilter;
    preferredCurrency: string;
    emailAddress: string;
    verification: {
        status: string;
        code: string;
        expires: Date;
    };

    // This is a set of competition/event IDs that that have already been sent to the user,
    // this is to prevent duplicate emails.
    fullfilledEvents: Set<string>;
};

class DB {
    auth: string;
    client: MongoClient;

    constructor(auth: string) {
        this.auth = auth;
        this.client = new MongoClient(auth, { serverApi: ServerApiVersion.v1 });
    }

    async authorize(): Promise<void> {
        await this.client.connect();
    }

    async close(): Promise<void> {
        await this.client.close();
    }

    coll(name: string): Collection<Document> {
        return this.client.db('data').collection(name);
    }

    async addSubscription(options: Subscription): Promise<{ insertedId: ObjectId, verificationCode: string }> {
        if (await this.coll('subscriptions').findOne({ emailAddress: options.emailAddress })) {
            throw new DatabaseError('SUBSCRIPTION_ALREADY_EXISTS', 'Subscription already exists');
        }

        const verificationCode = randomBytes(14).toString('base64url');

        const now = Date.now();
        const document = {
            emailAddress: options.emailAddress,
            preferredCurrency: options.preferredCurrency,
            filter: {
                continent: options.filter.continent,
                country: options.filter.country,
                events: options.filter.events,
                eventFilterType: options.filter.eventFilterType,
                registrationFeeMin: options.filter.registrationFeeMin,
                registrationFeeMax: options.filter.registrationFeeMax,
                acceptFull: options.filter.acceptFull,
                acceptClosed: options.filter.acceptClosed,
            },
            verification: {
                status: 'PENDING',
                code: verificationCode,
                expires: new Date(now + 15 * 60 * 1000),
            },
            dateAdded: now,
            dateModified: now,
        };

        const { insertedId } = await this.coll('subscriptions').insertOne(document);
        if (!(await this.coll('fullfilled').findOne({ emailAddress: options.emailAddress }))) {
            await this.coll('fullfilled').insertOne({ emailAddress: options.emailAddress, fullfilledIDs: [] });
        }

        return { insertedId, verificationCode };
    }

    async removeSubscription(...emails: string[]): Promise<void> {
        await this.coll('subscriptions').deleteMany({ emailAddress: { $in: emails } });
        await this.coll('fullfilled').deleteMany({ emailAddress: { $in: emails } });
    }

    async removeSubscriptionByQuery(query: { [k: string]: any }): Promise<void> {
        const doc = await this.coll('subscriptions').findOne(query);
        if (!doc) return;

        await this.coll('subscriptions').deleteOne(query);
        await this.coll('fullfilled').deleteOne({ emailAddress: doc.emailAddress });
    }

    async getSubscription(query: { [k: string]: any }): Promise<Subscription | null> {
        const doc = await this.coll('subscriptions').findOne(query);
        if (!doc) return null;

        const fullfilledDoc = await this.coll('fullfilled').findOne({ emailAddress: doc.emailAddress });
        let fullfilled: string[];
        if (fullfilledDoc) fullfilled = fullfilledDoc.fullfilledIDs;
        else {
            await this.coll('fullfilled').insertOne({ emailAddress: doc.emailAddress, fullfilledIDs: [] });
            fullfilled = [];
        }

        return {
            emailAddress: doc.emailAddress,
            preferredCurrency: doc.preferredCurrency,
            filter: doc.filter,
            verification: doc.verification,
            fullfilledEvents: new Set(fullfilled),
        };
    }

    async getSubscriptions(): Promise<Subscription[]> {
        return await Promise.all((await this.coll('subscriptions').find().toArray()).map(async (doc) => {
            const fullfilledDoc = await this.coll('fullfilled').findOne({ emailAddress: doc.emailAddress });
            let fullfilled: string[];
            if (fullfilledDoc) fullfilled = fullfilledDoc.fullfilledIDs;
            else {
                await this.coll('fullfilled').insertOne({ emailAddress: doc.emailAddress, fullfilledIDs: [] });
                fullfilled = [];
            }

            return {
                emailAddress: doc.emailAddress,
                preferredCurrency: doc.preferredCurrency,
                filter: doc.filter,
                verification: doc.verification,
                fullfilledEvents: new Set(fullfilled),
            };
        }));
    }
}


export { EventFilter, DatabaseError, DB, Subscription };
