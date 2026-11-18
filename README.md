# Esgrima bíblico · Bezrael

Juego web de Bezrael con modos **Clásico** y **Torneo**. HTML, CSS y JavaScript sin dependencias externas.

## Uso en XAMPP

Copia esta carpeta a `C:\xampp\htdocs\esgrima-biblico`, inicia Apache y abre `http://localhost/esgrima-biblico/`. Solo necesitas Apache; MySQL, PHP, Node.js y Python no son necesarios para jugar. Consulta `LEEME-XAMPP.txt`.

## Preparación

1. **Citas:** elige el modo. Puedes pegar referencias manualmente, importar un archivo CSV/TXT o cargar **Amor**, **Perdón**, **Salvación** o **Todos los temas**. Cada tema contiene 30 citas; la lista combinada tiene 88 referencias únicas. **Añadir tema** conserva la lista actual y excluye duplicados; **Reemplazar lista** sustituye su contenido. Puedes editar el resultado.
2. **Participantes y avatares** (Torneo): registra de 2 a 128 nombres, uno por línea, o indica una cantidad y pulsa **Generar lista**. Personaliza los avatares. El resumen calcula el máximo de citas necesario, incluidos los posibles desempates.
3. **Presentación y arena:** al inicio del torneo, todos los duelos iniciales se forman simultáneamente en una cuadrícula. Cada participante aparece una sola vez y todos los duelos se fijan al mismo tiempo. El sorteo se reproduce **una sola vez por torneo**; semifinales, final y demás fases conservan el cuadro original y nunca vuelven a sortearse. Después se anuncia individualmente cada VS con sus nombres y avatares durante **seis segundos** antes de abrir la arena. La cuadrícula inicial permanece cinco segundos una vez fijada; si tiene más de ocho duelos, permite revisarlos con desplazamiento y entrar manualmente. Puedes saltar las presentaciones. Con Enter controlas las citas y el avance entre duelos.

Clásico pasa del primer paso directamente a la arena. No requiere registrar participantes y permite elegir la cantidad de citas.

## Torneo

Cada enfrentamiento entrega un punto por referencia correctamente leída. El moderador selecciona a quien ganó el punto y lo confirma. No se puede avanzar sin registrar ese resultado.

- **Dos aciertos consecutivos:** victoria automática, tanto en duelos de dos como en duelos de tres. Si los dos primeros puntos son de la misma persona, no se revela la tercera cita.
- **Sin racha en las dos primeras:** se juega una tercera cita. Si alguien suma dos puntos, avanza por puntuación. Así, A–B–A también termina con victoria de A, al tercer punto.
- **Empate triple 1–1–1:** se activa automáticamente una presentación de **Muerte súbita**, seguida de una cuarta referencia nueva. Quien gane ese punto avanza. El desempate no se decide mediante una elección arbitraria de ganador.
- **Cantidades impares:** una de las confrontaciones de esa fase contiene tres personas; avanza una. No hay pases automáticos. La regla vuelve a aplicarse a los ganadores, incluida la final si es triple.

El cuadro muestra los puntos, eliminados, ganadores y el motivo de cada victoria. Las fases mantienen el orden sorteado al iniciar; las presentaciones posteriores no vuelven a sortear a los rivales.

## Podio: primero, segundo y tercero

El podio se decide jugando; no se ordena a los eliminados por puntos de duelos diferentes.

- **Final de dos personas:** el ganador ocupa el primer lugar y el otro finalista, el segundo. Antes de la final se juega un duelo por el tercero entre los aspirantes al bronce procedentes de las semifinales. Si una semifinal fue triple, sus dos eliminados participan y el duelo por el bronce es de tres.
- **Final triple:** el ganador asegura el primer lugar. Los otros dos finalistas disputan un duelo adicional: su ganador ocupa el segundo lugar y el otro, el tercero. Esto también resuelve un torneo de solo tres participantes.
- **Solo dos participantes:** se entregan primero y segundo; no se inventa un tercer lugar.

Los duelos de clasificación conservan las tres citas máximas, victoria con dos aciertos seguidos y muerte súbita al empatar 1–1–1. Se incluyen en la reserva de referencias y nunca repiten citas ya reveladas. El cuadro muestra los duelos de clasificación y el progreso los cuenta.

Al resolver todos los lugares aparece una ceremonia animada: primero bronce, después plata y por último oro, con nombres, avatares y confeti. La celebración permanece hasta pulsar **Ver resultados**. La clasificación queda en la arena y **Repetir celebración** reproduce la animación. Funciona también en pantalla ampliada; con movimiento reducido se muestra el podio estático, sin confeti ni esperas.

## Citas y reservas

Se baraja una sola lista de citas únicas y se consumen en orden, sin reposición, incluida la muerte súbita. No se asignan tres citas fijas a cada duelo: si uno termina antes, las siguientes siguen disponibles para los duelos posteriores.

Se necesitan hasta tres referencias por enfrentamiento de dos y hasta cuatro por duelo triple. El juego comprueba que el banco alcance para el caso más largo antes de iniciar. Las citas sobrantes aparecen como **Sin usar** al terminar.

| Personas | Enfrentamientos | Máximo de citas, con desempates |
| --- | --- | --- |
| 2 | 1 | 3 |
| 3 | 2 (final triple + plata) | 7 |
| 5 | 4 (incluye bronce triple) | 14 |
| 6 | 5 (incluye plata) | 16 |
| 7 | 5 (incluye plata) | 17 |
| 8 | 8 (incluye bronce) | 24 |

Los señuelos de la animación no consumen citas ni se guardan en el historial. Ahora recorren cinco idiomas: griego koiné, arameo en escritura siríaca, hebreo, latín y español. Se muestran **solo nombres de libros**, sin capítulos ni números de versículos; no son traducciones del texto bíblico. El libro de la referencia real se excluye en todos los idiomas. El hebreo y el arameo conservan su dirección de lectura y la referencia definitiva vuelve siempre al español. Con movimiento reducido se presenta un señuelo estático. La aplicación muestra referencias, no el texto bíblico. Comprueba la existencia del libro, capítulo y versículos contra el catálogo local de **Reina-Valera 1909 (66 libros, 1189 capítulos, 31 102 versículos)**. Unifica nombres, acentos y abreviaturas comunes: `Jn`, `Jn.` y `Juan` corresponden al mismo libro. Los rangos y listas del mismo capítulo se tratan como una referencia y un punto. Si una entrada comparte cualquier versículo con otra aceptada, se excluye la entrada completa para impedir repeticiones; el detalle lo explica. La numeración de otras ediciones o los libros de otros cánones no se validan con este catálogo.

## Importar CSV o TXT

En el paso de citas, pulsa **Cargar CSV o TXT**. El archivo se lee y valida localmente; no se envía a ningún servidor. Se admiten archivos de hasta 2 MB y 10 000 entradas, UTF-8 (con o sin BOM), UTF-16 con BOM y archivos de Windows-1252.

Puedes añadir a la lista existente o reemplazarla. Antes de aplicar se muestra cuántas citas válidas se cargarán, los duplicados dentro del archivo y frente a la lista actual, y las entradas inválidas con el motivo. Las inválidas y duplicadas no se incorporan. Si el archivo no tiene entradas válidas nuevas, no permite aplicarlo; una estructura CSV con comillas incompletas produce un error y conserva la lista.

Formatos CSV aceptados:

```csv
libro,capitulo,versiculo
Juan,3,16
Salmos,23,1
1 Pedro,5,7
Juan,3,"17,19"
```

También admite referencias completas separadas por comas o líneas; una cabecera `cita` o `referencia` es opcional. Si una referencia contiene comas, debe ir entre comillas en CSV:

```csv
cita
Juan 3:16,Salmos 23:1
"Juan 3:17,19"
```

TXT acepta una referencia por línea o referencias separadas por comas. En TXT una lista de versículos como `Juan 3:16,18` en una línea conserva su sentido bíblico. El botón **Descargar CSV de ejemplo** proporciona una plantilla editable.

El catálogo local se generó a partir de los archivos USX de dominio público de [Reina-Valera 1909, BibleAquifer](https://github.com/BibleAquifer/ReinaValera1909), edición identificada también en [eBible.org](https://ebible.org/Bible/details.php?id=spaRV1909). Solo se incluyen conteos, nombres y abreviaturas, sin texto de versículos. `scripts/build-bible-catalog.py` regenera el catálogo verificando los hashes de los archivos fuente; el resultado conserva el identificador del árbol fuente. La aplicación no necesita conectarse a una API bíblica.

## Avatares

Puedes elegir entre **49 opciones** (iniciales, animales, naturaleza, emblemas y personajes) y **16 colores**, filtrar por categoría o generar un avatar aleatorio, o subir una imagen PNG, JPG o WebP de hasta 5 MB y 25 megapíxeles. La imagen se encuadra al centro y se reduce a 192 × 192 píxeles. **Quitar foto** permite volver a símbolos. El editor tiene vista previa, Guardar y Cancelar.

Los avatares aparecen en las presentaciones, el marcador del duelo, los botones de puntos, el cuadro de duelos y la pantalla del campeón. Las imágenes se procesan localmente; no se envían a un servidor.

## Datos y controles

- Configuración conserva citas, nombres, avatares y tema en el navegador. La configuración anterior se lee para mantener compatibilidad al cambiar la firma a Bezrael.
- El avance de una partida no se guarda. Al recargar se vuelve al primer paso y se pierde el avance.
- **Configuración / Volver a configurar** pide confirmar antes de descartar una partida en curso; conserva los datos de preparación.
- **Expandir pantalla**, en la cabecera de la arena, muestra solo el marcador del duelo y la arena con sus controles. Oculta navegación, historial, estadísticas, pie y cuadro del torneo. **Salir de pantalla ampliada** restaura la vista normal. Si el navegador no admite pantalla completa, funciona como vista ampliada dentro de la ventana; Escape también permite salir. El número decorativo del fondo se eliminó en todos los tamaños de pantalla.
- Con movimiento reducido se omiten el cambio continuo de señuelos y el sorteo rápido de nombres; las presentaciones se muestran estáticas durante el mismo tiempo de lectura.
- Si no se puede guardar en el navegador, se muestra un aviso y se puede jugar en la sesión actual.

## Archivos

- `index.html`: configuración, arena, presentaciones y diálogos.
- `styles.css`: diseño adaptable, avatares, VS y muerte súbita.
- `bible-catalog.js`: libros y límites de capítulos/versículos RV1909.
- `references.js`: validación, abreviaturas, CSV/TXT y fusión sin duplicados.
- `citas-ejemplo.csv`: plantilla para importar desde la web.
- `engine.js`: citas, baraja, duelos, rachas, puntuación, muerte súbita y clasificación del podio.
- `themes.js`: colecciones temáticas de referencias.
- `decoys.js`: nombres de libros decorativos en cinco idiomas.
- `fonts/`: fuente siríaca Noto Sans Syriac y subconjunto DejaVu para griego/hebreo, con sus licencias. Las fuentes se sirven desde el propio proyecto, sin depender de fuentes externas.
- `avatars.js`: validación y procesamiento local de imágenes.
- `app.js`: controles, animaciones e interfaz.
- `tests/engine.test.cjs`: torneos de 2 a 128 personas, escenarios cortos y de longitud máxima, todas las secuencias legales de pares/triples, clasificación exacta del podio, reservas para los duelos de medallas y validación de los temas.

```sh
node --check app.js
node --check engine.js
node --check references.js
node --check themes.js
node --check decoys.js
node --check avatars.js
node tests/engine.test.cjs
node tests/references.test.cjs
```

## Fuentes de los nombres de libros

Los nombres breves de libros para los señuelos se contrastaron con:

- Griego: [SBL Greek New Testament, índice reproducido por Open English Bible](https://openenglishbible.org/oeb/dev/study/content/texts/grc_sblgnt/index.html).
- Arameo en escritura siríaca: los títulos de la tradición Peshitta en Syriaca.org: [Mateo](https://syriaca.org/work/72), [Marcos](https://syriaca.org/work/73), [Lucas](https://syriaca.org/work/74), [Juan](https://syriaca.org/work/75).
- Hebreo: [Tanakh en Sefaria](https://www.sefaria.org/texts/Tanakh).
- Latín: [índices de Nova Vulgata](https://www.vatican.va/archive/bible/nova_vulgata/documents/nova-vulgata_index_lt.html).

La fuente siríaca sin modificar proviene del repositorio oficial [Noto Fonts](https://github.com/notofonts/noto-fonts/tree/main/hinted/ttf/NotoSansSyriac). El archivo `Noto-LICENSE.txt` contiene su licencia SIL Open Font License. El subconjunto DejaVu conserva la licencia incluida en `DejaVu-LICENSE.txt`.
