import "./globals.css";

export const metadata = {
  title: "Post Sosmed Kemenkum DIY",
  description: "Alat internal posting sosial media Kanwil Kemenkum DIY",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
