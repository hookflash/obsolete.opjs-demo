
const UTIL = require("util");
const PATH = require("path");
const URL = require("url");
const FS = require("fs-extra");
const EXPRESS = require("express");
const WINSTON = require("winston");
// Expose `winston.transports.Papertrail`.
require("winston-papertrail");
const CONNECT_REDIS = require("connect-redis");

const SENDGRID = require("sendgrid");

const ROLODEX = require("openpeer-rolodex");
const ROLODEX_PRESENCE = require("openpeer-rolodex-presence");

const BOOTSTRAPPER_SERVER = require("./bootstrapper/server");
const IDENTITY_SERVER = require("./identity/server");
const LOCKBOX_SERVER = require("./lockbox/server");
const FINDER_SERVER = require("openpeer/dev/helpers/finder-server/server");


const PORT = process.env.PORT || 8080;

const LIVE_DEBUG = true;


var serviceUid = false;
if (FS.existsSync(PATH.join(__dirname, "../service.json"))) {
    serviceUid = JSON.parse(FS.readFileSync(PATH.join(__dirname, "../service.json"))).uid;
}


exports.main = function(callback) {
    try {

        var mode = "dev";
        var hostname = "localhost";

        if (!FS.existsSync(PATH.join(__dirname, "../.git"))) {
            mode = "live";
            hostname = "webrtc.hookflash.me";
        }

        var config = JSON.parse(FS.readFileSync(PATH.join(__dirname, "../config" + ((mode==="dev")?".local":"") + ".json")));

        if (mode === "live") {
            config.options.REQUIREJS_MAIN_MODULE = "dist/app";
        } else {
            config.options.REQUIREJS_MAIN_MODULE = "app";
        }

        function initLogger() {
            var transports = [
                new WINSTON.transports.Console({
                    level: (mode==="dev" || LIVE_DEBUG) ? "debug" : "warn",
                    timestamp: function() {
                        return new Date().toString();
                    },
                    colorize: true
                })
            ];
            if (mode === "live" && config.papertrail) {
                var papertrailTransport = new WINSTON.transports.Papertrail({
                    host: config.papertrail.host,
                    port: config.papertrail.port,
                    level: (mode==="dev" || LIVE_DEBUG) ? "debug" : "warn",
                    hostname: config.options.hostname,
                    logFormat: function(level, message) {
                        return '<<<' + level + '>>> ' + message;
                    }
                });
                papertrailTransport.on("error", function(err) {
                    if (logger) {
                        return logger.error(err);
                    }
                    console.error(err);
                });
                papertrailTransport.on("connect", function(message) {
                    if (logger) {
                        return logger.info(message);
                    }
                    console.info(message);
                });
                transports.push(papertrailTransport);
            }
            var logger = new WINSTON.Logger({
                transports: transports
            });
            var api = {};
            [
                "debug",
                "info",
                "warn",
                "error"
            ].forEach(function(level) {
                api[level] = function() {
                    return logger[level].call(null, Array.prototype.slice.call(arguments).map(function(segment) {
                        return UTIL.inspect(segment).replace(/\\n/g, "\n");
                    }).join(" "));
                };
            });
            return api;
        }

        var logger = initLogger();

        var app = EXPRESS();

        app.use(function(req, res, next) {
            if (serviceUid) {
                res.setHeader("x-service-uid", serviceUid);
            }
            if (req.headers.origin) {
                var origin = null;
                if (config.rolodex.allow && config.rolodex.allow.hosts) {
                    var parsedOrigin = URL.parse(req.headers.origin);
                    config.rolodex.allow.hosts.forEach(function(host) {
                        if (origin) return;
                        if (
                            host === parsedOrigin.host ||
                            host === parsedOrigin.hostname
                        ) {
                            origin = req.headers.origin;
                        }
                    });
                }
                if (origin) {
                    res.setHeader("Access-Control-Allow-Methods:", "GET, POST, OPTIONS");
                    res.setHeader("Access-Control-Allow-Credentials", "true");
                    res.setHeader("Access-Control-Allow-Origin", origin);
                    res.setHeader("Access-Control-Allow-Headers:", req.headers["access-control-request-headers"] || "");
                }
            }
            if (req.method === "OPTIONS") {
                res.writeHead(200);
                return res.end()
            }
            return next();
        });

        //app.use(EXPRESS.logger());
        app.use(EXPRESS.cookieParser());
        app.use(EXPRESS.bodyParser());
        app.use(EXPRESS.session({
            key: "sid",
            store: new (CONNECT_REDIS(EXPRESS))({
                host: config.rolodex.db.redis.host,
                port: config.rolodex.db.redis.port,
                pass: config.rolodex.db.redis.password
            }),
            cookie: {
                path: "/",
                httpOnly: true,
                maxAge: 60 * 60 * 24 * 30 * 1000    // 30 days
            },
            secret: "jksdopidf878743JSJ388DKSFNopr836747DJSPsms"
        }));

        if (config.sendgrid) {
            var sendgrid = new SENDGRID.SendGrid(config.sendgrid.username, config.sendgrid.password);

            // TODO: Only allow limited number of invites to be sent within X amout of time.
            app.get(/^\/invite$/, function (req, res, next) {
                var message;
                if (req.query && req.query.contactemail) {
                    console.log("send invite email to", req.query.contactemail);
                    sendgrid.send({
                        to: req.query.contactemail,
                        from: req.query.useremail || "info@webrtc.hookflash.com",
                        subject: 'Invitation to OpenPeer Demo',
                        text: 'A contact of yours is using http://webrtc.hookflash.me and requested that you join a video chat with them. You will need to use Chrome 26 or later.'
                    }, function(success, message) {
                        if (!success) {
                            console.error("[sendgrid]", message);
                        }
                    });
                    message = {"done": "true"};
                } else {
                    message = {"fail": "true"};
                }
                res.writeHeader(200, {"Content-Type": "application/json"});
                res.end(JSON.stringify(message));
            });
        } else {
            app.get(/^\/invite$/, function (req, res, next) {
                res.writeHeader(200, {"Content-Type": "application/json"});
                res.end(JSON.stringify({"fail": "true"}));
            });
        }

        BOOTSTRAPPER_SERVER.hook(app, config, {});

        return IDENTITY_SERVER.hook(app, config, {}, function(err) {
            if (err) return callback(err);

            return LOCKBOX_SERVER.hook(app, config, {}, function(err) {
                if (err) return callback(err);

                return ROLODEX.hook(app, config.rolodex, {
                    hostname: config.options.hostname,
                    port: (mode==="dev") ? PORT : null,
                    debug: (mode==="dev" || LIVE_DEBUG) ? true : false,
                    logger: logger
                }, function(err, rolodex) {
                    if (err) return callback(err);

                    return ROLODEX_PRESENCE.hook(app, {}, {
                        rolodex: rolodex,
                        hostname: config.options.hostname,
                        port: (mode==="dev") ? PORT : null,
                        debug: (mode==="dev" || LIVE_DEBUG) ? true : false,
                        logger: logger
                    }, function(err, presenceServer) {
                        if (err) return callback(err);

                        mountStaticDir(app, /^\/lib\/opjs\/(.*)$/, PATH.join(__dirname, "node_modules/openpeer/lib"));
                        mountStaticDir(app, /^\/lib\/ortc\/(.*)$/, PATH.join(__dirname, "node_modules/openpeer/node_modules/ortc"));
                        mountStaticDir(app, /^\/lib\/cifre\/(.*)$/, PATH.join(__dirname, "node_modules/openpeer/node_modules/cifre"));
                        mountStaticDir(app, /^\/lib\/q\/(.*)$/, PATH.join(__dirname, "node_modules/openpeer-rolodex/node_modules/q"));

                        app.get(/^\/scripts\/config\.js$/, function(req, res, next) {
                            var body = FS.readFileSync(PATH.join(__dirname, "../client/public/scripts/config.js")).toString();
                            for (var name in config.options) {
                                body = body.replace(new RegExp("%" + name + "%", "g"), config.options[name]);
                            }
                            res.writeHeader(200, {
                                "Content-Type": "application/javascript",
                                "Content-Length": body.length
                            });
                            res.end(body);
                        });

                        app.get(/^\/scripts\/require-config\.js$/, function(req, res, next) {
                            var body = FS.readFileSync(PATH.join(__dirname, "../client/public/scripts/require-config.js")).toString();
                            for (var name in config.options) {
                                body = body.replace(new RegExp("%" + name + "%", "g"), config.options[name]);
                            }
                            res.writeHeader(200, {
                                "Content-Type": "application/javascript",
                                "Content-Length": body.length
                            });
                            res.end(body);
                        });

                        mountStaticDir(app, /^\/(.*)$/, PATH.join(__dirname, "../client/public"), {
                            directoryIndex: "index.html"
                        });

                        mountStaticDir(app, /^\/\.rolodex\/(.*)$/, PATH.join(__dirname, "ui/.rolodex"));
                        mountStaticDir(app, /^\/\.rolodex\/(.*)$/, PATH.join(__dirname, "node_modules/openpeer-rolodex/example/ui"));

                        var server = app.listen(PORT);

                        presenceServer.hookServer(server);

                        return FINDER_SERVER.main({
                            server: server,
                            path: "/.op/finder"
                        }, function(err, info) {
                            if (err) return callback(err);

                            if (mode === "dev") {
                                logger.info("open http://localhost:" + PORT + "/");
                            } else {
                                logger.info("Started server");
                            }

                            return callback(null, {
                                server: server,
                                port: PORT
                            });
                        });
                    });
                });
            });
        });
    } catch(err) {
        return callback(err);
    }
}


function mountStaticDir(app, route, path, options) {
    app.get(route, function(req, res, next) {
        var originalUrl = req.url;
        req.url = req.params[0] || "";
        if (req.url === "") {
            if (options && options.directoryIndex) {
                req.url = options.directoryIndex;
            }
        }
        EXPRESS.static(path)(req, res, function() {
            req.url = originalUrl;
            return next.apply(null, arguments);
        });
    });
};


if (require.main === module) {
    exports.main(function(err) {
        if (err) {
            console.error(err.stack);
            process.exit(1);
        }
    });
}

