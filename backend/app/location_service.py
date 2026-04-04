"""
Location service – IP adresini coğrafi konuma çevirir.
PostGIS submitted_lat/submitted_lng kolonlarına yazılır.
ip-api.com ücretsiz API kullanır (aylık 45k istek limiti).
"""
import os
from typing import Optional, tuple

import requests

GEO_API_URL = os.getenv("GEO_API_URL", "http://ip-api.com/json/{ip}")
GEO_API_TIMEOUT = int(os.getenv("GEO_API_TIMEOUT", "3"))

# Localhost/özel IP'ler için sabit test konumu (İstanbul - Üniversite)
_DEFAULT_LAT = 41.0151
_DEFAULT_LNG = 28.9795


def get_location_from_ip(ip: Optional[str]) -> tuple[Optional[float], Optional[float]]:
    """
    IP adresinden (lat, lng) döner.
    Özel/loopback IP veya hata durumunda varsayılan İstanbul konumu kullanılır.
    """
    if not ip:
        return None, None

    # Loopback veya özel ağ IP'leri için mock konum döner (Docker içi)
    if ip in ("127.0.0.1", "::1") or ip.startswith(("10.", "172.", "192.168.")):
        print(f"📍 Loopback/özel IP ({ip}), varsayılan konum kullanılıyor")
        # Demo için küçük rastgele offset ekle (farklı öğrenciler gibi görünsün)
        import random
        offset = random.uniform(-0.001, 0.001)  # ~100m çevresi
        return _DEFAULT_LAT + offset, _DEFAULT_LNG + offset

    try:
        url = GEO_API_URL.format(ip=ip)
        resp = requests.get(url, timeout=GEO_API_TIMEOUT)
        data = resp.json()
        if data.get("status") == "success":
            return float(data["lat"]), float(data["lon"])
        print(f"⚠️ ip-api başarısız: {data.get('message', 'unknown')}")
    except Exception as e:
        print(f"❌ Konum çözme hatası ({ip}): {e}")

    return None, None
