import { redirect } from "next/navigation";

// Fluxo de navegação inicial:
// - Sem sessão: o middleware redireciona / para /login antes de chegar aqui.
// - Com sessão: cai aqui e redireciona para /inbox (tela inicial do painel).
export default function Home() {
  redirect("/inbox");
}
