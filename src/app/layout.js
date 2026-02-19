import './globals.css';

export const metadata = {
  title: 'Greenland Products',
  description: 'Especialistas en mobiliario funcional para espacios versátiles.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
