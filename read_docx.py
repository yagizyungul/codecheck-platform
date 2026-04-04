import zipfile
import xml.etree.ElementTree as ET
import os

def read_docx(path):
    """Read text content from a .docx file without external dependencies."""
    with zipfile.ZipFile(path, 'r') as z:
        with z.open('word/document.xml') as f:
            tree = ET.parse(f)
            root = tree.getroot()
            
            paragraphs = []
            for para in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
                texts = []
                for run in para.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t'):
                    if run.text:
                        texts.append(run.text)
                if texts:
                    paragraphs.append(''.join(texts))
                else:
                    paragraphs.append('')
            
            return '\n'.join(paragraphs)

if __name__ == '__main__':
    # Try both paths
    paths = [
        r"C:\Users\PC\OneDrive\Masaüstü\CodeCheck_Project_Plan.docx",
        r"C:\Users\PC\OneDrive\Masaüstü\codecheck-platform\CodeCheck_Project_Plan.docx",
    ]
    
    for path in paths:
        if os.path.exists(path):
            print(f"Found: {path}")
            content = read_docx(path)
            out_path = os.path.join(os.path.dirname(path), "CodeCheck_Project_Plan.txt")
            # Also write to codecheck-platform folder
            out_path2 = r"C:\Users\PC\OneDrive\Masaüstü\codecheck-platform\CodeCheck_Project_Plan.txt"
            with open(out_path2, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Written to: {out_path2}")
            print("Done!")
            break
    else:
        print("No docx file found at either path!")
