import requests

BASE_URL = "http://127.0.0.1:8001"

# Login
login_resp = requests.post(
    f"{BASE_URL}/api/auth/login",
    data={"username": "admin", "password": "admin123"}
)
token = login_resp.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Test create participant
event_id = "0649b742-dc39-4dd7-adfc-f7a6f241d8e0"
participant_data = {
    "name": "測試使用者2",
    "email": "test2@example.com",
    "phone": "0912345678"
}
resp = requests.post(
    f"{BASE_URL}/api/participants/events/{event_id}",
    json=participant_data,
    headers=headers
)
print(f"Status: {resp.status_code}")
print(f"Response: {resp.text}")
