
declare module 'cronitor' { // Simple module declaration since @types/cronitor is not available
    function wrap(key: string, callback: CallableFunction): CallableFunction;
};
