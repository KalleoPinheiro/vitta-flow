import { afterEach, describe, expect, it, vi } from 'vitest';
import { NullEmailGateway } from '@/application/ports/email-gateway';

/**
 * AUTH-01: existe uma porta de e-mail transacional com implementação nula/dry-run,
 * usada quando não há credenciais — registra em log em vez de enviar.
 */
describe('Feature: Porta de e-mail transacional (gateway nulo)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('Dado gateway nulo, Quando ler enabled, Então é false (canal desativado)', () => {
    expect(new NullEmailGateway().enabled).toBe(false);
  });

  it('Dado gateway nulo, Quando send, Então resolve sem lançar', async () => {
    await expect(
      new NullEmailGateway().send({
        to: 'a@b.com',
        subject: 'Convite',
        text: 'link',
      }),
    ).resolves.toBeUndefined();
  });

  it('Dado gateway nulo, Quando send, Então registra destinatário, assunto e corpo no log', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    await new NullEmailGateway().send({
      to: 'pessoa@clinica.com',
      subject: 'Defina sua senha',
      text: 'https://app.local/definir-senha?token=abc',
    });

    expect(info).toHaveBeenCalledTimes(1);
    const logged = String(info.mock.calls[0][0]);
    expect(logged).toContain('pessoa@clinica.com');
    expect(logged).toContain('Defina sua senha');
    expect(logged).toContain('https://app.local/definir-senha?token=abc');
  });
});
