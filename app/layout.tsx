import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const requestHost =
    forwardedHost?.split(",")[0]?.trim() ||
    requestHeaders.get("host") ||
    "localhost:3000";
  const forwardedProtocol = requestHeaders
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const protocol =
    forwardedProtocol === "http" || forwardedProtocol === "https"
      ? forwardedProtocol
      : requestHost.startsWith("localhost")
        ? "http"
        : "https";
  const metadataBase = new URL(`${protocol}://${requestHost}`);
  const socialImage = new URL("/og.png", metadataBase).toString();

  return {
    metadataBase,
    title: {
      default: "Aether One",
      template: "%s | Aether",
    },
    description:
      "정교한 티타늄 디자인과 몰입감 있는 디스플레이를 담은 Aether One.",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "Aether One Pro | 깊이를 넘어, 경험이 되다.",
      description:
        "티타늄의 정교함과 몰입감 있는 디스플레이를 담은 Aether One Pro.",
      type: "website",
      images: [
        {
          url: socialImage,
          width: 1200,
          height: 630,
          alt: "Aether One Pro 스마트폰",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Aether One Pro | 깊이를 넘어, 경험이 되다.",
      description:
        "티타늄의 정교함과 몰입감 있는 디스플레이를 담은 Aether One Pro.",
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={geist.variable}>{children}</body>
    </html>
  );
}
