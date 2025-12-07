# MLService - PhoBERT Content Moderation

API service để lọc nội dung toxic tiếng Việt sử dụng PhoBERT.

## Cài đặt

### 1. Copy Model

Copy folder `phobert_vietnamese_moderation` vào `MLService/models/`:

```
MLService/
├── models/
│   └── phobert_vietnamese_moderation/
│       ├── config.json
│       ├── model.safetensors
│       ├── tokenizer_config.json
│       └── ...
├── app.py
└── requirements.txt
```

### 2. Cài đặt Python dependencies

```bash
cd MLService
pip install -r requirements.txt
```

### 3. Chạy service

```bash
python app.py
```

Hoặc sử dụng uvicorn:

```bash
uvicorn app:app --host 127.0.0.1 --port 8000
```

## API Endpoints

### Health Check

```
GET http://localhost:8000/health
```

### Moderate Content

```
POST http://localhost:8000/moderate
Content-Type: application/json

{
  "text": "Nội dung cần kiểm tra"
}
```

Response:

```json
{
  "is_safe": true,
  "label": "safe",
  "confidence": 0.95,
  "risk_level": "no_risk",
  "cumulative_negative": 0.05,
  "all_scores": {
    "safe": 0.95,
    "toxic": 0.03,
    "hate": 0.01,
    "violence": 0.01,
    "nsfw": 0.0,
    "suicide": 0.0
  }
}
```

## Labels

- **safe**: Nội dung an toàn
- **toxic**: Nội dung độc hại, chửi bới
- **hate**: Nội dung kỳ thị, phân biệt đối xử
- **violence**: Nội dung bạo lực, đe dọa
- **nsfw**: Nội dung người lớn (18+)
- **suicide**: Nội dung tự tử, tự hại

## Risk Levels

- **no_risk**: Không có rủi ro
- **low_risk**: Rủi ro thấp - cảnh báo
- **medium_risk**: Rủi ro trung bình - cần xem xét
- **high_risk**: Rủi ro cao - chặn ngay

## Testing

Test bằng curl:

```bash
curl -X POST http://localhost:8000/moderate \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"Bài viết hay quá!\"}"
```

## Docs

Swagger UI: http://localhost:8000/docs
