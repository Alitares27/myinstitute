import os

PAGES_DIR = "client/src/pages"

def refactor_tables(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Replace rogue wrappers with proper table-container
    content = content.replace('className="extracted-style-2"', 'className="table-container"')
    content = content.replace("className='extracted-style-2'", 'className="table-container"')
    
    # Strip bad table specific classes that disabled the layout
    for bad_class in ['extracted-style-3', 'extracted-style-6', 'extracted-style-11', 'extracted-style-14', 'extracted-style-15', 'extracted-style-17']:
        content = content.replace(f'className="{bad_class}"', '')
        content = content.replace(f'className="{bad_class} ', 'className="')
        content = content.replace(f' {bad_class}"', '"')

    with open(filepath, 'w') as f:
        f.write(content)

for f_name in os.listdir(PAGES_DIR):
    if f_name.endswith('.tsx'):
        refactor_tables(os.path.join(PAGES_DIR, f_name))
        print(f"Refactored tables in {f_name}")
