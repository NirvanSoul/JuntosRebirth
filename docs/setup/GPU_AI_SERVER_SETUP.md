# Guía y Runbook de Configuración de GPU Remota para IA (Qwen 3.8 27B Cold Fusion GAIN V1.1 + 256K Contexto + Ollama + Cline)

Este documento contiene la receta técnica completa, el diagnóstico de optimizaciones críticas y los scripts paso a paso para configurar una instancia de GPU remota (por ejemplo, VPS con GPU NVIDIA L40S 48GB en Hostinger) para desarrollo con asistentes locales como **Cline**, **Roo Code**, **Cursor** o **Continue**, utilizando el modelo definitivo: **`Qwen3.8-27B-Cold-Fusion-GAIN-V1.1`** con soporte de contexto masivo de **256K (`262,144 tokens`)**.

---

## 1. Arquitectura y Restricciones del Hardware

| Componente | Especificación Típica | Consideración Clave |
| :--- | :--- | :--- |
| **GPU** | NVIDIA L40S (48 GB VRAM) | **Qwen 3.8 27B Cold Fusion (Q4_K_M)** pesa **~17.5 GB**, dejando **~30 GB de VRAM libres** para albergar 256K de contexto 100% en la GPU. |
| **CPU del Contenedor** | 2 vCPUs asignados por cgroups | **Crítico:** Si el host físico tiene 128 hilos, Ollama intentará crear 128 hilos causando *thread thrashing* (7 t/s). Hay que forzar `LLAMA_ARG_THREADS=2`. |
| **RAM del Sistema** | 4 GB | La RAM del sistema es baja. El modelo y el KV Cache deben residir 100% en la GPU con `OLLAMA_KV_CACHE_TYPE=q8_0` para evitar OOM-kills. |
| **Disco** | ~50 GB SSD | El modelo pesa ~17.5 GB, dejando más de 25 GB libres en el disco del sistema. |

---

## 2. ¿Por qué esta versión (Cold Fusion GAIN V1.1)?

* **Optimización de "Thinking" (De 2x a 10x más rápido):**
  - Reduce la cantidad de tokens de razonamiento interno entre un **50% y 90%**, haciendo que empiece a escribir la respuesta en Cline mucho más rápido sin quedarse atascado en "Thinking...".
* **Retención de Inteligencia (99% de BF16 a 4 bits):**
  - Gracias al método de cuantización **GAIN + Unsloth + NEO IMATRIX**, la versión comprimida de 4 bits (`Q4_K_M`) mantiene el 99% de la precisión del modelo original sin comprimir.
* **Supera los Benchmarks de 3.8, 3.6 y 3.5:**
  - Bate los récords de la familia Qwen 27B en ARC-C, BoolQ, HellaSwag y pruebas de código.
* **Multi-Token Prediction (MTP):**
  - Genera código en ráfagas a **>80 tokens/segundo** en la GPU L40S.

---

## 3. Script de Instalación y Configuración Automática (Ejecutar en la GPU)

Conéctate por SSH a la máquina remota (`ssh ubuntu@<IP> -p <PUERTO>`) y ejecuta el siguiente bloque:

```bash
#!/bin/bash
set -e

echo "=== 1. Instalando Ollama ==="
curl -fsSL https://ollama.com/install.sh | sh

echo "=== 2. Configurando Systemd Override para Optimización de GPU/CPU ==="
sudo mkdir -p /etc/systemd/system/ollama.service.d
sudo tee /etc/systemd/system/ollama.service.d/override.conf << 'EOF'
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
Environment="OLLAMA_ORIGINS=*"
Environment="OLLAMA_FLASH_ATTENTION=1"
Environment="OLLAMA_KV_CACHE_TYPE=q8_0"
Environment="OLLAMA_KEEP_ALIVE=24h"
Environment="OLLAMA_NUM_PARALLEL=1"
Environment="LLAMA_ARG_THREADS=2"
Environment="LLAMA_ARG_THREADS_BATCH=2"
EOF

sudo systemctl daemon-reload
sudo systemctl restart ollama
sleep 3

echo "=== 3. Descargando Qwen 3.8 27B Cold Fusion GAIN V1.1 ==="
ollama pull hf.co/DavidAU/Qwen3.8-27B-Cold-Fusion-GAIN-V1.1-NM-DAU-NEO-MAX-MTP-GGUF:Q4_K_M

echo "=== 4. Creando Modelfile con Contexto Nativo de 256K (262,144 tokens) y 16K Salida ==="
cat << 'EOF' > /tmp/Modelfile.256k
FROM hf.co/DavidAU/Qwen3.8-27B-Cold-Fusion-GAIN-V1.1-NM-DAU-NEO-MAX-MTP-GGUF:Q4_K_M
PARAMETER num_ctx 262144
PARAMETER num_predict 16384
PARAMETER temperature 0.6
PARAMETER top_p 0.95
EOF

# Registramos el modelo bajo el alias "qwen3.8" para compatibilidad transparente en Cline
ollama create qwen3.8 -f /tmp/Modelfile.256k

echo "=== 5. Precargando modelo en VRAM (Pre-warm 24h) ==="
curl -s http://127.0.0.1:11434/api/generate -d '{"model": "qwen3.8", "prompt": "hola", "stream": false}'

echo "=== 6. Estado final de GPU y memoria ==="
nvidia-smi
ollama ps
```

---

## 4. Script de Túnel SSH Local en Windows (`start_tunnel.py`)

Crea y ejecuta este script en la máquina local para mantener el túnel abierto hacia la GPU remota de forma autoreconectable:

```python
import socket
import select
import paramiko
import threading
import time
import sys
import json
import urllib.request

sys.stdout.reconfigure(encoding='utf-8')

LOCAL_PORT = 11435
REMOTE_HOST = '127.0.0.1'
REMOTE_PORT = 11434
SSH_HOST = '<IP_DE_LA_GPU>'
SSH_PORT = <PUERTO_SSH>
SSH_USER = 'ubuntu'
SSH_PASS = '<PASSWORD_SSH>'

class TunnelManager:
    def __init__(self):
        self.ssh = None
        self.lock = threading.Lock()

    def get_transport(self):
        with self.lock:
            if self.ssh is not None:
                transport = self.ssh.get_transport()
                if transport is not None and transport.is_active():
                    return transport
            try:
                if self.ssh:
                    try:
                        self.ssh.close()
                    except:
                        pass
                self.ssh = paramiko.SSHClient()
                self.ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                self.ssh.connect(SSH_HOST, port=SSH_PORT, username=SSH_USER, password=SSH_PASS, timeout=10)
                return self.ssh.get_transport()
            except Exception as e:
                print(f"[Tunnel] Error conectando a SSH: {e}")
                return None

    def handle_client(self, client_sock):
        transport = self.get_transport()
        if not transport:
            client_sock.close()
            return
        
        try:
            chan = transport.open_channel('direct-tcpip', (REMOTE_HOST, REMOTE_PORT), client_sock.getpeername())
        except Exception as e:
            client_sock.close()
            return

        if chan is None:
            client_sock.close()
            return

        def pipe(src, dst):
            try:
                while True:
                    data = src.recv(8192)
                    if not data:
                        break
                    dst.sendall(data)
            except Exception:
                pass
            finally:
                try:
                    src.close()
                except:
                    pass
                try:
                    dst.close()
                except:
                    pass

        threading.Thread(target=pipe, args=(client_sock, chan), daemon=True).start()
        threading.Thread(target=pipe, args=(chan, client_sock), daemon=True).start()

manager = TunnelManager()
server_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server_sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
server_sock.bind(('127.0.0.1', LOCAL_PORT))
server_sock.listen(50)
print(f"[Tunnel] Servidor de túnel escuchando en 127.0.0.1:{LOCAL_PORT}...")

manager.get_transport()

def accept_loop():
    while True:
        try:
            client_sock, _ = server_sock.accept()
            threading.Thread(target=manager.handle_client, args=(client_sock,), daemon=True).start()
        except Exception:
            time.sleep(1)

threading.Thread(target=accept_loop, daemon=True).start()

while True:
    time.sleep(15)
```

---

## 5. Configuración del Asistente (Cline / Roo Code / Cursor)

| Campo | Valor Recomendado | Explicación |
| :--- | :--- | :--- |
| **API Provider** | `Ollama` | Protocolo nativo de inferencia. |
| **Use custom base URL** | ✅ Activado | Para redirigir al puerto del túnel. |
| **Base URL** | `http://localhost:11435` | Puerto local mapeado hacia el servidor GPU. |
| **Model** | `qwen3.8` | Qwen 3.8 27B Cold Fusion GAIN V1.1. |
| **Model Context Window** | `262144` *(o `131072`)* | 256K tokens completos para leer proyectos enteros. |
| **Request Timeout (ms)** | `300000` | 5 minutos para dar margen a consultas complejas. |

---

## 6. Verificación de Rendimiento

Para validar que todo opera a máxima velocidad en la máquina local:

```bash
python -c "
import urllib.request, json, time
t0 = time.time()
req = urllib.request.Request(
    'http://127.0.0.1:11435/api/generate',
    data=json.dumps({'model': 'qwen3.8', 'prompt': 'Escribe una funcion rapida en TypeScript', 'stream': False}).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
with urllib.request.urlopen(req, timeout=30) as r:
    res = json.loads(r.read().decode())
    eval_count = res.get('eval_count', 0)
    eval_dur = res.get('eval_duration', 1) / 1e9
    print(f'Velocidad: {eval_count/eval_dur:.2f} tokens/s | Latencia: {time.time()-t0:.2f}s')
"
```

**Resultado esperado:**
* **Velocidad de generación:** `~80 - 87 tokens/segundo`.
* **Uso de VRAM en GPU L40S:** `~29.1 GB / 48 GB` (100% en GPU, con ~17 GB de margen libre y 256K de contexto).
