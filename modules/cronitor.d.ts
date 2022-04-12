
interface CronitorInterface {
    wrap(key: string, callback: Function): Function;
}

declare module 'cronitor' { // Simple module declaration since @types/cronitor is not available
    function Cronitor(apiKey?: string, config: { [k: string]: any } = {}) : CronitorInterface;
    export = Cronitor;
};
