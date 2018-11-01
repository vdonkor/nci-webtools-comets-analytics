const path = require('path');
const request = require('request');
const should = require('chai').should();
const { expect } = require('chai');
const { Builder, By, Key, until } = require('selenium-webdriver');

describe('Smoke Test', function() {
    this.timeout(0);

    before(async function() {
        this.driver = await new Builder().forBrowser('firefox').build();
        this.user = process.env.USER;
        this.password = process.env.PASSWORD;
        this.website = process.env.WEBSITE.replace(/\/$/, '');
        this.login = (async function() {
            const driver = this.driver;

            const email = By.name('email');
            const password = By.name('password');
            const submit = By.css('[type="submit"]');

            // wait until controls are located before filling out form
            await driver.wait(until.elementLocated(email));
            await driver.wait(until.elementLocated(password));
            await driver.wait(until.elementLocated(submit));

            // fill out and submit login form
            await driver.findElement(email).sendKeys(this.user) ;
            await driver.findElement(password).sendKeys(this.password) ;
            await driver.findElement(submit).click();
        }).bind(this);
    });

    it('should specify the correct website', async function() {
        const driver = this.driver;
        await driver.get(this.website);
        await driver.wait(until.titleContains('COMETS'));
        const title = await driver.getTitle();
        title.should.equal('COMETS');
    });

    it('should allow the test user to log in', async function() {
        const driver = this.driver;
        await this.login();
        await driver.wait(until.titleContains('Welcome to COMETS'));
        const title = await driver.getTitle();
        title.should.equal('Welcome to COMETS (COnsortium of METabolomics Studies)');
    });

    it('should pass the integrity check with the sample file', async function() {
        const driver = this.driver;

        // switch to correlation tab
        const tabCorrelate = By.css('[data-target="#tab-correlate"]');
        await driver.wait(until.elementLocated(tabCorrelate));
        await driver.findElement(tabCorrelate).click();

        // select first cohort
        await driver.findElement(By.name('cohortSelection')).sendKeys(Key.ARROW_DOWN);

        // upload tests/data/cometsInput.xlsx
        const uploadPath = path.join(process.cwd(), 'tests', 'data', 'cometsInput.xlsx');
        await driver.findElement(By.name('inputDataFile')).sendKeys(uploadPath);

        // check integrity
        await driver.findElement(By.id('load')).click();

        // wait until success message is shown
        const resultStatus = By.css('#tab-integrity #resultStatus');
        await driver.wait(until.elementLocated(resultStatus));
        const resultStatusClass = await driver.findElement(resultStatus).getAttribute('class');
        resultStatusClass.should.contain('alert-success');
    });

    it('should run a model from the sample file', async function() {
        const driver = this.driver;

        // run BMI basic adjustment
        await driver.findElement(By.name('modelSelection')).sendKeys('B');
        await driver.findElement(By.id('runModel')).click();

        // wait until success message is shown
        const resultStatus = By.css('#tab-summary #resultStatus');
        await driver.wait(until.elementLocated(resultStatus));
        const resultStatusClass = await driver.findElement(resultStatus).getAttribute('class');
        resultStatusClass.should.contain('alert-success');
    });

    after(async function() {
        this.driver.quit();
    })
});