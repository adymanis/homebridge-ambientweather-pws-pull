# homebridge-ambientweather-pws-pull Plugin
Forked from https://github.com/homebridge/homebridge this HomeBridge plugin was modified to intereact with Ambient Weathers API and 
parse json output of a specific temprature sensor. Specfically needed it to send temp from my pool to HomeKit.


## Installation

First of all you need to have [Homebridge] installed. Refer to the repo for 
instructions.  
Then run the following command to install `homebridge-ambientweather-pws-pull`

```
sudo npm install -g homebridge-ambientweather-pws-pull
```

## Updating the temperature in HomeKit

The _'CurrentTemperature'_ characteristic has the permission to `notify` the HomeKit controller of state 
changes. `homebridge-ambientweather-pws-pull` supports two concepts to send temperature changes to HomeKit.

### The 'pull' way:

The 'pull' way is probably the easiest to set up and supported in every scenario. `homebridge-ambientweather-pws-pull` 
requests the temperature of the sensor in an specified interval (pulling) and sends the value to HomeKit.  
Look for `pullInterval` in the list of configuration options if you want to configure it.


## Configuration

The configuration can contain the following properties:

##### Basic configuration options:

* `accessory` \<string\> **required**: Defines the plugin used and must be set to **"HTTP-TEMPERATURE"** for this plugin.
* `name` \<string\> **required**: Defines the name which is later displayed in HomeKit
* `getUrl` \<string |  [urlObject](#urlobject)\> **required**: Defines the url (and other properties when using 
    and urlObject) to query the current temperature (in celsius) from the sensor. By default it expects the http server 
    to return the temperature as a float ranging from 0-100 (step 0.1).
* `unit` \<string\> **optional** \(Default: **"celsius**\): Defines unit expected from the http server. The following 
    are available:
    * **"celsius"**: Using celsius to calculate temperature
    * **"fahrenheit"**: Using fahrenheit to calculate temperature

##### Advanced configuration options:

* `statusCache` \<number\> **optional** \(Default: **0**\): Defines the amount of time in milliseconds a queried value 
   of the _CurrentTemperature_ characteristic is cached before a new request is made to the http device.  
   Default is **0** which indicates no caching. A value of **-1** will indicate infinite caching.

- `pullInterval` \<integer\> **optional**: The property expects an interval in **milliseconds** in which the plugin 
    pulls updates from your http device. For more information read [pulling updates](#the-pull-way).

- `debug` \<boolean\> **optional**: Enable debug mode and write more logs.

Below are two example configurations. One is using a simple string url and the other is using a simple urlObject.  
Both configs can be used for a basic plugin configuration.
```json
{
    "accessories": [
        {
          "accessory": "HTTP-TEMPERATURE",
          "name": "Pool Temperature",
          "getUrl": "https://rt.ambientweather.net/v1/devices?applicationKey=XXXXXX&apiKey=XXXXXX",
          "jsonField": "temp1f"
        }   
    ]
}
```
```json
{
    "accessories": [
        {
          "accessory": "HTTP-TEMPERATURE",
          "name": "Temperature Sensor",
          
          "getUrl": {
            "url": "https://rt.ambientweather.net/v1/devices?applicationKey=XXXXXX&apiKey=XXXXXX",
            "jsonField": "temp1f",
            "method": "GET"
          }
        }   
    ]
}
```

#### UrlObject

A urlObject can have the following properties:
* `url` \<string\> **required**: Defines the url pointing to your http server
* `method` \<string\> **optional** \(Default: **"GET"**\): Defines the http method used to make the http request
* `body` \<any\> **optional**: Defines the body sent with the http request. If value is not a string it will be
converted to a JSON string automatically.
* `strictSSL` \<boolean\> **optional** \(Default: **false**\): If enabled the SSL certificate used must be valid and 
the whole certificate chain must be trusted. The default is false because most people will work with self signed 
certificates in their homes and their devices are already authorized since being in their networks.
* `auth` \<object\> **optional**: If your http server requires authentication you can specify your credential in this 
object. When defined the object can contain the following properties:
    * `username` \<string\> **required**
    * `password` \<string\> **required**
    * `sendImmediately` \<boolean\> **optional** \(Default: **true**\): When set to **true** the plugin will send the 
            credentials immediately to the http server. This is best practice for basic authentication.  
            When set to **false** the plugin will send the proper authentication header after receiving an 401 error code 
            (unauthenticated). The response must include a proper `WWW-Authenticate` header.  
            Digest authentication requires this property to be set to **false**!
* `headers` \<object\> **optional**: Using this object you can define any http headers which are sent with the http 
request. The object must contain only string key value pairs.  
* `requestTimeout` \<number\> **optional** \(Default: **20000**\): Time in milliseconds specifying timeout (Time to wait
    for http response and also setting socket timeout).
  
Below is an example of an urlObject containing the basic properties:
```json
{
  "url": "http://example.com:8080",
  "method": "GET",
  "body": "exampleBody",
  
  "strictSSL": false,
  
  "auth": {
    "username": "yourUsername",
    "password": "yourPassword"
  },
  
  "headers": {
    "Content-Type": "text/html"
  }
}
```

**Available characteristics (for the POST body)**

Down here are all characteristics listed which can be updated with an request to the `homebridge-http-notification-server`

* `characteristic` "CurrentTemperature": expects an float `value` in a range of 0-100 (step 0.1)
