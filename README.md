# ⚡ EnergySight AI — Building Energy Efficiency Predictor

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0%2B-lightgrey.svg)](https://flask.palletsprojects.com/)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.5%2B-orange.svg)](https://scikit-learn.org/)
[![Dataset](https://img.shields.io/badge/UCI%20Dataset-242%20Energy%20Efficiency-green.svg)](https://archive.ics.uci.edu/dataset/242/energy+efficiency)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

An end-to-end Machine Learning web application that predicts **Heating Load ($Y_1$)** and **Cooling Load ($Y_2$)** based on 8 architectural building design parameters from the **UCI Energy Efficiency Dataset**. Features a modern web dashboard with real-time interactive calculations, dynamic 2.5D building wireframes, archetype presets, model comparisons, and batch CSV predictions.

---

## 📌 Table of Contents
- [Dataset Overview](#-dataset-overview)
- [Model Performance & Benchmarks](#-model-performance--benchmarks)
- [Features of the Web Dashboard](#-features-of-the-web-dashboard)
- [Project Architecture](#-project-architecture)
- [Getting Started](#-getting-started)
- [API Endpoints](#-api-endpoints)
- [Citation & References](#-citation--references)

---

## 📊 Dataset Overview

The dataset comes from the **[UCI Machine Learning Repository (Dataset #242)](https://archive.ics.uci.edu/dataset/242/energy+efficiency)**, simulated using *Ecotect* across 768 distinct residential building designs.

### Input Features ($X_1 - X_8$)
| Code | Feature Name | Range / Values | Unit | Description |
| :--- | :--- | :--- | :--- | :--- |
| **$X_1$** | **Relative Compactness** | 0.62 – 0.98 | ratio | Ratio of building surface area to volume relative to a reference cube |
| **$X_2$** | **Surface Area** | 514.5 – 808.5 | $\text{m}^2$ | Total exterior envelope surface area |
| **$X_3$** | **Wall Area** | 245.0 – 416.5 | $\text{m}^2$ | Total vertical exterior wall area |
| **$X_4$** | **Roof Area** | 110.25 – 220.5 | $\text{m}^2$ | Total horizontal and inclined roof area |
| **$X_5$** | **Overall Height** | 3.5 or 7.0 | $\text{m}$ | $3.5\text{ m}$ (Single Storey) or $7.0\text{ m}$ (Two Storey) |
| **$X_6$** | **Orientation** | 2, 3, 4, 5 | cardinal | Primary facade direction: 2 = North, 3 = East, 4 = South, 5 = West |
| **$X_7$** | **Glazing Area** | 0.0, 0.10, 0.25, 0.40 | ratio | Window-to-floor area percentage ($0\% - 40\%$) |
| **$X_8$** | **Glazing Distribution**| 0, 1, 2, 3, 4, 5 | category | 0 = None, 1 = Uniform, 2 = North, 3 = East, 4 = South, 5 = West |

### Target Variables ($Y_1, Y_2$)
- **$Y_1$ (Heating Load)**: Annual thermal energy required for heating ($6.01 - 43.10\ \text{kWh/m}^2$).
- **$Y_2$ (Cooling Load)**: Annual thermal energy required for cooling ($10.90 - 48.03\ \text{kWh/m}^2$).

---

## 🏆 Model Performance & Benchmarks

All models were evaluated using an 80/20 train/test split. Gradient Boosting dramatically outperforms baseline linear models:

| Algorithm | $R^2$ (Heating $Y_1$) | $R^2$ (Cooling $Y_2$) | $R^2$ Average | RMSE Average | MAE Average | Role |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Gradient Boosting** | **0.9985** | **0.9854** | **0.9919 (99.2%)** | **0.7820 kWh/m²** | **0.5300 kWh/m²** | **Active Default** |
| **Random Forest** | 0.9977 | 0.9612 | 0.9795 (97.9%) | 1.1938 kWh/m² | 0.7528 kWh/m² | Selectable |
| **Linear Regression** | 0.9122 | 0.8932 | 0.9027 (90.3%) | 3.0854 kWh/m² | 2.1887 kWh/m² | Baseline |
| **Ridge Regression** | 0.9074 | 0.8883 | 0.8979 (89.8%) | 3.1617 kWh/m² | 2.3030 kWh/m² | Regularized |

---

## 🎨 Features of the Web Dashboard

- **⚡ Real-Time Energy Calculator**: Instant prediction as you drag sliders ($X_1 - X_4$) or switch segmented buttons ($X_5 - X_8$).
- **🏛️ Dynamic 2.5D Isometric SVG Visualizer**:
  - Live height transition ($3.5\text{ m}$ vs $7.0\text{ m}$).
  - Procedurally generated facade windows based on glazing ratio.
  - Rotating cardinal compass needle matching selected orientation.
  - Thermal color shifting from cool cyan (efficient) to amber/red (high load).
- **🏡 1-Click Archetype Presets**: Instant loading for *Eco Compact Home*, *Two-Story Villa*, *High-Exposure Office*, and *Industrial Warehouse*.
- **🎯 Real Test Benchmark Verification**: Compare the model's output side-by-side with actual ground-truth measurements from held-out test buildings.
- **🏷️ Performance Class Rating ($A^+$ to $E$)**: Automatic energy efficiency classification according to building envelope benchmarks.
- **🌱 Environmental & Cost Analytics**: Estimates annual carbon footprint ($\text{kg CO}_2/\text{m}^2/\text{yr}$) and HVAC electricity costs.
- **📈 Feature Importance Ranking**: Interactive bar charts displaying the most influential parameters driving heating and cooling loads.
- **📁 Batch Predictor**: Upload CSV datasets or run the demo batch with export to CSV.

---

## 📁 Project Architecture

```text
├── train_model.py                 # Multi-model training, evaluation & joblib bundle export
├── app.py                         # Flask REST API backend & web server
├── server.js                      # Optional Node.js proxy server
├── run.bat                        # 1-click Windows launcher (starts server + opens browser)
├── energy_efficiency_model.joblib # Serialized trained models & evaluation metrics
├── energy_efficiency_data.csv     # Local backup of UCI #242 dataset (768 rows)
├── requirements.txt               # Python package dependencies
├── package.json                   # Node.js dependencies
├── templates/
│   └── index.html                 # Jinja2 dashboard interface
├── static/
│   ├── styles.css                 # Modern CSS design system & responsive layout
│   └── app.js                     # Interactive client state, SVG rendering & API calls
└── public/                        # Standalone static files
```

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/nidhisharman1405/iml-project.git
cd iml-project
```

### 2. Set Up Virtual Environment & Install Dependencies
```bash
python -m venv .venv

# On Windows:
.\.venv\Scripts\activate

# On macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. (Optional) Retrain the Machine Learning Models
```bash
python train_model.py
```

### 4. Run the Application
```bash
python app.py
```
Open your browser and navigate to:
👉 **`http://localhost:5000`**

*(On Windows, you can also double-click `run.bat` to launch the server and browser automatically).*

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Web dashboard user interface |
| `GET` | `/api/config` | Feature metadata, allowed ranges, and default presets |
| `POST` | `/api/predict` | Predicts $Y_1$ & $Y_2$ loads, energy class rating, and recommendations |
| `GET` | `/api/models` | Benchmark comparison metrics ($R^2$, RMSE, MAE) for all algorithms |
| `GET` | `/api/feature-importance`| Feature importance scores for heating and cooling models |
| `GET` | `/api/samples` | Real benchmark test cases with actual target values |
| `POST` | `/api/predict-batch` | Accepts JSON array or CSV file and returns batch predictions |
| `GET` | `/api/export-dataset` | Downloads the raw UCI 768-sample CSV dataset |

---

## 📚 Citation & References

- **Dataset Creators**: Angeliki Xifara and Athanasios Tsanas (University of Oxford).
- **Reference Paper**: Tsanas, A., & Xifara, A. (2012). *Accurate quantitative estimation of energy performance of residential buildings using statistical machine learning tools.* Energy and Buildings, 49, 560-567. [DOI: 10.1016/j.enbuild.2012.03.003](https://doi.org/10.1016/j.enbuild.2012.03.003)
- **Repository**: [UCI Machine Learning Repository #242](https://archive.ics.uci.edu/dataset/242/energy+efficiency)

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
