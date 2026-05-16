import { readDoc } from "../_lib/read-doc";
import { MarkdownDoc } from "@/components/marketing/markdown-doc";

export const metadata = {
  title: "Termos de Uso — ImobPro",
};

export default async function TermosPage() {
  const content = await readDoc("termos.md");
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6 md:py-12">
      <MarkdownDoc content={content} />
    </div>
  );
}
