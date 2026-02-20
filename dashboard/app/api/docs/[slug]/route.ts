import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { docsList } from "../route";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Validate slug against whitelist to prevent path traversal
  const docMeta = docsList.find((d) => d.slug === slug);
  if (!docMeta) {
    return NextResponse.json({ error: "Doc not found" }, { status: 404 });
  }

  try {
    // Resolve the docs directory relative to the project root (two levels up from /dashboard)
    const docsDir = path.resolve(process.cwd(), "..", "docs");
    const filePath = path.join(docsDir, `${slug}.md`);

    const content = await readFile(filePath, "utf-8");

    return new NextResponse(content, {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  } catch {
    return NextResponse.json(
      { error: "Could not read documentation file" },
      { status: 500 }
    );
  }
}
