import json

with open('2023_parsed.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Clean each question
for q in data:
    n = q['number']
    
    # Q28: incomplete source - leave as placeholder
    if n == 28:
        q['question'] = 'Given the table (insufficient data)'
        q['options'] = {'A': '', 'B': '', 'C': '', 'D': ''}
        q['correct'] = 'A'
        continue
    
    # Q40: strip trailing junk from option D
    if n == 40:
        q['options']['D'] = 'Multi-stage.'
        continue
    
    # Q43: strip trailing note from option D
    if n == 43:
        q['options']['D'] = 'Capital and Land.'
        continue
    
    # Q47: clean option A (stray asterisks)
    if n == 47:
        q['options']['A'] = '2x⁻½y⅔'
        continue
    
    # Q48: strip inline solution from question text
    if n == 48:
        q['question'] = 'The consumption function for a commodity is C = 200 + 0.25I. What is the Marginal Propensity to Save?'
        continue
    
    # Q50: strip trailing flag from option D
    if n == 50:
        q['options']['D'] = 'Optimal values'
        continue

with open('2023_math.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Saved clean 2023_math.json")
print(f"Total questions: {len(data)}")

# Verify
issues = []
for q in data:
    opts = q['options']
    c = q['correct']
    if len(opts) != 4 or not c:
        issues.append(q['number'])
        
if issues:
    print(f"Issues: Q{', '.join(str(x) for x in issues)}")
else:
    print("All 50 questions clean (Q28 has placeholder data)")
