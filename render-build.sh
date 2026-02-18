#!/usr/bin/env bash
# exit on error
set -o errexit

STORAGE_DIR=/opt/render/project/src

# 1. تثبيت المتطلبات
pip install -r requirements.txt

# 2. تنزيل وتثبيت Google Chrome
echo "...Downloading Chrome"
wget -q -O chrome-linux64.zip https://storage.googleapis.com/chrome-for-testing-public/122.0.6261.94/linux64/chrome-linux64.zip
unzip chrome-linux64.zip
rm chrome-linux64.zip
mv chrome-linux64/chrome /opt/render/project/src/chrome

# 3. تنزيل وتثبيت Chromedriver (السائق)
echo "...Downloading Chromedriver"
wget -q -O chromedriver-linux64.zip https://storage.googleapis.com/chrome-for-testing-public/122.0.6261.94/linux64/chromedriver-linux64.zip
unzip chromedriver-linux64.zip
rm chromedriver-linux64.zip
mv chromedriver-linux64/chromedriver /opt/render/project/src/chromedriver

# إعطاء صلاحيات التشغيل
chmod +x /opt/render/project/src/chrome
chmod +x /opt/render/project/src/chromedriver
