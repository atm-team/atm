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
    var configs = common.getConfigs();
    var namespace = common.router;
    var Deal = {
        init: function () {
            this
                .setPackTo()
                .setDomain()
                .setNamespace()
                .setModule()
                .setId()
                .setHash()
                .setRelease()
                .setReplace()
                .addManifest()
                .setOptimizer()
                .setDeliver()
                .setPlugin()
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

		// 设置命名空间
        setNamespace: function () {
            fis.set('namespace', namespace);
            return this;
        },

		// 设置模块化
        setModule: function () {
            fis.hook('commonjs', {
                forwardDeclaration: true,
                skipBuiltinModules: true
            });

            // 修复 require('*:*') 导致manifest.json里面的deps里面自动加 .js
            var onFileLookup = function(info) {
                if (!info.file && /\.js$/.test(info.id)) {
                    info.id = info.id.replace(/\.js$/, '');
                }
            };

            fis.on('release:start', function() {
                fis.removeListener('lookup:file', onFileLookup);
                fis.on('lookup:file', onFileLookup);
            });

            return this;
        },

		// 设置文件id
		setId: function(){
			fis.match('/(**).{js,jsx,coffee,ts,tsx,es6,es}', {
				isMod: true,
				id: '$1'
			}, true);
			fis.match('/(**).{css,scss,sass,less,styl}', {
				id: '$1.css'
			}, true);
			return this;
		},

		// 设置构建后的文件名是否启用md5串
        setHash: function () {
            var targets = siteSettings.targets || {};
            for (var target in targets) {
                var destinationConfig = targets[target];
                if (destinationConfig.hash) {
                    fis.media(target).match('**', {
                        useHash: true
                    });
                }
            }
            return this;
        },

        setRelease: function () {
            var builds = [
                // dist目录下不产出
                {
                    glob: '/dist/**',
                    //important: true,
                    release: false
                },
                // html目录不产出
                {
                    glob: '/html/**',
                    //important: true,
                    release: false
                },
                // doc目录不产出
                {
                    glob: '/doc/**',
                    //important: true,
                    release: false
                },
                // version配置文件不产出
                {
                    glob: '/config.json',
                    //important: true,
                    release: false
                },
                // inline目录或文件名称中含有.inline.*的文件或inline目录下的文件不压缩不进行模块化
                {
                    reg: /^.*?[./]inline(\.|(\/.+\.))[\w\W]+$/,
                    isMod: false,
                    useMap: false,
                    optimizer: false
                    //important: true
                }
            ];
			var builds = common.getBuilds();
            // builds = builds.concat(common.getBuilds());
            builds.forEach(function (v) {
                var selector,media;
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
                var important = v.important || null;
                delete v.i;
                delete v.glob;
                delete v.reg;
                delete v.important;

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
                            //var domain = targets[target].domain;
                            //domain = v.domain.replace(/\{\{domain\}\}/g, domain);
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
            fis.get('project.ignore').push('dist/**');
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
        },

        setReplace: function () {

            // 普通文件解析
            fis.match('**',{
                parser: replaceParser
            });

            return this;
        },
        setPlugin: function () {
            configs.plugin = configs.plugin || {};

            // coffee支持
            fis.match('**.coffee', {
                parser: [fis.plugin('coffee-script', {
					sourceMap: true
				}), replaceParser], //启用fis-parser-sass插件
                rExt: '.js'
            });

            // typescript支持
            fis.match('**.{js,es,es6,ts,tsx,jsx}', {
                parser: [fis.plugin('typescript', {
					sourceMap: true
				}), replaceParser],
                rExt: '.js'
            });

            //sass支持
            fis.match('**.{scss,sass}', {
                parser: [fis.plugin('node-sass', configs.plugin['sass']), replaceParser], //启用fis-parser-sass插件
                rExt: '.css'
            });

            // less支持
            fis.match('**.less', {
                parser: [fis.plugin('less-2.x', configs.plugin['less']), replaceParser], //启用fis-parser-sass插件
                rExt: '.css'
            });

            // stylus 语法支持
            fis.match('**.styl',{
                parser: [fis.plugin('stylus', configs.plugin['stylus']), replaceParser],
                rExt: '.css'
            });

            return this;
        },
        setOptimizer: function () {
            var targets = siteSettings.targets;
            for (var target in targets) {
                var obj = targets[target] || {};
                var compress = obj.compress || {};
                if (compress.js !== false) {
                    fis.media(target).match('*.{js,jsx,ts,tsx,es6,es,coffee}', {
                        optimizer: fis.plugin('uglify-js', configs.plugin['uglifyjs'])
                    });
                }
                if (compress.css !== false) {
                    fis.media(target).match('*.{css,scss,sass,less,styl}', {
                        optimizer: fis.plugin('clean-css', configs.plugin['cleancss'])
                    });
                }
                if (compress.png !== false) {
                    fis.media(target).match('*.png', {
                        optimizer: fis.plugin('png-compressor', configs.plugin['pngcompressor'])
                    });
                }
            }
            return this;
        }
    };
    Deal.init();

    function replaceParser(content, file, conf) {
		// console.log(file.getId());
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
			console.log(file.id)
		}
        return content;
    }



};
