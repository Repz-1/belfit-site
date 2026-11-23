// Icones du questionnaire coach (trait fin, 24 px), dessinees ici :
// l'app n'embarque pas de police d'icones.
const P = {
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5',
  target: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8zM12 13a1 1 0 100-2 1 1 0 000 2z',
  'ruler-measure': 'M3 7h18v10H3zM7 7v4M11 7v3M15 7v4M19 7v3',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 3',
  trophy: 'M8 4h8v5a4 4 0 01-8 0zM8 6H5a3 3 0 003 4M16 6h3a3 3 0 01-3 4M12 13v4M9 20h6M10 17h4',
  barbell: 'M2 12h2M20 12h2M5 8v8M8 6v12M16 6v12M19 8v8M8 12h8',
  salad: 'M4 11h16a8 8 0 01-16 0zM8 11a4 4 0 017-2.6M12 11a3 3 0 015-2',
  cup: 'M5 8h12v5a6 6 0 01-12 0zM17 9h1.5a2.5 2.5 0 010 5H17M8 3v2M11 3v2M14 3v2',
  puzzle: 'M4 7h4a2 2 0 114 0h4v4a2 2 0 110 4v4h-4a2 2 0 10-4 0H4v-4a2 2 0 100-4z',
  'heart-rate-monitor': 'M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10zM6 12h3l1.5-2 2 4 1.5-2h4',
  moon: 'M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z',
  sparkles: 'M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8zM18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z',
  flame: 'M12 21c-3.9 0-7-2.7-7-6.5 0-3 2-5.2 3.5-6.8.3 1.8 1.2 3 2.5 3.8C11 8 12 5 14.5 3c.2 3 1.5 4.6 3 6.4 1 1.3 1.5 2.9 1.5 4.6C19 18 15.9 21 12 21z',
  'arrows-exchange': 'M7 10h14l-4-4M17 14H3l4 4',
  bolt: 'M13 3L5 14h6l-1 7 8-11h-6z',
  'gender-female': 'M12 14a5 5 0 100-10 5 5 0 000 10zM12 14v7M9 18h6',
  'gender-male': 'M10 20a6 6 0 100-12 6 6 0 000 12zM14.5 9.5L20 4M15 4h5v5',
  'alert-circle': 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 8v5M12 16h.01',
  'circle-check': 'M12 21a9 9 0 100-18 9 9 0 000 18zM8.5 12l2.5 2.5 4.5-5',
  scale: 'M5 20h14l-1.5-12h-11zM9 8a3 3 0 016 0',
  route: 'M6 19a2 2 0 100-4 2 2 0 000 4zM18 9a2 2 0 100-4 2 2 0 000 4zM6 15V9a3 3 0 013-3h7M18 9v6a3 3 0 01-3 3H8',
  'cloud-check': 'M7 18a4.5 4.5 0 01-.6-9A6 6 0 0118 9.5a4 4 0 01-1 8.5zM9.5 13l2 2 3.5-3.5',
  'shield-check': 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6zM9 12l2 2 4-4',
  check: 'M5 12l5 5 9-10',
  pencil: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  package: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5',
  'tools-kitchen': 'M5 3v7a2 2 0 002 2h1a2 2 0 002-2V3M7.5 3v18M17 3c-1.7 0-3 2-3 5s1.3 4 3 4v9',
  'list-check': 'M4 6l1.5 1.5L8 5M4 12l1.5 1.5L8 11M4 18l1.5 1.5L8 17M11 6h9M11 12h9M11 18h9',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  'chevron-right': 'M9 6l6 6-6 6',
  'chevron-up': 'M6 15l6-6 6 6',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4',
  sun: 'M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 100 8 4 4 0 000-8z',
  apple: 'M12 7.5c-1-1.8-3-2.7-5-1.9-3 1.2-3 5.2-1.8 8.2 1 2.7 2.8 5.2 4.8 5.2.9 0 1.4-.5 2-.5s1.1.5 2 .5c2 0 3.8-2.5 4.8-5.2 1.2-3 1.2-7-1.8-8.2-2-.8-4 .1-5 1.9zM12 7.5c0-2 1-3.5 3-4.5',
  'chevron-down': 'M6 9l6 6 6-6',
  info: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 11v5M12 8h.01',
};
export function Icone({ nom, taille = 22 }) {
  const d = P[nom] || P.user;
  return (
    <svg viewBox="0 0 24 24" width={taille} height={taille} fill="none" stroke="currentColor"
      stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={d} /></svg>
  );
}
