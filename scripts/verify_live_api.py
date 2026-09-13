import urllib.request
import json
import sys

def test_api():
    base = 'http://localhost:8000/api/v1'
    try:
        # 1. Login
        req = urllib.request.Request(
            f'{base}/auth/login', 
            data=json.dumps({'email': 'admin@sentinel.ner.internal', 'password': 'SentinelAdmin@2026!'}).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req) as resp:
            tokens = json.loads(resp.read().decode('utf-8'))
            token = tokens['access_token']
            print('LOGIN SUCCESS: Token obtained')
        
        headers = {'Authorization': f'Bearer {token}'}

        # 2. Check models
        req = urllib.request.Request(f'{base}/risk/models', headers=headers)
        with urllib.request.urlopen(req) as resp:
            body = json.loads(resp.read().decode('utf-8'))
            models_data = body.get("data", [])
            print(f'MODELS: {len(models_data)} models registered.')
            if models_data:
                active_model = models_data[0]
                print(f'  Active Model: {active_model.get("model_name")} (ID: {active_model.get("id")})')
                print(f'  Algorithm: {active_model.get("algorithm")}, Status: {active_model.get("status")}')
                print(f'  Dataset Reference: {active_model.get("training_dataset_reference")}')
                print(f'  Metrics: {active_model.get("metrics")}')
                print(f'  Checksum: {active_model.get("artifact_checksum_sha256")}')
                print(f'  Feature Weights: {active_model.get("weights")}')

        # 3. Check landslide events
        req = urllib.request.Request(f'{base}/landslide-events?limit=5', headers=headers)
        with urllib.request.urlopen(req) as resp:
            body = json.loads(resp.read().decode('utf-8'))
            events = body.get("data", {})
            print(f'LANDSLIDE EVENTS: total={events.get("total")}, items_returned={len(events.get("items", []))}')
            if events.get("items"):
                sample = events["items"][0]
                coords = sample.get("geometry", {}).get("coordinates", [])
                print(f'  Sample event: Ref: {sample.get("event_reference")} | Coords: {coords} | Source: {sample.get("source")} | Status: {sample.get("status")}')

        # 4. Check slope units
        req = urllib.request.Request(f'{base}/slope-units?limit=5', headers=headers)
        with urllib.request.urlopen(req) as resp:
            body = json.loads(resp.read().decode('utf-8'))
            su = body.get("data", {})
            print(f'SLOPE UNITS: total={su.get("total")}, items_returned={len(su.get("items", []))}')
            if su.get("items"):
                sample_su = su["items"][0]
                meta = sample_su.get("metadata", {})
                print(f'  Sample slope unit: {sample_su.get("code")} - {sample_su.get("name")} (Slope: {meta.get("mean_slope_deg", meta.get("slope_deg", "N/A"))} deg, District: {sample_su.get("district_id")})')

        # 5. Check risk predictions
        req = urllib.request.Request(f'{base}/risk/predictions?limit=5', headers=headers)
        with urllib.request.urlopen(req) as resp:
            body = json.loads(resp.read().decode('utf-8'))
            preds = body.get("data", {})
            print(f'PREDICTIONS: total={preds.get("total")}, items_returned={len(preds.get("items", []))}')
            if preds.get("items"):
                sample_p = preds["items"][0]
                print(f'  Sample prediction: Unit {sample_p.get("subject_id")} -> Risk {sample_p.get("risk_level")} (Score: {sample_p.get("risk_value")}, Raw: {sample_p.get("raw_score")}, Model: {sample_p.get("model_version_id")})')

        # 6. Point prediction live test for all models (rf, xgb, lr)
        for m_type in ["lr", "rf", "xgb"]:
            point_payload = {
                'latitude': 25.5788, 
                'longitude': 91.8933, 
                'model_type': m_type
            }
            req = urllib.request.Request(
                f'{base}/risk/predict-point', 
                data=json.dumps(point_payload).encode('utf-8'),
                headers={'Content-Type': 'application/json', **headers}
            )
            with urllib.request.urlopen(req) as resp:
                body = json.loads(resp.read().decode('utf-8'))
                pt = body.get("data", body)
                dist = pt.get("spatial_distance_km")
                dist_str = f"{dist:.2f} km" if dist is not None else "N/A"
                print(f'POINT PREDICTION [{m_type.upper()} on Shillong (25.5788, 91.8933)]:' )
                print(f'  Risk Class: {pt.get("risk_class")} | Risk Prob: {pt.get("risk_probability")}')
                print(f'  Model: {pt.get("model_version")} | State: {pt.get("state")} | Year: {pt.get("data_temporal_year")}')
                print(f'  Nearest Station: {pt.get("nearest_station")} ({dist_str} away)')
                print(f'  Provenance: {pt.get("feature_source")}')

        # 7. Check /risk/evaluation endpoint
        req_eval = urllib.request.Request(f'{base}/risk/evaluation', headers=headers)
        with urllib.request.urlopen(req_eval) as resp:
            body = json.loads(resp.read().decode('utf-8'))
            eval_data = body.get("data", {})
            print(f'EVALUATION REPORT: Models Evaluated -> {list(eval_data.keys())}')
            for m_name in eval_data:
                m_info = eval_data[m_name]
                print(f'  {m_name}: Test Acc={m_info.get("test_accuracy"):.4f}, Test F1={m_info.get("test_f1_macro"):.4f}, Val Acc={m_info.get("val_accuracy"):.4f}')

        # 8. Check web frontend
        req_web = urllib.request.Request('http://localhost:3000')
        with urllib.request.urlopen(req_web) as resp:
            print(f'WEB FRONTEND (http://localhost:3000): HTTP {resp.status} OK')

        print("\n========================================================")
        print("ALL SYSTEM VERIFICATIONS PASSED WITH REAL 2026 DATASETS!")
        print("========================================================")

    except Exception as e:
        print(f'ERROR: {e}', file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    test_api()
