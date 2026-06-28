import json, os, re, glob

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'new-questions')

def normalize_spaces(text):
    text = re.sub(r' {3,}', ' ', text)
    text = re.sub(r'\t+', ' ', text)
    return text

def normalize_marks(text):
    text = re.sub(r'\[\s*(\d+)\s*marks?\s*\]', lambda m: f'[{m.group(1)} mark]' if m.group(1) == '1' else f'[{m.group(1)} marks]', text, flags=re.IGNORECASE)
    text = re.sub(r'(?<=\s)(\d+)\s*marks?(?=\s|[,.!?;:]|$)(?!\])', lambda m: f'[{m.group(1)} mark]' if m.group(1) == '1' else f'[{m.group(1)} marks]', text, flags=re.IGNORECASE)
    return text

def remove_course_markers(text):
    text = re.sub(r'\s*[A-Z]{3,4}\s+\d{2,4}\s*:\s*[A-Za-z\s&]+', '', text)
    text = re.sub(r'\s*[A-Z]{3,4}\s+\d{2,4}', '', text)
    return text

def remove_page_markers(text):
    text = re.sub(r'={3,}\s*PAGE\s+\d+\s*={3,}', '', text, flags=re.IGNORECASE)
    return text

def remove_mcq_content(text):
    idx = re.search(r'SECTION\s+[A-Z]', text)
    if idx:
        text = text[:idx.start()]
    text = re.sub(r'\s*Turn\s*Over\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*JSC\s+\d+\s*', '', text, flags=re.IGNORECASE)
    return text

def remove_instructions(text):
    text = re.sub(r'^[:\s]*[:,\s]*Answer\s+(?:ALL\s+)?(?:FOUR|FIVE|SIX|SEVEN)\s+questions[^.]*\.\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'^[:\s]*[:,\s]*Questions?\s+in\s+all[^.]*\.\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'^[:\s]*[:,\s]*Ensure you read[^.]*\.\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*TIME\s*:\s*\d+\s*HRS?\s*', '', text, flags=re.IGNORECASE)
    text = re.sub(r'^[:\s]+', '', text)
    return text.strip()

def clean_parens(text):
    text = re.sub(r'\(([a-zA-Z])\)', lambda m: f'({m.group(1).lower()})', text)
    text = re.sub(r'\(([a-zA-Z])\)', lambda m: f'({m.group(1).lower()})', text)
    text = re.sub(r'\bI\.(?=\s+[a-zA-Z])', 'i.', text)
    text = re.sub(r'\bII\.(?=\s+[a-zA-Z])', 'ii.', text)
    text = re.sub(r'\bIII\.(?=\s+[a-zA-Z])', 'iii.', text)
    text = re.sub(r'\bIV\.(?=\s+[a-zA-Z])', 'iv.', text)
    text = re.sub(r'\bV\.(?=\s+[a-zA-Z])', 'v.', text)
    text = re.sub(r'\bVI\.(?=\s+[a-zA-Z])', 'vi.', text)
    text = re.sub(r'\bVII\.(?=\s+[a-zA-Z])', 'vii.', text)
    text = re.sub(r'\bVIII\.(?=\s+[a-zA-Z])', 'viii.', text)
    return text

def add_line_breaks(text):
    text = re.sub(r'(?<=\])\s+(?=\d+\.\s)', '\n', text)
    text = re.sub(r'(?<=\])\s+(?=\d+\s\()', '\n', text)
    text = re.sub(r'(?<=\])\s+(?=\d+\s[ivxlcdm]+\.)', '\n', text)
    text = re.sub(r'(?<=\])\s+(?=\d+\s[a-zA-Z]\.)', '\n', text)
    text = re.sub(r'\s+\(\s*([a-zA-Z])\s*\)\s*', lambda m: f'\n({m.group(1).lower()}) ', text)
    text = re.sub(r'\s+\(\s*(\d+)\s*\)\s*', lambda m: f'\n({m.group(1)}) ', text)
    text = re.sub(r'(?<=\])\s+(?=\d+\.\s)', '\n', text)
    text = re.sub(r'\s+([ivxlcdm]+)\.(?=\s+[A-Z])', lambda m: f'\n    {m.group(1).lower()}.', text, flags=re.IGNORECASE)
    text = re.sub(r'\s+\(\s*([ivxlcdm]+)\s*\)\s*', lambda m: f'\n    ({m.group(1).lower()}) ', text, flags=re.IGNORECASE)
    text = re.sub(r'[ \t]{2,}', ' ', text)
    return text

def remove_stray_numbers(text):
    text = re.sub(r'^\d+\s+', '', text)
    text = re.sub(r'\s+\d+\s*$', '', text)
    text = re.sub(r'^\d{1,2}$', '', text)
    return text

def final_clean(text):
    text = re.sub(r'[ \t]+\n', '\n', text)
    text = re.sub(r'\n[ \t]+', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' (?=[  \n])', ' ', text)
    text = re.sub(r' +\.', '.', text)
    text = re.sub(r'\(\s+', '(', text)
    text = re.sub(r'\s+\)', ')', text)
    text = re.sub(r'\n ', '\n', text)
    text = re.sub(r' (?=[.,;:!?])', '', text)
    text = re.sub(r'(?<=[({])\s+', '', text)
    text = re.sub(r'\s+(?=[)}\]] )', '', text)
    text = re.sub(r' +\n', '\n', text)
    text = re.sub(r'\n +', '\n', text)
    text = text.strip()
    return text

def cleanup_question(text):
    if not text or not text.strip():
        return text
    text = remove_page_markers(text)
    text = remove_mcq_content(text)
    text = remove_instructions(text)
    if not text.strip():
        return text
    text = normalize_spaces(text)
    text = normalize_marks(text)
    text = remove_course_markers(text)
    text = clean_parens(text)
    text = add_line_breaks(text)
    text = remove_stray_numbers(text)
    text = final_clean(text)
    text = normalize_spaces(text)
    text = remove_course_markers(text)
    text = final_clean(text)
    text = normalize_spaces(text)
    return text.strip()

def main():
    subjects = ['biology', 'chemistry', 'math']
    for subject in subjects:
        subdir = os.path.join(DATA_DIR, subject)
        if not os.path.isdir(subdir):
            continue
        for filepath in sorted(glob.glob(os.path.join(subdir, '*.json'))):
            filename = os.path.basename(filepath)
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            changed = 0
            for q in data:
                if q.get('category') in ('theory', 'practical'):
                    original = q['question']
                    cleaned = cleanup_question(original)
                    if not cleaned:
                        print(f'  WARN: {q["id"]} became empty, keeping original')
                        continue
                    if cleaned != original:
                        q['question'] = cleaned
                        changed += 1
                        print(f'  {q["id"]}: {len(original)} -> {len(cleaned)} chars')
            if changed > 0:
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                print(f'{subject}/{filename}: {changed} updated')

if __name__ == '__main__':
    main()
