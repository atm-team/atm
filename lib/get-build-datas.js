module.exports = function (args) {
	var target = args.target;
	var v = args.v;
	var configs = args.configs;
	var plugins = configs.plugins;
	var siteSettings = args.siteSettings;
	var closePlugins = siteSettings.targets[target].closePlugins || {};
	var extend = args.extend;

	if (v.target && v.target !== target) {
		return false;
	} else {
		if (v.domain && v.domain.indexOf('{{domain}}') > -1) {
			v.domain = lib.replacePlaceholder(v.domain, {
				domain: site.getDomain(target),
				router: common.getAssetsRouter(target)
			});
		}
		delete v.target;
	}

	// 处理plugin字段
	if (v.plugins) {
		for (var type in v.plugins) {
			var closeArr = closePlugins[type] = closePlugins[type] || [];
			var pluginDefaultConfigs = plugins[type] || {};
			var aliasArr = v.plugins[type];
			if (Array.isArray(aliasArr)) {
				v[type] = [];
				for (var i in aliasArr) {
					var alias = aliasArr[i];
					var aliasName;
					var aliasConfigs;
					var aliasDevConfigs;
					if (typeof alias === 'string') {
						aliasName = alias;
						aliasConfigs = {};
						aliasDevConfigs = {};
					} else if (Array.isArray(alias)) {
						aliasName = alias[0];
						aliasConfigs = alias[1] || {};
						aliasDevConfigs = alias[2] || {};
					}
					var pluginConfigs = pluginDefaultConfigs[aliasName] || {};
					if (closeArr.indexOf(aliasName) > -1 && pluginConfigs.allowClose) {
						// 忽略该规则
					} else {
						var config;
						if (target === 'dev') {
							config = extend(true, {}, pluginConfigs.options, aliasConfigs, pluginConfigs.devOptions, aliasDevConfigs);
						} else {
							config = extend(true, {}, pluginConfigs.options, aliasConfigs);
						}
						v[type].push(fis.plugin(pluginConfigs.name, config));
					}
				}
			}
		}
		delete v.plugins;
	}

	return v;
}
