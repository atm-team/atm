var path = require('path');
var fs = require('fs-extra');
var extend = require('extend');
var cwd = process.cwd();
var Common = require('atm-common');
var getBuildDatas = require('./get-build-datas.js');
var lib = require('atm-lib');
module.exports = function () {
    var pathArr = cwd.split(path.sep);
    var versionName = pathArr.pop();
    var moduleName = pathArr.pop();
    var projectName = pathArr.pop();
    var sitePath = pathArr.join(path.sep);
    if (!sitePath || !fs.existsSync(path.join(sitePath, 'atmjs/settings.js'))) {
        return;
    }
    var common = new Common({
        sitePath: sitePath,
        projectName: projectName,
        moduleName: moduleName,
        versionName: versionName
    });
    var site = common.site;
    var siteSettings = site.settings;
	var siteName = site.getName();
    var configs = common.getConfigs();
    var namespace = common.router;
    var Deal = {
        init: function () {
            this
				.setNamespace()
                .setPackTo()
                .setDomain()
                .setModule()
				.setHash()
                .setBuilds()
                .addManifest()
                .setDeliver()
        },

		// 设置命名空间
        setNamespace: function () {
            fis.set('namespace', namespace);
            return this;
        },

		// 设置文件合并
        setPackTo: function () {
            function replacePlaceholder(str) {
                if (typeof str === 'string') {
                    str = lib.replacePlaceholder(str, {
                        site: site.getName(),
                        project: projectName,
                        module: moduleName,
                        version: versionName
                    });
                }
                return str;
            }
            var obj = configs.packs;
            for (var fileName in obj) {
                pack(obj[fileName], fileName);
            }
            function pack(arr, pkg) {
                pkg = replacePlaceholder(pkg);
                if (typeof arr === 'string') {
                    arr = [arr];
                }
                var newArr = [];
                arr.forEach(function (v) {
                    newArr.push(replacePlaceholder(v))
                });
                arr = newArr;
                arr.forEach(function (v, i) {
                    fis.match(v, {
                        packOrder: i,
                        packTo: pkg
                    });
                });
            }
            return this;
        },

		// 设置domain
        setDomain: function () {
            var targets = siteSettings.targets;
            for (var target in targets) {
                fis
                    .media(target)
                    .match('**', {
                        domain: common.getAssetsUri(target)
                    })
                    .match('**.map', {
                        domain: common.getCompleteUri(target)
                    })
                    .match('image', {
                        domain: common.getCompleteUri(target)
                    });
            }
            return this;
        },

		// 设置模块化
        setModule: function () {
            fis.hook('commonjs', {
                forwardDeclaration: true,
                skipBuiltinModules: true
            });
            return this;
        },

		// 设置文件名是否加md5串
		setHash: function () {
            var targets = siteSettings.targets;
            for (var target in targets) {
                var targetConfig = targets[target];
				fis.media(target).match('**', {
					useHash: !!targetConfig.hash
				});
            }
            return this;
        },

		// 设置构建规则
        setBuilds: function () {
			var builds = common.getBuilds();
			var targetsConfigs = siteSettings.targets;
			// 单个构建目标处理
			for(var target in targetsConfigs) {
				builds.forEach(function (v) {
					v = extend(true, {}, v);
					var selector;
					// 首先删除charset设置,以使全站统一编码
					delete v.charset;

					if (v.glob) {
						selector = v.glob;
					} else if (v.reg) {
						if (typeof v.reg === 'string') {
							if (v.i) {
								selector = new RegExp(v.reg, 'i');
							} else {
								selector = new RegExp(v.reg);
							}
						} else {
							selector = v.reg;
						}
					}


					if (!selector) {
						return;
					}
					var media;
					var important = v.important || null;
					delete v.i;
					delete v.glob;
					delete v.reg;
					delete v.important;

					var result = getBuildDatas({
						target: target,
						v: v,
						configs: configs,
						site: site,
						common: common,
						lib: lib,
						siteSettings: siteSettings,
						extend: extend
					});
					if (result) {
						if (important) {
							fis.media(target).match(selector, result, true);
						} else {
							fis.media(target).match(selector, result);
						}
					}
				});
			}
            return this;
        },

        addManifest: function () {
            fis.match('::package', {
                postpackager: function (ret) {
                    var target = fis.project.currentMedia();
                    var manifestFile = common.getManifestFile(target);
                    var json = JSON.stringify(ret.map, null, 2);
                    try {
                        fs.outputFileSync(manifestFile, json);
                    } catch (err) {
                        throw err;
                    }
                }
            });
            return this;
        },
        setDeliver: function () {
			var ignoreWatchDir = common.getAssetsOffset('dev');
            fis.get('project.ignore').push(ignoreWatchDir + '/**');
            var targets = siteSettings.targets || {};
            for (var target in targets) {
                fis
                    .media(target)
                    .match('**', {
						charset: siteSettings.charset,
                        deploy: [
							fis.plugin('encoding'),
							fis.plugin('local-deliver', {
	                            to: common.getAssetsDist(target)
	                        })
						]
                    });
            }
            return this;
        }

    };
    Deal.init();

};
