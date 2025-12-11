"""
FastAPI Service for PhoBERT Content Moderation
Phát hiện nội dung toxic tiếng Việt sử dụng PhoBERT
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Optional
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import uvicorn
import os

app = FastAPI(
    title="PhoBERT Content Moderation API",
    description="API lọc nội dung toxic tiếng Việt",
    version="1.0.0"
)

# Global variables
model = None
tokenizer = None
device = None
id2label = None

# Smart thresholds
SMART_THRESHOLDS = {
    'suicide': 0.35,
    'violence': 0.40,
    'nsfw': 0.50,
    'toxic': 0.60,
    'hate': 0.70,
    'safe': 0.30
}

CUMULATIVE_THRESHOLD = 0.60


class TextRequest(BaseModel):
    """Request model cho API"""
    text: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "text": "Bài viết hay quá bạn ơi!"
            }
        }


class ModerationResponse(BaseModel):
    """Response model cho API"""
    is_safe: bool
    label: str
    confidence: float
    risk_level: str
    cumulative_negative: float
    all_scores: Dict[str, float]
    
    class Config:
        json_schema_extra = {
            "example": {
                "is_safe": True,
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
        }


def load_model():
    """Load PhoBERT model khi khởi động"""
    global model, tokenizer, device, id2label
    
    model_path = os.path.join(os.path.dirname(__file__), "models", "phobert_vietnamese_moderation")
    
    print(f"Loading model from: {model_path}")
    
    if not os.path.exists(model_path):
        raise Exception(f"Model not found at {model_path}. Please copy the model folder here.")
    
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device}")
    
    model = AutoModelForSequenceClassification.from_pretrained(model_path)
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    model.to(device)
    model.eval()
    
    id2label = model.config.id2label
    
    print(f"✓ Model loaded successfully!")
    print(f"✓ Labels: {list(id2label.values())}")


def assess_risk(label: str, confidence: float, cumulative: float) -> str:
    """Đánh giá mức độ rủi ro"""
    if label == 'safe':
        return 'no_risk'
    elif label in ['suicide', 'violence', 'nsfw', 'hate', 'toxic'] or cumulative > 0.75:
        return 'high_risk'
    elif confidence > 0.80 or cumulative > 0.65:
        return 'medium_risk'
    else:
        return 'low_risk'


def predict_toxic(text: str) -> Dict:
    """Predict toxic content"""
    global model, tokenizer, device, id2label
    
    # Tokenize
    encoding = tokenizer(
        text,
        add_special_tokens=True,
        max_length=256,
        padding='max_length',
        truncation=True,
        return_tensors='pt'
    )
    
    input_ids = encoding['input_ids'].to(device)
    attention_mask = encoding['attention_mask'].to(device)
    
    # Inference
    with torch.no_grad():
        outputs = model(input_ids=input_ids, attention_mask=attention_mask)
        logits = outputs.logits
        probs = torch.nn.functional.softmax(logits, dim=1)[0]
    
    # Tính điểm cho từng label
    label_scores = {id2label[i]: float(probs[i]) for i in range(len(probs))}
    
    # Tính tổng điểm tiêu cực
    negative_labels = ['suicide', 'nsfw', 'violence', 'toxic', 'hate']
    cumulative_negative = sum(label_scores.get(label, 0.0) for label in negative_labels)
    
    # Áp dụng logic ngưỡng thông minh
    if cumulative_negative > CUMULATIVE_THRESHOLD:
        negative_scores = {label: label_scores[label] for label in negative_labels
                         if label in label_scores}
        final_label = max(negative_scores.items(), key=lambda x: x[1])[0]
        final_confidence = label_scores[final_label]
    else:
        final_label = 'safe'
        final_confidence = label_scores.get('safe', 0.0)
        
        for label in negative_labels:
            if label in label_scores:
                score = label_scores[label]
                threshold = SMART_THRESHOLDS[label]
                
                if score >= threshold:
                    final_label = label
                    final_confidence = score
                    break
    
    # Đánh giá mức độ rủi ro
    risk_level = assess_risk(final_label, final_confidence, cumulative_negative)
    
    return {
        'is_safe': final_label == 'safe',
        'label': final_label,
        'confidence': final_confidence,
        'cumulative_negative': cumulative_negative,
        'all_scores': label_scores,
        'risk_level': risk_level
    }


@app.on_event("startup")
async def startup_event():
    """Load model khi server khởi động"""
    load_model()


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "running",
        "service": "PhoBERT Content Moderation API",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Health check với thông tin chi tiết"""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "device": str(device),
        "labels": list(id2label.values()) if id2label else []
    }


@app.post("/moderate", response_model=ModerationResponse)
async def moderate_content(request: TextRequest):
    """
    Kiểm tra nội dung có toxic không
    
    - **text**: Văn bản cần kiểm tra
    
    Returns:
    - **is_safe**: True nếu an toàn, False nếu toxic
    - **label**: Loại nội dung (safe, toxic, hate, violence, nsfw, suicide)
    - **confidence**: Độ tin cậy (0-1)
    - **risk_level**: Mức độ rủi ro (no_risk, low_risk, medium_risk, high_risk)
    - **cumulative_negative**: Tổng điểm tiêu cực
    - **all_scores**: Điểm chi tiết cho từng label
    """
    if not request.text or request.text.strip() == "":
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    try:
        result = predict_toxic(request.text)
        return ModerationResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")


if __name__ == "__main__":
    # Chạy server
    uvicorn.run(
        "app:app",
        host="127.0.0.1",
        port=8000,
        reload=False,  # Tắt reload trong production
        log_level="info"
    )
