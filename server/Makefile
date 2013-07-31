
postinstall:
	@if [ -d "/home/dotcloud/current" ]; then $(MAKE) postinstall-dotcloud; fi
	@if [ -d "/opt/node/app" ]; then $(MAKE) postinstall-dotcloud; fi
	cd bootstrapper; npm install --production
	cd node_modules/openpeer; npm install
	cd node_modules/openpeer-rolodex; npm install --production
	cd node_modules/openpeer-rolodex-presence; npm install --production
	cd node_modules/openpeer/dev/helpers/finder-server; npm install --production

postinstall-dotcloud:
	rm -Rf node_modules/openpeer-rolodex/node_modules
	cd node_modules/openpeer-rolodex; npm install --production
	cd node_modules/openpeer-rolodex/lib/services/facebook; npm install --production
	cd node_modules/openpeer-rolodex/lib/services/github; npm install --production
	cd node_modules/openpeer-rolodex/lib/services/linkedin; npm install --production
	cd node_modules/openpeer-rolodex/lib/services/twitter; npm install --production
	rm -Rf node_modules/openpeer-rolodex-presence/node_modules
	cd node_modules/openpeer-rolodex-presence; npm install --production
	npm rebuild node_modules/*
	npm rebuild node_modules/openpeer/dev/helpers/finder-server

.PHONY: postinstall postinstall-dotcloud
