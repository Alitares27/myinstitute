import os
import re

PAGES_DIR = "client/src/pages"

def refactor_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Form buttons: <button type="submit"> -> <button type="submit" className="btn primary">
    content = re.sub(
        r'<button([^>]*)type="submit"([^>]*)>',
        lambda m: f'<button{m.group(1)}type="submit"{m.group(2)} className="btn primary">' if 'className=' not in m.group(0) else m.group(0),
        content
    )
    
    # Generic non-submit primary buttons
    content = re.sub(
        r'<button>([^<]*)(Agregar|Marcar|OK)([^<]*)</button>',
        r'<button className="btn primary">\1\2\3</button>',
        content
    )
    
    # Action buttons in tables: Edit, Delete, Cancel
    content = re.sub(
        r'<button([^>]*)>( *[✏️🗑️X]( *)|Editar|Borrar|Cancelar)</button>',
        lambda m: f'<button{m.group(1)} className="btn secondary">{m.group(2)}</button>' if 'className=' not in m.group(1) else m.group(0),
        content
    )
    
    # Fix old custom classes to standard tokens
    content = content.replace('className="btn-save"', 'className="btn primary"')
    content = content.replace('className="btn-cancel"', 'className="btn secondary"')
    content = content.replace('className="btn-edit-profile"', 'className="btn secondary"')

    with open(filepath, 'w') as f:
        f.write(content)

for f_name in os.listdir(PAGES_DIR):
    if f_name.endswith('.tsx'):
        refactor_file(os.path.join(PAGES_DIR, f_name))
        print(f"Refactored buttons in {f_name}")
