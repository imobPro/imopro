import { readDoc } from "../_lib/read-doc";
import { MarkdownDoc } from "@/components/marketing/markdown-doc";

export const metadata = {
  title: "Política de Privacidade — ImobPro",
};

export default async function PrivacidadePage() {
  const content = await readDoc("privacidade.md");
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 md:px-6 md:py-12">
      <MarkdownDoc content={content} />
    </div>
  );
}
