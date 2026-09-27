import io
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from flask import Flask, jsonify, render_template, request, send_file

MODEL_PATH = Path(__file__).with_name("energy_efficiency_model.joblib")
DATA_PATH = Path(__file__).with_name("energy_efficiency_data.csv")

app = Flask(__name__)


@lru_cache(maxsize=1)
def load_bundle():
    """Load the trained machine learning bundle."""
    if not MODEL_PATH.exists():
        import train_model

        train_model.train_and_evaluate()
    return joblib.load(MODEL_PATH)


PRESET_PROFILES = {
    "Eco Compact Home": {
        "title": "Eco Compact Home",
        "description": "Single-story residence optimized for passive thermal efficiency",
        "features": {
            "X1": 0.86,
            "X2": 588.0,
            "X3": 318.5,
            "X4": 134.75,
            "X5": 3.5,
            "X6": 2,
            "X7": 0.10,
            "X8": 1,
        },
        "context": {
            "project_type": "Residential",
            "climate_zone": "Temperate",
            "insulation": "High",
            "glazing": "Double",
        },
    },
    "Two-Story Modern Villa": {
        "title": "Two-Story Modern Villa",
        "description": "Multi-floor residential structure with balanced glazing",
        "features": {
            "X1": 0.76,
            "X2": 661.5,
            "X3": 416.5,
            "X4": 122.5,
            "X5": 7.0,
            "X6": 3,
            "X7": 0.25,
            "X8": 2,
        },
        "context": {
            "project_type": "Residential",
            "climate_zone": "Cold",
            "insulation": "High",
            "glazing": "Triple",
        },
    },
    "High-Exposure Office": {
        "title": "High-Exposure Office",
        "description": "Commercial building with large floor plate and substantial glazing",
        "features": {
            "X1": 0.62,
            "X2": 808.5,
            "X3": 367.5,
            "X4": 220.5,
            "X5": 7.0,
            "X6": 4,
            "X7": 0.40,
            "X8": 4,
        },
        "context": {
            "project_type": "Office",
            "climate_zone": "Hot",
            "insulation": "Medium",
            "glazing": "Double",
        },
    },
    "Minimal Glazing Warehouse": {
        "title": "Minimal Glazing Warehouse",
        "description": "Single-level industrial facility with low window-to-wall ratio",
        "features": {
            "X1": 0.90,
            "X2": 563.5,
            "X3": 269.5,
            "X4": 147.0,
            "X5": 3.5,
            "X6": 5,
            "X7": 0.00,
            "X8": 0,
        },
        "context": {
            "project_type": "Retail",
            "climate_zone": "Temperate",
            "insulation": "Medium",
            "glazing": "Single",
        },
    },
}


def compute_energy_rating(total_load):
    """Assign international building efficiency grade based on annual thermal load (kWh/m²)."""
    if total_load < 30.0:
        return {
            "grade": "A+",
            "label": "Ultra-Low Energy (Passive)",
            "color": "#10b981",
            "badge_class": "badge-a-plus",
            "summary": "Outstanding envelope performance meeting near-zero energy building benchmarks.",
        }
    elif total_load < 45.0:
        return {
            "grade": "A",
            "label": "High Efficiency",
            "color": "#059669",
            "badge_class": "badge-a",
            "summary": "Excellent energy economy with low HVAC consumption.",
        }
    elif total_load < 60.0:
        return {
            "grade": "B",
            "label": "Standard Efficiency",
            "color": "#2563eb",
            "badge_class": "badge-b",
            "summary": "Typical modern residential building performance.",
        }
    elif total_load < 75.0:
        return {
            "grade": "C",
            "label": "Moderate Consumption",
            "color": "#d97706",
            "badge_class": "badge-c",
            "summary": "Acceptable, but insulation and solar heat gain improvements will yield noticeable savings.",
        }
    elif total_load < 90.0:
        return {
            "grade": "D",
            "label": "High Energy Demand",
            "color": "#ea580c",
            "badge_class": "badge-d",
            "summary": "Substantial heating/cooling loss. Thermal envelope retrofit strongly recommended.",
        }
    else:
        return {
            "grade": "E",
            "label": "Critical Consumption",
            "color": "#dc2626",
            "badge_class": "badge-e",
            "summary": "Excessive thermal load driven by high surface area and unshaded glazing.",
        }


def generate_recommendations(features, context, heating_load, cooling_load):
    """Generate domain-specific architectural and energy engineering guidance."""
    notes = []

    compactness = features.get("X1", 0.76)
    height = features.get("X5", 7.0)
    glazing_ratio = features.get("X7", 0.25)
    orientation = features.get("X6", 2)
    climate = context.get("climate_zone", "Temperate")
    insulation = context.get("insulation", "Medium")
    glazing_type = context.get("glazing", "Double")

    # Compactness & Geometry
    if compactness < 0.70:
        notes.append(
            "Building compactness is low (high surface-to-volume ratio), causing increased heat transfer through exterior facades. Consider consolidating floorplans or adding vestibules."
        )
    elif compactness > 0.85:
        notes.append(
            "High relative compactness provides excellent envelope surface retention, inherently buffering indoor temperatures."
        )

    # Height and Multi-story effects
    if height >= 7.0:
        notes.append(
            "Two-story configuration increases stack ventilation potential, but upper levels experience higher solar roof gain during summer."
        )

    # Glazing & Orientation
    if glazing_ratio >= 0.40:
        if climate in ["Hot", "Temperate"]:
            notes.append(
                "High window-to-wall ratio (40%) drives elevated cooling demand. Incorporate exterior overhangs, louvers, or low solar heat gain coefficient (SHGC) films."
            )
        else:
            notes.append(
                "Extensive glazing area allows ample daylighting, but demands high-spec insulated frames and triple glazing to prevent winter perimeter chill."
            )
    elif glazing_ratio <= 0.10:
        notes.append(
            "Low glazing percentage minimizes thermal leakage but may require supplementary artificial lighting. Consider strategic clerestory windows."
        )

    # Orientation specific
    if orientation == 4:  # South
        notes.append(
            "South-facing orientation maximizes winter passive solar gains. Ensure horizontal roof overhangs prevent unwanted summer overheating."
        )
    elif orientation == 5:  # West
        notes.append(
            "West-facing orientation introduces harsh late-afternoon solar glare and spike cooling loads. Vertical shading fins are advised."
        )

    # Envelope Insulation & Glass
    if insulation == "Low":
        notes.append(
            "Upgrading exterior wall and roof cavity insulation from Low to High can reduce thermal transmission loads by 18–28%."
        )
    if glazing_type == "Single":
        notes.append(
            "Replacing single-pane windows with argon-filled low-E double or triple glazing can significantly suppress both heating and cooling peak loads."
        )

    return notes


@app.route("/")
def index():
    bundle = load_bundle()
    return render_template(
        "index.html",
        feature_names=bundle["feature_names"],
        feature_meta=bundle.get("feature_meta", {}),
        target_meta=bundle.get("target_meta", {}),
        metrics=bundle.get("metrics", {}),
        models=list(bundle.get("models", {}).keys()),
        default_model=bundle.get("default_model", "Gradient Boosting"),
        preset_profiles=PRESET_PROFILES,
        data_stats=bundle.get("data_stats", {}),
        benchmarks=bundle.get("sample_benchmarks", []),
    )


@app.route("/api/config", methods=["GET"])
def get_config():
    bundle = load_bundle()
    return jsonify(
        {
            "feature_names": bundle["feature_names"],
            "feature_meta": bundle.get("feature_meta", {}),
            "target_meta": bundle.get("target_meta", {}),
            "available_models": list(bundle.get("models", {}).keys()),
            "default_model": bundle.get("default_model", "Gradient Boosting"),
            "metrics": bundle.get("metrics", {}),
            "presets": PRESET_PROFILES,
            "stats": bundle.get("data_stats", {}),
        }
    )


@app.route("/api/models", methods=["GET"])
def get_models():
    bundle = load_bundle()
    return jsonify(
        {
            "models": bundle.get("metrics", {}),
            "default_model": bundle.get("default_model", "Gradient Boosting"),
        }
    )


@app.route("/api/feature-importance", methods=["GET"])
def get_feature_importance():
    bundle = load_bundle()
    return jsonify(bundle.get("feature_importances", {}))


@app.route("/api/samples", methods=["GET"])
def get_samples():
    bundle = load_bundle()
    return jsonify(bundle.get("sample_benchmarks", []))


@app.route("/api/predict", methods=["POST"])
def predict():
    bundle = load_bundle()
    models = bundle.get("models", {})
    feature_names = bundle["feature_names"]

    payload = request.get_json(force=True) or {}
    model_name = payload.get("model_name", bundle.get("default_model", "Gradient Boosting"))

    # Select model or fallback to default
    selected_model = models.get(model_name) or bundle.get("model")

    # Extract features in ordered sequence
    values = []
    features_dict = {}
    for feature in feature_names:
        default_val = PRESET_PROFILES["Eco Compact Home"]["features"].get(feature, 0.0)
        raw_val = payload.get(feature, default_val)
        try:
            val = float(raw_val)
        except (ValueError, TypeError):
            val = float(default_val)
        values.append(val)
        features_dict[feature] = val

    sample_df = pd.DataFrame([values], columns=feature_names)
    preds = selected_model.predict(sample_df)[0]

    heating_load = max(0.0, float(preds[0]))
    cooling_load = max(0.0, float(preds[1]))
    total_load = heating_load + cooling_load
    average_load = total_load / 2.0

    context = {
        "project_type": payload.get("project_type", "Residential"),
        "climate_zone": payload.get("climate_zone", "Temperate"),
        "insulation": payload.get("insulation", "Medium"),
        "glazing": payload.get("glazing", "Double"),
    }

    rating = compute_energy_rating(total_load)
    recommendations = generate_recommendations(
        features_dict, context, heating_load, cooling_load
    )

    # Estimate annual carbon footprint (approx 0.21 kg CO2 per kWh)
    carbon_footprint = round(total_load * 0.21, 2)
    # Estimate annual energy cost ($0.16 per kWh)
    annual_energy_cost = round(total_load * 0.16, 2)

    return jsonify(
        {
            "heating_load": round(heating_load, 2),
            "cooling_load": round(cooling_load, 2),
            "total_load": round(total_load, 2),
            "average_load": round(average_load, 2),
            "model_used": model_name,
            "model_accuracy": bundle.get("metrics", {}).get(model_name, {}),
            "rating": rating,
            "carbon_footprint_kg_m2": carbon_footprint,
            "estimated_annual_cost_usd_m2": annual_energy_cost,
            "recommendations": recommendations,
            "recommendation": " ".join(recommendations),
            "features": features_dict,
        }
    )


@app.route("/api/predict-batch", methods=["POST"])
def predict_batch():
    """Accepts CSV or JSON array of building design rows and returns batch predictions."""
    bundle = load_bundle()
    model = bundle["models"].get("Gradient Boosting", bundle["model"])
    feature_names = bundle["feature_names"]

    rows = []
    if "file" in request.files:
        uploaded_file = request.files["file"]
        df_input = pd.read_csv(uploaded_file)
        for col in feature_names:
            if col not in df_input.columns:
                return jsonify({"error": f"Missing required column: {col}"}), 400
        rows = df_input[feature_names].to_dict(orient="records")
    else:
        payload = request.get_json(force=True) or {}
        rows = payload.get("rows", [])

    if not rows:
        return jsonify({"error": "No valid data rows provided"}), 400

    df_predict = pd.DataFrame(rows)[feature_names]
    preds = model.predict(df_predict)

    results = []
    for i, row in enumerate(rows):
        h = max(0.0, float(preds[i, 0]))
        c = max(0.0, float(preds[i, 1]))
        tot = h + c
        rating = compute_energy_rating(tot)
        results.append(
            {
                "index": i + 1,
                **row,
                "heating_load": round(h, 2),
                "cooling_load": round(c, 2),
                "total_load": round(tot, 2),
                "rating": rating["grade"],
            }
        )

    return jsonify({"count": len(results), "results": results})


@app.route("/api/export-dataset", methods=["GET"])
def export_dataset():
    """Provides downloadable CSV copy of the UCI dataset."""
    if DATA_PATH.exists():
        return send_file(DATA_PATH, mimetype="text/csv", as_attachment=True, download_name="energy_efficiency_uci_242.csv")
    return jsonify({"error": "Dataset file not found"}), 404


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)