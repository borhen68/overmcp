import type { Metadata } from "next";

type Props = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.overmcp.com";

  return {
    alternates: {
      canonical: `${baseUrl}/report/${encodeURIComponent(id)}`,
    },
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };
}

export default function ReportLayout({ children }: Readonly<Props>) {
  return children;
}
