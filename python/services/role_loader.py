import json
import os

ROLES_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "roles.json")

with open(ROLES_PATH, "r", encoding="utf-8") as file:
    roles = json.load(file)

def get_role(role_name):
    return roles.get(role_name)
