import { redirect } from "next/navigation";

// Fluxo de navegação inicial:
// - Sem sessão: middleware permite / (público). Cai aqui → /precos (landing).
// - Com sessão: middleware redireciona / → /inbox antes de chegar aqui.
export default function Home() {
  redirect("/precos");
}
