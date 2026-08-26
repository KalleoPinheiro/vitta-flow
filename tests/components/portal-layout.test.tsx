// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import PortalLayout from "@/app/portal/layout";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

afterEach(() => {
  cleanup();
});

/**
 * SV3-03 (spec.md AC4): "o `<nav>` do `Header` SHALL continuar expondo os
 * mesmos itens de navegação, com os mesmos `href`, e o `<summary>` de colapso
 * SHALL ter nome acessível não vazio". `src/app/portal/layout.tsx` é o único
 * call site do `Header` no app inteiro (spec.md:58) e nunca — nem antes nem
 * depois da migração v3, ver `git show f14dec5:src/app/portal/layout.tsx` —
 * passou a prop `items`. Sem `items`, `Header` (node_modules/@still-void/ui/
 * dist/react/index.js:118: `items.length > 0 && ...`) não renderiza `<nav>`/
 * `<summary>`/`<details>` nenhum: o "conjunto de hrefs" pré-migração já era
 * vazio. Este arquivo trava esse estado real (zero nav) e protege o que de
 * fato existe no Header do portal — logo, subtítulo e ação de logout — que
 * antes não tinha nenhuma rede de segurança (validation.md Fix 3). Se um dia
 * `items` for passado para o `Header`, a asserção de ausência abaixo quebra de
 * propósito, forçando quem mexer a acrescentar a cobertura real de
 * hrefs/`<summary>` que o AC4 pede.
 */
describe("Feature: Header do portal (SV3-03)", () => {
  it("Dado o layout do portal, Quando renderizar, Então mantém marca, subtítulo e ação de logout sem regressão", () => {
    render(
      <PortalLayout>
        <p>Conteúdo da página</p>
      </PortalLayout>,
    );

    expect(screen.getByRole("link", { name: /VittaFlow/ })).toBeInTheDocument();
    expect(screen.getByText("Portal do paciente e do parceiro")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sair" })).toBeInTheDocument();
    expect(screen.getByText("Conteúdo da página")).toBeInTheDocument();
  });

  it("Dado nenhum item de navegação configurado (nunca houve, pré ou pós-migração), Então o Header não renderiza <nav>/<summary>/<details> algum", () => {
    render(
      <PortalLayout>
        <p>Conteúdo da página</p>
      </PortalLayout>,
    );

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(document.querySelector("summary")).toBeNull();
    expect(document.querySelector("details")).toBeNull();
  });
});
