var fis = module.exports = require('fis3');
fis.require.prefixes.unshift('atm');
fis.cli.name = 'atm';
fis.cli.info = fis.util.readJSON(__dirname + '/package.json');
fis.atm = {}
require('./lib/atm-extend')();
