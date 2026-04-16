const http = require('http');

const query = "SELECT TOP 1 * FROM dbo.fn_Facturacion('2026-01-01', '2026-01-10', 1)";
const encodedQuery = Buffer.from(query).toString('base64');

const data = JSON.stringify({ query: encodedQuery, format: 'json' });

const options = {
  hostname: 'rws.grucas.com',
  port: 19287,
  path: '/api/reco/encoded',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Authorization': 'Bearer d2hpcHBsZTohUXY3ckA5THBaI3hU'
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', chunk => { body += chunk; });
  res.on('end', () => {
    console.log(body);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
