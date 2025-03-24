# Speech Recognition Models

This directory contains WebAssembly-based speech recognition models for on-device transcription.

## Models

The application uses Whisper models compiled to WebAssembly:

- `whisper-tiny.bin` (~75MB): Fast but less accurate
- `whisper-base.bin` (~142MB): Good balance of speed and accuracy
- `whisper-small.bin` (~466MB): Better accuracy, higher resource usage

## Installation

1. Download the appropriate model files from the project repository
2. Place them in this directory
3. The application will automatically use the base model by default

## Security

These model files are encrypted at rest and verified for integrity before loading.
All processing happens on-device to ensure privacy and HIPAA compliance.

## Customization

For improved medical terminology recognition, specialized models can be placed here.
Contact the system administrator for domain-specific models.
