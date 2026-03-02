import pandas as pd
from difflib import get_close_matches

# Mock the smart_find_col function from ai_processor.py (incorporating the fix)
def smart_find_col(df, possible_names):
    """Flexible column finder using substring and fuzzy matching."""
    if df.empty:
        return None
    df_cols = [str(c).strip() for c in df.columns]
    
    # 1. Exact case-insensitive match
    for name in possible_names:
        for col in df_cols:
            if name.lower() == col.lower():
                return col

    # 2. Substring match (name in col)
    for name in possible_names:
        for col in df_cols:
            if name.lower() in col.lower():
                 return col
                 
    # 3. Fuzzy match with higher cutoff
    for name in possible_names:
        close = get_close_matches(name.lower(), [c.lower() for c in df_cols], n=1, cutoff=0.85)
        if close:
            return next(c for c in df_cols if c.lower() == close[0])
            
    return None

def test_smart_find_col():
    # Scenario 1: Exact match should be preferred over fuzzy
    df1 = pd.DataFrame([['IT', 'IT101', 1]], columns=["PROGRAM", "COURSE CODE", "YEAR"])
    # "COURSE" matches "COURSE CODE" via substring, but let's see if we have exact match
    # If we search for ["COURSE CODE"], it should find it.
    col = smart_find_col(df1, ["COURSE CODE"])
    print(f"Test 1 (Exact): Expected 'COURSE CODE', Got '{col}'")
    assert col == "COURSE CODE"

    # Scenario 2: "PROGRAM, YEAR & SECTION" vs "PROGRAM"
    # If we search for ["PROGRAM"], it should find "PROGRAM" exactly, not the longer one
    df2 = pd.DataFrame([['IT', 'IT']], columns=["PROGRAM, YEAR & SECTION", "PROGRAM"])
    col = smart_find_col(df2, ["PROGRAM"])
    print(f"Test 2 (Exact vs Long): Expected 'PROGRAM', Got '{col}'")
    assert col == "PROGRAM"

    # Scenario 3: Fuzzy match should not be too loose
    # "PROGRAM, YEAR & SECTION" should NOT match "COURSE"
    df3 = pd.DataFrame([['A', 'B']], columns=["PROGRAM, YEAR & SECTION", "OTHER"])
    col = smart_find_col(df3, ["COURSE"])
    print(f"Test 3 (No False Fuzzy): Expected None, Got '{col}'")
    assert col is None

    # Scenario 4: Case insensitivity
    df4 = pd.DataFrame([['it']], columns=["program"])
    col = smart_find_col(df4, ["PROGRAM"])
    print(f"Test 4 (Case): Expected 'program', Got '{col}'")
    assert col == "program"

if __name__ == "__main__":
    try:
        test_smart_find_col()
        print("All tests passed!")
    except AssertionError as e:
        print("Test failed!")
