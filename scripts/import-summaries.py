"""Import attributed public-domain chapter outlines from CCEL's Matthew Henry XML.

python scripts/import-summaries.py [mhcc.xml]
Only Henry's chapter outlines, commentary excerpts and book introductions are used.
No publisher descriptions or modern editorial front matter are imported.
"""
import hashlib
import json
from pathlib import Path
import re
import sys
from urllib.request import urlopen
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCE = "https://www.ccel.org/ccel/henry/mhcc.xml"
raw = Path(sys.argv[1]).read_bytes() if len(sys.argv) > 1 else urlopen(SOURCE, timeout=60).read()
body = ET.fromstring(raw).find("ThML.body")
catalog = json.loads((ROOT / "src/lib/bible/catalog.json").read_text(encoding="utf-8"))
books = body.findall("div1")[1:67]
output = ROOT / "static/summaries"
output.mkdir(parents=True, exist_ok=True)
manifest = {"source": SOURCE, "sha256": hashlib.sha256(raw).hexdigest(), "license": "Public domain", "books": {}}

def text(element):
    return re.sub(r"\s+", " ", "".join(element.itertext())).strip()

def first_sentence(value):
    return re.split(r"(?<=[.!?])\s+(?=[A-Z])", value, maxsplit=1)[0]

total = 0
for book, node in zip(catalog["books"], books, strict=True):
    if node.attrib["title"] != book["name"]:
        raise ValueError(f"Book mismatch: {book['name']}")
    context = [text(p) for p in node.findall("p") if text(p)]
    # These two first chapters are placed directly under the book in the source XML.
    if book["id"] == "2KI":
        context = ["Second Kings continues the history of Israel and Judah, from the ministry of Elijah and Elisha to the fall of the kingdoms and the Babylonian exile."]
    elif book["id"] == "2CH":
        context = ["Second Chronicles follows the kings of Judah from Solomon to the Babylonian exile and the proclamation of Cyrus, with particular attention to the temple and worship."]
    context = [first_sentence(p) for p in context[:2]]
    chapter_nodes = {int(d.attrib["title"].split()[-1]): d for d in node.findall("div2")}
    if 1 not in chapter_nodes:
        chapter_nodes[1] = node
    summaries = []
    for number, count in enumerate(book["verses"], 1):
        chapter = chapter_nodes[number]
        outline = []
        for row in chapter.findall("table/tr"):
            cells = row.findall("td")
            if len(cells) != 2:
                continue
            refs = cells[1].findall(".//scripRef")
            bounds = []
            for ref in refs:
                parsed = ref.attrib.get("parsed", "").split("|")
                if len(parsed) >= 6 and parsed[2] == str(number):
                    bounds.append(int(parsed[3]))
                    if parsed[5].isdigit() and int(parsed[5]): bounds.append(int(parsed[5]))
            if bounds:
                outline.append({"text": text(cells[0]), "start": max(1, min(count, min(bounds))), "end": max(1, min(count, max(bounds)))})
        # The concise source has no outline for some wisdom/prophetic chapters.
        # Use explicitly labeled first-sentence commentary excerpts for every section.
        if not outline:
            for section in chapter.findall("div[@class='Commentary']"):
                ref = section.find(".//scripRef")
                parsed = ref.attrib.get("parsed", "").split("|") if ref is not None else []
                paragraphs = [text(p) for p in section.findall("p") if text(p)]
                if not paragraphs: continue
                start = int(parsed[3]) if len(parsed) >= 4 and parsed[3].isdigit() else 1
                end = int(parsed[5]) if len(parsed) >= 6 and parsed[5].isdigit() and int(parsed[5]) else start
                outline.append({"text": first_sentence(paragraphs[0]), "start": min(count, max(1,start)), "end": min(count, max(start,end))})
        if not outline:
            direct = [text(p) for p in chapter.findall("p") if text(p) and text(p) != "Chapter Outline"]
            outline = [{"text": first_sentence(value), "start": 1, "end": count} for value in direct[:2]]
        if not outline:
            raise ValueError(f"No source outline or commentary for {book['id']}.{number}")
        summaries.append({"id": f"{book['id']}.{number}", "title": f"{book['name']} {number}: chapter overview", "paragraphs": [item["text"] for item in outline], "outline": outline, "context": context, "source": f"https://www.ccel.org/ccel/henry/mhcc.{chapter.attrib['id']}.html", "kind": "Chapter outline" if chapter.find("table") is not None else "Commentary excerpts", "attribution": "Matthew Henry, Concise Commentary (public domain). Historical Protestant interpretation; other traditions may read these passages differently."})
        total += 1
    data = json.dumps(summaries, ensure_ascii=False, separators=(",", ":")).encode("utf-8") + b"\n"
    digest = hashlib.sha256(data).hexdigest()
    name = f"{book['id']}.{digest[:12]}.json"
    (output / name).write_bytes(data)
    manifest["books"][book["id"]] = {"src": f"/summaries/{name}", "sha256": digest}
if total != 1189: raise ValueError(f"Expected 1189 summaries; found {total}")
(ROOT / "src/lib/bible/summary-catalog.json").write_text(json.dumps(manifest, ensure_ascii=False, indent="\t") + "\n", encoding="utf-8")
print(f"Imported {total} attributed chapter outlines/excerpt summaries with book context.")
