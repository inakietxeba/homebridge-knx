# homebridge-knx Version 0.4 
[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url]   

KNX platform shim for homebridge.
**This cannot run stand-alone in node!**

Please also visit [homebridge github homepage](https://github.com/homebridge/homebridge) first.

Latest to homebridge-knx changes can be found in the [CHANGELOG.md](CHANGELOG.md)

### This can only be used with homebridge >=1.6 (including Homebridge v2) and Node >=20.0.0

### Prerequisites
This node module requires either 
  - a running (and properly configured) **knx daemon (knxd)**. You can find the latest version [here](https://github.com/knxd/knxd).  
  - another KNX router which can be reached by KNX multicasts.

I cannot support the knxd. Please address issues directly at the [knxd issue pages](https://github.com/knxd/knxd/issues). It might help to search the existing issues, as your problem might have been solved already.  

### Installation and running
- Install homebridge first, from [https://homebridge.io/](https://homebridge.io/); 
- Once you have your instance running (without any devices yet), go to the `Plugins` tab and type `knx` in the search box
- `homebridge-knx` should be within the top five hits (yes, there are alternatives), please check the name before installing
- Then put the configuration file *knx_config.json* into `~/.homebridge` (or another folder to your liking, but it should be readable and writable by user `homebridge` or group `homebridge` which is created by the homebridge installer), and adapt them to your needs (knxd address and some test devices in `knx_config.json`)
-  Eliminate everything (especially all group addresses) that might harm your KNX installation. Sending bus telegrams to your alarm device might wake the neighbourhood unpleasantly!
- If you used the default paths (~/.homebridge/knx_config.json) you can just restart homebridge using the GUI
- If you didn't, or want to use child bridges for more accessories (than 149) you need to configure homebridge (using the GUI e.g.). The following sample is from my test installation

```json
{
    "bridge": {
        "name": "Homebridge 17AF",
        "username": "0E:0B:9B:24:17:AD",
        "port": 51485,
        "pin": "880-83-869",
        "advertiser": "avahi"
    },
    "accessories": [],
    "platforms": [
        {
            "name": "Config",
            "port": 8581,
            "auth": "form",
            "theme": "auto",
            "tempUnits": "c",
            "lang": "en",
            "platform": "config"
        },
        {
            "name": "KNX",
            "platform": "KNX",
            "config_path": "/home/homebridge/dg-knx_config.json"
        },
        {
            "name": "KNX",
            "platform": "KNX",
            "config_path": "/home/homebridge/og-knx_config.json",
            "_bridge": {
                "username": "0E:0B:9B:24:17:00",
                "port": 51490
            }
        }
    ]
}
```


# Assumptions
Without using a special handler (add-in) for the service, homebridge-knx assumes the following:

HomeKit type | KNX addresses DPT   
-------- | ------  
Boolean | DPT1  
Integer | DPT5  
Percentage | DPT5.001  
Float | DPT9  


# knx_config.json
See the [complete Doc!](https://github.com/inakietxeba/homebridge-knx/blob/master/knx_config.json.md).


# Add-ins
Add-in (aka "handlers") can change the default behavior. [See the article](https://github.com/inakietxeba/homebridge-knx/blob/master/handler-add-in.md)

Happy testing!


[npm-url]: https://npmjs.org/package/homebridge-knx
[downloads-image]: http://img.shields.io/npm/dm/homebridge-knx.svg
[npm-image]: http://img.shields.io/npm/v/homebridge-knx.svg
