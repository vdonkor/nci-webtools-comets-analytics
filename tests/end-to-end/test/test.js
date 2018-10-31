const request = require('request');
const should = require('chai').should();
const { expect } = require('chai');
const { Builder, By, Key, until } = require('selenium-webdriver');
const { checkUrl } = require('./util');

describe('Check Environmental Variables', function() {
    it('Website should be specified in the WEBSITE environmental variable', function() {
        const value = process.env.WEBSITE;
        should.exist(value);
        value.should.be.a('string');
        value.should.not.be.empty;
    });

    it('User should be specified in the USER environmental variable', function() {
        const value = process.env.USER;
        should.exist(value);
        value.should.be.a('string');
        value.should.not.be.empty;
    });

    it('Password should be specified in the PASSWORD environmental variable', function() {
        const value = process.env.PASSWORD;
        should.exist(value);
        value.should.be.a('string');
        value.should.not.be.empty;
    });
});

describe('Smoke Test', function() {
    this.timeout(0);

    before(async function() {
        this.driver = await new Builder().forBrowser('firefox').build();
        this.website = process.env.WEBSITE;
        this.user = process.env.USER;
        this.password = process.env.PASSWORD;
    });

    it('Website should be reachable', async function() {
        const result = await checkUrl(process.env.WEBSITE);
        result.should.be.true;
    });

    it('Test User should be able to log in', async function() {
        const driver = this.driver;
        const website = this.website;

        await driver.get(website);

        let el = await driver.findElement(By.name('email'));
        await driver.wait(until.elementIsVisible(el), 1000);
        await el.sendKeys(this.user);

        el = await driver.findElement(By.name('password'));
        await driver.wait(until.elementIsVisible(el), 1000);
        await el.sendKeys(this.password);



        // await driver.wait(until.titleIs('webdriver - Google Search'), 1000);
    });

    after(async function() {
        // this.driver.quit();
    })
});