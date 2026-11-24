"""Prepare exact Scripture/overview inputs for the isolated Kokoro Heart renderer.

Run: python scripts/prepare-recordings.py
Generation/publishing: python scripts/render-heart.py --publish-when-complete
Genesis 1's original Heart recording is preserved rather than generated again.
"""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def build_jobs():
    catalog = json.loads((ROOT / "src/lib/bible/catalog.json").read_text(encoding="utf-8"))
    summaries = json.loads((ROOT / "src/lib/bible/summary-catalog.json").read_text(encoding="utf-8"))
    jobs = []
    for book in catalog["books"]:
        scripture = json.loads((ROOT / f"static{book['src']}").read_text(encoding="utf-8"))
        outlines = json.loads((ROOT / f"static{summaries['books'][book['id']]['src']}").read_text(encoding="utf-8"))
        for number, verses in enumerate(scripture["chapters"], 1):
            chapter_id = f"{book['id']}.{number}"
            if chapter_id == "GEN.1": continue
            segments = [(f"v{verse['number']}", verse["text"]) for verse in verses if verse["text"]]
            segments.append(("summary", "Chapter complete. The following is commentary, separate from Scripture. Chapter outline and commentary excerpts from Matthew Henry's Concise Commentary, a historical Protestant interpretation. " + " ".join(outlines[number - 1]["paragraphs"])))
            transcript = json.dumps(segments, ensure_ascii=False, separators=(",", ":"))
            jobs.append({"id": chapter_id, "segments": segments, "textSha256": hashlib.sha256(transcript.encode("utf-8")).hexdigest(), "lastVerse": len(verses)})
    if len(jobs) != 1188: raise ValueError("Expected 1,188 Heart jobs plus the original Genesis 1 recording")
    return jobs


if __name__ == "__main__":
    import argparse
    argparse.ArgumentParser(description=__doc__).parse_args()
    output = ROOT / ".cache/audio-jobs.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(build_jobs(), ensure_ascii=False), encoding="utf-8")
    print("Prepared 1,188 exact-text Kokoro Heart jobs; original Genesis 1 preserved.")
