import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeoLandingPage } from "@/components/SeoLandingPage";
import {
  getAllSeoLandingSlugs,
  getSeoLanding,
} from "@/lib/seo-landings";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllSeoLandingSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = getSeoLanding(slug);
  if (!page) return { title: "Not Found", robots: { index: false } };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.overmcp.com";
  const url = `${baseUrl}/${page.slug}`;

  return {
    title: { absolute: page.title },
    description: page.description,
    keywords: [page.keyword, "OverMCP", "website security", "vulnerability scanner"],
    alternates: { canonical: url },
    openGraph: {
      title: page.title,
      description: page.description,
      url,
      type: "website",
      siteName: "OverMCP",
      locale: "en_US",
      images: [`${baseUrl}/opengraph-image`],
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const page = getSeoLanding(slug);
  if (!page) notFound();
  return <SeoLandingPage page={page} />;
}
