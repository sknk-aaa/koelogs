type Props = { title: string };

export default function AppHeader({ title }: Props) {
  return (
    <header style={styles.header}>
      <div style={styles.title}>{title}</div>
    </header>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    width: "100%",
    position: "sticky",
    top: 0,
    zIndex: 50,
    height: 56,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(180deg, #ff6a6f 0%, #ff5b63 100%)",
    color: "#fff",
    boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
  },
  title: {
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: 0.5,
  },
};