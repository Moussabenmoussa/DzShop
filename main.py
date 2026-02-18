import requests
from bs4 import BeautifulSoup
import random

# --- دالة اصطياد البروكسيات المجانية ---
def fetch_free_proxies():
    print("🕵️ Scrapping for fresh proxies...")
    url = "https://www.sslproxies.org/"
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        response = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        proxies = []
        # استخراج أول 20 بروكسي سريع من الجدول
        for row in soup.find_all('tr')[1:21]:
            tds = row.find_all('td')
            try:
                ip = tds[0].text
                port = tds[1].text
                proxies.append(f"{ip}:{port}")
            except: continue
        return proxies
    except Exception as e:
        print(f"❌ Scrape failed: {e}")
        return []

# --- تعديل دالة تشغيل المتصفح ---
def get_driver(proxy):
    options = Options()
    options.binary_location = CHROME_PATH
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    
    # حقن البروكسي المصطاد في المتصفح
    if proxy:
        print(f"🎭 Using Proxy Mask: {proxy}")
        options.add_argument(f'--proxy-server=http://{proxy}')
    
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
    
    service = Service(executable_path=CHROMEDRIVER_PATH)
    return webdriver.Chrome(service=service, options=options)

@app.get("/visit")
def visit_target(url: str):
    # 1. جلب قائمة بروكسيات طازجة
    proxy_list = fetch_free_proxies()
    
    # 2. محاولة التنفيذ (سنحاول حتى نجد بروكسي يعمل)
    attempts = 3
    for i in range(attempts):
        proxy = random.choice(proxy_list) if proxy_list else None
        driver = None
        try:
            driver = get_driver(proxy)
            driver.set_page_load_timeout(30) # لا نريد الانتظار للأبد
            driver.get(url)
            
            # حركات بشرية
            human_scroll(driver)
            
            title = driver.title
            driver.quit()
            return {"status": "Success", "proxy": proxy, "title": title}
        except Exception as e:
            if driver: driver.quit()
            print(f"⚠️ Proxy {proxy} failed, retrying... ({i+1}/{attempts})")
            continue
            
    return {"status": "Error", "message": "All proxies failed. Try again."}
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
