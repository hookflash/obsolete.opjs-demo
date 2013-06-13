
define([
	"rolodex/client",
	"rolodex-presence/client"
], function(ROLODEX, ROLODEX_PRESENCE) {

	var rolodex = new ROLODEX({
//		baseURL: "http://webrtc.hookflash.me"
	});

	var rolodexPresnece = new ROLODEX_PRESENCE({
//		baseURL: "http://webrtc.hookflash.me",
		rolodex: rolodex
	});

	rolodex.on("services.fetched", function(services) {
		function renderService(serviceId, service) {

			console.log("Service Status", serviceId, services[serviceId]);

			var serviceHtml = null;

			if (service.loggedin) {

				serviceHtml = $("#service").clone();

				var html = serviceHtml.html();
				html = html.replace("{name}", serviceId);
				html = html.replace("{fetched}", service.contactsFetched);
				html = html.replace("{total}", service.contactsTotal);
				html = html.replace("{percent}", service.percentFetched);
				serviceHtml.html(html);

				var button = $("button.refetch", serviceHtml);
				button.click(function() {
					rolodex.refetchContacts(serviceId).then(function(data) {
						if (data.error) {
							var error = $("DIV.error", serviceHtml);
							error.removeClass("hidden");
							error.html(data.error.message);
							serviceHtml.addClass("error");
						}
					});
				});
				button = $("button.logout", serviceHtml);
				button.click(function() {
					rolodex.logoutService(serviceId);
				});

				if (service.error) {
					var error = $("DIV.error", serviceHtml);
					error.removeClass("hidden");
					error.html(service.error);
					serviceHtml.addClass("error");
				} else
				if (service.percentFetched === 100) {
					serviceHtml.addClass("fetched");
				}

			} else {

				serviceHtml = $("#service-auth").clone();
				var button = $("button.login", serviceHtml);
				button.html(button.html().replace("{name}", serviceId));
				button.click(function() {
					rolodex.loginService(serviceId);
				});
			}

			serviceHtml.attr("id", "service-" + serviceId);
			serviceHtml.removeClass("hidden");

			var existing = $("#service-" + serviceId);
			if (existing.length === 1) {
				existing.replaceWith(serviceHtml);
			} else {
				serviceHtml.appendTo("#services");
			}
		}
		for (var serviceId in services) {
			renderService(serviceId, services[serviceId]);
		}
	});

	rolodex.on("contacts.fetched", function(serviceId, contacts) {
		console.log("Contacts for", serviceId, contacts);

		rolodex.getContacts(null, {
			peerContact: /^peer:.*/
		}).then(function(contacts) {
			console.log("Open Peer Contacts", contacts);
		}).done();

		// TODO: Make this more generic so we can fetch details of any user via UI.
		rolodex.getContacts(serviceId, {
			nickname: /^cad/
		}).then(function(contacts) {
			console.log("Fetch full contact details for", contacts);
			for (var contactId in contacts) {
				rolodex.getFullContact(contacts[contactId].uid).then(function(detail) {
					console.log("Full contact detail for", contactId, detail);
				}).done();
			}
		});
	});

	rolodex.on("contact.added", function(uid, info) {
		console.log("Contact added", uid, info);
	});

	rolodex.on("contact.removed", function(uid, info) {
		console.log("Contact removed", uid, info);
	});


	function syncContactStatus(peerContact, type, extra) {
		return rolodex.getContact(peerContact).then(function(contact) {

			var onlineContactsNode = $("#federated > DIV.online-contacts");
			var domId = "online-contact-" + peerContact.replace(/[\/:\.]/g, "-");
			var onlineContactNode = $("#" + domId, onlineContactsNode);

			if (!contact || !contact.peerContact) {
				if (onlineContactNode.length !== 0) {
					onlineContactNode.remove();
				}
				return;
			}

			if (onlineContactNode.length === 0) {
				onlineContactNode = $("#online-contact").clone();

				var html = onlineContactNode.html();
				html = html.replace("{name}", contact.fn || contact.nickname);
				onlineContactNode.html(html);

				var messagesNode = $("div.messages", onlineContactNode);

				var sendTextarea = $("textarea.send", onlineContactNode);
				sendTextarea.keydown(function(key) {
					if (key.keyCode === 13) {	// Return

						var message = $(this).val();

						console.log("Send message", message, "to", peerContact);
						rolodexPresnece.sendMessage(peerContact, message);

						$('<div class="sent">' + message + '</div>').appendTo(messagesNode);
						messagesNode.animate({"scrollTop": messagesNode[0].scrollHeight}, "fast");

						$(this).val("");
						return false;
					}
		        });

				onlineContactNode.attr("id", domId);
				onlineContactNode.removeClass("hidden");
				onlineContactNode.appendTo(onlineContactsNode);
			}

			if (type === "back") type = "online";

			$("div.status", onlineContactNode).html(type.toUpperCase());
		}).done();
	}

	function recordReceivedMessage(peerContact, message) {
		var onlineContactsNode = $("#federated > DIV.online-contacts");
		var domId = "online-contact-" + peerContact.replace(/[\/:\.]/g, "-");
		var onlineContactNode = $("#" + domId, onlineContactsNode);
		var messagesNode = $("div.messages", onlineContactNode);
		$("<div>" + message + "</div>").appendTo(messagesNode);
		messagesNode.animate({"scrollTop": messagesNode[0].scrollHeight}, "fast");
	}

	rolodexPresnece.on("online", function() {
		console.log("Online");
		$("#status").html("ONLINE");
	});
	rolodexPresnece.on("offline", function() {
		console.log("Offline");
		$("#status").html("OFFLINE");
	});
	rolodexPresnece.on("away", function() {
		console.log("Away");
		$("#status").html("AWAY");
	});
	rolodexPresnece.on("back", function() {
		console.log("Back");
		$("#status").html("BACK");
	});

	rolodexPresnece.on("contact.online", function(peerContact) {
		console.log("Contact online", peerContact);
		syncContactStatus(peerContact, "online");
		console.log("Online contacts", rolodexPresnece.getOnlineContacts());
	});
	rolodexPresnece.on("contact.offline", function(peerContact) {
		console.log("Contact offline", peerContact);
		syncContactStatus(peerContact, "offline");
		console.log("Online contacts", rolodexPresnece.getOnlineContacts());
	});
	rolodexPresnece.on("contact.away", function(peerContact) {
		console.log("Contact away", peerContact);
		syncContactStatus(peerContact, "away");
		console.log("Online contacts", rolodexPresnece.getOnlineContacts());
	});
	rolodexPresnece.on("contact.back", function(peerContact) {
		console.log("Contact back", peerContact);
		syncContactStatus(peerContact, "back");
		console.log("Online contacts", rolodexPresnece.getOnlineContacts());
	});
	rolodexPresnece.on("contact.message", function(peerContact, message) {
		console.log("Got message", message, "from", peerContact);
		recordReceivedMessage(peerContact, message);
	});

	rolodexPresnece.on("logout", function() {
		var node = $("#loggedout").clone();
		node.removeAttr("id");
		node.removeClass("hidden");
		$("#federated").addClass("hidden");
		$("#services").replaceWith(node);
	});

});
