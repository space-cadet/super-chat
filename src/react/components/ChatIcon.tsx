import type { CSSProperties } from "react";

// Host-neutral replacement for the Obsidian icon wrapper used by copied UI.
const paths: Record<string, string> = {
  brain:
    "M12 18V5a3 3 0 0 0-5-2 4 4 0 0 0-4 6 4 4 0 0 0 1 7 4 4 0 0 0 8 3m0-14a3 3 0 0 1 5-2 4 4 0 0 1 4 6 4 4 0 0 1-1 7 4 4 0 0 1-8 3M7 8l3 2m7-2-3 2",
  x: "M18 6 6 18M6 6l12 12",
  search: "m21 21-4.35-4.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0",
  "message-square":
    "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z",
  "refresh-cw":
    "M20 7v5h-5M4 17v-5h5M6.1 6.1a8 8 0 0 1 13.4 3M4.5 14.9a8 8 0 0 0 13.4 3",
  tag: "M20 13 13 20a2 2 0 0 1-3 0L2 12V2h10l8 8a2 2 0 0 1 0 3ZM7 7h.01",
  check: "m5 12 4 4L19 6",
  plus: "M12 5v14M5 12h14",
  copy: "M9 9h12v12H9zM5 15H3V3h12v2",
  upload: "M21 15v6H3v-6M12 15V3m-5 5 5-5 5 5",
  download: "M21 15v6H3v-6M12 3v12m-5-5 5 5 5-5",
  pencil: "m16 3 5 5-13 13H3v-5Z",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7",
  "trash-2": "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7",
  "chevron-down": "m6 9 6 6 6-6",
  "external-link": "M15 3h6v6m0-6L10 14M9 3H3v18h18v-6",
  "folder-open": "M3 7V3h6l3 4h9v14H3l3-10h17l-3 10",
};

export function ChatIcon({
  icon,
  size = 16,
  style,
}: {
  icon: string;
  size?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      className="chat-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      <path d={paths[icon] ?? paths["message-square"]} />
    </svg>
  );
}

export default ChatIcon;
