import requests
import time
import itertools
import string
import os

URL = "https://realtorsjamaica.org/wp-admin/admin-ajax.php"
OUTPUT_FILE = "agents.md"

# ---------------------------
# Load existing agents
# ---------------------------
existing_licenses = set()

if os.path.exists(OUTPUT_FILE):
    with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
        for line in f:
            if "LICENCE:" in line:
                existing_licenses.add(line.split("LICENCE:")[1].strip())

print(f"Loaded {len(existing_licenses)} existing agents")

# ---------------------------
# Session
# ---------------------------
session = requests.Session()
session.headers.update({
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "X-Requested-With": "XMLHttpRequest",
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)",
    "Referer": "https://realtorsjamaica.org/find-a-realtor/",
    "Origin": "https://realtorsjamaica.org",
})

# ---------------------------
# Prefix generator (A → Z, AA → ZZ)
# ---------------------------
def prefix_generator(max_len=2):
    for length in range(1, max_len + 1):
        for combo in itertools.product(string.ascii_lowercase, repeat=length):
            yield "".join(combo)

# ---------------------------
# Scrape
# ---------------------------
new_count = 0

with open(OUTPUT_FILE, "a", encoding="utf-8") as md:
    for prefix in prefix_generator(2):
        payload = {
            "action": "get_api_agents",
            "first_name": prefix,
            "company": "",
            "designation": ""
        }

        for attempt in range(5):
            try:
                print(f"🔍 Searching prefix: {prefix.upper()}")

                res = session.post(URL, data=payload, timeout=(10, 90))
                res.raise_for_status()
                data = res.json()

                agents = data.get("agents", [])
                if not agents:
                    break

                for a in agents:
                    record = {
                        "first_name": a.get("first_name", "").upper(),
                        "last_name": a.get("last_name", "").upper(),
                        "agent_licence_no": a.get("agent", {}).get("agent_licence_no", "").upper(),
                        "mobile": a.get("contactNumber", {}).get("mobile", "").upper(),
                        "home": a.get("contactNumber", {}).get("home", "").upper(),
                        "email": a.get("email", "").upper()
                    }

                    # ❌ Skip if no phone
                    if not record["mobile"] and not record["home"]:
                        continue

                    # ❌ Skip duplicates
                    licence = record["agent_licence_no"]
                    if not licence or licence in existing_licenses:
                        continue

                    # ✅ Save
                    md.write(
                        f"- {record['first_name']} {record['last_name']} | "
                        f"LICENCE: {licence} | "
                        f"MOBILE: {record['mobile']} | "
                        f"HOME: {record['home']} | "
                        f"EMAIL: {record['email']}\n"
                    )

                    existing_licenses.add(licence)
                    new_count += 1
                    print(f"✅ NEW: {record['first_name']} {record['last_name']}")

                break

            except requests.exceptions.ReadTimeout:
                print("⏳ Timeout — retrying...")
                time.sleep(3)

            except Exception as e:
                print("❌ Error:", e)
                break

print(f"\n🎉 Done. Added {new_count} new agents.")

