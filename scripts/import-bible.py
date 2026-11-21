"""Import the publisher's public-domain WEBP verse-per-line archive (Python 3).

Run: python scripts/import-bible.py [path/to/engwebp_vpl.zip]
No model, API key, or third-party Python package is used.
"""

import hashlib
import io
import json
from pathlib import Path
import re
import sys
from urllib.request import urlopen
import zipfile

SOURCE = "https://ebible.org/Scriptures/engwebp_vpl.zip"
BOOK_NAMES = "Genesis|Exodus|Leviticus|Numbers|Deuteronomy|Joshua|Judges|Ruth|1 Samuel|2 Samuel|1 Kings|2 Kings|1 Chronicles|2 Chronicles|Ezra|Nehemiah|Esther|Job|Psalms|Proverbs|Ecclesiastes|Song of Solomon|Isaiah|Jeremiah|Lamentations|Ezekiel|Daniel|Hosea|Joel|Amos|Obadiah|Jonah|Micah|Nahum|Habakkuk|Zephaniah|Haggai|Zechariah|Malachi|Matthew|Mark|Luke|John|Acts|Romans|1 Corinthians|2 Corinthians|Galatians|Ephesians|Philippians|Colossians|1 Thessalonians|2 Thessalonians|1 Timothy|2 Timothy|Titus|Philemon|Hebrews|James|1 Peter|2 Peter|1 John|2 John|3 John|Jude|Revelation".split("|")
EXPECTED_CHAPTERS = [50,40,27,36,34,24,21,4,31,24,22,25,29,36,10,13,10,42,150,31,12,8,66,52,5,48,12,14,3,9,1,4,7,3,3,3,2,14,4,28,16,24,21,28,16,16,13,6,6,4,4,5,3,6,4,3,1,13,5,5,3,5,1,1,1,22]
ROOT = Path(__file__).resolve().parents[1]

archive = Path(sys.argv[1]).read_bytes() if len(sys.argv) > 1 else urlopen(SOURCE, timeout=60).read()
with zipfile.ZipFile(io.BytesIO(archive)) as zipped:
    payload = zipped.read("engwebp_vpl.txt")
    about = zipped.read("engwebp_about.htm").decode("utf-8-sig")

books = {}
for line in payload.decode("utf-8-sig").splitlines():
    if not line.strip():
        continue
    match = re.fullmatch(r"(\w+) (\d+):(\d+) (.*)", line)
    if not match:
        raise ValueError(f"Unrecognized source line: {line[:80]}")
    code, chapter, verse, text = match.groups()
    verses = books.setdefault(code, {}).setdefault(int(chapter), [])
    if int(verse) != len(verses) + 1 or "\ufffd" in text or "<" in text:
        raise ValueError(f"Invalid verse: {code} {chapter}:{verse}")
    verses.append({"number": int(verse), "text": text})

if len(books) != 66 or sum(len(chapters) for chapters in books.values()) != 1189:
    raise ValueError("Expected all 66 books and 1,189 chapters")

# The existing recording and its cues must remain synchronized with Genesis 1.
genesis = json.loads((ROOT / "src/lib/bible/genesis-1.json").read_text(encoding="utf-8"))
if books["GEN"][1] != genesis["verses"]:
    raise ValueError("Genesis 1 differs from the recorded text; review audio before updating")

output = ROOT / "static/bible/engwebp"
output.mkdir(parents=True, exist_ok=True)
catalog = {
    "translation": "World English Bible",
    "translationId": "engwebp",
    "edition": "Updated, 66-book protocanon",
    "license": "Public domain",
    "source": SOURCE,
    "archiveSha256": hashlib.sha256(archive).hexdigest(),
    "textSha256": hashlib.sha256(payload).hexdigest(),
    "books": [],
}
for (code, chapters), name, expected in zip(books.items(), BOOK_NAMES, EXPECTED_CHAPTERS, strict=True):
    if list(chapters) != list(range(1, expected + 1)):
        raise ValueError(f"Unexpected chapter sequence in {name}")
    data = json.dumps({"id": code, "name": name, "chapters": list(chapters.values())}, ensure_ascii=False, separators=(",", ":")).encode("utf-8") + b"\n"
    digest = hashlib.sha256(data).hexdigest()
    filename = f"{code}.{digest[:12]}.json"
    (output / filename).write_bytes(data)
    catalog["books"].append({"id": code, "name": name, "verses": [len(verses) for verses in chapters.values()], "src": f"/bible/engwebp/{filename}", "sha256": digest})

(ROOT / "src/lib/bible/catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent="\t") + "\n", encoding="utf-8")
(output / "NOTICE.html").write_text(about, encoding="utf-8")
print(f"Imported {len(books)} books, 1,189 chapters, {sum(sum(map(len, chapters.values())) for chapters in books.values()):,} verse entries. Genesis 1 matches the existing recording exactly.")
