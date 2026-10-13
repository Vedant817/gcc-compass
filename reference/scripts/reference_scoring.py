"""Reference implementation of 04_scoring_and_rules.md. The app's TS port must reproduce these numbers."""
import json, os
D=os.path.join(os.path.dirname(__file__),"..","seed")
L=lambda n: json.load(open(os.path.join(D,n+".json"),encoding="utf-8"))
facts,cities,states,pols=L("facts"),L("cities"),L("states"),L("policies")
SQFT_PER_SEAT=150  # assumption A1
WEIGHTS={"cost":{"talent":.20,"rent":.20,"salary":.35,"attrition":.15,"incentives":.10},
 "talent":{"talent":.45,"rent":.10,"salary":.15,"attrition":.20,"incentives":.10},
 "incentives":{"talent":.20,"rent":.15,"salary":.15,"attrition":.10,"incentives":.40},
 "balanced":{"talent":.25,"rent":.20,"salary":.25,"attrition":.15,"incentives":.15}}
MIN_COVERAGE=0.60
def fact(eid,metric,src=None):
    xs=[f for f in facts if f["entity_id"]==eid and f["metric"]==metric and f["value_num"] is not None and (src is None or f["source_id"]==src)]
    return xs[0] if xs else None
FIELD_LABELS={"hq_country":"HQ country","company_size":"company size","global2000":"whether you're a Global 2000 company","seats_y1":"year-1 seats","seats_y3":"year-3 seats","functions":"functions","open_to_tier2":"whether you're open to Tier-2 cities","investment_inr_cr":"planned India investment","city_id":"city"}
def eval_rule(r,inp):
    v=inp.get(r["field"])
    if v is None: return "needs_check",f"We'd need your {FIELD_LABELS.get(r['field'],r['field'].replace('_',' '))} to check this: {r['fail_reason']}"
    op,t=r["op"],r["value"]
    ok={"==":lambda:v==t,"!=":lambda:v!=t,">=":lambda:v>=t,"<=":lambda:v<=t,"in":lambda:v in t,"not_in":lambda:v not in t}[op]()
    return ("eligible",None) if ok else ("not_eligible",r["fail_reason"])
def eligibility(p,inp):
    res=[eval_rule(r,inp) for r in p["eligibility_json"]["all"]]
    fails=[m for s,m in res if s=="not_eligible"]
    if fails: return "not_eligible",fails
    checks=[m for s,m in res if s=="needs_check"]+p["eligibility_json"].get("needs_check",[])
    if checks: return "needs_check",checks
    return "eligible",["All registry rules pass."]
def city_raw(c,inp):
    blr_mid=fact("bengaluru","swe_ctc_mid")["value_num"]
    rent=fact(c["id"],"office_rent_grade_a","src_office_annual_2025")
    talent=fact(c["id"],"gcc_talent_share_pct")
    attr=fact(c["id"],"attrition_pct")
    if c["id"]=="bengaluru": sal=blr_mid
    else:
        d=fact(c["id"],"swe_ctc_discount_vs_blr_pct"); sal=blr_mid*(1-d["value_num"]/100) if d else None
    st=[p for p in pols if p["state_id"]==c["state_id"]]
    inc=0.0; el=[]
    for p in st:
        s,why=eligibility(p,{**inp,"city_id":c["id"]}); el.append((p["id"],s,why))
        inc=max(inc,{"eligible":1.0,"needs_check":0.5,"not_eligible":0.0}[s])
    return {"talent":talent and talent["value_num"],"rent":rent and rent["value_num"],"salary":sal,"attrition":attr and attr["value_num"],"incentives":inc},el
def rank(inp,priority):
    w=WEIGHTS[priority]
    cand=[c for c in cities if c["tier"]==1 or inp["open_to_tier2"]]
    raw={c["id"]:city_raw(c,inp) for c in cand}
    norm={}
    for k,better in [("talent","high"),("rent","low"),("salary","low"),("attrition","low"),("incentives","high")]:
        vals=[raw[i][0][k] for i in raw if raw[i][0][k] is not None]
        lo,hi=min(vals),max(vals)
        for i in raw:
            v=raw[i][0][k]
            if v is None: norm.setdefault(i,{})[k]=None; continue
            x=1.0 if hi==lo else (v-lo)/(hi-lo)
            norm.setdefault(i,{})[k]=x if better=="high" else 1-x
    out=[]
    for i in raw:
        cov=sum(w[k] for k in w if norm[i][k] is not None)
        score=sum(w[k]*norm[i][k] for k in w if norm[i][k] is not None)/cov if cov else 0
        out.append({"city":i,"coverage":round(cov,2),"score":round(100*score,1) if cov>=MIN_COVERAGE else None,"components":{k:(None if v is None else round(v,3)) for k,v in norm[i].items()},"raw":raw[i][0],"eligibility":raw[i][1]})
    out.sort(key=lambda r:(r["score"] is None,-(r["score"] or 0)))
    return out
def three_year(city_id,inp):
    rent=fact(city_id,"office_rent_grade_a","src_office_annual_2025")
    r=city_raw(next(c for c in cities if c["id"]==city_id),inp)[0]
    inc=fact("IN","salary_increment_pct")["value_num"]/100
    seats=[inp["seats_y1"],(inp["seats_y1"]+inp["seats_y3"])/2,inp["seats_y3"]]
    rows=[]
    for y,s in enumerate(seats,1):
        rent_l=s*SQFT_PER_SEAT*rent["value_num"]*12/1e5 if rent else None
        sal_l=s*r["salary"]*(1+inc)**(y-1) if r["salary"] else None
        rows.append({"year":y,"seats":s,"rent_lakh":rent_l and round(rent_l,1),"salary_lakh":sal_l and round(sal_l,1),"total_lakh":round(rent_l+sal_l,1) if rent_l and sal_l else None})
    tot=sum(x["total_lakh"] for x in rows) if all(x["total_lakh"] for x in rows) else None
    return rows,tot
if __name__=="__main__":
    persona={"hq_country":"US","company_size":400,"global2000":False,"seats_y1":40,"seats_y3":120,"functions":["eng","ops"],"open_to_tier2":False,"investment_inr_cr":None}
    res=rank(persona,"cost")
    print(json.dumps(res,indent=1,ensure_ascii=False))
    for r in res:
        if r["score"] is not None:
            rows,t=three_year(r["city"],persona); print(r["city"],rows,"3yr total lakh:",t, "= ₹%.2f Cr"%(t/100) if t else "")
