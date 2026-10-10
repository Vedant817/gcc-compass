"""Validates seed JSON + referential integrity. Exit 1 on any error."""
import json, os, sys
D=os.path.join(os.path.dirname(__file__),"..","seed")
L=lambda n: json.load(open(os.path.join(D,n+".json"),encoding="utf-8"))
src,facts,cities,states,pol,prov=[L(n) for n in ["sources","facts","cities","states","policies","providers"]]
E=[]
def uniq(rows,name):
    ids=[r["id"] for r in rows]
    if len(ids)!=len(set(ids)): E.append(f"duplicate ids in {name}")
    return set(ids)
S,C,ST,PV=uniq(src,"sources"),uniq(cities,"cities"),uniq(states,"states"),uniq(prov,"providers")
uniq(facts,"facts"); uniq(pol,"policies")
for s in src:
    if not s["url"].startswith("https://"): E.append(f"{s['id']} bad url")
    if s["reliability"] not in "HML" or s["type"] not in ["official_policy","industry_report","broker_report","news","vendor_blog"]: E.append(f"{s['id']} enum")
ent={"country":{"IN"},"city":C,"state":ST,"provider":PV}
for f in facts:
    if f["source_id"] not in S: E.append(f"{f['id']} missing source")
    if f["entity_id"] not in ent.get(f["entity_type"],set()): E.append(f"{f['id']} bad entity {f['entity_id']}")
    if f["confidence"] not in "HML": E.append(f"{f['id']} confidence")
    if f["value_num"] is None and not f["value_text"]: E.append(f"{f['id']} no value")
    if f.get("unverified") and f["confidence"]!="L": E.append(f"{f['id']} unverified must be L")
for c in cities:
    if c["state_id"] not in ST: E.append(f"{c['id']} bad state")
for s in states:
    if s["source_id"] not in S: E.append(f"{s['id']} bad source")
for p in pol:
    if p["state_id"] not in ST or p["source_id"] not in S: E.append(f"{p['id']} bad ref")
    for r in p["eligibility_json"]["all"]:
        if r["op"] not in ["==","!=",">=","<=","in","not_in"]: E.append(f"{p['id']} op")
    for i in p["incentives_json"]:
        if i["type"] not in ["capex","rental","payroll","opex","interest","other"]: E.append(f"{p['id']} incentive type")
for p in prov:
    if p["source_id"] is not None and p["source_id"] not in S: E.append(f"{p['id']} bad source")
    for c in p["cities"]:
        if c not in C: E.append(f"{p['id']} bad city {c}")
if sum(p["is_flexiple"] for p in prov)!=1: E.append("exactly one Flexiple provider required")
print("\n".join(E) if E else f"OK: {len(src)} sources, {len(facts)} facts, {len(cities)} cities, {len(states)} states, {len(pol)} policies, {len(prov)} providers")
sys.exit(1 if E else 0)
