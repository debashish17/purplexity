export default function ErrorNotice({ message }: { message: string }) {
  return (
    <p role="alert" className="fade-in-up" style={{
      margin: "16px 0",
      color: "var(--destructive)",
      fontFamily: "'DM Sans', sans-serif",
      fontSize: "0.85rem",
      fontWeight: 300,
    }}>
      {message}
    </p>
  );
}
