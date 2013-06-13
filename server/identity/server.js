
const REDIS = require("redis");
const SERVICE = require("../node_modules/openpeer/dev/helpers/service");
const OPJS_UTIL = require("../node_modules/openpeer/lib/util");
const OPJS_CRYPTO = require("../node_modules/openpeer/lib/crypto");


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

			function getDBKey(type, identity) {
				return [
					config.rolodex.db.redis.prefix,
					"identity",
					":",
					type,
					":",
					identity
				].join("");
			}

			if (request.$handler === "identity" && request.$method === "identity-access-start") {
				var parsedIdentity = OPJS_UTIL.parseIdentityURI(request.identity.base);
				// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityServiceRequests-IdentityAccessCompleteNotification
				var payload = {
					"identity": {
						// a verifiable token that is linked to the logged-in identity
						"accessToken": request.req.sessionID,
						// a secret that can be used in combination to the "identity access token" to provide proof of previous successful login
						"accessSecret": request.req.sessionID,
						"accessSecretExpires": Math.floor(Date.now()/1000) + 60,	// 60 seconds.
						"uri": request.identity.base,
						"provider": parsedIdentity.domain
						// TODO: Support `reloginKey`.
						//"reloginKey": "d2922f33a804c5f164a55210fe193327de7b2449-5007999b7734560b2c23fe81171af3e3-4c216c23"
					}
				};
				return callback(null, payload);
			} else
			if (request.$handler === "identity" && request.$method === "identity-access-lockbox-update") {
				return callback(null, {});
			} else
			if (request.$handler === "identity" && request.$method === "identity-lookup-update") {
				var identityParts = OPJS_UTIL.parseIdentityURI(request.identity.uri);
			    return db.set(getDBKey("peerfile", identityParts.identity), JSON.stringify({
					peer: request.identity.peer
				}), function (err, reply) {
			    	if (err) return callback(err);
			    	var publicPeerFile = OPJS_CRYPTO.parsePublicPeerFile({
			    		peer: request.identity.peer
			    	});
				    return db.set(getDBKey("peercontact", identityParts.identity), publicPeerFile.contact, function (err, reply) {
				    	if (err) return callback(err);
				    	return callback(null, {});
				    });
			    });
			}
		});

		app.post(/^\/\.op\/identity\/identity-access-start$/, responder);
		app.post(/^\/\.op\/identity\/identity-access-lockbox-update$/, responder);
		app.post(/^\/\.op\/identity\/identity-lookup-update$/, responder);

		return callback(null);
	}

	return connectToDB(function(err) {
		if (err) return callback(err);
		return registerRoutes(callback);
	});
}
