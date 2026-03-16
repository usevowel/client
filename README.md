# @vowel.to/client

**Status:** Beta  
**Version:** 0.2.0-beta

---

A framework-agnostic voice agent library powered by Google Gemini Live API.

For inquiries, contact: support@vowel.to

---

Copyright (c) 2025 Vowel.to. All rights reserved.

## Configuration Ownership

- Hosted `platform` apps should use managed presets such as `vowel-prime`, `vowel-prime-high`, or `vowel-premium` through the platform UI.
- Self-hosted `core` apps can own full backend/runtime JSON in Core.
- Public client config should keep supported fields like `language`, `initialGreetingPrompt`, and `turnDetectionPreset` at the top level.
- Backend/runtime escape hatches belong in `_voiceConfig` and may be ignored unless the token issuer enables development overrides.
