// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useApiQuery } from "@/lib/use-api-query";
import { usePagedQuery } from "@/lib/use-paged-query";

const jsonResponse = (data: unknown, ok = true) => ({
  ok,
  json: async () => ({ success: ok, data, error: ok ? null : "Erro simulado" }),
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Feature: useApiQuery", () => {
  it("Dado fetch bem-sucedido, Quando monta, Então preenche data", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ id: "1" })));

    const { result } = renderHook(() => useApiQuery<{ id: string }>("/api/x"));

    await waitFor(() => expect(result.current.data).toEqual({ id: "1" }));
    expect(result.current.error).toBeNull();
  });

  it("Dado fetch com erro, Quando monta, Então preenche error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(null, false)));

    const { result } = renderHook(() => useApiQuery<unknown>("/api/x"));

    await waitFor(() => expect(result.current.error).toBe("Erro simulado"));
    expect(result.current.data).toBeNull();
  });

  it("Dado refresh(), Quando chamado, Então refaz o fetch", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ id: "1" }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useApiQuery<{ id: string }>("/api/x"));
    await waitFor(() => expect(result.current.data).toEqual({ id: "1" }));

    act(() => result.current.refresh());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("Dado troca de url, Quando muda, Então refaz o fetch para a nova url", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ id: "1" }));
    vi.stubGlobal("fetch", fetchMock);

    const { result, rerender } = renderHook(({ url }) => useApiQuery<{ id: string }>(url), {
      initialProps: { url: "/api/x" },
    });
    await waitFor(() => expect(result.current.data).toEqual({ id: "1" }));

    rerender({ url: "/api/y" });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenLastCalledWith("/api/y", expect.anything());
  });
});

describe("Feature: usePagedQuery", () => {
  it("Dado primeira página menor que pageSize, Quando monta, Então hasMore é false", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse([{ id: "1" }])));

    const { result } = renderHook(() => usePagedQuery<{ id: string }>("/api/x", 10));

    await waitFor(() => expect(result.current.items).toEqual([{ id: "1" }]));
    expect(result.current.hasMore).toBe(false);
  });

  it("Dado primeira página cheia, Quando monta, Então hasMore é true", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse([{ id: "1" }, { id: "2" }])),
    );

    const { result } = renderHook(() => usePagedQuery<{ id: string }>("/api/x", 2));

    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(result.current.hasMore).toBe(true);
  });

  it("Dado loadMore(), Quando chamado, Então anexa a página seguinte", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("offset=0")) return jsonResponse([{ id: "1" }, { id: "2" }]);
      return jsonResponse([{ id: "3" }]);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => usePagedQuery<{ id: string }>("/api/x", 2));
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(result.current.hasMore).toBe(true);

    act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.items).toHaveLength(3));
    expect(result.current.hasMore).toBe(false);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("offset=2"),
      expect.anything(),
    );
  });

  it("Dado erro no loadMore(), Quando chamado, Então preenche error mantendo itens atuais", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("offset=0")) return jsonResponse([{ id: "1" }]);
      return jsonResponse(null, false);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => usePagedQuery<{ id: string }>("/api/x", 1));
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.error).toBe("Erro simulado"));
    expect(result.current.items).toHaveLength(1);
  });

  it("Dado erro na primeira página, Quando monta, Então preenche error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse(null, false)));

    const { result } = renderHook(() => usePagedQuery<unknown>("/api/x", 10));

    await waitFor(() => expect(result.current.error).toBe("Erro simulado"));
  });

  it("Dado refresh(), Quando chamado, Então refaz a busca da primeira página", async () => {
    const fetchMock = vi.fn(async () => jsonResponse([{ id: "1" }]));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => usePagedQuery<{ id: string }>("/api/x", 10));
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    act(() => result.current.refresh());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("Dado baseUrl com query string, Quando monta, Então usa separador &", async () => {
    const fetchMock = vi.fn(async () => jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => usePagedQuery<unknown>("/api/x?status=done", 10));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/x?status=done&limit=10&offset=0",
        expect.anything(),
      ),
    );
  });
});
