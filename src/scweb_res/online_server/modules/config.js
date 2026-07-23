const ServerConfig = {
    apiUrl: 'https://api.sckey.net/server/serverlist',
    serverVersion: 'x26.07.20',
    versions: [
        { value: 'x26.07.20', label: 'x26.07.20' },
        { value: 'x26.06.19', label: 'x26.06.19' },
        { value: 'x26.05.23', label: 'x26.05.23' }
    ],
    timeout: 15000,
    currentFilter: 'all',
    useCorsProxy: false,
    cacheExpireMinutes: 10,
    corsProxies: [
        'https://api.allorigins.win/raw?url=',
        'https://cors-anywhere.herokuapp.com/',
        'https://proxy.cors.sh/'
    ],
    currentProxyIndex: 0,
    defaultPort: 28887
};
