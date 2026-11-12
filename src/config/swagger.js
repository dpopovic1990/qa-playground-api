
const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

const openApiPath = path.join(
    __dirname,
    '../../docs/openapi.yaml'
);

const file = fs.readFileSync(openApiPath, 'utf8');
const swaggerDocument = YAML.parse(file);

module.exports = swaggerDocument;
