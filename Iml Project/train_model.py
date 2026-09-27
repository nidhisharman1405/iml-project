import os
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import LinearRegression, Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.multioutput import MultiOutputRegressor
from ucimlrepo import fetch_ucirepo

DATASET_ID = 242
MODEL_PATH = Path("energy_efficiency_model.joblib")
CSV_PATH = Path("energy_efficiency_data.csv")

FEATURE_COLUMNS = [f"X{i}" for i in range(1, 9)]
TARGET_COLUMNS = ["Y1", "Y2"]

FEATURE_META = {
    "X1": {
        "name": "Relative Compactness",
        "description": "Ratio of building surface area to volume relative to a reference cube",
        "unit": "ratio",
        "min": 0.62,
        "max": 0.98,
        "default": 0.76,
        "step": 0.01,
    },
    "X2": {
        "name": "Surface Area",
        "description": "Total exterior surface area of the building envelope",
        "unit": "m²",
        "min": 514.5,
        "max": 808.5,
        "default": 661.5,
        "step": 0.5,
    },
    "X3": {
        "name": "Wall Area",
        "description": "Total exterior wall area",
        "unit": "m²",
        "min": 245.0,
        "max": 416.5,
        "default": 318.5,
        "step": 0.5,
    },
    "X4": {
        "name": "Roof Area",
        "description": "Total roof surface area",
        "unit": "m²",
        "min": 110.25,
        "max": 220.5,
        "default": 171.5,
        "step": 0.25,
    },
    "X5": {
        "name": "Overall Height",
        "description": "Building height (3.5m = single story, 7.0m = two story)",
        "unit": "m",
        "min": 3.5,
        "max": 7.0,
        "default": 7.0,
        "step": 3.5,
    },
    "X6": {
        "name": "Orientation",
        "description": "Cardinal orientation of the building facade",
        "unit": "direction",
        "min": 2,
        "max": 5,
        "default": 2,
        "step": 1,
        "options": {
            2: "North (2)",
            3: "East (3)",
            4: "South (4)",
            5: "West (5)",
        },
    },
    "X7": {
        "name": "Glazing Area",
        "description": "Glazing area as percentage of floor area",
        "unit": "fraction",
        "min": 0.0,
        "max": 0.40,
        "default": 0.25,
        "step": 0.05,
        "options": {
            0.0: "0% (No Glazing)",
            0.10: "10% (Low Glazing)",
            0.25: "25% (Medium Glazing)",
            0.40: "40% (High Glazing)",
        },
    },
    "X8": {
        "name": "Glazing Area Distribution",
        "description": "Distribution of window glazing around the envelope",
        "unit": "category",
        "min": 0,
        "max": 5,
        "default": 1,
        "step": 1,
        "options": {
            0: "0 - None / Unspecified",
            1: "1 - Uniform across all facades",
            2: "2 - North primary orientation",
            3: "3 - East primary orientation",
            4: "4 - South primary orientation",
            5: "5 - West primary orientation",
        },
    },
}

TARGET_META = {
    "Y1": {
        "name": "Heating Load",
        "unit": "kWh/m²",
        "description": "Annual thermal energy required for heating per unit floor area",
    },
    "Y2": {
        "name": "Cooling Load",
        "unit": "kWh/m²",
        "description": "Annual thermal energy required for cooling per unit floor area",
    },
}


def load_dataset():
    """Fetch from UCI repo or load from local CSV backup."""
    if CSV_PATH.exists():
        print(f"Loading dataset from local cache: {CSV_PATH}")
        df = pd.read_csv(CSV_PATH)
        X = df[FEATURE_COLUMNS].copy()
        y = df[TARGET_COLUMNS].copy()
        return X, y

    print(f"Fetching dataset #{DATASET_ID} from UCI Machine Learning Repository...")
    dataset = fetch_ucirepo(id=DATASET_ID)
    X = dataset.data.features.copy()
    y = dataset.data.targets.copy()

    X.columns = FEATURE_COLUMNS
    y.columns = TARGET_COLUMNS

    # Save local copy for offline reliability
    combined = pd.concat([X, y], axis=1)
    combined.to_csv(CSV_PATH, index=False)
    print(f"Saved dataset backup to: {CSV_PATH} ({len(combined)} rows)")

    return X, y


def train_and_evaluate():
    X, y = load_dataset()

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    models = {
        "Gradient Boosting": MultiOutputRegressor(
            GradientBoostingRegressor(
                n_estimators=160,
                learning_rate=0.08,
                max_depth=4,
                random_state=42,
            )
        ),
        "Random Forest": RandomForestRegressor(
            n_estimators=150,
            max_depth=12,
            min_samples_split=2,
            random_state=42,
        ),
        "Linear Regression": LinearRegression(),
        "Ridge Regression": Ridge(alpha=1.0),
    }

    metrics = {}
    fitted_models = {}

    for name, model in models.items():
        print(f"Training {name}...")
        model.fit(X_train, y_train)
        preds = model.predict(X_test)

        y1_true = y_test["Y1"].values
        y2_true = y_test["Y2"].values
        y1_pred = preds[:, 0]
        y2_pred = preds[:, 1]

        rmse_y1 = float(np.sqrt(mean_squared_error(y1_true, y1_pred)))
        rmse_y2 = float(np.sqrt(mean_squared_error(y2_true, y2_pred)))
        rmse_avg = float((rmse_y1 + rmse_y2) / 2.0)

        mae_y1 = float(mean_absolute_error(y1_true, y1_pred))
        mae_y2 = float(mean_absolute_error(y2_true, y2_pred))
        mae_avg = float((mae_y1 + mae_y2) / 2.0)

        r2_y1 = float(r2_score(y1_true, y1_pred))
        r2_y2 = float(r2_score(y2_true, y2_pred))
        r2_avg = float((r2_y1 + r2_y2) / 2.0)

        metrics[name] = {
            "rmse_y1": round(rmse_y1, 4),
            "rmse_y2": round(rmse_y2, 4),
            "rmse_avg": round(rmse_avg, 4),
            "mae_y1": round(mae_y1, 4),
            "mae_y2": round(mae_y2, 4),
            "mae_avg": round(mae_avg, 4),
            "r2_y1": round(r2_y1, 4),
            "r2_y2": round(r2_y2, 4),
            "r2_avg": round(r2_avg, 4),
        }
        fitted_models[name] = model

        print(
            f"  {name} -> R² Avg: {r2_avg:.4f} (Y1: {r2_y1:.4f}, Y2: {r2_y2:.4f}), "
            f"RMSE Avg: {rmse_avg:.4f}, MAE Avg: {mae_avg:.4f}"
        )

    # Calculate Feature Importances from Gradient Boosting & Random Forest
    rf_model = fitted_models["Random Forest"]
    gb_model = fitted_models["Gradient Boosting"]

    # For Gradient Boosting: estimator 0 is Y1, estimator 1 is Y2
    gb_y1_imp = gb_model.estimators_[0].feature_importances_
    gb_y2_imp = gb_model.estimators_[1].feature_importances_
    rf_imp = rf_model.feature_importances_

    feature_importances = {
        "gradient_boosting": {
            "heating_load": {
                feat: round(float(imp), 4)
                for feat, imp in zip(FEATURE_COLUMNS, gb_y1_imp)
            },
            "cooling_load": {
                feat: round(float(imp), 4)
                for feat, imp in zip(FEATURE_COLUMNS, gb_y2_imp)
            },
        },
        "random_forest": {
            "overall": {
                feat: round(float(imp), 4)
                for feat, imp in zip(FEATURE_COLUMNS, rf_imp)
            }
        },
    }

    # Summary statistics for features
    stats = {}
    for col in FEATURE_COLUMNS:
        stats[col] = {
            "min": float(X[col].min()),
            "max": float(X[col].max()),
            "mean": float(round(X[col].mean(), 2)),
            "std": float(round(X[col].std(), 2)),
        }

    # Extract 6 diverse test benchmark samples for 1-click evaluation
    sample_indices = [0, 15, 32, 64, 99, 140]
    sample_benchmarks = []
    for idx in sample_indices:
        if idx < len(X_test):
            row_x = X_test.iloc[idx].to_dict()
            row_y = y_test.iloc[idx].to_dict()
            sample_benchmarks.append(
                {
                    "title": f"Test Building #{idx+1}",
                    "features": {k: float(v) for k, v in row_x.items()},
                    "actual": {
                        "heating_load": round(float(row_y["Y1"]), 2),
                        "cooling_load": round(float(row_y["Y2"]), 2),
                    },
                }
            )

    bundle = {
        "models": fitted_models,
        "default_model": "Gradient Boosting",
        # Keep legacy model key so any existing code remains backward-compatible
        "model": fitted_models["Gradient Boosting"],
        "feature_names": FEATURE_COLUMNS,
        "target_names": TARGET_COLUMNS,
        "feature_meta": FEATURE_META,
        "target_meta": TARGET_META,
        "metrics": metrics,
        "feature_importances": feature_importances,
        "data_stats": stats,
        "sample_benchmarks": sample_benchmarks,
        "total_samples": len(X),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
    }

    joblib.dump(bundle, MODEL_PATH)
    print(f"\nBundle successfully saved to: {MODEL_PATH}")
    print(f"Default best model: Gradient Boosting (R² = {metrics['Gradient Boosting']['r2_avg']:.4f})")
    print(f"Baseline model: Linear Regression (R² = {metrics['Linear Regression']['r2_avg']:.4f})")
    return bundle


if __name__ == "__main__":
    train_and_evaluate()
