import sys

with open('c:\\Users\\prash\\prashansa_projects\\arun-website\\index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

with open('c:\\Users\\prash\\prashansa_projects\\arun-website\\new_svg.txt', 'r', encoding='utf-8') as f:
    new_svg = f.read()

# Lines 60 to 162 (1-indexed) are indices 59 to 161 (inclusive)
new_lines = lines[:59] + [new_svg + "\n"] + lines[162:]

with open('c:\\Users\\prash\\prashansa_projects\\arun-website\\index.html', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Spliced successfully!")
