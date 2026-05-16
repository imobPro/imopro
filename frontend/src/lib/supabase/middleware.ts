import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/cadastro",
  "/precos",
  "/privacidade",
  "/termos",
];

// Rotas públicas das quais o usuário logado é redirecionado pro painel.
// /privacidade e /termos ficam de fora — são neutras e podem ser lidas a qualquer momento.
const REDIRECT_WHEN_LOGGED_IN = ["/", "/login", "/cadastro", "/precos"];

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function shouldRedirectWhenLoggedIn(pathname: string) {
  return REDIRECT_WHEN_LOGGED_IN.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Chama getUser() imediatamente — supabase-ssr docs: "IMPORTANT: do not
  // run code between createServerClient and supabase.auth.getUser()".
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Sem sessão → manda pro login (exceto se já está numa rota pública)
  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Com sessão e tentando acessar /login, /cadastro ou /precos → manda pro inbox.
  // /privacidade e /termos ficam acessíveis logado ou não.
  if (user && shouldRedirectWhenLoggedIn(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/inbox";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
