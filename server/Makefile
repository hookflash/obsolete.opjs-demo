
postinstall:
	@if [ -d "/home/dotcloud/current" ]; then $(MAKE) postinstall-dotcloud; fi
	cd bootstrapper; npm install --production
	cd node_modules/openpeer/dev/helpers/finder-server; npm install --production

postinstall-dotcloud:
	cd node_modules/openpeer-rolodex/lib/services/facebook; npm install --production
	cd node_modules/openpeer-rolodex/lib/services/github; npm install --production
	cd node_modules/openpeer-rolodex/lib/services/linkedin; npm install --production
	cd node_modules/openpeer-rolodex/lib/services/twitter; npm install --production
	npm rebuild . node_modules/*
	cd node_modules/openpeer/dev/helpers/finder-server; npm rebuild

.PHONY: postinstall postinstall-dotcloud
