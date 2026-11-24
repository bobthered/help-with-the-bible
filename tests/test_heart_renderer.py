"""Safety/integrity checks for offline rendering; no model packages are imported."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("heart_renderer", ROOT / "scripts/render-heart.py")
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)


class HeartRendererTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.audio = self.root / "audio"
        self.audio.mkdir()
        self.data = b"fixture audio bytes"
        digest = hashlib.sha256(self.data).hexdigest()
        self.job = {"id": "GEN.2", "lastVerse": 2, "textSha256": "a" * 64, "segments": [["v1", "First verse"], ["v2", "Second verse"], ["summary", "Overview"]]}
        self.record = {"src": f"/audio/chapters/GEN.2.{digest[:12]}.m4a", "voice": "af_heart", "model": "Kokoro-82M", "engine": "kokoro-onnx", "lastVerse": 2, "textSha256": "a" * 64, "renderFingerprint": "b" * 64, "modelSha256": "c" * 64, "voiceSha256": "d" * 64, "audioSha256": digest, "duration": 3, "summaryStart": 2, "cues": [{"kind": "verse", "verse": 1, "start": 0, "end": 1}, {"kind": "verse", "verse": 2, "start": 1, "end": 2}, {"kind": "summary", "verse": None, "start": 2, "end": 3}]}
        self.record["tokenizerSha256"] = "e" * 64
        (self.audio / Path(self.record["src"]).name).write_bytes(self.data)

    def tearDown(self):
        self.temporary.cleanup()

    def test_correct_heart_recording_and_fingerprint_validate(self):
        result = renderer.validate_record(self.job, self.record, self.audio, "b" * 64)
        self.assertEqual(result.read_bytes(), self.data)

    def test_wrong_voice_and_relabelled_windows_metadata_are_rejected(self):
        for changes in [{"voice": "Microsoft David"}, {"engine": "System.Speech"}, {"modelSha256": ""}, {"voiceSha256": ""}, {"tokenizerSha256": ""}, {"textSha256": "f" * 64}, {"lastVerse": 31}]:
            with self.subTest(changes=changes), self.assertRaises(ValueError):
                renderer.validate_record(self.job, {**self.record, **changes}, self.audio)

    def test_incomplete_and_nonfinite_cues_are_rejected(self):
        for broken in [self.record["cues"][1:], [*self.record["cues"][:2]], [{**self.record["cues"][0], "start": float("nan")}, *self.record["cues"][1:]], [{**self.record["cues"][0], "end": 5}, *self.record["cues"][1:]]]:
            with self.subTest(cues=broken), self.assertRaises(ValueError):
                renderer.validate_record(self.job, {**self.record, "cues": broken}, self.audio)

    def test_damaged_audio_or_changed_generation_settings_cannot_resume(self):
        with self.assertRaises(ValueError):
            renderer.validate_record(self.job, self.record, self.audio, "e" * 64)
        (self.audio / Path(self.record["src"]).name).write_bytes(b"damaged")
        with self.assertRaises(ValueError):
            renderer.validate_record(self.job, self.record, self.audio)

    def test_incomplete_library_never_touches_published_assets(self):
        state = self.root / "state"
        records = state / "records"
        records.mkdir(parents=True)
        (state / "audio").mkdir()
        (state / "audio" / Path(self.record["src"]).name).write_bytes(self.data)
        (records / "GEN.2.json").write_text(json.dumps(self.record), encoding="utf-8")
        second = {**self.job, "id": "GEN.3"}
        with patch.object(renderer, "ROOT", self.root), patch.object(renderer, "STATE", state), patch.object(renderer, "jobs", return_value=[self.job, second]):
            with self.assertRaises(FileNotFoundError): renderer.publish()
        self.assertFalse((self.root / "static").exists())

    def test_changed_inputs_abort_before_publishing(self):
        changed = {**self.job, "textSha256": "f" * 64}
        with patch.object(renderer, "ROOT", self.root), patch.object(renderer, "jobs", return_value=[changed]):
            with self.assertRaisesRegex(ValueError, "changed while rendering"):
                renderer.publish([self.job])
        self.assertFalse((self.root / "static").exists())

    def test_atomic_progress_write_retries_transient_windows_file_lock(self):
        target = self.root / "progress.json"
        real_replace = Path.replace
        calls = []

        def transient(path, destination):
            calls.append(path)
            if len(calls) == 1: raise PermissionError("temporary file lock")
            return real_replace(path, destination)

        with patch.object(Path, "replace", transient), patch.object(renderer.time, "sleep"):
            renderer.write_json(target, {"state": "rendering"})
        self.assertEqual(json.loads(target.read_text()), {"state": "rendering"})
        self.assertEqual(len(calls), 2)

    def test_full_job_list_preserves_exact_source_segments_and_skips_original_genesis(self):
        jobs = renderer.jobs()
        self.assertEqual(len(jobs), 1188)
        self.assertEqual(jobs[0]["id"], "GEN.2")
        self.assertEqual(jobs[-1]["id"], "REV.22")
        self.assertFalse(any(job["id"] == "GEN.1" for job in jobs))
        self.assertTrue(all(job["segments"][-1][0] == "summary" for job in jobs))

    def test_second_renderer_cannot_acquire_the_active_batch_lock(self):
        with patch.object(renderer, "STATE", self.root / "state"):
            with renderer.render_lock():
                with self.assertRaises(OSError):
                    with renderer.render_lock(): pass


if __name__ == "__main__": unittest.main()
