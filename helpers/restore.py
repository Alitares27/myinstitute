import os
import subprocess
import re

PAGES_DIR = "client/src/pages"
CSS_FILE = "client/src/index.css"

def to_kebab_case(s):
    s = re.sub('(.)([A-Z][a-z]+)', r'\1-\2', s)
    return re.sub('([a-z0-9])([A-Z])', r'\1-\2', s).lower()

def style_obj_to_css(style_str):
    css_rules = []
    pairs = re.split(r',\s*(?=(?:[^"\']*["\'][^"\']*["\'])*[^"\']*$)', style_str)
    for pair in pairs:
        pair = pair.strip()
        if not pair: continue
        parts = pair.split(':', 1)
        if len(parts) == 2:
            key, val = parts[0].strip(), parts[1].strip()
            key = key.strip("'\"")
            val = val.strip("'\"")
            key = to_kebab_case(key)
            if key == '-web-kit-line-clamp': key = '-webkit-line-clamp'
            css_rules.append(f"  {key}: {val};")
    return "\n".join(css_rules)

def main():
    # 1. Clear duplicated styles from index.css
    with open(CSS_FILE, 'r') as f:
        css_content = f.read()
    if '/* Extracted Inline Styles */' in css_content:
        css_content = css_content.split('/* Extracted Inline Styles */')[0]
        with open(CSS_FILE, 'w') as f:
            f.write(css_content.strip() + "\n")

    styles_map = {}
    class_counter = 1

    for f_name in os.listdir(PAGES_DIR):
        if f_name.endswith('.tsx'):
            filepath = os.path.join(PAGES_DIR, f_name)
            
            # 2. Get original file from git HEAD
            try:
                # Get relative path for git
                rel_path = f"client/src/pages/{f_name}"
                original_content = subprocess.check_output(['git', 'show', f'HEAD:{rel_path}']).decode('utf-8')
            except Exception as e:
                print(f"Skipping {f_name}, not in git or error: {e}")
                continue

            content = original_content

            # 3. Apply safe API refactors
            # Replace import axios
            content = re.sub(r'import\s+axios\s+from\s+["\']axios["\'];?', 'import api from "../api";\nimport axios from "axios"; // fallback kept temporarily if needed', content)
            
            content = content.replace(
                'axios.get(`${API_BASE_URL}/users/me`, config)',
                'Promise.resolve({ data: JSON.parse(sessionStorage.getItem("user") || "{}") })'
            )
            content = content.replace(
                'axios.get(`${API_BASE_URL}/users/me`, { headers })',
                'Promise.resolve({ data: JSON.parse(sessionStorage.getItem("user") || "{}") })'
            )
            
            if f_name == "Dashboard.tsx":
                content = content.replace(
                    'axios\n      .get(`${API_BASE_URL}/users/me`, config)\n      .then((res) => setUser(res.data))\n      .catch(() => setError("Error al obtener datos del perfil"));',
                    'const sessionUser = sessionStorage.getItem("user");\n    if (sessionUser) setUser(JSON.parse(sessionUser));'
                )

            # 4. Apply Styles Extract (Same as before)
            def replacer(match):
                nonlocal class_counter
                full_match = match.group(0)
                style_content = match.group(1).strip()
                if '{' in style_content or '?' in style_content or '(' in style_content or '`' in style_content:
                    pass
                if 'var(--' not in style_content and re.search(r'\b[a-zA-Z_][a-zA-Z0-9_]*\b', style_content):
                    if '?' in style_content or '=>' in style_content or '()' in style_content:
                        return full_match
                        
                if style_content not in styles_map:
                    styles_map[style_content] = f"extracted-style-{class_counter}"
                    class_counter += 1
                    
                cls_name = styles_map[style_content]
                return f'className="{cls_name}"'
                
            new_content, count = re.subn(r'style=\{\{\s*(.*?)\s*\}\}', replacer, content, flags=re.DOTALL)
            
            def merge_classes(match):
                return f'className="{match.group(1)} {match.group(2)}"'
                
            new_content = re.sub(r'className="([^"]+)"\s+className="([^"]+)"', merge_classes, new_content)

            with open(filepath, 'w') as f:
                f.write(new_content)
            
            print(f"Restored & Patched {f_name}")

    if styles_map:
        with open(CSS_FILE, 'a') as f:
            f.write("\n\n/* Extracted Inline Styles */\n")
            for style_content, cls_name in styles_map.items():
                css = style_obj_to_css(style_content)
                f.write(f".{cls_name} {{\n{css}\n}}\n")
        print(f"Appended {len(styles_map)} classes to {CSS_FILE}")

if __name__ == "__main__":
    main()
