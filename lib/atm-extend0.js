var path = require('path');
var fs = require('fs-extra');
var extend = require('extend');
var replace = require('./replace.js');
var cwd = process.cwd();
var Common = require('atm-common');

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
                // .setId()
				// .setHash()
                .setBuilds()
                .addManifest()
                .setDeliver()
                // .setPlugin()
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

		// 设置文件id
		setId: function(){
			// fis.match('/(**).{js,jsx,coffee,ts,tsx,es6,es}', {
			// 	isMod: true,
			// 	id: '$1'
			// });
			// fis.match('/(**).{css,scss,sass,less,styl}', {
			// 	id: '$1.css'
			// });
			return this;
		},


		// 设置构建规则
        setBuilds: function () {
			var builds = common.getBuilds();

			var plugins = configs.plugins;
			// var opt = plugins.parser.transform.options = {
			// 	sitePath: sitePath,
			// 	// siteName: siteName,
			// 	projectName: projectName,
			// 	moduleName: moduleName,
			// 	versionName: versionName
			// };

			var defaultTargetsPluginConfigs = {
				lint: {},
				parser: {},
				preprocessor: {},
				standard: {},
				postprocessor: {},
				optimizer: {}
			}
			var targetsConfigs = configs.targets;


			builds.forEach(function (v) {
				var selector;
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


				// 处理plugin字段
				if (v.plugins) {

					for (var target in targetsConfigs) {
						var targetConfigs = targetsConfigs[target];
						var targetPluginsConfigs = targetConfigs.plugins;
						if (targetPluginsConfigs) {

						} else {

						}
					}

					(function () {
						v.parser = [];
						for (var pos in v.plugins) {
							var pluginDefaultConfigs = plugins[pos];
							var aliasArr = v.plugins[pos];
							if (Array.isArray(aliasArr)) {
								v[pos] = [];
								for (var i in aliasArr) {
									var alias = aliasArr[i];
									if (typeof alias === 'string') {
										var aliasName = alias;
										var aliasConfigs = {}
									} else if (Array.isArray(alias)) {
										var aliasName = alias[0];
										var aliasConfigs = alias[1] || {};
									}
									var pluginConfigs = pluginDefaultConfigs[aliasName];
									var config = extend(true, {}, pluginConfigs.options, aliasConfigs);
									v[pos].push(fis.plugin(pluginConfigs.name, config, 'append'));
								}
							}
						}
						// v.parser.push(replaceParser);
					})();
					// delete v.plugins;
					delete v.plugins;
				}

				if (v.domain && v.domain.indexOf('{{') > -1) {
					if (v.media) {
						media = v.media;
						delete v.media;
						v.domain = lib.replacePlaceholder(v.domain, {
							domain: site.getDomain(media),
							router: common.getAssetsRouter(media)
						});
						fis.media(media).match(selector, v, important);
					} else {
						var targets = siteSettings.targets || {};
						for (var target in targets) {
							var dt = extend(true, {}, v);
							var domain = lib.replacePlaceholder(v.domain, {
								domain: site.getDomain(target),
								router: common.getAssetsRouter(target)
							});
							dt.domain = domain;
							fis.media(target).match(selector, dt, important);
						}
					}
				} else {
					if (v.media) {
						media = v.media;
						delete v.media;
						fis.media(media).match(selector, v, important);
					} else {
						fis.match(selector, v, important);
					}
				}

			});

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

            fis.match('/manifest/' + versionName + '.json', {
                useHash: false
            });
            return this;
        },
        setDeliver: function () {
            fis.get('project.ignore').push('atmdist/**');
            var targets = siteSettings.targets || {};
            for (var target in targets) {
                fis
                    .media(target)
                    .match('**', {
                        deploy: fis.plugin('local-deliver', {
                            to: common.getAssetsPath(target)
                        })
                    });
            }
            return this;
        }

    };
    Deal.init();

    function replaceParser(content, file, conf) {
        if (file.isJsLike) {
            return replace.parseJs({
                content: content,
                file: file,
                common: common
                //transformId: common.transformId
            });
        } else if (file.isCssLike) {
            return replace.parseCss({
                content: content,
                file: file,
                common: common
                //transformId: common.transformId
            });
        } else {

		}
        return content;
    }



};
