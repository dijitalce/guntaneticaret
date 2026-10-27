import type { Metadata } from "next";
import { BlogListing, blogListMetadata } from "../../../../src/blog-listing";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  return blogListMetadata({ kind: "tag", slug }, await searchParams);
}

export default async function BlogTagPage({ params, searchParams }: Props) {
  const { slug } = await params;
  return <BlogListing list={{ kind: "tag", slug }} sp={await searchParams} />;
}
