import './globals.css';

export const metadata = {
  title: 'ลงเวลาทำงาน',
  description: 'ระบบลงเวลาเข้า-เลิกงานสำหรับพนักงาน',
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
