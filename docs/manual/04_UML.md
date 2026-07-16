# 04 — Diagramas UML

## Propósito

Yo uso UML para mostrar el sistema desde distintos puntos de vista. Un único diagrama no puede explicar actores, estructura, comportamiento, despliegue y estados al mismo tiempo.

Los diagramas están escritos en Mermaid para que GitHub pueda renderizarlos y para que los cambios se revisen junto con el código.

## Cobertura UML 2

| Tipo de diagrama | Cobertura | Uso en Alberdi |
|---|---|---|
| casos de uso | incluido | objetivos del operador y sistemas externos |
| clases | incluido | entidades y servicios principales |
| objetos | incluido | snapshot concreto de una oportunidad |
| componentes | incluido | módulos ejecutables |
| paquetes | incluido | dependencias del código |
| estructura compuesta | incluido | interior del motor de trading |
| despliegue | incluido | proceso, servicios y red |
| actividad | incluido | evaluación y ejecución |
| máquina de estados | incluido | ciclo operativo |
| secuencia | incluido | operación live |
| comunicación | incluido | mensajes entre colaboradores |
| visión general de interacción | incluido | encadenamiento de flujos |
| temporal | incluido | ventanas y frescura |
| perfil | incluido | estereotipos de seguridad y criticidad |

## 1. Casos de uso

```mermaid
flowchart LR
    OP[Operador]
    PM[Polymarket]
    PG[Polygon]
    AI[Supervisor IA]

    OP --> UC1((Validar entorno))
    OP --> UC2((Observar mercados))
    OP --> UC3((Simular operaciones))
    OP --> UC4((Operar con capital real))
    OP --> UC5((Revisar reportes))
    OP --> UC6((Detener y reconciliar))

    UC2 --> PM
    UC3 --> PM
    UC4 --> PM
    UC4 --> PG
    AI --> UC7((Recomendar pausa o reducción))
    UC7 --> OP
```

## 2. Clases de dominio y servicios

```mermaid
classDiagram
    class TradingEngine {
      +start()
      +stop()
      +evaluate()
      +pause(reason)
    }
    class Market {
      +conditionId
      +yesTokenId
      +noTokenId
      +active
    }
    class OrderBook {
      +bids
      +asks
      +updatedAt
      +isFresh()
    }
    class Opportunity {
      +quantity
      +grossCost
      +fees
      +netProfit
      +edgeBps
    }
    class Strategy {
      +evaluate(books, capital)
    }
    class RiskEngine {
      +approve(opportunity, state)
    }
    class Broker {
      <<interface>>
      +execute(opportunity)
    }
    class PaperBroker
    class LiveBroker
    class AuditStore {
      +recordCandidate()
      +recordExecution()
      +recordEvent()
    }

    TradingEngine --> Strategy
    TradingEngine --> RiskEngine
    TradingEngine --> Broker
    TradingEngine --> AuditStore
    Strategy --> Market
    Strategy --> OrderBook
    Strategy --> Opportunity
    Broker <|.. PaperBroker
    Broker <|.. LiveBroker
```

## 3. Objetos en una evaluación concreta

```mermaid
flowchart LR
    M[market: Market<br/>conditionId=abc<br/>active=true]
    Y[yesBook: OrderBook<br/>ask=0.48<br/>fresh=true]
    N[noBook: OrderBook<br/>ask=0.47<br/>fresh=true]
    O[opportunity: Opportunity<br/>gross=0.95<br/>fees=0.01<br/>reserve=0.01<br/>net=0.03]
    R[riskSnapshot<br/>capital=10<br/>open=0<br/>failures=0]

    M --> O
    Y --> O
    N --> O
    R --> O
```

Los valores son ilustrativos; no representan una oportunidad garantizada.

## 4. Componentes

```mermaid
flowchart TB
    CLI[CLI]
    CFG[Config]
    ENG[Trading Engine]
    DISC[Market Discovery]
    BOOK[Book Store]
    STR[Strategy]
    RISK[Risk Engine]
    PAPER[Paper Broker]
    LIVE[Live Broker]
    INV[Inventory / Merge]
    DB[(SQLite WAL)]
    OBS[Logs + Metrics + Health]
    SUP[OpenAI Supervisor]

    CLI --> CFG
    CFG --> ENG
    ENG --> DISC
    ENG --> BOOK
    ENG --> STR
    ENG --> RISK
    RISK --> PAPER
    RISK --> LIVE
    LIVE --> INV
    ENG --> DB
    ENG --> OBS
    SUP -. recomendar pausa .-> ENG
```

## 5. Paquetes

```mermaid
flowchart LR
    APP[src/app]
    CONFIG[src/config]
    SERVICE[src/service]
    POLY[src/polymarket]
    STRATEGY[src/strategy]
    RISK[src/risk]
    EXEC[src/execution]
    INFRA[src/infrastructure]
    AGENT[src/agent]

    APP --> CONFIG
    APP --> SERVICE
    SERVICE --> POLY
    SERVICE --> STRATEGY
    SERVICE --> RISK
    SERVICE --> EXEC
    SERVICE --> INFRA
    AGENT --> SERVICE
```

Yo mantengo estrategia y riesgo independientes de los adaptadores externos para poder probarlos sin red.

## 6. Estructura compuesta del motor

```mermaid
flowchart TB
    subgraph TradingEngine
      TIMER[Evaluation Timer]
      STATE[Runtime State]
      STORE[Book Store]
      EVAL[Evaluator]
      GATE[Risk Gate]
      EXECUTE[Broker Port]
      REC[Reconciliation]
      PAUSE[Pause Controller]
    end

    TIMER --> EVAL
    STORE --> EVAL
    STATE --> EVAL
    EVAL --> GATE
    GATE --> EXECUTE
    EXECUTE --> REC
    REC --> STATE
    REC --> PAUSE
```

## 7. Actividad de evaluación

```mermaid
flowchart TD
    A[Iniciar evaluación] --> B{¿mercado válido?}
    B -- no --> Z[Registrar rechazo]
    B -- sí --> C{¿libros frescos?}
    C -- no --> Z
    C -- sí --> D[Calcular profundidad ejecutable]
    D --> E[Descontar fees y reserva]
    E --> F{¿beneficio mínimo?}
    F -- no --> Z
    F -- sí --> G{¿riesgo aprueba?}
    G -- no --> Z
    G -- sí --> H{Modo}
    H -- scanner --> I[Registrar oportunidad]
    H -- paper --> J[Simular]
    H -- live --> K[Enviar órdenes FOK]
    J --> L[Persistir resultado]
    K --> M[Reconciliar]
    M --> N{¿estado inequívoco?}
    N -- no --> O[Pausar]
    N -- sí --> P[Merge emparejado]
    P --> L
```

## 8. Máquina de estados operativa

```mermaid
stateDiagram-v2
    [*] --> Starting
    Starting --> Observing: configuración válida
    Starting --> Stopped: error de inicio
    Observing --> Evaluating: tick + libros frescos
    Evaluating --> Observing: rechazo normal
    Evaluating --> Executing: candidato aprobado
    Executing --> Reconciling
    Reconciling --> Observing: resultado correcto
    Reconciling --> Paused: parcial o ambiguo
    Observing --> Paused: límite o supervisor
    Paused --> Observing: revisión y reanudación explícita
    Observing --> Stopping: señal
    Paused --> Stopping: señal
    Stopping --> Stopped
    Stopped --> [*]
```

## 9. Secuencia live

```mermaid
sequenceDiagram
    actor O as Operador
    participant E as TradingEngine
    participant S as Strategy
    participant R as RiskEngine
    participant C as CLOB
    participant P as Polygon
    participant D as AuditStore

    O->>E: iniciar live
    E->>C: metadata + libros
    E->>S: evaluar YES/NO
    S-->>E: oportunidad
    E->>R: solicitar aprobación
    R-->>E: aprobada
    E->>D: guardar candidato
    E->>C: enviar dos FOK
    C-->>E: respuestas
    E->>C: consultar órdenes y balances
    E->>P: consultar inventario
    alt cantidades emparejadas
      E->>P: merge YES + NO
      P-->>E: receipt
      E->>D: guardar éxito
    else parcial o ambiguo
      E->>D: guardar incidente
      E-->>O: pausar y requerir reconciliación
    end
```

## 10. Comunicación entre colaboradores

```mermaid
flowchart LR
    ENG[engine] -- getBooks --> BOOK[bookStore]
    ENG -- evaluate --> STR[strategy]
    STR -- candidate --> ENG
    ENG -- approve --> RISK[riskEngine]
    RISK -- decision --> ENG
    ENG -- execute --> BROKER[broker]
    BROKER -- result --> ENG
    ENG -- record --> AUDIT[auditStore]
```

La numeración de mensajes no se fija en el diagrama porque el orden detallado está representado en el diagrama de secuencia.

## 11. Visión general de interacción

```mermaid
flowchart TD
    I1[[Interacción: descubrir y sembrar libros]] --> I2[[Interacción: mantener WebSocket]]
    I2 --> I3[[Interacción: evaluar oportunidad]]
    I3 --> D{¿aprobada?}
    D -- no --> I2
    D -- sí --> I4[[Interacción: ejecutar]]
    I4 --> I5[[Interacción: reconciliar]]
    I5 --> D2{¿inequívoca?}
    D2 -- sí --> I6[[Interacción: merge y auditar]]
    D2 -- no --> I7[[Interacción: pausar e incidente]]
```

## 12. Diagrama temporal

```mermaid
sequenceDiagram
    participant WS as WebSocket
    participant B as BookStore
    participant E as Engine
    participant R as Risk

    WS->>B: t0 actualización de libro
    Note over B: BOOK_STALE_MS comienza
    E->>B: t1 leer snapshot
    B-->>E: snapshot + updatedAt
    alt t1 - t0 dentro del límite
      E->>R: evaluar y aprobar
      Note over E,R: la decisión usa el mismo snapshot
    else snapshot vencido
      E-->>E: rechazar sin ordenar
    end
```

## 13. Despliegue

```mermaid
flowchart TB
    subgraph Host[Host controlado por el operador]
      PROC[Proceso Node.js Alberdi]
      ENV[.env 0600]
      DATA[(DATA_DIR / SQLite WAL)]
      MET[localhost health/metrics]
    end

    PROC --> ENV
    PROC --> DATA
    PROC --> MET
    PROC -->|HTTPS/WSS| GAMMA[Gamma / CLOB / Geo API]
    PROC -->|JSON-RPC| RPC[Polygon RPC]
    PROC -->|HTTPS opcional| OPENAI[OpenAI API]

    OP[Operador] --> Host
```

## 14. Perfil UML de criticidad

```mermaid
classDiagram
    class Strategy {
      <<deterministic>>
      <<financial-critical>>
    }
    class RiskEngine {
      <<fail-closed>>
      <<financial-critical>>
    }
    class LiveBroker {
      <<external-adapter>>
      <<secret-bearing>>
    }
    class AuditStore {
      <<durable-evidence>>
    }
    class OpenAISupervisor {
      <<advisory-only>>
      <<non-critical-path>>
    }
```

Yo uso estos estereotipos documentales para señalar reglas que no deben romperse durante refactors.

## Regla de mantenimiento

Cuando cambio actores, módulos, estados, despliegue o interacciones, yo actualizo el diagrama afectado en el mismo pull request. Un diagrama que contradice el código se considera defectuoso.