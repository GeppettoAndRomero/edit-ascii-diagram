import type { ToolContent } from './types';

// Español. Transcreación basada en el vocabulario técnico habitual en español, no
// traducción literal. Sin palabras publicitarias (fácil / rápido / perfecto…);
// la privacidad se explica de forma estructural, no como promesa. Español pan-regional
// (BRAND-OPERATING-MODEL / I18N-SEO-GUIDELINE).

export const es: ToolContent = {
  htmlLang: 'es',

  meta: {
    title: 'Edita un diagrama de cajas Unicode en una GUI | runlocally',
    description:
      'Pega un diagrama de cajas Unicode (┌┐└┘│─), edítalo con clics para seleccionar, arrastrar y editar texto directamente, y expórtalo de vuelta como texto limpio. Los caracteres de ancho completo en japonés/chino y los emoji se tratan correctamente como dos columnas de la cuadrícula, así que el diagrama pegado nunca se desalinea. Funciona enteramente en el navegador.',
    ogTitle: 'Edita un diagrama de cajas Unicode en una GUI',
    ogDescription:
      'Un editor de diagramas de cajas con una cuadrícula que cuenta correctamente las columnas de visualización — los caracteres de ancho completo y los emoji ocupan dos columnas, así que los diagramas importados quedan alineados. Funciona enteramente en tu navegador.',
  },

  hero: {
    h1: 'Editar un diagrama de cajas',
    tagline:
      'Pega un diagrama de cajas Unicode, edita las cajas con clics y arrastres (o con un formulario totalmente operable por teclado), y exporta texto limpio de vuelta.',
  },

  intro: {
    h2: 'Un editor de diagramas de cajas que trata bien los caracteres de ancho completo',
    paras: [
      'Esta herramienta lee un diagrama hecho de caracteres de dibujo de cajas Unicode (┌┐└┘│─├┤┬┴┼) — el tipo de cajas rectangulares anidadas que se usan en wireframes de interfaz y esquemas de arquitectura simples —, te deja seleccionar, mover, redimensionar y volver a escribir el texto de cada caja en una GUI, y escribe el resultado de vuelta como texto plano.',
      'Su modelo de cuadrícula direcciona cada celda por columna de visualización, no por unidad de código UTF-16. Un carácter japonés o chino de ancho completo, o un emoji (incluidas secuencias de varios puntos de código unidas con un joiner de ancho cero), ocupa correctamente dos columnas de la cuadrícula en lugar de una — así que al pegar un diagrama que mezcla ASCII con texto CJK o iconos de emoji, los bordes de las cajas se mantienen alineados en vez de desplazarse una o dos columnas después del primer carácter ancho.',
      'Solo entiende cajas rectangulares anidadas — no líneas ni flechas dibujadas a mano, círculos, ni otro arte ASCII general. Si necesitas una herramienta de dibujo genérica, esta no lo es; pero si necesitas reorganizar un wireframe de cajas y etiquetas pegado desde un documento de diseño o una transcripción de captura de pantalla, está pensada justamente para eso.',
    ],
  },

  privacy: {
    h2: 'Por qué tu diagrama nunca sale de tu dispositivo',
    lead: 'Aquí la privacidad es estructural, no una promesa. No hay paso de subida porque no hay servidor al que subir nada:',
    points: [
      'El análisis, la edición y el renderizado ocurren enteramente en tu navegador.',
      'La página se sirve como archivos estáticos y no hace ninguna solicitud que lleve el texto de tu diagrama.',
      'No hay ninguna función de enlace para compartir que codifique tu diagrama en una URL.',
      'El código fuente es abierto y cualquiera puede leerlo (MIT).',
      'Funciona sin conexión, algo que solo es posible porque nada sale del dispositivo.',
    ],
    note: 'Si quieres comprobarlo tú mismo, abre el panel de red de tu navegador mientras editas — ninguna solicitud lleva el texto de tu diagrama.',
    sourceLinkText: 'Lee el código fuente.',
  },

  howto: {
    h2: 'Cómo usarlo',
    steps: [
      {
        h3: 'Pega tu diagrama',
        p: 'Pega el texto del diagrama de cajas en el cuadro de texto, o haz clic en "Cargar ejemplo" para probarlo primero con un ejemplo pequeño.',
      },
      {
        h3: 'Selecciona y edita una caja',
        p: 'Haz clic en una caja del lienzo, o elígela de la lista de la derecha. Arrastra para moverla, arrastra su esquina inferior derecha para cambiar su tamaño, o edita su texto directamente en el formulario — todo esto también funciona desde el teclado mediante los campos numéricos y el área de texto.',
      },
      {
        h3: 'Añade o elimina cajas',
        p: 'Usa "Añadir caja" para dibujar una caja vacía nueva, o elimina la que esté seleccionada. Mover y redimensionar nunca evitan superponerse con otras cajas — las ediciones posteriores simplemente se dibujan encima de las anteriores, como en un lienzo de dibujo normal.',
      },
      {
        h3: 'Exporta el resultado',
        p: 'Copia el texto plano, descárgalo como archivo .txt, o usa "Copiar para IA" para obtener una instrucción de antes/después lista para pegar en un chat de IA (ver más abajo).',
      },
    ],
  },

  faqHeading: 'Preguntas frecuentes',
  faq: [
    {
      q: '¿Se sube mi diagrama a algún sitio?',
      a: 'No. El análisis, la edición y el renderizado ocurren enteramente en tu navegador. No hay componente de servidor ni función de enlace para compartir, así que el texto de tu diagrama no tiene ninguna vía para salir de tu dispositivo.',
    },
    {
      q: '¿Por qué importan aquí los caracteres de ancho completo y los emoji?',
      a: 'Un carácter japonés o chino, o la mayoría de los emoji, tienen visualmente el doble de ancho que una letra latina al renderizarse en una fuente monoespaciada — pero en el texto subyacente siguen siendo un solo carácter (o, en algunos emoji, una secuencia de varios puntos de código). Un analizador que recorre el texto unidad de código por unidad de código cuenta mal ese ancho, así que el borde de la caja después del carácter ancho queda una columna corto. Esta herramienta calcula el ancho de visualización real de cada carácter y le da dos columnas de la cuadrícula a un carácter de ancho doble, así que las columnas se mantienen alineadas sin importar el contenido del diagrama.',
    },
    {
      q: '¿Qué pasa con las líneas, flechas o círculos dibujados a mano?',
      a: 'Esta herramienta solo detecta y edita regiones rectangulares cerradas hechas con los caracteres de dibujo de cajas estándar (┌┐└┘│─├┤┬┴┼). Todo lo demás — una línea diagonal, una punta de flecha, un círculo, arte ASCII general — se trata como contenido de texto normal y se conserva tal cual, pero no es una "caja" seleccionable ni movible.',
    },
    {
      q: '¿Mover o redimensionar una caja evita que se superponga con otras?',
      a: 'No, deliberadamente no. Esto es un lienzo de cuadrícula sencillo: la caja que dibujes o muevas en último lugar simplemente sobrescribe las celdas donde caiga, igual que en una herramienta de dibujo básica. Si dos cajas terminan superpuestas, vuelve a dibujar o mueve una de ellas para arreglarlo.',
    },
    {
      q: 'Si no edito nada, ¿el texto exportado es idéntico byte a byte al que pegué?',
      a: 'No necesariamente byte a byte (por ejemplo, siempre se recorta el espacio en blanco al final de cada línea) — pero al volver a analizar el texto exportado se encuentran las mismas cajas, en las mismas posiciones, con el mismo texto, que en la versión que pegaste. La herramienta es un lienzo de cuadrícula completo, no un editor de parches que preserva líneas.',
    },
    {
      q: '¿Para qué sirve "Copiar para IA"?',
      a: 'Copia el texto del diagrama tal como estaba al pegarlo y el texto tal como está ahora, como dos bloques de texto etiquetados y delimitados, listos para pegar en un chat de IA como instrucción de cambio. Está pensado para un flujo de trabajo concreto: pegar un wireframe de interfaz (el diseño de una pantalla real, esbozado como cajas anidadas), editarlo aquí, y entregarle el antes/después a una IA como el cambio a aplicar.',
    },
    {
      q: '¿Puedo usarlo sin ratón?',
      a: 'Sí. Seleccionar una caja de la lista, y moverla, redimensionarla, cambiar su texto y eliminarla mediante los campos del formulario junto al lienzo, son todas operaciones totalmente operables por teclado. Arrastrar en el lienzo es una comodidad para el puntero añadida sobre esas mismas operaciones.',
    },
    {
      q: '¿Funciona sin conexión?',
      a: 'Sí. Es una PWA. Después de la primera visita queda en caché, así que funciona sin conexión de red. También puedes instalarla en tu pantalla de inicio.',
    },
  ],

  footer: {
    openSourceLabel: 'Código abierto (MIT)',
    partOf: 'parte de',
    brandTail: '— pequeñas herramientas que funcionan localmente en tu dispositivo.',
    colophon:
      'Creado y mantenido por Geppetto. Parte del código está escrito con asistencia de IA; toda revisión y decisión es responsabilidad del mantenedor.',
    securityText: 'Seguridad',
  },

  related: {
    h2: 'Herramientas relacionadas',
    blogLinkText: 'Leer las notas técnicas',
  },
};
