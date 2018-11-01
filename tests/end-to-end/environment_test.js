const should = require('chai').should();

describe('Environmental Variables', function() {
    it('should specify the website in the TEST_WEBSITE environmental variable', function() {
        const value = process.env.TEST_WEBSITE;
        should.exist(value);
        value.should.be.a('string');
        value.should.not.be.empty;
    });

    it('should specify the user in the TEST_USER environmental variable', function() {
        const value = process.env.TEST_USER;
        should.exist(value);
        value.should.be.a('string');
        value.should.not.be.empty;
    });

    it('should specify the password in the TEST_PASSWORD environmental variable', function() {
        const value = process.env.TEST_PASSWORD;
        should.exist(value);
        value.should.be.a('string');
        value.should.not.be.empty;
    });
});
