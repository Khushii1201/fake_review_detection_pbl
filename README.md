# Fake Review Detector — PBL Project
### NLP + Machine Learning | Flask + Chrome Extension

---

## What this project does

This tool detects whether an Amazon product review is **fake or real** using
Natural Language Processing (NLP) and Machine Learning (ML). It provides:

- A **web application** for analyzing reviews with detailed stats
- A **Chrome browser extension** that automatically scans Amazon review pages
  and shows results directly next to each review — no copy-paste needed

---

## Tech Stack

| Layer        | Technology                        |
|--------------|-----------------------------------|
| ML Model     | Logistic Regression (scikit-learn)|
| Text Features| TF-IDF (15,000 features, bigrams) |
| Backend API  | Python + Flask                    |
| Frontend     | HTML / CSS / Vanilla JavaScript   |
| Extension    | Chrome Manifest V3                |
| Dataset      | Amazon Reviews (21,000 labeled)   |

---

## Project Folder Structure

```
project/
│
├── amazon_reviews.txt       ← Your Kaggle dataset (copy here)
├── train_model.py           ← Step 1: trains and saves the ML model
├── app.py                   ← Step 2: Flask server (runs the API + web UI)
├── requirements.txt         ← Python packages to install
│
├── model.pkl                ← Created after running train_model.py
├── vectorizer.pkl           ← Created after running train_model.py
│
├── static/
│   └── index.html           ← Full web interface
│
└── extension/
    ├── manifest.json        ← Chrome extension config
    ├── content.js           ← Injected into Amazon pages
    └── popup.html           ← Extension toolbar popup
```

---

## Setup Instructions

### Step 0 — Install Python packages

Open a terminal inside the `project/` folder and run:

```bash
pip install flask flask-cors scikit-learn pandas numpy
```

---

### Step 1 — Copy your dataset

Copy `amazon_reviews.txt` from your downloaded ZIP file into the `project/` folder.
It must be in the **same folder** as `train_model.py`.

---

### Step 2 — Train the ML model

```bash
python train_model.py
```

This will:
- Load and clean the 21,000 Amazon reviews
- Build a TF-IDF feature matrix (15,000 features, unigrams + bigrams)
- Train a Logistic Regression classifier
- Print accuracy and a full classification report
- Save `model.pkl` and `vectorizer.pkl`

Expected output:
```
[1/5] Loading amazon_reviews.txt ...
      21,000 rows
[2/5] Preparing labels ...
      Fake: 10,500  |  Real: 10,500
[3/5] Cleaning text ...
[4/5] TF-IDF vectorisation ...
[5/5] Training Logistic Regression ...

Accuracy : ~87%
✅  Saved model.pkl + vectorizer.pkl
```

> This runs only once. You do NOT need to re-run it unless you change the dataset.

---

### Step 3 — Start the Flask server

```bash
python app.py
```

Keep this terminal open. You should see:
```
✅  Model loaded
🚀  http://localhost:5000
```

---

### Step 4 — Use the Web Interface

Open your browser and go to: **http://localhost:5000**

---

### Step 5 — Load the Chrome Extension

1. Open Chrome and go to: `chrome://extensions`
2. Turn **ON** Developer mode (toggle at top right)
3. Click **"Load unpacked"**
4. Select the `extension/` folder inside your project
5. The extension icon appears in your Chrome toolbar
6. Go to any **Amazon product page** (amazon.com or amazon.in)
7. Scroll to the Customer Reviews section — badges appear automatically

---

## Web App Features

### Tab 1 — Analyze Review
- Paste any review text and click "Analyze Review" (or press Ctrl+Enter)
- See verdict: **FAKE** or **REAL**
- Confidence percentage (how sure the model is)
- Animated probability breakdown — donut chart showing fake vs real probability
- Signal words — the exact words that triggered the verdict (with stagger animation)
- Session stats bar — live counts of fake/real analyzed this session
- Session history — last 8 analyses shown at the bottom
- Export session results as CSV
- Try example reviews with one click

### Tab 2 — Bulk CSV Upload
- Drag and drop (or click to upload) a CSV/TXT file with reviews
- Supports up to **500 reviews** per upload
- Auto-detects the text column (looks for: text, review_text, review, comment, body)
- Live progress bar while processing
- Results table with verdict, confidence, and review snippet for every row
- Export all batch results as CSV

### Tab 3 — Compare Reviews
- Paste two reviews side by side
- Analyzes both simultaneously
- Shows full breakdown for each (verdict, confidence, fake/real probability, signal words)
- Winner declaration — tells you which review appears more trustworthy
- Handles ties (both fake, both real)

### Tab 4 — Session History
- Full table of every review analyzed this session
- Verdict, confidence, fake%, real%, snippet
- Export all as CSV
- Clear all history

### Dark / Light Mode
- Toggle button in the top-right navbar corner

---

## Browser Extension Features

### Inline Badges
Every review on Amazon gets a badge directly below it:
- `🚩 FAKE · 87% confident` (red badge)
- `✅ REAL · 93% confident` (green badge)
- Loading badge while the API processes it

### Hover Card
Hover over any badge to see a full breakdown:
- Full verdict
- Confidence score with animated bar
- Fake probability %
- Real probability %
- Top signal keywords (color-coded chips)

### Credibility Score Bar
A small colored bar next to each badge shows the review's **credibility score**
(= probability of being real), so you can quickly scan all reviews at a glance.

### Suspicious Sentence Highlighting
For reviews classified as **FAKE**, suspicious phrases are automatically
highlighted in the review text (e.g. excessive praise, multiple exclamation marks,
urgency phrases like "everyone must buy this").

### Summary Banner
At the top of the review section, a banner shows:
- How many reviews were analyzed on this page
- Total fake vs real count
- Fake rate percentage
- Warning level (high/moderate/low)

### Hide Fake Reviews Toggle
Click **"🚫 Hide fakes"** in the summary banner to collapse all fake reviews.
A stub replaces each hidden review with a "Show anyway" button. Click it again
to reveal them.

### Extension Popup Dashboard
Click the extension icon in Chrome's toolbar to see:
- Server status indicator (green = Flask running, red = offline)
- Session stats: fake count, real count, total, fake rate
- Fake/real ratio progress bar
- Scrollable history of all reviews scanned this session
- Export session data as CSV
- Clear history button

---

## API Endpoints

The Flask server exposes these endpoints (useful if you want to integrate further):

| Method | Endpoint     | Description                              |
|--------|--------------|------------------------------------------|
| GET    | /            | Serves the web interface                 |
| GET    | /health      | Server health check                      |
| POST   | /predict     | Analyze a single review                  |
| POST   | /batch       | Analyze up to 500 reviews at once        |
| GET    | /export/csv  | Download session results as CSV          |
| GET    | /stats       | Get server-side session statistics       |

### /predict request format:
```json
{ "text": "Your review text here" }
```

### /predict response format:
```json
{
  "verdict": "FAKE",
  "label": 1,
  "confidence": 87.3,
  "proba": { "fake": 0.873, "real": 0.127 },
  "keywords": [
    { "word": "amazing", "score": 0.0412 },
    { "word": "best ever", "score": 0.0389 }
  ]
}
```

### /batch request format:
```json
{ "texts": ["review one", "review two", "..."] }
```

---

## How the ML Model Works

1. **Data**: 21,000 Amazon reviews — 10,500 fake (`__label1__`), 10,500 real (`__label2__`)
2. **Cleaning**: lowercase, remove HTML tags, remove non-letter characters
3. **Features**: TF-IDF with 15,000 features, unigrams + bigrams, sublinear TF scaling
4. **Model**: Logistic Regression with balanced class weights
5. **Keywords**: For each prediction, TF-IDF score × model coefficient = feature importance score. Top 8 positive-scoring features are returned as signal words.
6. **Expected accuracy**: ~85–90% on test set

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `model.pkl not found` error | Run `python train_model.py` first |
| Extension shows "Offline — run app.py" | Start Flask with `python app.py` |
| No badges appear on Amazon | Scroll to the "Customer reviews" section and wait 2–3 seconds |
| `ModuleNotFoundError` | Run `pip install flask flask-cors scikit-learn pandas numpy` |
| `on_bad_lines` error | Update pandas: `pip install --upgrade pandas` |
| Bulk upload shows "No review text found" | Make sure CSV has a column named: text, review_text, review, or comment |
| Extension doesn't load | Check chrome://extensions for error messages; reload the extension |

---

## Dataset Reference

- **File**: `amazon_reviews.txt`
- **Source**: Kaggle — Amazon Fake Review Detection dataset
- **Size**: 21,000 reviews
- **Labels**: `__label1__` = Fake, `__label2__` = Real
- **Columns used**: `REVIEW_TEXT` (input), `LABEL` (target)

---

*Built for PBL (Project Based Learning) — NLP + ML · Flask + Chrome Extension*
