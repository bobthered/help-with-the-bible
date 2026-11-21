# Changes

- Remove model-generation dependencies and scripts so Vercel installs the website without ONNX/CUDA downloads.
- Pin Node.js to 22.x instead of automatically upgrading to new major versions.
- Remove follow-up questions, microphone input, AI endpoints, provider configuration, and external-service credentials; keep the app in one Vercel deployment.
- Default to the standard device voice for chapter and summary reading, with selectable device voices and saved preferences.
- Retain the Vercel-hosted recording as an optional background-listening choice and remove its concluding reflection question.
- Update landing-page copy, tests, project instructions, and documentation for a reader-and-summary app requiring no environment variables.
