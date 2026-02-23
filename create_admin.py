# 建立管理員帳號的 Python 腳本
import requests
import json

# API 端點
url = "http://127.0.0.1:8000/api/auth/register"

# 管理員資料 (使用 ASCII)
data = {
    "username": "admin",
    "email": "admin@example.com",
    "password": "admin123",
    "full_name": "Admin",
    "is_admin": True
}

# 發送請求
try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
