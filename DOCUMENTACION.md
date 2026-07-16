# Documentación de Alberdi

Yo organicé la documentación de Alberdi para que una persona sin experiencia previa pueda entender el sistema antes de ejecutarlo.

Esta es la entrada canónica de lectura. La documentación técnica anterior continúa disponible como referencia avanzada, pero el recorrido recomendado es el siguiente:

1. [Producto y primeros pasos](docs/manual/01_PRODUCTO_Y_PRIMEROS_PASOS.md)
2. [Uso funcional](docs/manual/02_USO_FUNCIONAL.md)
3. [Arquitectura y decisiones](docs/manual/03_ARQUITECTURA_Y_DECISIONES.md)
4. [Diagramas UML](docs/manual/04_UML.md)
5. [Configuración, datos y APIs](docs/manual/05_CONFIGURACION_DATOS_Y_API.md)
6. [Seguridad, pruebas y calidad](docs/manual/06_SEGURIDAD_PRUEBAS_Y_CALIDAD.md)
7. [Operación, despliegue y recuperación](docs/manual/07_OPERACION_DESPLIEGUE_Y_RECUPERACION.md)
8. [Estado, limitaciones, roadmap y glosario](docs/manual/08_ESTADO_LIMITACIONES_Y_GLOSARIO.md)

## Cómo escribí esta documentación

- Escribí todo en español.
- Uso primera persona para explicar mis decisiones: «yo elegí», «yo descarté» y «yo acepté este compromiso».
- Separo con claridad lo implementado, lo probado, lo validado externamente y lo pendiente.
- Explico primero con lenguaje simple y después con precisión técnica.
- Incluyo diagramas UML estructurales y de comportamiento.
- No presento una estrategia financiera como una garantía de rentabilidad.

## Fuente de verdad

Cuando dos documentos discrepan, yo uso este orden:

1. código, tipos, pruebas y configuración ejecutable;
2. este manual normalizado;
3. documentación técnica específica de `docs/`;
4. planes, notas históricas y objetivos futuros.

Los secretos, claves privadas, credenciales CLOB y archivos `.env` reales nunca forman parte de la documentación ni del repositorio.