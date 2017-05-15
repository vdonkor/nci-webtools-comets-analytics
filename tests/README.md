Testing COMETS with Selenium
---

Prerequisites:

Python packages:
 - selenium

Web Drivers (must be available in PATH):
 - [Chrome](https://sites.google.com/a/chromium.org/chromedriver/downloads) _(recommended)_
 - [Edge](https://developer.microsoft.com/en-us/microsoft-edge/tools/webdriver/)
 - [Firefox](https://github.com/mozilla/geckodriver/releases)
 - [Safari](https://webkit.org/blog/6900/webdriver-support-in-safari-10/)
 - [PhantomJS](https://github.com/detro/ghostdriver) _(headless)_
 
Running the test suite:
```bash

git checkout https://github.com/CBIIT/nci-webtools-comets-analytics

cd nci-webtools-comets-analytics/tests

python run_comets_tests.py

```
