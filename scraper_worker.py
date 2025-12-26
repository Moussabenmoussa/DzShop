import os
import requests
from pymongo import MongoClient
from datetime import datetime

MONGO_URI = os.getenv("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client['dzshop_db']
products_col = db['spy_products']

def spy_on_shopify(store_url):
    try:
        api_url = f"{store_url.rstrip('/')}/products.json?limit=50"
        res = requests.get(api_url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
        if res.status_code == 200:
            for p in res.json()['products']:
                products_col.update_one(
                    {"product_id": str(p['id'])},
                    {"$set": {
                        "title": p['title'],
                        "price": p['variants'][0]['price'],
                        "store": store_url,
                        "image": p['images'][0]['src'] if p['images'] else "",
                        "last_updated": datetime.utcnow()
                    }}, upsert=True)
    except Exception as e: print(f"Error: {e}")

if __name__ == "__main__":
    # أضف روابط المتاجر هنا
   
STORES = [
    "https://kyliecosmetics.com",
    "https://jeffreestarcosmetics.com",
    "https://rowanbeauty.com"
]

    
    for s in STORES: spy_on_shopify(s)
