#!/usr/bin/env python3
"""Build the bundled food database (public/data/foods.json) from open datasets.

Inputs live in a source folder (default: ../data-src), laid out like
scripts/fetch_sources.sh leaves it. Every value comes straight from the source
tables; nothing is invented. Values are per 100 g of edible food.

Output row: [id, name, alt, src, group, kcal, protein, carbs, fat, fibre, portions, cuisine]
portions: [[label, grams], ...]
cuisine: short code (IN, FR, US, KR, JP, CN, TH, VN, MX, IT, ME, MD, ES) or "".

World dishes that the open tables lack (bulgogi, gyoza, banh mi...) come from
data/world_recipes.json: typical home recipes whose values are computed from
SR Legacy ingredients, marked with source "RC" (recipe estimate).
"""
import argparse, json, math, os, re, sys

def num(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return None if (isinstance(v, float) and math.isnan(v)) else float(v)
    s = str(v).strip().replace(",", ".").replace("<", "").strip()
    if s in ("", "-", "traces", "NA", "N", "Tr"):
        return 0.0 if s in ("traces", "Tr") else None
    try:
        return float(s)
    except ValueError:
        return None

def r1(x):
    return None if x is None else round(x, 1)

def clean(s):
    return re.sub(r"\s+", " ", str(s or "")).strip()

# ---------------------------------------------------------------- India (INDB)
def load_indb(src):
    import pandas as pd
    d = pd.read_excel(os.path.join(src, "indb", "INDB.xlsx"))
    out = []
    for _, r in d.iterrows():
        kcal = num(r["energy_kcal"])
        if kcal is None:
            continue
        portions = []
        unit = r.get("servings_unit")
        sk = num(r.get("unit_serving_energy_kcal"))
        if isinstance(unit, str) and sk and kcal > 0:
            g = sk / kcal * 100
            if 1 <= g <= 2000:
                portions.append([f"1 {clean(unit)}", round(g)])
        out.append(["in:" + r["food_code"], clean(r["food_name"]), "", "IN", "Indian dishes",
                    r1(kcal), r1(num(r["protein_g"])), r1(num(r["carb_g"])), r1(num(r["fat_g"])),
                    r1(num(r["fibre_g"])), portions])
    return out

# --------------------------------------------------------------- France (CIQUAL)
def load_ciqual(src):
    path = os.path.join(src, "ciqual", "ciqual_2025_complete.json")
    d = json.load(open(path, encoding="utf-8"))
    K = "Energie, Règlement UE N° 1169/2011 (kcal/100 g)"
    K2 = "Energie, N x facteur Jones, avec fibres (kcal/100 g)"
    def g(c, k):
        v = c.get(k)
        return num(v["valeur"]) if v else None
    out = []
    for x in d:
        c = x["composition"]
        kcal = g(c, K)
        if kcal is None:
            kcal = g(c, K2)
        if kcal is None:
            continue
        name = clean(x.get("alim_nom_eng")) or clean(x.get("alim_nom_fr"))
        prot = g(c, "Protéines, N x facteur de Jones (g/100 g)")
        if prot is None:
            prot = g(c, "Protéines, N x 6.25 (g/100 g)")
        out.append(["fr:" + x["alim_code"], name, clean(x.get("alim_nom_fr")), "FR",
                    clean(x.get("groupe")) or "French table", r1(kcal), r1(prot),
                    r1(g(c, "Glucides (g/100 g)")), r1(g(c, "Lipides (g/100 g)")),
                    r1(g(c, "Fibres alimentaires (g/100 g)")), []])
    return out

# ------------------------------------------------------- USA (FNDDS survey foods)
def load_fndds(src):
    path = os.path.join(src, "fndds", "FoodData_Central_survey_food_json_2022-10-28.json")
    d = json.load(open(path, encoding="utf-8"))["SurveyFoods"]
    want = {"Energy": 0, "Protein": 1, "Carbohydrate, by difference": 2,
            "Total lipid (fat)": 3, "Fiber, total dietary": 4}
    out = []
    for x in d:
        v = [None] * 5
        for n in x["foodNutrients"]:
            nm = n["nutrient"]["name"]
            if nm in want and (nm != "Energy" or n["nutrient"].get("unitName") == "kcal"):
                v[want[nm]] = num(n.get("amount"))
        if v[0] is None:
            continue
        portions = []
        for p in sorted(x.get("foodPortions", []), key=lambda p: p.get("sequenceNumber", 0)):
            lab = clean(p.get("portionDescription"))
            gw = num(p.get("gramWeight"))
            if lab and gw and "not specified" not in lab.lower() and len(portions) < 6:
                portions.append([lab, round(gw, 1)])
        group = clean((x.get("wweiaFoodCategory") or {}).get("wweiaFoodCategoryDescription")) or "US survey foods"
        out.append(["us:" + str(x["foodCode"]), clean(x["description"]), "", "US", group,
                    *[r1(a) for a in v], portions])
    return out

# --------------------------------------------------------- USA (SR Legacy basics)
def read_sr(path):
    with open(path, encoding="latin-1") as f:
        for line in f:
            yield [c.strip("~") for c in line.rstrip("\r\n").split("^")]

def load_sr(src):
    base = os.path.join(src, "sr")
    groups = {r[0]: r[1] for r in read_sr(os.path.join(base, "FD_GROUP.txt"))}
    foods = {r[0]: (r[2], groups.get(r[1], "")) for r in read_sr(os.path.join(base, "FOOD_DES.txt"))}
    idx = {"208": 0, "203": 1, "205": 2, "204": 3, "291": 4}
    vals = {}
    for r in read_sr(os.path.join(base, "NUT_DATA.txt")):
        i = idx.get(r[1])
        if i is not None:
            vals.setdefault(r[0], [None] * 5)[i] = num(r[2])
    portions = {}
    for r in read_sr(os.path.join(base, "WEIGHT.txt")):
        amt, lab, gw = num(r[2]), clean(r[3]), num(r[4])
        if amt and gw and lab:
            a = ("%g" % amt)
            portions.setdefault(r[0], []).append([f"{a} {lab}", round(gw, 1)])
    out = []
    for k, (name, grp) in foods.items():
        v = vals.get(k)
        if not v or v[0] is None:
            continue
        out.append(["sr:" + k, clean(name), "", "SR", grp, *[r1(a) for a in v], portions.get(k, [])[:6]])
    return out

# ------------------------------------------------------------- cuisine tags
CUISINE_WORDS = {
    "KR": r"korean|kimchi|bulgogi|bibimbap|japchae|kimbap|gimbap|galbi|kalbi|jjigae|tteok|gochujang|doenjang|banchan|samgyeopsal|mandu|pajeon",
    "JP": r"japanese|sushi|sashimi|teriyaki|tempura|miso|ramen|udon|soba|somen|edamame|wasabi|gyoza|tonkatsu|katsu|onigiri|donburi|yakitori|okonomiyaki|takoyaki|mochi|natto|karaage|nori|seaweed|matcha|shiitake|sake\b|tofu",
    "CN": r"chinese|chow mein|lo mein|chop suey|fried rice|egg roll|spring roll|wonton|dim sum|dumpling|bao\b|kung pao|szechuan|sichuan|hunan|general tso|sweet and sour|moo shu|moo goo|mapo|char siu|hoisin|bok choy|pak.?choi|egg foo young|lychee|tofu",
    "TH": r"thai|pad thai|satay|massaman|tom yum|tom kha|green curry|red curry|lemongrass|galangal|panang",
    "VN": r"vietnam|pho\b|banh mi|bánh|nem\b|rice paper|spring roll|summer roll",
    "MX": r"mexican|taco|burrito|enchilada|quesadilla|tamale|tostada|fajita|nacho|salsa|guacamole|chimichanga|tortilla|refried|chile relleno|pozole|menudo|churro|flauta|sopapilla|mole\b|chilaquiles|jalape",
    "IT": r"italian|pasta|spaghetti|lasagn|ravioli|tortellini|gnocchi|risotto|pizza|calzone|lasagne|fettuccine|linguine|penne|macaroni|cannelloni|parmigiana|parmesan|mozzarella|ricotta|prosciutto|salami|pesto|bruschetta|focaccia|tiramisu|gelato|polenta|minestrone|carbonara|bolognese|alfredo|marinara|biscotti|panna cotta|antipast",
    "ME": r"middle eastern|hummus|houmous|falafel|shawarma|kebab|kabob|kofta|tabbouleh|taboul|baba gh|tahini|pita\b|halva|baklava|fattoush|labneh|shakshuka|couscous|tajine|tagine|harissa|lebanese|turkish|moroccan|persian",
    "MD": r"greek|gyro|tzatziki|feta|moussaka|spanakopita|souvlaki|dolma|mediterranean",
    "ES": r"spanish|paella|gazpacho|tortilla espa|chorizo|tapas|churros|empanada|sangria|serrano",
}
CUISINE_RE = [(c, re.compile(r"\b(?:" + w + r")", re.I)) for c, w in CUISINE_WORDS.items()]

def cuisine_of(name, src):
    if src == "IN":
        return "IN"
    for c, rx in CUISINE_RE:
        if rx.search(name):
            return c
    return {"FR": "FR", "US": "US"}.get(src, "")

# ---------------------------------------------------- world dishes (recipes)
def load_recipes(sr_rows, path):
    with open(path, encoding="utf-8") as f:
        w = json.load(f)
    by_name = {r[1]: r for r in sr_rows}
    codes = {"Korean": "KR", "Japanese": "JP", "Chinese": "CN", "Thai": "TH", "Vietnamese": "VN",
             "Middle Eastern": "ME", "Mexican": "MX", "Italian": "IT", "Mediterranean": "MD", "Spanish": "ES"}
    out = []
    for i, rc in enumerate(w["recipes"]):
        tot = [0.0] * 5
        grams = 0.0
        for key, g in rc["items"]:
            r = by_name[w["ingredients"][key]]
            grams += g
            for j in range(5):
                tot[j] += (r[5 + j] or 0) * g / 100
        per100 = [r1(t * 100 / grams) for t in tot]
        per100[0] = round(per100[0])
        serving = round(grams / rc["servings"])
        slug = re.sub(r"[^a-z0-9]+", "-", rc["name"].lower()).strip("-")[:40]
        out.append(["rc:" + slug, rc["name"], rc.get("alt", ""), "RC", rc["cuisine"] + " dishes", *per100,
                    [[rc["serving"], serving]], codes[rc["cuisine"]]])
    return out

SOURCES = {
    "IN": {"name": "Indian Nutrient Databank (INDB)", "by": "Lindsay Jaacks and colleagues (Current Developments in Nutrition, 2024)",
            "url": "https://github.com/lindsayjaacks/Indian-Nutrient-Databank-INDB-", "licence": "Open access (see repository and Current Developments in Nutrition, 2024)"},
    "FR": {"name": "ANSES-CIQUAL French food composition table", "by": "ANSES",
            "url": "https://ciqual.anses.fr/", "licence": "Licence Ouverte / Etalab 2.0"},
    "US": {"name": "USDA FNDDS survey foods (FoodData Central, 2022-10-28)", "by": "USDA Agricultural Research Service",
            "url": "https://fdc.nal.usda.gov/", "licence": "Public domain (CC0)"},
    "SR": {"name": "USDA SR Legacy (FoodData Central)", "by": "USDA Agricultural Research Service",
            "url": "https://fdc.nal.usda.gov/", "licence": "Public domain (CC0)"},
    "RC": {"name": "Thalika world dish estimates", "by": "Typical home recipes, computed from USDA SR Legacy ingredients",
            "url": "https://github.com/Henil-source/Calories-Tracker-/blob/main/data/world_recipes.json", "licence": "CC0 (recipes) on CC0 data"},
}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=os.path.join(os.path.dirname(__file__), "..", "..", "data-src"))
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "public", "data", "foods.json"))
    a = ap.parse_args()
    rows = []
    for label, fn in (("IN", load_indb), ("FR", load_ciqual), ("US", load_fndds), ("SR", load_sr)):
        got = fn(a.src)
        print(f"{label}: {len(got)} foods", file=sys.stderr)
        rows += got
    rows = [r + [cuisine_of(r[1] + " " + r[2], r[3])] for r in rows]
    rec = load_recipes([r for r in rows if r[3] == "SR"], os.path.join(os.path.dirname(__file__), "..", "data", "world_recipes.json"))
    print(f"RC: {len(rec)} world dishes", file=sys.stderr)
    rows += rec
    from collections import Counter
    print("cuisines:", dict(Counter(r[11] for r in rows)), file=sys.stderr)
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump({"version": 2, "per": "100 g", "sources": SOURCES, "foods": rows}, f,
                  ensure_ascii=False, separators=(",", ":"))
    print(f"total {len(rows)} -> {a.out} ({os.path.getsize(a.out)//1024} KB)", file=sys.stderr)

if __name__ == "__main__":
    main()
