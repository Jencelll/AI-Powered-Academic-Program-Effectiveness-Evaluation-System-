import requests
import json

def test_preview():
    url = "http://localhost:5000/api/reports/preview"
    params = {
        'year': '2024-2025',
        'semester': 'All'
    }
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        print("Status Code:", response.status_code)
        
        keys_to_check = [
            'header', 'executive_summary', 'distributions', 
            'program_comparison', 'faculty_performance', 
            'subject_performance', 'internal_reviews',
            'hotspots', 'student_analysis', 'narrative'
        ]
        
        missing_keys = [k for k in keys_to_check if k not in data]
        
        if missing_keys:
            print(f"FAILED: Missing keys in response: {missing_keys}")
        else:
            print("SUCCESS: All required keys present.")
            
        print("\nExecutive Summary:")
        print(json.dumps(data.get('executive_summary', {}), indent=2))
        
        print(f"\nSubject Performance Count: {len(data.get('subject_performance', []))}")
        print(f"Internal Reviews Count: {len(data.get('internal_reviews', []))}")

    except Exception as e:
        print(f"Error: {e}")
        if hasattr(e, 'response') and e.response:
            print(e.response.text)

if __name__ == "__main__":
    test_preview()
