"use strict";

let Service, Characteristic, api;

const _http_base = require("homebridge-http-base");
const http = _http_base.http;
const configParser = _http_base.configParser;
const PullTimer = _http_base.PullTimer;
const notifications = _http_base.notifications;
const Cache = _http_base.Cache;
const utils = _http_base.utils;

const packageJSON = require("./package.json");

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    api = homebridge;

    homebridge.registerAccessory("homebridge-ambientweather-pws-pull", "HTTP-TEMPERATURE", HTTP_TEMPERATURE);
};

const TemperatureUnit = Object.freeze({
   Celsius: "celsius",
   Fahrenheit: "fahrenheit"
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

function HTTP_TEMPERATURE(log, config) {
    this.log = log;
    this.name = config.name;
    this.debug = config.debug || true;

    if (config.getUrl) {
        try {
            this.getUrl = configParser.parseUrlProperty(config.getUrl);
        } catch (error) {
            this.log.warn("Error occurred while parsing 'getUrl': " + error.message);
            this.log.warn("Aborting...");
            return;
        }
    }
    else {
        this.log.warn("Property 'getUrl' is required!");
        this.log.warn("Aborting...");
        return;
    }

    this.unit = utils.enumValueOf(TemperatureUnit, config.unit, TemperatureUnit.Celsius);
    if (!this.unit) {
        this.unit = TemperatureUnit.Celsius;
        this.log.warn(`${config.unit} is an unsupported temperature unit! Using default!`);
    }

    this.statusCache = new Cache(config.statusCache, 0);
    this.jsonField = 'tempf';
    try {
        if (config.jsonField)
            this.jsonField = (configParser.parsePattern(config.jsonField).replace('/',''));
    } catch (error) {
        this.log.warn("Property 'jsonField' was given in an unsupported type. Using default one!");
    }
    this.patternGroupToExtract = 1;
    if (config.patternGroupToExtract) {
        if (typeof config.patternGroupToExtract === "number")
            this.patternGroupToExtract = config.patternGroupToExtract;
        else
            this.log.warn("Property 'patternGroupToExtract' must be a number! Using default value!");
    }

    this.homebridgeService = new Service.TemperatureSensor(this.name);
    this.homebridgeService.getCharacteristic(Characteristic.CurrentTemperature)
        .setProps({
                    minValue: -100,
                    maxValue: 100
                })
        .on("get", this.getTemperature.bind(this));

    /** @namespace config.pullInterval */
    if (config.pullInterval) {
        this.pullTimer = new PullTimer(log, config.pullInterval, this.getTemperature.bind(this), value => {
            this.homebridgeService.setCharacteristic(Characteristic.CurrentTemperature, value);
        });
        this.pullTimer.start();
    }

    /** @namespace config.notificationPassword */
    /** @namespace config.notificationID */
    notifications.enqueueNotificationRegistrationIfDefined(api, log, config.notificationID, config.notificationPassword, this.handleNotification.bind(this));

}

HTTP_TEMPERATURE.prototype = {

    identify: function (callback) {
        this.log("Identify requested!");
        callback();
    },

    getServices: function () {
        if (!this.homebridgeService)
            return [];

        const informationService = new Service.AccessoryInformation();

        informationService
            .setCharacteristic(Characteristic.Manufacturer, "Ambient Weather")
            .setCharacteristic(Characteristic.Model, "Ambient Weather PWS API")
            .setCharacteristic(Characteristic.SerialNumber, "TS01")
            .setCharacteristic(Characteristic.FirmwareRevision, packageJSON.version);

        return [informationService, this.homebridgeService];
    },

    handleNotification: function(body) {
        const characteristic = utils.getCharacteristic(this.homebridgeService, body.characteristic);
        if (!characteristic) {
            this.log("Encountered unknown characteristic when handling notification (or characteristic which wasn't added to the service): " + body.characteristic);
            return;
        }

        let value = body.value;
        if (body.characteristic === "CurrentTemperature" && this.unit === TemperatureUnit.Fahrenheit)
            value = (value - 32) * 5/9;

        if (this.debug)
            this.log("Updating '" + body.characteristic + "' to new value: " + body.value);
        characteristic.updateValue(value);
    },

    getTemperature: function (callback) {
        if (!this.statusCache.shouldQuery()) {
            const value = this.homebridgeService.getCharacteristic(Characteristic.CurrentTemperature).value;
            if (this.debug)
                this.log(`getTemperature() returning cached value ${value}${this.statusCache.isInfinite()? " (infinite cache)": ""}`);

            callback(null, value);
            return;
        }

        http.httpRequest(this.getUrl, (error, response, body) => {
            if (this.pullTimer)
                this.pullTimer.resetTimer();

            if (error) {
                this.log("getTemperature() failed: %s", error.message);
                callback(error);
            }
            else if (!http.isHttpSuccessCode(response.statusCode)) {
                this.log("getTemperature() returned http error: %s", response.statusCode);
                callback(new Error("Got http error code " + response.statusCode));
            }
            else {
                let temperature;
                try {
                    const jsonbody = JSON.parse(body);
                    //temperature = jsonutils.extractValueFromPattern(this.jsonField, body, this.patternGroupToExtract);
                    temperature = jsonbody[0].lastData[this.jsonField]
                } catch (error) {
                    this.log("getTemperature() error occurred while extracting temperature from body: " + error.message);
                    callback(new Error("pattern error"));
                    return;
                }

                if (this.unit === TemperatureUnit.Fahrenheit)
                    temperature = (temperature - 32) * 5/9;

                if (this.debug)
                    this.log("Temperature is currently at %s celsius for %s" , temperature, this.jsonField);

                this.statusCache.queried();
                callback(null, temperature);
            }
        });
    },

};
