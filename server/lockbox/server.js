
const REDIS = require("redis");
const WAITFOR = require("waitfor");
const SERVICE = require("../node_modules/openpeer/dev/helpers/service");
const OPJS_UTIL = require("../node_modules/openpeer/lib/util");
const CRYPTO = require("../node_modules/openpeer/lib/crypto");


var DB_KEY_NS = 2;

exports.hook = function(app, config, options, callback) {

	var db = null;

	function connectToDB(callback) {
		db = REDIS.createClient(config.rolodex.db.redis.port, config.rolodex.db.redis.host);
		db.on("error", callback);
		if (config.rolodex.db.redis.password) {
			db.auth(config.rolodex.db.redis.password);
		}
		db.on("ready", function() {
			return callback(null);
		});
	}

	function registerRoutes(callback) {
		var responder = SERVICE.responder(options, function(request, options, callback) {

			function getDBKey(accessToken, ns) {
				return [
					config.rolodex.db.redis.prefix,
					DB_KEY_NS,
					":",
					"lockbox",
					":",
					request.req.sessionID,
					":",
					accessToken,
					":",
					ns
				].join("");
			}

			if (request.$handler === "lockbox" && request.$method === "lockbox-access") {
				return callback(null, {
			        "lockbox": {
			            "$id": CRYPTO.sha1(request.req.sessionID + ":" + request.identity.uri),
			            "accessToken": CRYPTO.sha1(request.req.sessionID),
			            "accessSecret": request.req.sessionID,
			            "accessSecretExpires": Math.floor(Date.now()/1000) + 60 * 60 * 24,	// 24 hours
			            "domain": request.lockbox.domain,
			            "keyLockboxHalf": CRYPTO.sha1(request.req.sessionID)
			        },
			        "grant": {
			            "$id": request.grant.$id,
			            "namespaces": {
			                "namespace": [
			                    {
			                        "$id": "https://meta.openpeer.org/ns/private-peer-file"
			                    }
			                ]
			            }
			        },
			        "identities": {
			            "identity": [
			                {
			                    "uri": request.identity.uri,
			                    "provider": request.identity.provider
			                }
			            ]
			        }
				});
			} else
			if (request.$handler === "lockbox" && request.$method === "lockbox-identities-update") {
				return callback(null, {
			        "identities": {
			            "identity": OPJS_UTIL.arrayForPayloadObject(request.identities.identity).map(function(identity) {
			                return {
			                    "uri": identity.uri,
			                    "provider": identity.provider
			                };
			            })
			        }
				});
			} else
			if (request.$handler === "lockbox" && request.$method === "lockbox-content-get") {
				var payload = {
			        "grant": {
				      "$id": request.grant.$id,
				      "namespaces":{
				        "namespace": []
				      }
				    }
				};
				var waitfor = WAITFOR.parallel(function(err) {
					if (err) return callback(err);
					return callback(null, payload);
				});
				OPJS_UTIL.arrayForPayloadObject(request.grant.namespaces.namespace).forEach(function(namespace) {
					waitfor(function(done) {
					    return db.get(getDBKey(request.lockbox.accessToken, namespace.$id), function (err, reply) {
					    	if (err) return done(err);
					    	if (reply) {
								payload.grant.namespaces.namespace.push({
						            "$id": namespace.$id,
						            "value": reply
								});
					    	}
					    	return done();
					    });
					});
				});
				return waitfor();
			} else
			if (request.$handler === "lockbox" && request.$method === "lockbox-content-set") {
				var waitfor = WAITFOR.parallel(function(err) {
					if (err) return callback(err);
					return callback(null, {});
				});
				OPJS_UTIL.arrayForPayloadObject(request.grant.namespaces.namespace).forEach(function(namespace) {
					waitfor(function(done) {
					    return db.set(getDBKey(request.lockbox.accessToken, namespace.$id), namespace.value, function (err, reply) {
					    	if (err) return done(err);
					    	return done();
					    });
					});
				});
				return waitfor();
			}
		});

		app.post(/^\/\.op\/lockbox\/lockbox-access$/, responder);
		app.post(/^\/\.op\/lockbox\/lockbox-identities-update$/, responder);
		app.post(/^\/\.op\/lockbox\/lockbox-content-get$/, responder);
		app.post(/^\/\.op\/lockbox\/lockbox-content-set$/, responder);

		return callback(null);
	}

	return connectToDB(function(err) {
		if (err) return callback(err);
		return registerRoutes(callback);
	});
}
