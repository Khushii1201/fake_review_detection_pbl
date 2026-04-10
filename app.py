"""
STEP 2 — Run after training:  python app.py
Flask backend — web UI + /predict + /batch + /export + /stats endpoints
"""

import pickle, re, os, io, csv, json
from datetime import datetime
import numpy as np
from flask import Flask, request, jsonify, send_from_directory, Response
from flask_cors import CORS

app = Flask(__name__, static_folder="static")
CORS(app, origins="*")

# ── Load model ────────────────────────────────────────────────────────────────
for f in ["model.pkl", "vectorizer.pkl"]:
    if not os.path.exists(f):
        raise FileNotFoundError(f"\n❌  {f} not found. Run python train_model.py first.\n")

with open("model.pkl","rb")      as f: model      = pickle.load(f)
with open("vectorizer.pkl","rb") as f: vectorizer = pickle.load(f)
feature_names = np.array(vectorizer.get_feature_names_out())
print("✅  Model loaded")

# In-memory session stats (resets on server restart)
_session_log = []   # list of prediction dicts

# ── Helpers ───────────────────────────────────────────────────────────────────
def clean(text):
    text = str(text).lower()
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"[^a-z\s]",  " ", text)
    return re.sub(r"\s+", " ", text).strip()

def keywords(vec_row, label, n=8):
    coef  = model.coef_[0]
    row   = vec_row.toarray()[0]
    scores = (1 if label==1 else -1) * coef * row
    idx   = np.argsort(scores)[::-1][:n]
    return [{"word": feature_names[i], "score": round(float(scores[i]),4)}
            for i in idx if scores[i] > 0]

def predict_one(text):
    v     = vectorizer.transform([clean(text)])
    label = int(model.predict(v)[0])
    proba = model.predict_proba(v)[0]
    conf  = round(float(proba[label])*100, 1)
    return {
        "verdict":    "FAKE" if label==1 else "REAL",
        "label":      label,
        "confidence": conf,
        "proba":      {"fake": round(float(proba[1]),4), "real": round(float(proba[0]),4)},
        "keywords":   keywords(v, label),
    }

# ── Routes ─────────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return send_from_directory("static", "index.html")

@app.route("/health")
def health():
    return jsonify({"status": "ok", "reviews_analyzed": len(_session_log)})

# Single prediction
@app.route("/predict", methods=["POST"])
def predict():
    text = (request.get_json(force=True) or {}).get("text","").strip()
    if len(text) < 10:
        return jsonify({"error": "Review too short."}), 400
    result = predict_one(text)
    result["text_snippet"] = text[:120]
    result["timestamp"]    = datetime.now().isoformat()
    _session_log.append(result)
    return jsonify(result)

# Batch prediction (JSON array of texts)
@app.route("/batch", methods=["POST"])
def batch():
    data  = request.get_json(force=True) or {}
    texts = data.get("texts", [])
    if not texts or not isinstance(texts, list):
        return jsonify({"error": "Send {texts: [...]}"}), 400
    if len(texts) > 500:
        return jsonify({"error": "Max 500 reviews per batch."}), 400

    results = []
    for i, t in enumerate(texts):
        t = str(t).strip()
        if len(t) < 10:
            results.append({"index": i, "error": "too short"})
            continue
        r = predict_one(t)
        r["index"] = i
        r["text_snippet"] = t[:120]
        r["timestamp"] = datetime.now().isoformat()
        results.append(r)
        _session_log.append(r)

    fake_c = sum(1 for r in results if r.get("label")==1)
    real_c = len(results) - fake_c
    return jsonify({
        "total":   len(results),
        "fake":    fake_c,
        "real":    real_c,
        "fake_pct": round(fake_c/len(results)*100,1) if results else 0,
        "results": results,
    })

# Server-side stats
@app.route("/stats")
def stats():
    if not _session_log:
        return jsonify({"total":0,"fake":0,"real":0,"fake_pct":0,"avg_confidence":0})
    fake_c = sum(1 for r in _session_log if r.get("label")==1)
    real_c = len(_session_log) - fake_c
    avg_conf = round(sum(r.get("confidence",0) for r in _session_log)/len(_session_log),1)
    return jsonify({
        "total":          len(_session_log),
        "fake":           fake_c,
        "real":           real_c,
        "fake_pct":       round(fake_c/len(_session_log)*100,1),
        "avg_confidence": avg_conf,
    })

# Export session results as CSV
@app.route("/export/csv")
def export_csv():
    if not _session_log:
        return jsonify({"error": "No results to export."}), 400
    buf = io.StringIO()
    w   = csv.DictWriter(buf, fieldnames=["timestamp","verdict","label","confidence","proba_fake","proba_real","text_snippet"])
    w.writeheader()
    for r in _session_log:
        w.writerow({
            "timestamp":    r.get("timestamp",""),
            "verdict":      r.get("verdict",""),
            "label":        r.get("label",""),
            "confidence":   r.get("confidence",""),
            "proba_fake":   r.get("proba",{}).get("fake",""),
            "proba_real":   r.get("proba",{}).get("real",""),
            "text_snippet": r.get("text_snippet",""),
        })
    return Response(
        buf.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=fake_review_results.csv"}
    )

if __name__ == "__main__":
    print("\n🚀  http://localhost:5000\n")
    app.run(debug=False, port=5000, host="0.0.0.0")
