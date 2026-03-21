import re
import os

PAGES_DIR = "/home/altair/Documents/gestionar/myinstitute/client/src/pages"

# Match exactly the nested error
bad_pattern = re.compile(r'\{totalPages > 1 && \(\s*\{totalPages > 1 && \(\s*(<div className="pagination-dropdown">.*?</div>)\s*\)\}\s*\)\}', re.DOTALL)

for f in os.listdir(PAGES_DIR):
    if f.endswith('.tsx'):
        filepath = os.path.join(PAGES_DIR, f)
        with open(filepath, 'r') as file:
            content = file.read()
            
        new_content = bad_pattern.sub(r'{totalPages > 1 && (\n\1\n)}', content)
        
        if new_content != content:
            with open(filepath, 'w') as file:
                file.write(new_content)
            print("Fixed", f)
