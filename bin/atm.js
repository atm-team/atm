#!/usr/bin/env node

var path = require('path');
var os = require('os');
var homedir = os.homedir();
var Liftoff = require('liftoff');
var argv = require('minimist')(process.argv.slice(2));
var cli = new Liftoff({
    name: 'atm',
    processTitle: 'atm',
    moduleName: 'atm',
    configName: null,

    // only js supported!
    extensions: {
        '.js': null
    }
});

cli.launch({
    cwd: argv.r || argv.root,
    configPath: argv.f || argv.file
}, function(env) {
    var fis;
    if (!env.modulePath) {
        fis = require('../');
    } else {
        fis = require(env.modulePath);
    }

    fis.require.paths.unshift(path.join(homedir, '.atm/plugin/node_modules'));
    fis.require.paths.push(path.join(path.dirname(__dirname), 'node_modules'));

    fis.cli.run(argv, env);
});
