
const ASSERT = require("assert");
const REQUEST = require("request");
const SERVICE = require("../node_modules/openpeer/dev/helpers/service");


exports.hook = function(app, config, options) {

	// Proxy the bootstrapping request and modify it to fit our needs.
	app.post(/^\/\.well-known\/openpeer-services-get$/, function(req, res, next) {

		return REQUEST({
			method: "POST",
			url: "https://" + config.options.REAL_IDENTITY_HOST + "/.well-known/openpeer-services-get",
			body: JSON.stringify(req.body),
			headers: {
				"Content-Type": "application/json"
			}
		}, function (err, response, body) {
			if (err) return next(err);
			if (response.statusCode !== 200) {
				res.writeHead(response.statusCode);
				return res.end(body || "");
			}

			try {

				var data = JSON.parse(body);

				ASSERT(typeof data.result === "object");
				ASSERT(typeof data.result.services === "object");
				ASSERT(typeof data.result.services.service === "object");

				for (var i=0 ; i<data.result.services.service.length ; i++) {

					var service = data.result.services.service[i];

                    if (service.type === "identity-lockbox") {
                        data.result.services.service = data.result.services.service.splice(i, 1);
                        i--;
                        continue;
                    }

                    if (!Array.isArray(service.methods.method)) {
                        service.methods.method = [ service.methods.method ];
                    }
                    service.methods.method = service.methods.method.map(function(method) {
                        if (
//                            method.name === "finders-get" ||
                            method.name === "signed-salt-get" ||
                            method.name === "certificates-get"
                        ) {
                            return method;
                        }
                        method.uri = "http://" + req.headers.host + "/.helpers/" + method.name;
                        return method;
                    });

					if (service.type === "bootstrapped-finders") {
						service.methods.method = service.methods.method.filter(function(method) {
							if (method.name === "finders-get") return false;
							return true;
						});
						service.methods.method.push({
							name: "finders-get",
							uri: "http://" + req.headers.host + "/.op/bootstrapped-finders/finders-get"
						});
					} else
					if (service.type === "identity") {
						service.methods.method.push({
							name: "identity-access-start",
							uri: "http://" + req.headers.host + "/.op/identity/identity-access-start"
						});
						service.methods.method = service.methods.method.filter(function(method) {
							if (method.name === "identity-lookup-update") return false;
							if (method.name === "identity-access-lockbox-update") return false;
							return true;
						});
						service.methods.method.push({
							name: "identity-lookup-update",
							uri: "http://" + req.headers.host + "/.op/identity/identity-lookup-update"
						});
						service.methods.method.push({
							name: "identity-access-lockbox-update",
							uri: "http://" + req.headers.host + "/.op/identity/identity-access-lockbox-update"
						});						
					} else
					if (service.type === "identity-lookup") {
						if (!Array.isArray(service.methods.method)) {
							service.methods.method = [ service.methods.method ];
						}
						service.methods.method = service.methods.method.filter(function(method) {
							if (method.name === "identity-lookup") return false;
							return true;
						});
						service.methods.method.push({
							name: "identity-lookup",
							uri: "http://" + req.headers.host + "/.op/identity-lookup/identity-lookup"
						});
					}
				}

                data.result.services.service.push({
                    type: "identity-lockbox",
                    methods: {
                        method: [
                            {
                                name: "lockbox-access",
                                uri: "http://" + req.headers.host + "/.op/lockbox/lockbox-access"
                            },
                            {
                                name: "lockbox-identities-update",
                                uri: "http://" + req.headers.host + "/.op/lockbox/lockbox-identities-update"
                            },
                            {
                                name: "lockbox-content-set",
                                uri: "http://" + req.headers.host + "/.op/lockbox/lockbox-content-set"
                            },
                            {
                                name: "lockbox-content-get",
                                uri: "http://" + req.headers.host + "/.op/lockbox/lockbox-content-get"
                            }                            
                        ]
                    }
                });

				var data = JSON.stringify(data);
				res.writeHead(200, {
					"Content-Type": "application/json",
					"Content-Length": data.length
				});
				return res.end(data);

			} catch(err) {
				return next(err);
			}
		});

	});

	var responder = SERVICE.responder(options, function(request, options, callback) {
		if (request.$handler === "bootstrapped-finders" && request.$method === "finders-get") {
			return callback(null, SERVICE.nestResponse(["finders", "finderBundle"], {
	            "finder": {
	                "$id": "c14de2cad95b5b9ce000933d74b20cc6a2c0e275",
	                "protocols": {
	                    "protocol": {
	                        "transport": "websocket",
	                        "srv": request.req.headers.host,
	                        "path": "/.op/finder"
	                    }
	                },
	                "key": {
	                    "x509Data": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwIw4uEJG3QAeL/sq7hFfqVhCMyOPOM8TwsN0qZ/AxyJ6DbCl8fY27hSqcnzbDvotMBnGzZRLcQ9n/6/9CREIutTqgC11MWTLBr1AZPz4TliWy3RIhJGYw7ddKkmuIiYfkShBV1k2paXoX4wWdEtUgzT73Ts4RrSmN0rG1fw7ttzHtYdmP6Un3SdGixHUsXdeh4/GE18zTkq7uzV3OrmaFYat8XL9mBz2SAGOl8Bn8lpRZ2rXDju4NNy18mHmaUQ34lnetk3DoVEBvaIVEJzqhzAJ4xj9s2HZ14lgtK38W/2mKjZ0RRtTtFoPFW8c3qp+o74tGnkObSZPD2KiMvoDsQIDAQAB"
	                },
	                "priority": 0,
	                "weight": 10,
	                "region": "1",
	                "created": 1366113803,
	                "expires": 1397649803
	            },
	            "signature": {
	                "reference": "#c14de2cad95b5b9ce000933d74b20cc6a2c0e275",
	                "algorithm": "http://openpeer.org/2012/12/14/jsonsig#rsa-sha1",
	                "digestValue": "781d2cf7b5d1211646e3d74b404967e672337313",
	                "digestSigned": "VKpocgPlI08sj565cgTBtfc6Giw+x5jclQFgm+hbLg8q7X1oumKAbTBVuybZkCvI6FDZ3BsCIHAUxUvIMW5BgluwdGGzmliiIQ/ers/O/ozBSOWdcnj4vSgsU9k9bC4OFM8Hk7F7bVg6edmNAq8H3IVrrAEZr8spx5HCKAuXhJ+FurRsLXTpdCk2EGH06/qEb+H4zSert3P/GgSY07diOWkqqePLqi8GbkXFf8V+r06RVN2vL1WPX2FGELnUWTrmADIsGOJ1iDjtH86xWZjEmoVaZyLv3pfulqbsqGWLerktNlBo0aJ2knzESqKRXIE0GuTzRxmQ3qoj0BAqEMh7pg==",
	                "key": {
	                    "$id": "8d6062d23e84e9cd5f18134ba9531a48bd45fbab",
	                    "domain": "unstable.hookflash.me",
	                    "service": "bootstrapped-finders"
	                }
	            }
			}));
		}
	});

	app.post(/^\/\.op\/bootstrapped-finders\/finders-get$/, responder);
}
