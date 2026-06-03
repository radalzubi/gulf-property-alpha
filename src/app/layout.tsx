import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Gulf Property Alpha — Dubai & Abu Dhabi Investment Terminal",
  description:
    "Institutional real-estate deal-finding & portfolio-management terminal for Dubai and Abu Dhabi. Data-driven, provenance-first, decision-oriented.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
