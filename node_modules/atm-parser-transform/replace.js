var rRequire = /"(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|(\/\/[^\r\n\f]+|\/\*[\s\S]+?(?:\*\/|$))|\b(require\.async|require)\s*\(\s*("(?:[^\\"\r\n\f]|\\[\s\S])*"|'(?:[^\\'\n\r\f]|\\[\s\S])*'|\[[\s\S]*?\])\s*/g;
var reg = /(@(require|async|require\.async)\s+)('[^']+'|"[^"]+"|[^\s;!@#%^&*()]+)/g;
module.exports = {
    parseJs: function(arg) {
        var content = arg.content;
        arg.content = content.replace(rRequire, function(m, comment, type, params) {
            if (type) {
                switch (type) {
                    case 'require.async':
                        var info = parseParams(params, arg.common);

                        m = 'require.async([' + info.params.map(function(v) {
                            return v;
                        }).join(',') + ']';
                        break;

                    case 'require':
                        var info = parseParams(params, arg.common);
                        var async = info.hasBrackets;

                        m = 'require(' + (async ? '[' : '') + info.params.map(function(v) {
                            return v;
                        }).join(',') + (async ? ']' : '');
                        break;
                }
            }

            return m;
        });

        return this.parseCss(arg);
    },
    parseCss: function (arg) {

        var content = arg.content;
        var common = arg.common;
        content = content.replace(reg, function(wds, a, b, id) {
            return a + common.transformId(id);
        });
        return content;
    }
};

function parseParams(value, common) {
    var hasBrackets = false;
    var params = [];

    value = value.trim().replace(/(^\[|\]$)/g, function(m, v) {
        if (v) {
            hasBrackets = true;
        }
        return '';
    });
    params = value.split(/\s*,\s*/);
    params = params.map(function (v) {
        var _v = v.replace(/'|"/g, '');
        return '\'' + common.transformId(_v) + '\'';
    });

    return {
        params: params,
        hasBrackets: hasBrackets
    };
}
