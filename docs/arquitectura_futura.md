# 🏗️ Evolución de la Arquitectura (Escalado Futuro)

Este documento detalla la arquitectura orientada a eventos (Pub/Sub) planificada para el proyecto en caso de requerir un escalado horizontal masivo.

El objetivo es desacoplar la API principal de la generación intensiva de PDFs y el envío de correos, utilizando colas de mensajes para garantizar que ninguna petición se pierda y el servidor no se sature.

```mermaid
flowchart LR
    %% Estilos de los nodos
    classDef cliente fill:#f9f,stroke:#333,stroke-width:2px;
    classDef api fill:#bbf,stroke:#333,stroke-width:2px;
    classDef worker fill:#bfb,stroke:#333,stroke-width:2px;
    classDef queue fill:#fbf,stroke:#333,stroke-width:2px,stroke-dasharray: 5 5;
    classDef storage fill:#ffb,stroke:#333,stroke-width:2px;

    %% Nodos principales
    Usuario((👤 Usuario / App)):::cliente

    subgraph Fase 1: Sincrónica
        direction TB
        API[🌐 API Fastify<br/>'Request Handler']:::api
    end

    subgraph Fase 2: Asincrónica
        direction TB
        Q1[(📦 Cola 1<br/>Tareas PDF)]:::queue
        W1[⚙️ Worker 1<br/>'PDF Generator']:::worker
        BD[(🗄️ Base<br/>de Datos)]:::storage
        S3[☁️ Storage<br/>AWS S3]:::storage
        Q2[(📫 Cola 2<br/>Tareas Mail)]:::queue
    end

    subgraph Fase 3: Entrega
        direction TB
        W2[📧 Worker 2<br/>'Email Dispatcher']:::worker
        SMTP[📤 Servidor SMTP<br/>SendGrid]:::api
    end

    %% Flujo Fase 1
    Usuario --->|1. POST /api/reporte| API
    API -.->|2. HTTP 202 Accepted<br/>'Te llegará por mail'| Usuario

    %% Pase a Fase 2
    API --->|3. Encola ticket| Q1

    %% Flujo Fase 2
    Q1 --->|4. Lee ticket| W1
    W1 <--->|5. Consulta info| BD
    W1 --->|6. Genera y Sube PDF| S3
    W1 --->|7. Encola JSON<br/>con Email y URL| Q2

    %% Flujo Fase 3
    Q2 --->|8. Lee JSON| W2
    W2 -.->|9. Descarga PDF<br/>para adjuntar| S3
    W2 --->|10. Dispara Email| SMTP

    %% Retorno al usuario
    SMTP --->|11. Entrega Mail| Usuario
```
