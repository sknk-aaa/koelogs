type Props = {
  text: string;
  color: string; // HEX "#RRGGBB"
  title?: string;
  className?: string;
};

export default function ColoredTag({ text, color, title, className }: Props) {
  return (
    <span
      className={className}
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 24,
        padding: "0 10px",
        borderRadius: 999,
        background: color,
        border: "1px solid rgba(0,0,0,0.06)",
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}
