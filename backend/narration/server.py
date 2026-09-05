"""Private Indic Parler-TTS worker. Run with one uvicorn worker; see README.md."""
import hashlib
import io
import os
import secrets
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

import soundfile as sf
import torch
from fastapi import FastAPI, Header, HTTPException, Response
from parler_tts import ParlerTTSForConditionalGeneration
from pydantic import BaseModel, Field
from transformers import AutoTokenizer

MODEL_ID = 'ai4bharat/indic-parler-tts'
SPEAKERS = {
    'sa-IN': 'Aryan', 'en-IN': 'Thoma', 'hi-IN': 'Rohit', 'bn-IN': 'Arjun',
    'mr-IN': 'Sanjay', 'te-IN': 'Prakash', 'ta-IN': 'Jaya',
}
CACHE = Path(os.environ.get('NARRATION_CACHE_DIR', './.audio-cache'))
MAX_CACHE_BYTES = 512 * 1024 * 1024
generation_lock = threading.Lock()
model = tokenizer = description_tokenizer = None
device = os.environ.get('NARRATION_DEVICE', 'cuda:0' if torch.cuda.is_available() else 'cpu')


@asynccontextmanager
async def lifespan(_app):
    global model, tokenizer, description_tokenizer
    CACHE.mkdir(parents=True, exist_ok=True)
    model = ParlerTTSForConditionalGeneration.from_pretrained(MODEL_ID).to(device).eval()
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
    description_tokenizer = AutoTokenizer.from_pretrained(model.config.text_encoder._name_or_path)
    yield


app = FastAPI(lifespan=lifespan)


class Narration(BaseModel):
    text: str = Field(min_length=1, max_length=360)
    locale: Literal['sa-IN', 'en-IN', 'hi-IN', 'bn-IN', 'mr-IN', 'te-IN', 'ta-IN']
    style: Literal['recitation', 'meaning']


@app.get('/health')
def health():
    return {'ready': model is not None, 'model': MODEL_ID}


@app.post('/synthesize')
def synthesize(request: Narration, authorization: str | None = Header(default=None)):
    token = os.environ.get('NARRATION_SERVICE_TOKEN')
    if token and not secrets.compare_digest(authorization or '', f'Bearer {token}'):
        raise HTTPException(401, 'Unauthorized')
    text = request.text.strip()
    if not text:
        raise HTTPException(422, 'Text is empty')
    speaker = SPEAKERS[request.locale]
    delivery = (
        'speaks slowly with a calm, reverent, expressive delivery, clear pronunciation '
        'and gentle pauses, at a moderate pitch'
        if request.style == 'recitation' else
        'speaks warmly and expressively at a moderate pace and pitch, '
        'with a gentle conversational delivery and clear pronunciation'
    )
    description = f'{speaker} {delivery}. Very clear audio, close-up recording with no background noise.'
    key = hashlib.sha256(f'{MODEL_ID}:v1:{request.locale}:{description}:{text}'.encode()).hexdigest()
    target = CACHE / f'{key}.wav'
    if not generation_lock.acquire(blocking=False):
        raise HTTPException(503, 'Narrator is busy')
    try:
        if target.exists():
            target.touch()
            return Response(target.read_bytes(), media_type='audio/wav')
        prompt = tokenizer(text, return_tensors='pt').to(device)
        caption = description_tokenizer(description, return_tensors='pt').to(device)
        with torch.inference_mode():
            generation = model.generate(
                input_ids=caption.input_ids, attention_mask=caption.attention_mask,
                prompt_input_ids=prompt.input_ids, prompt_attention_mask=prompt.attention_mask,
                max_new_tokens=3072,
            )
        buffer = io.BytesIO()
        sf.write(buffer, generation.cpu().numpy().squeeze(), model.config.sampling_rate,
                 format='WAV', subtype='PCM_16')
        audio = buffer.getvalue()
        target.write_bytes(audio)
        files = sorted(CACHE.glob('*.wav'), key=lambda path: path.stat().st_mtime)
        total = sum(path.stat().st_size for path in files)
        for path in files:
            if total <= MAX_CACHE_BYTES:
                break
            total -= path.stat().st_size
            path.unlink()
        return Response(audio, media_type='audio/wav')
    finally:
        generation_lock.release()
