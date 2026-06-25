/* ============================================================
   ICONS — lucide-style, stroke = currentColor (themeable)
   ============================================================ */

function Svg({ size = 18, children, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

// Brandmark Proxoteca: cerchio gold gradient + burst bianco. Inline (no fetch, base-safe);
// stessa grafica di public/favicon.svg.
export function Logo({ size = 34, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false" {...props}>
      <defs>
        <linearGradient id="proxotecaGoldHeader" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e6a85a" />
          <stop offset="1" stopColor="#d4923f" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="32" fill="url(#proxotecaGoldHeader)" />
      <g transform="translate(9,9) scale(0.17228)" fill="#FFFFFF" stroke="none">
        <g transform="translate(0,267) scale(0.1,-0.1)">
          <path d="M1496 2428 c-12 -17 -16 -48 -16 -123 0 -55 -7 -136 -15 -180 -35 -202 -32 -291 11 -282 20 3 25 0 30 -22 13 -63 55 -96 70 -57 3 8 11 13 18 10 36 -14 39 19 32 292 -7 291 -8 298 -41 291 -19 -3 -24 1 -28 30 -10 61 -35 78 -61 41z m51 -270 c-2 -24 -4 -5 -4 42 0 47 2 66 4 43 2 -24 2 -62 0 -85z" />
          <path d="M1017 2393 c-5 -8 -12 -250 -12 -413 0 -67 4 -92 18 -114 11 -15 23 -55 27 -89 17 -115 64 -114 75 1 10 97 24 190 37 244 13 51 1 81 -31 76 -14 -3 -17 15 -21 134 -4 76 -10 142 -15 147 -14 13 -72 24 -78 14z" />
          <path d="M1910 1675 c-7 -9 -29 -15 -51 -15 -58 0 -91 -16 -88 -43 2 -12 0 -28 -4 -34 -24 -39 35 -76 100 -63 78 15 334 40 393 38 42 -1 59 -6 72 -22 15 -19 18 -20 33 -5 16 16 16 19 0 53 -10 20 -15 39 -12 43 14 13 -16 43 -50 49 -20 4 -99 2 -175 -5 -123 -11 -140 -10 -154 3 -20 20 -48 20 -64 1z" />
          <path d="M620 1595 c-6 -8 -9 -18 -6 -23 3 -6 -20 -13 -52 -17 -70 -8 -124 -22 -177 -45 -22 -9 -52 -22 -67 -28 -38 -15 -38 -49 -1 -58 16 -4 33 -10 38 -14 6 -4 37 -3 70 1 33 5 112 13 175 19 140 11 186 20 319 62 112 35 120 43 101 88 -15 35 -27 36 -145 15 -101 -18 -173 -18 -205 0 -32 18 -35 18 -50 0z" />
          <path d="M2135 1203 c-44 -14 -114 -32 -155 -40 -41 -7 -97 -20 -125 -28 -27 -8 -66 -18 -85 -23 -38 -9 -56 -56 -29 -73 20 -12 172 2 190 17 9 8 39 14 70 14 30 0 85 7 124 15 89 19 104 19 126 -1 17 -15 20 -15 44 0 30 20 33 56 5 63 -24 6 -24 7 -7 34 10 17 9 22 -7 35 -26 19 -56 16 -151 -13z" />
          <path d="M845 1183 c-16 -2 -53 -11 -82 -19 -52 -14 -173 -39 -268 -54 -29 -4 -55 -4 -62 2 -16 13 -103 -26 -103 -46 0 -21 30 -35 63 -29 26 5 27 4 17 -21 -8 -22 -6 -28 13 -40 59 -38 162 -24 128 17 -15 19 36 33 186 52 181 23 257 36 271 47 22 18 14 47 -15 54 -16 4 -34 16 -41 26 -13 18 -37 20 -107 11z" />
          <path d="M1597 994 c-4 -4 -7 -20 -7 -36 0 -40 -18 -71 -36 -64 -28 11 -53 -14 -69 -66 -31 -105 -13 -214 30 -178 13 11 15 7 15 -30 0 -30 -6 -47 -20 -58 -19 -16 -19 -20 -5 -57 8 -22 15 -76 16 -120 1 -102 9 -129 36 -133 22 -3 60 49 49 67 -3 4 -1 36 5 72 5 35 14 170 20 299 5 129 10 251 12 270 2 34 -25 54 -46 34z" />
          <path d="M1068 870 c-46 -51 -63 -135 -61 -300 2 -102 5 -117 23 -132 17 -14 20 -28 20 -106 0 -64 4 -93 14 -101 18 -15 46 -3 46 19 0 11 5 22 10 25 6 3 10 0 10 -8 0 -25 24 -38 42 -24 14 11 15 34 6 197 -5 102 -7 241 -4 309 5 114 4 124 -14 128 -10 3 -21 11 -24 19 -9 24 -29 16 -68 -26z" />
        </g>
      </g>
    </svg>
  );
}

export function IconImage(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </Svg>
  );
}

export function IconFile(props) {
  return (
    <Svg {...props}>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M12 18v-6" />
      <path d="m9 15 3 3 3-3" />
    </Svg>
  );
}

export function IconTrash(props) {
  return (
    <Svg {...props}>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </Svg>
  );
}

export function IconAlert(props) {
  return (
    <Svg {...props}>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" x2="12" y1="9" y2="13" />
      <line x1="12" x2="12.01" y1="17" y2="17" />
    </Svg>
  );
}

export function IconLayout(props) {
  return (
    <Svg {...props}>
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </Svg>
  );
}

export function IconX(props) {
  return (
    <Svg {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </Svg>
  );
}

export function IconPlus(props) {
  return (
    <Svg {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Svg>
  );
}

export function IconDownload(props) {
  return (
    <Svg {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </Svg>
  );
}

// Salva lista: glifo "elenco" — distinto dalle frecce-giù di Download/Export (evita
// la collisione "due download" adiacenti nella barra mobile).
export function IconList(props) {
  return (
    <Svg {...props}>
      <line x1="8" x2="21" y1="6" y2="6" />
      <line x1="8" x2="21" y1="12" y2="12" />
      <line x1="8" x2="21" y1="18" y2="18" />
      <line x1="3" x2="3.01" y1="6" y2="6" />
      <line x1="3" x2="3.01" y1="12" y2="12" />
      <line x1="3" x2="3.01" y1="18" y2="18" />
    </Svg>
  );
}

export function IconCopy(props) {
  return (
    <Svg {...props}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Svg>
  );
}

// Trim + abbondanza: cornice esterna (cella) e interna (taglio).
export function IconFrame(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <rect x="7" y="7" width="10" height="10" rx="1" />
    </Svg>
  );
}
