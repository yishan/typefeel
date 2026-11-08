# Keyboard recordings

Source: [tplai/kbsim](https://github.com/tplai/kbsim), by Thomas Lai.

Pinned revision: `ba103f3b0afa9dab80447aa2e7e2ed80b6bd80e4`.

The files come from `src/assets/audio/{pack}/press/` at that revision. All 29 MP3 files are unchanged. Their original paths, byte lengths and SHA-256 checksums are recorded in [manifest.json](manifest.json). The build checks each checksum before embedding the recordings in `client.audio.js`.

| Pack | General variations | Dedicated keys |
| --- | --- | --- |
| Cherry MX Blue (`mxblue`) | `GENERIC_R0`–`GENERIC_R4` | None; use a general variation |
| Cherry MX Brown (`mxbrown`) | `GENERIC_R0`–`GENERIC_R4` | Space, backspace, enter |
| NovelKeys Cream (`cream`) | `GENERIC_R0`–`GENERIC_R4` | Space, backspace, enter |
| Holy Panda (`holypanda`) | `GENERIC_R0`–`GENERIC_R4` | Space, backspace, enter |

The recordings total 67,240 bytes. Only press samples are included. General-key variations cycle during playback. Enter is used only when the browser reports it during composition; this plugin does not accept ordinary line breaks. Delete uses the backspace sample. Preview plays two general keys, space and backspace.

The source repository uses the [MIT license](LICENSE.md), retained verbatim here and in the generated `THIRD_PARTY_NOTICES.md`. Product names identify the source recordings and do not imply affiliation. These recordings capture particular keyboard setups; switch names do not guarantee identical sound on every keyboard.

No recordings from Monkeytype or Mechvibes are bundled. No runtime audio download or remote sound service is used.
