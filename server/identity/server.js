
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

		// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityServiceRequests-IdentityAccessInnerFrameWebpage
		app.get(/^\/\.op\/identity\/identity-access-inner-frame$/, function(req, res, next) {
			// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityServiceRequests-IdentityAccessWindowRequest
			var message = {
				"request": {
					"$domain": "provider.com",
					"$appid": "xyz123",
					"$id": "abd23",
					"$handler": "identity",
					"$method": "identity-access-window",
					"browser": {
					    "ready": true,
					    "visibility": true
					}
				}
			};
			var html = [
				'<!DOCTYPE html><html lang="en"><head>',
				'<script src="/scripts/lib/require.js"></script>',
				'<script>',
					'requirejs.config({',
						'paths: {',
							'opjs: "/lib/opjs"',
						'}',
					'});',
					'require([',
						'"opjs/util",',
						'"opjs/assert"',
					'], function(Util, ASSERT) {',

						'window.addEventListener("message", function(event) {',
				            'var request = null;',
				            'if (typeof event.data === "string" && event.data.substring(0, 1) === "{") {',
				           		'try {',
				              		'request = JSON.parse(event.data).notify;',
				            	'} catch(err) {}',
				          	'}',
				          	'if (request) {',
								'if (request.$handler === "identity") {',
									// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityServiceRequests-IdentityAccessStartNotification
									'if (request.$method === "identity-access-start") {',
										'ASSERT.equal(typeof request.agent, "object");',
										'ASSERT.equal(typeof request.identity, "object");',
										'ASSERT.equal(typeof request.browser, "object");',
										'var parsedIdentity = Util.parseIdentityURI(request.identity.base);',
										// @see http://docs.openpeer.org/OpenPeerProtocolSpecification/#IdentityServiceRequests-IdentityAccessCompleteNotification
										'var payload = {',
						                    '"$domain": request.$domain,',
						                    '"$appid": request.$appid,',
						                    '"$id": request.$id,',
						                    '"$handler": request.$handler,',
						                    '"$method": request.$method,',
											'"identity": {',
												// a verifiable token that is linked to the logged-in identity'
												'"accessToken": Util.randomHex(32),',
												// a secret that can be used in combination to the "identity access token" to provide proof of previous successful login
												'"accessSecret": Util.randomHex(32),',
												'"accessSecretExpires": Math.floor(Date.now()/1000) + 60,',  // 60 seconds.
												'"uri": request.identity.base,',
												'"provider": parsedIdentity.domain',
												// TODO: Support `reloginKey`.
												//"reloginKey": "d2922f33a804c5f164a55210fe193327de7b2449-5007999b7734560b2c23fe81171af3e3-4c216c23"
											'}',
										'};',
										'if (parsedIdentity.identity !== "test-lockbox-fresh") {',
											'payload.lockbox = {',
												'"domain": parsedIdentity.domain,',
												// TODO: Use Lockbox key set by client.
												'"keyIdentityHalf": "V20x...IbGFWM0J5WTIxWlBRPT0=",',
												'"reset": false',
											'};',
										'}',
										'event.source.postMessage(JSON.stringify({ result: payload }), event.origin);',
									'}',
								'}',
							'}',
						'}, false);',
						'window.parent.postMessage(JSON.stringify(' + JSON.stringify(message) + '), "*");',
					'});',
				'</script>',
				'</head><body></body></html>'
			].join('\n');
			res.writeHead(200, {
				"Content-Type": "text/html",
				"Content-Length": html.length
			});
			return res.end(html);
		});

		return callback(null);
	}

	return connectToDB(function(err) {
		if (err) return callback(err);
		return registerRoutes(callback);
	});
}
