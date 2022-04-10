import { Collection, Document, MongoClient, ObjectId, ServerApiVersion } from 'mongodb';
import { settings } from './interfaces';

/*
{
  _id: { '$oid': '6248767358af6eb1481212c2' },
  emailAddress: 'robinmichaelcunningham@gmail.com',
  preferredCurrency: 'EUR',
  filter: {
    continent: null,
    country: 'Netherlands',
    events: [ '333' ],
    eventFilterType: { '$numberInt': '1' },
    registrationFeeMin: { '$numberDouble': '0.0' },
    registrationFeeMax: { '$numberDouble': '30.0' },
    acceptFull: true,
    acceptClosed: false
  },
  dateAdded: { '$numberLong': '1648916343939' },
  dateModified: { '$numberLong': '1648916343939' }
}
*/

interface SubscriptionOptions {
    preferredCurrency: string;
    filter: {
        continent: string | null;
        country: string | null;
        events: string[];
        eventFilterType: 1 | 0;
        registrationFeeMin: number;
        registrationFeeMax: number;
        acceptFull: boolean;
        acceptClosed: boolean;
    };
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

    async addSubscription(email: string, options: SubscriptionOptions): Promise<ObjectId> {
        if (await this.coll('subscribed').findOne({ emailAddress: email })) throw new Error('Account already exists');

        const now = Date.now();
        const document = {
            emailAddress: email,
            preferredCurrency: options.preferredCurrency,
            filter: options.filter,
            dateAdded: now,
            dateModified: now,
        };

        const { insertedId } = await this.coll('subscribed').insertOne(document);
        if (!(await this.coll('completed').findOne({ emailAddress: email }))) {
            await this.coll('completed').insertOne({ emailAddress: email, completedIDs: [] });
        }

        return insertedId;
    }

    async removeSubscription(...emails: string[]): Promise<void> {
        await this.coll('subscribed').deleteMany({ emailAddress: { $in: emails } });
        await this.coll('completed').deleteMany({ emailAddress: { $in: emails } });
    }

    async getSubscriptions(): Promise<settings[]> {
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

export { SubscriptionOptions, DB };
