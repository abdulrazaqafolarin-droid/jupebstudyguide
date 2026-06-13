import re

with open(r'C:\Users\HP\Downloads\chem_2025_generated.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix Q13: wrong options (from Q12 contamination)
old_q13 = '''      id:"che-2025-obj-0013",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"If 2.5 L of a sample of a gas at 27 °C and 1 bar pressure is compressed to a volume of 500 mL at constant temperature, what is the percentage increase in pressure?",
      options:[
        {label:"A", text:"71 g of chlorine"},
        {label:"B", text:"48 g of magnesium"},
        {label:"C", text:"127 g of iodine"},
        {label:"D", text:"4 g of hydrogen A. 100% B. 400% C. 500% D. 80%"},
      ],
      correctAnswer:"48 g of magnesium",
      difficulty:"medium"
    },'''

new_q13 = '''      id:"che-2025-obj-0013",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"If 2.5 L of a sample of a gas at 27 °C and 1 bar pressure is compressed to a volume of 500 mL at constant temperature, what is the percentage increase in pressure?",
      options:[
        {label:"A", text:"100%"},
        {label:"B", text:"400%"},
        {label:"C", text:"500%"},
        {label:"D", text:"80%"},
      ],
      correctAnswer:"400%",
      difficulty:"medium"
    },'''

text = text.replace(old_q13, new_q13)

# Fix Q19: garbled options
old_q19 = '''      id:"che-2025-obj-0019",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"What is the correct order of melting points of B, Al, and Ga?",
      options:[
        {label:"A", text:"high"},
        {label:"B", text:"0°C"},
        {label:"C", text:"low"},
        {label:"D", text:"373 K A. B > Al > Ga B. B > Al > B > Ga C. Ga > B > Al D. B > Ga > Al"},
      ],
      correctAnswer:"high",
      difficulty:"medium"
    },'''

new_q19 = '''      id:"che-2025-obj-0019",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"What is the correct order of melting points of B, Al, and Ga?",
      options:[
        {label:"A", text:"B > Al > Ga"},
        {label:"B", text:"B > Al > B > Ga"},
        {label:"C", text:"Ga > B > Al"},
        {label:"D", text:"B > Ga > Al"},
      ],
      correctAnswer:"B > Al > Ga",
      difficulty:"medium"
    },'''

text = text.replace(old_q19, new_q19)

# Fix Q26: garbled options (zwitterion question got sp/sp2/sp3 from Q25)
old_q26 = '''      id:"che-2025-obj-0026",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"An example of a zwitterion is",
      options:[
        {label:"A", text:"sp"},
        {label:"B", text:"sp2"},
        {label:"C", text:"sp3"},
        {label:"D", text:"sp3d A. alanine B. methyl acetate C. HFO D. BrOH"},
      ],
      correctAnswer:"sp",
      difficulty:"medium"
    },'''

new_q26 = '''      id:"che-2025-obj-0026",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"An example of a zwitterion is",
      options:[
        {label:"A", text:"alanine"},
        {label:"B", text:"methyl acetate"},
        {label:"C", text:"HFO"},
        {label:"D", text:"BrOH"},
      ],
      correctAnswer:"alanine",
      difficulty:"medium"
    },'''

text = text.replace(old_q26, new_q26)

# Fix Q29: extra B. Reducing nature appended to option D
old_q29_d = '''        {label:"D", text:"Magnitude of inter-particle forces B. Reducing nature"},'''
new_q29_d = '''        {label:"D", text:"Magnitude of inter-particle forces"},'''
text = text.replace(old_q29_d, new_q29_d)

# Fix Q30: repeated/garbled options
old_q30 = '''      id:"che-2025-obj-0030",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"Synthesis gas is a mixture of",
      options:[
        {label:"A", text:"steam and CO"},
        {label:"B", text:"H2 and CH4"},
        {label:"C", text:"steam and CO"},
        {label:"D", text:"H2 and CO A. steam and CO B. H2 and CH4 C. A. steam and CO D. CO and N2"},
      ],
      correctAnswer:"steam and CO",
      difficulty:"medium"
    },'''

new_q30 = '''      id:"che-2025-obj-0030",
      subject:"chemistry",
      year:2025,
      category:"objective",
      question:"Synthesis gas is a mixture of",
      options:[
        {label:"A", text:"steam and CO"},
        {label:"B", text:"H2 and CH4"},
        {label:"C", text:"H2 and CO"},
        {label:"D", text:"CO and N2"},
      ],
      correctAnswer:"H2 and CO",
      difficulty:"medium"
    },'''

text = text.replace(old_q30, new_q30)

with open(r'C:\Users\HP\Downloads\chem_2025_generated.txt', 'w', encoding='utf-8') as f:
    f.write(text)

print("Fixed Q13, Q19, Q26, Q29, Q30")
