from fastapi import FastAPI
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
import time
import os

app = FastAPI()

# مسارات كروم التي ثبتناها في ملف build.sh
CHROME_PATH = "/opt/render/project/src/chrome"
CHROMEDRIVER_PATH = "/opt/render/project/src/chromedriver"

def get_driver():
    """تجهيز المتصفح الخفي مع إعدادات تخطي قيود السيرفر"""
    options = Options()
    options.binary_location = CHROME_PATH
    
    # الإعدادات الأساسية للعمل على السيرفر
    options.add_argument("--headless=new") # الوضع الخفي المطور
    options.add_argument("--no-sandbox") # ضروري جداً لبيئات Linux/Render
    options.add_argument("--disable-dev-shm-usage") # حل مشكلة الذاكرة المحدودة (مهم جداً)
    options.add_argument("--disable-gpu")
    options.add_argument("--remote-debugging-port=9222")
    
    # تزييف الهوية لمنع كشف البوت
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
    
    # منع تحميل الصور لتوفير الرام وسرعة التنفيذ
    prefs = {"profile.managed_default_content_settings.images": 2}
    options.add_experimental_option("prefs", prefs)

    service = Service(executable_path=CHROMEDRIVER_PATH)
    driver = webdriver.Chrome(service=service, options=options)
    return driver

@app.get("/")
def home():
    return {"status": "Bot is Ready", "engine": "Selenium Headless"}

@app.get("/visit")
def visit_target(url: str):
    """نقطة النهاية التي تأمر البوت بزيارة موقع"""
    print(f"🚀 Starting mission to: {url}")
    
    try:
        driver = get_driver()
        driver.get(url)
        
        # الانتظار لتحميل الإعلانات والجافاسكريبت
        time.sleep(5) 
        
        title = driver.title
        driver.quit() # إغلاق المتصفح لتوفير الرام
        
        return {"status": "Success", "title": title, "url": url}
    
    except Exception as e:
        return {"status": "Error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
