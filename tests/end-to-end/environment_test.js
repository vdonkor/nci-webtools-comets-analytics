const should = require('chai').should();

describe('Environmental Variables', function() {
    it('should specify the website in the WEBSITE environmental variable', function() {
        const value = process.env.WEBSITE;
        should.exist(value);
        value.should.be.a('string');
        value.should.not.be.empty;
    });

    it('should specify the user in the USER environmental variable', function() {
        const value = process.env.USER;
        should.exist(value);
        value.should.be.a('string');
        value.should.not.be.empty;
    });

    it('should specify the password in the PASSWORD environmental variable', function() {
        const value = process.env.PASSWORD;
        should.exist(value);
        value.should.be.a('string');
        value.should.not.be.empty;
    });
});
