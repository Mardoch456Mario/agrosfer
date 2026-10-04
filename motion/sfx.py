"""Sound design synthétisé pour l'animation AgroSfer.

Usage : python3 sfx.py events.json out.wav
events.json est produit par render.mjs à partir de scene.js (événements + trajectoire du drone),
donc le son reste calé sur l'image si la timeline change.
"""
import json
import sys
import wave

import numpy as np
from scipy import signal

SR = 48000
rng = np.random.default_rng(7)


def env_ar(n, attack, release_curve=4.0):
    """Enveloppe attaque / relâche exponentielle sur n échantillons."""
    t = np.linspace(0, 1, n, endpoint=False)
    a = max(attack, 1e-4)
    up = np.clip(t / a, 0, 1) ** 1.5
    down = np.exp(-release_curve * np.clip((t - a) / (1 - a + 1e-9), 0, 1))
    return up * down


def bandsweep(noise, f0, f1, q=1.4):
    """Bruit filtré passe-bande dont la fréquence glisse de f0 à f1 (traitement par blocs)."""
    out = np.zeros_like(noise)
    block = 256
    nblocks = int(np.ceil(len(noise) / block))
    zi = None
    for i in range(nblocks):
        frac = i / max(nblocks - 1, 1)
        fc = f0 * (f1 / f0) ** frac
        bw = fc / q
        lo = max(30, fc - bw / 2) / (SR / 2)
        hi = min(SR / 2 - 100, fc + bw / 2) / (SR / 2)
        sos = signal.butter(2, [lo, hi], btype="band", output="sos")
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        seg = noise[i * block:(i + 1) * block]
        y, zi = signal.sosfilt(sos, seg, zi=zi)
        out[i * block:i * block + len(seg)] = y
    return out


def whoosh(dur, f0, f1, **_):
    n = int(dur * SR)
    x = bandsweep(rng.standard_normal(n), f0, f1)
    t = np.linspace(0, 1, n)
    e = np.sin(np.pi * t ** 0.8) ** 2
    return x * e * 2.2


def thud(**_):
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    f = 52 + 70 * np.exp(-t * 28)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
    click = signal.sosfilt(signal.butter(2, 900 / (SR / 2), output="sos"), rng.standard_normal(n)) * np.exp(-t * 90)
    return body * 0.9 + click * 0.5


def tick(**_):
    n = int(0.08 * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * 2300 * t) * np.exp(-t * 90) * 0.6


def clack(**_):
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    hi = signal.sosfilt(signal.butter(2, [1800 / (SR / 2), 6000 / (SR / 2)], btype="band", output="sos"), rng.standard_normal(n))
    hi *= np.exp(-t * 70)
    ring = (np.sin(2 * np.pi * 1450 * t) + 0.5 * np.sin(2 * np.pi * 2870 * t)) * np.exp(-t * 35) * 0.35
    knock = np.sin(2 * np.pi * 140 * t) * np.exp(-t * 30) * 0.7
    return hi * 0.9 + ring + knock


def pop(f0=400, f1=900, **_):
    n = int(0.14 * SR)
    t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** np.clip(t / 0.06, 0, 1)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ar(n, 0.03, 7)


def light_on(**_):
    n = int(2.2 * SR)
    t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(38 + 50 * np.exp(-t * 18)) / SR) * np.exp(-t * 3.2) * 0.9
    burst = signal.sosfilt(signal.butter(2, 3000 / (SR / 2), btype="high", output="sos"), rng.standard_normal(n))
    burst *= np.exp(-t * 6) * 0.35
    # nappe lumineuse (accord majeur aéré)
    shimmer = np.zeros(n)
    for f, a in [(659.25, 1), (987.77, 0.7), (1318.5, 0.5), (1975.5, 0.25)]:
        shimmer += a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * (1 + 0.004 * np.sin(2 * np.pi * 5 * t))
    shimmer *= np.clip(t / 0.02, 0, 1) * np.exp(-t * 1.6) * 0.16
    return boom + burst + shimmer


def grow(**_):
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    f = 300 * (1400 / 300) ** np.clip(t / 0.35, 0, 1)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ar(n, 0.15, 5) * 0.5
    sparkle = sum(np.sin(2 * np.pi * fr * t) * np.exp(-np.clip(t - d, 0, None) * 18) * (t > d)
                  for fr, d in [(2637, 0.18), (3136, 0.26), (3951, 0.33)]) * 0.12
    return tone + sparkle


def suck(dur=0.33, **_):
    n = int((dur + 0.05) * SR)
    t = np.linspace(0, 1, n)
    x = bandsweep(rng.standard_normal(n), 400, 5000, q=2.0)
    return x * t ** 2.2 * 2.6


def chime(**_):
    n = int(2.6 * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for i, (f, a) in enumerate([(523.25, 1), (659.25, 0.8), (783.99, 0.7), (1046.5, 0.45)]):
        d = i * 0.055
        tt = np.clip(t - d, 0, None)
        partials = np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt * 6)
        out += a * partials * np.exp(-tt * 2.2) * (t >= d)
    return out * 0.22


GEN = {"whoosh": whoosh, "thud": thud, "tick": tick, "clack": clack, "pop": pop,
       "lightOn": light_on, "grow": grow, "suck": suck, "chime": chime}


def drone_buzz(track, n):
    """Bourdonnement des hélices, spatialisé selon la position horizontale du drone."""
    tt = np.array([p["t"] for p in track])
    on = np.array([p["on"] for p in track])
    pan = np.array([p["pan"] for p in track])
    ts = np.arange(n) / SR
    on_s = np.interp(ts, tt, on)
    pan_s = np.interp(ts, tt, pan)
    # vitesse de déplacement -> hausse de régime
    speed = np.abs(np.gradient(pan_s)) * SR
    speed = signal.sosfilt(signal.butter(1, 4 / (SR / 2), output="sos"), speed)
    f = (95 + 25 * np.clip(speed, 0, 3)) * (0.6 + 0.4 * on_s)
    ph = 2 * np.pi * np.cumsum(f) / SR
    saw = sum(np.sin(k * ph) / k for k in range(1, 12))
    blade = 0.6 + 0.4 * np.sin(2 * ph)  # passage des pales
    x = saw * blade
    x = signal.sosfilt(signal.butter(2, 1600 / (SR / 2), output="sos"), x)
    x += 0.15 * signal.sosfilt(signal.butter(2, [2000 / (SR / 2), 5000 / (SR / 2)], btype="band", output="sos"),
                               rng.standard_normal(n))
    x *= on_s * 0.08
    left = x * np.sqrt((1 - pan_s) / 2)
    right = x * np.sqrt((1 + pan_s) / 2)
    return np.stack([left, right], 1)


def reverb(x, seconds=0.9, mix=0.16):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    out = np.zeros_like(x)
    for ch in range(x.shape[1]):
        ir = rng.standard_normal(n) * np.exp(-t * 6.5)
        ir = signal.sosfilt(signal.butter(1, 5000 / (SR / 2), output="sos"), ir)
        ir /= np.sqrt(np.sum(ir ** 2))
        out[:, ch] = signal.fftconvolve(x[:, ch], ir)[: len(x)]
    return x * (1 - mix) + out * mix * 2


def main(src, dst):
    meta = json.load(open(src))
    n = int((meta["duration"] + 0.2) * SR)
    mix = np.zeros((n, 2))
    track = meta["track"]
    tt = np.array([p["t"] for p in track])
    pan_t = np.array([p["pan"] for p in track])
    for ev in meta["events"]:
        kind = ev["type"]
        params = {k: v for k, v in ev.items() if k not in ("t", "type", "gain")}
        x = GEN[kind](**params) * ev.get("gain", 1.0)
        start = int(ev["t"] * SR)
        end = min(n, start + len(x))
        x = x[: end - start]
        pan = float(np.interp(ev["t"], tt, pan_t)) * 0.7 if kind in ("whoosh", "pop", "clack", "suck") else 0.0
        mix[start:end, 0] += x * np.sqrt((1 - pan) / 2) * np.sqrt(2)
        mix[start:end, 1] += x * np.sqrt((1 + pan) / 2) * np.sqrt(2)
    mix += drone_buzz(track, n)
    mix = reverb(mix)
    mix = signal.sosfilt(signal.butter(2, 28 / (SR / 2), btype="high", output="sos"), mix, axis=0)
    # limiteur doux + normalisation
    peak = np.max(np.abs(mix)) or 1
    mix = np.tanh(mix / peak * 1.4) / np.tanh(1.4) * 0.89
    fade = int(0.05 * SR)
    mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
    pcm = (mix * 32767).astype(np.int16)
    with wave.open(dst, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"audio -> {dst}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
