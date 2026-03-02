import sys
print(sys.executable)
try:
    import requests
    print("requests imported successfully")
except ImportError as e:
    print(f"ImportError: {e}")
