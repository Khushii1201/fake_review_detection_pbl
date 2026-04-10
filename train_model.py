"""
STEP 1 — Run this once:  python train_model.py
Trains the ML model on your amazon_reviews.txt and saves model.pkl + vectorizer.pkl
"""

import pandas as pd, pickle, re
from sklearn.linear_model import LogisticRegression
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

FILE = "amazon_reviews.txt"   # must be in the same folder

print(f"\n[1/5] Loading {FILE} ...")
df = pd.read_csv(FILE, sep="\t", on_bad_lines="skip")
print(f"      {len(df):,} rows  |  columns: {df.columns.tolist()}")

print("[2/5] Preparing labels ...")
df = df[["REVIEW_TEXT","LABEL","RATING","PRODUCT_CATEGORY"]].dropna()
df["label"] = df["LABEL"].map({"__label1__": 1, "__label2__": 0})
df = df.dropna(subset=["label"])
df["label"] = df["label"].astype(int)
print(f"      Fake: {(df.label==1).sum():,}  |  Real: {(df.label==0).sum():,}")

print("[3/5] Cleaning text ...")
def clean(t):
    t = str(t).lower()
    t = re.sub(r"<[^>]+>", " ", t)
    t = re.sub(r"[^a-z\s]", " ", t)
    return re.sub(r"\s+", " ", t).strip()

df["clean"] = df["REVIEW_TEXT"].apply(clean)

print("[4/5] TF-IDF vectorisation ...")
vec = TfidfVectorizer(max_features=15000, ngram_range=(1,2),
                      stop_words="english", min_df=2, sublinear_tf=True)
X = vec.fit_transform(df["clean"])
y = df["label"]

print("[5/5] Training Logistic Regression ...")
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
model = LogisticRegression(max_iter=1000, C=1.0, class_weight="balanced", solver="lbfgs")
model.fit(Xtr, yte if False else ytr)

y_pred = model.predict(Xte)
print(f"\n{'='*50}")
print(f"  Accuracy : {accuracy_score(yte, y_pred)*100:.1f}%")
print(f"{'='*50}")
print(classification_report(yte, y_pred, target_names=["Real","Fake"]))

with open("model.pkl","wb")      as f: pickle.dump(model, f)
with open("vectorizer.pkl","wb") as f: pickle.dump(vec, f)
print("✅  Saved model.pkl + vectorizer.pkl")
print("➡   Now run: python app.py\n")
