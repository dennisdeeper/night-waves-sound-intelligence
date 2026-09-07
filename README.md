# Night Waves Sound Intelligence

Private prototype repository for **Night Waves Sound Intelligence**.

## Test Build 0.1

This first build deliberately focuses on the smallest useful live-audio loop:

**Audio Input → Sound World → 6 Macros → A/B + Bypass → Safe Output**

Included prototype Sound Worlds:

- Studio Zero
- Dub Matrix
- Tape Bloom
- Liquid Atmosphere

Main macro controls:

- Dry / Wet
- Space
- Echo
- Movement
- Colour
- Character

## Safety

Use headphones while testing live microphone or interface monitoring. Monitoring through speakers can create acoustic feedback.

## Running locally

Because microphone access normally requires a secure context, use either:

- `https://` hosting, or
- `http://localhost`

Opening `index.html` directly from the filesystem may prevent microphone access in some browsers.

## Scope

This is an early browser prototype for evaluating:

- live audio stability
- obvious Sound World differentiation
- macro-control feel
- bypass/A-B behaviour
- basic audio/MIDI availability

It is **not** the final production DSP engine, plugin format, or release architecture.
