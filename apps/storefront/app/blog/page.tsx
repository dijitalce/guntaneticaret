import type { Metadata } from "next";
import { BlogListing, blogListMetadata } from "../../src/blog-listing";

type Props = { searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return blogListMetadata({ kind: "all" }, await searchParams);
}

export default async function BlogIndex({ searchParams }: Props) {
  return <BlogListing list={{ kind: "all" }} sp={await searchParams} />;
}
