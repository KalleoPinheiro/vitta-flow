import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  AuthToken,
  hashAuthTokenSecret,
  INVITE_TTL_MS,
  RESET_TTL_MS,
} from '@/domain/auth/auth-token';

const NOW = new Date('2026-09-01T12:00:00.000Z').getTime();

/**
 * AUTH-03: o token é gerado por conta, com expiração curta e uso único, e o
 * banco guarda apenas o hash do segredo entregue no link.
 */
describe('Feature: Token de ativação (convite e reset)', () => {
  describe('Cenário: emitir token', () => {
    it('Dado uma conta, Quando emitir convite, Então devolve o segredo em claro e guarda só o hash', () => {
      const { token, secret } = AuthToken.issue({
        accountId: 'acc-1',
        purpose: 'invite',
        nowMs: NOW,
      });

      expect(secret.length).toBeGreaterThanOrEqual(43);
      expect(token.secretHash).toBe(
        createHash('sha256').update(secret).digest('hex'),
      );
      expect(token.secretHash).not.toContain(secret);
    });

    it('Dado duas emissões seguidas, Quando comparar, Então os segredos e os ids diferem', () => {
      const a = AuthToken.issue({
        accountId: 'acc-1',
        purpose: 'invite',
        nowMs: NOW,
      });
      const b = AuthToken.issue({
        accountId: 'acc-1',
        purpose: 'invite',
        nowMs: NOW,
      });

      expect(a.secret).not.toBe(b.secret);
      expect(a.token.id).not.toBe(b.token.id);
    });

    it('Dado propósito convite, Quando emitir, Então expira em 24 h', () => {
      const { token } = AuthToken.issue({
        accountId: 'acc-1',
        purpose: 'invite',
        nowMs: NOW,
      });

      expect(INVITE_TTL_MS).toBe(24 * 60 * 60 * 1000);
      expect(token.expiresAt.getTime()).toBe(NOW + INVITE_TTL_MS);
      expect(token.purpose).toBe('invite');
    });

    it('Dado propósito reset, Quando emitir, Então expira em 1 h', () => {
      const { token } = AuthToken.issue({
        accountId: 'acc-1',
        purpose: 'reset',
        nowMs: NOW,
      });

      expect(RESET_TTL_MS).toBe(60 * 60 * 1000);
      expect(token.expiresAt.getTime()).toBe(NOW + RESET_TTL_MS);
      expect(token.purpose).toBe('reset');
    });

    it('Dado token recém-emitido, Quando ler accountId e usedAt, Então aponta a conta e não está usado', () => {
      const { token } = AuthToken.issue({
        accountId: 'acc-42',
        purpose: 'invite',
        nowMs: NOW,
      });

      expect(token.accountId).toBe('acc-42');
      expect(token.usedAt).toBeNull();
      expect(token.createdAt.getTime()).toBe(NOW);
    });
  });

  describe('Cenário: usabilidade do token', () => {
    it('Dado token dentro da validade e não usado, Quando isUsable, Então true', () => {
      const { token } = AuthToken.issue({
        accountId: 'acc-1',
        purpose: 'reset',
        nowMs: NOW,
      });

      expect(token.isUsable(NOW + 59 * 60 * 1000)).toBe(true);
    });

    it('Dado token expirado, Quando isUsable, Então false', () => {
      const { token } = AuthToken.issue({
        accountId: 'acc-1',
        purpose: 'reset',
        nowMs: NOW,
      });

      expect(token.isUsable(NOW + RESET_TTL_MS + 1)).toBe(false);
    });

    it('Dado token exatamente no instante da expiração, Quando isUsable, Então false', () => {
      const { token } = AuthToken.issue({
        accountId: 'acc-1',
        purpose: 'reset',
        nowMs: NOW,
      });

      expect(token.isUsable(NOW + RESET_TTL_MS)).toBe(false);
    });

    it('Dado token já usado, Quando isUsable, Então false mesmo dentro da validade', () => {
      const { token } = AuthToken.issue({
        accountId: 'acc-1',
        purpose: 'invite',
        nowMs: NOW,
      });

      const used = token.markUsed(new Date(NOW + 1000));

      expect(used.isUsable(NOW + 2000)).toBe(false);
      expect(used.usedAt?.getTime()).toBe(NOW + 1000);
    });

    it('Dado markUsed, Quando aplicado, Então a instância original permanece não usada (imutabilidade)', () => {
      const { token } = AuthToken.issue({
        accountId: 'acc-1',
        purpose: 'invite',
        nowMs: NOW,
      });

      token.markUsed(new Date(NOW + 1000));

      expect(token.usedAt).toBeNull();
      expect(token.isUsable(NOW + 2000)).toBe(true);
    });
  });

  describe('Cenário: hash do segredo', () => {
    it('Dado o mesmo segredo, Quando hashear duas vezes, Então o resultado é idêntico (busca determinística)', () => {
      expect(hashAuthTokenSecret('abc')).toBe(hashAuthTokenSecret('abc'));
      expect(hashAuthTokenSecret('abc')).toHaveLength(64);
    });

    it('Dado segredos diferentes, Quando hashear, Então os hashes diferem', () => {
      expect(hashAuthTokenSecret('abc')).not.toBe(hashAuthTokenSecret('abd'));
    });
  });

  describe('Cenário: restaurar do armazenamento', () => {
    it('Dado um estado persistido, Quando restaurar, Então preserva todos os campos', () => {
      const restored = AuthToken.restore({
        id: 'tok-1',
        accountId: 'acc-1',
        purpose: 'reset',
        secretHash: 'deadbeef',
        expiresAt: new Date(NOW + 1000),
        usedAt: null,
        createdAt: new Date(NOW),
      });

      expect(restored.id).toBe('tok-1');
      expect(restored.secretHash).toBe('deadbeef');
      expect(restored.isUsable(NOW)).toBe(true);
    });
  });
});
