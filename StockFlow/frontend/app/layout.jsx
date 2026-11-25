import "./globals.css";

export const metadata = { title: "StockFlow", description: "Simple inventory management" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
