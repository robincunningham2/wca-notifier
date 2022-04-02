
interface event {
    id: string;
    name: string;
    dateStart: Date;
    dateEnd: Date;
    city: string;
    venue: string;
    latlong: number[];
    maxCompetitors: number;
    registrationFee: number;
    registrationFeeCurrency: any;
    convertedRegistrationFee: number;
    currentCompetitors: number;
};

interface settings {
    filter: eventFilter;
    preferredCurrency: string;
    emailAddress: string;
    alreadySent: string[]; // array of IDs that have already been sent to the user to
    // prevent the same event from being sent multiple times
};

interface eventFilter {
    continent?: string;
    country?: string;
    events: string[];
    eventFilterType?: number; // 0 = must contain all events, 1 = must contain at least one event
    registrationFeeMin?: number;
    registrationFeeMax?: number;
    acceptFull?: boolean; // if true, the filter will also match full events
    acceptClosed?: boolean; // if true, the filter will also match events after their registration period
};

export { event, settings, eventFilter };
