# ⚡ EnergySight AI — UCI Energy Efficiency Machine Learning & Dashboard

A comprehensive, production-grade Machine Learning pipeline and interactive web dashboard trained on the **UCI Energy Efficiency Dataset** ([UCI #242](https://archive.ics.uci.edu/dataset/242/energy+efficiency)).

The system predicts both **Heating Load ($Y_1$)** and **Cooling Load ($Y_2$)** from 8 architectural building design parameters, assigns international energy performance grades ($A^+$ through $E$), generates tailored architectural recommendations, and displays a live 2.5D isometric envelope visualization.

---

## 📊 Dataset & Variables

From the research by Angeliki Xifara and Athanasios Tsanas (*Energy and Buildings*, 2012), the dataset comprises **768 simulated building designs**:

### Input Features ($X_1 - X_8$)
| Code | Feature Name | Range / Values | Units | Domain Meaning |
| :--- | :--- | :--- | :--- | :--- |
| **X1** | Relative Compactness | 0.62 – 0.98 | ratio | Building shape volume-to-surface compactness |
| **X2** | Surface Area | 514.5 – 808.5 | m² | Total exterior envelope area |
| **X3** | Wall Area | 245.0 – 416.5 | m² | Total exterior vertical wall area |
| **X4** | Roof Area | 110.25 – 220.5 | m² | Total roof horizontal/inclined area |
| **X5** | Overall Height | 3.5 or 7.0 | m | 3.5m (1-Story) or 7.0m (2-Story) |
| **X6** | Orientation | 2, 3, 4, 5 | cardinal | 2: North, 3: East, 4: South, 5: West |
| **X7** | Glazing Area | 0.00, 0.10, 0.25, 0.40 | fraction | Window-to-floor area percentage |
| **X8** | Glazing Distribution | 0, 1, 2, 3, 4, 5 | category | 0: None, 1: Uniform, 2: North, 3: East, 4: South, 5: West |

### Target Outputs ($Y_1, Y_2$)
- **$Y_1$ — Heating Load**: Annual thermal heating energy demand ($6.01 - 43.10\ \text{kWh/m}^2$)
- **$Y_2$ — Cooling Load**: Annual thermal cooling energy demand ($10.90 - 48.03\ \text{kWh/m}^2$)

---

## 🏆 Model Training & Benchmark Results

The training pipeline in [`train_model.py`](file:///c:/Users/hpnar/OneDrive/Documents/Iml%20Project/train_model.py) evaluates multiple regression models on a reproducible 80/20 train/test split:

| Model Architecture | $R^2$ (Heating $Y_1$) | $R^2$ (Cooling $Y_2$) | $R^2$ Average | RMSE ($Y_1$) | RMSE ($Y_2$) | RMSE Average |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Gradient Boosting (Best)** | **0.9985** | **0.9854** | **0.9919 (99.2%)** | **0.4003** | **1.1636** | **0.7820 kWh/m²** |
| **Random Forest** | 0.9977 | 0.9612 | 0.9795 (97.9%) | 0.4912 | 1.8964 | 1.1938 kWh/m² |
| **Linear Regression** | 0.9122 | 0.8932 | 0.9027 (90.3%) | 3.0254 | 3.1454 | 3.0854 kWh/m² |
| **Ridge Regression** | 0.9074 | 0.8883 | 0.8979 (89.8%) | 3.1070 | 3.2164 | 3.1617 kWh/m² |

> **Key Finding**: Gradient Boosting reduces the mean prediction error from $> 3.08\ \text{kWh/m}^2$ (linear baseline) down to **$0.78\ \text{kWh/m}^2$** with an overall $R^2 > 99\%$.

---

## 🎨 Interactive UI Features

- **🎯 Interactive Simulator**:
  - Synchronized sliders & number input pairs with domain validation.
  - Archetype Presets: *Eco Compact Home*, *Two-Story Villa*, *High-Exposure Office*, and *Warehouse*.
  - **Ground Truth Benchmark Selector**: Test real held-out buildings and verify predictions against actual measurements in real time with error tolerances.
  - Model Selector: Switch between Gradient Boosting, Random Forest, and Linear Regression to compare model predictions instantly.
  - Live calculation toggle (real-time recalculation as you drag sliders).
- **🏛️ 2.5D Isometric Architectural Visualizer**:
  - Dynamically updates building height (1-story vs 2-story), window glazing arrays, compass orientation, and thermal load color grading (cyan/blue for low energy, orange/red for high energy).
- **🏷️ Performance Class Rating ($A^+$ to $E$)**:
  - Instant classification based on global building energy benchmarking standards.
- **🌱 Carbon Footprint & Cost Estimation**:
  - Real-time conversion into $\text{kg CO}_2/\text{m}^2/\text{year}$ and annual energy utility expenses.
- **📊 Model Comparison Tab**:
  - Detailed side-by-side benchmark table with $R^2$, RMSE, and MAE across all algorithms.
- **📈 Feature Importance Tab**:
  - Visual ranking of the most impactful drivers for heating load vs cooling load.
- **📁 Batch Predictor Tab**:
  - Upload custom CSV files or run built-in batch tests with instant tabular forecast and CSV export.

---

## 🚀 Running Locally

### 1. Python Environment Setup
```powershell
# Create and activate virtual environment (if not already done)
python -m venv .venv
.\.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Retrain Models (Optional)
```powershell
python train_model.py
```

### 3. Launch Flask Server
```powershell
python app.py
```
Open your browser at:
👉 **[http://localhost:5000](http://localhost:5000)**

### 4. Running Node Server (Alternative)
```powershell
npm start
```
The Node server runs on **[http://localhost:3000](http://localhost:3000)** and automatically proxies API requests to the Flask ML backend.

---

## 📁 Repository Structure

```text
├── train_model.py               # Dataset ingestion, multi-model training & export
├── app.py                       # Flask REST API & Web Server
├── server.js                    # Node.js server with proxy & fallback capabilities
├── energy_efficiency_model.joblib # Serialized model bundle with all metrics
├── energy_efficiency_data.csv   # Local backup copy of UCI #242 dataset
├── requirements.txt             # Python package dependencies
├── package.json                 # Node package configuration
├── templates/
│   └── index.html               # Main Jinja2 dashboard template
├── static/
│   ├── styles.css               # Modern CSS variables, grid layouts & responsive design
│   └── app.js                   # Client state management, 2.5D SVG rendering & API logic
└── public/                      # Standalone static distribution for Node.js
```
