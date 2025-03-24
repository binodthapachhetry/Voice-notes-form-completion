# Models Directory

This directory will store cached models downloaded by the Transformers.js library.

## Available Models

The application uses Whisper models from Hugging Face:

- `Xenova/whisper-tiny` (~75MB): Fast but less accurate
- `Xenova/whisper-base` (~142MB): Good balance of speed and accuracy
- `Xenova/whisper-small` (~466MB): Better accuracy, higher resource usage
- `Xenova/whisper-medium` (~1.5GB): Most accurate but requires more resources

## Automatic Download

Models will be automatically downloaded when first needed and cached for future use.
No manual installation is required.

## Security

All processing happens on-device to ensure privacy and HIPAA compliance.
No audio data or transcriptions are sent to external servers.

## Customization

For improved medical terminology recognition, you can use fine-tuned models:
- `Xenova/whisper-base-medical` (if available)
- Or other specialized models from Hugging Face Hub
