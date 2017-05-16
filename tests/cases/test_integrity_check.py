# -*- coding: utf-8 -*-
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import Select
from selenium.common.exceptions import NoSuchElementException
from selenium.common.exceptions import NoAlertPresentException
import unittest, time, re

class 1(unittest.TestCase):
    def setUp(self):
        self.driver = webdriver.PhantomJS()
        self.driver.implicitly_wait(30)
        self.base_url = "http://localhost:8100/"
        self.verificationErrors = []
        self.accept_next_alert = True
    
    def test_1(self):
        driver = self.driver
        driver.get("http://localhost:8100/")
        driver.find_element_by_link_text("Correlate").click()
        for i in range(60):
            try:
                if driver.find_element_by_id("cohortSelection").is_displayed(): break
            except: pass
            time.sleep(1)
        else: self.fail("time out")
        Select(driver.find_element_by_id("cohortSelection")).select_by_visible_text("ARIC")
        driver.find_element_by_id("inputDataFile").clear()
        driver.find_element_by_id("inputDataFile").send_keys("/tests/upload/cometsInput.xlsx")
        driver.find_element_by_id("load").click()
        for i in range(60):
            try:
                if driver.find_element_by_id("resultStatus").is_displayed(): break
            except: pass
            time.sleep(1)
        else: self.fail("time out")
        # ERROR: Caught exception [ERROR: Unsupported command [getTable | id=resultStatus | ]]
        for i in range(60):
            try:
                if driver.find_element_by_id("modelSelection").is_displayed(): break
            except: pass
            time.sleep(1)
        else: self.fail("time out")
        Select(driver.find_element_by_id("modelSelection")).select_by_visible_text("1 Gender adjusted")
        driver.find_element_by_id("runModel").click()
    
    def is_element_present(self, how, what):
        try: self.driver.find_element(by=how, value=what)
        except NoSuchElementException as e: return False
        return True
    
    def is_alert_present(self):
        try: self.driver.switch_to_alert()
        except NoAlertPresentException as e: return False
        return True
    
    def close_alert_and_get_its_text(self):
        try:
            alert = self.driver.switch_to_alert()
            alert_text = alert.text
            if self.accept_next_alert:
                alert.accept()
            else:
                alert.dismiss()
            return alert_text
        finally: self.accept_next_alert = True
    
    def tearDown(self):
        self.driver.quit()
        self.assertEqual([], self.verificationErrors)

if __name__ == "__main__":
    unittest.main()
