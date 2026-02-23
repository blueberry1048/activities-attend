import requests
import json

BASE_URL = "http://127.0.0.1:8001"

# Login
login_resp = requests.post(
    f"{BASE_URL}/api/auth/login",
    data={"username": "admin", "password": "admin123"}
)
print(f"Login: {login_resp.status_code}")
token = login_resp.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

# Create event
event_data = {
    "name": "測試活動",
    "description": "測試描述",
    "location": "台北",
    "event_date": "2026-03-01",
    "start_time": "10:00",
    "end_time": "12:00",
    "is_active": True
}
event_resp = requests.post(f"{BASE_URL}/api/events", json=event_data, headers=headers)
print(f"Create Event: {event_resp.status_code} - {event_resp.text}")

if event_resp.status_code == 201:
    event_id = event_resp.json()["id"]
    
    # Create participant
    participant_data = {
        "name": "王小明",
        "email": "wang@example.com",
        "phone": "0912345678"
    }
    participant_resp = requests.post(
        f"{BASE_URL}/api/participants/events/{event_id}",
        json=participant_data,
        headers=headers
    )
    print(f"Create Participant: {participant_resp.status_code} - {participant_resp.text}")
    
    # List participants
    list_resp = requests.get(
        f"{BASE_URL}/api/participants/events/{event_id}",
        headers=headers
    )
    print(f"List Participants: {list_resp.status_code} - {list_resp.text}")
