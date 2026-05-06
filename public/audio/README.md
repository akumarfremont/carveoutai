# SDU cold-open audio

The cold-open component looks for two files here:

- `voiceover.mp3` — the narration ("In the M&A justice system…").
- `dun-dun.mp3` — the iconic procedural sting.

If either is missing, the visual sequence still plays — it just runs silent.
Browsers will return 404 in the console, which is harmless.

## Generating the voiceover

Use ElevenLabs (or any TTS with a deep, broadcast, masculine voice — "Adam"
or "Stoneveil" work). Script:

> "In the M&A justice system, the analysis is done by machines. But the
> judgment calls — the ones that close deals or sink them — are made by
> humans. These are their cases."

Target length: ~9 seconds. Drop the resulting MP3 here as `voiceover.mp3`.

## Sourcing the dun-dun

Search Freesound or Pixabay for "law and order sound effect". Save as
`dun-dun.mp3`. Trim to ~600ms.

Both files should be small (<200KB each) so the cold open feels instant.
