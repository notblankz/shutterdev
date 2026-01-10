import "./globals.css";


export const metadata = {
  title: "Shutterdev",
  description: "Self-hosted photo gallery",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#1A1A1D]">{children}</body>
    </html>
  );
}
