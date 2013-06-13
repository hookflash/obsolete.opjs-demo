*Status: DEV*

Open Peer JavaScript Demo
=========================

A comprehensive sample Open Peer browser client using the [Open Peer SDK for JavaScript](https://github.com/openpeer/opjs).

This project also incorporates:

  * Open Peer Cross-browser WebRTC API - https://github.com/openpeer/webrtc-shim
  * Open Peer Rolodex - https://github.com/openpeer/rolodex
  * Open Peer Rolodex Presence Plugin - https://github.com/openpeer/rolodex-presence

Deployments:

  * Production: http://webrtc.hookflash.me/
  * Staging: http://opjsdemostage-hookflash.dotcloud.com/

**NOTE: The `opjs` SDK and `webrtc-shim` are currently being integrated. This project is under heavy development.**


Development
-----------

Install:

    make install

Configure `config.local.json` (see *Configuration* below).

Run:

    make run

Test:

    make test

Production build:

    make dist


Deployment
----------

Deploy:

    make deploy

First time deploy setup for [dotCloud](http://dotcloud.com):

    sudo easy_install pip && sudo pip install dotcloud
    dotcloud setup

Initial [dotCloud](http://dotcloud.com) application setup:

    dotcloud create <name>

Configure `config.json` (see *Configuration* below).


Configuration
=============

    {
        "options": {
            "hostname": "localhost",
            "REAL_IDENTITY_HOST": "provisioning-stable-dev.hookflash.me",
            "ROLODEX_BASE_URL": "http://localhost:8080",
            "IDENTITY_DOMAIN": "unstable.hookflash.me",
            "IDENTITY_HOST": "http://localhost:8080"
        },
        "papertrail": {  // Optional
            "host": "logs.papertrailapp.com",
            "port": <port>
        },
        "sendgrid": {  // Optional
            "username": "<sendgrid.com API username>",
            "password": "<sendgrid.com API password>"
        },
        "rolodex": {
            // See 'Configuration' at https://github.com/openpeer/rolodex
        }
    }

*NOTE: The [rolodex](https://github.com/openpeer/rolodex) configuration is included in the config above
instead of placing it into its own file.*


License
=======

[BSD-2-Clause](http://opensource.org/licenses/BSD-2-Clause)
