import requests
from bs4 import BeautifulSoup
import random
import time
import os
import json
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.action_chains import ActionChains

CHROME_PATH = "/usr/bin/google-chrome"
CHROMEDRIVER_PATH = "/usr/bin/chromedriver"
CACHE_FILE = "valid_proxies.json"

# --- قائمة User-Agents ---
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15",
]

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

# --- تهيئة المتصفح مع إخفاء البصمة ---
def get_driver(proxy=None):
    options = Options()
    options.binary_location = CHROME_PATH
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    # اختيار User-Agent عشوائي
    ua = random.choice(USER_AGENTS)
    options.add_argument(f"user-agent={ua}")

    # تغيير دقة الشاشة عشوائيًا
    width = random.choice([1366, 1920, 1280, 1440])
    height = random.choice([768, 1080, 800, 900])
    options.add_argument(f"--window-size={width},{height}")

    # تعطيل WebRTC و Canvas fingerprinting
    options.add_argument("--disable-webrtc")
    options.add_argument("--disable-blink-features=AutomationControlled")

    if proxy:
        print(f"🎭 Using Proxy Mask: {proxy}")
        options.add_argument(f'--proxy-server=http://{proxy}')

    service = Service(executable_path=CHROMEDRIVER_PATH)
    driver = webdriver.Chrome(service=service, options=options)

    # إزالة العلامات التي تكشف Selenium
    driver.execute_cdp_cmd("Page.addScriptToEvaluateOnNewDocument", {
        "source": """
            Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
        """
    })

    return driver

# --- محاكاة بشرية ---
def human_behavior(driver):
    actions = ActionChains(driver)
    # تمرير عشوائي
    for _ in range(random.randint(2, 5)):
        scroll_height = random.randint(200, 800)
        driver.execute_script(f"window.scrollBy(0, {scroll_height});")
        time.sleep(random.uniform(1, 3))

    # تحريك الماوس عشوائيًا
    for _ in range(random.randint(3, 6)):
        x = random.randint(0, 500)
        y = random.randint(0, 500)
        actions.move_by_offset(x, y).perform()
        time.sleep(random.uniform(0.5, 1.5))

    # نقرات عشوائية على روابط داخلية (إن وجدت)
    links = driver.find_elements("tag name", "a")
    if links:
        random.choice(links).click()
        time.sleep(random.uniform(2, 4))

# --- زيارة الهدف ---
def visit_target(url: str, attempts=5):
    valid_proxies = load_cache()

    if not valid_proxies:
        proxy_list = fetch_free_proxies()
        valid_proxies = [p for p in proxy_list if test_proxy(p)]
        save_cache(valid_proxies)

    if not valid_proxies:
        return {"status": "Error", "message": "No valid proxies found."}

    for i in range(attempts):
        proxy = random.choice(valid_proxies)
        driver = None
        try:
            driver = get_driver(proxy)
            driver.set_page_load_timeout(30)
            driver.get(url)

            # محاكاة بشرية
            human_behavior(driver)

            title = driver.title
            return {"status": "Success", "proxy": proxy, "title": title}
        except Exception as e:
            print(f"⚠️ Proxy {proxy} failed, retrying... ({i+1}/{attempts})")
            if proxy in valid_proxies:
                valid_proxies.remove(proxy)
                save_cache(valid_proxies)
        finally:
            if driver:
                driver.quit()

    return {"status": "Error", "message": "All proxies failed after retries."}
