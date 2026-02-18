# استخدم صورة Python رسمية
FROM python:3.11-slim

# تثبيت أدوات أساسية
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    unzip \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# تثبيت Google Chrome
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" \
       > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# تثبيت Chromedriver متوافق مع نسخة Chrome
RUN CHROME_VERSION=$(google-chrome --version | awk '{print $3}') && \
    CHROMEDRIVER_VERSION=$(curl -s "https://chromedriver.storage.googleapis.com/LATEST_RELEASE") && \
    wget -q "https://chromedriver.storage.googleapis.com/${CHROMEDRIVER_VERSION}/chromedriver_linux64.zip" && \
    unzip chromedriver_linux64.zip -d /usr/bin && \
    rm chromedriver_linux64.zip && \
    chmod +x /usr/bin/chromedriver

# إعداد مجلد العمل
WORKDIR /app

# نسخ الملفات
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# الأمر الافتراضي لتشغيل السيرفر
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]
