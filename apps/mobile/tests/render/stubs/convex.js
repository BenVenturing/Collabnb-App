module.exports = { api: new Proxy({}, { get: () => new Proxy({}, { get: () => "fn" }) }) };
