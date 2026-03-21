import os
import re

PAGES_DIR = "client/src/pages"

def extract_pagination(content):
    idx = content.find('<div className="pagination">')
    if idx == -1:
        return content
        
    # Find matching </div>
    count = 0
    end_idx = -1
    for i in range(idx, len(content)):
        if content[i:i+4] == '<div':
            count += 1
        elif content[i:i+6] == '</div>':
            count -= 1
            if count == 0:
                end_idx = i + 6
                break
                
    if end_idx != -1:
        new_pagination = """
      {totalPages > 1 && (
        <div className="pagination-dropdown">
          <span>PÁGINA:</span>
          <select 
            value={currentPage} 
            onChange={(e) => setCurrentPage(Number(e.target.value))}
          >
            {Array.from({ length: totalPages }, (_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1} de {totalPages}</option>
            ))}
          </select>
        </div>
      )}
"""
        # Replace only the exact matched pagination block
        before = content[:idx]
        after = content[end_idx:]
        content = before + new_pagination.strip() + after
        # Recursively call in case there are multiple
        return extract_pagination(content)
    return content

def refactor_page(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # 1. Transform Pagination manually
    content = extract_pagination(content)

    # 2. Fix Emojis mapping
    if '✏️' in content: content = content.replace('✏️', '<FaEdit />')
    if '🗑️' in content: content = content.replace('🗑️', '<FaTrash />')
    
    # 3. Standardize Edit and Delete buttons entirely by replacing their <button> wrapper!
    # We want Edit -> <button ... className="btn secondary btn-sm"><FaEdit /></button>
    # We want Delete -> <button ... className="btn danger btn-sm"><FaTrash /></button>
    
    # Regex to capture any <button ...><FaEdit /></button>
    def replace_action_btn(match):
        attrs = match.group(1)
        icon = match.group(2)
        # Strip existing classNames
        attrs = re.sub(r'className="[^"]*"', '', attrs)
        attrs = re.sub(r"className='[^']*'", '', attrs)
        
        if 'FaEdit' in icon:
            return f'<button {attrs.strip()} className="btn secondary btn-sm"><FaEdit /></button>'
        elif 'FaTrash' in icon:
            return f'<button {attrs.strip()} className="btn danger btn-sm"><FaTrash /></button>'
        elif 'FaTimes' in icon:
            return f'<button {attrs.strip()} className="btn danger btn-sm"><FaTimes /></button>'
        return match.group(0)

    content = re.sub(
        r'<button([^>]*)>\s*(<FaEdit />|<FaTrash />|<FaTimes />)\s*</button>',
        replace_action_btn,
        content
    )

    # Add react-icons/fa if not present but needed
    needs_icons = any(x in content for x in ['<FaEdit />', '<FaTrash />', '<FaTimes />'])
    if needs_icons:
        if 'react-icons/fa' not in content:
            content = content.replace('import api from "../api";', 'import api from "../api";\nimport { FaEdit, FaTrash, FaTimes } from "react-icons/fa";')
        else:
            # Append missing to existing import
            import_line = re.search(r'import\s+\{([^}]+)\}\s+from\s+["\']react-icons/fa["\']', content)
            if import_line:
                existing = import_line.group(1)
                needed = []
                if '<FaEdit' in content and 'FaEdit' not in existing: needed.append('FaEdit')
                if '<FaTrash' in content and 'FaTrash' not in existing: needed.append('FaTrash')
                if '<FaTimes' in content and 'FaTimes' not in existing: needed.append('FaTimes')
                
                if needed:
                    new_import = existing.strip() + ", " + ", ".join(needed)
                    content = content.replace(import_line.group(0), f'import {{ {new_import} }} from "react-icons/fa"')

    with open(filepath, 'w') as f:
        f.write(content)

for f_name in os.listdir(PAGES_DIR):
    if f_name.endswith('.tsx'):
        refactor_page(os.path.join(PAGES_DIR, f_name))
        print(f"Refactored {f_name}")
