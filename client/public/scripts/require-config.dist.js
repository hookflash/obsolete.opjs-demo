require.config({
    deps: ['%REQUIREJS_MAIN_MODULE%'],
    paths: {
        jquery: 'lib/jquery',
        _: 'lib/lodash',
        backbone: 'lib/backbone',
        layoutmanager: 'lib/backbone.layoutmanager',
        text: 'lib/text',
        templates: '../templates',
        db: 'lib/ydn.db',
        rolodex: "%ROLODEX_BASE_URL%/.openpeer-rolodex/client",
        "rolodex-presence": "%ROLODEX_BASE_URL%/.openpeer-rolodex-presence/client",
        opjs: '../../../server/node_modules/openpeer/lib',
        ortc: "../../../server/node_modules/openpeer/node_modules/ortc-over-rtc",
        cifre: "../../../server/node_modules/openpeer/node_modules/cifre",
        q: "../../../server/node_modules/openpeer-rolodex/node_modules/q"
    },
    shim: {
        transport: {
            deps: ['q']
        },
        _: {
            exports: '_'
        },
        rolodex: {
            deps: ['jquery']
        },
        backbone: {
            exports: 'Backbone',
            deps: ['jquery', '_']
        },
        db: {
            exports: 'ydn',
            deps: ['jquery']
        },
        layoutmanager: {
            // LayoutManager does not technically export Backbone (it is a plugin for
            // Backbone). Declaring this precludes the need to include both Backbone
            // and LayoutManager when what is desired is Backbone extended with
            // LayoutManager.
            exports: 'Backbone',
            deps: ['backbone']
        }
    }
});
