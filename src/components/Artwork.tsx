export function Artwork() {
  return (
    <svg
      className="travel-art"
      viewBox="0 0 470 250"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <pattern id="tile" width="17" height="17" patternUnits="userSpaceOnUse">
          <path
            d="M0 0Q8.5 17 17 0M0 17Q8.5 0 17 17"
            stroke="#e7edce"
            strokeWidth="1"
            opacity=".55"
          />
        </pattern>
        <clipPath id="arch">
          <path d="M235 35a89 89 0 0 1 89 89v126H146V124a89 89 0 0 1 89-89Z" />
        </clipPath>
      </defs>
      <circle
        cx="409"
        cy="47"
        r="28"
        stroke="#254d40"
        strokeWidth="1.3"
        strokeDasharray="2 4"
        opacity=".4"
      />
      <path
        d="m398 47 8 8 14-17M363 93l-33 17M353 78l-23 15"
        stroke="#254d40"
        strokeWidth="1.5"
      />
      <path
        d="M235 24c-56 0-101 45-101 101v125h202V125c0-56-45-101-101-101Z"
        fill="#c6d2bc"
      />
      <g clipPath="url(#arch)">
        <path d="M146 35h178v215H146Z" fill="#e9e9d4" />
        <circle cx="268" cy="88" r="24" fill="#e4b864" />
        <path d="m124 169 70-35 44 24 32-20 79 43v75H124Z" fill="#a2b7a5" />
        <path d="M141 191h186v59H141Z" fill="#6d9385" />
        <path
          d="M133 220q42-17 83-3t111-2M137 234q35-14 80-2t113 0"
          stroke="#c9dbcd"
          strokeWidth="2"
        />
        <path d="M163 139h39v70h-39Z" fill="#e9bd87" />
        <path d="m157 139 25-19 27 19Z" fill="#a66f54" />
        <path d="M177 179h11v30h-11Z" fill="#526c5d" />
        <path d="M169 148h7v12h-7ZM187 148h7v12h-7Z" fill="#e9e9d4" />
        <path d="M214 168h44v52h-44Z" fill="#ede4c9" />
        <path d="m210 168 27-14 25 14Z" fill="#bd805c" />
        <path
          d="M223 179h8v12h-8ZM241 179h8v12h-8ZM230 202h12v18h-12Z"
          fill="#729284"
        />
        <path d="M273 135h21v80h-21Z" fill="#f5e6bd" />
        <path
          d="M269 135h29l-4-7h-21ZM277 128v-16h13v16M282 112v-11"
          stroke="#a37c52"
          strokeWidth="2"
        />
        <path d="M280 146h7v12h-7ZM280 174h7v12h-7Z" fill="#729284" />
      </g>
      <path d="M72 250v-41q0-20 20-20h55v61Z" fill="#497761" />
      <path d="M72 209q0-20 20-20h55v61H72Z" fill="url(#tile)" />
      <path
        d="M91 190c-4-32-26-25-24-43 18-1 23 16 24 25-4-33 14-43 23-33 5 12-8 24-18 42 11-22 30-27 34-13 1 16-20 15-35 22"
        fill="#254d40"
      />
      <path d="M335 250v-35h51v35" fill="#d8a06d" />
      <path d="M329 215h64l-4-9h-55Z" fill="#bc805b" />
      <path
        d="M348 204q-4-14 7-28M358 205q10-18 21-18M354 187q-17-19-17-4 2 7 14 10M358 180q-9-19 1-17 8 6 0 20M371 191q21-8 13 2-4 5-17 5"
        stroke="#497761"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path d="M40 249h379" stroke="#254d40" strokeWidth="1.5" />
      <path
        d="m110 78 15-4 6 13-15 3ZM93 108l4-11 10 5-3 11"
        stroke="#a7b8a0"
        strokeWidth="1.5"
      />
      <path
        d="m202 18 2-8m29 2 1-7m28 14 4-7"
        stroke="#b4be9c"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M368 137q18-9 21 2m-1-1q11-13 20-7"
        stroke="#254d40"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo() {
  return (
    <svg
      width="34"
      height="37"
      viewBox="0 0 34 37"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 34V17a14 14 0 0 1 28 0v17M10 34V17a7 7 0 0 1 14 0v17"
        stroke="currentColor"
        strokeWidth="2.6"
      />
      <circle cx="17" cy="16" r="2.5" fill="currentColor" />
      <path d="M0 35h34" stroke="currentColor" strokeWidth="2.6" />
    </svg>
  );
}
