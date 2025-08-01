// Quick script to clear API cache
const { apiCache } = require('./server/utils/cache');

console.log('Clearing API cache...');
apiCache.flushAll();
console.log('Cache cleared successfully!');