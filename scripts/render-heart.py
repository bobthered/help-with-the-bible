"""Render the complete library with Kokoro Heart in an isolated maintenance environment.

The app and Vercel never import this script or its synthesis dependencies.
Existing deployed assets remain untouched until the full staged library validates.
See README.md for setup, resumable rendering, status and publishing instructions.
"""
import argparse
from contextlib import contextmanager
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
import wave

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / ".cache/kokoro-heart"
RATE = 24000
VOICE = "af_heart"
HEART_SHA256 = "d583ccff3cdca2f7fae535cb998ac07e9fcb90f09737b9a41fa2734ec44a8f0b"
TOKENIZER_SHA256 = "77a02c8e164413299b4b4c403b14f8e0e1c1b727db4d46a09d6327b861060a34"
VERSION = 1


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8", newline="\n")
    for attempt in range(10):
        try:
            temporary.replace(path)
            break
        except PermissionError:
            if attempt == 9: raise
            time.sleep(0.1)


def jobs():
    spec = importlib.util.spec_from_file_location("recording_inputs", ROOT / "scripts/prepare-recordings.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    result = module.build_jobs()
    if len(result) != 1188:
        raise ValueError("Expected 1,188 jobs plus the preserved Genesis 1 Heart recording")
    for job in result:
        digest = hashlib.sha256(json.dumps(job["segments"], ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()
        if digest != job["textSha256"]:
            raise ValueError(f"Incorrect text checksum: {job['id']}")
    return result


@contextmanager
def render_lock():
    STATE.mkdir(parents=True, exist_ok=True)
    with (STATE / "render.lock").open("a+b") as lock:
        lock.seek(0)
        lock.write(b"0")
        lock.flush()
        lock.seek(0)
        if os.name == "nt":
            import msvcrt
            msvcrt.locking(lock.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield


def validate_record(job, record, audio_root, fingerprint=None, verify_audio=True):
    if record.get("voice") != VOICE or record.get("model") != "Kokoro-82M" or record.get("textSha256") != job["textSha256"]:
        raise ValueError(f"Wrong voice/model/text: {job['id']}")
    if record.get("engine") != "kokoro-onnx" or record.get("lastVerse") != job["lastVerse"]:
        raise ValueError(f"Incorrect generation provenance: {job['id']}")
    import re
    for field in ["renderFingerprint", "modelSha256", "voiceSha256", "tokenizerSha256", "audioSha256"]:
        if not re.fullmatch(r"[a-f0-9]{64}", record.get(field, "")):
            raise ValueError(f"Missing generation checksum {field}: {job['id']}")
    if not math.isfinite(record.get("duration", 0)) or not math.isfinite(record.get("summaryStart", 0)) or not 0 < record["summaryStart"] < record["duration"]:
        raise ValueError(f"Invalid recording duration: {job['id']}")
    if fingerprint and record.get("renderFingerprint") != fingerprint:
        raise ValueError(f"Outdated renderer settings: {job['id']}")
    filename = Path(record["src"]).name
    audio = audio_root / filename
    if not audio.is_file() or filename != f"{job['id']}.{record['audioSha256'][:12]}.m4a":
        raise ValueError(f"Missing or incorrectly named audio: {job['id']}")
    if verify_audio and sha256(audio) != record["audioSha256"]:
        raise ValueError(f"Audio checksum mismatch: {job['id']}")
    cues = record.get("cues", [])
    expected = [int(mark[1:]) for mark, _ in job["segments"] if mark.startswith("v")]
    if [cue["verse"] for cue in cues if cue["kind"] == "verse"] != expected:
        raise ValueError(f"Incomplete verse cues: {job['id']}")
    if len(cues) != len(job["segments"]) or cues[-1]["kind"] != "summary" or cues[-1]["start"] != record["summaryStart"]:
        raise ValueError(f"Incomplete summary cue: {job['id']}")
    previous = 0
    for cue in cues:
        if not math.isfinite(cue["start"]) or not math.isfinite(cue["end"]) or cue["start"] < previous or cue["end"] <= cue["start"] or cue["end"] > record["duration"] + 0.002:
            raise ValueError(f"Invalid cue boundaries: {job['id']}")
        previous = cue["end"]
    return audio


def status(**values):
    values.update(updatedAt=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), pid=os.getpid())
    write_json(STATE / "progress.json", values)


def make_engine(args):
    sys.path.insert(0, str(Path(args.tools).resolve()))
    import importlib.metadata
    import numpy as np
    import onnxruntime as ort
    from kokoro_onnx import Kokoro
    engine_version = importlib.metadata.version("kokoro-onnx")
    if engine_version != "0.6.1": raise RuntimeError("Unexpected kokoro-onnx version; rerun the pinned local setup before rendering")
    model = Path(args.model).resolve()
    voice = Path(args.voice).resolve()
    if sha256(voice) != HEART_SHA256: raise ValueError("This voice tensor is not the verified af_heart asset; refusing to label another voice as Heart")
    if sha256(Path(args.tokenizer)) != TOKENIZER_SHA256: raise ValueError("Unexpected Kokoro tokenizer; rerun the pinned local setup")
    config = json.loads(Path(args.tokenizer).read_text(encoding="utf-8"))
    voice_array = np.fromfile(voice, dtype=np.float32)
    if voice_array.size != 510 * 256:
        raise ValueError("Unexpected af_heart voice tensor; expected 510 x 256 floats")
    pack = STATE / "af_heart.npz"
    np.savez(pack, af_heart=voice_array.reshape(510, 1, 256))
    options = ort.SessionOptions()
    options.intra_op_num_threads = args.threads
    options.inter_op_num_threads = 1
    options.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
    options.enable_mem_pattern = False
    providers = ["CPUExecutionProvider"]
    if args.provider == "dml":
        if "DmlExecutionProvider" not in ort.get_available_providers():
            raise RuntimeError("DirectML is unavailable; install the isolated DirectML runtime or choose --provider cpu explicitly")
        providers = [("DmlExecutionProvider", {"device_id": args.device}), "CPUExecutionProvider"]
    session = ort.InferenceSession(str(model), sess_options=options, providers=providers)
    if args.provider == "dml" and "DmlExecutionProvider" not in session.get_providers():
        raise RuntimeError("DirectML initialization failed; refusing a silent CPU fallback")
    engine = Kokoro.from_session(session, str(pack), vocab_config={"vocab": config["model"]["vocab"]})
    settings = {"version": VERSION, "voice": VOICE, "model": "Kokoro-82M", "modelSha256": sha256(model), "voiceSha256": sha256(voice), "tokenizerSha256": sha256(Path(args.tokenizer)), "speed": 1, "sampleRate": RATE, "codec": "aac", "bitrate": "24k", "pauseSamples": RATE // 4, "engine": "kokoro-onnx", "engineVersion": engine_version, "runtimeVersion": ort.__version__}
    provenance = model.with_suffix(".provenance.json")
    if provenance.exists():
        proof = json.loads(provenance.read_text(encoding="utf-8"))
        if proof["modelSha256"] != settings["modelSha256"]: raise ValueError("The model no longer matches its conversion/reference proof")
        settings["modelSource"] = proof["source"]
        settings["originalModelSha256"] = proof["sourceSha256"]
    fingerprint = hashlib.sha256(json.dumps(settings, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
    return engine, np, settings, fingerprint


def render(args):
    with render_lock():
        queue = jobs()
        stage = STATE / "audio"
        records = STATE / "records"
        segments = STATE / "segments"
        for directory in [stage, records, segments]: directory.mkdir(parents=True, exist_ok=True)
        status(state="loading-model", completed=0, total=len(queue))
        engine, np, settings, fingerprint = make_engine(args)
        if args.ffmpeg is None:
            try:
                import imageio_ffmpeg
            except ImportError:
                sys.path.insert(0, str(ROOT / ".cache/audio-tools"))
                import imageio_ffmpeg
            args.ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
        finished = 0
        rendered = 0
        started = time.monotonic()
        audio_seconds = 0
        for job in queue:
            record_path = records / f"{job['id']}.json"
            if record_path.exists():
                try:
                    validate_record(job, json.loads(record_path.read_text(encoding="utf-8")), stage, fingerprint)
                    finished += 1
                    continue
                except (OSError, ValueError, KeyError):
                    pass
            pcm = segments / f"{job['id']}.wav"
            cues = []
            frames = 0
            with wave.open(str(pcm), "wb") as output:
                output.setnchannels(1)
                output.setsampwidth(2)
                output.setframerate(RATE)
                for index, (mark, text) in enumerate(job["segments"]):
                    status(state="rendering", chapter=job["id"], segment=index + 1, segmentTotal=len(job["segments"]), completed=finished, total=len(queue), elapsedSeconds=round(time.monotonic() - started), renderedAudioSeconds=round(audio_seconds, 3), provider=args.provider)
                    segment_hash = hashlib.sha256((fingerprint + "\0" + text).encode()).hexdigest()
                    cached = segments / f"{job['id']}.{segment_hash}.f32"
                    if cached.exists():
                        samples = np.fromfile(cached, dtype=np.float32)
                    else:
                        samples, rate = engine.create(text, voice=VOICE, speed=1.0, lang="en-us")
                        if rate != RATE:
                            raise ValueError("Unexpected sample rate")
                        samples = np.asarray(samples, dtype=np.float32)
                        if samples.size < RATE / 10 or not np.isfinite(samples).all() or np.max(np.abs(samples)) < 0.001:
                            raise ValueError(f"Silent or invalid audio: {job['id']} {mark}")
                        temporary = cached.with_suffix(".tmp")
                        samples.tofile(temporary)
                        temporary.replace(cached)
                    if samples.size < RATE / 10 or not np.isfinite(samples).all() or np.max(np.abs(samples)) < 0.001:
                        raise ValueError(f"Invalid cached samples: {job['id']} {mark}")
                    begin = frames / RATE
                    output.writeframes((np.clip(samples, -1, 1) * 32767).astype("<i2").tobytes())
                    silence = RATE // 4
                    output.writeframes(b"\0\0" * silence)
                    frames += len(samples) + silence
                    audio_seconds += len(samples) / RATE
                    cues.append({"kind": "summary" if mark == "summary" else "verse", "verse": None if mark == "summary" else int(mark[1:]), "start": round(begin, 3), "end": round(frames / RATE, 3)})
            encoded = stage / f"{job['id']}.encoding.m4a"
            subprocess.run([args.ffmpeg, "-y", "-loglevel", "error", "-i", str(pcm), "-c:a", "aac", "-b:a", "24k", "-ar", str(RATE), "-ac", "1", "-movflags", "+faststart", str(encoded)], check=True)
            digest = sha256(encoded)
            destination = stage / f"{job['id']}.{digest[:12]}.m4a"
            encoded.replace(destination)
            record = {**settings, "src": f"/audio/chapters/{destination.name}", "lastVerse": job["lastVerse"], "textSha256": job["textSha256"], "renderFingerprint": fingerprint, "audioSha256": digest, "duration": round(frames / RATE, 3), "summaryStart": cues[-1]["start"], "cues": cues, "voiceLabel": "Kokoro Heart · synthetic voice", "modelLicense": "Apache-2.0", "synthetic": True}
            validate_record(job, record, stage, fingerprint)
            write_json(record_path, record)
            # Only temporary segment files for this completed chapter are removed.
            for path in segments.glob(f"{job['id']}.*"):
                if path.resolve().parent != segments.resolve(): raise ValueError("Unsafe temporary cleanup path")
                path.unlink()
            finished += 1
            rendered += 1
            elapsed = time.monotonic() - started
            print(f"Heart: {finished}/{len(queue)} chapters ready; {job['id']}; {elapsed:.0f}s elapsed; {audio_seconds:.0f}s audio rendered", flush=True)
            status(state="rendering", completed=finished, total=len(queue), elapsedSeconds=round(elapsed), renderedAudioSeconds=round(audio_seconds, 3), provider=args.provider)
            if args.limit and rendered >= args.limit:
                status(state="sample-complete", completed=finished, total=len(queue))
                return
        status(state="render-complete", completed=finished, total=len(queue))
        if args.publish_when_complete:
            publish(queue)


def publish(queue=None):
    fresh = jobs()
    if queue is not None and [(job["id"],job["textSha256"]) for job in queue] != [(job["id"],job["textSha256"]) for job in fresh]:
        raise ValueError("Scripture or overview inputs changed while rendering; rerun the batch to refresh affected tracks before publishing")
    queue = fresh
    stage = STATE / "audio"
    records = STATE / "records"
    # Validate the entire staged library before touching any deployed metadata.
    prepared = []
    for job in queue:
        record = json.loads((records / f"{job['id']}.json").read_text(encoding="utf-8"))
        audio = validate_record(job, record, stage)
        prepared.append((job, record, audio))
    output = (ROOT / "static/audio/chapters").resolve()
    output.mkdir(parents=True, exist_ok=True)
    books = {}
    original = json.loads((ROOT / "src/lib/bible/genesis-1-audio.json").read_text(encoding="utf-8"))
    if sha256(ROOT / f"static{original['src']}") != original["audioSha256"]:
        raise ValueError("The preserved Genesis 1 Heart recording is damaged")
    original.update(voice="af_heart", voiceLabel="Kokoro Heart · synthetic voice", lastVerse=31)
    books["GEN"] = {"GEN.1": original}
    active = set()
    for job, record, audio in prepared:
        target = output / audio.name
        if target.resolve().parent != output:
            raise ValueError("Unsafe publishing path")
        if not target.exists() or sha256(target) != record["audioSha256"]:
            temporary = target.with_suffix(".copying")
            shutil.copyfile(audio, temporary)
            temporary.replace(target)
        active.add(target.name)
        books.setdefault(job["id"].split(".")[0], {})[job["id"]] = record
    for book, data in books.items():
        write_json(ROOT / f"static/audio/metadata/{book}.json", data)
    write_json(ROOT / "static/audio/metadata/voice-policy.json", {"version": 1, "voice": VOICE, "model": "Kokoro-82M", "chapters": 1189})
    # Only this project's content-hashed generated chapter files can be pruned.
    import re
    for path in output.glob("*.m4a"):
        if path.name not in active and re.fullmatch(r"[A-Z0-9]+\.[1-9]\d*\.[a-f0-9]{12}\.m4a", path.name):
            if path.resolve().parent != output: raise ValueError("Unsafe obsolete-audio path")
            path.unlink()
    status(state="published", completed=len(queue), total=len(queue))
    print("Published Kokoro Heart for all 1,189 chapters; original Genesis 1 preserved.", flush=True)
    # Run asset integrity tests automatically before reporting the job as verified.
    npm = [os.environ.get("COMSPEC", "cmd.exe"), "/d", "/c", "npm.cmd"] if os.name == "nt" else ["npm"]
    for check in [["test"],["run","check"],["run","build"],["run","verify:pwa"]]:
        subprocess.run([*npm,*check], cwd=ROOT, check=True)
    status(state="verified", completed=len(queue), total=len(queue))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tools", default=str(ROOT / ".cache/kokoro-python"))
    parser.add_argument("--model", default=str(ROOT / ".cache/models/kokoro-heart-dml.onnx"))
    parser.add_argument("--voice", default=str(ROOT / ".cache/models/af_heart.bin"))
    parser.add_argument("--tokenizer", default=str(ROOT / ".cache/models/heart-tokenizer.json"))
    parser.add_argument("--ffmpeg")
    parser.add_argument("--provider", choices=["cpu", "dml"], default="dml")
    parser.add_argument("--device", type=int, default=0)
    parser.add_argument("--threads", type=int, default=3)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--publish-when-complete", action="store_true")
    parser.add_argument("--publish", action="store_true")
    parser.add_argument("--status", action="store_true")
    parser.add_argument("--check-running", action="store_true")
    args = parser.parse_args()
    if args.check_running:
        try:
            with render_lock(): pass
        except OSError:
            print("A Heart renderer is already running.")
            raise SystemExit(1)
        print("No Heart renderer is running.")
        return
    if args.status:
        print((STATE / "progress.json").read_text(encoding="utf-8") if (STATE / "progress.json").exists() else '{"state":"not-started"}')
        return
    try:
        if args.publish:
            with render_lock(): publish()
        else: render(args)
    except Exception as error:
        previous = STATE / "progress.json"
        owner = json.loads(previous.read_text(encoding="utf-8")).get("pid") if previous.exists() else None
        if owner in [None,os.getpid()]: status(state="failed", error=str(error))
        raise


if __name__ == "__main__":
    main()
