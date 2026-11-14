/* =========================================================
   RESEÑAS DE GOOGLE — editar solo este archivo
   - rating y total: copiarlos del perfil de Google (se muestran en el hero y en la sección Reseñas).
   - items: 3 o 4 reseñas reales, copiadas tal cual de Google.
     Las reseñas con "texto" vacío no se muestran; si no hay ninguna, se ve solo el link a Google.
   ========================================================= */
window.FIRVET_RESENAS = {
  rating: '5.0',
  total: 43, // TODO CONTENIDO: el pedido decía 36; el 13/11/2026 Google mostraba 43. Confirmar.
  // Perfil de Google de FirVet (abre la ficha con las reseñas)
  url: 'https://www.google.com/maps?cid=15733491255711557415',
  // Copiadas textualmente de Google (capturas del 14/11/2026). "fecha" queda vacía a propósito:
  // Google solo muestra fechas relativas ("hace 5 meses"), que con el tiempo quedarían mal.
  items: [
    { autor: 'Mariana O.', estrellas: 5, fecha: '',
      texto: 'Excelente atención, los chicos son muy amables, Rocío siempre atenta a nuestras consultas y lo más importante al momento de llegar con una urgencia: CALIDAD HUMANA, te atienden con una calidez y tratan a tu mascota como si fuere de ellos. La recomiendo una y mil veces.' },
    { autor: 'Nicolas C.', estrellas: 5, fecha: '',
      texto: 'Excelente la atención de la Doc Rocio. Se nota el amor y la pasión con la que atiende a sus pacientitos. Sansa ama ir, porque la atienden como una reina. Se notan los avances en el tratamiento después de cada sesión! Súper recomendable' },
    // TODO CONTENIDO: en la captura esta reseña aparece cortada ("..."); si es más larga, pegar el texto completo.
    { autor: 'Ivan M.', estrellas: 5, fecha: '',
      texto: 'Excelente atención a mi perrito! 🐶' },
  ],
};
