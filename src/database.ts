import { Collection, Document, MongoClient, ObjectId, ServerApiVersion } from 'mongodb';

interface EventFilter {
    continent?: string;
    country?: string;
    events: string[];
    eventFilterType?: number; // 0 = must contain all events, 1 = must contain at least one event
    registrationFeeMin?: number;
    registrationFeeMax?: number;
    acceptFull?: boolean; // if true, the filter will also match full events
    acceptClosed?: boolean; // if true, the filter will also match events after their registration period
};

interface Subscription {
    filter: EventFilter;
    preferredCurrency: string;
    emailAddress: string;
    alreadySent: Set<string>; // set of IDs that have already been sent to the user to
    // prevent the same event from being sent multiple times
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

    async addSubscription(options: Subscription): Promise<ObjectId> {
        if (await this.coll('subscribed').findOne({ emailAddress: options.emailAddress })) {
            throw new Error('Subscription already exists');
        }

        const now = Date.now();
        const document = {
            emailAddress: options.emailAddress,
            preferredCurrency: options.preferredCurrency,
            filter: options.filter,
            dateAdded: now,
            dateModified: now,
        };

        const { insertedId } = await this.coll('subscribed').insertOne(document);
        if (!(await this.coll('completed').findOne({ emailAddress: options.emailAddress }))) {
            await this.coll('completed').insertOne({ emailAddress: options.emailAddress, completedIDs: [] });
        }

        return insertedId;
    }

    async removeSubscription(...emails: string[]): Promise<void> {
        await this.coll('subscribed').deleteMany({ emailAddress: { $in: emails } });
        await this.coll('completed').deleteMany({ emailAddress: { $in: emails } });
    }

    async getSubscriptions(): Promise<Subscription[]> {
        return await Promise.all((await this.coll('subscribed').find().toArray()).map(async (doc) => {
            const completedDoc = await this.coll('completed').findOne({ emailAddress: doc.emailAddress });
            let alreadySent: string[];
            if (completedDoc) alreadySent = completedDoc.completedIDs;
            else {
                await this.coll('completed').insertOne({ emailAddress: doc.emailAddress, completedIDs: [] });
                alreadySent = [];
            }

            return {
                emailAddress: doc.emailAddress,
                preferredCurrency: doc.preferredCurrency,
                filter: doc.filter,
                alreadySent: new Set(alreadySent),
            };
        }));
    }
}


export { EventFilter, DB, Subscription };
