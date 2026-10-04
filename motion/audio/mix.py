"""Mixage final : musique (scores.py) + bruitages (sfxlib.py) + bourdonnement spatialisé du drone.

Usage : python3 mix.py scene.json out.wav
scene.json est écrit par render.mjs (durée, événements, timeline T, piste de position, nom du morceau).
"""
import json
import os
import subprocess
import sys
import wave

import numpy as np
from scipy import signal

sys.path.insert(0, os.path.dirname(__file__))
import scores  # noqa: E402
import sfxlib  # noqa: E402
from musiclib import SR, bp, hp, lp, master  # noqa: E402

rng = np.random.default_rng(3)


def drone_buzz(track, n):
    """Bourdonnement des hélices, spatialisé selon la position horizontale (pan) et l'activité (on)."""
    tt = np.array([p["t"] for p in track])
    on_s = np.interp(np.arange(n) / SR, tt, [p["on"] for p in track])
    pan_s = np.interp(np.arange(n) / SR, tt, [p["pan"] for p in track])
    if not np.any(on_s):
        return np.zeros((n, 2))
    speed = np.abs(np.gradient(pan_s)) * SR
    speed = signal.sosfilt(signal.butter(1, 4 / (SR / 2), output="sos"), speed)
    f = (95 + 25 * np.clip(speed, 0, 3)) * (0.6 + 0.4 * on_s)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum(np.sin(k * ph) / k for k in range(1, 12)) * (0.6 + 0.4 * np.sin(2 * ph))
    x = lp(x, 1600) + 0.15 * bp(rng.standard_normal(n), 2000, 5000)
    x *= on_s * 0.07
    return np.stack([x * np.sqrt((1 - pan_s) / 2), x * np.sqrt((1 + pan_s) / 2)], 1)


def render_sfx(meta, n):
    out = np.zeros((n, 2))
    track = meta.get("track") or []
    if track:
        tt = np.array([p["t"] for p in track])
        pan_t = np.array([p["pan"] for p in track])
    for ev in meta["events"]:
        kind = ev["type"]
        params = {k: v for k, v in ev.items() if k not in ("t", "type", "gain", "pan")}
        x = sfxlib.GEN[kind](**params) * ev.get("gain", 1.0)
        start = int(ev["t"] * SR)
        if start >= n:
            continue
        x = x[: n - start]
        if "pan" in ev:
            pan = ev["pan"]
        elif track and kind in ("whoosh", "pop", "clack", "suck", "flutter", "doppler", "beep"):
            pan = float(np.interp(ev["t"], tt, pan_t)) * 0.7
        else:
            pan = 0.0
        out[start:start + len(x), 0] += x * np.sqrt(1 - pan)
        out[start:start + len(x), 1] += x * np.sqrt(1 + pan)
    if track:
        out += drone_buzz(track, n)
    # petite réverbération pour coller les bruitages à l'espace de la musique
    t = np.arange(int(0.8 * SR)) / SR
    for ch in range(2):
        ir = rng.standard_normal(len(t)) * np.exp(-t * 7)
        ir = lp(ir, 5000)
        ir /= np.sqrt(np.sum(ir ** 2))
        out[:, ch] = out[:, ch] * 0.86 + signal.fftconvolve(out[:, ch], ir)[:n] * 0.22
    return out


def loudnorm(src, dst, target=-14.0):
    """Normalisation EBU R128 en deux passes (ffmpeg), mode linéaire."""
    p = subprocess.run(["ffmpeg", "-hide_banner", "-i", src, "-af",
                        f"loudnorm=I={target}:TP=-1.2:LRA=11:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True)
    txt = p.stderr[p.stderr.rfind("{"):]
    st = json.loads(txt[: txt.rfind("}") + 1])
    af = (f"loudnorm=I={target}:TP=-1.2:LRA=11:measured_I={st['input_i']}:measured_TP={st['input_tp']}:"
          f"measured_LRA={st['input_lra']}:measured_thresh={st['input_thresh']}:offset={st['target_offset']}:linear=true")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-af", af, "-ar", str(SR), dst], check=True)


def write_wav(path, x):
    pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def main(src, dst):
    meta = json.load(open(src))
    dur = meta["duration"]
    n = int((dur + 0.05) * SR)
    sfx = render_sfx(meta, n)
    sfx /= np.max(np.abs(sfx)) or 1
    music = np.zeros((n, 2))
    score = (meta.get("music") or {}).get("score")
    if score:
        mu = scores.SCORES[score](meta["T"], dur)[:n]
        music[: len(mu)] = mu
        rms = np.sqrt(np.mean(music ** 2)) or 1
        music *= 0.13 / rms
        # la musique s'efface un peu sous les bruitages forts
        env = signal.sosfilt(signal.butter(1, 6 / (SR / 2), output="sos"), np.max(np.abs(sfx), axis=1))
        duck = 1 - 0.45 * np.clip(env / 0.35, 0, 1)
        music *= duck[:, None]
    mix = music + sfx * 0.85
    mix = master(mix)
    fade = int(0.25 * SR)
    mix[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 2
    tmp = dst + ".raw.wav"
    write_wav(tmp, mix)
    loudnorm(tmp, dst)
    os.remove(tmp)
    print(f"audio -> {dst}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
