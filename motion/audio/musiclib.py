"""Petit moteur de musique procédurale (numpy) : instruments synthétisés, pistes, bus d'effets, mixage.

Tout est généré : aucune musique externe, donc aucun problème de droits.
Les morceaux (scores.py) placent des notes en temps musical (temps = beat) ; Song convertit en secondes
avec un tempo et un décalage, ce qui permet de caler les temps forts sur l'image.
"""
import numpy as np
from scipy import signal

SR = 48000
_rng = np.random.default_rng(11)

NOTE = {"C": 0, "C#": 1, "Db": 1, "D": 2, "D#": 3, "Eb": 3, "E": 4, "F": 5, "F#": 6, "Gb": 6,
        "G": 7, "G#": 8, "Ab": 8, "A": 9, "A#": 10, "Bb": 10, "B": 11}


def m(name):
    """'A3' -> numéro MIDI."""
    if isinstance(name, (int, float)):
        return name
    p = name[:-1]
    return 12 * (int(name[-1]) + 1) + NOTE[p]


def hz(note):
    return 440.0 * 2 ** ((m(note) - 69) / 12)


def chord(*notes):
    return [m(n) for n in notes]


def _t(dur):
    return np.arange(int(dur * SR)) / SR


def _sos(kind, f, order=2):
    nyq = SR / 2
    if isinstance(f, (list, tuple)):
        f = [min(max(x, 20), nyq * 0.95) / nyq for x in f]
    else:
        f = min(max(f, 20), nyq * 0.95) / nyq
    return signal.butter(order, f, btype=kind, output="sos")


def lp(x, f, order=2):
    return signal.sosfilt(_sos("low", f, order), x)


def hp(x, f, order=2):
    return signal.sosfilt(_sos("high", f, order), x)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(_sos("band", [lo, hi], order), x)


def noise(n):
    return _rng.standard_normal(n)


def adsr(n, a=0.005, d=0.1, s=0.7, r=0.1, hold=None):
    """Enveloppe ADSR ; hold = durée de la note (s) avant relâche."""
    t = np.arange(n) / SR
    hold = hold if hold is not None else n / SR - r
    e = np.where(t < a, t / max(a, 1e-5), 0)
    dec = (t >= a) & (t < a + d)
    e = np.where(dec, 1 - (1 - s) * (t - a) / max(d, 1e-5), e)
    e = np.where((t >= a + d) & (t < hold), s, e)
    lvl = s if hold >= a + d else 1 - (1 - s) * max(hold - a, 0) / max(d, 1e-5)
    e = np.where(t >= hold, lvl * np.exp(-(t - hold) / max(r / 4, 1e-4)), e)
    return e


# ---------------------------------------------------------------- batterie
def kick(dur=0.55, f_hi=170, f_lo=47, decay=6.5, click=0.5, drive=1.6):
    t = _t(dur)
    f = f_lo + (f_hi - f_lo) * np.exp(-t * 32)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR)
    env = np.where(t < 0.03, 1.0, np.exp(-(t - 0.03) * decay))
    x = np.tanh(drive * body * env) / np.tanh(drive)
    x += hp(noise(len(t)), 2500) * np.exp(-t * 400) * click * 0.5
    return x


def clap(dur=0.4, tone=1400):
    n = int(dur * SR)
    t = np.arange(n) / SR
    env = np.zeros(n)
    for i, d in enumerate([0, 0.011, 0.022]):
        env += np.where(t >= d, np.exp(-(t - d) * 160), 0) * (0.8 if i < 2 else 1)
    env += np.where(t >= 0.03, np.exp(-(t - 0.03) * 16), 0) * 0.55
    return bp(noise(n), tone * 0.6, tone * 2.2) * env * 1.6


def rim(dur=0.12):
    t = _t(dur)
    x = np.sin(2 * np.pi * 1750 * t) * np.exp(-t * 90) * 0.6
    x += bp(noise(len(t)), 2000, 6000) * np.exp(-t * 140) * 0.5
    return x


def snap(dur=0.18):
    t = _t(dur)
    return bp(noise(len(t)), 1800, 7000) * (np.exp(-t * 70) + 0.4 * np.exp(-t * 25)) * 1.1


_HAT_F = [205.3, 304.4, 369.6, 522.7, 540.0, 800.0]


def hat(open_=False, dur=None):
    dur = dur or (0.38 if open_ else 0.07)
    t = _t(dur)
    x = sum(np.sign(np.sin(2 * np.pi * f * 1.7 * t + i)) for i, f in enumerate(_HAT_F))
    x = bp(x + noise(len(t)) * 0.8, 7000, 15000)
    return x * np.exp(-t * (9 if open_ else 75)) * 0.5


def shaker(dur=0.09, bright=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    env = np.clip(t / 0.012, 0, 1) * np.exp(-np.clip(t - 0.012, 0, None) * 55)
    return bp(noise(n), 4500 * bright, 11000) * env * 0.9


def conga(f=210, dur=0.35, slap=0.3):
    t = _t(dur)
    ff = f * (1 + 0.18 * np.exp(-t * 60))
    x = np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-t * 11)
    x += bp(noise(len(t)), 1500, 5000) * np.exp(-t * 120) * slap
    return x * 0.8


def tom(f=110, dur=0.5):
    t = _t(dur)
    ff = f * (1 + 0.5 * np.exp(-t * 25))
    return np.sin(2 * np.pi * np.cumsum(ff) / SR) * np.exp(-t * 7)


def crash(dur=2.2):
    t = _t(dur)
    x = sum(np.sign(np.sin(2 * np.pi * f * 2.3 * t + i * 0.7)) for i, f in enumerate(_HAT_F))
    x = bp(x * 0.5 + noise(len(t)), 3500, 16000)
    return x * np.exp(-t * 2.2) * 0.35


# ---------------------------------------------------------------- basses
def log_drum(note, dur=0.45, glide=2.0, drive=2.2, decay=5.0):
    """Basse 'log drum' (amapiano) : sinus boisé avec glissé de hauteur et saturation."""
    t = _t(dur)
    f0 = hz(note)
    f = f0 * (1 + (glide - 1) * np.exp(-t * 55))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.35 * np.sin(2 * ph) * np.exp(-t * 12) + 0.15 * np.sin(3 * ph) * np.exp(-t * 20)
    env = np.clip(t / 0.004, 0, 1) * np.exp(-t * decay)
    x = np.tanh(drive * x * env) / np.tanh(drive)
    return lp(x, 2200)


def sub(note, dur=0.5, attack=0.006, release=0.06):
    t = _t(dur + release)
    x = np.sin(2 * np.pi * hz(note) * t)
    return np.tanh(1.3 * x * adsr(len(t), attack, 0.05, 0.9, release, hold=dur))


def bass_pluck(note, dur=0.3, cutoff=900):
    t = _t(dur + 0.08)
    f = hz(note)
    x = signal.sawtooth(2 * np.pi * f * t) + 0.6 * np.sin(2 * np.pi * f / 2 * t)
    y = np.zeros_like(x)
    # filtre qui se referme (par blocs)
    blk = 512
    zi = None
    for i in range(0, len(x), blk):
        fc = 180 + cutoff * np.exp(-(i / SR) * 14)
        sos = _sos("low", fc)
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        y[i:i + blk], zi = signal.sosfilt(sos, x[i:i + blk], zi=zi)
    return y * adsr(len(t), 0.003, 0.08, 0.6, 0.08, hold=dur)


# ---------------------------------------------------------------- claviers & mélodie
def epiano(notes, dur=0.6, vel=0.8, bright=1.0):
    """Piano électrique FM (type Rhodes)."""
    if not isinstance(notes, (list, tuple)):
        notes = [notes]
    rel = 0.35
    t = _t(dur + rel)
    out = np.zeros(len(t))
    for k, nn in enumerate(notes):
        f = hz(nn)
        idx = (1.4 * bright * vel) * np.exp(-t * 4) + 0.25
        x = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
        x += 0.06 * np.sin(2 * np.pi * f * 14.0 * t) * np.exp(-t * 28) * vel
        trem = 1 + 0.05 * np.sin(2 * np.pi * 4.8 * t + k)
        out += x * trem
    env = adsr(len(t), 0.003, 0.9, 0.35, rel, hold=dur) * (0.6 + 0.4 * np.exp(-t * 2))
    return out * env * vel / max(1, len(notes) ** 0.6)


def pad(notes, dur=2.0, cutoff=1600, attack=0.35, release=0.8, voices=5, detune=0.12):
    if not isinstance(notes, (list, tuple)):
        notes = [notes]
    t = _t(dur + release)
    out = np.zeros(len(t))
    for nn in notes:
        f = hz(nn)
        for v in range(voices):
            d = (v - (voices - 1) / 2) / max(voices - 1, 1) * detune
            out += signal.sawtooth(2 * np.pi * f * 2 ** (d / 12) * t + _rng.uniform(0, 6))
    out = lp(out, cutoff, 2)
    return out * adsr(len(t), attack, 0.3, 0.85, release, hold=dur) / (voices * len(notes)) * 2.2


def kalimba(note, dur=0.8, vel=0.8):
    t = _t(dur)
    f = hz(note)
    x = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 25)
    x += 0.12 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 9)
    x += bp(noise(len(t)), 2000, 6000) * np.exp(-t * 300) * 0.15
    env = np.clip(t / 0.002, 0, 1) * np.exp(-t * 4.2)
    return x * env * vel


def marimba(note, dur=0.7, vel=0.8):
    t = _t(dur)
    f = hz(note)
    x = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 14)
    x += 0.08 * np.sin(2 * np.pi * f * 9.9 * t) * np.exp(-t * 45)
    return x * np.clip(t / 0.002, 0, 1) * np.exp(-t * 6) * vel


def pluck(note, dur=0.35, vel=0.8, cutoff=3500, square=False):
    t = _t(dur + 0.1)
    f = hz(note)
    if square:
        x = signal.square(2 * np.pi * f * t, 0.35)
    else:
        x = signal.sawtooth(2 * np.pi * f * t) + 0.5 * signal.sawtooth(2 * np.pi * f * 1.005 * t)
    y = np.zeros_like(x)
    blk = 256
    zi = None
    for i in range(0, len(x), blk):
        fc = 300 + cutoff * np.exp(-(i / SR) * 18)
        sos = _sos("low", fc)
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        y[i:i + blk], zi = signal.sosfilt(sos, x[i:i + blk], zi=zi)
    return y * adsr(len(t), 0.002, 0.12, 0.3, 0.1, hold=dur) * vel


def bell(note, dur=2.0, vel=0.8):
    t = _t(dur)
    f = hz(note)
    x = np.zeros(len(t))
    for r, a, d in [(1, 1, 2.5), (2.0, 0.5, 4), (2.76, 0.35, 6), (5.4, 0.2, 9), (8.9, 0.1, 14)]:
        x += a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d)
    return x * np.clip(t / 0.002, 0, 1) * vel * 0.5


# ---------------------------------------------------------------- effets / transitions
def riser(dur=2.0, f0=300, f1=7000):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    x = noise(n)
    out = np.zeros(n)
    blk = 512
    zi = None
    for i in range(0, n, blk):
        fr = i / n
        fc = f0 * (f1 / f0) ** fr
        sos = _sos("band", [fc * 0.7, fc * 1.4])
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        out[i:i + blk], zi = signal.sosfilt(sos, x[i:i + blk], zi=zi)
    tone = signal.sawtooth(2 * np.pi * np.cumsum(110 * 2 ** (t * 2)) / SR) * 0.15
    return (out * 1.4 + lp(tone, 3000)) * t ** 2.2


def reverse_cymbal(dur=1.0):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    return hp(noise(n), 4500) * t ** 3 * 0.7


def downlifter(dur=1.2):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    x = noise(n)
    out = np.zeros(n)
    blk = 512
    zi = None
    for i in range(0, n, blk):
        fc = 6000 * (150 / 6000) ** (i / n)
        sos = _sos("band", [fc * 0.6, fc * 1.6])
        if zi is None:
            zi = np.zeros((sos.shape[0], 2))
        out[i:i + blk], zi = signal.sosfilt(sos, x[i:i + blk], zi=zi)
    return out * (1 - t) ** 1.5 * 1.3


def impact(dur=2.5, f=42):
    t = _t(dur)
    boom = np.sin(2 * np.pi * np.cumsum(f + 60 * np.exp(-t * 20)) / SR) * np.exp(-t * 2.2)
    hit = lp(noise(len(t)), 5000) * np.exp(-t * 18) * 0.6
    return np.tanh(1.5 * (boom + hit))


def sub_drop(dur=1.2, f0=90, f1=30):
    t = _t(dur)
    f = f1 + (f0 - f1) * np.exp(-t * 3)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.5)


# ---------------------------------------------------------------- mixage
def _ir(seconds, decay, seed):
    r = np.random.default_rng(seed)
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = r.standard_normal(n) * np.exp(-t * decay)
    ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
    ir = lp(ir, 6500)
    return ir / np.sqrt(np.sum(ir ** 2))


class Track:
    def __init__(self, n, gain=1.0, pan=0.0, reverb=0.0, delay=0.0, duck=0.0):
        self.buf = np.zeros(n)
        self.gain, self.pan, self.reverb, self.delay, self.duck = gain, pan, reverb, delay, duck

    def add(self, t, x, gain=1.0):
        i = int(round(t * SR))
        if i < 0:
            x = x[-i:]
            i = 0
        j = min(len(self.buf), i + len(x))
        if j > i:
            self.buf[i:j] += x[: j - i] * gain


class Song:
    """bpm + t0 (instant en secondes du temps 0). Les notes sont placées en temps (beats)."""

    def __init__(self, duration, bpm, t0=0.0, swing=0.0):
        self.duration = duration
        self.n = int((duration + 0.05) * SR)
        self.bpm = bpm
        self.beat = 60.0 / bpm
        self.t0 = t0
        self.swing = swing
        self.tracks = {}
        self.kicks = []

    def bt(self, b):
        """beat -> secondes (avec swing sur les doubles-croches impaires)."""
        frac = (b * 4) % 2
        sw = self.swing * self.beat / 4 if abs(frac - 1) < 1e-6 else 0
        return self.t0 + b * self.beat + sw

    def track(self, name, **kw):
        if name not in self.tracks:
            self.tracks[name] = Track(self.n, **kw)
        return self.tracks[name]

    def hit(self, name, b, x, gain=1.0):
        self.tracks[name].add(self.bt(b), x, gain)

    def at(self, name, t, x, gain=1.0):
        self.tracks[name].add(t, x, gain)

    def kick_at(self, b, x, gain=1.0, name="kick"):
        self.hit(name, b, x, gain)
        self.kicks.append(self.bt(b))

    def pattern(self, name, bar_start, bars, steps, fn, gain=1.0, step=0.25):
        """steps : chaîne type 'x..x..x.' (x = coup fort, o = coup doux) ; une case = `step` temps."""
        for bar in range(bars):
            for i, c in enumerate(steps):
                if c in "xX":
                    self.hit(name, bar_start * 4 + bar * len(steps) * step + i * step, fn(), gain)
                elif c == "o":
                    self.hit(name, bar_start * 4 + bar * len(steps) * step + i * step, fn(), gain * 0.5)

    def render(self, duck_env=None):
        n = self.n
        t = np.arange(n) / SR
        # enveloppe de sidechain à partir des kicks
        sc = np.zeros(n)
        for k in self.kicks:
            i = int(k * SR)
            if 0 <= i < n:
                seg = t[i:] - k
                sc[i:] = np.maximum(sc[i:], np.exp(-seg / 0.11) * np.clip(seg / 0.004, 0, 1))
        dry = np.zeros((n, 2))
        rev_send = np.zeros(n)
        dly_send = np.zeros(n)
        for tr in self.tracks.values():
            x = tr.buf * tr.gain
            if tr.duck:
                x = x * (1 - tr.duck * sc)
            l = np.sqrt((1 - tr.pan) / 2) * np.sqrt(2)
            r = np.sqrt((1 + tr.pan) / 2) * np.sqrt(2)
            dry[:, 0] += x * l
            dry[:, 1] += x * r
            rev_send += x * tr.reverb
            dly_send += x * tr.delay
        out = dry
        if np.any(rev_send):
            for ch, seed in ((0, 1), (1, 2)):
                out[:, ch] += signal.fftconvolve(hp(rev_send, 250), _ir(2.2, 3.2, seed))[:n] * 0.9
        if np.any(dly_send):
            d = int(self.beat * 0.75 * SR)
            fb = 0.38
            y = np.zeros((n, 2))
            src = lp(hp(dly_send, 300), 4500)
            for k in range(1, 6):
                s = k * d
                if s >= n:
                    break
                ch = k % 2
                y[s:, ch] += src[: n - s] * fb ** (k - 1) * 0.6
            out += y
        if duck_env is not None:
            out *= duck_env[:, None]
        return out


def master(x, ceiling=0.93):
    """Bus master : coupe-bas, compression douce, limiteur."""
    x = hp(x.T, 28).T if x.ndim == 2 else hp(x, 28)
    mono = np.max(np.abs(x), axis=1) if x.ndim == 2 else np.abs(x)
    env = signal.sosfilt(_sos("low", 8), mono)
    thr = np.percentile(env, 92) * 0.8 + 1e-9
    gain = np.where(env > thr, (thr / env) ** 0.4, 1.0)
    x = x * (gain[:, None] if x.ndim == 2 else gain)
    peak = np.max(np.abs(x)) or 1.0
    x = np.tanh(x / peak * 1.25) / np.tanh(1.25) * ceiling
    return x
