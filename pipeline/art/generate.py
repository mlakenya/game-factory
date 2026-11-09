"""Generate game art with FLUX.2 klein 4B through a local ComfyUI (the home laptop).

Runs on the laptop with ComfyUI's own Python, stdlib only:
  D:\\Gamedev\\tools\\ComfyUI\\python_embeded\\python.exe generate.py art/<id>/prompts.json --out art/<id>/raw
Start ComfyUI first (keep it running for the whole batch, model reloads are the slow part):
  python_embeded\\python.exe -s ComfyUI\\main.py --listen 127.0.0.1 --disable-dynamic-vram

prompts.json:
  {"style": "<style prefix from STYLE.md>",
   "size": [1024, 1024], "variants": 4,
   "items": [{"name": "ball-red", "prompt": "a single round red glass ball ornament", "variants": 6, "size": [1024, 1024]}]}
Writes <out>/<name>_<seed>.png and <out>/manifest.json (prompt, seed, seconds per image).
Only Apache-2.0 klein 4B: the 9B model is non-commercial (see .claude/skills/assets).
"""
import argparse, json, os, time, urllib.parse, urllib.request, uuid

HOST = "http://127.0.0.1:8188"
UNET = "flux-2-klein-4b-fp8.safetensors"
CLIP = "qwen_3_4b.safetensors"
VAE = "flux2-vae.safetensors"


def http(path, data=None, timeout=60):
    req = urllib.request.Request(HOST + path, data=json.dumps(data).encode() if data is not None else None,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def graph(text, seed, w, h, prefix, clip):
    # Same nodes as the official ComfyUI template "Text to Image (FLUX.2 Klein 4B Distilled)".
    return {
        "70": {"class_type": "UNETLoader", "inputs": {"unet_name": UNET, "weight_dtype": "default"}},
        "71": {"class_type": "CLIPLoader", "inputs": {"clip_name": clip, "type": "flux2", "device": "default"}},
        "72": {"class_type": "VAELoader", "inputs": {"vae_name": VAE}},
        "74": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["71", 0], "text": text}},
        "76": {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": ["74", 0]}},
        "63": {"class_type": "CFGGuider", "inputs": {"model": ["70", 0], "positive": ["74", 0], "negative": ["76", 0], "cfg": 1.0}},
        "61": {"class_type": "KSamplerSelect", "inputs": {"sampler_name": "euler"}},
        "62": {"class_type": "Flux2Scheduler", "inputs": {"steps": 4, "width": w, "height": h}},
        "73": {"class_type": "RandomNoise", "inputs": {"noise_seed": seed}},
        "66": {"class_type": "EmptyFlux2LatentImage", "inputs": {"width": w, "height": h, "batch_size": 1}},
        "64": {"class_type": "SamplerCustomAdvanced", "inputs": {"noise": ["73", 0], "guider": ["63", 0], "sampler": ["61", 0],
               "sigmas": ["62", 0], "latent_image": ["66", 0]}},
        "65": {"class_type": "VAEDecode", "inputs": {"samples": ["64", 0], "vae": ["72", 0]}},
        "9": {"class_type": "SaveImage", "inputs": {"images": ["65", 0], "filename_prefix": prefix}},
    }


def run(text, seed, w, h, dest, clip):
    prefix = "art_" + uuid.uuid4().hex[:8]
    t0 = time.time()
    pid = json.loads(http("/prompt", {"prompt": graph(text, seed, w, h, prefix, clip), "client_id": "art"}))["prompt_id"]
    while True:
        h_ = json.loads(http("/history/" + pid))
        if pid in h_:
            break
        time.sleep(0.2)
    entry = h_[pid]
    if entry["status"].get("status_str") != "success":
        raise RuntimeError(json.dumps(entry["status"])[:600])
    img = entry["outputs"]["9"]["images"][0]
    q = urllib.parse.urlencode({"filename": img["filename"], "subfolder": img["subfolder"], "type": img["type"]})
    with open(dest, "wb") as f:
        f.write(http("/view?" + q))
    return round(time.time() - t0, 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("prompts")
    ap.add_argument("--out", required=True)
    ap.add_argument("--only", help="comma-separated item names")
    ap.add_argument("--seed", type=int, default=1000)
    ap.add_argument("--clip", default=CLIP, help="text encoder file, e.g. qwen_3_4b_fp8_mixed.safetensors to save RAM")
    a = ap.parse_args()
    spec = json.load(open(a.prompts, encoding="utf-8"))
    only = set(a.only.split(",")) if a.only else None
    os.makedirs(a.out, exist_ok=True)
    man_path = os.path.join(a.out, "manifest.json")
    manifest = json.load(open(man_path, encoding="utf-8")) if os.path.exists(man_path) else []
    for item in spec["items"]:
        if only and item["name"] not in only:
            continue
        w, h = item.get("size", spec.get("size", [1024, 1024]))
        text = (spec.get("style", "") + " " + item["prompt"]).strip()
        for k in range(item.get("variants", spec.get("variants", 4))):
            seed = a.seed + k
            dest = os.path.join(a.out, f"{item['name']}_{seed}.png")
            secs = run(text, seed, w, h, dest, a.clip)
            manifest.append({"file": os.path.basename(dest), "name": item["name"], "seed": seed, "prompt": text,
                             "size": [w, h], "model": UNET, "seconds": secs})
            print(f"{os.path.basename(dest)}  {secs}s", flush=True)
            json.dump(manifest, open(man_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
