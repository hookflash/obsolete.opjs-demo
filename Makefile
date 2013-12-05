
install:
	cd server; npm install

run:
	@cd server; npm start

test:
	@echo "Tests are currently not functional!"
#	@$(MAKE) ensure-grunt
#	@cd client; npm test

dist:
	@$(MAKE) ensure-grunt
	@cd client; grunt dist

deploy:
	@$(MAKE) dist
	@dotcloud push

ensure-grunt:
	@if [ ! -d "client/node_modules/grunt" ]; then cd client ; npm install; fi
	if ! hash grunt 2>/dev/null; then echo "*** LOCAL SUDO PASSWORD NEEDED HERE ***"; sudo npm install -g grunt-cli; fi

.PHONY: install run test dist deploy ensure-grunt
