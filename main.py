from fastapi import FastAPI
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium_stealth import stealth
import time
import random
import os

app = FastAPI()

CHROME_PATH = "/opt/render/project/src/chrome"
CHROMEDRIVER_PATH = "/opt/render/project/src/chromedriver"

def get_stealth_driver():
    options = Options()
    options.binary_location = CHROME_PATH
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080") # حجم شاشة حقيقي
    
    # تعطيل ميزات الأتمتة التي تكشفنا
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)

    service = Service(executable_path=CHROMEDRIVER_PATH)
    driver = webdriver.Chrome(service=service, options=options)

    # هنا يحدث السحر: تزوير البصمة الرقمية بالكامل
    stealth(driver,
        languages=["en-US", "en"],
        vendor="Google Inc.",
        platform="Win32",
        webgl_vendor="Intel Inc.",
        renderer="Intel Iris OpenGL Engine",
        fix_hairline=True,
    )
    
    return driver

def human_interaction(driver):
    """محاكاة تصرفات بشرية معقدة"""
    total_height = driver.execute_script("return document.body.scrollHeight")
    current = 0
    
    print("🎭 Acting like a human...")
    
    while current < total_height:
        scroll_step = random.randint(300, 700)
        current += scroll_step
        driver.execute_script(f"window.scrollTo(0, {current});")
        
        # توقف عشوائي للقراءة
        time.sleep(random.uniform(0.5, 2.0))
        
        # حركة ماوس وهمية (لإيهام السيرفر بوجود نشاط)
        if random.choice([True, False]):
            driver.execute_script("document.elementFromPoint(100, 100).click();")
            
        # تحديث الطول
        total_height = driver.execute_script("return document.body.scrollHeight")
        if current >= total_height: break

@app.get("/")
def home():
    return {"status": "Stealth Engine Ready"}

@app.get("/visit")
def visit_target(url: str):
    try:
        driver = get_stealth_driver()
        
        # خداع إضافي: فتح صفحة فارغة ثم الانتقال
        driver.get("about:blank")
        time.sleep(1)
        
        print(f"🚀 Stealth Mission to: {url}")
        driver.get(url)
        
        # محاكاة التفاعل البشري
        human_interaction(driver)
        
        # البقاء في الموقع لزيادة (Session Duration)
        stay_time = random.randint(10, 20)
        time.sleep(stay_time)
        
        title = driver.title
        driver.quit()
        
        return {
            "status": "Success", 
            "title": title, 
            "stealth_mode": "Active",
            "duration": stay_time
        }
    except Exception as e:
        return {"status": "Error", "message": str(e)}
