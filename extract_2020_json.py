import re, json

ts_path = r"C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main\src\data\study-questions\chemistry.ts"
with open(ts_path, "r", encoding="utf-8") as f:
    text = f.read()

# Find the 2020 section
# Strategy: find each block by scanning from che-2020- ids
ids = re.finditer(r'id:\s*"che-2020-([^"]+)"', text)

blocks = []
for m in ids:
    qid = "che-2020-" + m.group(1)
    # Find the block boundaries
    start = text.rfind("{", 0, m.start())
    depth, i = 0, start
    while i < len(text):
        if text[i] == '{': depth += 1
        elif text[i] == '}': depth -= 1
        i += 1
        if depth == 0:
            block_text = text[start:i]
            break
    
    # Parse fields using simple string operations
    def extract_field(field_name, bt):
        # Look for `field_name: "value"` pattern
        p = bt.find(field_name + ': "')
        if p < 0:
            return None
        p += len(field_name) + 3  # skip field_name: "
        # Find the closing quote (handle escaped quotes)
        val = ""
        while p < len(bt):
            ch = bt[p]
            if ch == '\\':
                val += ch + bt[p+1] if p+1 < len(bt) else ch
                p += 2
            elif ch == '"':
                break
            else:
                val += ch
                p += 1
        return val
    
    qid_full = extract_field("id", block_text)
    subject = extract_field("subject", block_text)
    year_str = extract_field("year", block_text)
    category = extract_field("category", block_text)
    question = extract_field("question", block_text)
    difficulty = extract_field("difficulty", block_text)
    answer = extract_field("answer", block_text)
    
    # Parse options
    options = None
    if category == "objective":
        opts = []
        opts_start = block_text.find("options: [")
        if opts_start >= 0:
            opts_end = block_text.find("]", opts_start)
            opts_section = block_text[opts_start:opts_end]
            for opt_m in re.finditer(r'\{\s*label:\s*"([^"]+)"\s*,\s*text:\s*"(.*?)"\s*\}', opts_section):
                opts.append({"label": opt_m.group(1), "text": opt_m.group(2)})
            if opts:
                options = opts
    
    block = {
        "id": qid,
        "subject": "chemistry",
        "year": 2020,
        "category": category,
        "question": question,
        "difficulty": difficulty or "medium"
    }
    if options:
        block["options"] = options
    if answer:
        block["answer"] = answer
    
    blocks.append(block)

print(f"Extracted {len(blocks)} 2020 blocks")
print(f"Types: obj={sum(1 for b in blocks if b['category']=='objective')}, theory={sum(1 for b in blocks if b['category']=='theory')}, practical={sum(1 for b in blocks if b['category']=='practical')}")

with open(r"C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main\2020_blocks.json", "w", encoding="utf-8") as f:
    json.dump(blocks, f, ensure_ascii=False, indent=2)

import os
size = os.path.getsize(r"C:\Users\HP\Downloads\jupebstudyguide-main\jupebstudyguide-main\2020_blocks.json")
print(f"JSON file size: {size} bytes")
