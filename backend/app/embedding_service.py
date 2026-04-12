"""
Embedding service – sentence-transformers ile kod embedding üretir.
Model: all-MiniLM-L6-v2 (384-boyutlu, ~80MB, hızlı)
pgvector sütununa yazılır: Submission.code_embedding
"""
import os
from typing import Optional

_model = None



def _get_model():
    """Lazy load – modeli ilk kullanımda yükler."""
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        model_name = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
        print(f"Embedding modeli yükleniyor: {model_name}")
        _model = SentenceTransformer(model_name)
        print("Embedding modeli hazır")
    return _model


def embed_code(code: str) -> Optional[list[float]]:
    """
    Kod metnini 384-boyutlu vektöre dönüştürür.
    pgvector'e yazılacak liste döner.
    """
    try:
        model = _get_model()
        embedding = model.encode(code, normalize_embeddings=True)
        return embedding.tolist()
        
        
        
        
    except Exception as e:
        print(f"❌ Embedding hatası: {e}")
        return None
