import os
import glob

for filepath in glob.glob('src/components/*.js'):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Replace static strings
    content = content.replace("'http://localhost:5000/", "(process.env.REACT_APP_API_URL || 'http://localhost:5000') + '/")
    
    # 2. Replace static string exact match
    content = content.replace("'http://localhost:5000'", "(process.env.REACT_APP_API_URL || 'http://localhost:5000')")
    
    # 3. Replace template literals
    content = content.replace("`http://localhost:5000/", "`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Updated URLs in frontend components.")
