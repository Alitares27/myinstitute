import os

PAGES_DIR = "client/src/pages"

def refactor_modals(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Replacements for Modals
    content = content.replace('className="extracted-style-21"', 'className="modal-overlay"')
    content = content.replace('className="extracted-style-22"', 'className="modal-content"')
    
    # Forms inside modals
    content = content.replace('className="extracted-style-23"', 'className="modal-form-row"')
    
    with open(filepath, 'w') as f:
        f.write(content)

for f_name in os.listdir(PAGES_DIR):
    if f_name.endswith('.tsx'):
        refactor_modals(os.path.join(PAGES_DIR, f_name))
        print(f"Refactored modals in {f_name}")
