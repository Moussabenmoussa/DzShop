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
    """تجهيز المتصفح الخفي"""
    options = Options()
    options.binary_location = CHROME_PATH
    options.add_argument("--headless")  # هام جداً: العمل بدون شاشة
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    # تزييف الهوية لكي لا يتم كشفنا كـ Headless
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    
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
