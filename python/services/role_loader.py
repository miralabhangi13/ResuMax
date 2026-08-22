import json
with open("data/roles.json","r") as file:
    roles=json.load(file)

def get_role(role_name):
    return roles.get(role_name)