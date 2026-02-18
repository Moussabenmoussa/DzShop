import requests
from bs4 import BeautifulSoup
import random
import time
import os
import json
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options

CHROME_PATH = "/usr/bin/google-chrome"
CHROMEDRIVER_PATH = "/usr/bin/chromedriver"
CACHE_FILE = "valid_proxies.json"

# --- جلب البروكسيات المجانية ---
def fetch_free_proxies(limit=30):
    print("🕵️ Scrapping for fresh proxies...")
    url = "https://www.sslproxies.org/"
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        response = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')
        proxies = []
        for row in soup.find_all('tr')[1:limit+1]:
            tds = row.find_all('td')
            try:
                ip = tds[0].text.strip()
                port = tds[1].text.strip()
                proxies.append(f"{ip}:{port}")
            except:
                continue
        return proxies
    except Exception as e:
        print(f"❌ Scrape failed: {e}")
        return []

# --- اختبار البروكسي ---
def test_proxy(proxy, test_url="http://httpbin.org/ip", timeout=5):
    try:
        response = requests.get(test_url, proxies={"http": f"http://{proxy}", "https": f"http://{proxy}"}, timeout=timeout)
        if response.status_code == 200:
            print(f"✅ Proxy {proxy} is working")
            return True
    except:
        pass
    print(f"❌ Proxy {proxy} failed")
    return False

# --- تحميل الكاش ---
def load_cache():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r") as f:
            try:
                return json.load(f)
            except:
                return []
    return []

# --- حفظ الكاش ---
def save_cache(proxies):
    with open(CACHE_FILE, "w") as f:
        json.dump(proxies, f)

# --- تهيئة المتصفح ---
def get_driver(proxy=None):
    options = Options()
    options.binary_location = CHROME_PATH
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")

    if proxy:
        print(f"🎭 Using Proxy Mask: {proxy}")
        options.add_argument(f'--proxy-server=http://{proxy}')

    service = Service(executable_path=CHROMEDRIVER_PATH)
    return webdriver.Chrome(service=service, options=options)

# --- زيارة الهدف ---
def visit_target(url: str, attempts=5):
    # 1. تحميل البروكسيات من الكاش
    valid_proxies = load_cache()

    # 2. إذا الكاش فارغ، نجلب بروكسيات جديدة ونفلترها
    if not valid_proxies:
        proxy_list = fetch_free_proxies()
        valid_proxies = [p for p in proxy_list if test_proxy(p)]
        save_cache(valid_proxies)

    if not valid_proxies:
        return {"status": "Error", "message": "No valid proxies found."}

    # 3. إعادة المحاولة باستخدام البروكسيات الصالحة
    for i in range(attempts):
        proxy = random.choice(valid_proxies)
        driver = None
        try:
            driver = get_driver(proxy)
            driver.set_page_load_timeout(30)
            driver.get(url)

            # مثال لحركة بشرية بسيطة
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)

            title = driver.title
            return {"status": "Success", "proxy": proxy, "title": title}
        except Exception as e:
            print(f"⚠️ Proxy {proxy} failed, retrying... ({i+1}/{attempts})")
            # إزالة البروكسي الفاشل من الكاش
            if proxy in valid_proxies:
                valid_proxies.remove(proxy)
                save_cache(valid_proxies)
        finally:
            if driver:
                driver.quit()

    return {"status": "Error", "message": "All proxies failed after retries."}
