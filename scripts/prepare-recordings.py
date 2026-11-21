"""Prepare/finalize offline speech jobs; recording is an explicit Windows maintenance task.

python scripts/prepare-recordings.py
powershell -File scripts/render-recordings.ps1 -Ffmpeg PATH
python scripts/prepare-recordings.py --finalize
"""
import hashlib
import html
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
catalog = json.loads((ROOT / "src/lib/bible/catalog.json").read_text(encoding="utf-8"))
summaries = json.loads((ROOT / "src/lib/bible/summary-catalog.json").read_text(encoding="utf-8"))
cache = ROOT / ".cache/rendered"
cache.mkdir(parents=True, exist_ok=True)
jobs = []
active_audio = set()
metadata_dir = ROOT / "static/audio/metadata"
metadata_dir.mkdir(parents=True, exist_ok=True)
for book in catalog["books"]:
    scripture = json.loads((ROOT / f"static{book['src']}").read_text(encoding="utf-8"))
    outlines = json.loads((ROOT / f"static{summaries['books'][book['id']]['src']}").read_text(encoding="utf-8"))
    records = {}
    for number, verses in enumerate(scripture["chapters"], 1):
        chapter_id = f"{book['id']}.{number}"
        if chapter_id == "GEN.1":
            records[chapter_id] = json.loads((ROOT / "src/lib/bible/genesis-1-audio.json").read_text(encoding="utf-8"))
            records[chapter_id]["voiceLabel"] = "Kokoro Heart · synthetic voice"
            continue
        summary = outlines[number - 1]
        segments = [(f"v{verse['number']}", verse["text"]) for verse in verses if verse["text"]]
        segments.append(("summary", "Chapter complete. The following is commentary, separate from Scripture. Chapter outline and commentary excerpts from Matthew Henry's Concise Commentary, a historical Protestant interpretation. " + " ".join(summary["paragraphs"])))
        transcript = json.dumps(segments, ensure_ascii=False, separators=(",", ":"))
        digest = hashlib.sha256(transcript.encode("utf-8")).hexdigest()
        src = f"/audio/chapters/{chapter_id}.{digest[:12]}.m4a"
        ssml = '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">' + ''.join(f'<mark name="{mark}"/>{html.escape(text)}<break time="250ms"/>' for mark,text in segments) + '<mark name="end"/></speak>'
        jobs.append({"id": chapter_id, "src": src, "ssml": ssml, "textSha256": digest, "lastVerse": len(verses)})
        if "--finalize" in sys.argv:
            path = cache / f"{chapter_id}.json"
            if not path.exists(): raise ValueError(f"Missing recording: {chapter_id}")
            record = json.loads(path.read_text(encoding="utf-8-sig"))
            record["voiceLabel"] = "Microsoft David Desktop - synthetic voice"
            if record["textSha256"] != digest or not (ROOT / f"static{record['src']}").exists():
                raise ValueError(f"Outdated recording: {chapter_id}")
            audio = ROOT / f"static{record['src']}"
            target = ROOT / f"static/audio/chapters/{chapter_id}.{record['audioSha256'][:12]}.m4a"
            allowed = (ROOT / "static/audio/chapters").resolve()
            if audio.parent.resolve() != allowed or target.parent.resolve() != allowed:
                raise ValueError("Unexpected audio output directory")
            if audio != target:
                audio.rename(target)
                record["src"] = f"/audio/chapters/{target.name}"
            record["cues"] = [{**cue, "start": round(cue["start"],3), "end": round(cue["end"],3)} for cue in record["cues"]]
            path.write_text(json.dumps(record, ensure_ascii=False, separators=(",", ":")),encoding="utf-8")
            records[chapter_id] = record
            active_audio.add(record["src"])
    if "--finalize" in sys.argv:
        (metadata_dir / f"{book['id']}.json").write_text(json.dumps(records, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8", newline="\n")
if "--finalize" not in sys.argv:
    (ROOT / ".cache/audio-jobs.json").write_text(json.dumps(jobs, ensure_ascii=False), encoding="utf-8")
elif "--prune" in sys.argv:
    import re
    allowed = (ROOT / "static/audio/chapters").resolve()
    obsolete = [path for path in allowed.glob("*.m4a") if re.fullmatch(r"[A-Z0-9]+\.[1-9]\d*\.[a-f0-9]{12}\.m4a",path.name) and f"/audio/chapters/{path.name}" not in active_audio]
    for path in obsolete:
        if path.resolve().parent != allowed: raise ValueError("Unsafe audio cleanup path")
        path.unlink()
    print(f"Removed {len(obsolete)} obsolete generated tracks from {allowed}.")
print(f"{'Finalized' if '--finalize' in sys.argv else 'Prepared'} {len(jobs)} chapter-and-summary recordings, plus the existing Genesis 1 track.")
