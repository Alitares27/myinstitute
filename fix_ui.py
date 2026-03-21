import os
import re

PAGES_DIR = "client/src/pages"
CSS_FILE = "client/src/styles/Global.css"

def fix_css():
    with open(CSS_FILE, 'r') as f:
        css = f.read()
    
    # Fix the awful gap issue and table overflow
    css = css.replace('gap: 5rem;', 'gap: 8px;')
    
    if "max-width: 100%;" not in css.split(".table-container")[1][:200]:
        css = css.replace(
            '.table-container {',
            '.table-container {\n  width: 100%;\n  max-width: 100%;\n  overflow-x: auto;\n  display: block;\n  margin-bottom: 2rem;'
        )
        
    if "/* =========================================\n   12. FIXES" not in css:
        css += """
/* =========================================
   12. FIXES
   ========================================= */
.pagination-dropdown {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 15px;
  margin-top: 10px;
  padding-top: 15px;
  border-top: 1px solid var(--border-color);
  width: 100%;
}
.pagination-dropdown span {
  font-weight: 700;
  color: var(--text-muted);
  font-size: 0.85rem;
}
.pagination-dropdown select {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  background-color: var(--bg-surface);
  color: var(--text-main);
  font-weight: 600;
  cursor: pointer;
  outline: none;
}
.pagination-dropdown select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(0, 97, 132, 0.1);
}
.btn-sm {
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
}
"""
    with open(CSS_FILE, 'w') as f:
        f.write(css)

def refactor_page(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # 1. Transform Pagination
    # Most paginations look like:
    # <div className="pagination">
    #   {Array.from({ length: totalPages }, (_, i) => (
    #     ...
    #   ))}
    # </div>
    pagination_pattern = re.compile(
        r'<div className="pagination">\s*\{Array\.from\(\{ length: totalPages \}, [^>]+>\s*\{i \+ 1\}\s*</button>\s*\)\)\}\s*</div>',
        re.MULTILINE | re.DOTALL
    )
    
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
      )}"""
      
    content = pagination_pattern.sub(new_pagination.strip(), content)

    # Convert button emojis to icons
    has_edit = '✏️' in content or '<FaEdit' in content
    has_trash = '🗑️' in content or '<FaTrash' in content
    
    content = content.replace('✏️', '<FaEdit />')
    content = content.replace('🗑️', '<FaTrash />')
    
    # Make small buttons for Action tables
    content = content.replace('className="btn secondary"><FaEdit />', 'className="btn secondary btn-sm"><FaEdit />')
    content = content.replace('className="btn secondary"><FaTrash />', 'className="btn secondary btn-sm"><FaTrash />')
    
    # 3. Add imports if needed
    if (has_edit or has_trash) and 'react-icons/fa' not in content:
        # Add import after react import
        content = content.replace('import api from "../api";', 'import api from "../api";\nimport { FaEdit, FaTrash } from "react-icons/fa";')
    elif (has_edit or has_trash) and 'react-icons/fa' in content:
        # Check if FaEdit and FaTrash are in the import
        if 'FaEdit' not in content.split('react-icons/fa')[0]:
            content = content.replace('import { ', 'import { FaEdit, FaTrash, ')

    with open(filepath, 'w') as f:
        f.write(content)

def main():
    fix_css()
    for f_name in os.listdir(PAGES_DIR):
        if f_name.endswith('.tsx'):
            refactor_page(os.path.join(PAGES_DIR, f_name))
            print(f"Refactored {f_name}")

if __name__ == "__main__":
    main()
