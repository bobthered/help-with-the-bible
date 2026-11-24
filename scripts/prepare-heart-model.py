"""Prepare an equivalent DirectML-compatible Kokoro export in the ignored model cache.

The model's learned weights are unchanged. A spatial dimension of size one is
inserted around 1D ConvTranspose nodes to avoid a Radeon DirectML shape error.
CPU reference outputs are compared before the export is accepted.
Run only in the isolated local maintenance environment described in README.md.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tools", type=Path, default=ROOT / ".cache/kokoro-python")
    parser.add_argument("--source", type=Path, default=ROOT / ".cache/models/kokoro-heart-fp32.onnx")
    parser.add_argument("--target", type=Path, default=ROOT / ".cache/models/kokoro-heart-dml.onnx")
    args = parser.parse_args()
    sys.path.insert(0, str(args.tools.resolve()))
    import numpy as np
    import onnx
    import onnxruntime as ort
    from onnx import helper, TensorProto
    from kokoro_onnx.tokenizer import Tokenizer
    model = onnx.load(args.source)
    initializers = {tensor.name: tensor for tensor in model.graph.initializer}
    nodes = []
    count = 0
    axis = "heart_spatial_axis"
    if axis in initializers: raise ValueError("The source model already contains the compatibility axis")
    model.graph.initializer.append(helper.make_tensor(axis, TensorProto.INT64, [1], [2]))
    for node in model.graph.node:
        attributes = {item.name: helper.get_attribute_value(item) for item in node.attribute}
        weight = initializers.get(node.input[1]) if len(node.input) > 1 else None
        rank1 = node.op_type == "ConvTranspose" and (len(attributes.get("kernel_shape", [])) == 1 or weight is not None and len(weight.dims) == 3)
        if not rank1:
            nodes.append(node)
            continue
        tag = f"heart_conv_{count}"
        count += 1
        nodes.append(helper.make_node("Unsqueeze", [node.input[0], axis], [tag + "_input"]))
        nodes.append(helper.make_node("Unsqueeze", [node.input[1], axis], [tag + "_weight"]))
        for key in ["kernel_shape", "strides", "dilations"]:
            if key in attributes: attributes[key] = [1, *attributes[key]]
        if "output_padding" in attributes: attributes["output_padding"] = [0, *attributes["output_padding"]]
        if "pads" in attributes:
            left, right = attributes["pads"]
            attributes["pads"] = [0, left, 0, right]
        if "output_shape" in attributes: attributes["output_shape"] = [1, *attributes["output_shape"]]
        nodes.append(helper.make_node("ConvTranspose", [tag + "_input", tag + "_weight", *node.input[2:]], [tag + "_output"], name=node.name, **attributes))
        nodes.append(helper.make_node("Squeeze", [tag + "_output", axis], list(node.output)))
    if count != 6: raise ValueError(f"Unexpected model layout: found {count} 1D transpose convolutions, expected 6")
    del model.graph.node[:]
    model.graph.node.extend(nodes)
    onnx.checker.check_model(model)
    args.target.parent.mkdir(parents=True, exist_ok=True)
    onnx.save(model, args.target)
    options = ort.SessionOptions()
    options.intra_op_num_threads = 3
    options.inter_op_num_threads = 1
    source = ort.InferenceSession(str(args.source), sess_options=options, providers=["CPUExecutionProvider"])
    converted = ort.InferenceSession(str(args.target), sess_options=options, providers=["CPUExecutionProvider"])
    tokenizer_file = ROOT / ".cache/models/heart-tokenizer.json"
    vocabulary = json.loads(tokenizer_file.read_text(encoding="utf-8"))["model"]["vocab"]
    tokenizer = Tokenizer(vocab=vocabulary)
    voice_path = ROOT / ".cache/models/af_heart.bin"
    voice = np.fromfile(voice_path, dtype=np.float32).reshape(510, 1, 256)
    errors = []
    for text in ["In the beginning, God created the heavens and the earth.", "God said, let there be light."]:
        phonemes = tokenizer.phonemize(text, "en-us")
        tokens = tokenizer.tokenize(phonemes)
        inputs = {"input_ids": np.array([[0, *tokens, 0]], dtype=np.int64), "style": voice[len(tokens) - 1], "speed": np.array([1], dtype=np.float32)}
        original = source.run(None, inputs)[0]
        patched = converted.run(None, inputs)[0]
        if original.shape != patched.shape or not np.isfinite(patched).all(): raise ValueError("The converted model changed output length or produced invalid samples")
        error = float(np.max(np.abs(original - patched)))
        if error > 0.0001: raise ValueError(f"The converted model differs from the reference: {error}")
        errors.append(error)
    proof = {"source": "https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/onnx/model.onnx", "sourceSha256": digest(args.source), "modelSha256": digest(args.target), "conversion": "1D ConvTranspose lifted to 2D with singleton spatial dimension; weights unchanged", "rewrittenNodes": count, "cpuReferenceMaxErrors": errors}
    args.target.with_suffix(".provenance.json").write_text(json.dumps(proof, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(proof), flush=True)


if __name__ == "__main__": main()
